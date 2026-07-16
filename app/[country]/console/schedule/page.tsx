'use client';

/** Console Schedule (KAB-141 + KAB-144): a Frappe-style roster — operators as
 *  sticky rows × days of the month as columns. Multiple shifts per cell stack as
 *  compact colour chips. Month nav + operator/charger filters; all view state in
 *  the URL. Create/edit/delete gated on manage_shifts. */
import React from 'react';
import { Badge, Btn, Card, PageHead, Select } from '@/components/console/ui';
import { RosterGrid } from '@/components/console/roster';
import { useOrgs, hasPerm } from '@/lib/console/orgs';
import { useUrlState } from '@/lib/console/useUrlState';
import { useAllOrgOperators } from '@/lib/console/operators';
import { useOrgStations } from '@/lib/console/stations';
import {
  useOrgShiftCalendar,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useBulkAssignShifts,
  type ShiftEvent,
} from '@/lib/console/schedule';
import {
  useOrgShiftTemplates,
  useCreateShiftTemplate,
  useDeleteShiftTemplate,
  WEEKDAYS,
  formatDays,
  type ShiftTemplate,
} from '@/lib/console/shiftTemplates';
import { useOrgSwaps, useCreateSwap, useRespondSwap, type OrgSwap } from '@/lib/console/swaps';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** All days of the month containing `ref`. */
function monthDays(ref: Date): Date[] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => new Date(y, m, i + 1));
}

interface Draft {
  shiftId?: string;
  operatorId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  chargerId: string;
  chargerName: string | null;
  // Recurring (create-only): when repeat is on, save creates a ShiftTemplate
  // (weekly pattern) instead of a single shift.
  repeat: boolean;
  days: number[];
  endDate: string;
  /** Set when editing a shift that was generated from a recurring template. */
  fromTemplate?: boolean;
}

