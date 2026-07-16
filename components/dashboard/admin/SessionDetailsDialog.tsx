'use client'

import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getStatusDisplayColor } from '@/lib/utils/formatters'
import { isEligibleForEbm } from '@/lib/utils/ebmEligibility'
import { getOperatorDisplay } from '@/lib/utils/operatorDisplay'
import type { AdminSession } from '@/lib/api/admin'
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
  useShareUrl,
} from '@/components/dashboard/sessions/SessionDetailsParts'

interface SessionDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AdminSession | null
  operatorCache: Record<string, { firstName: string; lastName: string; email: string }>
  loadingOperators: Set<string>
  onCheckMomoStatus: (sessionId: string) => void
  isMomoChecking: boolean
  onOpenEBMDownload: (sessionId: string) => void
  onOpenEBMRefund: (sessionId: string) => void
  onDownloadProforma: (sessionId: string) => void
  isDownloadingProforma: string | null
  onOpenEBMInfo: (session: AdminSession) => void
  onDistributeEBM: (session: AdminSession) => void
  hasCompletedSaleEbm?: boolean
  hasCompletedRefundEbm?: boolean
  /** Navigates to the standalone session page; header hides button when omitted. */
  onOpenFullPage?: (sessionId: string) => void
}

export const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  open,
  onOpenChange,
  session,
  operatorCache,
  loadingOperators,
  onCheckMomoStatus,
  isMomoChecking,
  onOpenEBMDownload,
  onOpenEBMRefund,
  onDownloadProforma,
  isDownloadingProforma,
  onOpenEBMInfo,
  onDistributeEBM,
  hasCompletedSaleEbm,
  hasCompletedRefundEbm,
  onOpenFullPage,
}) => {
  const { shareUrl, handleCopy } = useShareUrl(session?.sessionId ?? '')

  if (!session) return null

  const operator = getOperatorDisplay(session, operatorCache, loadingOperators)
  const ebmEligible = isEligibleForEbm({
    sessionStatus: session.sessionStatus,
    paymentMethodEnum: session.paymentMethodEnum,
  })
  const ebmPending = ebmEligible && !hasCompletedSaleEbm
  const ratePerKwh = computeRatePerKwh(session, session.chargedKwh)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl p-4 sm:p-6">
        <SessionDetailsHeader
          sessionId={session.sessionId}
          statusLabel={session.sessionStatus}
          statusBadgeClass={getStatusDisplayColor(session.sessionStatus)}
          source={session.source}
          shareUrl={shareUrl}
          onShare={handleCopy}
          onOpenFullPage={
            onOpenFullPage ? () => onOpenFullPage(session.sessionId) : undefined
          }
        />

        <SessionHeroMetrics
          chargedKwh={session.chargedKwh}
          totalAmount={session.totalAmount}
          ratePerKwh={ratePerKwh}
          isPaid={session.isPaid}
          paymentMethodName={session.paymentMethodName}
        />

        <div className="space-y-5">
          <CustomerCard session={session} />
          <ResourcesCard
            session={session}
            operatorName={operator.name}
            operatorEmail={operator.email}
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
            hasCompletedSaleEbm={hasCompletedSaleEbm}
            hasCompletedRefundEbm={hasCompletedRefundEbm}
            showCheckMomo={session.paymentMethodEnum === 'MOMO' && !session.isPaid}
            onCheckMomoStatus={() => onCheckMomoStatus(session.id)}
            isMomoChecking={isMomoChecking}
            onDownloadEBM={() => onOpenEBMDownload(session.sessionId)}
            onRefundEBM={() => onOpenEBMRefund(session.sessionId)}
            onDownloadProforma={() => onDownloadProforma(session.sessionId)}
            isDownloadingProforma={isDownloadingProforma === session.sessionId}
            onOpenEBMInfo={() => onOpenEBMInfo(session)}
            onDistributeEBM={() => onDistributeEBM(session)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
