'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Download, 
  Share2, 
  ArrowLeft, 
  FileText, 
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { getEBMPDF, downloadEBM, downloadAndSavePDF } from '@/lib/api/chargingSessions'

export default function EBMPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      if (!sessionId) return

      setIsLoading(true)
      setLoadError(null)

      // Revoke old URL if exists (prevents leak on sessionId change)
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }

      try {
        const blob = await getEBMPDF(sessionId)
        setPdfBlob(blob)
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch (error: any) {
        console.error('Failed to load EBM PDF:', error)
        setLoadError(error.message || 'Failed to load EBM PDF')

        // Only show toast for non-queued errors
        // Queued errors will be shown in the UI, not as toasts
        if (!error.message?.includes('being prepared') && !error.message?.includes('check back')) {
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            toast.error('EBM receipt not found for this session')
          } else if (error.message?.includes('400')) {
            toast.error('Invalid session ID')
          } else if (error.message?.includes('500')) {
            toast.error('Failed to generate EBM. Please try again later.')
          } else {
            toast.error(error.message || 'Failed to load EBM PDF')
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPDF()

    // Cleanup URL on unmount or sessionId change
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [sessionId])

  const handleDownload = async () => {
    if (!sessionId) return

    setIsDownloading(true)
    try {
      // Reuse already loaded blob to avoid duplicate request
      let blob = pdfBlob

      // If not loaded yet or failed to load, try fetching
      if (!blob) {
        blob = await downloadEBM(sessionId)
        setPdfBlob(blob)

        // Revoke old URL before creating new one to prevent memory leak
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl)
        }

        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        setLoadError(null)
      }

      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `EBM_Receipt_${sessionId.slice(0, 8)}_${timestamp}.pdf`
      await downloadAndSavePDF(blob, filename)
      toast.success('EBM downloaded successfully')
    } catch (error: any) {
      console.error('Download failed:', error)

      // Handle specific error cases based on API documentation
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error('EBM receipt not found for this session')
      } else if (error.message?.includes('400')) {
        toast.error('Invalid session ID')
      } else if (error.message?.includes('500')) {
        toast.error('Failed to generate EBM. Please try again later.')
      } else if (error.message?.includes('being prepared') || error.message?.includes('check back')) {
        toast.info(error.message)
      } else {
        toast.error(error.message || 'Failed to download EBM')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EBM Receipt - ${sessionId}`,
          text: `EBM Receipt for charging session ${sessionId}`,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      toast.success('EBM link copied to clipboard')
    }
  }



  // EBM is available for all sessions (we'll let the API handle eligibility)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">EBM Receipt</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">
                  Session: {sessionId}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isDownloading ? 'Downloading...' : 'Download'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-8">
        {/* PDF Viewer */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              EBM Receipt
            </CardTitle>
            <CardDescription>
              Electronic Billing Machine receipt for charging session {sessionId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8">
                <div className="space-y-4">
                  {/* Skeleton for PDF */}
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-4 w-2/3 mx-auto" />
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <Skeleton className="h-[600px] w-full" />
                  </div>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="border-t">
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
                  <span>📄 PDF Document</span>
                  <span className="text-xs">Session: {sessionId}</span>
                </div>
                <div className="relative">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[70vh] sm:h-[80vh] lg:h-[85vh] min-h-[500px]"
                    title="EBM Receipt PDF"
                    style={{ 
                      border: 'none',
                      background: '#f9fafb'
                    }}
                  />
                </div>
              </div>
            ) : loadError ? (
              <div className="p-8">
                <div className="flex items-center justify-center h-96">
                  <div className="text-center max-w-md">
                    {loadError.includes('being prepared') || loadError.includes('check back') ? (
                      <>
                        <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Receipt Being Prepared</h3>
                        <p className="text-gray-600 mb-4">{loadError}</p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Refresh
                          </Button>
                          <Button
                            onClick={() => router.back()}
                            variant="ghost"
                            className="flex items-center gap-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load PDF</h3>
                        <p className="text-gray-600 mb-4">{loadError}</p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Try Again
                          </Button>
                          <Button
                            onClick={() => router.back()}
                            className="flex items-center gap-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

