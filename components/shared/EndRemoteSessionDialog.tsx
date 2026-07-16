'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { endRemoteSession } from '@/lib/api/chargingSessions'

interface EndRemoteSessionTarget {
  id: string
  carModelMake?: string | null
  customerName?: string | null
  vehicle?: { make?: string; model?: string } | null
}

interface EndRemoteSessionDialogProps {
  readonly session: EndRemoteSessionTarget | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSuccess?: (sessionId: string) => void
}

export function EndRemoteSessionDialog({ session, open, onOpenChange, onSuccess }: EndRemoteSessionDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (sessionId: string) => endRemoteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      toast.success('Session is being ended...')
      onOpenChange(false)
      void queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      onSuccess?.(sessionId)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to end remote session')
    },
  })

  const vehicleLabel =
    session?.carModelMake
    || (session?.vehicle?.make || session?.vehicle?.model
      ? `${session?.vehicle?.make ?? ''} ${session?.vehicle?.model ?? ''}`.trim()
      : null)
    || session?.customerName
    || 'this session'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="End Remote Session"
      description={`This will tell Citrine to stop the transaction for ${vehicleLabel}. The session will close automatically once the end-event is processed.`}
      confirmText="End Session"
      cancelText="Cancel"
      variant="warning"
      loading={isPending}
      onConfirm={() => {
        if (session) mutate(session.id)
      }}
    />
  )
}
