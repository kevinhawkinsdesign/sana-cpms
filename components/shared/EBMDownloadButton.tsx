'use client'

import React, { useState } from 'react'
import { Download, Loader2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { downloadEBM, downloadAndSavePDF } from '@/lib/api/chargingSessions'
import { isEligibleForEbm } from '@/lib/utils/ebmEligibility'

interface EBMDownloadButtonProps {
  sessionId: string
  sessionStatus: string
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
  hasCompletedSaleEbm?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showText?: boolean
  showTrainingOption?: boolean
}

export function EBMDownloadButton({
  sessionId,
  sessionStatus,
  paymentMethodEnum,
  hasCompletedSaleEbm,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true,
  showTrainingOption = false
}: EBMDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)

  // Check if session is eligible for EBM download using centralized logic
  const isEligibleForEBM = isEligibleForEbm({ sessionStatus, paymentMethodEnum })
  const ebmPending = isEligibleForEBM && !hasCompletedSaleEbm

  const handleDownload = async () => {
    if (!isEligibleForEBM) {
      toast.error('EBM is only available for paid sessions')
      return
    }

    setIsDownloading(true)

    try {
      // Download EBM with training mode option
      const pdfBlob = await downloadEBM(sessionId, isTraining)

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `EBM_Receipt_${sessionId.slice(0, 8)}_${timestamp}${isTraining ? '-training' : ''}.pdf`

      // Save file
      await downloadAndSavePDF(pdfBlob, filename)

      toast.success(`EBM ${isTraining ? '(Training)' : ''} downloaded successfully`)

    } catch (error: any) {
      console.error('EBM download failed:', error)

      // Show user-friendly error messages
      if (error.message.includes('too small')) {
        toast.error('EBM is not ready yet. Please try again in a few moments.')
      } else if (error.message.includes('corrupted')) {
        toast.error('EBM receipt is corrupted. Please contact support.')
      } else if (error.message.includes('being prepared') || error.message.includes('check back')) {
        // Show info toast for queued receipts, not error
        toast.info(error.message)
      } else {
        // Show the actual API error message
        toast.error(error.message || 'Failed to download EBM receipt')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  // Don't render the button at all if not eligible
  if (!isEligibleForEBM) {
    return null
  }

  // Show pending state when EBM hasn't been generated yet
  if (ebmPending) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={`flex items-center gap-2 ${className}`}
        title="EBM Pending — operator has not finished entering EBM info"
      >
        <Clock className="h-4 w-4 text-amber-500" />
        {showText && (
          <span className="hidden sm:inline">EBM Pending</span>
        )}
      </Button>
    )
  }

  const isDisabled = disabled || isDownloading

  // If training option is shown, wrap in a container
  if (showTrainingOption) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`training-${sessionId}`}
            checked={isTraining}
            onCheckedChange={(checked) => setIsTraining(checked === true)}
            disabled={isDisabled}
          />
          <Label
            htmlFor={`training-${sessionId}`}
            className="text-sm font-normal cursor-pointer"
          >
            Training Mode
          </Label>
        </div>
        <Button
          variant={variant}
          size={size}
          onClick={handleDownload}
          disabled={isDisabled}
          className="flex items-center gap-2"
          title="Download EBM receipt"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {showText && (
            <span className="hidden sm:inline">
              {isDownloading ? 'Downloading...' : 'Download EBM'}
            </span>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isDisabled}
      className={`flex items-center gap-2 ${className}`}
      title="Download EBM receipt"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {showText && (
        <span className="hidden sm:inline">
          {isDownloading ? 'Downloading...' : 'Download EBM'}
        </span>
      )}
    </Button>
  )
}

// Compact version for table rows
export function EBMDownloadIcon({
  sessionId,
  sessionStatus,
  paymentMethodEnum,
  hasCompletedSaleEbm,
  disabled = false,
  className = ''
}: Omit<EBMDownloadButtonProps, 'showText' | 'variant' | 'size'>) {
  return (
    <EBMDownloadButton
      sessionId={sessionId}
      sessionStatus={sessionStatus}
      paymentMethodEnum={paymentMethodEnum}
      hasCompletedSaleEbm={hasCompletedSaleEbm}
      disabled={disabled}
      variant="ghost"
      size="icon"
      showText={false}
      className={`h-8 w-8 ${className}`}
    />
  )
}
