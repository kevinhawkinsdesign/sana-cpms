'use client'

import React from 'react'
import { Battery, CircleCheck, Clock, Download, ExternalLink, FileText, Gauge, Link as LinkIcon, RefreshCw, Share2, Undo2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/* ----------------------------- Shared types ----------------------------- */

/**
 * Structural type covering both `AdminSessionTransaction` (from `/lib/api/admin`)
 * and `SessionTransaction` (from `/lib/api/chargingSessions`). The parts in this
 * file don't care which API surface the data came from — only the fields they
 * render — so we accept the union shape here.
 */
export interface SessionTransactionLike {
  id: string
  transactionId?: string | null
  transactionStatus: string
  amount?: number | null
  currency?: string
  transactionDate?: string
  externalTransactionReference?: string | null
  momoExternalId?: string | null
  paymentMethod?: {
    paymentMethodType?: string | null
    momoNumber?: string | null
  } | null
}

export interface SessionEbmLike {
  id: string
  cisInvoiceNumber?: number | null
  receiptNumber?: number | null
  salesTypeCode?: string | null
  receiptTypeCode?: string | null
  paymentMethodCode?: string | null
  paymentMethodName?: string | null
  phoneForEbm?: string | null
  vsdcReceiptPublicationDate?: string | null
}

/* ------------------------------- Helpers -------------------------------- */

export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : '—'

export const formatAmount = (amount?: number | null, currency: string = 'RWF') =>
  amount != null ? `${amount.toLocaleString()} ${currency}` : '—'

/* -------------------------- Atomic components --------------------------- */

/** Compact labelled cell used across the popup's cards. Hides when `show` is false. */
export const Field: React.FC<{
  label: string
  value?: React.ReactNode
  hint?: string | null
  copyable?: string
  show?: boolean
}> = ({ label, value, hint, copyable, show = true }) => {
  if (!show) return null
  const display = value === null || value === undefined || value === '' ? '—' : value
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="text-sm text-gray-600 dark:text-gray-400 break-words">{display}</div>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {copyable && (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copyable)
              toast.success(`${label} copied`)
            } catch {
              toast.error('Failed to copy')
            }
          }}
          className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
        >
          Copy
        </button>
      )}
    </div>
  )
}

/** Card-shaped section wrapping a labelled block of fields. */
export const Section: React.FC<{
  title: string
  children: React.ReactNode
  right?: React.ReactNode
}> = ({ title, children, right }) => (
  <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{title}</h4>
      {right}
    </div>
    {children}
  </section>
)

/** Colour-coded badge for a transaction status. */
export const TxStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    SUCCESS: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    FAILED: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
    CANCELLED: 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
  }
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${map[status] || 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
    >
      {status}
    </Badge>
  )
}

/* ------------------------ Larger composed pieces ------------------------ */

