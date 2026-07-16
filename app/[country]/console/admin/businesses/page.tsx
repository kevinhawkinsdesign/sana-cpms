'use client';

/** Platform · Businesses (KAB-162): cross-org B2B directory, from
 *  /api/admin/businesses. Platform-admin only (Fleet nav group + RouteGuard).
 *  Row click → business detail. Search + pagination are client-side. */
import React from 'react';
import { useParams } from 'next/navigation';
import { Badge, Btn, PageHead, SummaryStrip, rowNav, useConsoleNav } from '@/components/console/ui';
import { ListCard } from '@/components/console/ListCard';
import { BusinessFormModal } from '@/components/console/fleet/BusinessFormModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import { useBusinesses, type Business } from '@/lib/console/fleet';

const PAGE_SIZE = 12;

function vehicleCount(b: Business): number {
  return b._count?.vehicleOwnerships ?? b.vehicleOwnerships?.length ?? 0;
}

export default function ConsoleAdminBusinessesPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data, isPending, isError, refetch } = useBusinesses();
  const { page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState();
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((b) => [b.name, b.tin].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)));
  }, [data, search]);

  const { totalPages, page: safePage, pageItems } = paginate(filtered, page, PAGE_SIZE);
  const base = `/${params.country}/console`;

  return (
    <div className="space-y-6">
      <PageHead
        title="Businesses"
        sub="B2B businesses across all organizations"
        actions={
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>
            New business
          </Btn>
        }
      />

      <SummaryStrip
        items={[
          { label: 'Total businesses', value: fmtNumber(data?.length ?? 0) },
          { label: 'Active', value: fmtNumber((data ?? []).filter((b) => b.isActive).length) },
        ]}
      />

      <ListCard
        title="Businesses"
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
        emptyMessage={search ? `No businesses match "${search}".` : 'No businesses yet.'}
        errorMessage="Couldn't load businesses."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>TIN</th>
              <th className="num">Vehicles</th>
              <th className="num">Members</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((b) => (
              <tr key={b.id} {...rowNav(() => navigate(`${base}/admin/businesses/${b.id}`))}>
                <td className="font-medium text-gray-800 dark:text-white/90">{b.name}</td>
                <td className="mono text-gray-500 dark:text-gray-400">{b.tin || '—'}</td>
                <td className="num mono">{fmtNumber(vehicleCount(b))}</td>
                <td className="num mono">{fmtNumber(b.businessUsers?.length ?? 0)}</td>
                <td>{b.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {creating && <BusinessFormModal mode="create" onClose={() => setCreating(false)} />}
    </div>
  );
}
