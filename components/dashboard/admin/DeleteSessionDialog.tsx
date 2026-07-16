'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
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

interface DeleteSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AdminSession | null
  isDeleting: boolean
  onConfirm: (reason: string) => void
}

const MIN_REASON = 3
const MAX_REASON = 500

export const DeleteSessionDialog: React.FC<DeleteSessionDialogProps> = ({
  open,
  onOpenChange,
  session,
  isDeleting,
  onConfirm,
}) => {
  const [reason, setReason] = React.useState('')

  // Reset the reason whenever the dialog opens for a different/again session.
  React.useEffect(() => {
    if (open) setReason('')
  }, [open, session?.id])

  const trimmed = reason.trim()
  const reasonValid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Session</DialogTitle>
          <DialogDescription>
            This moves the session to the Archive (it stops appearing in Sessions and its
            Airtable record is deleted). You can restore it from the Archive at any time.
          </DialogDescription>
        </DialogHeader>
        {session && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Session Details</h4>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Session ID:</strong> {session.sessionId}</p>
                <p><strong>Vehicle:</strong> {session.vehicle?.make} {session.vehicle?.model}</p>
                <p><strong>Operator:</strong> {session.operator?.firstName} {session.operator?.lastName}</p>
                <p><strong>Charger:</strong> {session.charger?.name}</p>
                <p><strong>Status:</strong> {session.sessionStatus}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delete-reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this session being deleted? (e.g. duplicate, test data)"
                maxLength={MAX_REASON}
                rows={3}
                autoFocus
              />
              <p className="text-xs text-gray-500">{trimmed.length}/{MAX_REASON} — recorded in the Archive against your name.</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm(trimmed)}
                disabled={isDeleting || !reasonValid}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Session
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
