import React from 'react'

type Status = 'on-time' | 'late' | 'early' | 'ongoing' | 'unknown'

interface ShiftStatusPillProps {
  status: Status
  late?: number | null
  className?: string
}

const PALETTE: Record<Status, { bg: string; fg: string; dot: string; label: (n?: number | null) => string }> = {
  'on-time': { bg: 'bg-emerald-50', fg: 'text-emerald-700', dot: 'bg-emerald-500', label: () => 'On time' },
  late: { bg: 'bg-rose-50', fg: 'text-rose-700', dot: 'bg-rose-500', label: (n) => (n ? `${n} min late` : 'Late') },
  early: { bg: 'bg-blue-50', fg: 'text-blue-700', dot: 'bg-blue-500', label: (n) => (n ? `${Math.abs(n)} min early` : 'Early') },
  ongoing: { bg: 'bg-amber-50', fg: 'text-amber-700', dot: 'bg-amber-400', label: () => 'Ongoing' },
  unknown: { bg: 'bg-slate-100', fg: 'text-slate-600', dot: 'bg-slate-400', label: () => 'Recorded' },
}

export function ShiftStatusPill({ status, late, className = '' }: ShiftStatusPillProps) {
  const p = PALETTE[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap ${p.bg} ${p.fg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot} ${status === 'ongoing' ? 'shadow-[0_0_0_3px_rgba(255,212,0,0.25)]' : ''}`} />
      {p.label(late)}
    </span>
  )
}

// Derive a status from check-in lateness + checkOutTime
export const deriveShiftStatus = (
  checkInLatenessMinutes: number | null | undefined,
  hasCheckedOut: boolean
): Status => {
  if (!hasCheckedOut) return 'ongoing'
  // No lateness data captured for this shift — show neutral "Recorded" rather
  // than coercing to "On time", which conflicts with how the drawer time card
  // labels the same null state.
  if (checkInLatenessMinutes == null) return 'unknown'
  if (checkInLatenessMinutes > 5) return 'late'
  if (checkInLatenessMinutes < -5) return 'early'
  return 'on-time'
}
