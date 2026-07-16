'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { PauseCircle, PlayCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AdminSession } from '@/lib/api/admin'

type ActionType = 'pause' | 'resume' | 'cancel' | 'uncancel'

interface SessionActionDialogProps {
  actionType: ActionType | null
  session: AdminSession | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (actionType: ActionType, sessionId: string, reason?: string) => void
}

const ACTION_CONFIG: Record<ActionType, {
  title: string
  description: string
  label: string
  requiresReason: boolean
  reasonLabel: string
  reasonPlaceholder: string
  reasonHint: string
  variant: 'default' | 'destructive'
  icon: React.ReactNode
}> = {
  pause: {
    title: 'Pause Charging Session',
    description: 'Temporarily pause this charging session. The vehicle and gun will be released for other use until the session is resumed.',
    label: 'Pause Session',
    requiresReason: false,
    reasonLabel: 'Pause reason (optional)',
    reasonPlaceholder: 'Optional note shared with the team',
    reasonHint: 'Provide an optional reason between 3 and 500 characters, or leave blank.',
    variant: 'default',
    icon: <PauseCircle className="h-4 w-4 mr-2" />,
  },
  resume: {
    title: 'Resume Charging Session',
    description: 'Resume this charging session and set the associated vehicle and gun back to in-use.',
    label: 'Resume Session',
    requiresReason: false,
    reasonLabel: '',
    reasonPlaceholder: '',
    reasonHint: '',
    variant: 'default',
    icon: <PlayCircle className="h-4 w-4 mr-2" />,
  },
  cancel: {
    title: 'Cancel Charging Session',
    description: 'Cancel this charging session and record a reason. The associated vehicle and gun will be released and any pending transactions will be cancelled.',
    label: 'Cancel Session',
    requiresReason: true,
    reasonLabel: 'Cancellation reason',
    reasonPlaceholder: 'e.g. Customer never arrived to start the session',
    reasonHint: 'Provide a reason between 3 and 500 characters.',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4 mr-2" />,
  },
  uncancel: {
    title: 'Un-cancel Charging Session',
    description: 'Reinstate this charging session and clear its cancellation reason. The vehicle and gun will return to in-use status.',
    label: 'Un-cancel Session',
    requiresReason: false,
    reasonLabel: '',
    reasonPlaceholder: '',
    reasonHint: '',
    variant: 'default',
    icon: null,
  },
}

export const SessionActionDialog: React.FC<SessionActionDialogProps> = ({
  actionType,
  session,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('')

  const isOpen = actionType !== null && session !== null
  const config = actionType ? ACTION_CONFIG[actionType] : null
  const showReasonField = actionType === 'pause' || actionType === 'cancel'

  const handleClose = () => {
    setReason('')
    onClose()
  }

  const handleConfirm = () => {
    if (!actionType || !session) return

    const trimmedReason = reason.trim()

    if (actionType === 'cancel') {
      if (trimmedReason.length < 3) {
        toast.error('Cancellation reason must be at least 3 characters.')
        return
      }
      if (trimmedReason.length > 500) {
        toast.error('Cancellation reason cannot exceed 500 characters.')
        return
      }
    }

    if (actionType === 'pause' && trimmedReason && trimmedReason.length < 3) {
      toast.error('Please provide a reason with at least 3 characters or leave it blank.')
      return
    }

    onConfirm(actionType, session.id, trimmedReason || undefined)
    setReason('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.title}</DialogTitle>
          <DialogDescription>{config?.description}</DialogDescription>
        </DialogHeader>
        {session && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-1">
              <p><strong>Session ID:</strong> {session.sessionId}</p>
              <p><strong>Status:</strong> {session.sessionStatus}</p>
              <p>
                <strong>Vehicle:</strong>{' '}
                {session.vehicle?.make} {session.vehicle?.model} ({session.vehicle?.kabisaId})
              </p>
              <p>
                <strong>Operator:</strong>{' '}
                {session.operator?.firstName} {session.operator?.lastName}
              </p>
              <p><strong>Charger:</strong> {session.charger?.name}</p>
            </div>

            {showReasonField && config && (
              <div className="space-y-2">
                <Label htmlFor="session-action-reason" className="text-sm font-medium text-gray-700">
                  {config.reasonLabel}
                  {config.requiresReason && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Textarea
                  id="session-action-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={config.reasonPlaceholder}
                  maxLength={500}
                  rows={3}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">{config.reasonHint}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Close
              </Button>
              <Button
                variant={config?.variant || 'default'}
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {config?.icon}
                    {config?.label}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
