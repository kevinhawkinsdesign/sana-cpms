'use client';

/** Platform · Vehicles with Debt (KAB-162 + KAB-174): cross-org list of
 *  vehicles carrying an outstanding balance, with the debt actions —
 *  set / add / collect / clear / history. Platform-admin only. */
import React from 'react';
import { useParams } from 'next/navigation';
import { Btn, PageHead, SummaryStrip, rowNav, useConsoleNav } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ListCard } from '@/components/console/ListCard';
import { DebtActionModal, type DebtAction } from '@/components/console/fleet/DebtActionModal';
import { DebtLogsModal } from '@/components/console/fleet/DebtLogsModal';
import { VehiclePickerModal } from '@/components/console/fleet/VehiclePickerModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import { useVehiclesWithDebt, useClearDebt, type VehicleWithDebt, type IndividualVehicle } from '@/lib/console/fleet';

const PAGE_SIZE = 12;

function primaryPlate(v: VehicleWithDebt): string {
  return v.licensePlates?.[0] ?? '—';
}

function vehicleLabel(v: VehicleWithDebt): string {
  return `${v.make} ${v.model} · ${primaryPlate(v)}`;
}

// Map a picked individual vehicle to the shape the debt modals expect.
function toDebtVehicle(v: IndividualVehicle): VehicleWithDebt {
  const plate = (v.licensePlates ?? v.vehicleLicensePlates ?? [])[0]?.licencePlateNumber;
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    debtBalance: v.debtBalance ?? 0,
    debtNote: v.debtNote ?? null,
    licensePlates: plate ? [plate] : [],
  };
}

export default function ConsoleAdminVehiclesWithDebtPage() {
  const params = useParams<{ country: string }>();
  const base = `/${params.country}/console`;
  const navigate = useConsoleNav();
  const { data, isPending, isError, refetch } = useVehiclesWithDebt();
  const { page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState();
  const clearDebt = useClearDebt();
  const [modal, setModal] = React.useState<{ kind: DebtAction | 'logs' | 'clear'; vehicle: VehicleWithDebt } | null>(null);
  const [picking, setPicking] = React.useState(false);

  const filtered = React.useMemo(() => {
    const all = data?.vehicles ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((v) =>
      [v.make, v.model, primaryPlate(v), v.debtNote].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [data, search]);

  const { totalPages, page: safePage, pageItems } = paginate(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHead
        title="Vehicles with Debt"
        sub="Outstanding balances across all organizations"
        actions={<Btn variant="primary" onClick={() => setPicking(true)}>Set debt on a vehicle</Btn>}
      />

      <SummaryStrip
        items={[
          { label: 'Total outstanding', value: `${fmtNumber(data?.totalDebt ?? 0)} RWF`, deltaKind: (data?.totalDebt ?? 0) > 0 ? 'err' : 'neutral' },
          { label: 'Vehicles', value: fmtNumber(data?.count ?? 0) },
        ]}
      />

      <ListCard
        title="Vehicles with debt"
        totalLabel={`${filtered.length} total`}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={submitSearch}
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        onPageChange={gotoPage}
        isPending={isPending}
        isError={isError}
        isEmpty={pageItems.length === 0}
        emptyMessage={search ? `No vehicles match "${search}".` : 'No outstanding debt.'}
        errorMessage="Couldn't load vehicles with debt."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate</th>
              <th className="num">Debt</th>
              <th>Note</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((v) => (
              <tr key={v.id} {...rowNav(() => navigate(`${base}/admin/vehicles/${v.id}`))}>
                <td className="font-medium text-gray-800 dark:text-white/90">{v.make} {v.model}</td>
                <td className="mono">{primaryPlate(v)}</td>
                <td className="num mono text-[#c0392b] dark:text-[#f0998a]">{fmtNumber(v.debtBalance)} RWF</td>
                <td className="text-gray-500 dark:text-gray-400">{v.debtNote || '—'}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'collect', vehicle: v })}>Collect</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'add', vehicle: v })}>Add</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'set', vehicle: v })}>Set</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'clear', vehicle: v })}>Clear</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'logs', vehicle: v })}>History</Btn>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {modal && (modal.kind === 'set' || modal.kind === 'add' || modal.kind === 'collect') && (
        <DebtActionModal
          action={modal.kind}
          vehicleId={modal.vehicle.id}
          vehicleLabel={vehicleLabel(modal.vehicle)}
          debtBalance={modal.vehicle.debtBalance}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'logs' && (
        <DebtLogsModal vehicleId={modal.vehicle.id} vehicleLabel={vehicleLabel(modal.vehicle)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'clear' && (
        <ConfirmDialog
          title="Clear debt?"
          body={
            <>
              Clears the full <strong>{fmtNumber(modal.vehicle.debtBalance)} RWF</strong> balance on{' '}
              <strong>{vehicleLabel(modal.vehicle)}</strong> without collecting it. This is logged in the debt history.
            </>
          }
          confirmLabel="Clear debt"
          pending={clearDebt.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() => clearDebt.mutate(modal.vehicle.id, { onSettled: () => setModal(null) })}
        />
      )}
      {picking && (
        <VehiclePickerModal
          title="Set debt on a vehicle"
          onClose={() => setPicking(false)}
          onSelect={(v) => {
            setPicking(false);
            setModal({ kind: 'set', vehicle: toDebtVehicle(v) });
          }}
        />
      )}
    </div>
  );
}
