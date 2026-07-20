'use client';

/** Fleet Charging Schedule — a power-utilization + per-connector booking
 *  timeline for fleet/operations managers, styled after Einride's charger
 *  planning view (live power draw above a Gantt-style row-per-connector
 *  timeline of vehicle charging blocks). Built from real station + session
 *  data already exposed by the console API: useStationPower for the curve,
 *  useOrgSessions (gun name + licensePlate) for the per-connector blocks. */
import React, { useMemo, useState } from 'react';
import { Card, PageHead } from '@/components/console/ui';
import { TelemetryChart } from '@/components/console/charts';
import { useOrgs } from '@/lib/console/orgs';
import { useOrgStations, useStationPower, stationPowerPoints, STATION_POWER_WINDOWS, type StationPowerWindowId } from '@/lib/console/stations';
import { useOrgSessions } from '@/lib/console/sessions';

const DAY_MS = 24 * 3_600_000;
const ROW_COLOR = '#00C2A8';

export default function ChargingSchedulePage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const stations = useOrgStations(orgId);
  const stationRows = stations.data?.stations ?? [];
  const [chargerId, setChargerId] = useState<string | null>(null);
  const activeChargerId = chargerId ?? stationRows[0]?.chargerId ?? null;
  const activeStation = stationRows.find((s) => s.chargerId === activeChargerId) ?? null;

  const [window, setWindow] = useState<StationPowerWindowId>('24h');
  const power = useStationPower(orgId, activeChargerId, window);
  const points = stationPowerPoints(power.data);

  const sessions = useOrgSessions(orgId, { page: 1, status: 'all', chargerId: activeChargerId ?? undefined });

  // Rows = distinct connector ("gun") on this charger; blocks = each session
  // positioned along a 24h timeline by start/end time, labeled with plate.
  const rows = useMemo(() => {
    const now = Date.now();
    const dayStart = now - DAY_MS;
    const byGun = new Map<string, { label: string; blocks: { left: number; width: number; plate: string; live: boolean }[] }>();
    for (const s of sessions.data?.sessions ?? []) {
      const label = s.gun?.name ?? s.pedestal?.name ?? 'Connector';
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : now;
      if (!Number.isFinite(start) || end < dayStart) continue;
      const clampedStart = Math.max(start, dayStart);
      const clampedEnd = Math.min(end, now);
      if (clampedEnd <= clampedStart) continue;
      const left = ((clampedStart - dayStart) / DAY_MS) * 100;
      const width = Math.max(0.6, ((clampedEnd - clampedStart) / DAY_MS) * 100);
      const entry = byGun.get(label) ?? { label, blocks: [] };
      entry.blocks.push({ left, width, plate: s.licensePlate ?? s.sessionId.slice(0, 8), live: !s.endTime });
      byGun.set(label, entry);
    }
    return [...byGun.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [sessions.data]);

  const hourTicks = useMemo(() => [0, 4, 8, 12, 16, 20, 24], []);

  return (
    <div className="space-y-4">
      <PageHead
        title="Charging Schedule"
        sub="Live power draw and per-connector vehicle charging timeline for this station"
      />

      <Card
        title="Power utilization"
        action={
          <div className="flex items-center gap-3">
            {stationRows.length > 1 && (
              <select
                value={activeChargerId ?? ''}
                onChange={(e) => setChargerId(e.target.value)}
                className="h-8 rounded-md border border-gray-300 bg-transparent px-2 text-xs dark:border-gray-700"
              >
                {stationRows.map((s) => (
                  <option key={s.chargerId} value={s.chargerId}>{s.chargerName ?? s.chargerId}</option>
                ))}
              </select>
            )}
            <div className="flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-700">
              {STATION_POWER_WINDOWS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWindow(w.id)}
                  className={`px-2.5 py-1 text-xs ${window === w.id ? 'bg-[#00C2A8] font-semibold text-[#0C1B18]' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {stations.isPending || power.isPending ? (
          <span className="kc-skeleton block h-[190px] rounded-lg" />
        ) : points.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No live power draw recorded for {activeStation?.chargerName ?? 'this station'} in this window.
          </div>
        ) : (
          <TelemetryChart points={points} color={ROW_COLOR} yLabel="Power" unit=" kW" format={(v) => v.toFixed(0)} showTime />
        )}
      </Card>

      <Card title={`Charger bookings${activeStation?.chargerName ? ` — ${activeStation.chargerName}` : ''}`}>
        {sessions.isPending ? (
          <span className="kc-skeleton block h-40 rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No charging sessions on this station in the last 24h.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Hour ruler */}
              <div className="relative mb-2 h-4 border-b border-gray-200 pl-28 dark:border-gray-800">
                {hourTicks.map((h) => (
                  <span
                    key={h}
                    className="absolute -translate-x-1/2 text-[10px] text-gray-400"
                    style={{ left: `calc(7rem + ${(h / 24) * 100}%)` }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {rows.map((row) => (
                <div key={row.label} className="flex items-center gap-0 border-b border-gray-100/70 py-1.5 last:border-0 dark:border-white/5">
                  <div className="mono w-28 shrink-0 truncate pr-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {row.label}
                  </div>
                  <div className="relative h-6 flex-1 rounded bg-gray-50 dark:bg-white/[0.03]">
                    {row.blocks.map((b, i) => (
                      <div
                        key={i}
                        title={b.plate}
                        className={`mono absolute top-0 flex h-6 items-center justify-center overflow-hidden rounded text-[10px] font-semibold text-white ${b.live ? 'animate-pulse' : ''}`}
                        style={{ left: `${b.left}%`, width: `${b.width}%`, background: ROW_COLOR }}
                      >
                        {b.width > 6 ? b.plate : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
