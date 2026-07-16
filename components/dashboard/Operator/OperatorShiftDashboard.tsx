'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Battery,
  Users,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import {
  getOperatorShifts,
  getShiftReports,
  checkInOperator,
  type OperatorShift,
  type ShiftReport,
  type CheckInData,
} from '@/lib/api/shiftsAndInspections'

import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import ImageUpload from '@/components/ui/image-upload'
import { Label } from '@/components/ui/label'
import { MeterReadingField } from './MeterReadingField'
import { ShiftCheckOutDialog } from './ShiftCheckOutDialog'
import {
  parseMeterReadingValue,
  sanitizeMeterReadingInput,
  stripMeterReadingFormatting,
} from '@/lib/utils/formatters'
import { GEOFENCE_RADIUS_M, type Coords, distanceMeters, formatKm, getLocationOnce } from '@/lib/utils/geo'
import { useMeterReading } from '@/lib/hooks/useMeterReading'

// ===== Shift Timing Utilities =====
function getShiftTimingIndicator(dayOfWeek: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const today = new Date()
  const todayDayOfWeek = today.getDay()

  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }

  switch (daysUntil) {
    case 0:
      return { label: 'Today', variant: 'default' } // Green for today
    case 1:
      return { label: 'Tomorrow', variant: 'destructive' } // Red for others
    case 2:
      return { label: 'In 2 days', variant: 'destructive' } // Red for others
    case 3:
      return { label: 'In 3 days', variant: 'destructive' } // Red for others
    case 4:
      return { label: 'In 4 days', variant: 'destructive' } // Red for others
    case 5:
      return { label: 'In 5 days', variant: 'destructive' } // Red for others
    case 6:
      return { label: 'In 6 days', variant: 'destructive' } // Red for others
    default:
      return { label: 'Upcoming', variant: 'destructive' } // Red for others
  }
}

// ===== Shift Sorting Utilities =====
function getDaysUntilShift(dayOfWeek: number): number {
  const today = new Date()
  const todayDayOfWeek = today.getDay()

  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }

  return daysUntil
}

// ===== Date Utilities =====
// Helper to normalize date to start of day in local timezone
function normalizeToLocalDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  const normalized = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return normalized
}

// Get the shiftDate if it exists, otherwise calculate from dayOfWeek
function getShiftDate(shift: OperatorShift): Date {
  // If shift has an actual shiftDate, use that
  if (shift.shiftDate) {
    return normalizeToLocalDate(shift.shiftDate)
  }

  // Otherwise calculate from dayOfWeek (for recurring shifts)
  return getDateForDayOfWeek(shift.dayOfWeek)
}

function getDateForDayOfWeek(dayOfWeek: number): Date {
  const today = new Date()
  const todayDayOfWeek = today.getDay()

  // Calculate the date for this dayOfWeek in the current week
  const diff = dayOfWeek - todayDayOfWeek
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  targetDate.setHours(0, 0, 0, 0)

  return targetDate
}

function isShiftDateToday(shift: OperatorShift): boolean {
  const today = normalizeToLocalDate(new Date())
  const shiftDate = getShiftDate(shift)
  return shiftDate.getTime() === today.getTime()
}

function isShiftDatePast(shift: OperatorShift): boolean {
  const today = normalizeToLocalDate(new Date())
  const shiftDate = getShiftDate(shift)
  return shiftDate.getTime() < today.getTime()
}

function isShiftDateFuture(shift: OperatorShift): boolean {
  const today = normalizeToLocalDate(new Date())
  const shiftDate = getShiftDate(shift)
  return shiftDate.getTime() > today.getTime()
}

