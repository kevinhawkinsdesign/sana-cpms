'use client';

/** Add or edit a free-charging allowance on an individual vehicle (dashboard
 *  parity): sessions and/or kWh cap, reset period, and charger scope. */
import React from 'react';
import { Select } from '@/components/console/ui';
import { Field, FormModal, TextField } from '@/components/console/fleet/shared';
import { inputStyle } from '@/components/console/form';
import {
  useAddAllowance,
  useUpdateAllowance,
  useAddBusinessAllowance,
  useUpdateBusinessAllowance,
  useChargers,
} from '@/lib/console/fleet';
import { localDateToISO } from '@/lib/date';

const PERIODS = ['None', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as const;
type PeriodChoice = (typeof PERIODS)[number];
type Scope = 'All chargers' | 'Specific chargers';

/** Just the fields the form reads/prefills — structurally satisfied by both the
 *  individual and business FreeChargingAllowance shapes. */
export interface EditableAllowance {
  id: string;
  isUnlimited: boolean;
  remainingCount?: number | null;
  freeKwhLimit?: number | null;
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null;
  customDays?: number | null;
  validFrom: string;
  validUntil?: string | null;
  allowedChargerIds?: string[] | null;
  chargerAllowances?: { chargerId: string }[];
  isActive?: boolean;
}

function initialChargerIds(a?: EditableAllowance): string[] {
  if (!a) return [];
  if (a.allowedChargerIds?.length) return a.allowedChargerIds;
  return (a.chargerAllowances ?? []).map((c) => c.chargerId).filter(Boolean);
}

/** Specific → the chosen ids. All chargers → omit on add, but send null when
 *  editing so an existing specific scope is explicitly cleared back to all. */
function scopeChargers(scope: Scope, editing: boolean, chargerIds: string[]): string[] | null | undefined {
  if (scope === 'Specific chargers') return chargerIds;
  return editing ? null : undefined;
}

interface AllowanceForm {
  isUnlimited: boolean;
  count: string;
  kwhLimit: string;
  period: PeriodChoice;
  customDays: string;
  scope: Scope;
  chargerIds: string[];
  validFrom: string;
}

interface AllowanceValidation {
  countValue?: number;
  kwhValue?: number;
  customDaysValue?: number;
  canSubmit: boolean;
  showError: boolean;
  errorMessage: string;
}

function validateAllowance(f: AllowanceForm): AllowanceValidation {
  const countValue = f.count.trim() === '' ? undefined : Number(f.count);
  const kwhValue = f.kwhLimit.trim() === '' ? undefined : Number(f.kwhLimit);
  const customDaysValue = f.customDays.trim() === '' ? undefined : Number(f.customDays);

  const countInvalid = countValue != null && (!Number.isInteger(countValue) || countValue < 1);
  const kwhInvalid = kwhValue != null && (Number.isNaN(kwhValue) || kwhValue <= 0);
  const customInvalid =
    f.period === 'CUSTOM' && (customDaysValue == null || !Number.isInteger(customDaysValue) || customDaysValue < 1);
  const specificInvalid = f.scope === 'Specific chargers' && f.chargerIds.length === 0;

  const canSubmit =
    f.validFrom.trim() !== '' &&
    !countInvalid &&
    !kwhInvalid &&
    !customInvalid &&
    !specificInvalid &&
    (f.isUnlimited || countValue != null || kwhValue != null);

  const showError = countInvalid || kwhInvalid || customInvalid || specificInvalid;
  const errorMessage = specificInvalid
    ? 'Select at least one charger.'
    : 'Counts, limits and custom days must be positive numbers.';

  return { countValue, kwhValue, customDaysValue, canSubmit, showError, errorMessage };
}

/** Searchable checkbox list of chargers for the "Specific chargers" scope. */
function ChargerPicker({
  chargers,
  selected,
  onToggle,
  search,
  onSearch,
}: Readonly<{
  chargers: { id: string; name?: string | null }[];
  selected: string[];
  onToggle: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
}>) {
  const q = search.trim().toLowerCase();
  const filtered = q ? chargers.filter((c) => c.name?.toLowerCase().includes(q)) : chargers;
  return (
    <div>
      <input
        style={{ ...inputStyle, marginBottom: 8 }}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search chargers…"
      />
      <div className="max-h-44 overflow-y-auto rounded-md border" style={{ borderColor: 'var(--border)' }}>
        {filtered.length === 0 ? (
          <p className="p-3 text-xs" style={{ color: 'var(--text3)' }}>No chargers match.</p>
        ) : (
          filtered.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => onToggle(c.id)} />
              <span style={{ color: 'var(--text1)' }}>{c.name || c.id}</span>
            </label>
          ))
        )}
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text3)' }}>{selected.length} selected</p>
    </div>
  );
}

