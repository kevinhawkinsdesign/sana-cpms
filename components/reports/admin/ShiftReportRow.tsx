'use client'

import React from 'react'
import { ChevronUp, ChevronDown, CheckCircle2, Flag, FlagOff } from 'lucide-react'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { ShiftReportWithLateness } from '@/lib/utils/latenessCalculation'
import { deriveShiftStatus } from './ShiftStatusPill'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

export type SortField =
  | 'startTime'
  | 'endTime'
  | 'site'
  | 'operator'
  | 'duration'
  | 'sessions'
  | 'kwhSold'
  | 'kwhMeter'
  | 'discrepancy'
  | 'revenue'
export type SortDirection = 'asc' | 'desc'

// Grid columns (11 total): start, end, site, operator, duration, sessions,
// kwhSold, kwhMeter, discrepancy, revenue, payment-mix.
const GRID_COLS =
  'grid-cols-[minmax(150px,1.05fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_minmax(130px,0.95fr)_90px_80px_minmax(105px,0.85fr)_minmax(105px,0.85fr)_minmax(115px,0.9fr)_minmax(115px,0.95fr)_minmax(140px,1fr)]'

interface SortIconProps {
  field: SortField
  active: SortField
  direction: SortDirection
}

const SortIcon = ({ field, active, direction }: SortIconProps) => {
  if (active !== field) return <ChevronUp className="h-3 w-3 opacity-30" />
  return direction === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 text-slate-700" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
  )
}

interface ShiftReportHeaderProps {
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}

export const ShiftReportHeader: React.FC<ShiftReportHeaderProps> = ({ sortField, sortDirection, onSort }) => {
  const HCell = ({ field, label, align = 'left' }: { field?: SortField; label: string; align?: 'left' | 'right' }) => (
    <button
      type="button"
      onClick={field ? () => onSort(field) : undefined}
      className={`flex items-start gap-1.5 ${align === 'right' ? 'justify-end text-right' : 'justify-start'} ${
        field ? 'cursor-pointer hover:text-slate-900' : 'cursor-default'
      } text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 leading-tight`}
      disabled={!field}
    >
      <span>{label}</span>
      {field && <SortIcon field={field} active={sortField} direction={sortDirection} />}
    </button>
  )

  return (
    <div className={`grid ${GRID_COLS} gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/60`}>
      <HCell field="startTime" label="Start Time" />
      <HCell field="endTime" label="End Time" />
      <HCell field="site" label="Site" />
      <HCell field="operator" label="Operator" />
      <HCell field="duration" label="Duration (min)" />
      <HCell field="sessions" label="QTY Sessions" />
      <HCell field="kwhSold" label="Total Energy Sold (kWh)" align="right" />
      <HCell field="kwhMeter" label="Total Energy Meter (kWh)" align="right" />
      <HCell field="discrepancy" label="Energy Discrepancy (kWh)" align="right" />
      <HCell field="revenue" label="Total Revenue" align="right" />
      <HCell label="Payment Mix" align="right" />
    </div>
  )
}

interface ShiftReportRowProps {
  report: ShiftReportWithLateness
  selected: boolean
  onClick: () => void
}

const formatDateTime = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD HH:mm')
const formatNum = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals === 0 ? 0 : 2 })
const formatInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

// Per-hour rate for outlier spotting. Returns null when shift isn't long
// enough to be meaningful (under 10 minutes) — extrapolation past that
// would mislead more than inform.
const perHour = (value: number, durationMin: number | null): number | null => {
  if (durationMin == null || durationMin < 10) return null
  return value / (durationMin / 60)
}

