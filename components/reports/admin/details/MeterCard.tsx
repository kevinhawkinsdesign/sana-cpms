import React from 'react'
import { ArrowRight, Clock } from 'lucide-react'

interface MeterCardProps {
  label: string
  data: { start: number; end: number | null; sold: number | null }
  startTime: string
  endTime: string
}

export const MeterCard: React.FC<MeterCardProps> = ({ label, data, startTime, endTime }) => {
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

  // Footer: the counted kWh (|check-out − check-in|) for this meter. The current
  // backend always sends a non-negative value, but we keep a defensive red tint
  // so a negative (from any other backend) is still visually flagged.
  const footer =
    data.sold === null ? null : (
      <div className="mt-2.5 px-3.5 py-2.5 bg-slate-900 rounded-lg flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Counted by Meter</span>
        <span className={`text-[15px] font-bold tabular-nums ${data.sold < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {data.sold >= 0 ? '+' : '-'}
          {fmt(Math.abs(data.sold))}
          <span className="text-[10.5px] text-slate-400 font-medium ml-1">kWh</span>
        </span>
      </div>
    )

  return (
    <div>
      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-stretch">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Start</div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight tabular-nums whitespace-nowrap">
            {fmt(data.start)}
            <span className="text-[11px] text-slate-400 font-medium ml-1">kWh</span>
          </div>
          <div className="text-[11.5px] text-slate-500 mt-1 inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {startTime}
          </div>
        </div>
        <div className="flex items-center justify-center flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider mb-1.5">End</div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight tabular-nums whitespace-nowrap">
            {data.end !== null ? fmt(data.end) : '—'}
            <span className="text-[11px] text-slate-400 font-medium ml-1">kWh</span>
          </div>
          <div className="text-[11.5px] text-amber-800 mt-1 inline-flex items-center gap-1 font-semibold">
            <Clock className="h-2.5 w-2.5" /> {endTime}
          </div>
        </div>
      </div>
      {footer}
    </div>
  )
}