/** The 4-tile "what was this session at a glance" strip. */
export const SessionHeroMetrics: React.FC<{
  chargedKwh?: number | null
  totalAmount?: number | null
  /** RWF/kWh. Caller picks supply vs total to match discount semantics. */
  ratePerKwh?: number | null
  isPaid?: boolean
  paymentMethodName?: string | null
}> = ({ chargedKwh, totalAmount, ratePerKwh, isPaid, paymentMethodName }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-slate-50 dark:from-white/5 to-blue-50/40 dark:to-blue-500/10 p-4">
    <div className="flex items-start gap-2.5">
      <div className="rounded-lg bg-blue-100 dark:bg-blue-500/15 p-2">
        <Battery className="h-4 w-4 text-blue-700 dark:text-blue-300" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Energy
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {chargedKwh != null ? chargedKwh.toFixed(2) : '—'}
          <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">kWh</span>
        </div>
      </div>
    </div>
    <div className="flex items-start gap-2.5">
      <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/15 p-2">
        <Wallet className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Total
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {totalAmount != null ? totalAmount.toLocaleString() : '—'}
          <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">RWF</span>
        </div>
      </div>
    </div>
    <div className="flex items-start gap-2.5">
      <div className="rounded-lg bg-amber-100 dark:bg-amber-500/15 p-2">
        <Gauge className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Rate
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {ratePerKwh != null ? ratePerKwh.toFixed(0) : '—'}
          <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">RWF/kWh</span>
        </div>
      </div>
    </div>
    <div className="flex items-start gap-2.5">
      <div className={`rounded-lg p-2 ${isPaid ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-gray-200 dark:bg-white/10'}`}>
        <CircleCheck className={`h-4 w-4 ${isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Status
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {isPaid ? 'Paid' : 'Unpaid'}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{paymentMethodName || '—'}</div>
      </div>
    </div>
  </div>
)

/** Inline share-URL row used directly under the dialog title. */
export const ShareUrlRow: React.FC<{
  shareUrl: string
  onCopy: () => void
}> = ({ shareUrl, onCopy }) => {
  if (!shareUrl) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 w-full min-w-0 overflow-hidden">
      <LinkIcon className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
      <a
        href={shareUrl}
        className="block font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline truncate min-w-0 flex-1"
        title={shareUrl}
      >
        {shareUrl}
      </a>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 text-[10px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        Copy
      </button>
    </div>
  )
}

/** Full transactions card — table inside a `Section`. Renders nothing when empty. */
export const TransactionsCard: React.FC<{ transactions?: SessionTransactionLike[] }> = ({
  transactions,
}) => {
  if (!transactions || transactions.length === 0) return null
  return (
    <Section title={`Transactions (${transactions.length})`}>
      <div className="rounded-md overflow-x-auto border border-gray-100 dark:border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Status</th>
              <th className="text-left px-2 py-1.5 font-medium">Method</th>
              <th className="text-left px-2 py-1.5 font-medium">MoMo External ID</th>
              <th className="text-right px-2 py-1.5 font-medium">Amount</th>
              <th className="text-left px-2 py-1.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-gray-100 dark:border-white/10">
                <td className="px-2 py-1.5">
                  <TxStatusBadge status={t.transactionStatus} />
                </td>
                <td className="px-2 py-1.5">{t.paymentMethod?.paymentMethodType || '—'}</td>
                <td className="px-2 py-1.5 font-mono break-all">
                  {t.momoExternalId ||
                    t.transactionId ||
                    t.externalTransactionReference ||
                    '—'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatAmount(t.amount, t.currency || 'RWF')}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {formatDateTime(t.transactionDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/** Full EBM receipts card — table inside a `Section`. Renders nothing when empty. */
export const EbmsCard: React.FC<{ ebms?: SessionEbmLike[] }> = ({ ebms }) => {
  if (!ebms || ebms.length === 0) return null
  return (
    <Section title={`EBM Receipts (${ebms.length})`}>
      <div className="rounded-md overflow-x-auto border border-gray-100 dark:border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Invoice #</th>
              <th className="text-left px-2 py-1.5 font-medium">Receipt #</th>
              <th className="text-left px-2 py-1.5 font-medium">Type</th>
              <th className="text-left px-2 py-1.5 font-medium">Method</th>
              <th className="text-left px-2 py-1.5 font-medium">Phone</th>
              <th className="text-left px-2 py-1.5 font-medium">Issued</th>
            </tr>
          </thead>
          <tbody>
            {ebms.map((e) => (
              <tr key={e.id} className="border-t border-gray-100 dark:border-white/10">
                <td className="px-2 py-1.5 font-mono">{e.cisInvoiceNumber ?? '—'}</td>
                <td className="px-2 py-1.5 font-mono">{e.receiptNumber ?? '—'}</td>
                <td className="px-2 py-1.5">{e.salesTypeCode || e.receiptTypeCode || '—'}</td>
                <td className="px-2 py-1.5">
                  {e.paymentMethodName || e.paymentMethodCode || '—'}
                </td>
                <td className="px-2 py-1.5 font-mono">{e.phoneForEbm || '—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {formatDateTime(e.vsdcReceiptPublicationDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/** Notes card — hides when there's nothing notable to show. */
export const NotesCard: React.FC<{
  description?: string | null
  cancellationReason?: string | null
  commonSessionTag?: string | null
}> = ({ description, cancellationReason, commonSessionTag }) => {
  if (!description && !cancellationReason && !commonSessionTag) return null
  return (
    <Section title="Notes">
      <div className="space-y-2">
        {description && <Field label="Description" value={description} />}
        {cancellationReason && (
          <Field label="Cancellation Reason" value={cancellationReason} />
        )}
        {commonSessionTag && (
          <Field
            label="Split Session Tag"
            value={<span className="font-mono text-xs">{commonSessionTag}</span>}
            hint="Sessions sharing this tag came from the same plug session (e.g. free + paid split)."
          />
        )}
      </div>
    </Section>
  )
}

/* ------------------------- Structural session type ---------------------- */

/** Subset of `AdminSession` / `Session` consumed by the shared cards. */
export interface SessionDetailLike {
  id: string
  sessionId: string
  source?: string | null
  sessionStatus: string
  customerName?: string | null
  customerPhone?: string | null
  ebmTin?: string | null
  carModelMake?: string | null
  startTime: string
  endTime?: string | null
  createdAt?: string
  startSoc?: number | null
  endSoc?: number | null
  chargedKwh?: number | null
  totalAmount?: number | null
  supplyAmount?: number | null
  discountAmount?: number | null
  discountRate?: number | null
  hasDiscount?: boolean
  isPaid?: boolean
  paymentMethodName?: string | null
  vehicleId?: string
  chargerId?: string
  vehicle?: {
    make?: string | null
    model?: string | null
    kabisaId?: string | null
    licensePlates?: Array<{
      licencePlateNumber: string
      isActive?: boolean
    }>
  } | null
  charger?: {
    name?: string | null
    kabisaId?: string | null
  } | null
  gun?: { name?: string | null } | null
  pedestal?: { name?: string | null } | null
  transactions?: SessionTransactionLike[]
}

/* --------------------------- Share URL helpers -------------------------- */

/**
 * Build a shareable URL for the given sessionId by injecting `?sessionId=`
 * onto whatever route the user is currently looking at, and expose a
 * `handleCopy` that writes it to the clipboard.
 */
export function useShareUrl(sessionId: string): {
  shareUrl: string
  handleCopy: () => Promise<void>
} {
  const shareUrl = React.useMemo(() => {
    if (typeof window === 'undefined' || !sessionId) return ''
    const url = new URL(window.location.href)
    url.searchParams.set('sessionId', sessionId)
    return url.toString()
  }, [sessionId])

  const handleCopy = React.useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [shareUrl])

  return { shareUrl, handleCopy }
}

/* ----------------------------- Section header --------------------------- */

/**
 * Full popup header: title + monospace sessionId + status/source badges +
 * Share button + truncated URL row. Shared by every session-details popup.
 */
export const SessionDetailsHeader: React.FC<{
  sessionId: string
  /** Human-friendly status label (already localized). */
  statusLabel: string
  /** Tailwind classes for the status badge (caller pre-computes). */
  statusBadgeClass?: string
  /** Use `outline` variant on the status badge (modal style). */
  statusBadgeOutline?: boolean
  source?: string | null
  shareUrl: string
  onShare: () => void
  /** When provided, renders an "Open page" button that navigates to the
   *  standalone session route. Omit on the standalone page itself. */
  onOpenFullPage?: () => void
  /** Bigger title in the operator/customer modal vs the admin dialog. */
  titleSize?: 'sm' | 'lg'
  /** When false, render plain semantic elements instead of Radix Dialog
   *  primitives. Required when the header lives outside a `<Dialog>` —
   *  `DialogTitle`/`DialogDescription` throw without a Dialog ancestor. */
  asDialog?: boolean
}> = ({
  sessionId,
  statusLabel,
  statusBadgeClass,
  statusBadgeOutline,
  source,
  shareUrl,
  onShare,
  onOpenFullPage,
  titleSize = 'sm',
  asDialog = true,
}) => {
  const titleClass =
    titleSize === 'lg' ? 'text-base sm:text-xl font-semibold' : 'text-base sm:text-lg'
  const HeaderEl: React.ElementType = asDialog ? DialogHeader : 'header'
  const TitleEl: React.ElementType = asDialog ? DialogTitle : 'h2'
  const DescEl: React.ElementType = asDialog ? DialogDescription : 'p'

  return (
    <HeaderEl className="space-y-2 pr-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <TitleEl className={titleClass}>Session Details</TitleEl>
          <DescEl className="font-mono text-xs break-all sm:break-normal sm:truncate text-muted-foreground">
            {sessionId}
          </DescEl>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Badge
            variant={statusBadgeOutline ? 'outline' : undefined}
            className={
              statusBadgeOutline
                ? `${statusBadgeClass} font-medium border px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide`
                : statusBadgeClass
            }
          >
            {statusLabel}
          </Badge>
          {source && (
            <Badge variant="outline" className="text-[10px]">
              {source}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onShare}>
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
          {onOpenFullPage && (
            <Button variant="outline" size="sm" onClick={onOpenFullPage}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open page
            </Button>
          )}
        </div>
      </div>
      <ShareUrlRow shareUrl={shareUrl} onCopy={onShare} />
    </HeaderEl>
  )
}

/* ------------------------------ Section cards --------------------------- */

const computeLicensePlate = (s: SessionDetailLike) =>
  s.vehicle?.licensePlates?.find((p) => p.isActive !== false)?.licencePlateNumber

/**
 * Customer card. Optionally renders an "Add customer info" CTA in the empty
 * state when the consumer wants a way to launch the customer-info dialog.
 */
export const CustomerCard: React.FC<{
  session: SessionDetailLike
  onAddCustomerInfo?: () => void
}> = ({ session, onAddCustomerInfo }) => {
  const hasCustomer = !!(session.customerName || session.customerPhone || session.ebmTin)
  if (!hasCustomer && !onAddCustomerInfo) return null
  return (
    <Section title="Customer">
      {hasCustomer ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" value={session.customerName} show={!!session.customerName} />
          <Field
            label="Phone"
            value={session.customerPhone}
            copyable={session.customerPhone || undefined}
            show={!!session.customerPhone}
          />
          <Field
            label="TIN"
            value={<span className="font-mono">{session.ebmTin}</span>}
            copyable={session.ebmTin || undefined}
            show={!!session.ebmTin}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No customer info</p>
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={onAddCustomerInfo}
          >
            Add customer info
          </button>
        </div>
      )}
    </Section>
  )
}

/**
 * Resources card. Operator info is passed via `operatorName` / `operatorEmail`
 * so the caller can supply either a "looked-up-by-id" form (admin) or the
 * already-attached operator on the session (modal).
 */
export const ResourcesCard: React.FC<{
  session: SessionDetailLike
  operatorName?: string
  operatorEmail?: string
  /** Modal renders an "Add vehicle info" CTA for missing vehicle rows. */
  onAddVehicleInfo?: () => void
}> = ({ session, operatorName, operatorEmail, onAddVehicleInfo }) => {
  const licensePlate = computeLicensePlate(session)
  const hasVehicle = !!(
    session.vehicle?.make ||
    session.vehicle?.model ||
    session.vehicle?.kabisaId ||
    licensePlate ||
    session.carModelMake
  )
  const gunName = (session.gun as any)?.gunNumber || session.gun?.name
  return (
    <Section title="Resources">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Vehicle"
          value={
            hasVehicle
              ? session.carModelMake ||
                [session.vehicle?.make, session.vehicle?.model].filter(Boolean).join(' ') ||
                'Unknown Vehicle'
              : onAddVehicleInfo
                ? (
                    <button
                      type="button"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={onAddVehicleInfo}
                    >
                      Add vehicle info
                    </button>
                  )
                : undefined
          }
          hint={session.vehicle?.kabisaId || session.vehicleId}
        />
        {licensePlate && (
          <Field
            label="License Plate"
            value={
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{licensePlate}</span>
            }
            copyable={licensePlate}
          />
        )}
        <Field
          label="Operator"
          value={operatorName || 'Unknown Operator'}
          hint={operatorEmail}
        />
        <Field
          label="Charger"
          value={session.charger?.name || 'Unknown Charger'}
          hint={session.charger?.kabisaId || session.chargerId}
        />
        <Field label="Gun" value={gunName} show={!!gunName} />
        <Field
          label="Pedestal"
          value={session.pedestal?.name}
          show={!!session.pedestal?.name}
        />
      </div>
    </Section>
  )
}

const formatDuration = (startTime: string, endTime?: string | null) => {
  if (!endTime) return 'Ongoing'
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffMins = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  return `${diffMins} minutes`
}

/** Timing card — start / end / duration / created. */
export const TimingCard: React.FC<{ session: SessionDetailLike }> = ({ session }) => (
  <Section title="Timing">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Start Time" value={formatDateTime(session.startTime)} />
      <Field
        label="End Time"
        value={session.endTime ? formatDateTime(session.endTime) : 'Ongoing'}
      />
      <Field label="Duration" value={formatDuration(session.startTime, session.endTime)} />
      <Field label="Created" value={formatDateTime(session.createdAt)} />
    </div>
  </Section>
)

/**
 * Energy card. Accepts optional live overrides for sessions whose telemetry
 * is being streamed in via WebSocket while the popup is open.
 */
export const EnergyCard: React.FC<{
  session: SessionDetailLike
  liveKwh?: number | null
  liveStartSoc?: number | null
  liveEndSoc?: number | null
}> = ({ session, liveKwh, liveStartSoc, liveEndSoc }) => {
  const kwh = liveKwh ?? session.chargedKwh
  const startSoc = liveStartSoc ?? session.startSoc
  const endSoc = liveEndSoc ?? session.endSoc
  return (
    <Section title="Energy">
      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Charged kWh"
          value={kwh != null ? `${kwh.toLocaleString()} kWh` : '—'}
        />
        {/* Render `—` when missing — collapsing nullish to `0%` would hide the
            difference between "we never captured a reading" and "the vehicle
            genuinely arrived empty". Operator views overwrite this once WS
            backfills `startSoc`. */}
        <Field label="Start SOC" value={startSoc != null ? `${startSoc}%` : '—'} />
        <Field label="End SOC" value={endSoc != null ? `${endSoc}%` : '—'} />
      </div>
    </Section>
  )
}

/** Payment card — totals, discount, primary transaction shortcuts. */
export const PaymentCard: React.FC<{ session: SessionDetailLike }> = ({ session }) => {
  const successfulTx = session.transactions?.find((t) => t.transactionStatus === 'SUCCESS')
  const primaryTx =
    successfulTx || (session.transactions ? session.transactions[session.transactions.length - 1] : undefined)
  return (
    <Section
      title="Payment"
      right={
        session.isPaid ? (
          <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30">Paid</Badge>
        ) : (
          <Badge variant="outline" className="text-gray-700 dark:text-gray-300">
            Unpaid
          </Badge>
        )
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Method" value={session.paymentMethodName} />
        <Field label="Total Amount" value={formatAmount(session.totalAmount)} />
        <Field
          label="Supply Amount"
          value={formatAmount(session.supplyAmount)}
          show={session.hasDiscount === true && session.supplyAmount != null}
        />
        <Field
          label="Discount"
          value={
            session.discountAmount != null
              ? `${formatAmount(session.discountAmount)}${
                  session.discountRate ? ` (${session.discountRate}%)` : ''
                }`
              : undefined
          }
          show={session.hasDiscount === true}
        />
        {(primaryTx?.momoExternalId || primaryTx?.transactionId) && (
          <Field
            label="MoMo External ID"
            value={
              <span className="font-mono text-xs">
                {primaryTx.momoExternalId || primaryTx.transactionId}
              </span>
            }
            copyable={(primaryTx.momoExternalId || primaryTx.transactionId) ?? undefined}
            hint={primaryTx.transactionStatus}
          />
        )}
        {primaryTx?.paymentMethod?.momoNumber && (
          <Field
            label="MoMo Number"
            value={<span className="font-mono">{primaryTx.paymentMethod.momoNumber}</span>}
            copyable={primaryTx.paymentMethod.momoNumber}
          />
        )}
      </div>
    </Section>
  )
}

/**
 * RWF/kWh helper. Prefers `supplyAmount` (pre-discount) so a discount session
 * shows the un-discounted rate, falling back to `totalAmount` otherwise.
 */
export const computeRatePerKwh = (
  session: Pick<SessionDetailLike, 'hasDiscount' | 'supplyAmount' | 'totalAmount'>,
  chargedKwh?: number | null,
): number | null => {
  const baseAmount =
    session.hasDiscount && session.supplyAmount != null ? session.supplyAmount : session.totalAmount
  return baseAmount != null && chargedKwh != null && chargedKwh > 0
    ? baseAmount / chargedKwh
    : null
}

/* ----------------------------- Action buttons --------------------------- */

/**
 * Shared admin action button stack used by `SessionDetailsDialog` (modal) and
 * the standalone `[sessionId]` page. Callers compute the eligibility booleans
 * and supply zero-arg callbacks so this block stays presentational.
 */
export interface SessionActionButtonsProps {
  /** Whether the session can produce an EBM at all (status + payment method). */
  ebmEligible: boolean
  /** EBM eligible but not yet generated — disables EBM-dependent buttons. */
  ebmPending: boolean
  /** True once a non-training, non-refund EBM is COMPLETED. */
  hasCompletedSaleEbm?: boolean
  /** True once a refund EBM is COMPLETED — hides the refund button. */
  hasCompletedRefundEbm?: boolean
  /** "Check MOMO Status" only renders for unpaid MOMO sessions. */
  showCheckMomo: boolean
  onCheckMomoStatus: () => void
  isMomoChecking: boolean
  onDownloadEBM: () => void
  onRefundEBM: () => void
  onDownloadProforma: () => void
  isDownloadingProforma: boolean
  onOpenEBMInfo: () => void
  onDistributeEBM: () => void
}

const EBM_PENDING_HINT =
  'EBM is not ready yet — operator has not finished entering EBM info'

export const SessionActionButtons: React.FC<SessionActionButtonsProps> = ({
  ebmEligible,
  ebmPending,
  hasCompletedSaleEbm,
  hasCompletedRefundEbm,
  showCheckMomo,
  onCheckMomoStatus,
  isMomoChecking,
  onDownloadEBM,
  onRefundEBM,
  onDownloadProforma,
  isDownloadingProforma,
  onOpenEBMInfo,
  onDistributeEBM,
}) => (
  <div className="space-y-2 pt-4 border-t">
    <div className="flex gap-2">
      {showCheckMomo && (
        <Button
          variant="outline"
          onClick={onCheckMomoStatus}
          disabled={isMomoChecking}
          className="flex-1"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isMomoChecking ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Check MOMO Status</span>
          <span className="sm:hidden">MOMO Status</span>
        </Button>
      )}
      {ebmEligible && (
        <Button
          onClick={onDownloadEBM}
          variant="outline"
          className="flex-1"
          disabled={ebmPending}
          title={ebmPending ? EBM_PENDING_HINT : undefined}
        >
          {ebmPending ? (
            <Clock className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          <span className="hidden sm:inline">
            {ebmPending ? 'EBM Pending' : 'Download EBM'}
          </span>
          <span className="sm:hidden">EBM</span>
        </Button>
      )}
    </div>

    {hasCompletedSaleEbm && !hasCompletedRefundEbm && (
      <Button
        onClick={onRefundEBM}
        variant="outline"
        className="w-full bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-100 hover:text-red-800 hover:border-red-300"
      >
        <Undo2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">EBM Refund</span>
        <span className="sm:hidden">Refund</span>
      </Button>
    )}

    {!hasCompletedSaleEbm && (
      <Button
        onClick={onDownloadProforma}
        variant="outline"
        disabled={isDownloadingProforma}
        className="w-full"
      >
        {isDownloadingProforma ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Proforma Invoice</span>
            <span className="sm:hidden">Proforma</span>
          </>
        )}
      </Button>
    )}

    {ebmEligible && (
      <Button
        onClick={onDistributeEBM}
        variant="outline"
        className="w-full"
        disabled={ebmPending}
        title={ebmPending ? EBM_PENDING_HINT : undefined}
      >
        <Share2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Distribute EBM</span>
        <span className="sm:hidden">Distribute</span>
      </Button>
    )}

    <Button onClick={onOpenEBMInfo} variant="outline" className="w-full">
      <FileText className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">
        {hasCompletedSaleEbm ? 'View EBM Info' : 'View/Edit EBM Info'}
      </span>
      <span className="sm:hidden">EBM Info</span>
    </Button>
  </div>
)
