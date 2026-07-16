'use client';

/** Console Stations data layer (FE-5 / KAB-110).
 *  There is no dedicated station-inventory endpoint in Phase 1 — the list is
 *  composed from the uptime snapshot (online status + uptime %, SAAS-17) and
 *  the fault summary (open-fault counts, SAAS-13). Detail reads live connector
 *  state (SAAS-13) + the per-charger fault feed. A future SAAS inventory
 *  endpoint would enrich this with plan/connector metadata.
 *  Axios wrapper: payload at res.data.data. */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { useOrgUptime, type DailyRevenueRow, type OrgUptime } from '@/lib/console/dashboard';
import { freshness, type LiveOption } from '@/lib/console/freshness';
import type { TelemetryPoint } from '@/components/console/charts';

export interface FaultSummary {
  byCharger: Array<{
    chargerId: string | null;
    chargerName: string | null;
    count: number;
    byErrorCode: Record<string, number>;
  }>;
  byErrorCode: Array<{ errorCode: string; count: number }>;
  daily: Array<{ date: string; count: number; byCharger: Record<string, number> }>;
  total: number;
  truncated: boolean;
}

export interface ChargerConnector {
  stationId: string;
  connectorId: number;
  evseId: number | null;
  status: string | null;
  errorCode: string | null;
  vendorErrorCode: string | null;
  vendorId: string | null;
  info: string | null;
  timestamp: string | null;
}

export interface DecoratedFault {
  id: number;
  stationId: string;
  chargerId: string | null;
  chargerName: string | null;
  pedestalId: string | null;
  pedestalName: string | null;
  evseId: number | null;
  connectorId: number | null;
  connectorStatus: string | null;
  errorCode: string | null;
  vendorErrorCode: string | null;
  vendorId: string | null;
  info: string | null;
  reportedAt: string | null;
  receivedAt: string | null;
  effectiveAt: string;
  timestampSkewed: boolean;
}

export interface ChargerState {
  chargerId: string;
  chargerName: string | null;
  stations: Array<{
    stationId: string;
    pedestalId: string | null;
    pedestalName: string | null;
    latestStatusNotifications: DecoratedFault[];
    connectors: ChargerConnector[];
  }>;
}

export interface OrgFaultsPage {
  faults: DecoratedFault[];
  total: number;
  limit: number;
  offset: number;
}

/* ---------- stations inventory (SAAS-24, FE-14) ---------- */

export interface OrgStation {
  chargerId: string;
  chargerName: string | null;
  address: string | null;
  operationalStatus: string | null;
  connectorCount: number;
  connectorsByStatus: Record<string, number>;
  faultedConnectors: number;
  liveKw: number | null;
  activeSessions: number;
  revenueToday: number;
  sessionsToday: number;
  energyToday: number;
  online: boolean | null;
  lastSeen: string | null;
}

export interface OrgStationsResponse {
  stations: OrgStation[];
  totals: { chargers: number; online: number; faulted: number; activeSessions: number; revenueToday: number };
  degraded: boolean;
}

/** Stations inventory. Snapshot by default; pass `{ live: true }` to poll. */
export function useOrgStations(orgId: string | null | undefined, opts?: LiveOption) {
  return useQuery<OrgStationsResponse>({
    queryKey: ['console', 'stations-inventory', orgId],
    enabled: !!orgId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/stations`, { signal });
      return res.data.data as OrgStationsResponse;
    },
    ...freshness(opts, 30_000),
  });
}

export function useOrgFaultSummary(orgId: string | null | undefined) {
  return useQuery<FaultSummary>({
    queryKey: ['console', 'fault-summary', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/faults/summary`);
      return res.data.data as FaultSummary;
    },
    staleTime: 60_000,
  });
}

/** Live connector state for a charger. Snapshot by default; the station-detail
 *  page opts into live polling only while the Connectors tab is open. */
