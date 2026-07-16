import React from 'react'
import { Play, Clock, Check } from 'lucide-react'

export type TimeCardTone =
  | 'started'
  | 'started-late'
  | 'started-early'
  | 'ongoing'
  | 'ended'
  | 'ended-late'
  | 'ended-early'

const TIME_CARD_PALETTE: Record<TimeCardTone, {
  bg: string
  border: string
  iconBg: string
  iconColor: string
  labelColor: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}> = {
  started: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    labelColor: 'text-emerald-700',
    icon: Play,
    label: 'Started',
  },
  'started-late': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    labelColor: 'text-rose-700',
    icon: Play,
    label: 'Started · Late',
  },
  'started-early': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    labelColor: 'text-blue-700',
    icon: Play,
    label: 'Started · Early',
  },
  ongoing: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    labelColor: 'text-amber-700',
    icon: Clock,
    label: 'Ends at',
  },
  ended: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-200',
    iconColor: 'text-slate-700',
    labelColor: 'text-slate-700',
    icon: Check,
    label: 'Ended',
  },
  'ended-late': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    labelColor: 'text-rose-700',
    icon: Check,
    label: 'Ended · Late',
  },
  'ended-early': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    labelColor: 'text-blue-700',
    icon: Check,
    label: 'Ended · Early',
  },
}

export const startedTone = (lateness: number | null | undefined): TimeCardTone => {
  if (lateness == null) return 'started'
  if (lateness > 5) return 'started-late'
  if (lateness < -5) return 'started-early'
  return 'started'
}

export const endedTone = (lateness: number | null | undefined, ongoing: boolean): TimeCardTone => {
  if (ongoing) return 'ongoing'
  if (lateness == null) return 'ended'
  if (lateness > 5) return 'ended-late'
  if (lateness < -5) return 'ended-early'
  return 'ended'
}

interface ShiftTimeCardProps {
  tone: TimeCardTone
  time: string
  footer: string
  footerTone?: 'late' | 'ok' | 'neutral'
}

export const ShiftTimeCard: React.FC<ShiftTimeCardProps> = ({ tone, time, footer, footerTone = 'neutral' }) => {
  const p = TIME_CARD_PALETTE[tone]
  const Icon = p.icon
  const footerClass =
    tone === 'started-late' || tone === 'ended-late'
      ? 'text-rose-700 font-semibold'
      : tone === 'started-early' || tone === 'ended-early'
        ? 'text-blue-700 font-medium'
        : footerTone === 'late'
          ? 'text-rose-700 font-semibold'
          : footerTone === 'ok' && tone === 'started'
            ? 'text-emerald-700 font-medium'
            : 'text-slate-500'
  return (
    <div className={`p-3.5 rounded-xl border ${p.bg} ${p.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md ${p.iconBg} ${p.iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-3 w-3" />
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${p.labelColor}`}>{p.label}</span>
      </div>
      <div className="text-[22px] font-bold text-slate-900 tracking-tight tabular-nums leading-none">{time}</div>
      <div className={`text-[11.5px] mt-1.5 ${footerClass}`}>{footer}</div>
    </div>
  )
}
