'use client'

import type { Session } from '@/lib/api/chargingSessions'
import type { CustomerInfoFormValues } from '@/components/shared/CustomerInfoDialog'
import { SessionTransferDialog } from '@/components/dashboard/sessions/SessionTransferDialog'
import { EndRemoteSessionDialog } from '@/components/shared/EndRemoteSessionDialog'
import CustomerInfoDialog from '@/components/shared/CustomerInfoDialog'

interface SessionCardDialogsProps {
  readonly transferSession: Session | null
  readonly showTransferDialog: boolean
  readonly onCloseTransfer: () => void
  readonly endRemoteSession: Session | null
  readonly onCloseEndRemote: () => void
  readonly onEndRemoteSuccess?: (sessionId: string) => void
  readonly customerInfoSession: Session | null
  readonly customerFormValues: CustomerInfoFormValues
  readonly onCloseCustomerInfo: () => void
  readonly onCustomerInfoSaved: () => void
}

export function SessionCardDialogs({
  transferSession,
  showTransferDialog,
  onCloseTransfer,
  endRemoteSession,
  onCloseEndRemote,
  onEndRemoteSuccess,
  customerInfoSession,
  customerFormValues,
  onCloseCustomerInfo,
  onCustomerInfoSaved,
}: SessionCardDialogsProps) {
  return (
    <>
      <SessionTransferDialog
        session={transferSession}
        isOpen={showTransferDialog}
        onClose={onCloseTransfer}
      />

      <EndRemoteSessionDialog
        session={endRemoteSession}
        open={!!endRemoteSession}
        onOpenChange={(open) => { if (!open) onCloseEndRemote() }}
        onSuccess={onEndRemoteSuccess}
      />

      <CustomerInfoDialog
        sessionId={customerInfoSession?.id ?? null}
        initialValues={customerFormValues}
        open={!!customerInfoSession}
        onOpenChange={(open) => { if (!open) onCloseCustomerInfo() }}
        session={customerInfoSession}
        onSaved={onCustomerInfoSaved}
      />
    </>
  )
}