export function useChargerState(orgId: string | null | undefined, chargerId: string | null, opts?: LiveOption) {
  return useQuery<ChargerState>({
    queryKey: ['console', 'charger-state', orgId, chargerId],
    enabled: !!orgId && !!chargerId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/chargers/${chargerId}/state`);
      return res.data.data as ChargerState;
    },
    ...freshness(opts, 30_000),
  });
}

/** Faults page size for the station-detail Faults tab. */
export const FAULTS_PAGE_SIZE = 10;

export function useChargerFaults(
  orgId: string | null | undefined,
  chargerId: string | null,
  page = 1,
  stationId?: string | null,
  /** Defer the fetch until the per-charger station context is resolved, so a
   *  multi-pedestal site never briefly fetches/show the site-wide aggregate. */
  enabled = true,
) {
  return useQuery<OrgFaultsPage>({
    queryKey: ['console', 'charger-faults', orgId, chargerId, page, stationId ?? ''],
    enabled: !!orgId && !!chargerId && enabled,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/faults`, {
        params: { chargerId, ...(stationId ? { stationId } : {}), limit: FAULTS_PAGE_SIZE, offset: (page - 1) * FAULTS_PAGE_SIZE },
      });
      return res.data.data as OrgFaultsPage;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData, // keep the current page visible while the next loads
  });
}

/* ---------- live power curve (KAB-131) ---------- */

export interface StationPowerPoint {
  /** ISO timestamp of the bucket start. */
  t: string;
  /** Total power across the charger's connectors in this bucket (kW). */
  powerKw: number;
  /** Per-connector breakdown (key = `stationId:connectorId`). */
  byConnector: Record<string, number>;
}

export interface StationPower {
  chargerId: string;
  chargerName: string | null;
  window: string;
  from: string;
  to: string;
  bucketMs: number;
  connectors: string[];
  points: StationPowerPoint[];
  /** Freshest total live power (kW), or null when nothing is live. */
  latestKw: number | null;
  /** Peak total power over the window (kW), or null when no telemetry. */
  peakKw: number | null;
  /** True when at least one MeterValue with power was found in the window. */
  hasTelemetry: boolean;
  /** True when the charger has at least one Citrine-linked station. */
  linked: boolean;
  /** True when Citrine is linked but unreachable. */
  degraded: boolean;
}

export const STATION_POWER_WINDOWS = [
  { id: '1h', label: '1h' },
  { id: '6h', label: '6h' },
  { id: '24h', label: '24h' },
] as const;
export type StationPowerWindowId = (typeof STATION_POWER_WINDOWS)[number]['id'];

/** Map a power curve to elapsed-time telemetry points (X = seconds since the
 *  window start) so the draw-in/append TelemetryChart can render it. Returns []
 *  when there's no telemetry, which the page renders as an empty state. */
export function stationPowerPoints(data: StationPower | undefined | null): TelemetryPoint[] {
  if (!data || !data.hasTelemetry) return [];
  const fromMs = new Date(data.from).getTime();
  // A bad `from` (or point timestamp) would yield NaN elapsedSec and corrupt the
  // chart's axis bounds — return [] / skip so the page shows its empty state.
  if (!Number.isFinite(fromMs)) return [];
  const out: TelemetryPoint[] = [];
  for (const pt of data.points) {
    const tMs = new Date(pt.t).getTime();
    if (!Number.isFinite(tMs)) continue;
    out.push({
      elapsedSec: Math.max(0, Math.round((tMs - fromMs) / 1000)),
      t: pt.t,
      value: pt.powerKw,
    });
  }
  return out;
}

/** Live per-station power curve aggregated from Citrine MeterValues (KAB-131).
 *  This is a genuinely-live widget: snapshot by default, but the station-detail
 *  page opts into 30s polling while the Connectors tab (which renders the chart)
 *  is open, so it stops polling the heavy MeterValues query on other tabs. */
