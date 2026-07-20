'use client';

/** Console Overview (FE-3 / KAB-108): laid out to the Kabisa Console design —
 *  a KPI row over a 3-column dashboard (LEFT: revenue bars + live sessions;
 *  MIDDLE: charger-utilization donut + busiest stations; RIGHT: network health +
 *  recent faults + unpaid sessions). Data is a snapshot "as of load" (no
 *  polling) with a manual Refresh — see lib/console/freshness.ts. */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Btn, Card, CountUp, SummaryStrip, TableCard } from '@/components/console/ui';
import { Bars, Donut, type DonutSegment } from '@/components/console/charts';
import { useOrgs } from '@/lib/console/orgs';
import {
  fmtCompact,
  fmtDayLabel,
  fmtElapsed,
  fmtNumber,
  useOrgDailyRevenue,
  useOrgDashboard,
  useOrgMap,
  useOrgUptime,
} from '@/lib/console/dashboard';
import { useOrgFaultSummary, useOrgStations } from '@/lib/console/stations';
import { useOrgRevenueByStation } from '@/lib/console/revenue';
import { useOrgSessions } from '@/lib/console/sessions';
import { OverviewMap } from '@/components/console/OverviewMap';

interface LiveSession {
  id: string;
  sessionId: string;
  chargerName: string | null;
  pedestalName: string | null;
  startTime: string;
  chargedKwh: number | null;
  soc: number | null;
  liveKw: number | null;
}

function LiveSessionsTable({ sessions, base }: { sessions: LiveSession[]; base: string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [show, setShow] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(q) ||
        (s.chargerName ?? '').toLowerCase().includes(q) ||
        (s.pedestalName ?? '').toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / show));
  const paginated = filtered.slice((page - 1) * show, page * show);

  return (
    <TableCard
      title="Live sessions"
      totalLabel={sessions.length > 0 ? `${sessions.length} live` : undefined}
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      showValue={show}
      onShowChange={(v) => { setShow(v); setPage(1); }}
      page={page}
      totalPages={totalPages}
      totalItems={filtered.length}
      onPageChange={setPage}
      action={sessions.length > 0 ? <Badge kind="charge" dot pulse>charging</Badge> : undefined}
    >
      {sessions.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">No active sessions right now.</div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">No sessions match &ldquo;{search}&rdquo;.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="kc-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Charger</th>
                <th>Started</th>
                <th className="num">kWh</th>
                <th className="num">SoC</th>
                <th className="num">Live kW</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`${base}/stations/sessions/${encodeURIComponent(s.sessionId)}`} className="mono text-gray-800 dark:text-white/90">
                      {s.sessionId}
                    </Link>
                  </td>
                  <td>
                    {s.chargerName ?? '—'}
                    {s.pedestalName ? <span className="text-gray-400"> · {s.pedestalName}</span> : null}
                  </td>
                  <td className="text-gray-500 dark:text-gray-400">{fmtElapsed(s.startTime)} ago</td>
                  <td className="num mono">{s.chargedKwh !== null ? s.chargedKwh.toFixed(1) : '—'}</td>
                  <td className="num mono">{s.soc !== null ? `${s.soc}%` : '—'}</td>
                  <td className="num mono">{s.liveKw !== null ? <span className="text-amber-500">{s.liveKw.toFixed(1)}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TableCard>
  );
}

function SkeletonGrid() {
  return (
    <div className="kc-stagger grid grid-cols-5 gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="kc-skeleton h-24" />
      ))}
      <span className="kc-skeleton col-span-3 h-[420px]" />
      <span className="kc-skeleton h-[420px]" />
      <span className="kc-skeleton h-[420px]" />
    </div>
  );
}

