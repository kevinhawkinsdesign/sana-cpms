'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, History, Loader2, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageThumb } from '@/components/ui/ImageThumb'
import { getSessionHistory, type SessionAuditChange, type SessionHistoryEntry } from '@/lib/api/admin'

// Fields whose values are media URLs — rendered as a thumbnail rather than raw text.
const IMAGE_FIELDS = new Set(['imageUrl', 'odometerReadingImage', 'paymentProofUrl'])
const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url)

// Renders a media URL as a clickable thumbnail (image) or a small PDF link.
function MediaPreview({ url, alt }: { url: string; alt?: string }) {
  if (isPdf(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline">
        <FileText className="h-3.5 w-3.5" /> PDF
      </a>
    )
  }
  return <ImageThumb src={url} alt={alt} />
}

interface SessionHistoryProps {
  sessionDbId: string
}

const FIELD_LABELS: Record<string, string> = {
  licensePlate: 'License plate',
  chargedKwh: 'Charged kWh',
  ratePerKwh: 'Rate / kWh',
  totalAmount: 'Total amount',
  discountRate: 'Discount rate',
  discountAmount: 'Discount amount',
  startSoc: 'Start SOC',
  endSoc: 'End SOC',
  startTime: 'Start time',
  endTime: 'End time',
  customerName: 'Customer name',
  carModelMake: 'Car model',
  imageUrl: 'Image',
  odometerReading: 'Odometer',
  odometerReadingImage: 'Odometer image',
  chargerScreen: 'Charger screen',
  forceInvoicedCustomer: 'Invoiced customer',
  paymentMethod: 'Payment method',
  paymentProofUrl: 'Payment proof',
  isPaid: 'Paid',
}

const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field

const formatValue = (value: SessionAuditChange['from']) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  // ISO timestamps → readable local time
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return String(value)
}

function ChangeValue({ field, value, muted }: { field: string; value: SessionAuditChange['from']; muted?: boolean }) {
  if (IMAGE_FIELDS.has(field) && typeof value === 'string' && value !== '') {
    return <MediaPreview url={value} alt={fieldLabel(field)} />
  }
  return <span className={muted ? 'text-gray-400' : 'font-medium text-gray-800'}>{formatValue(value)}</span>
}

function ChangeRow({ change }: { change: SessionAuditChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-500">{fieldLabel(change.field)}:</span>
      <ChangeValue field={change.field} value={change.from} muted />
      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
      <ChangeValue field={change.field} value={change.to} />
    </div>
  )
}

function HistoryEntryCard({ entry }: { entry: SessionHistoryEntry }) {
  const actor = entry.performedBy?.name || entry.performedBy?.email || entry.performedBy?.id || 'System'
  const changes = Array.isArray(entry.changes) ? entry.changes : []
  return (
    <div className="rounded-md border border-gray-100 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800">{actor}</span>
        <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
      </div>

      <div className="space-y-1">
        {changes.length > 0 ? changes.map((c, i) => <ChangeRow key={i} change={c} />) : (
          <p className="text-sm text-gray-400">No field changes recorded</p>
        )}
      </div>

      {(entry.ebmRefunded || entry.ebmReissued || entry.paymentMethod || entry.paymentProofUrl) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-2">
          {entry.ebmRefunded && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              <Receipt className="h-3 w-3" /> EBM refunded
            </span>
          )}
          {entry.ebmReissued && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Receipt className="h-3 w-3" /> EBM re-issued
            </span>
          )}
          {entry.paymentMethod && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{entry.paymentMethod}</span>
          )}
          {entry.paymentProofUrl && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              Payment proof: <MediaPreview url={entry.paymentProofUrl} alt="Payment proof" />
            </span>
          )}
        </div>
      )}

      {entry.reason && <p className="mt-2 text-xs italic text-gray-500">“{entry.reason}”</p>}
    </div>
  )
}

export function SessionHistory({ sessionDbId }: SessionHistoryProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sessionHistory', sessionDbId],
    queryFn: () => getSessionHistory(sessionDbId),
    enabled: !!sessionDbId,
    staleTime: 15 * 1000,
  })

  const history = data?.data?.history ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Change history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : isError ? (
          <p className="py-2 text-sm text-red-500">Failed to load history.</p>
        ) : history.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">No edits recorded for this session yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => <HistoryEntryCard key={entry.id} entry={entry} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionHistory
