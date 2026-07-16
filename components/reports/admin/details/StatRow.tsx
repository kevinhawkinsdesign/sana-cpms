import React from 'react'

interface StatRowProps {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: string
  unit?: string
  sub?: string
}

export const StatRow: React.FC<StatRowProps> = ({ icon: Icon, iconBg, iconColor, label, value, unit, sub }) => (
  <div className="flex items-center gap-3.5 py-3.5">
    <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-bold text-slate-900 tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-[12px] text-slate-500 font-medium">{unit}</span>}
      </div>
      {sub && <div className="text-[12px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  </div>
)
