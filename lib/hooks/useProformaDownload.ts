'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { downloadAndSavePDF, downloadProformaInvoice } from '@/lib/api/chargingSessions'

/**
 * Triggers a proforma-invoice PDF download for a session and surfaces toast
 * feedback. `downloadingSessionId` tracks which session is in flight so the
 * caller can disable the matching button without keeping its own state.
 *
 * Returns a stable `isDownloading(sessionId)` helper because most call sites
 * just want a boolean for the current row.
 */
export function useProformaDownload() {
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null)

  const download = async (sessionId: string) => {
    setDownloadingSessionId(sessionId)
    try {
      const pdfBlob = await downloadProformaInvoice(sessionId)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `Proforma_Invoice_${sessionId.slice(0, 8)}_${timestamp}.pdf`
      await downloadAndSavePDF(pdfBlob, filename)
      toast.success('Proforma invoice downloaded successfully')
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to download Proforma invoice'
      console.error('Failed to download Proforma invoice', error)
      toast.error(message)
    } finally {
      setDownloadingSessionId(null)
    }
  }

  return {
    download,
    downloadingSessionId,
    isDownloading: (sessionId: string) => downloadingSessionId === sessionId,
  }
}
