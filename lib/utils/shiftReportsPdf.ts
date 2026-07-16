import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { ShiftReportWithLateness } from '@/lib/utils/latenessCalculation'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI = 'Africa/Kigali'

const formatNum = (n: number, d = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d === 0 ? 0 : 2 })

// Per-hour rates need at least 10 minutes of shift before they're meaningful
// — anything shorter extrapolates wildly. Mirrors the on-screen rule in
// ShiftReportRow.tsx so the PDF reads the same as the table.
const perHour = (value: number, durationMin: number | null): number | null =>
  durationMin == null || durationMin < 10 ? null : value / (durationMin / 60)

const twoLine = (top: string, bottom: string | null) => (bottom ? `${top}\n${bottom}` : top)

export function generateShiftReportsPdf(reports: ShiftReportWithLateness[]): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  const body = reports.map((r) => {
    const checkIn = dayjs(r.checkInTime).tz(KIGALI).format('YYYY-MM-DD HH:mm')
    const checkOut = r.checkOutTime
      ? dayjs(r.checkOutTime).tz(KIGALI).format('YYYY-MM-DD HH:mm')
      : 'ongoing'
    const site = r.operatorShift?.charger?.name || '—'
    const operator = r.operator
      ? `${r.operator.firstName ?? ''} ${r.operator.lastName ?? ''}`.trim() || '—'
      : '—'

    const duration =
      typeof r.shiftDurationMinutes === 'number'
        ? r.shiftDurationMinutes
        : r.checkOutTime
          ? dayjs(r.checkOutTime).diff(dayjs(r.checkInTime), 'minute')
          : null
    const sessions = typeof r.chargingSessionCount === 'number' ? r.chargingSessionCount : null
    const kwhSold = r.kwhSold ?? r.chargingSessionEnergyRecorded ?? 0
    const kwhMeter = r.meterTotalKwh ?? null
    const rwf = r.moneyCollectedRwf ?? 0

    // Discrepancy = Sold − Meter: negative = meter recorded more than sold, that
    // gap is "missing"; positive = sold exceeds the meter, a "surplus".
    const signedDelta = kwhMeter !== null ? kwhSold - kwhMeter : null
    const pct =
      signedDelta !== null && Math.max(kwhSold, kwhMeter ?? 0) > 0
        ? (Math.abs(signedDelta) / Math.max(kwhSold, kwhMeter ?? 0)) * 100
        : null

    const subSessions = sessions !== null ? perHour(sessions, duration) : null
    const subSold = perHour(kwhSold, duration)
    const subMeter = kwhMeter !== null ? perHour(kwhMeter, duration) : null
    const subRwf = perHour(rwf, duration)

    let discrepancyCell = '—'
    if (signedDelta !== null) {
      const meterExceedsSold = signedDelta < 0 // meter recorded more than sold → missing
      discrepancyCell = signedDelta > 0 ? `+${formatNum(signedDelta)}` : formatNum(signedDelta)
      if (pct !== null && pct > 0) {
        discrepancyCell += meterExceedsSold ? `\n${pct.toFixed(1)}% missing` : `\n${pct.toFixed(1)}% surplus`
      }
    }

    const paymentCell =
      r.payments && r.payments.total > 0
        ? `M:${Math.round(r.payments.momoPct * 100)}% MC:${Math.round(
            r.payments.momoCodePct * 100
          )}% I:${Math.round(r.payments.invoicePct * 100)}% F:${Math.round(
            r.payments.freePct * 100
          )}%`
        : '—'

    return [
      checkIn,
      checkOut,
      site,
      operator,
      duration !== null ? `${duration}min` : '—',
      twoLine(
        sessions !== null ? String(sessions) : '—',
        subSessions !== null ? `${subSessions.toFixed(1)}/hr` : null
      ),
      twoLine(formatNum(kwhSold), subSold !== null ? `${subSold.toFixed(1)} kWh/hr` : null),
      twoLine(
        kwhMeter !== null ? formatNum(kwhMeter) : '—',
        subMeter !== null ? `${subMeter.toFixed(1)} kWh/hr` : null
      ),
      discrepancyCell,
      twoLine(
        `${rwf.toLocaleString('en-US')} RWF`,
        subRwf !== null ? `${subRwf.toFixed(0)} RWF/hr` : null
      ),
      paymentCell,
    ]
  })

  autoTable(doc, {
    head: [
      [
        'Start Time',
        'End Time',
        'Site',
        'Operator',
        'Duration',
        'Sessions',
        'kWh Sold',
        'kWh Meter',
        'Discrepancy',
        'Revenue',
        'Payment Mix',
      ],
    ],
    body,
    startY: 30,
    styles: { fontSize: 7.5, cellPadding: 3, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 75 },
      2: { cellWidth: 70 },
      3: { cellWidth: 75 },
      4: { cellWidth: 45, halign: 'right' },
      5: { cellWidth: 50, halign: 'right' },
      6: { cellWidth: 55, halign: 'right' },
      7: { cellWidth: 55, halign: 'right' },
      8: { cellWidth: 70, halign: 'right' },
      9: { cellWidth: 70, halign: 'right' },
      10: { cellWidth: 110 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      if (data.column.index !== 8) return
      const raw = String(data.cell.raw ?? '')
      if (raw.includes('missing')) {
        data.cell.styles.textColor = [190, 18, 60] // rose-700
      } else if (raw.includes('surplus')) {
        data.cell.styles.textColor = [4, 120, 87] // emerald-700
      }
    },
  })

  return doc
}
