'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useActiveShift } from '@/lib/hooks/useActiveShift'
import { useAuth } from '@/lib/auth/authContext'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { toast } from 'sonner'
import { GEOFENCE_RADIUS_M, type Coords, distanceMeters, formatKm, getLocationOnce } from '@/lib/utils/geo'
import { ShiftCheckOutDialog } from './ShiftCheckOutDialog'


interface ShiftStatusIndicatorProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export const ShiftStatusIndicator: React.FC<ShiftStatusIndicatorProps> = ({
  className = '',
  showDetails = true,
  compact = false
}) => {
  const { activeShiftReport, isLoading, hasActiveShift } = useActiveShift()
  const { user } = useAuth()
  const router = useLocalizedRouter()

  // Checkout dialog state — full form lives in <ShiftCheckOutDialog>.
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false)
  const [pendingCheckOutDist, setPendingCheckOutDist] = useState<number | null>(null)
  const [pendingCheckOutHere, setPendingCheckOutHere] = useState<Coords | null>(null)

  // Get charger coordinates from the active shift
  function getChargerCoords(): Coords | null {
    if (!activeShiftReport?.operatorShift) return null
    const charger = (activeShiftReport.operatorShift as any)?.charger
    if (!charger) return null

    const lat = typeof charger.latitude === 'string' ? parseFloat(charger.latitude) : charger.latitude
    const lng = typeof charger.longitude === 'string' ? parseFloat(charger.longitude) : charger.longitude

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return null
  }

  async function openCheckOutForm() {
    if (!activeShiftReport) {
      toast.error('No active shift found.')
      return
    }

    // operatorShift is optional on the API response — without it we lose
    // charger config (hasTwoMeters), shift id, and isLastShift, so the
    // checkout dialog would silently skip meter 2 + handoff validation.
    // Refuse to open and tell the operator to retry, rather than letting
    // an unvalidated checkout through.
    const operatorShift = (activeShiftReport as any)?.operatorShift
    if (!operatorShift || !operatorShift.id) {
      toast.error('Shift details missing. Reload the page and try again.')
      return
    }

    const coords = getChargerCoords()
    if (!coords) {
      toast.error('Could not find charger coordinates.')
      return
    }

    try {
      const here = await getLocationOnce()
      const dist = distanceMeters(here, coords)
      if (dist > GEOFENCE_RADIUS_M) {
        toast.error(`You're ${formatKm(dist)} away. Must be within ${(GEOFENCE_RADIUS_M / 1000).toFixed(2)} km.`)
        return
      }
      setPendingCheckOutDist(dist)
      setPendingCheckOutHere(here)
      setShowCheckOutDialog(true)
    } catch (e: any) {
      toast.error(e?.message ?? 'Enable location (HTTPS required).')
    }
  }

  if (isLoading) {
    return (
      <Card className={`border-l-4 border-l-blue-500 ${className}`}>
        <CardContent className={compact ? "p-1" : "p-3"}>
          <div className="flex items-center gap-2">
            <Loader2 className={`${compact ? "h-3 w-3" : "h-3 w-3"} animate-spin text-blue-500`} />
            <span className={`${compact ? "text-xs" : "text-xs"} text-gray-600`}>
              {compact ? "Loading..." : "Checking shift status..."}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasActiveShift && activeShiftReport) {
    const operatorShift = activeShiftReport.operatorShift as any
    return (
      <>
        <Card className={`border-l-4 border-l-green-500 ${className}`}>
          <CardContent className={compact ? "p-1" : "p-3"}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className={`${compact ? "h-3 w-3" : "h-4 w-4"} text-green-500 flex-shrink-0`} />
                <div className="min-w-0 flex-1">
                  <Badge variant="default" className={`bg-green-100 text-green-800 ${compact ? "text-xs px-2 py-0.5" : "text-xs"}`}>
                    Active Shift
                  </Badge>
                  {showDetails && !compact && (
                    <div className="mt-1 text-xs text-gray-600 break-words">
                      {(() => {
                        const started = new Date(activeShiftReport.checkInTime)
                        const now = new Date()
                        const isSameDay =
                          started.getFullYear() === now.getFullYear() &&
                          started.getMonth() === now.getMonth() &&
                          started.getDate() === now.getDate()
                        const yesterday = new Date(now)
                        yesterday.setDate(now.getDate() - 1)
                        const isYesterday =
                          started.getFullYear() === yesterday.getFullYear() &&
                          started.getMonth() === yesterday.getMonth() &&
                          started.getDate() === yesterday.getDate()

                        const timePart = started.toLocaleTimeString()
                        let dayPart: string
                        if (isSameDay) dayPart = 'today'
                        else if (isYesterday) dayPart = 'yesterday'
                        else dayPart = `on ${started.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })}`

                        return `Hello ${user?.firstName || 'there'}! Your Shift started ${dayPart} at ${timePart}`
                      })()}
                    </div>
                  )}
                </div>
              </div>
              {showDetails && !compact && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-3 w-full sm:w-auto"
                  onClick={openCheckOutForm}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Check Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <ShiftCheckOutDialog
          open={showCheckOutDialog}
          onOpenChange={(o) => {
            setShowCheckOutDialog(o)
            if (!o) {
              setPendingCheckOutDist(null)
              setPendingCheckOutHere(null)
            }
          }}
          activeShiftReport={activeShiftReport as any}
          operatorShiftId={operatorShift?.id ?? null}
          isLastShift={operatorShift?.isLastShift}
          distance={pendingCheckOutDist}
          here={pendingCheckOutHere}
          onCompleted={() => {
            setPendingCheckOutDist(null)
            setPendingCheckOutHere(null)
          }}
        />
      </>
    )
  }

  return (
    <Card className={className}>
      <CardContent className={compact ? "p-1" : "p-3"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className={`${compact ? "h-3 w-3" : "h-4 w-4"} text-gray-500 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className={`bg-[#FFD400] text-gray-900 rounded-full ${compact ? "text-xs px-2 py-0.5" : "text-xs px-3 py-1"}`}>
                No Active Shift
              </Badge>
              {showDetails && !compact && (
                <div className="mt-1 text-xs text-gray-600 break-words">
                  Hey {user?.firstName || 'there'}! Don't forget to start your shift to begin charging sessions
                </div>
              )}
            </div>
          </div>
          {showDetails && !compact && (
            <Button
              size="sm"
              className="text-xs h-7 px-3 w-full sm:w-auto bg-[#FFD400] text-gray-900 border-[#FFD400] hover:bg-[#e6bf00]"
              onClick={() => router.push('/dashboard/shifts')}
            >
              Start Shift
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
