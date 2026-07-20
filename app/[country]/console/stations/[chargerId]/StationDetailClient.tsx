'use client';

/** Console Station detail (FE-15 / KAB-123): charger view laid out to the Kabisa
 *  Console design — a 6-KPI header and Overview / Connectors / Sessions / Faults /
 *  Configuration tabs. The Overview tab is a 2-column composition: a live power
 *  curve + connectors + Power Utilization gauge + Energy Delivered bars on the
 *  left, Recent Faults + Recent Sessions on the right. Most reads are snapshots
 *  ("as of load"); connector state + the live power curve (KAB-131, Citrine
 *  MeterValues) poll 30s only while the Connectors tab is open. */
import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge, Btn, Card, Icon, PageHead, StatusBadge, SummaryStrip, Tabs } from '@/components/console/ui';
import { RangeControl } from '@/components/console/shell/RangeControl';
import { ControlTab, LocalListTab, ChargerConfigTab } from '@/components/console/stations/stationControl';
import { ChargerPills } from '@/components/console/stations/ChargerPills';
import { Bars, Gauge } from '@/components/console/charts';
import { useOrgs } from '@/lib/console/orgs';
import {
  connectorBadge,
  useChargerFaults,
  useChargerState,
  useOrgStations,
  useOrgStationTrends,
} from '@/lib/console/stations';
import { fmtCompact, fmtDayLabel, fmtNumber } from '@/lib/console/dashboard';
import { isLiveStatus, sessionStatusBadge, useOrgSessions } from '@/lib/console/sessions';

const TREND_RANGES = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
] as const;
type TrendRangeId = (typeof TREND_RANGES)[number]['id'];

/** Nominal charger rating used to scale the live-power gauge until per-charger
 *  capacity metadata exists. The metered live curve itself ships via KAB-131
 *  (the Live power card below); true utilization % still needs real capacity. */
const NOMINAL_KW = 150;

