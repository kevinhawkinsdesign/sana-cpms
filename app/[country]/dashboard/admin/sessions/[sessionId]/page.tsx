'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { useAuth } from '@/lib/auth/authContext'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { useMomoStatusCheck } from '@/lib/hooks/useMomoStatusCheck'
import { useProformaDownload } from '@/lib/hooks/useProformaDownload'
import { getStatusDisplayColor } from '@/lib/utils/formatters'
import { isEligibleForEbm } from '@/lib/utils/ebmEligibility'
import { getOperatorDisplay } from '@/lib/utils/operatorDisplay'
import {
  getAllSessions,
  getUserDetails,
  type AdminSession,
} from '@/lib/api/admin'
import {
  computeRatePerKwh,
  CustomerCard,
  EbmsCard,
  EnergyCard,
  NotesCard,
  PaymentCard,
  ResourcesCard,
  SessionActionButtons,
  SessionDetailsHeader,
  SessionHeroMetrics,
  TimingCard,
  TransactionsCard,
} from '@/components/dashboard/sessions/SessionDetailsParts'
import { useAdminEBMDialogs } from '@/components/dashboard/admin/AdminSessionEBMDialogs'
import { AdminSessionEditDialog } from '@/components/dashboard/admin/AdminSessionEditDialog'
import { AdminEndSessionDialog } from '@/components/dashboard/admin/AdminEndSessionDialog'
import { AdminSessionLiveEditDialog } from '@/components/dashboard/admin/AdminSessionLiveEditDialog'
import { SessionHistory } from '@/components/dashboard/admin/SessionHistory'

