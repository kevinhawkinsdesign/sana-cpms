import React from 'react'
import { LucideIcon } from 'lucide-react'

interface ShiftStatCardProps {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  accent: string
  label: string
  value: string | number
  sub?: string
}

export function ShiftStatCard({ icon: Icon, iconBg, iconColor, accent, label, value, sub }: ShiftStatCardProps) {
  return (
    <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex flex-col gap-2.5 min-w-0">
      <div
        className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06] ${accent}`}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{label}</span>
      </div>
      <div className="flex flex-col gap-0 min-w-0">
        <span className="text-[22px] leading-tight font-bold tracking-tight text-slate-900 truncate">
          {value}
        </span>
        {sub && <span className="text-[11px] text-slate-400 truncate">{sub}</span>}
      </div>
    </div>
  )
}
