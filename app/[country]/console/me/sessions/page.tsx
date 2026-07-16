'use client';

/** Console operator "My Sessions" (operator self-service): every charging
 *  session the operator started — active and ended — as a console-styled,
 *  server-paginated table. Gated on view_sessions (via the nav config /
 *  RouteGuard). Row click opens the shared session details modal. */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Btn, PageHead, TableCard, Tabs, rowNav } from '@/components/console/ui';
import { fmtElapsed, fmtNumber } from '@/lib/console/dashboard';
import { OperatorSessionModal } from '@/components/console/sessions/OperatorSessionModal';
import { getOperatorSessionsPaginated, type Session } from '@/lib/api/chargingSessions';

const TABS: Array<{ id: string; label: string; status?: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Live', status: 'STARTED' },
  { id: 'completed', label: 'Completed', status: 'COMPLETED' },
  { id: 'cancelled', label: 'Cancelled', status: 'CANCELLED' },
];

const LIVE_STATUSES = new Set(['STARTED', 'PAUSED']);
const isLive = (s: Session['sessionStatus']) => LIVE_STATUSES.has(s);

function statusBadge(s: Session): { kind: 'ok' | 'warn' | 'err' | 'info' | 'charge' | 'neutral'; label: string } {
  switch (s.sessionStatus) {
    case 'STARTED': return { kind: 'charge', label: 'Charging' };
    case 'PAUSED': return { kind: 'warn', label: 'Paused' };
    case 'PAID': return { kind: 'ok', label: 'Paid' };
    case 'EBM_ISSUED': return { kind: 'ok', label: 'Receipt issued' };
    case 'CANCELLED': return { kind: 'neutral', label: 'Cancelled' };
    case 'REFUNDED': return { kind: 'neutral', label: 'Refunded' };
    case 'COMPLETED': return { kind: 'info', label: 'Completed' };
    default: return { kind: 'neutral', label: s.sessionStatus };
  }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start: string, end: string | null, live: boolean): string {
  if (!end && !live) return '—';
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((to - new Date(start).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export default function ConsoleMySessionsPage() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Session | null>(null);

  const status = TABS.find((t) => t.id === tab)?.status;

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['operatorMySessions', { page, status, search }],
    queryFn: () => getOperatorSessionsPaginated({ page, limit: 10, status, search: search || undefined }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const sessions = data?.sessions ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHead title="My Sessions" sub="Every session you started — active and ended" />

      <TableCard
        title="Sessions"
        totalLabel={pagination ? `${pagination.total} total` : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => { setPage(1); setSearch(searchInput.trim()); }}
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        totalItems={pagination?.total}
        onPageChange={setPage}
        action={isFetching ? <Badge kind="info" dot pulse>updating</Badge> : undefined}
      >
        <div className="border-b border-gray-200 px-4 dark:border-gray-800">
          <Tabs
            tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
            value={tab}
            onChange={(id) => { setTab(id); setPage(1); }}
            style={{ borderBottom: 'none' }}
          />
        </div>

        {(() => {
          if (isPending) {
            return (
              <div className="flex flex-col gap-2 p-3.5">
                {Array.from({ length: 8 }, (_, i) => <span key={i} className="kc-skeleton h-9 rounded-md" />)}
              </div>
            );
          }
          if (isError) {
            return (
              <div className="p-7 text-center text-sm text-gray-400">
                Couldn&apos;t load your sessions.
                <div className="mt-2.5"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
              </div>
            );
          }
          if (sessions.length === 0) {
            return (
              <div className="p-7 text-center text-sm text-gray-400">
                {search ? `No sessions match "${search}".` : 'No sessions in this view yet.'}
              </div>
            );
          }
          return (
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Charger</th>
                  <th>Started</th>
                  <th className="num">Duration</th>
                  <th className="num">kWh</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = statusBadge(s);
                  const live = isLive(s.sessionStatus);
                  return (
                    <tr key={s.id} {...rowNav(() => setSelected(s))}>
                      <td><span className="mono text-gray-800 dark:text-white/90">{s.sessionId}</span></td>
                      <td>
                        {s.charger?.name ?? '—'}
                        {s.gun?.name ? <span className="text-gray-400"> · {s.gun.name}</span> : null}
                      </td>
                      <td className="text-gray-500 dark:text-gray-400">
                        {live ? `${fmtElapsed(s.startTime)} ago` : fmtTime(s.startTime)}
                      </td>
                      <td className="num mono">{fmtDuration(s.startTime, s.endTime, live)}</td>
                      <td className="num mono">{s.chargedKwh != null ? s.chargedKwh.toFixed(1) : '—'}</td>
                      <td className="num mono">{s.totalAmount != null ? fmtNumber(s.totalAmount) : '—'}</td>
                      <td>
                        <Badge kind={st.kind} dot={live} pulse={live}>{st.label}</Badge>
                        {s.sessionStatus === 'COMPLETED' && !s.isPaid ? <Badge kind="err">unpaid</Badge> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </TableCard>

      {selected && (
        <OperatorSessionModal
          open={!!selected}
          session={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