export default function ConsoleSchedulePage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_shifts');

  const { get, set } = useUrlState({ date: '', op: '', charger: '' });
  const dateParam = get('date');
  const operatorFilter = get('op');
  const chargerFilter = get('charger');

  const focusDate = dateParam ? new Date(dateParam) : new Date();
  const rosterDays = React.useMemo(() => monthDays(focusDate), [dateParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const range = { from: localDate(rosterDays[0]), to: localDate(rosterDays.at(-1) as Date) };

  const operatorsQ = useAllOrgOperators(orgId, { status: 'all' });
  const stationsQ = useOrgStations(orgId);
  const operators = operatorsQ.operators;
  const stations = stationsQ.data?.stations ?? [];

  const calendarQ = useOrgShiftCalendar(orgId, { ...range, operatorId: operatorFilter || undefined });
  // Charger filter is client-side (the feed only filters by operator).
  const events = React.useMemo(() => {
    const all = calendarQ.data?.events ?? [];
    return chargerFilter ? all.filter((e) => e.chargerId === chargerFilter) : all;
  }, [calendarQ.data, chargerFilter]);

  const createShift = useCreateShift(orgId);
  const updateShift = useUpdateShift(orgId);
  const deleteShift = useDeleteShift(orgId);
  const createTemplate = useCreateShiftTemplate(orgId);
  const bulkAssign = useBulkAssignShifts(orgId);
  const createSwap = useCreateSwap(orgId);
  const pendingSwapsQ = useOrgSwaps(orgId, 'pending');
  const pendingSwapCount = pendingSwapsQ.data?.swaps.length ?? 0;

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showBulk, setShowBulk] = React.useState(false);
  const [showSwaps, setShowSwaps] = React.useState(false);

  const operatorById = (id: string) => operators.find((o) => o.id === id);
  const chargerNameOf = (id: string) => stations.find((s) => s.chargerId === id)?.chargerName ?? null;

  // Rows: the solo-filtered operator, else everyone.
  const rosterOperators = React.useMemo(
    () => (operatorFilter ? operators.filter((o) => o.id === operatorFilter) : operators),
    [operators, operatorFilter],
  );
  const shiftsByOpDay = React.useMemo(() => {
    const m = new Map<string, ShiftEvent[]>();
    for (const e of events) {
      if (!e.start) continue;
      const key = `${e.operatorId}|${localDate(new Date(e.start))}`;
      const arr = m.get(key);
      if (arr) arr.push(e);
      else m.set(key, [e]);
    }
    return m;
  }, [events]);

  function openCreate(operatorId: string, dateStr: string) {
    if (!canManage) return;
    setError(null);
    const seedDate = dateStr ? new Date(dateStr) : new Date();
    const seedDow = seedDate.getDay() === 0 ? 7 : seedDate.getDay();
    setDraft({
      operatorId: operatorId || operators[0]?.id || '',
      shiftDate: dateStr,
      startTime: '08:00',
      endTime: '16:00',
      chargerId: chargerFilter || '',
      chargerName: chargerFilter ? chargerNameOf(chargerFilter) : null,
      repeat: false,
      days: [seedDow],
      endDate: '',
    });
  }

  function openEdit(shiftId: string) {
    const ev = events.find((e) => e.id === shiftId);
    if (!ev) return;
    setError(null);
    const start = ev.start ? new Date(ev.start) : null;
    const end = ev.end ? new Date(ev.end) : null;
    setDraft({
      shiftId,
      operatorId: ev.operatorId,
      shiftDate: start ? localDate(start) : '',
      startTime: start && !ev.allDay ? localTime(start) : '',
      endTime: end ? localTime(end) : '',
      chargerId: ev.chargerId ?? '',
      // Carry the event's own charger name so the modal prefills it even if the
      // charger isn't in the (filtered) stations list as currently loaded.
      chargerName: ev.chargerName,
      repeat: false,
      days: [],
      endDate: '',
      fromTemplate: !!ev.shiftTemplateId,
    });
  }

  function overlaps(d: Draft): ShiftEvent | undefined {
    return events.find((e) => e.id !== d.shiftId && e.operatorId === d.operatorId && e.start && localDate(new Date(e.start)) === d.shiftDate);
  }

  function save() {
    if (!draft) return;
    if (!draft.operatorId) { setError('Pick an operator.'); return; }
    const onErr = () => setError('Couldn’t save the shift.');

    // Recurring create → ShiftTemplate (generates the per-day shifts on the BE).
    if (!draft.shiftId && draft.repeat) {
      if (draft.days.length === 0) { setError('Pick at least one weekday to repeat on.'); return; }
      createTemplate.mutate(
        {
          operatorId: draft.operatorId,
          chargerId: draft.chargerId || null,
          daysOfWeek: draft.days,
          startTime: draft.startTime || null,
          endTime: draft.endTime || null,
          startDate: draft.shiftDate,
          endDate: draft.endDate || null,
        },
        { onSuccess: () => setDraft(null), onError: onErr },
      );
      return;
    }

    const input = {
      operatorId: draft.operatorId,
      shiftDate: draft.shiftDate,
      startTime: draft.startTime || undefined,
      endTime: draft.endTime || undefined,
      chargerId: draft.chargerId || undefined,
    };
    if (draft.shiftId) {
      updateShift.mutate({ shiftId: draft.shiftId, input }, { onSuccess: () => setDraft(null), onError: onErr });
    } else {
      createShift.mutate(input, { onSuccess: () => setDraft(null), onError: onErr });
    }
  }

  function remove() {
    if (!draft?.shiftId) return;
    deleteShift.mutate(draft.shiftId, { onSuccess: () => setDraft(null), onError: () => setError('Couldn’t delete the shift.') });
  }

  const shiftMonth = (delta: number) => set('date', localDate(new Date(focusDate.getFullYear(), focusDate.getMonth() + delta, 1)));
  const monthLabel = focusDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const overlapWarn = draft && overlaps(draft);

  return (
    <div className="space-y-6">
      <PageHead
        title="Schedule"
        sub="Assign and manage operator shifts"
        actions={
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" icon="refresh" onClick={() => setShowSwaps(true)}>
              Swaps{pendingSwapCount ? ` (${pendingSwapCount})` : ''}
            </Btn>
            <Btn size="sm" variant="ghost" icon="refresh" onClick={() => setShowTemplates(true)}>Repeating</Btn>
            {canManage && <Btn size="sm" variant="ghost" icon="people" onClick={() => setShowBulk(true)}>Bulk assign</Btn>}
            {canManage && <Btn size="sm" variant="primary" icon="plus" onClick={() => openCreate('', localDate(focusDate))}>New shift</Btn>}
          </div>
        }
      />

      {!canManage && (
        <div className="text-sm text-[var(--text3)]">View only — you don&apos;t have permission to edit shifts.</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          options={['All operators', ...operators.map((o) => o.name)]}
          value={operatorFilter ? (operatorById(operatorFilter)?.name ?? 'All operators') : 'All operators'}
          onChange={(name) => set('op', name === 'All operators' ? null : (operators.find((o) => o.name === name)?.id ?? null))}
          style={{ width: 170 }}
        />
        <Select
          options={['All chargers', ...stations.map((s) => s.chargerName ?? s.chargerId)]}
          value={chargerFilter ? (chargerNameOf(chargerFilter) ?? 'All chargers') : 'All chargers'}
          onChange={(label) => set('charger', label === 'All chargers' ? null : (stations.find((s) => (s.chargerName ?? s.chargerId) === label)?.chargerId ?? null))}
          style={{ width: 170 }}
        />
      </div>

      <Card pad={false}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/5">
          <div className="flex items-center gap-1.5">
            <Btn size="xs" variant="ghost" icon="chevL" onClick={() => shiftMonth(-1)} />
            <Btn size="xs" variant="ghost" onClick={() => set('date', null)}>Today</Btn>
            <Btn size="xs" variant="ghost" icon="chevR" onClick={() => shiftMonth(1)} />
            <span className="ml-2 text-sm font-semibold text-gray-800 dark:text-white/90">{monthLabel}</span>
          </div>
          {calendarQ.isFetching && <span className="text-xs text-[var(--text3)]">Loading…</span>}
        </div>
        <RosterGrid
          operators={rosterOperators}
          days={rosterDays}
          shiftsByOpDay={shiftsByOpDay}
          canManage={canManage}
          onCreate={(opId, dateStr) => openCreate(opId, dateStr)}
          onEdit={openEdit}
        />
      </Card>

      {draft && (
        <ShiftModal
          draft={draft}
          setDraft={setDraft}
          operators={operators}
          stations={stations}
          error={error}
          overlapWarn={!!overlapWarn}
          saving={createShift.isPending || updateShift.isPending || createTemplate.isPending}
          deleting={deleteShift.isPending}
          requestingSwap={createSwap.isPending}
          onClose={() => setDraft(null)}
          onSave={save}
          onDelete={remove}
          onRequestSwap={
            canManage && draft.shiftId
              ? (targetOperatorId, done) =>
                  createSwap.mutate(
                    { operatorShiftId: draft.shiftId as string, targetOperatorId },
                    { onSuccess: () => done('Swap requested.'), onError: () => done(null, 'Couldn’t request swap.') },
                  )
              : undefined
          }
        />
      )}

      {showTemplates && <TemplatesPanel orgId={orgId} canManage={canManage} onClose={() => setShowTemplates(false)} />}
      {showSwaps && <SwapsPanel orgId={orgId} canManage={canManage} onClose={() => setShowSwaps(false)} />}

      {showBulk && (
        <BulkAssignModal
          operators={operators}
          stations={stations}
          defaultDate={localDate(focusDate)}
          submitting={bulkAssign.isPending}
          onClose={() => setShowBulk(false)}
          onSubmit={(input, done) =>
            bulkAssign.mutate(input, {
              onSuccess: (r) => done(`Created ${r.created} shifts${r.skipped ? `, skipped ${r.skipped} existing` : ''}.`),
              onError: () => done(null, 'Couldn’t assign shifts.'),
            })
          }
        />
      )}
    </div>
  );
}

/** Bulk-assign: many operators × weekdays × date range in one go. */
function BulkAssignModal({
  operators, stations, defaultDate, submitting, onClose, onSubmit,
}: Readonly<{
  operators: Array<{ id: string; name: string }>;
  stations: Array<{ chargerId: string; chargerName: string | null }>;
  defaultDate: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: { operatorIds: string[]; chargerId: string | null; daysOfWeek: number[]; startTime: string; endTime: string; startDate: string; endDate: string }, done: (msg: string | null, err?: string) => void) => void;
}>) {
  const [opIds, setOpIds] = React.useState<string[]>([]);
  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [chargerId, setChargerId] = React.useState<string>('');
  const [startTime, setStartTime] = React.useState('08:00');
  const [endTime, setEndTime] = React.useState('16:00');
  const [startDate, setStartDate] = React.useState(defaultDate);
  const [endDate, setEndDate] = React.useState(defaultDate);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const toggleOp = (id: string) => setOpIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chargerLabel = chargerId ? (stations.find((s) => s.chargerId === chargerId)?.chargerName ?? 'No charger') : 'No charger';

  const submit = () => {
    setErr(null); setMsg(null);
    if (opIds.length === 0) { setErr('Pick at least one operator.'); return; }
    if (days.length === 0) { setErr('Pick at least one weekday.'); return; }
    if (endDate < startDate) { setErr('End date is before start date.'); return; }
    onSubmit(
      { operatorIds: opIds, chargerId: chargerId || null, daysOfWeek: days, startTime, endTime, startDate, endDate },
      (m, e) => { if (e) setErr(e); else { setMsg(m); setOpIds([]); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1A1A1A] dark:border dark:border-[#2A2A2A]">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Bulk assign shifts</h3>
        <p className="mb-4 text-xs text-[var(--text3)]">Assign several operators the same shift across a date range.</p>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-[var(--text3)]">
              <span>Operators ({opIds.length} selected)</span>
              <button type="button" className="text-[var(--brand,#08294f)]" onClick={() => setOpIds(opIds.length === operators.length ? [] : operators.map((o) => o.id))}>
                {opIds.length === operators.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="max-h-40 overflow-auto rounded-lg border border-gray-200 p-2 dark:border-white/10">
              {operators.map((o) => (
                <label key={o.id} className="flex items-center gap-2 py-0.5 text-sm text-gray-800 dark:text-white/90">
                  <input type="checkbox" checked={opIds.includes(o.id)} onChange={() => toggleOp(o.id)} />
                  {o.name}
                </label>
              ))}
            </div>
          </div>

          <Field label="Weekdays">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button key={d.value} type="button"
                    onClick={() => setDays((p) => (on ? p.filter((x) => x !== d.value) : [...p, d.value]))}
                    className={`h-8 w-10 rounded-md border text-xs font-medium transition ${on ? 'border-[#08294f] bg-[#08294f] text-white' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Charger">
            <Select
              options={['No charger', ...stations.map((s) => s.chargerName ?? s.chargerId)]}
              value={chargerLabel}
              onChange={(label) => setChargerId(label === 'No charger' ? '' : (stations.find((s) => (s.chargerName ?? s.chargerId) === label)?.chargerId ?? ''))}
            />
          </Field>

          <div className="flex gap-3">
            <Field label="Start time"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={INPUT_CLS} /></Field>
            <Field label="End time"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={INPUT_CLS} /></Field>
          </div>
          <div className="flex gap-3">
            <Field label="From"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLS} /></Field>
            <Field label="To"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT_CLS} /></Field>
          </div>

          {msg && <div className="text-xs text-[var(--ok)]">{msg}</div>}
          {err && <div className="text-xs text-[var(--err)]">{err}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
          <Btn variant="primary" size="sm" loading={submitting} onClick={submit}>Assign</Btn>
        </div>
      </div>
    </div>
  );
}

/** Manage recurring shift templates (list + delete). */
function TemplatesPanel({ orgId, canManage, onClose }: Readonly<{ orgId: string | null; canManage: boolean; onClose: () => void }>) {
  const { data, isPending } = useOrgShiftTemplates(orgId);
  const del = useDeleteShiftTemplate(orgId);
  const templates = data?.templates ?? [];
  const fmtRange = (t: ShiftTemplate) =>
    `${new Date(t.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}${t.endDate ? ` – ${new Date(t.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ' → ongoing'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1A1A1A] dark:border dark:border-[#2A2A2A]">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Repeating shifts</h3>
        <p className="mb-4 text-xs text-[var(--text3)]">Weekly patterns that auto-create shifts going forward.</p>

        {isPending ? (
          <div className="py-8 text-center text-sm text-[var(--text3)]">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text3)]">No repeating shifts yet. Create one with “Repeat weekly” on a new shift.</div>
        ) : (
          <div className="max-h-[24rem] space-y-2 overflow-auto">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/10">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {t.operatorName ?? 'Operator'}{t.chargerName ? ` · ${t.chargerName}` : ''}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text3)]">
                    <Badge kind="info">{formatDays(t.daysOfWeek)}</Badge>
                    {t.startTime && <span>{t.startTime}{t.endTime ? `–${t.endTime}` : ''}</span>}
                    <span>· {fmtRange(t)}</span>
                  </div>
                </div>
                {canManage && (
                  <Btn size="xs" variant="danger" loading={del.isPending} onClick={() => del.mutate(t.id)}>Stop</Btn>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

function ShiftModal({
  draft, setDraft, operators, stations, error, overlapWarn, saving, deleting, requestingSwap, onClose, onSave, onDelete, onRequestSwap,
}: Readonly<{
  draft: Draft;
  setDraft: (d: Draft) => void;
  operators: Array<{ id: string; name: string }>;
  stations: Array<{ chargerId: string; chargerName: string | null }>;
  error: string | null;
  overlapWarn: boolean;
  saving: boolean;
  deleting: boolean;
  requestingSwap?: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  /** Edit mode only: request the shift be swapped to `targetOperatorId`. */
  onRequestSwap?: (targetOperatorId: string, done: (msg: string | null, err?: string) => void) => void;
}>) {
  const operatorOptions = operators.map((o) => o.name);
  const [swapTarget, setSwapTarget] = React.useState('');
  const [swapMsg, setSwapMsg] = React.useState<string | null>(null);
  const [swapErr, setSwapErr] = React.useState<string | null>(null);
  // Include the draft's own charger (from the shift) so an edit always prefills
  // it, even if it isn't in the org stations list as currently loaded/filtered.
  const stationLabels = stations.map((s) => s.chargerName ?? s.chargerId);
  const draftLabel = draft.chargerName ?? (draft.chargerId ? stations.find((s) => s.chargerId === draft.chargerId)?.chargerName ?? null : null);
  const stationOptions = ['No charger', ...(draftLabel && !stationLabels.includes(draftLabel) ? [draftLabel] : []), ...stationLabels];
  const currentStationLabel = draftLabel ?? 'No charger';

  const setCharger = (label: string) =>
    setDraft({
      ...draft,
      chargerId: label === 'No charger' ? '' : (stations.find((s) => (s.chargerName ?? s.chargerId) === label)?.chargerId ?? draft.chargerId),
      chargerName: label === 'No charger' ? null : label,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1A1A1A] dark:border dark:border-[#2A2A2A]">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">{draft.shiftId ? 'Edit shift' : 'New shift'}</h3>

        {draft.fromTemplate && (
          <div className="mb-4 rounded-lg border border-[var(--info)]/30 bg-[var(--info)]/10 p-2.5 text-xs text-[var(--text2)]">
            ↻ Part of a repeating series. Saving here changes <b>only this day</b>. To change or stop the whole series, use <b>Repeating</b>.
          </div>
        )}

        <div className="space-y-3">
          <Field label="Operator">
            <Select
              options={operatorOptions}
              value={operators.find((o) => o.id === draft.operatorId)?.name ?? operatorOptions[0] ?? ''}
              onChange={(name) => setDraft({ ...draft, operatorId: operators.find((o) => o.name === name)?.id ?? '' })}
            />
          </Field>
          <Field label="Charger">
            <Select options={stationOptions} value={currentStationLabel} onChange={setCharger} />
          </Field>
          <Field label={draft.repeat ? 'Starts on' : 'Date'}>
            <input type="date" value={draft.shiftDate} onChange={(e) => setDraft({ ...draft, shiftDate: e.target.value })} className={INPUT_CLS} />
          </Field>
          <div className="flex gap-3">
            <Field label="Start"><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className={INPUT_CLS} /></Field>
            <Field label="End"><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className={INPUT_CLS} /></Field>
          </div>

          {/* Recurring (create only) */}
          {!draft.shiftId && (
            <div className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-white/90">
                <input type="checkbox" checked={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.checked })} />
                Repeat weekly
              </label>
              {draft.repeat && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = draft.days.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((x) => x !== d.value) : [...draft.days, d.value] })}
                          className={`h-8 w-10 rounded-md border text-xs font-medium transition ${on ? 'border-[#08294f] bg-[#08294f] text-white' : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Repeat until (optional)">
                    <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={INPUT_CLS} />
                  </Field>
                  <div className="flex items-start gap-1.5 text-xs text-[var(--text3)]">
                    <span title="info" className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--sunken,#eee)] text-[10px] font-semibold text-[var(--text2)]">i</span>
                    <span>No end date → repeats ongoing. Shifts are created ~60 days ahead and extended automatically.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Swap (edit only): hand this shift to another operator. */}
          {draft.shiftId && onRequestSwap && (
            <div className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <div className="mb-2 text-xs font-medium text-[var(--text3)]">Swap this shift to another operator</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    options={['Pick operator…', ...operators.filter((o) => o.id !== draft.operatorId).map((o) => o.name)]}
                    value={swapTarget ? (operators.find((o) => o.id === swapTarget)?.name ?? 'Pick operator…') : 'Pick operator…'}
                    onChange={(name) => setSwapTarget(name === 'Pick operator…' ? '' : (operators.find((o) => o.name === name)?.id ?? ''))}
                  />
                </div>
                <Btn
                  size="sm"
                  variant="default"
                  loading={requestingSwap}
                  onClick={() => {
                    setSwapMsg(null); setSwapErr(null);
                    if (!swapTarget) { setSwapErr('Pick an operator.'); return; }
                    onRequestSwap(swapTarget, (m, e) => { if (e) setSwapErr(e); else { setSwapMsg(m); setSwapTarget(''); } });
                  }}
                >
                  Request
                </Btn>
              </div>
              {swapMsg && <div className="mt-2 text-xs text-[var(--ok)]">{swapMsg}</div>}
              {swapErr && <div className="mt-2 text-xs text-[var(--err)]">{swapErr}</div>}
            </div>
          )}

          {overlapWarn && !draft.repeat && <div className="text-xs text-[var(--warn)]">⚠ This operator already has a shift that day.</div>}
          {error && <div className="text-xs text-[var(--err)]">{error}</div>}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {draft.shiftId ? <Btn variant="danger" size="sm" loading={deleting} onClick={onDelete}>Delete</Btn> : <span />}
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" size="sm" loading={saving} onClick={onSave}>{draft.shiftId ? 'Save' : 'Create'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pending shift swaps — approve (reassigns the shift) or reject. */
function SwapsPanel({ orgId, canManage, onClose }: Readonly<{ orgId: string | null; canManage: boolean; onClose: () => void }>) {
  const { data, isPending } = useOrgSwaps(orgId, 'pending');
  const respond = useRespondSwap(orgId);
  const swaps = data?.swaps ?? [];
  const fmtDay = (s: OrgSwap) => new Date(s.swapDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1A1A1A] dark:border dark:border-[#2A2A2A]">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Pending swaps</h3>
        <p className="mb-4 text-xs text-[var(--text3)]">Approving reassigns the shift to the new operator.</p>

        {isPending ? (
          <div className="py-8 text-center text-sm text-[var(--text3)]">Loading…</div>
        ) : swaps.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text3)]">No pending swaps.</div>
        ) : (
          <div className="max-h-[24rem] space-y-2 overflow-auto">
            {swaps.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/10">
                <div className="min-w-0 text-sm">
                  <div className="truncate text-gray-800 dark:text-white/90">
                    <span className="font-medium">{s.fromOperatorName}</span> → <span className="font-medium">{s.toOperatorName}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text3)]">
                    {fmtDay(s)}{s.startTime ? ` · ${s.startTime}${s.endTime ? `–${s.endTime}` : ''}` : ''}{s.chargerName ? ` · ${s.chargerName}` : ''}
                    {s.reason ? ` · “${s.reason}”` : ''}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1.5">
                    <Btn size="xs" variant="primary" loading={respond.isPending} onClick={() => respond.mutate({ swapId: s.id, approved: true })}>Approve</Btn>
                    <Btn size="xs" variant="ghost" loading={respond.isPending} onClick={() => respond.mutate({ swapId: s.id, approved: false })}>Reject</Btn>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end"><Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn></div>
      </div>
    </div>
  );
}

const INPUT_CLS =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-[#08294f] focus:outline-none dark:border-gray-700 dark:text-white/90';

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text3)]">{label}</span>
      {children}
    </label>
  );
}