export function AllowanceModal({
  vehicleId,
  vehicleLabel,
  allowance,
  businessId,
  onClose,
}: Readonly<{ vehicleId: string; vehicleLabel: string; allowance?: EditableAllowance; businessId?: string; onClose: () => void }>) {
  // Business-fleet vehicles use the /businesses/:id/vehicles/:vid endpoints; a
  // plain individual vehicle uses the /individuals/:id ones.
  const addInd = useAddAllowance();
  const updateInd = useUpdateAllowance();
  const addBiz = useAddBusinessAllowance();
  const updateBiz = useUpdateBusinessAllowance();
  const { data: chargers } = useChargers();
  const editing = !!allowance;
  const pending = addInd.isPending || updateInd.isPending || addBiz.isPending || updateBiz.isPending;

  const [unlimited, setUnlimited] = React.useState(allowance?.isUnlimited ? 'Yes' : 'No');
  const [count, setCount] = React.useState(allowance?.remainingCount != null ? String(allowance.remainingCount) : '');
  const [kwhLimit, setKwhLimit] = React.useState(allowance?.freeKwhLimit != null ? String(allowance.freeKwhLimit) : '');
  const [period, setPeriod] = React.useState<PeriodChoice>((allowance?.periodType as PeriodChoice) ?? 'None');
  const [customDays, setCustomDays] = React.useState(allowance?.customDays != null ? String(allowance.customDays) : '');
  const [validFrom, setValidFrom] = React.useState(() => (allowance?.validFrom ?? new Date().toISOString()).slice(0, 10));
  const [validUntil, setValidUntil] = React.useState(allowance?.validUntil ? allowance.validUntil.slice(0, 10) : '');
  const [scope, setScope] = React.useState<Scope>(
    initialChargerIds(allowance).length ? 'Specific chargers' : 'All chargers',
  );
  const [chargerIds, setChargerIds] = React.useState<string[]>(initialChargerIds(allowance));
  const [chargerSearch, setChargerSearch] = React.useState('');

  const isUnlimited = unlimited === 'Yes';
  const v = validateAllowance({ isUnlimited, count, kwhLimit, period, customDays, scope, chargerIds, validFrom });

  const toggleCharger = (id: string) =>
    setChargerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    const data = {
      isUnlimited,
      remainingCount: isUnlimited ? undefined : v.countValue,
      freeKwhLimit: v.kwhValue,
      periodType: period === 'None' ? undefined : period,
      customDays: period === 'CUSTOM' ? v.customDaysValue : undefined,
      chargers: scopeChargers(scope, editing, chargerIds),
      validFrom: localDateToISO(validFrom),
      validUntil: validUntil ? localDateToISO(validUntil, true) : undefined,
    };
    const opts = { onSuccess: () => onClose() };
    const allowanceId = allowance?.id;
    if (businessId) {
      if (allowanceId) updateBiz.mutate({ businessId, vehicleId, allowanceId, data }, opts);
      else addBiz.mutate({ businessId, vehicleId, data }, opts);
    } else if (allowanceId) {
      updateInd.mutate({ vehicleId, allowanceId, data }, opts);
    } else {
      addInd.mutate({ vehicleId, data }, opts);
    }
  };

  return (
    <FormModal
      title={editing ? 'Edit free-charging allowance' : 'Add free-charging allowance'}
      sub={vehicleLabel}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={v.canSubmit}
      pending={pending}
      submitLabel={editing ? 'Save changes' : 'Add allowance'}
      width={460}
    >
      <Field label="Unlimited sessions">
        <Select options={['No', 'Yes']} value={unlimited} onChange={setUnlimited} style={{ width: '100%' }} />
      </Field>
      {!isUnlimited && (
        <TextField id="a-count" label="Number of free sessions" value={count} onChange={setCount} type="number" placeholder="e.g. 5" />
      )}
      <TextField id="a-kwh" label="Free kWh limit (per period)" value={kwhLimit} onChange={setKwhLimit} type="number" placeholder="Optional" />
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Reset period" flex>
          <Select options={[...PERIODS]} value={period} onChange={(val) => setPeriod(val as PeriodChoice)} style={{ width: '100%' }} />
        </Field>
        {period === 'CUSTOM' && (
          <TextField id="a-days" label="Custom days" value={customDays} onChange={setCustomDays} type="number" placeholder="e.g. 14" flex />
        )}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="a-from" label="Valid from" value={validFrom} onChange={setValidFrom} type="date" flex />
        <TextField id="a-until" label="Valid until" value={validUntil} onChange={setValidUntil} type="date" flex />
      </div>
      <Field label="Applies to chargers">
        <Select
          options={['All chargers', 'Specific chargers']}
          value={scope}
          onChange={(val) => setScope(val as Scope)}
          style={{ width: '100%' }}
        />
      </Field>
      {scope === 'Specific chargers' && (
        <ChargerPicker
          chargers={chargers ?? []}
          selected={chargerIds}
          onToggle={toggleCharger}
          search={chargerSearch}
          onSearch={setChargerSearch}
        />
      )}
      {v.showError && <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>{v.errorMessage}</p>}
    </FormModal>
  );
}