export function useStationPower(
  orgId: string | null | undefined,
  chargerId: string | null,
  window: StationPowerWindowId = '6h',
  opts?: LiveOption,
) {
  return useQuery<StationPower>({
    queryKey: ['console', 'station-power', orgId, chargerId, window],
    enabled: !!orgId && !!chargerId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/stations/${chargerId}/power`, {
        params: { window },
      });
      return res.data.data as StationPower;
    },
    ...freshness(opts, 30_000),
  });
}

/* ---------- charger device state (Control-tab Device state card) ---------- */

export interface ChargerDeviceState {
  stationId: string | null;
  isOnline: boolean | null;
  ocppProtocol: string | null;
  firmwareVersion: string | null;
  vendor: string | null;
  model: string | null;
  lastHeartbeatAt: string | null;
  heartbeatInterval: number | null;
  lastBootAt: string | null;
  bootStatus: string | null;
  bootReason: string | null;
  localList: { version: number | null; scopedTagCount: number };
}

/** Live OCPP identity of a charger (firmware / protocol / heartbeat / boot /
 *  local-list). Poll while the Control tab is open. */
export function useChargerDeviceState(
  orgId: string | null | undefined,
  chargerId: string | null,
  opts?: LiveOption,
  stationId?: string | null,
) {
  return useQuery<ChargerDeviceState>({
    queryKey: ['console', 'device-state', orgId, chargerId, stationId ?? ''],
    enabled: !!orgId && !!chargerId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/chargers/${chargerId}/device-state`, {
        signal,
        params: stationId ? { stationId } : undefined,
      });
      return res.data.data as ChargerDeviceState;
    },
    ...freshness(opts, 20_000),
  });
}

/* ---------- charger OCPP configuration (Configuration tab) ---------- */

export type ConfigVersion = '1.6' | '2.0.1';

export interface ChargerConfigEntry {
  id: string;
  key: string;
  value: string | null;
  readonly: boolean;
  type: string | null;
  dataType: string | null;
  component: string | null;
  variable: string | null;
  evse: number | null;
}

export interface ChargerConfigResult {
  version: ConfigVersion;
  entries: ChargerConfigEntry[];
  total: number;
  limit: number;
  offset: number;
}

const CONFIG_PAGE_SIZE = 100;

/** OCPP configuration keys for a charger (1.6 ChangeConfigurations / 2.0.1
 *  VariableAttributes). Snapshot — config changes are command-driven, not live. */
export function useChargerConfiguration(
  orgId: string | null | undefined,
  chargerId: string | null,
  version: ConfigVersion,
  page = 1,
  search?: string,
  stationId?: string | null,
) {
  return useQuery<ChargerConfigResult>({
    queryKey: ['console', 'charger-config', orgId, chargerId, version, page, search ?? '', stationId ?? ''],
    enabled: !!orgId && !!chargerId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/chargers/${chargerId}/configuration`, {
        signal,
        params: {
          version,
          limit: CONFIG_PAGE_SIZE,
          offset: (page - 1) * CONFIG_PAGE_SIZE,
          ...(search ? { search } : {}),
          ...(stationId ? { stationId } : {}),
        },
      });
      return res.data.data as ChargerConfigResult;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export const CHARGER_CONFIG_PAGE_SIZE = CONFIG_PAGE_SIZE;

export interface ChargerCommandResponse {
  success: boolean;
  detail?: string;
  payload?: unknown;
}

/* ---------- command activity (live response console attribution) ---------- */

export interface CommandActivityEntry {
  id: string;
  command: string;
  ocppAction: string;
  ocppVersion: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
  status: 'Accepted' | 'Rejected' | 'Pending' | string;
  correlationId: string | null;
  summary: string;
  requestParams: unknown;
  responsePayload: unknown;
}

/** Console-issued commands for a charger with the actor + the charger's result —
 *  the live response console feed. Poll while the Control tab is open. */
export function useChargerCommandActivity(
  orgId: string | null | undefined,
  chargerId: string | null,
  opts?: LiveOption,
  stationId?: string | null,
) {
  return useQuery<{ activity: CommandActivityEntry[]; total: number }>({
    queryKey: ['console', 'command-activity', orgId, chargerId, stationId ?? ''],
    enabled: !!orgId && !!chargerId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/chargers/${chargerId}/command-activity`, {
        signal,
        params: { limit: 30, ...(stationId ? { stationId } : {}) },
      });
      return res.data.data as { activity: CommandActivityEntry[]; total: number };
    },
    ...freshness(opts, 15_000),
  });
}

