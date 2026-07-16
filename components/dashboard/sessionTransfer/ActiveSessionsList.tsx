'use client'

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Circle,
  ArrowRight,
  Clock,
  Battery,
  MapPin,
  Car,
  Zap,
  Loader2,
  AlertCircle,
  RefreshCw,
  DollarSign,
  StopCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedCounter } from '@/components/ui/animated-counter'

import { SessionTransferDialog } from './SessionTransferDialog'
import { EndRemoteSessionDialog } from '@/components/shared/EndRemoteSessionDialog'
import {
  type ChargingSession,
  formatSessionDuration,
  getSessionStatusColor,
  getSessionStatusIcon
} from '@/lib/api/sessionTransfer'
import { getOperatorActiveSessions, type Session } from '@/lib/api/chargingSessions'

export function ActiveSessionsList() {
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [endRemoteSession, setEndRemoteSession] = useState<ChargingSession | null>(null)
  const queryClient = useQueryClient()

  // Map backend Session (endSoc) to frontend ChargingSession (currentSoc)
  const mapSession = (s: Session): ChargingSession => ({
    ...s,
    currentSoc: s.endSoc ?? s.startSoc ?? 0,
    vehicle: s.vehicle ? {
      ...s.vehicle,
      licensePlates: s.vehicle.licensePlates ?? [],
    } : { id: '', make: '', model: '', kabisaId: '', licensePlates: [] },
    charger: s.charger ?? { id: '', name: '', address: '' },
    gun: s.gun ? { id: s.gun.id, gunNumber: s.gun.name || '' } : { id: '', gunNumber: '' },
  }) as ChargingSession

  // Fetch active sessions
  const {
    data: sessionsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const sessions = await getOperatorActiveSessions()
      return { sessions: sessions.map(mapSession) }
    },
  })

  // Keep session list in sync via WebSocket
  useOperatorWs({
    onConnected: () => { void queryClient.invalidateQueries({ queryKey: ['activeSessions'] }); },
    onSessionStarted: (session) => {
      const mapped = mapSession(session as unknown as Session);
      queryClient.setQueryData<{ sessions: ChargingSession[] }>(['activeSessions'], (prev) => {
        if (!prev) return prev;
        const exists = prev.sessions.some((s) => s.id === mapped.id);
        if (exists) return prev;
        return { ...prev, sessions: [...prev.sessions, mapped] };
      });
      void queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onSessionEnded: ({ sessionId }) => {
      queryClient.setQueryData<{ sessions: ChargingSession[] }>(['activeSessions'], (prev) => {
        if (!prev) return prev;
        return { ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) };
      });
      void queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onSessionTransferred: ({ sessionId, session: transferredSession }) => {
      const mapped = mapSession(transferredSession as unknown as Session);
      queryClient.setQueryData<{ sessions: ChargingSession[] }>(['activeSessions'], (prev) => {
        if (!prev) return prev;
        const exists = prev.sessions.some((s) => s.id === sessionId);
        if (exists) {
          // We are the source operator — remove the transferred session
          return { ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) };
        }
        // We are the target operator — add the incoming session
        return { ...prev, sessions: [...prev.sessions, mapped] };
      });
      void queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    },
    onSessionTelemetry: ({ sessionId, chargedKwh, currentSoc }) => {
      queryClient.setQueryData<{ sessions: ChargingSession[] }>(['activeSessions'], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  chargedKwh: chargedKwh ?? s.chargedKwh,
                  currentSoc: currentSoc ?? s.currentSoc,
                }
              : s
          ),
        };
      });
    },
  })

  const sessions = sessionsData?.sessions || []

  const handleTransferSession = (session: ChargingSession) => {
    setSelectedSession(session)
    setShowTransferDialog(true)
  }

  const handleTransferComplete = () => {
    setSelectedSession(null)
    setShowTransferDialog(false)
    // The query will automatically refetch due to invalidation
  }

  const getStatusIcon = (status: string) => {
    const iconMap = {
      'STARTED': Play,
      'PAUSED': Pause,
      'COMPLETED': CheckCircle,
      'CANCELLED': XCircle,
    }
    const IconComponent = iconMap[status as keyof typeof iconMap] || Circle
    return <IconComponent className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load active sessions. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <p className="text-sm text-gray-500">
            {sessions.length} active charging session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
            <p className="text-gray-500 text-center">
              You don't have any active charging sessions at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(session.sessionStatus)}
                    <CardTitle className="text-base">
                      {session.vehicle.make} {session.vehicle.model}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {session.source === 'REMOTE' && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Online</Badge>
                    )}
                    <Badge className={getSessionStatusColor(session.sessionStatus)}>
                      {session.sessionStatus}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {session.vehicle.licensePlates[0]?.licencePlateNumber || 'No License Plate'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Prominent Gun & Pedestal Labels */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-blue-500 font-medium">Gun</p>
                    <p className="text-lg font-bold text-blue-800 truncate">{session.gun.gunNumber || '—'}</p>
                  </div>
                  <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-purple-500 font-medium">Pedestal</p>
                    <p className="text-lg font-bold text-purple-800 truncate">{session.pedestal?.name || '—'}</p>
                  </div>
                </div>

                {/* SOC Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Battery Level</span>
                    <span className="font-bold">
                      {session.source === 'REMOTE' ? (
                        <AnimatedCounter value={session.currentSoc} decimals={0} suffix="%" duration={1200} highlightOnChange />
                      ) : (
                        <>{session.currentSoc}%</>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${session.currentSoc}%` }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Session Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Charger
                    </span>
                    <span className="font-medium">{session.charger.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Battery className="h-3 w-3" />
                      Energy Charged
                    </span>
                    <span className="font-bold">
                      {session.chargedKwh != null ? (
                        session.source === 'REMOTE' ? (
                          <AnimatedCounter value={session.chargedKwh} decimals={2} suffix=" kWh" duration={1200} highlightOnChange />
                        ) : (
                          <>{session.chargedKwh.toFixed(2)} kWh</>
                        )
                      ) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duration
                    </span>
                    <span className="font-medium">{formatSessionDuration(session.startTime)}</span>
                  </div>
                </div>

                <Separator />

                {/* Payment Method */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Payment
                    </span>
                    <span className="font-medium">
                      {session.paymentMethodName || 'N/A'}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* End Remote Session Button */}
                {session.source === 'REMOTE' && session.canOperatorEndRemoteSession && session.sessionStatus === 'STARTED' && (
                  <Button
                    onClick={() => setEndRemoteSession(session)}
                    className="w-full flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    <StopCircle className="h-4 w-4" />
                    End Remote Session
                  </Button>
                )}

                {/* Transfer Button */}
                <Button
                  onClick={() => handleTransferSession(session)}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                  disabled={session.sessionStatus !== 'STARTED'}
                >
                  <ArrowRight className="h-4 w-4" />
                  Transfer Session
                </Button>

                {session.sessionStatus !== 'STARTED' && (
                  <p className="text-xs text-gray-500 text-center">
                    Only active sessions can be transferred
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* End Remote Session Dialog */}
      <EndRemoteSessionDialog
        session={endRemoteSession}
        open={!!endRemoteSession}
        onOpenChange={(open) => { if (!open) setEndRemoteSession(null) }}
      />

      {/* Transfer Dialog */}
      <SessionTransferDialog
        session={selectedSession}
        isOpen={showTransferDialog}
        onClose={() => {
          setSelectedSession(null)
          setShowTransferDialog(false)
        }}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  )
}