function sortShiftsByProximity(shifts: OperatorShift[]): OperatorShift[] {
  const today = normalizeToLocalDate(new Date())

  return [...shifts].sort((a, b) => {
    const dateA = getShiftDate(a)
    const dateB = getShiftDate(b)

    const daysUntilA = Math.ceil((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const daysUntilB = Math.ceil((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // If same day, sort by start time
    if (daysUntilA === daysUntilB) {
      return (a.startTime || '').localeCompare(b.startTime || '')
    }

    return daysUntilA - daysUntilB
  })
}

// Filter shifts to show today and future shifts only
function filterAvailableShifts(shifts: OperatorShift[]): OperatorShift[] {
  const today = normalizeToLocalDate(new Date())

  return shifts.filter(shift => {
    const shiftDate = getShiftDate(shift)
    // Show shifts that are today or in the future
    return shiftDate.getTime() >= today.getTime()
  })
}

// ✅ Build absolute chargers URL from env (never relative)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')
const CHARGERS_URL = `${API_BASE}/api/client/chargers`

type Charger = {
  id: string
  kabisaId?: string
  name?: string
  address?: string
  latitude?: number | string | null
  longitude?: number | string | null
  [k: string]: any
}

// Prefer coordinates from the charger embedded on the shift
function shiftChargerCoords(shift?: OperatorShift | null): Coords | null {
  const c: any = (shift as any)?.charger
  if (!c) return null
  const latRaw = c.latitude ?? c.Latitude ?? c?.location?.lat
  const lngRaw = c.longitude ?? c.Longitude ?? c?.location?.lng
  const lat = typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw
  const lng = typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

// ===== Chargers fetch (absolute URL + correct shape) =====
async function fetchChargersList(): Promise<Charger[]> {
  if (!API_BASE) {
    console.error('[Chargers] NEXT_PUBLIC_API_URL is not set')
    toast.error('Missing NEXT_PUBLIC_API_URL env var.')
  }

  const res = await fetch(CHARGERS_URL, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[Chargers] HTTP error', res.status, res.statusText, text)
    throw new Error(`Failed to fetch chargers: ${res.status} ${res.statusText}`)
  }

  const data = await res.json().catch((e) => {
    console.error('[Chargers] Failed to parse JSON:', e)
    throw e
  })

  // 👇 Real shape: { status, message, data: { chargers: [...] } }
  const list =
    Array.isArray((data as any)?.data?.chargers) ? (data as any).data.chargers :
      Array.isArray((data as any)?.chargers) ? (data as any).chargers :
        Array.isArray((data as any)?.data) ? (data as any).data :
          Array.isArray(data) ? (data as any) :
            []

  if (list.length === 0) {
    toast.error('Chargers list came back empty from /api/client/chargers')
  }

  return list as Charger[]
}

const toNumber = (v: any): number | undefined => {
  if (v == null) return undefined
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

// Prefer matching by kabisaId; then fallback to id/name if needed
function matchChargerFromList(
  shift?: OperatorShift | null,
  chargersList: Charger[] = []
): { matched: Charger | null; coords: Coords | null; reason: string[] } {
  const reason: string[] = []
  if (!shift) return { matched: null, coords: null, reason: ['No shift provided'] }

  const embedded: any = (shift as any)?.charger
  const embeddedId: string | undefined = embedded?.id
  const embeddedKabisaId: string | undefined = embedded?.kabisaId
  const embeddedName: string | undefined = embedded?.name
  const shiftChargerId: string | undefined = (shift as any)?.chargerId

  let matched: Charger | null = null

  // 1) Primary: match by embedded kabisaId
  if (embeddedKabisaId) {
    matched =
      chargersList.find((c) => (c.kabisaId || '').trim() === embeddedKabisaId.trim()) ?? null
    if (matched) reason.push(`Matched by embedded kabisaId (${embeddedKabisaId})`)
  }

  // 2) Fallback: match by embedded charger.id
  if (!matched && embeddedId) {
    matched = chargersList.find((c) => c.id === embeddedId) ?? null
    if (matched) reason.push(`Matched by embedded id (${embeddedId})`)
  }

  // 3) Fallback: match by shift.chargerId (if provided)
  if (!matched && shiftChargerId && shiftChargerId !== embeddedId) {
    matched = chargersList.find((c) => c.id === shiftChargerId) ?? null
    if (matched) reason.push(`Matched by shift.chargerId (${shiftChargerId})`)
  }

  // 4) Optional: exact name match
  if (!matched && embeddedName) {
    matched = chargersList.find((c) => (c.name || '').trim() === embeddedName.trim()) ?? null
    if (matched) reason.push(`Matched by name (${embeddedName})`)
  }

  let coords: Coords | null = null
  if (matched) {
    const lat = toNumber(matched.latitude)
    const lng = toNumber(matched.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coords = { lat: lat!, lng: lng! }
      reason.push('Using coordinates from chargers list')
    } else {
      reason.push('Matched charger has no latitude/longitude fields')
    }
  } else {
    reason.push('No charger matched in list')
  }

  return { matched, coords, reason }
}

interface OperatorShiftDashboardProps {
  className?: string
}

export const OperatorShiftDashboard: React.FC<OperatorShiftDashboardProps> = ({ className }) => {
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()

  // UI state
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false)
  const [checkInImage, setCheckInImage] = useState<string>('')
  const [pendingCheckInDist, setPendingCheckInDist] = useState<number | null>(null)
  const [pendingCheckOutDist, setPendingCheckOutDist] = useState<number | null>(null)
  const [pendingCheckInHere, setPendingCheckInHere] = useState<Coords | null>(null)
  const [pendingCheckOutHere, setPendingCheckOutHere] = useState<Coords | null>(null)
  const [shiftEnded, setShiftEnded] = useState(false)

  const {
    meterReading, setMeterReading, meterImage, setMeterImage,
    meterReading2, setMeterReading2, meterImage2, setMeterImage2,
    handleMeterReadingChange, handleMeterReadingFocus, preventInvalidNumberKey, resetMeterReadings,
  } = useMeterReading()

  // Data — staleTime:0 so charger config changes (e.g. hasTwoMeters) are
  // always reflected on mount without waiting for the global 60s window.
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
    staleTime: 0,
  })
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['shiftReports'],
    queryFn: getShiftReports,
    staleTime: 0,
  })

  // ✅ Fetch chargers list (absolute URL)
  const {
    data: chargersData,
    isLoading: chargersLoading,
    error: chargersError,
  } = useQuery({
    queryKey: ['chargers', CHARGERS_URL], // include full URL so env/path changes bust cache
    queryFn: fetchChargersList,
    staleTime: 3 * 60 * 1000,
    retry: 2,
    enabled: !!API_BASE, // skip if env missing
  })

  const chargersList: Charger[] = chargersData ?? []

  useEffect(() => {
    if (!chargersLoading) {
      if (!chargersError && chargersList.length === 0) {
        toast.error('No chargers returned from /api/client/chargers (list is empty)')
      }
    }
  }, [chargersLoading, chargersError, chargersList])

  const shifts = shiftsData?.shifts || []
  const reports = reportsData?.reports || []

  // Find active shift report (not checked out)
  const activeShiftReport: ShiftReport | undefined = useMemo(() => {
    return reports.find((report) => {
      const hasCheckIn = !!report.checkInTime
      const hasNoCheckOut = !report.checkOutTime
      const isActive = report.isActive !== false // Allow undefined isActive to be considered active

      // Only check if shift is active and not checked out - no date restrictions
      return hasCheckIn && hasNoCheckOut && isActive
    })
  }, [reports])

  const activeShift: OperatorShift | null = activeShiftReport?.operatorShift ?? null
  const selectedShift: OperatorShift | undefined = useMemo(
    () => shifts.find((s) => s.id === selectedShiftId),
    [shifts, selectedShiftId]
  )

  // Prefer the exact shift tied to the active report for checkout/session
  const shiftForActiveReport = useMemo(() => {
    if (!activeShiftReport?.operatorShiftId) return activeShift
    return shifts.find((s) => s.id === activeShiftReport.operatorShiftId) ?? activeShift
  }, [activeShiftReport, shifts, activeShift])

  // Check if shift has ended but operator hasn't checked out
  // Removed date validation to allow overnight shifts that span different days
  useEffect(() => {
    if (activeShiftReport && activeShiftReport.operatorShift) {
      // Removed problematic date/time validation that was blocking overnight shifts
      // Backend should handle shift end logic, frontend just shows status
      setShiftEnded(false)
    }
  }, [activeShiftReport])

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: CheckInData) => {
      return await checkInOperator(data)
    },
    onSuccess: () => {
      // Backend will handle success messaging through api.ts interceptors
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
    },
    onError: (error: any) => {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Check-in error:', error)
    }
  })

  // Peek coords without toasts (for list rendering)
  function peekCoordsForShift(shift?: OperatorShift | null): Coords | null {
    if (!shift) return null
    const embedded = shiftChargerCoords(shift)
    if (embedded) return embedded
    const { coords } = matchChargerFromList(shift, chargersList)
    return coords
  }

  // Helper to get coordinates for geofence (with fallbacks + toasts)
  function getCoordsForShift(shift?: OperatorShift | null): Coords | null {
    if (!shift) {
      toast.error('No shift selected.')
      return null
    }

    const embeddedCoords = shiftChargerCoords(shift)
    if (embeddedCoords) {
      return embeddedCoords
    }

    if (chargersLoading) {
      toast.error('Charger coordinates not embedded and chargers list is still loading. Please retry.')
      return null
    }
    if (chargersError) {
      toast.error('Failed to fetch chargers list for coordinates.')
      return null
    }

    const { matched, coords } = matchChargerFromList(shift, chargersList)
    if (!matched) {
      toast.error('Could not find this charger in the chargers list.')
      return null
    }
    if (!coords) {
      toast.error('Matched charger has no coordinates.')
      return null
    }
    return coords
  }

  // ===== Geofence gate (one-shot) — returns operator "here" too =====
  async function ensureWithinGeofenceFor(
    action: 'check-in' | 'check-out' | 'start-session'
  ): Promise<{ ok: true; dist: number; here: Coords } | { ok: false }> {
    const targetShift =
      action === 'check-in' ? (selectedShift ?? activeShift) : (shiftForActiveReport ?? selectedShift)

    if (!targetShift) {
      toast.error('No shift selected/found.')
      return { ok: false }
    }

    const coords = getCoordsForShift(targetShift)
    if (!coords) {
      return { ok: false }
    }

    try {
      const here = await getLocationOnce()
      const dist = distanceMeters(here, coords)
      if (dist > GEOFENCE_RADIUS_M) {
        toast.error(`You're ${formatKm(dist)} away. Must be within ${(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km.`)
        return { ok: false }
      }
      return { ok: true, dist, here }
    } catch (e: any) {
      toast.error(e?.message ?? 'Enable location (HTTPS required).')
      return { ok: false }
    }
  }

  // ===== Day Validation =====
  function validateShiftDay(shift: OperatorShift): boolean {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const shiftDate = getShiftDate(shift)
    const formattedDate = shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const shiftDayName = dayNames[shift.dayOfWeek]

    if (!isShiftDateToday(shift)) {
      if (isShiftDatePast(shift)) {
        toast.error(`Cannot check in to past shift (${shiftDayName}, ${formattedDate}). This shift date has already passed.`)
      } else {
        toast.error(`Cannot check in to future shift (${shiftDayName}, ${formattedDate}). Please wait until ${shiftDayName} to check in.`)
      }
      return false
    }
    return true
  }

  // Check if a shift can be checked into (today only)
  function canCheckInToShift(shift: OperatorShift): boolean {
    return isShiftDateToday(shift)
  }

  // Get available shifts (today and future)
  const availableShifts = useMemo(() => {
    return filterAvailableShifts(shifts)
  }, [shifts])

  // ===== DEBUG LOGGING FOR MULTIPLE SHIFTS =====
  // Debug: Check if operator has multiple shifts on same day
  // ===== Handlers =====
  async function openCheckInForm() {
    if (!selectedShiftId) {
      toast.error('Please select a shift to check in.')
      return
    }

    // Validate that the selected shift is for today (check-in only)
    const selectedShift = shifts.find(s => s.id === selectedShiftId)
    if (selectedShift && !validateShiftDay(selectedShift)) {
      return
    }

    const res = await ensureWithinGeofenceFor('check-in')
    if (!('ok' in res) || !res.ok) return
    setPendingCheckInDist(res.dist ?? null)
    setPendingCheckInHere(res.here)
    resetMeterReadings()
    setShowCheckInForm(true)
  }

  async function openCheckOutForm() {
    if (!activeShiftReport) {
      toast.error('No active shift found.')
      return
    }
    const res = await ensureWithinGeofenceFor('check-out')
    if (!('ok' in res) || !res.ok) return
    setPendingCheckOutDist(res.dist ?? null)
    setPendingCheckOutHere(res.here)
    setShowCheckOutDialog(true)
  }

  async function handleStartSession() {
    const res = await ensureWithinGeofenceFor('start-session')
    if (!('ok' in res) || !res.ok) return
    router.push('/dashboard/charge/shift/start')
  }

  const handleCheckIn = async () => {
    if (!selectedShiftId) {
      toast.error('Please select a shift to check in')
      return
    }

    // staleTime:0 + window-focus refetches can drop the picked shift
    // from the list mid-form (admin reassigned it, etc). If we can't
    // resolve the row we can't read charger.hasTwoMeters, which would
    // silently let the two-meter validation block fall through. Bail
    // with a clear error so the operator reopens the form against a
    // fresh shift list.
    if (!selectedShift) {
      toast.error('Selected shift no longer available. Please pick a shift again.')
      return
    }

    // Two-meter stations need a baseline reading + photo for *each* meter
    // at check-in so the discrepancy math has both starting points to
    // compare against. Check-out can submit with one meter filled (a
    // meter being broken or unread at end-of-shift is acceptable), but
    // skipping a meter at the start of the shift leaves no anchor for
    // the missing-energy calculation.
    //
    // If the API response omitted charger we can't read hasTwoMeters
    // and the optional chain below would silently bypass the gate.
    // Bail in that case rather than letting an unvalidated check-in
    // through.
    if (!selectedShift.charger) {
      toast.error("Charger details missing for this shift. Retry, and if the error persists contact an admin to fix the shift's charger link.")
      return
    }
    // Only enforce two-meter check-in baseline when the charger also has
    // meter readings enabled (haveMeterReading=true). hasTwoMeters with
    // haveMeterReading=false is a readings-opted-out config — blocking
    // check-in on meter 2 would contradict that setting.
    if (selectedShift.charger.hasTwoMeters && selectedShift.charger.haveMeterReading) {
      if (!meterReading || !meterReading.trim()) {
        toast.error('This station has two meters — enter the Meter 1 reading before checking in.')
        return
      }
      if (!meterImage || !meterImage.trim()) {
        toast.error('Capture a Meter 1 photo before checking in.')
        return
      }
      if (!meterReading2 || !meterReading2.trim()) {
        toast.error('This station has two meters — enter the Meter 2 reading before checking in.')
        return
      }
      if (!meterImage2 || !meterImage2.trim()) {
        toast.error('Capture a Meter 2 photo before checking in.')
        return
      }
    }

    if (meterReading && (!meterImage || meterImage.trim() === '')) {
      toast.error('Please capture a meter reading photo before checking in.')
      return
    }

    if (meterReading2 && (!meterImage2 || meterImage2.trim() === '')) {
      toast.error('Please capture a photo for the second meter reading before checking in.')
      return
    }

    setCheckInLoading(true)
    try {
      // use the last verified "here", else re-request as a fallback
      const here = pendingCheckInHere ?? (await getLocationOnce().catch(() => null))
      if (!here) {
        toast.error('Could not read your location for check-in.')
        return
      }

      const numericMeterReading = parseMeterReadingValue(meterReading)
      const numericMeterReading2 = parseMeterReadingValue(meterReading2)

      const payload: CheckInData = {
        operatorShiftId: selectedShiftId,
        operatorLatitude: String(here.lat),
        operatorLongitude: String(here.lng),
        imageUrl: checkInImage && checkInImage.trim() !== '' ? checkInImage : undefined,
        checkInMeterReading: numericMeterReading,
        checkInMeterReadingImageUrl: meterImage && meterImage.trim() !== '' ? meterImage : undefined,
        checkInMeterReading2: numericMeterReading2,
        checkInMeterReadingImageUrl2: meterImage2 && meterImage2.trim() !== '' ? meterImage2 : undefined,
      }

      await checkInMutation.mutateAsync(payload)

      setShowCheckInForm(false)
      setPendingCheckInDist(null)
      setPendingCheckInHere(null)
      setCheckInImage('')
      resetMeterReadings()
    } finally {
      setCheckInLoading(false)
    }
  }

  const getDayName = (dow: number): string =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow] || '—'

  const handleImageChange = (name: string, url: string) => {
    if (name === 'checkin-image') setCheckInImage(url)
    else if (name === 'meter-image') setMeterImage(url)
    else if (name === 'meter-image-2') setMeterImage2(url)
  }

  if (shiftsLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading shift..</span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Shift Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeShiftReport ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active Shift
                </Badge>
              </div>

              {shiftEnded && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">⚠️ Shift Time Ended</h3>
                  <p className="text-sm text-red-700">
                    Your shift time has ended but you haven't checked out yet. Please check out to complete your shift.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Check-in Time</p>
                  <p className="font-medium">{new Date(activeShiftReport.checkInTime).toLocaleString()}</p>
                </div>

                {shiftForActiveReport && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Day</p>
                      <p className="font-medium">{getDayName(shiftForActiveReport.dayOfWeek)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Schedule</p>
                      <p className="font-medium">
                        {shiftForActiveReport.startTime} - {shiftForActiveReport.endTime}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleStartSession}
                  className="flex-1 order-2 sm:order-1"
                  title={`Must be within ${(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km of the charger to start`}
                >
                  <Battery className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Start Charging Session</span>
                  <span className="sm:hidden">Start Session</span>
                </Button>

                <Button onClick={openCheckOutForm} variant="outline" className="order-1 sm:order-2">
                  <XCircle className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  No Active Shift
                </Badge>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-medium text-orange-800 mb-2">👋 Ready to start your day?</h3>
                <p className="text-sm text-orange-700">
                  Choose a shift below and check in to begin. You must be within {(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km of the charger.
                </p>
              </div>

              {availableShifts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Available Shifts:</p>
                  <div className="space-y-2">
                    {sortShiftsByProximity(availableShifts).map((shift) => {
                      const embeddedName =
                        (shift as any)?.charger?.name || (shift as any)?.charger?.Name
                      const hasAnyCoords = peekCoordsForShift(shift) !== null
                      const isPast = isShiftDatePast(shift)
                      const isFuture = isShiftDateFuture(shift)
                      const isToday = isShiftDateToday(shift)
                      const shiftDate = getShiftDate(shift)
                      const formattedDate = shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                      return (
                        <div
                          key={shift.id}
                          className={`p-3 border rounded-lg transition-colors ${isPast || isFuture
                            ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50'
                            : selectedShiftId === shift.id
                              ? 'border-blue-500 bg-blue-50 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                            }`}
                          onClick={() => {
                            if (isToday) {
                              setSelectedShiftId(shift.id)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{getDayName(shift.dayOfWeek)}</p>
                                <span className="text-xs text-gray-500">({formattedDate})</span>
                                {/* Timing Indicator Badge */}
                                {isToday ? (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    Today
                                  </Badge>
                                ) : isPast ? (
                                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                    Past
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Upcoming
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {shift.startTime} - {shift.endTime}
                              </p>
                              <p className="text-xs text-gray-500">
                                Kabisa ID:{' '}
                                {(shift as any)?.charger?.kabisaId ||
                                  (shift as any)?.kabisaId ||
                                  '—'}
                              </p>
                              {embeddedName ? (
                                <p className="text-sm text-gray-500">
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  {embeddedName}
                                </p>
                              ) : hasAnyCoords ? (
                                <p className="text-sm text-gray-500">
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  Charger coordinates available
                                </p>
                              ) : (
                                <p className="text-xs text-red-600 mt-1">
                                  No charger coordinates available
                                </p>
                              )}
                              {(isPast || isFuture) && (
                                <p className="text-xs text-orange-600 mt-1">
                                  {isPast ? 'Cannot check in - shift date passed' : 'Cannot check in - wait until this day'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="shift"
                                value={shift.id}
                                checked={selectedShiftId === shift.id}
                                onChange={() => {
                                  if (isToday) {
                                    setSelectedShiftId(shift.id)
                                  }
                                }}
                                disabled={!isToday}
                                className="text-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    onClick={openCheckInForm}
                    disabled={!selectedShiftId || (selectedShift && !canCheckInToShift(selectedShift))}
                    className="w-full"
                    title="We'll verify your location once when you tap this"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check In to Start Shift
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No shifts available</p>
                  <p className="text-xs text-gray-400">Contact your administrator</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Shift History */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Shift History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-900">Day</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Check-in Time</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Check-out Time</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Duration</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.slice(0, 10).map((report) => (
                    <tr
                      key={report.id}
                      className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {getDayName(report.operatorShift?.dayOfWeek || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(report.checkInTime).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(report.checkInTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {report.checkOutTime
                          ? new Date(report.checkOutTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {(() => {
                          const checkOut = report.checkOutTime
                          if (!checkOut) return 'Ongoing'
                          const duration =
                            new Date(checkOut).getTime() - new Date(report.checkInTime).getTime()
                          const h = Math.floor(duration / (1000 * 60 * 60))
                          const m = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
                          return `${h}h ${m}m`
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={report.checkOutTime ? 'default' : 'secondary'}
                          className={
                            report.checkOutTime
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
                          }
                        >
                          {report.checkOutTime ? 'Completed' : 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Form Modal */}
      {showCheckInForm && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/40 flex items-center justify-center z-50">
          <div className="bg-white/98 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-300/60">
            <h3 className="text-lg font-semibold mb-4">Check In to Shift</h3>

            <div className="text-sm rounded-md bg-gray-50 border p-3 mb-4">
              <p>
                Location verified • Distance:{' '}
                <span className="font-medium">{formatKm(pendingCheckInDist)}</span> (≤ {(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Check-in Photo (Optional)</Label>
                <ImageUpload
                  name="checkin-image"
                  label="Take a photo of yourself"
                  currentImage={checkInImage}
                  onImageChange={handleImageChange}
                  isRequired={false}
                  classNames="w-full"
                  uploadContext="shift-checkin-selfie"
                  entityId={selectedShiftId || undefined}
                />
              </div>

              <MeterReadingField
                label={
                  selectedShift?.charger?.hasTwoMeters
                    ? 'Initial Meter 1 Reading (Required)'
                    : 'Initial Meter Reading (Optional)'
                }
                photoLabel="Meter Photo"
                value={meterReading}
                onChange={handleMeterReadingChange}
                onFocus={handleMeterReadingFocus}
                onBlur={() => setMeterReading((prev) => stripMeterReadingFormatting(prev))}
                onKeyDown={preventInvalidNumberKey}
                imageName="meter-image"
                imageUploadLabel="Take a photo of the meter"
                currentImage={meterImage}
                onImageChange={handleImageChange}
                uploadContext="shift-checkin-meter"
                entityId={selectedShiftId || undefined}
                stepNumber={selectedShift?.charger?.hasTwoMeters ? 1 : undefined}
              />

              {selectedShift?.charger?.hasTwoMeters && (
                <MeterReadingField
                  label="Initial Meter 2 Reading (Required)"
                  photoLabel="Meter 2 Photo"
                  value={meterReading2}
                  onChange={(v) => setMeterReading2(sanitizeMeterReadingInput(v))}
                  onBlur={() => setMeterReading2((prev) => stripMeterReadingFormatting(prev))}
                  onKeyDown={preventInvalidNumberKey}
                  placeholder="Enter second meter reading"
                  imageName="meter-image-2"
                  imageUploadLabel="Take a photo of the second meter"
                  currentImage={meterImage2}
                  onImageChange={handleImageChange}
                  uploadContext="shift-checkin-meter2"
                  entityId={selectedShiftId || undefined}
                  stepNumber={2}
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button onClick={handleCheckIn} disabled={checkInLoading} className="flex-1 order-2 sm:order-1">
                {checkInLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Check In
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCheckInForm(false)
                  setPendingCheckInDist(null)
                  setPendingCheckInHere(null)
                }}
                disabled={checkInLoading}
                className="order-1 sm:order-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Form Modal */}
      <ShiftCheckOutDialog
        open={showCheckOutDialog}
        onOpenChange={(o) => {
          setShowCheckOutDialog(o)
          if (!o) {
            setPendingCheckOutDist(null)
            setPendingCheckOutHere(null)
          }
        }}
        activeShiftReport={(activeShiftReport ?? null) as any}
        operatorShiftId={shiftForActiveReport?.id ?? activeShift?.id ?? null}
        isLastShift={shiftForActiveReport?.isLastShift ?? activeShift?.isLastShift}
        distance={pendingCheckOutDist}
        here={pendingCheckOutHere}
        onCompleted={() => {
          setPendingCheckOutDist(null)
          setPendingCheckOutHere(null)
        }}
      />
    </div>
  )
}