/** Run an OCPP command against a charger via the CitrineOS proxy. Used by the
 *  Configuration tab for Get/Change configuration (1.6). The charger applies
 *  asynchronously, so callers refetch the affected data after a beat. */
export function useRunChargerCommand(
  orgId: string | null | undefined,
  chargerId: string | null,
  stationId?: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { command: string; params?: Record<string, unknown>; ocppVersion?: ConfigVersion }) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/chargers/${chargerId}/commands`, {
        command: vars.command,
        ocppVersion: vars.ocppVersion ?? '1.6',
        params: vars.params ?? {},
        ...(stationId ? { stationId } : {}),
      });
      return res.data.data as ChargerCommandResponse;
    },
    onSuccess: () => {
      // The charger re-reports config asynchronously; refresh shortly after.
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['console', 'charger-config', orgId, chargerId] });
      }, 2000);
    },
  });
}

/** Push the charger's scoped tags to its local authorization list (Send Local
 *  List). Used by the Device state card's Sync button. Refreshes device state so
 *  the local-list version updates. */
export function useSendLocalList(orgId: string | null | undefined, chargerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mode: 'full' | 'differential' = 'full') => {
      const res = await api(false, false).post(
        `/api/orgs/${orgId}/chargers/${chargerId}/local-list/send`,
        { mode },
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'device-state', orgId, chargerId] });
    },
  });
}

/* ---------- per-charger daily trends (FE-15 trends tab) ---------- */

/** Daily energy / revenue / session series for ONE charger, over the SAAS-14
 *  revenue/daily endpoint with the chargerId filter (OrgDailyStat is already
 *  per-charger). Needs view_dashboard — a chargers-only role 403s, which the
 *  page surfaces as "trends unavailable" rather than an error. */
export function useOrgStationTrends(
  orgId: string | null | undefined,
  chargerId: string | null,
  days: number,
) {
  return useQuery<{ daily: DailyRevenueRow[] }>({
    queryKey: ['console', 'station-trends', orgId, chargerId, days],
    enabled: !!orgId && !!chargerId,
    queryFn: async () => {
      // Match the backend's Kigali (UTC+2) day buckets when computing `from`,
      // or the window drifts a day between 22:00–24:00 UTC.
      const KIGALI_OFFSET_MS = 2 * 3_600_000;
      const from = new Date(Date.now() + KIGALI_OFFSET_MS - (days - 1) * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const res = await api(false, false).get(`/api/orgs/${orgId}/revenue/daily`, {
        params: { from, chargerId },
      });
      return res.data.data as { daily: DailyRevenueRow[] };
    },
    staleTime: 60_000,
    retry: false, // a 403 (no view_dashboard) shouldn't retry-spin
  });
}

/* ---------- composed station inventory ---------- */

export interface StationRow {
  chargerId: string;
  chargerName: string;
  online: boolean | null; // null = no current heartbeat snapshot
  uptimePercent: number | null;
  openFaults: number;
}

/** Merge uptime (inventory + online + %) with fault-summary counts into one
 *  station list. Uptime is the inventory source; fault rows without a matching
 *  charger are folded in too so a faulting station never silently disappears. */
export function composeStations(
  uptime: OrgUptime | undefined,
  faults: FaultSummary | undefined,
): StationRow[] {
  const onlineById = new Map<string, boolean>();
  for (const s of uptime?.current?.stations ?? []) onlineById.set(s.chargerId, s.isOnline);

  const faultById = new Map<string, number>();
  for (const c of faults?.byCharger ?? []) {
    if (c.chargerId) faultById.set(c.chargerId, c.count);
  }

  const rows = new Map<string, StationRow>();
  for (const c of uptime?.uptime.byCharger ?? []) {
    rows.set(c.chargerId, {
      chargerId: c.chargerId,
      chargerName: c.chargerName ?? c.chargerId,
      online: onlineById.has(c.chargerId) ? onlineById.get(c.chargerId)! : null,
      uptimePercent: c.uptimePercent,
      openFaults: faultById.get(c.chargerId) ?? 0,
    });
  }
  // Fold in any faulting charger missing from the uptime inventory.
  for (const c of faults?.byCharger ?? []) {
    if (c.chargerId && !rows.has(c.chargerId)) {
      rows.set(c.chargerId, {
        chargerId: c.chargerId,
        chargerName: c.chargerName ?? c.chargerId,
        online: onlineById.has(c.chargerId) ? onlineById.get(c.chargerId)! : null,
        uptimePercent: null,
        openFaults: c.count,
      });
    }
  }

  // online tier: offline (0) first, then unknown (1), then online (2), so
  // problem stations surface — false and null are distinct tiers.
  const onlineRank = (online: boolean | null) => {
    if (online === false) return 0;
    if (online === null) return 1;
    return 2;
  };

  return [...rows.values()].sort((a, b) => {
    // faulting first, then by online tier, then by name
    if (b.openFaults !== a.openFaults) return b.openFaults - a.openFaults;
    const rank = onlineRank(a.online) - onlineRank(b.online);
    if (rank !== 0) return rank;
    return a.chargerName.localeCompare(b.chargerName);
  });
}

/** Re-export so pages can pull the whole stations layer from one module. */
export { useOrgUptime };

import type { BadgeKind } from '@/components/console/ui';

/** OCPP connector status → badge kind. */
export function connectorBadge(status: string | null): { kind: BadgeKind; label: string } {
  switch (status) {
    case 'Available':
      return { kind: 'ok', label: 'Available' };
    case 'Charging':
      return { kind: 'charge', label: 'Charging' };
    case 'Preparing':
    case 'Finishing':
      return { kind: 'info', label: status };
    case 'SuspendedEV':
    case 'SuspendedEVSE':
      return { kind: 'warn', label: status };
    case 'Faulted':
      return { kind: 'err', label: 'Faulted' };
    case 'Unavailable':
      return { kind: 'neutral', label: 'Unavailable' };
    default:
      return { kind: 'neutral', label: status ?? 'Unknown' };
  }
}

/* ---------- OCPP messages (charger detail) ---------- */

export interface OcppMessage {
  id: number;
  stationId: string;
  chargerId: string | null;
  chargerName: string | null;
  pedestalName: string | null;
  correlationId: string | null;
  origin: string;
  state: string;
  protocol: string;
  action: string;
  message: unknown;
  timestamp: string | null;
  createdAt: string;
}

interface OcppMessagesPage {
  messages: OcppMessage[];
  total: number;
  limit: number;
  offset: number;
}

const OCPP_PAGE_SIZE = 50;

export interface OcppMessageFilters {
  action?: string;
  origin?: string;
  correlationId?: string;
  from?: string;
  to?: string;
}

export function useOcppMessages(
  orgId: string | null | undefined,
  chargerId: string | null,
  page = 1,
  filters: OcppMessageFilters = {},
) {
  return useQuery<OcppMessagesPage>({
    queryKey: ['console', 'ocpp-messages', orgId, chargerId, page, filters],
    enabled: !!orgId && !!chargerId,
    queryFn: async () => {
      // `from`/`to` come from <input type="datetime-local"> as naive local
      // strings (e.g. "2024-01-15T14:30"). Convert to UTC ISO-8601 so the
      // API filters on the user's intended instant, not the server's TZ.
      const toIso = (s?: string) => {
        if (!s) return undefined;
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      };
      const normalized: OcppMessageFilters = {
        ...filters,
        from: toIso(filters.from),
        to: toIso(filters.to),
      };
      const res = await api(false, false).get(`/api/orgs/${orgId}/chargers/${chargerId}/ocpp-messages`, {
        params: {
          limit: OCPP_PAGE_SIZE,
          offset: (page - 1) * OCPP_PAGE_SIZE,
          ...Object.fromEntries(Object.entries(normalized).filter(([, v]) => v)),
        },
      });
      return res.data.data as OcppMessagesPage;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
}
