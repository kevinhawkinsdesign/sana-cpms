'use client';

/** Searchable picker over all individual vehicles. Used to put an arbitrary
 *  vehicle into debt from the Vehicles-with-Debt page (dashboard parity). */
import React from 'react';
import { ModalShell } from '@/components/console/ModalShell';
import { Btn } from '@/components/console/ui';
import { inputStyle } from '@/components/console/form';
import { fmtNumber } from '@/lib/console/dashboard';
import { useIndividualVehicles, type IndividualVehicle } from '@/lib/console/fleet';

function primaryPlate(v: IndividualVehicle): string {
  const plate = (v.licensePlates ?? v.vehicleLicensePlates ?? [])[0];
  return plate?.licencePlateNumber ?? '—';
}

export function VehiclePickerModal({
  title,
  onSelect,
  onClose,
}: Readonly<{
  title: string;
  onSelect: (v: IndividualVehicle) => void;
  onClose: () => void;
}>) {
  const { data, isPending, isError } = useIndividualVehicles();
  const [q, setQ] = React.useState('');

  const filtered = React.useMemo(() => {
    const all = data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((v) =>
      [v.make, v.model, primaryPlate(v)].filter(Boolean).some((x) => String(x).toLowerCase().includes(s)),
    );
  }, [data, q]);

  return (
    <ModalShell onClose={onClose} width={480}>
      <div className="px-5 pt-[18px] pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text1)' }}>{title}</h3>
        <input
          autoFocus
          style={{ ...inputStyle, marginTop: 12 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search make, model or plate…"
        />
      </div>
      <div className="overflow-y-auto p-2">
        {isPending && <p className="p-4 text-sm" style={{ color: 'var(--text3)' }}>Loading vehicles…</p>}
        {isError && <p className="p-4 text-sm text-[#c0392b]">Couldn&apos;t load vehicles.</p>}
        {!isPending && !isError && filtered.length === 0 && (
          <p className="p-4 text-sm" style={{ color: 'var(--text3)' }}>No vehicles match &quot;{q}&quot;.</p>
        )}
        {filtered.slice(0, 50).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="min-w-0 truncate">
              <span className="font-semibold" style={{ color: 'var(--text1)' }}>{v.make} {v.model}</span>
              <span className="ml-2 font-mono" style={{ color: 'var(--text3)' }}>{primaryPlate(v)}</span>
            </span>
            {(v.debtBalance ?? 0) > 0 && (
              <span className="shrink-0 font-mono text-xs text-[#c0392b]">{fmtNumber(v.debtBalance ?? 0)} RWF</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </ModalShell>
  );
}
