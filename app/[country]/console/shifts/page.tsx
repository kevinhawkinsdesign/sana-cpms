'use client';

/** Console Shift Reports (FE-9 / KAB-114; revamped FE-4 / KAB-142): operator
 *  shift reports — KPIs, status tabs, advanced filters (operator / lateness /
 *  review / date range), inline approve+flag, CSV export. All view state lives
 *  in the URL. Review actions gated on manage_shifts. */
import React from 'react';
import { useParams } from 'next/navigation';
import { Badge, Btn, PageHead, Select, Stat, TableCard, Tabs, rowNav, useConsoleNav } from '@/components/console/ui';
import { useOrgs, hasPerm } from '@/lib/console/orgs';
import { fmtCompact, fmtNumber } from '@/lib/console/dashboard';
import { useUrlState } from '@/lib/console/useUrlState';
import { useAllOrgOperators } from '@/lib/console/operators';
import {
  fmtDuration, operatorName, useOrgShifts, useApproveShift, useFlagShift, exportOrgShifts,
  type ShiftsListParams, type ShiftReportRow,
} from '@/lib/console/shifts';

const TABS: Array<{ id: ShiftsListParams['status']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'On shift' },
  { id: 'completed', label: 'Completed' },
];

const LATENESS_LABELS: Record<string, NonNullable<ShiftsListParams['lateness']>> = {
  'All lateness': 'all', 'On time': 'onTime', Late: 'late', Early: 'early',
};
const REVIEW_LABELS: Record<string, NonNullable<ShiftsListParams['review']>> = {
  'All reviews': 'all', Approved: 'approved', Flagged: 'flagged', Pending: 'pending', 'Flagged → approved': 'flaggedThenApproved',
};
const labelFor = (map: Record<string, string>, value: string, fallback: string) =>
  Object.keys(map).find((k) => map[k] === value) ?? fallback;

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Row review badge (early-returns — no nested ternary). */
function reviewBadge(r: ShiftReportRow) {
  if (!r.checkOutTime) return <Badge kind="charge" dot pulse>on shift</Badge>;
  if (r.isFlagged) return <Badge kind="err">flagged</Badge>;
  if (r.isApproved) return <Badge kind="ok">approved</Badge>;
  return <Badge kind="neutral">pending</Badge>;
}