export default function ConsoleOverviewPage() {
  const params = useParams<{ country: string }>();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  // Overview is today-focused (no range selector). The revenue card still shows
  // a short recent trend for context — fixed 7-day window.
  const days = 7;

  const dashboard = useOrgDashboard(orgId);
  const revenue = useOrgDailyRevenue(orgId, days);
  const uptime = useOrgUptime(orgId);
  const map = useOrgMap(orgId);
  const faultSummary = useOrgFaultSummary(orgId);
  const stations = useOrgStations(orgId);
  const byStationToday = useOrgRevenueByStation(orgId, 1); // busiest stations today
  const unpaid = useOrgSessions(orgId, { page: 1, status: 'unpaid' });

  const d = dashboard.data;
  const daily = revenue.data?.daily ?? [];

  // One bar per calendar day across the selected range; gap-fill zero days.
  const KIGALI_OFFSET_MS = 2 * 3_600_000;
  const filledDaily = useMemo(() => {
    const byDate = new Map(daily.map((r) => [r.date, r.grossRwf]));
    const todayKigali = new Date(Date.now() + KIGALI_OFFSET_MS);
    const out: Array<{ date: string; revenue: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(todayKigali.getTime() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ date: day, revenue: byDate.get(day) ?? 0 });
    }
    return out;
  }, [daily, days, KIGALI_OFFSET_MS]);

  const revenueSeries = useMemo(() => filledDaily.map((r) => r.revenue), [filledDaily]);
  const revenueLabels = useMemo(() => {
    const step = Math.max(1, Math.ceil(filledDaily.length / 6));
    return filledDaily.map((r, i) =>
      i === 0 || i === filledDaily.length - 1 || i % step === 0 ? fmtDayLabel(r.date) : null,
    );
  }, [filledDaily]);
  const rangeTotal = useMemo(() => revenueSeries.reduce((a, b) => a + b, 0), [revenueSeries]);
  const peakIdx = useMemo(() => {
    if (revenueSeries.length === 0) return -1;
    const peak = Math.max(...revenueSeries);
    if (peak === Math.min(...revenueSeries)) return -1;
    return revenueSeries.indexOf(peak);
  }, [revenueSeries]);

  const wow = d?.weekOverWeek.revenueChangePct ?? null;
  const openFaults = d?.faults.open ?? null;
  const onlineStations = uptime.data?.current?.stations ?? [];
  const onlineCount = onlineStations.filter((s) => s.isOnline).length;

  // "Faulting" = a charger with a connector in a live fault state right now
  // (faultedConnectors from the stations inventory). NOT the historical fault
  // counts — those mark every charger that ever logged a fault, which swallowed
  // the whole donut even when chargers were online and fine.
  const faultingIds = useMemo(
    () => new Set((stations.data?.stations ?? []).filter((s) => s.faultedConnectors > 0).map((s) => s.chargerId)),
    [stations.data],
  );
  const statusSegments = useMemo<DonutSegment[]>(() => {
    let online = 0;
    let offline = 0;
    let faulting = 0;
    for (const s of onlineStations) {
      if (faultingIds.has(s.chargerId)) faulting++;
      else if (s.isOnline) online++;
      else offline++;
    }
    return [
      { label: 'Online', value: online, color: 'var(--ok)' },
      { label: 'Faulting', value: faulting, color: 'var(--warn)' },
      { label: 'Offline', value: offline, color: 'var(--err)' },
    ];
  }, [onlineStations, faultingIds]);

  const topFaultTypes = (faultSummary.data?.byErrorCode ?? []).slice(0, 5);
  const busiest = useMemo(
    () => (byStationToday.data?.byStation ?? []).slice().sort((a, b) => b.grossRwf - a.grossRwf).slice(0, 5),
    [byStationToday.data],
  );
  const unpaidCount = unpaid.data?.totals.unpaid ?? null;
  const faultItems = d?.faults.items ?? [];
  const liveSessions = d?.activeSessions.sessions ?? [];

  const base = `/${params.country}/console`;

  // Snapshot refresh: the overview is "as of load" (no polling), so a manual
  // Refresh re-pulls every card's data at once.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        dashboard.refetch(), revenue.refetch(), uptime.refetch(), map.refetch(),
        faultSummary.refetch(), stations.refetch(), byStationToday.refetch(), unpaid.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only block the whole page until there is an org to scope queries to — every
  // card below renders its own skeleton/error independently (progressive load),
  // so a slow dashboard read never holds back revenue, uptime or faults.
  if (!orgId) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonGrid />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400">
          {d ? `Updated ${new Date(d.cachedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
        </div>
        <Btn size="sm" onClick={refreshAll} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Btn>
      </div>

      {d && (d.degraded.telemetry || d.degraded.faults) && (
        <div className="flex items-center gap-2">
          {d.degraded.telemetry && <Badge kind="warn">telemetry degraded</Badge>}
          {d.degraded.faults && <Badge kind="warn">faults feed degraded</Badge>}
        </div>
      )}

      {/* Slim summary strip — today at a glance */}
      {!d ? (
        <span className="kc-skeleton block h-24" />
      ) : (
      <SummaryStrip
        items={[
          {
            label: 'Revenue today',
            value: <><CountUp value={d.today.revenue} format={fmtCompact} /> <small>{d.currency}</small></>,
            delta: wow !== null ? `${wow >= 0 ? '↗' : '↘'} ${Math.abs(wow).toFixed(1)}%` : undefined,
            deltaKind: wow !== null && wow < 0 ? 'err' : 'ok',
          },
          {
            label: 'Energy delivered',
            value: <><CountUp value={d.today.kwh} format={fmtNumber} /> <small>kWh</small></>,
            delta: `${d.today.sessions} sessions`,
            deltaKind: 'neutral',
          },
          {
            label: 'Active sessions',
            value: <CountUp value={d.activeSessions.count} />,
            delta: d.activeSessions.totalLiveKw !== null ? `${d.activeSessions.totalLiveKw.toFixed(1)} kW` : undefined,
            deltaKind: 'info',
          },
          {
            label: 'Network uptime · 30d',
            value: uptime.data?.uptime.overallPercent != null ? <>{uptime.data.uptime.overallPercent.toFixed(1)}<small>%</small></> : '—',
            delta: uptime.data?.current ? `${onlineCount}/${onlineStations.length} online` : undefined,
            deltaKind: 'neutral',
          },
          {
            label: 'Open faults',
            value: openFaults ?? '—',
            delta: openFaults === null ? 'degraded' : openFaults ? 'attention' : 'all clear',
            deltaKind: openFaults === null ? 'neutral' : openFaults ? 'err' : 'ok',
          },
        ]}
      />
      )}

      {/* Live map — stations + fleet vehicles */}
      <Card
        title="Live map"
        action={
          map.data
            ? <Badge kind="neutral">{map.data.stations.length} stations · {map.data.vehicles.length} vehicles</Badge>
            : undefined
        }
      >
        {map.isPending ? (
          <span className="kc-skeleton block h-[360px]" />
        ) : map.data && map.data.stations.length > 0 ? (
          <OverviewMap stations={map.data.stations} vehicles={map.data.vehicles} />
        ) : (
          <div className="p-6 text-center text-sm text-gray-400">No stations with coordinates yet.</div>
        )}
      </Card>

      {/* Row 1: Revenue chart (2/3) + Charger donut (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] [&>*]:min-w-0">
        <Card
          title={`Revenue — last ${days} days`}
          action={<Badge kind="neutral">{d?.currency ?? 'RWF'} {fmtCompact(rangeTotal)} total</Badge>}
        >
          {revenue.isPending ? (
            <span className="kc-skeleton block h-[220px]" />
          ) : rangeTotal > 0 ? (
            <Bars data={revenueSeries} labels={revenueLabels} format={fmtCompact} highlight={peakIdx} h={220} />
          ) : (
            <div className="p-6 text-center text-sm text-gray-400">No revenue recorded in this range.</div>
          )}
        </Card>

        <Card title="Charger utilization">
          {uptime.data?.current ? (
            <Donut segments={statusSegments} centerLabel="chargers" />
          ) : (
            <div className="text-xs text-gray-400">No heartbeat snapshot yet.</div>
          )}
        </Card>
      </div>

      {/* Row 2: Busiest stations + Network health + Recent faults + Unpaid — 4 equal columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <Card title="Busiest stations today">
          {byStationToday.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="kc-skeleton h-5 rounded" />
              ))}
            </div>
          ) : busiest.length === 0 ? (
            <div className="text-xs text-gray-400">No revenue today yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {busiest.map((s) => {
                const top = busiest[0].grossRwf || 1;
                return (
                  <div key={s.chargerId}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="truncate">{s.chargerName ?? s.chargerId}</span>
                      <span className="mono text-gray-500 dark:text-gray-400">{fmtCompact(s.grossRwf)}</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                      <div className="h-full rounded-full bg-[#00C2A8]" style={{ width: `${(s.grossRwf / top) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Network health">
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Uptime 30d</span>
              <span className="mono">{uptime.data?.uptime.overallPercent != null ? `${uptime.data.uptime.overallPercent.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Online</span>
              <span className="mono">{uptime.data?.current ? `${onlineCount}/${onlineStations.length}` : '—'}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 dark:border-gray-800">
              <div className="mb-1.5 text-[11px] uppercase tracking-wider text-gray-400">Top fault types</div>
              {topFaultTypes.length === 0 ? (
                <div className="text-xs text-gray-400">No faults.</div>
              ) : (
                topFaultTypes.map((f) => (
                  <div key={f.errorCode} className="flex items-center justify-between py-0.5 text-xs">
                    <span className="truncate text-gray-500 dark:text-gray-400">{f.errorCode}</span>
                    <span className="mono text-red-500">{f.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card
          title="Recent faults"
          action={
            openFaults === null ? <Badge kind="warn">feed degraded</Badge>
            : openFaults ? <Badge kind="err">{openFaults} open</Badge>
            : <Badge kind="ok">none</Badge>
          }
        >
          {faultItems.length === 0 ? (
            <div className="text-xs text-gray-400">
              {!d ? 'Loading…' : openFaults === null ? 'Faults feed unavailable.' : 'No open faults in the last 24h.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {faultItems.slice(0, 6).map((f) => (
                <div key={`${f.stationId}-${f.connectorId}-${f.since}`} className="flex items-start justify-between gap-2 text-xs">
                  <span className="min-w-0">
                    <Badge kind="err">{f.errorCode}</Badge>
                    <span className="mono ml-1.5 text-gray-500 dark:text-gray-400">{f.stationId}</span>
                  </span>
                  <span className="shrink-0 text-gray-400">{fmtElapsed(f.since)} ago</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Unpaid sessions">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Awaiting payment</span>
            {unpaidCount ? (
              <Link href={`${base}/stations/sessions`} className="font-semibold text-amber-500">{unpaidCount} →</Link>
            ) : (
              <span className="mono">{unpaidCount ?? '—'}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Live sessions — full width below the grid */}
      <LiveSessionsTable sessions={liveSessions} base={base} />
    </div>
  );
}
