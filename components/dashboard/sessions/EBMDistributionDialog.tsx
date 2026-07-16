'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSessionDuration } from '@/lib/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Phone, 
  Send, 
  Download, 
  Share2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { distributeEBM, downloadEBM, downloadAndSavePDF, getEBMPDF } from '@/lib/api/chargingSessions'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { isEligibleForEbm } from '@/lib/utils/ebmEligibility'

interface EBMDistributionDialogProps {
  open: boolean
  onClose: () => void
  session: {
    id: string
    sessionId: string
    sessionStatus: string
    paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
    totalAmount?: number | null
    chargedKwh?: number | null
    startTime: string
    endTime?: string | null
    customerName?: string | null
    carModelMake?: string | null
    vehicle?: {
      licensePlates?: Array<{
        licencePlateNumber?: string
      }>
    }
    charger?: {
      name?: string
    }
  }
}

export function EBMDistributionDialog({ open, onClose, session }: EBMDistributionDialogProps) {
  const router = useLocalizedRouter()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isDistributing, setIsDistributing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [distributionResult, setDistributionResult] = useState<{
    emailSent: boolean
    smsSent: boolean
    ebmUrl: string
  } | null>(null)

  // Check if session is eligible for EBM
  const isEligibleForEBM = isEligibleForEbm({ sessionStatus: session.sessionStatus, paymentMethodEnum: session.paymentMethodEnum })

  const handleDistribute = async () => {
    if (!email.trim() && !phone.trim()) {
      toast.error('Please provide either an email address or phone number')
      return
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (phone.trim() && !/^(\+250|0)?[0-9]{9}$/.test(phone.trim())) {
      toast.error('Please enter a valid Rwandan phone number')
      return
    }

    setIsDistributing(true)
    
    try {
      const result = await distributeEBM({
        sessionId: session.sessionId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined
      })

      setDistributionResult({
        emailSent: result.data.emailSent,
        smsSent: result.data.smsSent,
        ebmUrl: result.data.ebmUrl
      })

      toast.success('EBM distributed successfully!')
      
    } catch (error: any) {
      console.error('EBM distribution failed:', error)
      toast.error(error.message || 'Failed to distribute EBM')
    } finally {
      setIsDistributing(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      const pdfBlob = await downloadEBM(session.sessionId)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `EBM_Receipt_${session.sessionId.slice(0, 8)}_${timestamp}.pdf`
      await downloadAndSavePDF(pdfBlob, filename)
      toast.success('EBM downloaded successfully')
    } catch (error: any) {
      console.error('EBM download failed:', error)
      
      // Handle specific error cases based on API documentation
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error('EBM receipt not found for this session')
      } else if (error.message?.includes('400')) {
        toast.error('Invalid session ID')
      } else if (error.message?.includes('500')) {
        toast.error('Failed to generate EBM. Please try again later.')
      } else {
        toast.error(error.message || 'Failed to download EBM')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleViewEBM = () => {
    router.push(`/ebm/${session.sessionId}`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EBM Receipt - ${session.sessionId}`,
          text: `EBM Receipt for charging session ${session.sessionId}`,
          url: `${window.location.origin}/ebm/${session.sessionId}`
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/ebm/${session.sessionId}`
      await navigator.clipboard.writeText(url)
      toast.success('EBM link copied to clipboard')
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A'
    return `${amount.toLocaleString()} RWF`
  }

  const formatDuration = formatSessionDuration

  if (!isEligibleForEBM) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              EBM Not Available
            </DialogTitle>
            <DialogDescription>
              EBM receipts are only available for paid MOMO sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This session is not eligible for EBM receipt generation.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Distribute EBM Receipt
          </DialogTitle>
          <DialogDescription>
            Send EBM receipt via email or SMS, or download/view it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Session ID:</span>
                  <p className="font-medium">{session.sessionId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle:</span>
                  <p className="font-medium">{session.carModelMake || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">{formatCurrency(session.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Energy:</span>
                  <p className="font-medium">{session.chargedKwh ? `${session.chargedKwh.toFixed(1)} kWh` : 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{formatDuration(session.startTime, session.endTime || null)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Charger:</span>
                  <p className="font-medium">{session.charger?.name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Form */}
          {!distributionResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0781234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a valid Rwandan phone number (e.g., 0781234567 or +250781234567)
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>At least one contact method is required</span>
              </div>
            </div>
          )}

          {/* Distribution Result */}
          {distributionResult && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  EBM Distributed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={distributionResult.emailSent ? "default" : "secondary"}>
                    {distributionResult.emailSent ? "Email Sent" : "Email Not Sent"}
                  </Badge>
                  <Badge variant={distributionResult.smsSent ? "default" : "secondary"}>
                    {distributionResult.smsSent ? "SMS Sent" : "SMS Not Sent"}
                  </Badge>
                </div>
                <div className="text-sm text-green-700">
                  <p>EBM receipt has been sent to the provided contact(s).</p>
                  <p className="mt-1">
                    <strong>EBM URL:</strong>{' '}
                    <a 
                      href={distributionResult.ebmUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {distributionResult.ebmUrl}
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!distributionResult ? (
              <>
                <Button
                  onClick={handleDistribute}
                  disabled={isDistributing || (!email.trim() && !phone.trim())}
                  className="flex-1"
                >
                  {isDistributing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Distribute EBM
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={handleViewEBM}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View EBM
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download EBM
                </Button>
                <Button
                  variant="outline"
                  onClick={handleViewEBM}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View EBM
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

