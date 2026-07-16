'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Download, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadEBM, downloadAndSavePDF } from '@/lib/api/chargingSessions'
import { UserRole } from '@/lib/utils/roleRedirect'

interface EBMDownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  userRole?: string
  hasCompletedNormalEbm?: boolean
  hasCompletedSaleEbm?: boolean
  onSuccess?: (isTraining: boolean) => void
}

export const EBMDownloadDialog: React.FC<EBMDownloadDialogProps> = ({
  open,
  onOpenChange,
  sessionId,
  userRole,
  hasCompletedNormalEbm,
  hasCompletedSaleEbm,
  onSuccess,
}) => {
  const [isTraining, setIsTraining] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  React.useEffect(() => {
    if (!open) {
      setIsTraining(false)
    }
  }, [open])

  const handleDownload = async () => {
    if (!sessionId.trim()) {
      toast.error('Session ID is required')
      return
    }

    setIsDownloading(true)

    try {
      const pdfBlob = await downloadEBM(sessionId.trim(), isTraining)
      const timestamp = new Date().toISOString().split('T')[0]
      const prefix = isTraining ? 'Training_EBM_Receipt' : 'EBM_Receipt'
      const filename = `${prefix}_${sessionId.trim().slice(0, 8)}_${timestamp}.pdf`

      await downloadAndSavePDF(pdfBlob, filename)

      toast.success(isTraining ? 'Training EBM downloaded successfully' : 'EBM downloaded successfully')
      onSuccess?.(isTraining)
      onOpenChange(false)
    } catch (error: any) {
      console.error('EBM download failed:', error)
      if (error.message?.includes('too small')) {
        toast.error('EBM is not ready yet. Please try again in a few moments.')
      } else if (error.message?.includes('corrupted')) {
        toast.error('EBM receipt is corrupted. Please contact support.')
      } else if (error.message?.includes('being prepared') || error.message?.includes('check back')) {
        toast.info(error.message)
      } else {
        toast.error(error.message || 'Failed to download EBM receipt')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <Download className="h-5 w-5" />
            EBM Download
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {sessionId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Session ID:</strong> {sessionId}
              </p>
            </div>
          )}

          {hasCompletedSaleEbm === false && (
            <Alert className="bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>EBM Pending:</strong> The operator has not yet finished entering EBM info. The download may fail or return an incomplete receipt.
              </AlertDescription>
            </Alert>
          )}

          {userRole === UserRole.ADMIN && !hasCompletedNormalEbm && (
            <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
              <div className="space-y-0.5">
                <Label htmlFor="ebm-training-mode-toggle" className="text-sm font-medium cursor-pointer">
                  Training Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate a training EBM for testing purposes
                </p>
              </div>
              <Switch
                id="ebm-training-mode-toggle"
                checked={isTraining}
                onCheckedChange={setIsTraining}
                disabled={isDownloading}
              />
            </div>
          )}

          {isTraining && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Training EBM:</strong> This will generate a Training EBM. Training receipts are for testing purposes only and are not official tax documents.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!sessionId.trim() || isDownloading}
            className={isTraining
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {isTraining ? 'Generate Training EBM' : 'Download EBM'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
