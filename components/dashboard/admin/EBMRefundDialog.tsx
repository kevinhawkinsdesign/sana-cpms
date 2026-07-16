'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Undo2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSessionEBMInfo } from '@/lib/api/admin'
import { downloadEBMRefund, downloadAndSavePDF } from '@/lib/api/chargingSessions'
import { UserRole } from '@/lib/utils/roleRedirect'

interface EBMRefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSessionId?: string
  userRole?: string
}

const REFUND_REASONS = [
  { value: 'MISSING_QUANTITY', label: 'Missing Quantity' },
  { value: 'MISSING_ITEM', label: 'Missing Item' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'WASTED', label: 'Wasted' },
  { value: 'RAW_MATERIAL_SHORTAGE', label: 'Raw Material Shortage' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'WRONG_CUSTOMER_TIN', label: 'Wrong Customer TIN' },
  { value: 'WRONG_CUSTOMER_NAME', label: 'Wrong Customer Name' },
  { value: 'WRONG_AMOUNT_PRICE', label: 'Wrong Amount/Price' },
  { value: 'WRONG_QUANTITY', label: 'Wrong Quantity' },
  { value: 'WRONG_ITEMS', label: 'Wrong Items' },
  { value: 'WRONG_TAX_TYPE', label: 'Wrong Tax Type' },
  { value: 'OTHER_REASON', label: 'Other Reason (Default)' },
] as const

