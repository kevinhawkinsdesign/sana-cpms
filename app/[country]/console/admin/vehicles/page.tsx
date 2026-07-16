'use client';

/** Platform · Vehicles (KAB-162): cross-org individual-vehicle directory.
 *  Reads the global /api/admin/individuals list; search + pagination are
 *  client-side since the endpoint returns the full set. Platform-admin only
 *  (gated by the Fleet nav group + RouteGuard). */
import React from 'react';
import { Badge, Btn, PageHead, SummaryStrip } from '@/components/console/ui';
import { ListCard } from '@/components/console/ListCard';
import { VehicleFormModal } from '@/components/console/fleet/VehicleFormModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import { useIndividualVehicles, type IndividualVehicle } from '@/lib/console/fleet';

const PAGE_SIZE = 12;

function primaryPlate(v: IndividualVehicle): string {
  const plate = (v.licensePlates ?? v.vehicleLicensePlates ?? [])[0];
  return plate?.licencePlateNumber ?? '—';
}

function ownerName(v: IndividualVehicle): string {
  const owner = v.owner ?? v.vehicleOwnerships?.[0]?.user;
  if (!owner) return '—';
  return [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || owner.phone || '—';
}

export default function ConsoleAdminVehiclesPage() {
  const { data, isPending, isError, refetch } = useIndividualVehicles();
  const { page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState();
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((v) =>
      [v.make, v.model, v.kabisaId, v.vin, primaryPlate(v), ownerName(v)].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [data, search]);

  const { totalPages, page: safePage, pageItems } = paginate(filtered, page, PAGE_SIZE);
  const withDebt = (data ?? []).filter((v) => (v.debtBalance ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <PageHead
        title="Vehicles"
        sub="Individual vehicles across all organizations"
        actions={
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>
            New vehicle
          </Btn>
        }
      />

      <SummaryStrip
        items={[
          { label: 'Total vehicles', value: fmtNumber(data?.length ?? 0) },
          { label: 'With debt', value: fmtNumber(withDebt), deltaKind: withDebt ? 'err' : 'neutral' },
        ]}
      />

      <ListCard
        title="Vehicles"
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
        emptyMessage={search ? `No vehicles match "${search}".` : 'No vehicles yet.'}
        errorMessage="Couldn't load vehicles."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Plate</th>
              <th>Owner</th>
              <th className="num">Battery</th>
              <th className="num">Debt</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-white/90">{v.make} {v.model}</span>
                    <span className="text-xs text-[var(--text3)]">{v.kabisaId}</span>
                  </span>
                </td>
                <td className="mono">{primaryPlate(v)}</td>
                <td className="text-gray-500 dark:text-gray-400">{ownerName(v)}</td>
                <td className="num mono">{v.batteryCapacity ? `${fmtNumber(v.batteryCapacity)} kWh` : '—'}</td>
                <td className="num mono">{(v.debtBalance ?? 0) > 0 ? fmtNumber(v.debtBalance ?? 0) : '—'}</td>
                <td>{v.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {creating && <VehicleFormModal mode="create" onClose={() => setCreating(false)} />}
    </div>
  );
}
