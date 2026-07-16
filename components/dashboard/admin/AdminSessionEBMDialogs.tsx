'use client'

import React, { useState } from 'react'
import { EBMDistributionDialog } from '@/components/dashboard/sessions/EBMDistributionDialog'
import { EBMInfoDialog } from '@/components/dashboard/admin/EBMInfoDialog'
import { EBMRefundDialog } from '@/components/dashboard/admin/EBMRefundDialog'
import { EBMDownloadDialog } from '@/components/dashboard/admin/EBMDownloadDialog'
import type { AdminSession } from '@/lib/api/admin'

/**
 * Subset of `AdminSession` the dialog stack actually reads. Keeping the prop
 * surface narrow lets the modal (where `selectedSession` may be partial) and
 * the standalone page share the same component without leaking shape coupling.
 */
type EBMDialogSession = Pick<
  AdminSession,
  | 'id'
  | 'sessionId'
  | 'sessionStatus'
  | 'paymentMethodEnum'
  | 'totalAmount'
  | 'chargedKwh'
  | 'startTime'
  | 'endTime'
  | 'hasCompletedSaleEbm'
  | 'hasCompletedRefundEbm'
  | 'hasCompletedNormalEbm'
  | 'vehicle'
  | 'charger'
  | 'operator'
>

export interface AdminEBMDialogsHandlers {
  openRefund: () => void
  openDownload: () => void
  openInfo: () => void
  openDistribution: () => void
}

interface UseAdminEBMDialogsOptions {
  userRole?: string
  /**
   * Optimistic patch hook called when EBMDownloadDialog succeeds with a
   * non-training sale. Caller decides which state slice to update.
   */
  onSaleEbmCompleted?: () => void
  /**
   * Fires after any EBM mutation that mutates server-side data. Typically
   * wired to a query invalidation helper.
   */
  onAfterEBMAction?: () => void
}

/**
 * Owns the four EBM dialog open-states + readonly flag and returns both the
 * `openX()` handlers and the ready-to-render `<dialogs>` JSX. Both the list
 * page (via `SessionDetailsDialog`) and the standalone session page use this
 * to avoid duplicating the same five-block render tree.
 */
export function useAdminEBMDialogs(
  session: EBMDialogSession | null,
  options: UseAdminEBMDialogsOptions = {},
) {
  const [refundOpen, setRefundOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [distributionOpen, setDistributionOpen] = useState(false)

  const handlers: AdminEBMDialogsHandlers = {
    openRefund: () => setRefundOpen(true),
    openDownload: () => setDownloadOpen(true),
    // Read readonly from current `session` at render time (below) so the list
    // page's `setSelectedSession(s); openInfo()` sequence picks up the just-set
    // session on the next render instead of the stale closure value.
    openInfo: () => setInfoOpen(true),
    openDistribution: () => setDistributionOpen(true),
  }

  const dialogs = (
    <>
      <EBMRefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        initialSessionId={session?.sessionId ?? ''}
        userRole={options.userRole}
      />

      <EBMDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        sessionId={session?.sessionId ?? ''}
        userRole={options.userRole}
        hasCompletedNormalEbm={session?.hasCompletedNormalEbm}
        hasCompletedSaleEbm={session?.hasCompletedSaleEbm}
        onSuccess={(isTraining) => {
          if (!isTraining) options.onSaleEbmCompleted?.()
          options.onAfterEBMAction?.()
        }}
      />

      <EBMInfoDialog
        sessionId={infoOpen ? session?.sessionId ?? '' : ''}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        readonly={infoOpen ? session?.hasCompletedSaleEbm : undefined}
      />

      {distributionOpen && session && (
        <EBMDistributionDialog
          open={distributionOpen}
          onClose={() => setDistributionOpen(false)}
          session={{
            id: session.sessionId,
            sessionId: session.sessionId,
            sessionStatus: session.sessionStatus,
            paymentMethodEnum: session.paymentMethodEnum,
            totalAmount: session.totalAmount,
            chargedKwh: session.chargedKwh,
            startTime: session.startTime,
            endTime: session.endTime,
            customerName:
              session.operator?.firstName && session.operator?.lastName
                ? `${session.operator.firstName} ${session.operator.lastName}`
                : null,
            carModelMake:
              session.vehicle?.make && session.vehicle?.model
                ? `${session.vehicle.make} ${session.vehicle.model}`
                : null,
            vehicle: session.vehicle ? { licensePlates: [] } : undefined,
            charger: { name: session.charger?.name },
          }}
        />
      )}
    </>
  )

  return { handlers, dialogs }
}
