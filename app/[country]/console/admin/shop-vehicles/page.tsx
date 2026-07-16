'use client';

/** Platform · Shop Vehicles (KAB-162 + KAB-175): marketplace vehicle catalog
 *  across all shops, from /api/admin/shop/vehicles, with create / edit /
 *  deactivate. Platform-admin only. Search + pagination are client-side. */
import React from 'react';
import { Badge, Btn, PageHead, SummaryStrip } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ListCard } from '@/components/console/ListCard';
import { ShopVehicleFormModal } from '@/components/console/fleet/ShopVehicleFormModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import { useShopVehicles, useDeactivateShopVehicle, type IShopVehicle } from '@/lib/console/fleet';

const PAGE_SIZE = 12;

function fmtTitle(s: string): string {
  return s.toLowerCase().replaceAll('_', ' ');
}

function price(v: IShopVehicle): string {
  return `${fmtNumber(v.price)} ${v.currency || ''}`.trim();
}

type ShopModal =
  | { kind: 'create' }
  | { kind: 'edit'; vehicle: IShopVehicle }
  | { kind: 'deactivate'; vehicle: IShopVehicle };

export default function ConsoleAdminShopVehiclesPage() {
  const { data, isPending, isError, refetch } = useShopVehicles();
  const { page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState();
  const deactivate = useDeactivateShopVehicle();
  const [modal, setModal] = React.useState<ShopModal | null>(null);

  const filtered = React.useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((v) =>
      [v.make, v.model, v.classification, v.category].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [data, search]);

  const { totalPages, page: safePage, pageItems } = paginate(filtered, page, PAGE_SIZE);
  const passenger = (data ?? []).filter((v) => v.category === 'PASSENGER').length;
  const commercial = (data ?? []).filter((v) => v.category === 'COMMERCIAL').length;

  return (
    <div className="space-y-6">
      <PageHead
        title="Shop Vehicles"
        sub="Marketplace vehicle catalog"
        actions={
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setModal({ kind: 'create' })}>
            New shop vehicle
          </Btn>
        }
      />

      <SummaryStrip
        items={[
          { label: 'Total models', value: fmtNumber(data?.length ?? 0) },
          { label: 'Passenger', value: fmtNumber(passenger) },
          { label: 'Commercial', value: fmtNumber(commercial) },
        ]}
      />

      <ListCard
        title="Shop vehicles"
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
        emptyMessage={search ? `No vehicles match "${search}".` : 'No shop vehicles yet.'}
        errorMessage="Couldn't load shop vehicles."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Category</th>
              <th>Classification</th>
              <th className="num">Range</th>
              <th className="num">Price</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((v) => (
              <tr key={v.id}>
                <td className="font-medium text-gray-800 dark:text-white/90">{v.make} {v.model} <span className="text-[var(--text3)]">{v.year}</span></td>
                <td className="capitalize text-gray-500 dark:text-gray-400">{fmtTitle(v.category)}</td>
                <td className="capitalize text-gray-500 dark:text-gray-400">{fmtTitle(v.classification)}</td>
                <td className="num mono">{v.range ? `${fmtNumber(v.range)} km` : '—'}</td>
                <td className="num mono">{price(v)}</td>
                <td>{v.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'edit', vehicle: v })}>Edit</Btn>
                    {v.isActive && (
                      <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'deactivate', vehicle: v })}>Deactivate</Btn>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {modal?.kind === 'create' && (
        <ShopVehicleFormModal mode="create" defaultShopId={data?.[0]?.shopId} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && (
        <ShopVehicleFormModal mode="edit" vehicle={modal.vehicle} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate shop vehicle?"
          body={<>Removes <strong>{modal.vehicle.make} {modal.vehicle.model} {modal.vehicle.year}</strong> from the customer shop.</>}
          confirmLabel="Deactivate"
          pending={deactivate.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() => deactivate.mutate(modal.vehicle.id, { onSettled: () => setModal(null) })}
        />
      )}
    </div>
  );
}