export const EBMRefundDialog: React.FC<EBMRefundDialogProps> = ({
  open,
  onOpenChange,
  initialSessionId = '',
  userRole,
}) => {
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [reasonCode, setReasonCode] = useState('OTHER_REASON')
  const [isTraining, setIsTraining] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [purchaseCode, setPurchaseCode] = useState('')
  const [hasTin, setHasTin] = useState(false)
  const [saleTin, setSaleTin] = useState<string | null>(null)
  const [isCheckingInfo, setIsCheckingInfo] = useState(false)

  const resetDialog = () => {
    setSessionId('')
    setReasonCode('OTHER_REASON')
    setIsTraining(false)
    setPurchaseCode('')
    setHasTin(false)
    setSaleTin(null)
  }

  // Sync initialSessionId when dialog opens with a new value
  React.useEffect(() => {
    if (open && initialSessionId) {
      setSessionId(initialSessionId)
      checkTin(initialSessionId)
    }
    if (!open) {
      resetDialog()
    }
  }, [open, initialSessionId])

  const checkTinRequestRef = React.useRef(0)

  const checkTin = async (sid: string) => {
    if (!sid.trim()) {
      setHasTin(false)
      setSaleTin(null)
      return
    }

    const requestId = ++checkTinRequestRef.current
    setIsCheckingInfo(true)
    try {
      const response = await getSessionEBMInfo(sid.trim())
      // Ignore stale response if session ID changed while request was in-flight
      if (requestId !== checkTinRequestRef.current) return
      const tin = response.data?.ebmInfo?.ebmTin
      if (tin && tin.length === 9 && /^\d{9}$/.test(tin)) {
        setHasTin(true)
        setSaleTin(tin)
      } else {
        setHasTin(false)
        setSaleTin(null)
      }
    } catch {
      if (requestId !== checkTinRequestRef.current) return
      setHasTin(false)
      setSaleTin(null)
    } finally {
      if (requestId === checkTinRequestRef.current) {
        setIsCheckingInfo(false)
      }
    }
  }

  const handleDownload = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    if (hasTin && !purchaseCode.trim()) {
      toast.error('Purchase code is required because the original sale included a customer TIN')
      return
    }

    if (purchaseCode.trim() && !/^\d{6}$/.test(purchaseCode.trim())) {
      toast.error('Purchase code must be exactly 6 digits')
      return
    }

    setIsDownloading(true)

    try {
      const pdfBlob = await downloadEBMRefund(
        sessionId.trim(),
        reasonCode,
        isTraining,
        undefined,
        purchaseCode.trim() || undefined
      )
      const timestamp = new Date().toISOString().split('T')[0]
      const prefix = isTraining ? 'Training_EBM_Refund' : 'EBM_Refund'
      const filename = `${prefix}_${sessionId.trim().slice(0, 8)}_${timestamp}.pdf`

      await downloadAndSavePDF(pdfBlob, filename)

      toast.success(isTraining ? 'Training EBM refund downloaded successfully' : 'EBM refund downloaded successfully')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to download EBM refund', error)
      if (error.message?.includes('400') || error.message?.includes('Invalid session ID')) {
        toast.error('Invalid session ID or missing required fields')
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('Unauthorized - Please log in again')
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        toast.error('Forbidden - Admin access required')
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error('Session or document not found')
      } else if (error.message?.includes('500') || error.message?.includes('Failed to generate')) {
        toast.error('Failed to generate document. Please try again later.')
      } else {
        toast.error(error.message || 'Failed to download EBM refund')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Undo2 className="h-5 w-5" />
            EBM Refund Download
          </DialogTitle>
          <DialogDescription>
            Generate and download an EBM refund receipt for a charging session. The session must have a completed EBM.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Session ID Input */}
          <div className="space-y-2">
            <Label htmlFor="refund-session-id" className="text-sm font-medium">
              Session ID <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="refund-session-id"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value)
                  setHasTin(false)
                  setSaleTin(null)
                  setPurchaseCode('')
                }}
                placeholder="Enter session ID"
                disabled={isDownloading || isCheckingInfo}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => checkTin(sessionId)}
                disabled={!sessionId.trim() || isDownloading || isCheckingInfo}
              >
                {isCheckingInfo ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click &quot;Check&quot; to verify if a purchase code is required for this refund
            </p>
          </div>

          {/* Refund Reason Code Select */}
          <div className="space-y-2">
            <Label htmlFor="refund-reason-code" className="text-sm font-medium">
              Refund Reason Code
            </Label>
            <Select value={reasonCode} onValueChange={setReasonCode} disabled={isDownloading}>
              <SelectTrigger id="refund-reason-code">
                <SelectValue placeholder="Select refund reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Code */}
          <div className={`rounded-lg border p-4 space-y-3 ${hasTin ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
            {hasTin && (
              <>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800">Purchase Code Required</p>
                </div>
                <p className="text-xs text-orange-700">
                  The original sale included a customer TIN ({saleTin}). RRA requires a purchase code for this refund.
                  Ask the customer for their 6-digit purchase code.
                </p>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="refund-purchase-code" className="text-xs font-medium">
                Purchase Code (6 digits) {hasTin && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="refund-purchase-code"
                value={purchaseCode}
                onChange={(e) => setPurchaseCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                disabled={isDownloading}
                maxLength={6}
                className="bg-white"
              />
              {!hasTin && (
                <p className="text-xs text-muted-foreground">Optional — provide if the customer has a purchase code</p>
              )}
            </div>
            {hasTin && !purchaseCode && (
              <p className="text-xs text-red-600">Purchase code is required to process this refund</p>
            )}
          </div>

          {/* Training Mode Toggle */}
          {userRole === UserRole.ADMIN && (
            <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
              <div className="space-y-0.5">
                <Label htmlFor="refund-training-mode-toggle" className="text-sm font-medium cursor-pointer">
                  Training Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate a training refund EBM for testing purposes
                </p>
              </div>
              <Switch
                id="refund-training-mode-toggle"
                checked={isTraining}
                onCheckedChange={setIsTraining}
                disabled={isDownloading}
              />
            </div>
          )}

          {/* Training Mode Warning */}
          {isTraining && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Training Refund:</strong> This will generate a Training Refund EBM. Training receipts are for testing purposes only and are not official tax documents.
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
            disabled={!sessionId.trim() || isDownloading || isCheckingInfo || (hasTin && !purchaseCode.trim())}
            className={isTraining
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
            }
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4 mr-2" />
                {isTraining ? 'Generate Training Refund EBM' : 'Download Refund EBM'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
