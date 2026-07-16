'use client'

/**
 * Operator live-session state + realtime wiring, shared by the legacy dashboard
 * operator page and the console operator overview so the WebSocket handlers and
 * refresh helpers live in one place.
 *
 * Owns: active sessions, recent sessions, session alerts, and the CitrineOS
 * WebSocket subscription (start/update/end/transfer/telemetry/payment). Pages
 * keep their own stats, dialogs and initial fetch — they seed this hook's lists
 * via the returned setters.
 */
import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'
import {
  getOperatorActiveSessions,
  getOperatorLatestSessions,
  getOperatorSessionAlerts,
  type Session,
  type OperatorSessionAlerts,
} from '@/lib/api/chargingSessions'

export function useOperatorLiveSessions() {
  const queryClient = useQueryClient()
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [sessionAlerts, setSessionAlerts] = useState<OperatorSessionAlerts | null>(null)
  // Session IDs whose `isPaid` was set optimistically via WS; protects against a
  // refresh that races replication lag and returns the row still unpaid.
  const optimisticallyPaidRef = useRef<Set<string>>(new Set())

  const refreshActiveSessions = useCallback(async () => {
    try {
      const updated = await getOperatorActiveSessions()
      setActiveSessions(
        updated.map((s) =>
          !s.isPaid && optimisticallyPaidRef.current.has(s.id) ? { ...s, isPaid: true } : s,
        ),
      )
    } catch {
      /* ignore */
    }
  }, [])

  const refreshSessionAlerts = useCallback(() => {
    getOperatorSessionAlerts().then(setSessionAlerts).catch(() => {})
  }, [])

  const refreshSessionsInBackground = useCallback(() => {
    refreshActiveSessions().catch(() => {})
    // invalidateQueries already refetches active queries — no separate refetch.
    queryClient.invalidateQueries({ queryKey: ['sessions'] }).catch(() => {})
    getOperatorLatestSessions().then(setRecentSessions).catch(() => {})
  }, [queryClient, refreshActiveSessions])

  useOperatorWs({
    onConnected: () => {
      refreshActiveSessions().catch(() => {})
    },
    onSessionStarted: (session) => {
      setActiveSessions((prev) => (prev.some((s) => s.id === session.id) ? prev : [session, ...prev]))
      toast.success(`New charging session started at ${session.charger?.name ?? 'charger'}`)
    },
    // In-place merge for backend-side mutations after start (e.g. EVCC MAC
    // auto-fills vehicleId). Drop vehicle.imageUrl — the operator captures the
    // live session photo; the saved vehicle photo would mislead on the card.
    onSessionUpdated: (session) => {
      const stripped = session.vehicle
        ? { ...session, vehicle: { ...session.vehicle, imageUrl: null } }
        : session
      setActiveSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, ...stripped } : s)))
    },
    onSessionEnded: ({ sessionId }) => {
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.info('A charging session has ended')
    },
    onSessionTransferred: ({ sessionId, session: transferred }) => {
      setActiveSessions((prev) => {
        if (prev.some((s) => s.id === sessionId)) return prev.filter((s) => s.id !== sessionId)
        // Target operator: prepend the incoming session. Guard against a payload
        // that omits it (would otherwise push undefined and crash the card) —
        // refreshActiveSessions() below reconciles from the authoritative list.
        return transferred ? [transferred, ...prev] : prev
      })
      refreshActiveSessions().catch(() => {})
    },
    onSessionTelemetry: ({ sessionId, chargedKwh, currentSoc, startSoc }) => {
      const patch = (s: Session): Session => {
        if (s.id !== sessionId) return s
        return {
          ...s,
          chargedKwh: chargedKwh ?? s.chargedKwh,
          endSoc: currentSoc ?? s.endSoc,
          startSoc: startSoc ?? s.startSoc,
        }
      }
      setActiveSessions((prev) => prev.map(patch))
      setRecentSessions((prev) => prev.map(patch))
    },
    onPaymentConfirmed: ({ sessionId }) => {
      optimisticallyPaidRef.current.add(sessionId)
      setActiveSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, isPaid: true } : s)))
      refreshActiveSessions().catch(() => {})
      refreshSessionAlerts()
      queryClient.invalidateQueries({ queryKey: ['sessions'] }).catch(() => {})
      toast.success('MoMo payment confirmed')
    },
    onPaymentFailed: ({ reason }) => {
      refreshActiveSessions().catch(() => {})
      refreshSessionAlerts()
      toast.error(reason ? `MoMo payment failed: ${reason}` : 'MoMo payment failed')
    },
  })

  return {
    activeSessions,
    setActiveSessions,
    recentSessions,
    setRecentSessions,
    sessionAlerts,
    setSessionAlerts,
    optimisticallyPaidRef,
    refreshActiveSessions,
    refreshSessionAlerts,
    refreshSessionsInBackground,
  }
}