const AdminSessionPageBody: React.FC = () => {
  const { user } = useAuth()
  const router = useLocalizedRouter()
  const params = useParams<{ country: string; sessionId: string }>()
  const sessionId = params?.sessionId ?? ''
  const queryClient = useQueryClient()

  const [session, setSession] = useState<AdminSession | null>(null)
  const [operatorCache, setOperatorCache] = useState<
    Record<string, { firstName: string; lastName: string; email: string }>
  >({})
  const [loadingOperators, setLoadingOperators] = useState<Set<string>>(new Set())
  const [editOpen, setEditOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [liveEditOpen, setLiveEditOpen] = useState(false)

  // Financial edits are ADMIN-only on the backend; gate the action accordingly.
  const isAdmin = user?.role === 'ADMIN'
  // The recalculate/relink+price flow only applies to finalized sessions (matches the
  // backend guard) — don't offer it for live (STARTED/PAUSED) or CANCELLED ones.
  const isEditable =
    isAdmin && !!session && ['COMPLETED', 'PAID', 'EBM_ISSUED', 'REFUNDED'].includes(session.sessionStatus)
  // In-progress sessions can be ended (or force-ended if remote) and relink-edited.
  const isInProgress =
    isAdmin && !!session && ['STARTED', 'PAUSED'].includes(session.sessionStatus)

  // Share URL = current location verbatim. The path itself carries the id, so
  // we don't reuse `useShareUrl` (which would inject a redundant `?sessionId=`).
  const [shareUrl, setShareUrl] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href)
  }, [sessionId])
  const handleCopy = React.useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [shareUrl])

  // Fetch the single session. Exact-match `sessionId` API param avoids partial
  // hits across other columns.
  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getAllSessions({ page: 1, limit: 1, sessionId }),
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  })

  const invalidateSessionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['allSessions'] })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
    queryClient.invalidateQueries({ queryKey: ['sharedSession', sessionId] })
  }

  // Keep local `session` in sync with the query, so EBM dialog success handlers
  // can optimistically patch fields without losing them on next refetch.
  useEffect(() => {
    const match = sessionQuery.data?.data?.sessions?.[0]
    if (match) setSession(match)
  }, [sessionQuery.data])

  // Dedupe in-flight operator fetches via a ref instead of state. Putting the
  // `loadingOperators` Set in the effect's deps would re-fire the effect every
  // time we mutate the Set (new reference per `setLoadingOperators` call),
  // even though the work itself already short-circuited.
  const inFlightOperatorRef = useRef<Set<string>>(new Set())

  // Fetch operator details when the session row lacks an inlined operator name.
  useEffect(() => {
    const opId = session?.operatorId
    if (!opId) return
    if (session?.operator?.firstName) return
    if (operatorCache[opId]) return
    if (inFlightOperatorRef.current.has(opId)) return

    inFlightOperatorRef.current.add(opId)
    setLoadingOperators((prev) => new Set([...prev, opId]))
    getUserDetails(opId)
      .then((response) => {
        setOperatorCache((prev) => ({
          ...prev,
          [opId]: {
            firstName: response.data.user.firstName || 'Unknown',
            lastName: response.data.user.lastName || 'Operator',
            email: response.data.user.email || '',
          },
        }))
      })
      .catch(() => {
        setOperatorCache((prev) => ({
          ...prev,
          [opId]: { firstName: 'Unknown', lastName: 'Operator', email: opId },
        }))
      })
      .finally(() => {
        inFlightOperatorRef.current.delete(opId)
        setLoadingOperators((prev) => {
          const next = new Set(prev)
          next.delete(opId)
          return next
        })
      })
  }, [session?.operatorId, session?.operator?.firstName, operatorCache])

  const checkMomoStatusMutation = useMomoStatusCheck(invalidateSessionQueries)
  const proforma = useProformaDownload()

  const ebmDialogs = useAdminEBMDialogs(session, {
    userRole: user?.role,
    onSaleEbmCompleted: () => {
      setSession((prev) =>
        prev
          ? { ...prev, hasCompletedSaleEbm: true, hasCompletedNormalEbm: true }
          : prev,
      )
    },
    onAfterEBMAction: invalidateSessionQueries,
  })

  const operator = useMemo(
    () => (session ? getOperatorDisplay(session, operatorCache, loadingOperators) : null),
    [session, operatorCache, loadingOperators],
  )

  if (sessionQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Loading session…
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/admin/sessions')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to sessions
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-700 font-medium">Session not found</p>
            <p className="text-sm text-gray-500 mt-1 font-mono break-all">
              {sessionId}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ebmEligible = isEligibleForEbm({
    sessionStatus: session.sessionStatus,
    paymentMethodEnum: session.paymentMethodEnum,
  })
  const ebmPending = ebmEligible && !session.hasCompletedSaleEbm
  const ratePerKwh = computeRatePerKwh(session, session.chargedKwh)

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${params?.country}/dashboard/admin/sessions`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to sessions
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {isInProgress && (
            <>
              <Button size="sm" variant="outline" onClick={() => setLiveEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit details
              </Button>
              <Button size="sm" onClick={() => setEndOpen(true)}>
                <PlugZap className="h-4 w-4 mr-2" />
                {session.source === 'REMOTE' ? 'Force-end' : 'End session'}
              </Button>
            </>
          )}
          {isEditable && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit &amp; recalculate
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <SessionDetailsHeader
            sessionId={session.sessionId}
            statusLabel={session.sessionStatus}
            statusBadgeClass={getStatusDisplayColor(session.sessionStatus)}
            source={session.source}
            shareUrl={shareUrl}
            onShare={handleCopy}
            titleSize="lg"
            asDialog={false}
          />

          <SessionHeroMetrics
            chargedKwh={session.chargedKwh}
            totalAmount={session.totalAmount}
            ratePerKwh={ratePerKwh}
            isPaid={session.isPaid}
            paymentMethodName={session.paymentMethodName}
          />

          <CustomerCard session={session} />
          <ResourcesCard
            session={session}
            operatorName={operator?.name}
            operatorEmail={operator?.email}
          />
          <TimingCard session={session} />
          <EnergyCard session={session} />
          <PaymentCard session={session} />
          <TransactionsCard transactions={session.transactions} />
          <EbmsCard ebms={session.ebms} />
          <NotesCard
            description={session.description}
            cancellationReason={session.cancellationReason}
            commonSessionTag={session.commonSessionTag}
          />

          <SessionActionButtons
            ebmEligible={ebmEligible}
            ebmPending={ebmPending}
            hasCompletedSaleEbm={session.hasCompletedSaleEbm}
            hasCompletedRefundEbm={session.hasCompletedRefundEbm}
            showCheckMomo={session.paymentMethodEnum === 'MOMO' && !session.isPaid}
            onCheckMomoStatus={() => checkMomoStatusMutation.mutate(session.id)}
            isMomoChecking={checkMomoStatusMutation.isPending}
            onDownloadEBM={ebmDialogs.handlers.openDownload}
            onRefundEBM={ebmDialogs.handlers.openRefund}
            onDownloadProforma={() => proforma.download(session.sessionId)}
            isDownloadingProforma={proforma.isDownloading(session.sessionId)}
            onOpenEBMInfo={ebmDialogs.handlers.openInfo}
            onDistributeEBM={ebmDialogs.handlers.openDistribution}
          />
        </CardContent>
      </Card>

      {isAdmin && <SessionHistory sessionDbId={session.id} />}

      {ebmDialogs.dialogs}

      {isAdmin && (
        <AdminSessionEditDialog
          session={session}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onUpdated={invalidateSessionQueries}
        />
      )}

      {isAdmin && (
        <AdminEndSessionDialog
          session={session}
          open={endOpen}
          onClose={() => setEndOpen(false)}
          onEnded={invalidateSessionQueries}
        />
      )}

      {isAdmin && (
        <AdminSessionLiveEditDialog
          session={session}
          open={liveEditOpen}
          onClose={() => setLiveEditOpen(false)}
          onUpdated={invalidateSessionQueries}
        />
      )}
    </div>
  )
}

export default function AdminSessionPage() {
  return (
    <AdminAccessGuard>
      <AdminSessionPageBody />
    </AdminAccessGuard>
  )
}
