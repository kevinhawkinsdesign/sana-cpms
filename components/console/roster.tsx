'use client';

/**
 * Roster grid (KAB-144) — Frappe-style dense scheduler: operators as sticky
 * left-hand rows × days as columns. Multiple shifts per cell stack as compact
 * colour chips (no "+N more" popover — the cell grows, the grid scrolls).
 * Click a chip to edit, click an empty cell to add. Far denser than a calendar
 * with stacked events when there are many operators / many shifts per day.
 */
import React from 'react';
import type { ShiftEvent } from '@/lib/console/schedule';

export interface RosterOperator {
  id: string;
  name: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

/** Compact chip label: "08:00–16:00 · Charger" (charger trimmed). */
function chipLabel(s: ShiftEvent): string {
  const time = s.allDay ? 'All day' : [hhmm(s.start), s.end ? hhmm(s.end) : ''].filter(Boolean).join('–');
  return s.chargerName ? `${time} · ${s.chargerName}` : time || (s.chargerName ?? 'Shift');
}

function ShiftChip({ s, onClick }: Readonly<{ s: ShiftEvent; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${s.operatorName}${s.chargerName ? ` · ${s.chargerName}` : ''}`}
      className="block w-full cursor-pointer truncate rounded border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight text-gray-800 transition hover:brightness-95 dark:text-white/90"
      style={{ borderLeftColor: s.color, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
    >
      {chipLabel(s)}
    </button>
  );
}

export function RosterGrid({
  operators,
  days,
  shiftsByOpDay,
  canManage,
  onCreate,
  onEdit,
}: Readonly<{
  operators: RosterOperator[];
  days: Date[];
  /** keyed `${operatorId}|${YYYY-MM-DD}` */
  shiftsByOpDay: Map<string, ShiftEvent[]>;
  canManage: boolean;
  onCreate: (operatorId: string, dateStr: string) => void;
  onEdit: (shiftId: string) => void;
}>) {
  const todayKey = dayKey(new Date());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const todayRef = React.useRef<HTMLTableCellElement>(null);

  // Open scrolled to today's column (centred), not the 1st of the month.
  React.useEffect(() => {
    const c = scrollRef.current;
    const t = todayRef.current;
    if (!c || !t) return;
    const cRect = c.getBoundingClientRect();
    const tRect = t.getBoundingClientRect();
    c.scrollLeft = Math.max(0, c.scrollLeft + (tRect.left - cRect.left) - (c.clientWidth - tRect.width) / 2);
  }, [todayKey, days]);

  if (operators.length === 0) {
    return <div className="px-6 py-10 text-center text-sm text-[var(--text3)]">No operators to schedule.</div>;
  }

  return (
    <div ref={scrollRef} className="kc-roster max-h-[42rem] overflow-auto">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="kc-roster-corner sticky left-0 top-0 z-30 min-w-[200px] border-b border-r bg-[var(--surface,#fff)] px-3 py-2 text-left text-xs font-semibold text-[var(--text3)]">
              Operator
            </th>
            {days.map((d) => {
              const k = dayKey(d);
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <th
                  key={k}
                  ref={k === todayKey ? todayRef : undefined}
                  className={`sticky top-0 z-20 min-w-[120px] border-b px-2 py-2 text-center text-xs font-medium ${weekend ? 'bg-[var(--sunken,#f3f4f6)]' : 'bg-[var(--surface,#fff)]'} ${k === todayKey ? 'text-[var(--brand,#08294f)]' : 'text-[var(--text3)]'}`}
                >
                  <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">{d.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {operators.map((op) => (
            <tr key={op.id} className="align-top">
              <th className="sticky left-0 z-10 min-w-[200px] border-b border-r bg-[var(--surface,#fff)] px-3 py-2 text-left font-medium text-gray-800 dark:text-white/90">
                {op.name}
              </th>
              {days.map((d) => {
                const k = dayKey(d);
                const cellShifts = shiftsByOpDay.get(`${op.id}|${k}`) ?? [];
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <td
                    key={k}
                    className={`group min-w-[120px] border-b border-l p-1 ${weekend ? 'bg-[var(--sunken,#f3f4f6)]/40' : ''} ${k === todayKey ? 'bg-[color-mix(in_srgb,var(--solar,#ffd400)_8%,transparent)]' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      {cellShifts.map((s) => (
                        <ShiftChip key={s.id} s={s} onClick={() => onEdit(s.id)} />
                      ))}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onCreate(op.id, k)}
                          aria-label={`Add shift for ${op.name} on ${k}`}
                          className="h-5 cursor-pointer rounded text-[11px] text-[var(--text3)] opacity-0 transition hover:bg-[var(--sunken,#f3f4f6)] group-hover:opacity-100"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
