'use client';

/** Console Operators (FE-2 / KAB-140): org operator directory — filterable,
 *  searchable, paginated. View state (status / search / page) lives in the URL. */
import React from 'react';
import { useParams } from 'next/navigation';
import { Avatar, Badge, Btn, PageHead, Select, TableCard, rowNav, useConsoleNav } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { fmtNumber } from '@/lib/console/dashboard';
import { useUrlState } from '@/lib/console/useUrlState';
import { useOrgOperators, type OperatorsListParams } from '@/lib/console/operators';

const STATUS_LABELS: Record<string, OperatorsListParams['status']> = {
  Active: 'active',
  Inactive: 'inactive',
  All: 'all',
};
const STATUS_FROM_VALUE: Record<string, string> = { active: 'Active', inactive: 'Inactive', all: 'All' };

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ConsoleOperatorsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const { get, set, setMany } = useUrlState({ status: 'active', page: '1', q: '' });
  const status = get('status') as OperatorsListParams['status'];
  const page = Math.max(1, Number(get('page')) || 1);
  const search = get('q');
  const [searchInput, setSearchInput] = React.useState(search);

  const { data, isPending, isError, refetch } = useOrgOperators(orgId, {
    page,
    status,
    search: search || undefined,
  });

  const base = `/${params.country}/console`;
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <div className="space-y-6">
      <PageHead title="Operators" sub="Your team — profiles, shifts and performance" />

      <TableCard
        title="Operators"
        totalLabel={pagination ? `${pagination.total} total` : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setMany({ q: searchInput.trim(), page: '1' })}
        action={
          <Select
            options={['Active', 'Inactive', 'All']}
            value={STATUS_FROM_VALUE[status] ?? 'Active'}
            onChange={(label) => setMany({ status: STATUS_LABELS[label], page: '1' })}
            style={{ width: 140 }}
          />
        }
        page={pagination?.page}
        totalPages={totalPages}
        totalItems={pagination?.total}
        onPageChange={(p) => set('page', String(p))}
      >
        {(() => {
          if (isPending) return (
            <div className="flex flex-col gap-2 p-5">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="kc-skeleton h-9 rounded-md" />
              ))}
            </div>
          );
          if (isError) return (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Couldn&apos;t load operators.
              <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
            </div>
          );
          if (data && data.operators.length === 0) return (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {search ? `No operators match "${search}".` : 'No operators yet.'}
            </div>
          );
          return (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Contact</th>
                <th>Status</th>
                <th className="num">Shifts</th>
                <th className="num">Reports</th>
                <th className="num">Energy</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {data?.operators.map((o) => (
                <tr key={o.id} {...rowNav(() => navigate(`${base}/operators/${o.id}`))}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={o.name} />
                      <span className="flex flex-col">
                        <span className="font-medium text-gray-800 dark:text-white/90">{o.name}</span>
                        {o.isTrainee && <span className="text-xs text-[var(--text3)]">Trainee</span>}
                      </span>
                    </span>
                  </td>
                  <td className="text-gray-500 dark:text-gray-400">{o.email || o.phone || '—'}</td>
                  <td>
                    {o.status === 'active'
                      ? <Badge kind="ok">active</Badge>
                      : <Badge kind="neutral">inactive</Badge>}
                  </td>
                  <td className="num mono">{fmtNumber(o.totalShifts)}</td>
                  <td className="num mono">{fmtNumber(o.totalReports)}</td>
                  <td className="num mono">{fmtNumber(o.totalKwh)} <small>kWh</small></td>
                  <td className="text-gray-500 dark:text-gray-400">{fmtDate(o.lastReportAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          );
        })()}
      </TableCard>
    </div>
  );
}