const PerHourSub: React.FC<{ value: number | null; suffix?: string; decimals?: number }> = ({
  value,
  suffix = '/hr',
  decimals = 0,
}) => {
  if (value == null) return null
  return (
    <span className="text-[10.5px] text-slate-400 font-medium tabular-nums">
      {value.toLocaleString('en-US', { maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

export const ShiftReportRow: React.FC<ShiftReportRowProps> = ({ report, selected, onClick }) => {
  const checkInDayjs = dayjs(report.checkInTime).tz(KIGALI_TIMEZONE)
  const checkOutDayjs = report.checkOutTime ? dayjs(report.checkOutTime).tz(KIGALI_TIMEZONE) : null

  const operatorName = report.operator
    ? `${report.operator.firstName ?? ''} ${report.operator.lastName ?? ''}`.trim() || 'Operator'
    : 'Operator'

  const location = report.operatorShift?.charger?.name || '—'

  const inLate = report.checkInLatenessMinutes ?? null
  const outLate = report.checkOutLatenessMinutes ?? null

  // Energy figures.
  const kwhSold = report.kwhSold ?? report.chargingSessionEnergyRecorded ?? 0
  const rwfTotal = report.moneyCollectedRwf ?? 0
  // Backend-computed meter total (both meters summed). Shown as-is.
  const meterTotal: number | null = report.meterTotalKwh ?? null
  const meterAvailable = meterTotal !== null
  // Discrepancy = Sold − Meter: negative when the meter recorded more than was sold
  // (a "missing" gap), positive when sold exceeds the meter (a "surplus").
  const deltaSigned = meterAvailable ? kwhSold - (meterTotal ?? 0) : null
  const discrepancyAbs = deltaSigned !== null ? Math.abs(deltaSigned) : null
  const discrepancyPct =
    meterAvailable && Math.max(kwhSold, meterTotal ?? 0) > 0
      ? (discrepancyAbs! / Math.max(kwhSold, meterTotal ?? 0)) * 100
      : null

  // Duration.
  const durationMin =
    typeof report.shiftDurationMinutes === 'number'
      ? report.shiftDurationMinutes
      : checkOutDayjs
        ? checkOutDayjs.diff(checkInDayjs, 'minute')
        : null

  // Sessions count.
  const sessionsCount =
    typeof report.chargingSessionCount === 'number' ? report.chargingSessionCount : null

  // Per-hour rates (null when shift too short to be meaningful).
  const sessionsPerHr = sessionsCount !== null ? perHour(sessionsCount, durationMin) : null
  const kwhSoldPerHr = perHour(kwhSold, durationMin)
  const kwhMeterPerHr = meterTotal !== null ? perHour(meterTotal, durationMin) : null
  const rwfPerHr = perHour(rwfTotal, durationMin)

  const payments = report.payments
  const paymentTotal = payments?.total ?? 0

  // Sub-labels under the meter / discrepancy cells, computed here so the JSX stays flat.
  const meterSub = <PerHourSub value={kwhMeterPerHr} suffix=" kWh/hr" decimals={1} />

  // deltaSigned = Sold − Meter. Meter > Sold (negative) means the meter recorded
  // more than was sold — that gap is "missing" (metered but not sold). Sold > Meter
  // (positive) means more was sold than metered — a "surplus".
  const meterExceedsSold = deltaSigned !== null && deltaSigned < 0
  const soldExceedsMeter = deltaSigned !== null && deltaSigned > 0

  // Missing (meter > sold, a loss) → red; surplus (sold > meter) → green.
  let deltaToneClass = 'text-slate-900'
  if (meterExceedsSold) deltaToneClass = 'text-rose-700'
  else if (soldExceedsMeter) deltaToneClass = 'text-emerald-700'

  let deltaText = '—'
  if (deltaSigned !== null) deltaText = soldExceedsMeter ? `+${formatNum(deltaSigned)}` : formatNum(deltaSigned)

  let discrepancySub: React.ReactNode = null
  if (discrepancyPct !== null && discrepancyPct > 0) {
    const toneClass = meterExceedsSold ? 'text-rose-600' : 'text-emerald-600'
    discrepancySub = (
      <span className={`text-[11px] font-semibold whitespace-nowrap ${toneClass}`}>
        {meterExceedsSold ? `${discrepancyPct.toFixed(1)}% missing` : `${discrepancyPct.toFixed(1)}% surplus`}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full grid ${GRID_COLS} gap-3 items-start px-4 py-3 text-left border-b border-slate-200 transition-colors ${
        selected
          ? 'bg-amber-50/70 border-l-[3px] border-l-amber-400 pl-[13px]'
          : 'border-l-[3px] border-l-transparent hover:bg-slate-50/70'
      }`}
    >
      {/* Start Time */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[12.5px] font-medium text-slate-900 font-mono whitespace-nowrap">
          {formatDateTime(checkInDayjs)}
        </span>
        {inLate !== null && inLate > 5 && (
          <span className="text-[11px] font-semibold text-rose-600">{inLate}min late</span>
        )}
        {inLate !== null && inLate < -5 && (
          <span className="text-[11px] font-medium text-blue-600">{Math.abs(inLate)}min early</span>
        )}
      </div>

      {/* End Time */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {checkOutDayjs ? (
          <>
            <span className="text-[12.5px] font-medium text-slate-900 font-mono whitespace-nowrap">
              {formatDateTime(checkOutDayjs)}
            </span>
            {outLate !== null && outLate > 5 && (
              <span className="text-[11px] font-semibold text-rose-600">{outLate}min late</span>
            )}
            {outLate !== null && outLate < -5 && (
              <span className="text-[11px] font-medium text-blue-600">{Math.abs(outLate)}min early</span>
            )}
          </>
        ) : (
          <span className="text-[12.5px] font-semibold text-amber-700">ongoing</span>
        )}
      </div>

      {/* Site */}
      <span className="text-[12.5px] text-slate-700 truncate" title={location}>
        {location}
      </span>

      {/* Operator */}
      {(() => {
        const flagActor = report.lastFlagEvent?.actor
          ? `${report.lastFlagEvent.actor.firstName ?? ''} ${report.lastFlagEvent.actor.lastName ?? ''}`.trim()
          : null
        const flagReason = report.lastFlagEvent?.reason
        const approvalActor = report.lastApprovalEvent?.actor
          ? `${report.lastApprovalEvent.actor.firstName ?? ''} ${report.lastApprovalEvent.actor.lastName ?? ''}`.trim()
          : report.approvedBy
            ? `${report.approvedBy.firstName} ${report.approvedBy.lastName}`
            : null
        const approvalReason = report.lastApprovalEvent?.reason ?? report.approvalReason ?? null
        const resolvedTitle = report.wasFlaggedThenApproved
          ? `${operatorName} — flagged by ${flagActor ?? '—'}${flagReason ? `: ${flagReason}` : ''}\n→ resolved by ${approvalActor ?? '—'}${approvalReason ? `: ${approvalReason}` : ''}`
          : null
        return (
          <span
            className="text-[12.5px] font-semibold text-slate-900 truncate inline-flex items-center gap-1.5 min-w-0"
            title={
              resolvedTitle ??
              (report.isApproved && report.approvedBy
                ? `${operatorName} — approved by ${report.approvedBy.firstName} ${report.approvedBy.lastName}`
                : report.isFlagged && report.flaggedBy
                  ? `${operatorName} — flagged by ${report.flaggedBy.firstName} ${report.flaggedBy.lastName}${report.flagReason ? `: ${report.flagReason}` : ''}`
                  : operatorName)
            }
          >
            {report.wasFlaggedThenApproved ? (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="inline-flex items-center"
                aria-label="Flagged then approved"
              >
                <FlagOff className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
              </motion.span>
            ) : report.isApproved ? (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="inline-flex items-center"
                aria-label="Approved"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              </motion.span>
            ) : report.isFlagged ? (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="inline-flex items-center"
                aria-label="Flagged"
              >
                <Flag className="h-3.5 w-3.5 text-amber-600 fill-amber-200 flex-shrink-0" />
              </motion.span>
            ) : null}
            <span className="truncate">{operatorName}</span>
            {report.wasFlaggedThenApproved && (
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0">
                Resolved
              </span>
            )}
          </span>
        )
      })()}

      {/* Duration */}
      <span className="text-[12.5px] text-slate-700 tabular-nums whitespace-nowrap">
        {checkOutDayjs ? `${durationMin ?? 0}min` : <span className="text-amber-700 font-semibold">ongoing</span>}
      </span>

      {/* QTY Sessions */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] text-slate-700 tabular-nums">
          {sessionsCount !== null ? formatInt(sessionsCount) : '—'}
        </span>
        <PerHourSub value={sessionsPerHr} decimals={1} />
      </div>

      {/* Total Energy Sold */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[12.5px] font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
          {formatNum(kwhSold)}
        </span>
        <PerHourSub value={kwhSoldPerHr} suffix=" kWh/hr" decimals={1} />
      </div>

      {/* Total Energy Meter */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[12.5px] font-semibold text-right tabular-nums whitespace-nowrap text-slate-900">
          {meterAvailable ? formatNum(meterTotal ?? 0) : '—'}
        </span>
        {meterSub}
      </div>

      {/* Energy Discrepancy = Sold − Meter (negative when the meter exceeds sold). */}
      <div className="flex flex-col items-end gap-0.5 min-w-0">
        <span className={`text-[12.5px] font-semibold tabular-nums whitespace-nowrap ${deltaToneClass}`}>
          {deltaText}
        </span>
        {discrepancySub}
      </div>

      {/* Total Revenue */}
      <div className="flex flex-col items-end gap-0.5 min-w-0">
        <span className="text-[12.5px] font-semibold text-slate-900 tabular-nums whitespace-nowrap">
          {formatInt(rwfTotal)} RWF
        </span>
        <PerHourSub value={rwfPerHr} suffix=" RWF/hr" decimals={0} />
      </div>

      {/* Payment Mix */}
      <PaymentMixCell payments={payments} total={paymentTotal} />
    </button>
  )
}

interface PaymentMixCellProps {
  payments: ShiftReportWithLateness['payments']
  total: number
}

const PaymentMixCell: React.FC<PaymentMixCellProps> = ({ payments, total }) => {
  if (!payments || total <= 0) {
    return <span className="text-[11px] text-slate-400 text-right">—</span>
  }
  const segs = [
    { key: 'momo', label: 'MoMo', pct: payments.momoPct, color: 'bg-amber-400' },
    { key: 'momoCode', label: 'MoMo Code', pct: payments.momoCodePct, color: 'bg-orange-500' },
    { key: 'invoice', label: 'Invoice', pct: payments.invoicePct, color: 'bg-slate-900' },
    { key: 'free', label: 'Free', pct: payments.freePct, color: 'bg-slate-300' },
  ].filter((s) => s.pct > 0)
  const tooltip = segs
    .map((s) => `${s.label}: ${(s.pct * 100).toFixed(0)}%`)
    .join(' · ')
  return (
    <div className="flex flex-col items-end gap-1 min-w-0 w-full" title={tooltip}>
      <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
        {segs.map((s) => (
          <div key={s.key} className={s.color} style={{ width: `${s.pct * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 justify-end text-[10px] text-slate-500 tabular-nums">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-0.5">
            <span className={`w-1 h-1 rounded-full ${s.color}`} />
            {(s.pct * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  )
}

export { deriveShiftStatus }
