'use client';

/** Console Stations list (FE-14 / KAB-122) over the SAAS-24 inventory endpoint:
 *  per-charger live rollup (connectors, live kW, revenue today, online). Uptime
 *  % is merged in from the uptime hook (the inventory endpoint omits it). */
import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Btn, PageHead, TableCard, rowNav, useConsoleNav } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { fmtElapsed, fmtNumber, useOrgUptime } from '@/lib/console/dashboard';
import { useOrgStations, type OrgStation } from '@/lib/console/stations';

function statusBadge(s: OrgStation) {
  if (s.online === null) return <Badge kind="neutral">unknown</Badge>;
  if (s.online)
    return (
      <Badge kind="ok" dot>
        online
      </Badge>
    );
  return (
    <Badge kind="err" dot>
      offline
    </Badge>
  );
}

export default function ConsoleStationsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const inventory = useOrgStations(orgId);
  const uptime = useOrgUptime(orgId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [show, setShow] = useState(10);

  const base = `/${params.country}/console`;

  // uptime % per charger from the uptime hook (inventory endpoint omits it)
  const uptimeById = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const c of uptime.data?.uptime.byCharger ?? []) m.set(c.chargerId, c.uptimePercent);
    return m;
  }, [uptime.data]);

  const stations = inventory.data?.stations ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? stations.filter(
          (s) =>
            (s.chargerName ?? '').toLowerCase().includes(q) || (s.address ?? '').toLowerCase().includes(q),
        )
      : stations;
  }, [stations, search]);

  return (
    <div className="space-y-4">
      <PageHead
        title="Stations"
        sub={
          <span className="inline-flex items-center gap-2">
            Chargers, connectors, and live status
            {inventory.data?.degraded ? <Badge kind="warn">live data degraded</Badge> : null}
          </span>
        }
      />

      <TableCard
        title="All chargers"
        totalLabel={`${filtered.length} charger${filtered.length !== 1 ? 's' : ''}`}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        showValue={show}
        onShowChange={(v) => { setShow(v); setPage(1); }}
        page={page}
        totalPages={Math.max(1, Math.ceil(filtered.length / show))}
        totalItems={filtered.length}
        onPageChange={setPage}
      >
        {(() => {
          if (inventory.isPending) return (
            <div className="flex flex-col gap-2 p-3.5">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="kc-skeleton h-9 rounded-md" />
              ))}
            </div>
          );
          if (inventory.isError) return (
            <div className="p-7 text-center text-sm text-gray-400">
              Couldn&apos;t load stations.
              <div className="mt-2.5">
                <Btn size="sm" onClick={() => inventory.refetch()}>
                  Retry
                </Btn>
              </div>
            </div>
          );
          if (filtered.length === 0) return (
            <div className="p-7 text-center text-sm text-gray-400">
              {search ? `No chargers match "${search}".` : 'No chargers in this organization yet.'}
            </div>
          );
          return (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Charger</th>
                <th>Status</th>
                <th className="num">Connectors</th>
                <th className="num">Uptime 30d</th>
                <th className="num">Live kW</th>
                <th className="num">Sessions</th>
                <th className="num">Revenue today</th>
                <th>Last seen</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * show, page * show).map((s) => {
                const up = uptimeById.get(s.chargerId);
                return (
                  <tr key={s.chargerId} {...rowNav(() => navigate(`${base}/stations/${encodeURIComponent(s.chargerId)}`))}>
                    <td>
                      <span className="font-medium text-gray-800 dark:text-white/90">{s.chargerName ?? s.chargerId}</span>
                      {s.address ? (
                        <div className="text-[11.5px] text-gray-400">{s.address}</div>
                      ) : null}
                    </td>
                    <td>
                      {statusBadge(s)}
                      {s.faultedConnectors > 0 ? (
                        <span className="ml-1.5 text-[11px] text-red-500">{s.faultedConnectors} fault{s.faultedConnectors === 1 ? '' : 's'}</span>
                      ) : null}
                    </td>
                    <td className="num mono">{s.connectorCount}</td>
                    <td className="num mono">{up != null ? `${up.toFixed(1)}%` : '—'}</td>
                    <td className="num mono">
                      {s.liveKw != null ? <span className="text-amber-500">{s.liveKw.toFixed(1)}</span> : '—'}
                    </td>
                    <td className="num mono">{s.sessionsToday}</td>
                    <td className="num mono">{fmtNumber(s.revenueToday)}</td>
                    <td className="text-gray-400">{s.lastSeen ? `${fmtElapsed(s.lastSeen)} ago` : '—'}</td>
                    <td className="num">
                      <span className="text-xs font-medium text-[var(--accent)]">View →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          );
        })()}
      </TableCard>
    </div>
  );
}