function fmtFull(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type TabId = 'control' | 'connectors' | 'sessions' | 'local-list' | 'configuration';

export default function ConsoleStationDetailPage() {
  const params = useParams<{ country: string; chargerId: string }>();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const chargerId = params.chargerId ? decodeURIComponent(params.chargerId) : null;
  const base = `/${params.country}/console`;

  const [tab, setTab] = useState<TabId>('control');
  const [trendRange, setTrendRange] = useState<TrendRangeId>('30d');
  const trendDays = TREND_RANGES.find((r) => r.id === trendRange)?.days ?? 30;

  // Connector state is the only genuinely-live read; poll it only while the
  // Connectors tab (which renders it) is open. The rest are snapshots ("as of
  // load") — see lib/console/freshness.ts.
  const onConnectors = tab === 'connectors';
  const state = useChargerState(orgId, chargerId, { live: onConnectors });

  // A "charger" here is a SITE with multiple pedestals (each = one CitrineOS
  // station). Drill into one pedestal; selection lives in the URL (?charger=).
  // Errors / power / device-state / config / commands scope to it.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlStation = searchParams.get('charger');
  const pedestals = state.data?.stations ?? [];
  const selectedStationId = useMemo(() => {
    if (pedestals.length === 0) return null;
    if (urlStation && pedestals.some((p) => p.stationId === urlStation)) return urlStation;
    return pedestals[0].stationId;
  }, [pedestals, urlStation]);
  const selectStation = useCallback(
    (stationId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('charger', stationId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Wait for connector state (→ the resolved pedestal) before fetching faults,
  // so a multi-charger site never flashes the site-wide aggregate first.
  const faults = useChargerFaults(orgId, chargerId, 1, selectedStationId, !state.isPending);
  const sessions = useOrgSessions(orgId, { page: 1, status: 'all', chargerId: chargerId ?? undefined });
  const trends = useOrgStationTrends(orgId, chargerId, trendDays);
  const inventory = useOrgStations(orgId);

  // This charger's row from the stations inventory (live kW, revenue/energy today…).
  const row = useMemo(
    () => (inventory.data?.stations ?? []).find((s) => s.chargerId === chargerId) ?? null,
    [inventory.data, chargerId],
  );

  // Gap-filled daily energy series for the Energy Delivered bars.
  const filledTrends = useMemo(() => {
    const rows = trends.data?.daily ?? [];
    const KIGALI_OFFSET_MS = 2 * 3_600_000;
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const todayKigali = new Date(Date.now() + KIGALI_OFFSET_MS);
    const out: Array<{ date: string; kwh: number }> = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const day = new Date(todayKigali.getTime() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ date: day, kwh: byDate.get(day)?.kwh ?? 0 });
    }
    return out;
  }, [trends.data, trendDays]);

  const energySeries = useMemo(() => filledTrends.map((r) => r.kwh), [filledTrends]);
  const energyLabels = useMemo(() => {
    const step = Math.max(1, Math.ceil(filledTrends.length / 6));
    return filledTrends.map((r, i) =>
      i === 0 || i === filledTrends.length - 1 || i % step === 0 ? fmtDayLabel(r.date) : null,
    );
  }, [filledTrends]);
  const energyTotal = useMemo(() => energySeries.reduce((a, b) => a + b, 0), [energySeries]);

  // Only a hard error with no data blocks the page. While connector state is
  // still loading we render the shell (header, KPIs, tabs) and the default
  // Control tab immediately — the heavy connector read never holds back the
  // command surface (progressive load, like the CitrineOS UI).
  if (state.isError && !state.data) {
    return (
      <div className="space-y-6">
        <PageHead
          title="Charger not found"
          crumb={<Link href={`${base}/stations`} className="text-gray-400">Stations</Link>}
          back
        />
        <Card className="p-7 text-center text-sm text-gray-400">
          We couldn&apos;t load this charger.
          <div className="mt-2.5">
            <Btn size="sm" onClick={() => state.refetch()}>Retry</Btn>
          </div>
        </Card>
      </div>
    );
  }

  const c = state.data;
  const allConnectors = (c?.stations ?? [])
    .filter((s) => !selectedStationId || s.stationId === selectedStationId)
    .flatMap((s) =>
      s.connectors.map((conn) => ({ ...conn, pedestalName: s.pedestalName, stationId: s.stationId })),
    );
  const connectorCount = allConnectors.length;
  const chargingNow = allConnectors.filter((conn) => conn.status === 'Charging').length;
  const hasCitrineLink = (c?.stations.length ?? 0) > 0;
  const faultRows = faults.data?.faults ?? [];
  const faultTotal = faults.data?.total ?? faultRows.length;
  const sessionRows = sessions.data?.sessions ?? [];
  const liveKw = row?.liveKw ?? null;

  const TABS = [
    { id: 'control', label: 'Control', count: null },
    { id: 'connectors', label: 'Connectors', count: connectorCount || null },
    { id: 'sessions', label: 'Live sessions', count: sessions.data?.totals.all ?? null },
    { id: 'local-list', label: 'Local auth list', count: null },
    { id: 'configuration', label: 'Configuration', count: null },
  ];

  const connectorsTable = (
    <table className="kc-table">
      <thead>
        <tr>
          <th>Station / pedestal</th>
          <th className="num">Connector</th>
          <th>Status</th>
          <th>Error</th>
          <th>Last update</th>
        </tr>
      </thead>
      <tbody>
        {allConnectors.length === 0 ? (
          <tr>
            <td colSpan={5} className="p-5 text-center text-gray-400">No connectors reporting.</td>
          </tr>
        ) : (
          allConnectors.map((conn) => {
            const cb = connectorBadge(conn.status);
            return (
              <tr key={`${conn.stationId}-${conn.connectorId}`}>
                <td>{conn.pedestalName ?? <span className="mono">{conn.stationId}</span>}</td>
                <td className="num mono">{conn.connectorId}</td>
                <td>
                  <Badge kind={cb.kind} dot pulse={conn.status === 'Charging'}>{cb.label}</Badge>
                </td>
                <td>
                  {conn.errorCode && conn.errorCode !== 'NoError' ? (
                    <span className="text-red-500">{conn.errorCode}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-gray-400">{fmtFull(conn.timestamp)}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  const recentSessions = (
    <Card title="Recent sessions" action={<Link href={`${base}/stations/sessions`} className="text-xs text-gray-400">View all</Link>}>
      {sessionRows.length === 0 ? (
        <div className="text-xs text-gray-400">No sessions on this charger yet.</div>
      ) : (
        <div className="flex flex-col">
          {sessionRows.slice(0, 6).map((s) => {
            const st = sessionStatusBadge(s.sessionStatus);
            return (
              <Link
                key={s.id}
                href={`${base}/stations/sessions/${encodeURIComponent(s.sessionId)}`}
                className="flex items-center justify-between gap-2 border-b border-gray-100/50 py-2 text-xs last:border-0 dark:border-white/5"
              >
                <span className="mono min-w-0 truncate text-gray-800 dark:text-white/90">{s.sessionId}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="mono text-gray-400">{s.totalAmount != null ? fmtNumber(s.totalAmount) : '—'}</span>
                  <Badge kind={st.kind} dot={isLiveStatus(s.sessionStatus)} pulse={isLiveStatus(s.sessionStatus)}>{st.label}</Badge>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );

  const recentFaults = (
    <Card
      title="Recent faults"
      action={faultTotal ? <Badge kind="err">{faultTotal}</Badge> : <Badge kind="ok">none</Badge>}
    >
      {faultRows.length === 0 ? (
        <div className="text-xs text-gray-400">No faults reported for this charger.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {faultRows.slice(0, 6).map((f) => (
            <div key={f.id} className="flex gap-2 text-xs">
              <span className="mt-px text-red-500"><Icon name="alert" size={14} /></span>
              <div className="min-w-0">
                <div className="font-semibold">
                  {f.errorCode ?? 'Fault'}
                  {f.connectorId != null ? <span className="font-normal text-gray-400"> · connector {f.connectorId}</span> : null}
                </div>
                <div className="text-[11.5px] text-gray-400">
                  {fmtFull(f.effectiveAt)}{f.pedestalName ? ` · ${f.pedestalName}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHead
        title={
          <span className="inline-flex items-center gap-2.5">
            {c?.chargerName ?? c?.chargerId ?? chargerId ?? 'Charger'}
            {row?.operationalStatus ? <StatusBadge status={row.operationalStatus} /> : null}
          </span>
        }
        crumb={<Link href={`${base}/stations`} className="text-gray-400">Stations</Link>}
        back
        sub={[row?.address, hasCitrineLink ? undefined : 'Not linked to a live station yet'].filter(Boolean).join(' · ') || undefined}
      />

      {/* KPI header — commented out
      <SummaryStrip
        items={[
          { label: 'Status', value: row?.online === false ? 'Offline' : row?.online ? 'Online' : '—', delta: row?.online === false ? 'offline' : row?.online ? 'online' : undefined, deltaKind: row?.online === false ? 'err' : 'ok' },
          { label: 'Connectors', value: connectorCount || '—', delta: chargingNow ? `${chargingNow} charging` : undefined, deltaKind: 'info' },
          { label: 'Live sessions', value: row?.activeSessions ?? chargingNow, delta: liveKw != null ? `${liveKw.toFixed(1)} kW` : undefined, deltaKind: 'info' },
          { label: 'Revenue today', value: <>{row ? fmtCompact(row.revenueToday) : '—'} <small>RWF</small></> },
          { label: 'Energy today', value: <>{row ? fmtNumber(Math.round(row.energyToday)) : '—'} <small>kWh</small></> },
          { label: 'Open faults', value: faultTotal, delta: faultTotal ? 'attention' : 'all clear', deltaKind: faultTotal ? 'err' : 'ok' },
        ]}
      /> */}

      {pedestals.length > 1 && (
        <ChargerPills pedestals={pedestals} selectedStationId={selectedStationId} onSelect={selectStation} />
      )}

      <Card pad={false}>
        <div className="border-b border-gray-200 px-3.5 py-1.5 dark:border-gray-800">
          <Tabs
            tabs={TABS}
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            style={{ borderBottom: 'none' }}
          />
        </div>

        {/* CONTROL — command surface + live response console */}
        {tab === 'control' && <ControlTab chargerId={chargerId ?? ''} stationId={selectedStationId} />}

        {/* CONNECTORS — connectors list + live telemetry */}
        {tab === 'connectors' && (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* LEFT */}
            <div className="flex min-w-0 flex-col gap-4">
              <Card title={`Connectors (${connectorCount})`} pad={false}>
                {state.isPending ? (
                  <span className="kc-skeleton m-4 block h-32 rounded-lg" />
                ) : hasCitrineLink ? connectorsTable : (
                  <div className="p-6 text-center text-sm text-gray-400">
                    This charger isn&apos;t linked to a live station yet — no connector telemetry available.
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card title="Power utilization">
                  {liveKw != null ? (
                    <>
                      <Gauge value={liveKw} max={NOMINAL_KW} label={`of ${NOMINAL_KW} kW nominal`} unit=" kW" />
                      <div className="text-center text-[11px] text-gray-400">live draw · nominal rating</div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No live power draw right now.
                    </div>
                  )}
                </Card>
                <Card
                  title="Energy delivered"
                  action={
                    <RangeControl ranges={TREND_RANGES} value={trendRange} onChange={(id) => setTrendRange(id as TrendRangeId)} />
                  }
                >
                  {trends.isError ? (
                    <div className="p-5 text-center text-xs text-gray-400">Needs the dashboard permission.</div>
                  ) : trends.isPending ? (
                    <span className="kc-skeleton block h-[150px] rounded-lg" />
                  ) : energyTotal > 0 ? (
                    <Bars data={energySeries} labels={energyLabels} format={(v) => `${v.toFixed(1)} kWh`} />
                  ) : (
                    <div className="p-5 text-center text-xs text-gray-400">No energy recorded in this range.</div>
                  )}
                </Card>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex min-w-0 flex-col gap-4">
              {recentFaults}
              {recentSessions}
            </div>
          </div>
        )}

        {/* LOCAL AUTH LIST */}
        {tab === 'local-list' && <LocalListTab chargerId={chargerId ?? ''} />}

        {/* SESSIONS */}
        {tab === 'sessions' &&
          (sessions.isPending ? (
            <div className="flex flex-col gap-2 p-3.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="kc-skeleton h-8 rounded-md" />
              ))}
            </div>
          ) : sessionRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No sessions on this charger yet.</div>
          ) : (
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Started</th>
                  <th className="num">kWh</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((s) => {
                  const st = sessionStatusBadge(s.sessionStatus);
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link href={`${base}/stations/sessions/${encodeURIComponent(s.sessionId)}`} className="mono text-gray-800 dark:text-white/90">
                          {s.sessionId}
                        </Link>
                      </td>
                      <td className="text-gray-500 dark:text-gray-400">{fmtFull(s.startTime)}</td>
                      <td className="num mono">{s.chargedKwh != null ? s.chargedKwh.toFixed(1) : '—'}</td>
                      <td className="num mono">{s.totalAmount != null ? fmtNumber(s.totalAmount) : '—'}</td>
                      <td>
                        <Badge kind={st.kind} dot pulse={isLiveStatus(s.sessionStatus)}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {/* CONFIGURATION — real OCPP config keys (1.6 ChangeConfigurations / 2.0.1 VariableAttributes) */}
        {tab === 'configuration' && <ChargerConfigTab chargerId={chargerId ?? ''} stationId={selectedStationId} />}
      </Card>
    </div>
  );
}