export default function ConsoleShiftsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_shifts');

  const { get, set, setMany } = useUrlState({
    status: 'all', page: '1', q: '', op: '', late: 'all', rev: 'all', from: '', to: '',
  });
  const listParams: ShiftsListParams = {
    page: Math.max(1, Number(get('page')) || 1),
    status: get('status') as ShiftsListParams['status'],
    search: get('q') || undefined,
    operatorId: get('op') || undefined,
    lateness: get('late') as ShiftsListParams['lateness'],
    review: get('rev') as ShiftsListParams['review'],
    startDate: get('from') || undefined,
    endDate: get('to') || undefined,
  };
  const [searchInput, setSearchInput] = React.useState(listParams.search ?? '');

  const { data, isPending, isError, refetch } = useOrgShifts(orgId, listParams);
  const operatorsQ = useAllOrgOperators(orgId, { status: 'all' });
  const operators = operatorsQ.operators;
  const approve = useApproveShift(orgId);
  const flag = useFlagShift(orgId);

  const base = `/${params.country}/console`;
  const totals = data?.totals;
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  const operatorLabel = (id: string) => operators.find((o) => o.id === id)?.name ?? 'All operators';

  function onApprove(r: ShiftReportRow) {
    const reason = window.prompt('Approve this shift report — reason (optional):', '') ?? '';
    approve.mutate({ shiftId: r.id, approved: !r.isApproved, reason });
  }
  function onFlag(r: ShiftReportRow) {
    const reason = window.prompt('Flag this shift report — reason:', '');
    if (reason === null) return;
    flag.mutate({ shiftId: r.id, flagged: !r.isFlagged, reason });
  }

  return (
    <div className="space-y-6">
      <PageHead
        title="Shift Reports"
        sub="Operator shifts and reconciliation"
        actions={
          orgId ? (
            <Btn size="sm" icon="download" onClick={() => exportOrgShifts(orgId, listParams)}>
              Export CSV
            </Btn>
          ) : undefined
        }
      />

      <div className="kc-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <Stat label="Shifts" value={totals ? fmtNumber(totals.count) : '—'} />
        <Stat label="On shift now" value={totals?.activeCount ?? '—'} sub={totals?.activeCount ? 'live' : undefined} />
        <Stat label="Energy sold" value={<>{totals ? fmtNumber(totals.kwhSum) : '—'} <small>kWh</small></>} />
        <Stat label="Collected" value={<>{totals ? fmtCompact(totals.rwfSum) : '—'} <small>RWF</small></>} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={['All operators', ...operators.map((o) => o.name)]}
          value={listParams.operatorId ? operatorLabel(listParams.operatorId) : 'All operators'}
          onChange={(name) => setMany({ op: name === 'All operators' ? null : (operators.find((o) => o.name === name)?.id ?? null), page: '1' })}
          style={{ width: 180 }}
        />
        <Select
          options={Object.keys(LATENESS_LABELS)}
          value={labelFor(LATENESS_LABELS, listParams.lateness ?? 'all', 'All lateness')}
          onChange={(label) => setMany({ late: LATENESS_LABELS[label], page: '1' })}
          style={{ width: 150 }}
        />
        <Select
          options={Object.keys(REVIEW_LABELS)}
          value={labelFor(REVIEW_LABELS, listParams.review ?? 'all', 'All reviews')}
          onChange={(label) => setMany({ rev: REVIEW_LABELS[label], page: '1' })}
          style={{ width: 180 }}
        />
        <input type="date" value={get('from')} onChange={(e) => setMany({ from: e.target.value || null, page: '1' })} className={DATE_CLS} aria-label="From date" />
        <input type="date" value={get('to')} onChange={(e) => setMany({ to: e.target.value || null, page: '1' })} className={DATE_CLS} aria-label="To date" />
      </div>

      <TableCard
        title="Shift reports"
        totalLabel={pagination ? `${pagination.total} total` : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setMany({ q: searchInput.trim(), page: '1' })}
        page={pagination?.page}
        totalPages={totalPages}
        totalItems={pagination?.total}
        onPageChange={(p) => set('page', String(p))}
      >
        <div className="border-b border-gray-100 px-5 dark:border-white/5 sm:px-6">
          <Tabs
            tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
            value={listParams.status}
            onChange={(id) => setMany({ status: id, page: '1' })}
            style={{ borderBottom: 'none' }}
          />
        </div>

        {(() => {
          if (isPending) return (
            <div className="flex flex-col gap-2 p-5">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="kc-skeleton h-9 rounded-md" />)}
            </div>
          );
          if (isError) return (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Couldn&apos;t load shifts.
              <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
            </div>
          );
          if (data && data.reports.length === 0) return (
            <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No shifts match these filters.</div>
          );
          return (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Charger</th>
                <th>Started</th>
                <th className="num">Duration</th>
                <th className="num">Sessions</th>
                <th className="num">Collected</th>
                <th>Status</th>
                {canManage && <th>Review</th>}
              </tr>
            </thead>
            <tbody>
              {data?.reports.map((r) => (
                <tr key={r.id} {...rowNav(() => navigate(`${base}/shifts/${r.id}`))}>
                  <td>
                    <span className="font-medium text-gray-800 dark:text-white/90">{operatorName(r.operator)}</span>
                  </td>
                  <td>{r.operatorShift?.charger?.name ?? '—'}</td>
                  <td className="text-gray-500 dark:text-gray-400">{fmtDate(r.checkInTime)}</td>
                  <td className="num mono">{fmtDuration(r.shiftDurationMinutes)}</td>
                  <td className="num mono">{r.chargingSessionCount ?? '—'}</td>
                  <td className="num mono">{r.moneyCollectedRwf != null ? fmtNumber(r.moneyCollectedRwf) : '—'}</td>
                  <td>{reviewBadge(r)}</td>
                  {canManage && (
                    <td>
                      <div className="flex gap-1.5">
                        <Btn size="xs" variant={r.isApproved ? 'ghost' : 'primary'} disabled={!r.checkOutTime || approve.isPending} onClick={() => onApprove(r)}>
                          {r.isApproved ? 'Unapprove' : 'Approve'}
                        </Btn>
                        <Btn size="xs" variant={r.isFlagged ? 'ghost' : 'danger'} disabled={!r.checkOutTime || flag.isPending} onClick={() => onFlag(r)}>
                          {r.isFlagged ? 'Unflag' : 'Flag'}
                        </Btn>
                      </div>
                    </td>
                  )}
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

const DATE_CLS =
  'h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-[#08294f] focus:outline-none dark:border-gray-700 dark:text-white/90';
