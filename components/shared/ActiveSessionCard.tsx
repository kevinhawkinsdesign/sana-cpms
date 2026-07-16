'use client'

import { useEffect, useState } from 'react'
import { Zap, Battery, StopCircle, ArrowRight, Eye, UserPlus, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ChargingIndicator from '@/components/shared/ChargingIndicator'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import type { Session } from '@/lib/api/chargingSessions'

// Format elapsed ms always including seconds: "Xs" / "Xm Ys" / "Hh Mm Ss" / "Dd Hh Mm Ss"
const formatElapsed = (ms: number) => {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const sec = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const min = totalMin % 60
  const totalHr = Math.floor(totalMin / 60)
  const hr = totalHr % 24
  const day = Math.floor(totalHr / 24)

  if (day > 0) return `${day}d ${hr}h ${min}m ${sec}s`
  if (totalHr > 0) return `${hr}h ${min}m ${sec}s`
  if (totalMin > 0) return `${min}m ${sec}s`
  return `${sec}s`
}

interface ActiveSessionCardProps {
  readonly session: Session
  readonly onEndSession?: (session: Session) => void
  readonly onEndRemoteSession?: (session: Session) => void
  readonly onTransfer?: (session: Session) => void
  readonly onView?: (session: Session) => void
  readonly onAddCustomerInfo?: (session: Session) => void
}

export function ActiveSessionCard({
  session,
  onEndSession,
  onEndRemoteSession,
  onTransfer,
  onView,
  onAddCustomerInfo,
}: ActiveSessionCardProps) {
  // Tick every second so the seconds portion of the elapsed counter stays
  // fresh. Single setState per second is cheap even with many cards.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  const startTimeDate = session.startTime ? new Date(session.startTime) : null
  const elapsedMs = startTimeDate ? now - startTimeDate.getTime() : 0
  const startTimeLabel = startTimeDate
    ? startTimeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  const isRemote = session.source === 'REMOTE'
  const vehicleLabel =
    session.carModelMake
    || (session.vehicle?.make || session.vehicle?.model
      ? `${session.vehicle?.make ?? ''} ${session.vehicle?.model ?? ''}`.trim()
      : null)
    || session.customerName
    || null
  const needsCustomerInfo = isRemote && session.customerInfoAdded === false && !!onAddCustomerInfo
  const licensePlate = session.vehicle?.licensePlates?.[0]?.licencePlateNumber

  const headerClickable = !needsCustomerInfo && !!onView

  return (
    <Card className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gray-100 dark:bg-white/10 ring-1 ring-gray-200 flex-shrink-0">
            <ChargingIndicator />
          </div>
          <div className="flex-1 min-w-0">
            {needsCustomerInfo ? (
              /* ── No customer info state ── */
              <button
                type="button"
                className="w-full text-left group cursor-pointer"
                onClick={() => onAddCustomerInfo(session)}
                aria-label="Add customer and vehicle info"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    Needs info
                  </span>
                  {session.source && (
                    <Badge variant="secondary" className="text-xs">
                      {session.source}
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 rounded-md border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/50 px-3 py-2 group-hover:border-amber-500 group-hover:bg-amber-100 group-hover:shadow-sm transition-all">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">Tap to add customer & vehicle info</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{session.charger?.name || 'Unknown Charger'}</p>
                </div>
              </button>
            ) : (() => {
              const headerBody = (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={
                        headerClickable
                          ? 'text-lg font-bold text-black truncate group-hover:text-[#0E159A] transition-colors'
                          : 'text-lg font-bold text-black truncate'
                      }
                    >
                      {vehicleLabel || 'Session'}
                    </h3>
                    {session.source && (
                      <Badge variant={isRemote ? 'secondary' : 'outline'} className="text-xs">
                        {session.source}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                    {session.charger?.name || 'Unknown Charger'}
                  </p>
                  {session.commonSessionTag && (
                    <p className="text-xs text-muted-foreground">Tag: {session.commonSessionTag}</p>
                  )}
                  {licensePlate && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                      {licensePlate}
                    </div>
                  )}
                </>
              )
              return headerClickable ? (
                <button
                  type="button"
                  className="w-full text-left group cursor-pointer rounded-md -mx-1 px-1 py-0.5 hover:bg-gray-50 transition-colors"
                  onClick={() => onView?.(session)}
                  aria-label="View session details"
                >
                  {headerBody}
                </button>
              ) : (
                <>{headerBody}</>
              )
            })()}
          </div>
        </div>

        {/* Gun & Pedestal — informational chips (not clickable) */}
        {(session.gun?.gunNumber || session.gun?.name || session.pedestal?.name) && (
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-md px-2 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium leading-none mb-0.5">Gun</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{session.gun?.gunNumber || session.gun?.name || '—'}</p>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-md px-2 py-1.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium leading-none mb-0.5">Pedestal</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{session.pedestal?.name || '—'}</p>
            </div>
          </div>
        )}

        {/* Start time & elapsed (ticks every 30s) */}
        {startTimeLabel && (
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-md px-3 py-1.5">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              Started {startTimeLabel}
            </span>
            <span className="font-medium" style={{ color: '#0E159A' }}>
              {formatElapsed(elapsedMs)}
            </span>
          </div>
        )}

        {/* Live telemetry */}
        {(session.chargedKwh != null || session.endSoc != null) && (
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded-md px-3 py-2">
            {session.chargedKwh != null && (
              <span className="flex items-center gap-1 font-bold">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                {isRemote ? (
                  <AnimatedCounter value={session.chargedKwh} decimals={2} suffix=" kWh" duration={1200} highlightOnChange />
                ) : (
                  <>{session.chargedKwh.toFixed(2)} kWh</>
                )}
              </span>
            )}
            {session.endSoc != null && (
              <span className="flex items-center gap-1 font-bold">
                <Battery className="h-3.5 w-3.5" style={{ color: '#FFC200' }} />
                {isRemote ? (
                  <AnimatedCounter value={session.endSoc} decimals={0} suffix="%" duration={1200} highlightOnChange />
                ) : (
                  <>{session.endSoc}%</>
                )}
              </span>
            )}
          </div>
        )}

        {/* SOC progress bar — axis spans [0, 100].
            0..start  → light blue (#4561DE) "came with"
            start..current → brand blue (#0E159A) "gained this session"
            current..100 → striped gray "remaining" */}
        {session.endSoc != null && (() => {
          const rawStart = session.startSoc ?? 0
          const rawCurrent = session.endSoc
          const start = Math.min(100, Math.max(0, rawStart))
          const current = Math.min(100, Math.max(start, rawCurrent))
          const gained = current - start
          const remaining = 100 - current
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-end text-[11px]">
                <span className="font-medium" style={{ color: '#0E159A' }}>{remaining}% remaining</span>
              </div>
              <div className="relative">
                <div className="relative h-2.5 w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] overflow-hidden flex">
                  {/* Came with — battery level before the session started (striped to show it wasn't part of this session) */}
                  {start > 0 && (
                    <div
                      className="h-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${start}%`,
                        backgroundColor: '#0E159A',
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 8px)',
                      }}
                      title={`Came with ${start}% (not part of this session)`}
                    />
                  )}
                  {/* Gained during this session */}
                  {gained > 0 && (
                    <div
                      className="h-full transition-[width] duration-700 ease-out"
                      style={{ width: `${gained}%`, backgroundColor: '#0E159A' }}
                      title={`Gained ${gained}% this session`}
                    />
                  )}
                  {/* Remaining space to full */}
                  {remaining > 0 && (
                    <div
                      className="h-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${remaining}%`,
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #f3f4f6 0 6px, #e5e7eb 6px 12px)',
                      }}
                      title={`${remaining}% remaining to full`}
                    />
                  )}
                </div>
                {/* Current % chip anchored at the fill boundary, clamped away from the track edges */}
                {current > 0 && (
                  <div
                    className="absolute -top-1 transition-[left] duration-700 ease-out pointer-events-none"
                    style={{ left: `clamp(14px, ${current}%, calc(100% - 14px))`, transform: 'translateX(-50%)' }}
                  >
                    <span
                      className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full shadow-sm"
                      style={{ backgroundColor: '#0E159A' }}
                    >
                      {current}%
                    </span>
                  </div>
                )}
                {/* Start-SOC tick label sits at its true x position on the axis */}
                {start > 0 && start < 100 && (
                  <div
                    className="absolute top-[14px] text-[10px] text-gray-500 dark:text-gray-400 transition-[left] duration-700 ease-out pointer-events-none"
                    style={{ left: `clamp(10px, ${start}%, calc(100% - 20px))`, transform: 'translateX(-50%)' }}
                  >
                    {start}%
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-3">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )
        })()}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          {!isRemote && onEndSession && (
            <Button
              onClick={() => onEndSession(session)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium w-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              size="sm"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              End Session
            </Button>
          )}
          {isRemote && session.canOperatorEndRemoteSession && session.sessionStatus === 'STARTED' && onEndRemoteSession && (
            <Button
              onClick={() => onEndRemoteSession(session)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium w-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              size="sm"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              End Remote Session
            </Button>
          )}
          <div className="flex gap-2">
            {onTransfer && (
              <Button
                onClick={() => onTransfer(session)}
                className="group bg-[#0E159A] hover:bg-[#0B1178] text-white font-medium flex-1 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                size="sm"
              >
                <ArrowRight className="mr-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                Transfer
              </Button>
            )}
            {onView && (
              <Button
                onClick={() => onView(session)}
                className="bg-white dark:bg-[#1A1A1A] text-gray-800 dark:text-white/90 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium flex-1 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                size="sm"
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
