import React from 'react'
import type { ShiftReportDetail } from '@/lib/api/shiftsAndInspections'

interface PaymentBarsProps {
  payments: ShiftReportDetail['payments']
}

export const PaymentBars: React.FC<PaymentBarsProps> = ({ payments }) => {
  const rows = [
    { label: 'MoMo', color: 'bg-amber-400', amount: payments.momo, pct: payments.momoPct },
    { label: 'MoMo Code', color: 'bg-orange-500', amount: payments.momoCode, pct: payments.momoCodePct },
    { label: 'Invoice', color: 'bg-slate-900', amount: payments.invoice, pct: payments.invoicePct },
    { label: 'Free', color: 'bg-slate-300', amount: payments.free, pct: payments.freePct },
  ].filter((r) => r.amount > 0 || r.pct > 0)
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[11px] text-slate-700 font-semibold inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${r.color}`} /> {r.label}
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">{(r.pct * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${r.color}`} style={{ width: `${Math.max(2, r.pct * 100)}%` }} />
          </div>
          <div className="text-[11px] text-slate-900 font-semibold mt-1 tabular-nums">
            RWF {r.amount.toLocaleString('en-US')}
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-2 border-t border-slate-200">
        <span className="text-[11.5px] text-slate-700 font-semibold">Total</span>
        <span className="text-[12px] text-slate-900 font-bold tabular-nums">
          RWF {payments.total.toLocaleString('en-US')}
        </span>
      </div>
    </div>
  )
}
