'use client';

/** Platform · Shop Orders (KAB-175 + KAB-178): marketplace purchase requests
 *  from /api/admin/shop/orders. Orders move PENDING → CONFIRMED → COMPLETED, or
 *  CANCELLED from either open state; CANCELLED is confirmed. Platform-admin only. */
import React from 'react';
import { Badge, Btn, PageHead, Select, SummaryStrip } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ListCard } from '@/components/console/ListCard';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import { useShopOrders, useUpdateShopOrderStatus, type ShopOrder } from '@/lib/console/fleet';

const PAGE_SIZE = 12;
type Status = ShopOrder['status'];

const STATUS_OPTIONS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as const;
const STATUS_TO_PARAM: Record<string, Status | ''> = {
  All: '', Pending: 'PENDING', Confirmed: 'CONFIRMED', Completed: 'COMPLETED', Cancelled: 'CANCELLED',
};
const STATUS_FROM_PARAM: Record<string, string> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

function statusBadge(s: Status) {
  const kind = s === 'COMPLETED' ? 'ok' : s === 'CANCELLED' ? 'err' : s === 'CONFIRMED' ? 'info' : 'warn';
  return <Badge kind={kind}>{s.toLowerCase()}</Badge>;
}

function customerName(o: ShopOrder): string {
  return [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || o.phone;
}

export default function ConsoleAdminShopOrdersPage() {
  const { data, isPending, isError, refetch } = useShopOrders();
  const { get, setMany, page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState({ status: '' });
  const status = get('status');
  const statusM = useUpdateShopOrderStatus();
  const [pendingCancel, setPendingCancel] = React.useState<{ id: string; orderId: string } | null>(null);
  // Disable every row's actions while any status change is in flight — a single
  // shared mutation can't reliably tell which row is pending, so guard globally.
  const busy = statusM.isPending;

  const filtered = React.useMemo(() => {
    let all = data ?? [];
    if (status) all = all.filter((o) => o.status === status);
    const q = search.trim().toLowerCase();
    if (q) {
      all = all.filter((o) =>
        [o.orderId, o.make, o.model, customerName(o), o.email, o.phone, o.paymentMethod]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      );
    }
    return all;
  }, [data, search, status]);

  const { totalPages, page: safePage, pageItems } = paginate(filtered, page, PAGE_SIZE);
  const pending = (data ?? []).filter((o) => o.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHead title="Shop Orders" sub="Marketplace purchase requests across all countries" />

      <SummaryStrip
        items={[
          { label: 'Total orders', value: fmtNumber(data?.length ?? 0) },
          { label: 'Pending', value: fmtNumber(pending), deltaKind: pending ? 'info' : 'neutral' },
        ]}
      />

      <ListCard
        title="Orders"
        totalLabel={`${filtered.length} total`}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={submitSearch}
        action={
          <Select
            options={[...STATUS_OPTIONS]}
            value={STATUS_FROM_PARAM[status] ?? 'All'}
            onChange={(label) => setMany({ status: STATUS_TO_PARAM[label] ?? '', page: '1' })}
            style={{ width: 140 }}
          />
        }
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        onPageChange={gotoPage}
        isPending={isPending}
        isError={isError}
        isEmpty={pageItems.length === 0}
        emptyMessage={search || status ? 'No orders match these filters.' : 'No orders yet.'}
        errorMessage="Couldn't load shop orders."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Payment</th>
              <th className="num">Price</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((o) => (
              <tr key={o.id}>
                <td className="mono font-medium text-gray-800 dark:text-white/90">{o.orderId}</td>
                <td>
                  {o.make} {o.model} <span className="text-[var(--text3)]">{o.year}</span>
                  {o.color && <span className="text-xs text-[var(--text3)]"> · {o.color}</span>}
                </td>
                <td className="text-gray-800 dark:text-white/90">
                  {customerName(o)}
                  <span className="block text-xs text-[var(--text3)]">{o.email || o.phone || '—'}</span>
                </td>
                <td className="capitalize text-gray-500 dark:text-gray-400">{o.paymentMethod?.toLowerCase().replaceAll('_', ' ') || '—'}</td>
                <td className="num mono">{fmtNumber(o.price)} {o.currency}</td>
                <td>{statusBadge(o.status)}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    {o.status === 'PENDING' && (
                      <Btn size="xs" variant="ghost" disabled={busy} onClick={() => statusM.mutate({ id: o.id, status: 'CONFIRMED' })}>Confirm</Btn>
                    )}
                    {o.status === 'CONFIRMED' && (
                      <Btn size="xs" variant="ghost" disabled={busy} onClick={() => statusM.mutate({ id: o.id, status: 'COMPLETED' })}>Complete</Btn>
                    )}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                      <Btn size="xs" variant="ghost" disabled={busy} onClick={() => setPendingCancel({ id: o.id, orderId: o.orderId })}>Cancel</Btn>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {pendingCancel && (
        <ConfirmDialog
          title="Cancel order?"
          body={<>Cancel order <b>{pendingCancel.orderId}</b>? This can&apos;t be undone.</>}
          confirmLabel="Cancel order"
          pending={statusM.isPending}
          onCancel={() => setPendingCancel(null)}
          onConfirm={() =>
            statusM.mutate({ id: pendingCancel.id, status: 'CANCELLED' }, { onSettled: () => setPendingCancel(null) })
          }
        />
      )}
    </div>
  );
}
