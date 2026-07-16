'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Play, Square, CheckCircle, AlertCircle, Calendar, MapPin, Repeat2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// import { ShiftSwapManagement } from '@/components/dashboard/shifts/ShiftSwapManagement'
import {
  getOperatorShifts,
  // getShiftsWithSwaps,
  getShiftReports,
  checkInOperator,
  type OperatorShift,
  // type ShiftWithSwap,
  type ShiftReport,
  type CheckInData,
  getDayName,
  formatTimeTo12Hour,
} from '@/lib/api/shiftsAndInspections'
import ImageUpload from '@/components/ui/image-upload'
import { sanitizeMeterReadingInput, parseMeterReadingValue } from '@/lib/utils/formatters'
import { ShiftCheckOutDialog } from '@/components/dashboard/Operator/ShiftCheckOutDialog'
import {
  GEOFENCE_RADIUS_M,
  CHARGERS_URL,
  hasApiBase,
  type Coords,
  type Charger,
  distanceMeters,
  formatKm,
  getLocationOnce,
  fetchChargersList,
  shiftChargerCoords,
  matchChargerFromList,
} from '@/lib/utils/geofence'

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

function sortShiftsByProximity(shifts: (OperatorShift
  //  | ShiftWithSwap
  )[]): (OperatorShift
    //  | ShiftWithSwap
    )[] {
  return [...shifts].sort((a, b) => {
    const daysUntilA = getDaysUntilShift(a.dayOfWeek)
    const daysUntilB = getDaysUntilShift(b.dayOfWeek)

    // If same day, sort by start time
    if (daysUntilA === daysUntilB) {
      return a.startTime?.localeCompare(b.startTime || '') || 0
    }

    return daysUntilA - daysUntilB
  })
}

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState('my-shifts')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false)
  const [checkInImage, setCheckInImage] = useState('')
  const [checkInMeterReading, setCheckInMeterReading] = useState('')
  const [checkInMeterImage, setCheckInMeterImage] = useState('')
  const [checkInMeterReading2, setCheckInMeterReading2] = useState('')
  const [checkInMeterImage2, setCheckInMeterImage2] = useState('')
  const [pendingCheckInDist, setPendingCheckInDist] = useState<number | null>(null)
  const [pendingCheckOutDist, setPendingCheckOutDist] = useState<number | null>(null)
  const [pendingCheckInHere, setPendingCheckInHere] = useState<Coords | null>(null)
  const [pendingCheckOutHere, setPendingCheckOutHere] = useState<Coords | null>(null)

  const queryClient = useQueryClient()

  // Get today's date in ISO format
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Fetch operator shifts (all regular shifts for the week)
  const { data: regularShiftsData, isLoading: regularShiftsLoading } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
    staleTime: 0,
  })

  // Fetch shifts with swaps for TODAY only
  // const { data: todayShiftsWithSwaps, isLoading: todaySwapsLoading } = useQuery({
  //   queryKey: ['shiftsWithSwaps', today],
  //   queryFn: () => getShiftsWithSwaps(today),
  // })

  // Merge: Use regular shifts + add any swaps from today that aren't regular shifts
  const shiftsData = useMemo(() => {
    const regularShifts = regularShiftsData?.shifts || []
    // const todayShifts = todayShiftsWithSwaps || []

    // Find swapped shifts for today (type === 'swap')
    // const swappedShiftsToday = todayShifts.filter(s => s.type === 'swap')

    // Merge: regular shifts + swapped shifts for today
    // const allShifts = [...regularShifts, ...swappedShiftsToday]

    return { shifts: regularShifts }
  }, [regularShiftsData])

  // const shiftsLoading = regularShiftsLoading || todaySwapsLoading

  // Fetch shift reports to find active shift
  const { data: shiftReportsData, isLoading: shiftReportsLoading } = useQuery({
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
    enabled: hasApiBase(), // skip if env missing
  })

  const shifts = shiftsData?.shifts || []
  const shiftReports = shiftReportsData?.reports || []
  const chargersList: Charger[] = chargersData ?? []

  // Underlying ShiftReport for the active shift (drives the shared check-out
  // dialog: meter 2 gating, reference photos, etc).
  const activeShiftReportData: ShiftReport | null = useMemo(() => {
    return (
      shiftReports.find((report) => {
        const hasCheckIn = !!report.checkInTime
        const hasNoCheckOut = !report.checkOutTime
        const isActive = report.isActive !== false
        return hasCheckIn && hasNoCheckOut && isActive
      }) ?? null
    )
  }, [shiftReports])

  // Find active shift by checking which shift has an active shift report
  const activeShift = useMemo(() => {
    // Find the shift report that is currently active (checked in but not checked out)
    const activeShiftReport = shiftReports.find(report => {
      const hasCheckIn = !!report.checkInTime
      const hasNoCheckOut = !report.checkOutTime
      const isActive = report.isActive !== false
      return hasCheckIn && hasNoCheckOut && isActive
    })

    if (!activeShiftReport) return null

    // Find the corresponding shift from the shifts array using the operatorShiftId
    const correspondingShift = shifts.find(shift => shift.id === activeShiftReport.operatorShiftId)

    // If we can't find the shift in the current shifts array, use the shift data from the report
    if (!correspondingShift && activeShiftReport.operatorShift) {
      // Use shift data from the report
      const shiftFromReport = activeShiftReport.operatorShift
      return {
        id: shiftFromReport.id,
        operatorId: shiftFromReport.operatorId,
        dayOfWeek: shiftFromReport.dayOfWeek,
        startTime: shiftFromReport.startTime,
        endTime: shiftFromReport.endTime,
        chargerId: shiftFromReport.chargerId,
        isLastShift: shiftFromReport.isLastShift,
        isActive: shiftFromReport.isActive,
        shiftDate: shiftFromReport.shiftDate,
        charger: shiftFromReport.charger,
        checkInTime: activeShiftReport.checkInTime,
        checkOutTime: activeShiftReport.checkOutTime,
        shiftReportId: activeShiftReport.id,
        operatorLatitude: activeShiftReport.checkInLatitude,
        operatorLongitude: activeShiftReport.checkInLongitude,
        imageUrl: activeShiftReport.checkInSelfieImage,
        meterReading: activeShiftReport.checkInMeterReading,
        comments: activeShiftReport.comments
      }
    }

    if (!correspondingShift) return null

    // Return the shift data with the check-in information
    return {
      ...correspondingShift,
      checkInTime: activeShiftReport.checkInTime,
      checkOutTime: activeShiftReport.checkOutTime,
      shiftReportId: activeShiftReport.id,
      operatorLatitude: activeShiftReport.checkInLatitude,
      operatorLongitude: activeShiftReport.checkInLongitude,
      imageUrl: activeShiftReport.checkInSelfieImage,
      meterReading: activeShiftReport.checkInMeterReading,
      comments: activeShiftReport.comments
    }
  }, [shifts, shiftReports])

  // Debug: Log the active shift data to understand what's coming from backend
  useEffect(() => {
    if (activeShift) {
      console.log('🔍 Active Shift Debug:', {
        activeShift: activeShift,
        checkInTime: activeShift.checkInTime,
        checkOutTime: activeShift.checkOutTime,
        shiftReportId: activeShift.shiftReportId
      })
    }
  }, [activeShift])

  useEffect(() => {
    if (!checkInMeterReading) {
      setCheckInMeterImage('')
    }
  }, [checkInMeterReading])

  const handleCheckInMeterInputChange = (value: string) => {
    setCheckInMeterReading(sanitizeMeterReadingInput(value))
  }

  const handleCheckInMeterInput2Change = (value: string) => {
    setCheckInMeterReading2(sanitizeMeterReadingInput(value))
  }

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (data: CheckInData) => checkInOperator(data),
    onSuccess: () => {
      // Backend will handle success messaging through api.ts interceptors
      setShowCheckInDialog(false)
      setSelectedShiftId('')
      setCheckInImage('')
      setCheckInMeterReading('')
      setCheckInMeterImage('')
      setCheckInMeterReading2('')
      setCheckInMeterImage2('')
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
    },
    onError: (error: any) => {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Check-in error:', error)
    },
  })

  // Helper to get coordinates for geofence (with fallbacks + toasts)
  function getCoordsForShift(shift?: any): Coords | null {
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
    action: 'check-in' | 'check-out',
    shiftId?: string
  ): Promise<{ ok: true; dist: number; here: Coords } | { ok: false }> {
    const currentShiftId = shiftId || selectedShiftId
    const targetShift = action === 'check-in' ? shifts.find(s => s.id === currentShiftId) : activeShift

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
  function validateShiftDay(shift: OperatorShift
    //  | ShiftWithSwap
    ): boolean {
    const today = new Date()
    const todayDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (shift.dayOfWeek !== todayDayOfWeek) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const todayName = dayNames[todayDayOfWeek]
      const shiftDayName = dayNames[shift.dayOfWeek]

      toast.error(`Cannot check in to ${shiftDayName} shift on ${todayName}. Please select a shift for today.`)
      return false
    }
    return true
  }

  // ===== Handlers =====
  async function openCheckInForm(shiftId?: string) {
    const currentShiftId = shiftId || selectedShiftId
    if (!currentShiftId) {
      toast.error('Please select a shift to check in.')
      return
    }
    
    // Set the selected shift ID if it wasn't passed as parameter
    if (shiftId) {
      setSelectedShiftId(shiftId)
    }
    
    // Validate that the selected shift is for today (check-in only)
    const selectedShift = shifts.find(s => s.id === currentShiftId)
    if (selectedShift && !validateShiftDay(selectedShift)) {
      return
    }
    
    const res = await ensureWithinGeofenceFor('check-in', currentShiftId)
    if (!('ok' in res) || !res.ok) return
    setPendingCheckInDist(res.dist ?? null)
    setPendingCheckInHere(res.here)
    setCheckInMeterReading('')
    setCheckInMeterImage('')
    setCheckInMeterReading2('')
    setCheckInMeterImage2('')
    setShowCheckInDialog(true)
  }

  async function openCheckOutForm() {
    if (!activeShift) {
      toast.error('No active shift found.')
      return
    }
    const res = await ensureWithinGeofenceFor('check-out')
    if (!('ok' in res) || !res.ok) return
    setPendingCheckOutDist(res.dist ?? null)
    setPendingCheckOutHere(res.here)
    // Dialog owns the rest: next-operator handoff, meter gating, banners.
    setShowCheckOutDialog(true)
  }

  const handleCheckIn = async () => {
    if (!selectedShiftId) {
      toast.error('Please select a shift to check in')
      return
    }

    // Get the selected shift to check if meter reading is required
    const selectedShift = shifts.find(s => s.id === selectedShiftId)
    const requiresMeterReading = selectedShift?.charger?.haveMeterReading === true
    const hasTwoMeters = selectedShift?.charger?.hasTwoMeters === true

    // Validate meter reading if required
    if (requiresMeterReading) {
      if (!checkInMeterReading || checkInMeterReading.trim() === '') {
        toast.error(hasTwoMeters ? 'Meter 1 reading is required for this charger.' : 'Meter reading is required for this charger.')
        return
      }
      if (!checkInMeterImage || checkInMeterImage.trim() === '') {
        toast.error(hasTwoMeters ? 'Please capture a Meter 1 photo before checking in.' : 'Please capture a meter reading photo before checking in.')
        return
      }
    } else if (checkInMeterReading && (!checkInMeterImage || checkInMeterImage.trim() === '')) {
      toast.error('Please capture a meter reading photo before checking in.')
      return
    }

    // Two-meter stations need a baseline reading + photo for *each* meter
    // at check-in so the discrepancy math has both starting points to
    // compare against. Skipping a meter at the start of the shift leaves
    // no anchor for the missing-energy calculation.
    //
    // Only enforce meter 2 when the charger also requires meter readings
    // at all (haveMeterReading=true). A hasTwoMeters charger configured
    // with haveMeterReading=false has opted readings out entirely, so we
    // must not block check-in on meter 2 for it.
    if (hasTwoMeters && requiresMeterReading) {
      if (!checkInMeterReading2 || checkInMeterReading2.trim() === '') {
        toast.error('This station has two meters — enter the Meter 2 reading before checking in.')
        return
      }
      if (!checkInMeterImage2 || checkInMeterImage2.trim() === '') {
        toast.error('Capture a Meter 2 photo before checking in.')
        return
      }
    } else if (checkInMeterReading2 && (!checkInMeterImage2 || checkInMeterImage2.trim() === '')) {
      toast.error('Please capture a photo for the second meter reading before checking in.')
      return
    }

    // use the last verified "here", else re-request as a fallback
  const here = pendingCheckInHere ?? (await getLocationOnce().catch(() => null))
  if (!here) {
    toast.error('Could not read your location for check-in.')
    return
  }

  const checkInData: CheckInData = {
    operatorShiftId: selectedShiftId,
    operatorLatitude: String(here.lat),
    operatorLongitude: String(here.lng),
    imageUrl: checkInImage && checkInImage.trim() !== '' ? checkInImage : undefined,
    checkInMeterReading: parseMeterReadingValue(checkInMeterReading),
    checkInMeterReadingImageUrl: checkInMeterImage && checkInMeterImage.trim() !== '' ? checkInMeterImage : undefined,
    checkInMeterReading2: parseMeterReadingValue(checkInMeterReading2),
    checkInMeterReadingImageUrl2: checkInMeterImage2 && checkInMeterImage2.trim() !== '' ? checkInMeterImage2 : undefined,
  }
  checkInMutation.mutate(checkInData)
}

  const getShiftStatus = (shift: OperatorShift
    //  | ShiftWithSwap
    ) => {
    if (activeShift && activeShift.id === shift.id) {
      return 'active'
    }

    // Let backend handle all time validation - frontend just shows all shifts as available
    return 'available'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'available': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'available': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-black">My Shifts</h1>
            <TabsList className="grid w-full sm:w-auto grid-cols-1 bg-gray-100">
              <TabsTrigger value="my-shifts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">My Shifts</span>
                <span className="sm:hidden">Shifts</span>
          </TabsTrigger>
              {/* <TabsTrigger value="shift-swaps" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Shift Swaps</span>
                <span className="sm:hidden">Swaps</span>
          </TabsTrigger> */}
        </TabsList>
          </div>

        <TabsContent value="my-shifts" className="space-y-4 lg:space-y-6">
          {/* Active Shift */}
          {activeShift && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <h3 className="text-lg sm:text-xl font-semibold text-black">Currently Working</h3>
                    {(activeShift as any).type === 'swap' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1">
                        <Repeat2 className="h-3 w-3 mr-1" />
                        Swapped Shift
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base break-words">{getDayName(activeShift.dayOfWeek)} • {formatTimeTo12Hour(activeShift.startTime)} - {formatTimeTo12Hour(activeShift.endTime)}</span>
                    </div>
                  <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base break-words">{(activeShift as any)?.charger?.name || (activeShift as any)?.location?.name || 'Location not specified'}</span>
                    </div>
                    {(activeShift as any).type === 'swap' && (activeShift as any).reason && (
                      <div className="text-xs sm:text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        <strong>Swap Reason:</strong> {(activeShift as any).reason}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-gray-500">
                      Started: {new Date(activeShift.checkInTime).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                  <Button
                  onClick={openCheckOutForm}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-2.5 w-full sm:w-auto text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200"
                  title={`Must be within ${(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km of the charger to check out`}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                </div>
            </div>
          )}

          {/* Available Shifts - Only show if no active shift */}
          {!activeShift && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-black">Available Shifts</h3>
              
            {regularShiftsLoading || shiftReportsLoading ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <Clock className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading shifts...</p>
                </div>
            ) : shifts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-black mb-2">No Shifts Available</h3>
                  <p className="text-gray-600">You don't have any assigned shifts at the moment.</p>
                </div>
            ) : (
                <div className="space-y-3">
                {sortShiftsByProximity(shifts).map((shift) => {
                  const status = getShiftStatus(shift)
                  // Let backend handle all validation - always show check in button
                  const canCheckIn = status !== 'active'
                  
                  return (
                      <div 
                        key={shift.id} 
                        className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-gray-300 transition-colors"
                      >
                        {/* Mobile-first responsive layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          {/* Left side - Shift info */}
                          <div className="flex-1 min-w-0">
                            {/* Day and time row */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-black text-sm sm:text-base">
                                  {getDayName(shift.dayOfWeek)}
                                </span>
                                {/* Timing Indicator Badge */}
                                {(() => {
                                  const timing = getShiftTimingIndicator(shift.dayOfWeek)
                                  return (
                                    <Badge variant={timing.variant} className="text-xs px-2 py-1">
                                      {timing.label}
                                    </Badge>
                                  )
                                })()}
                                {/* Swap Indicator Badge */}
                                {(shift as any).type === 'swap' && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-1">
                                    <Repeat2 className="h-3 w-3 mr-1" />
                                    Swapped
                                  </Badge>
                                )}
                              </div>
                              <span className="text-gray-500 text-sm sm:text-base">
                                {formatTimeTo12Hour(shift.startTime)} - {formatTimeTo12Hour(shift.endTime)}
                              </span>
                            </div>

                            {/* Location row */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                {(shift as any)?.charger?.name || (shift as any)?.location?.name || 'Location not specified'}
                              </span>
                            </div>

                            {/* Swap reason */}
                            {(shift as any).type === 'swap' && (shift as any).reason && (
                              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                                <strong>Swap Reason:</strong> {(shift as any).reason}
                              </div>
                            )}
                          </div>
                          
                          {/* Right side - Check In button */}
                          {canCheckIn && (
                            <div className="flex-shrink-0">
                              <Button
                                onClick={() => openCheckInForm(shift.id)}
                                className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white px-4 sm:px-6 py-2 text-sm sm:text-base"
                                title={`Must be within ${(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km of the charger to check in`}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                <span className="hidden xs:inline">Check In</span>
                                <span className="xs:hidden">Check In</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                  )
                })}
              </div>
            )}
          </div>
          )}
        </TabsContent>

        {/* <TabsContent value="shift-swaps">
          <ShiftSwapManagement />
        </TabsContent> */}
      </Tabs>

      {/* Check-in Dialog */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold">Check In to Shift</DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Take a photo and provide meter reading to check in.
            </DialogDescription>
          </DialogHeader>
          
          {pendingCheckInDist !== null && (
            <div className="text-xs rounded-md bg-green-50 border border-green-200 px-2 py-1 mb-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <p className="text-green-800">
                  ✓ {formatKm(pendingCheckInDist)} km
                </p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="checkin-image" className="text-xs font-medium">
                Photo <span className="text-red-500">*</span>
              </Label>
              <ImageUpload
                onImageChange={(name, url) => setCheckInImage(url)}
                currentImage={checkInImage}
                name="checkin-image"
                label="Take a photo of yourself"
                isRequired={true}
                uploadContext="shift-checkin-selfie"
                entityId={selectedShiftId || undefined}
              />
            </div>
            
            {(() => {
              const selectedShift = shifts.find(s => s.id === selectedShiftId)
              const requiresMeterReading = selectedShift?.charger?.haveMeterReading === true
              const hasTwoMeters = selectedShift?.charger?.hasTwoMeters === true

              if (!requiresMeterReading) return null

              return (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="meter-reading" className="text-xs font-medium">
                      {hasTwoMeters ? 'Meter 1 Reading' : 'Meter Reading'} <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="meter-reading"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={checkInMeterReading}
                      onChange={(e) => handleCheckInMeterInputChange(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter meter reading"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      {hasTwoMeters ? 'Meter 1 Photo' : 'Meter Photo'} <span className="text-red-500">*</span>
                    </Label>
                    <ImageUpload
                      onImageChange={(_, url) => setCheckInMeterImage(url)}
                      currentImage={checkInMeterImage}
                      name="checkin-meter-image"
                      label="Capture meter reading"
                      isRequired={true}
                      // @ts-ignore
                      cameraOnly
                      uploadContext="shift-checkin-meter"
                      entityId={selectedShiftId || undefined}
                    />
                  </div>

                  {hasTwoMeters && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="meter-reading-2" className="text-xs font-medium">
                          Meter 2 Reading <span className="text-red-500">*</span>
                        </Label>
                        <input
                          id="meter-reading-2"
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9.,]*"
                          value={checkInMeterReading2}
                          onChange={(e) => handleCheckInMeterInput2Change(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter meter 2 reading"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Meter 2 Photo <span className="text-red-500">*</span>
                        </Label>
                        <ImageUpload
                          onImageChange={(_, url) => setCheckInMeterImage2(url)}
                          currentImage={checkInMeterImage2}
                          name="checkin-meter-image-2"
                          label="Capture meter 2 reading"
                          isRequired={true}
                          // @ts-ignore
                          cameraOnly
                          uploadContext="shift-checkin-meter2"
                          entityId={selectedShiftId || undefined}
                        />
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCheckInDialog(false)}
              disabled={checkInMutation.isPending}
              className="w-full sm:w-auto order-2 sm:order-1 h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={(() => {
                const selectedShift = shifts.find(s => s.id === selectedShiftId)
                const requiresMeterReading = selectedShift?.charger?.haveMeterReading === true
                const hasTwoMeters = selectedShift?.charger?.hasTwoMeters === true
                const hasRequiredMeterReading = requiresMeterReading
                  ? checkInMeterReading && checkInMeterImage
                  : true
                // Only require meter 2 when the charger also requires meter
                // readings at all — hasTwoMeters with haveMeterReading=false
                // is a readings-opted-out config and must not block check-in.
                const hasRequiredMeter2 = (hasTwoMeters && requiresMeterReading)
                  ? checkInMeterReading2 && checkInMeterImage2
                  : true
                return !checkInImage || !hasRequiredMeterReading || !hasRequiredMeter2 || checkInMutation.isPending
              })()}
              className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto order-1 sm:order-2 h-9 text-sm"
            >
              {checkInMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Check In
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog — shared component (consolidates all 3 prior flows). */}
      <ShiftCheckOutDialog
        open={showCheckOutDialog}
        onOpenChange={(o) => {
          setShowCheckOutDialog(o)
          if (!o) {
            setPendingCheckOutDist(null)
            setPendingCheckOutHere(null)
          }
        }}
        activeShiftReport={activeShiftReportData}
        operatorShiftId={activeShift?.id ?? null}
        isLastShift={activeShift?.isLastShift}
        distance={pendingCheckOutDist}
        here={pendingCheckOutHere}
        onCompleted={() => {
          setPendingCheckOutDist(null)
          setPendingCheckOutHere(null)
        }}
      />
      </div>
    </div>
  )
}
