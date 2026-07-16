'use client';

/** Console Overview data layer (FE-3 / KAB-108).
 *  GET /orgs/:id/dashboard       — KPIs, 7d WoW, active sessions, faults (SAAS-11)
 *  GET /orgs/:id/revenue/daily   — OrgDailyStat per-day series (SAAS-14)
 *  GET /orgs/:id/uptime          — heartbeat uptime + current station states (SAAS-17)
 *  Axios wrapper: payload lives at res.data.data. */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { freshness, type LiveOption } from '@/lib/console/freshness';

export interface DashboardDayPoint {
  day: string; // YYYY-MM-DD (Kigali)
  revenue: number;
  kwh: number;
  sessions: number;
}

export interface OrgDashboard {
  orgId: string;
  cachedAt: string;
  currency: string;
  today: { revenue: number; kwh: number; sessions: number; completedSessions: number };
  weekOverWeek: {
    thisWeek: DashboardDayPoint[];
    lastWeek: DashboardDayPoint[];
    revenueChangePct: number | null;
  };
  activeSessions: {
    count: number;
    totalLiveKw: number | null;
    sessions: Array<{
      id: string;
      sessionId: string;
      chargerName: string | null;
      pedestalName: string | null;
      startTime: string;
      chargedKwh: number | null;
      soc: number | null;
      liveKw: number | null;
    }>;
  };
  faults: {
    open: number | null;
    items: Array<{
      stationId: string;
      connectorId: number | null;
      errorCode: string;
      connectorStatus: string | null;
      since: string;
    }>;
  };
  degraded: { telemetry: boolean; faults: boolean };
}

export interface DailyRevenueRow {
  date: string; // YYYY-MM-DD
  grossRwf: number;
  kwh: number;
  sessionCount: number;
  paidCount: number;
  ebmIssued: number;
  ebmFailed: number;
  ebmMissing: number;
}

export interface OrgUptime {
  orgId: string;
  orgName: string;
  range: { from: string; to: string };
  current: {
    capturedAt: string;
    source: string;
    stations: Array<{ chargerId: string; chargerName?: string | null; isOnline: boolean }>;
  } | null;
  uptime: {
    snapshotCount: number;
    onlineCount: number;
    overallPercent: number | null;
    byCharger: Array<{ chargerId: string; chargerName: string | null; uptimePercent: number | null }>;
  };
}

/** Org dashboard KPIs. Snapshot by default ("as of load"); pass `{ live: true }`
 *  to poll (the backend already caches this read for ~20s). */
export function useOrgDashboard(orgId: string | null | undefined, opts?: LiveOption) {
  return useQuery<OrgDashboard>({
    queryKey: ['console', 'dashboard', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/dashboard`);
      return res.data.data as OrgDashboard;
    },
    ...freshness(opts, 20_000),
  });
}

export function useOrgDailyRevenue(orgId: string | null | undefined, days: number) {
  return useQuery<{ daily: DailyRevenueRow[] }>({
    queryKey: ['console', 'revenue-daily', orgId, days],
    enabled: !!orgId,
    queryFn: async () => {
      // Backend buckets by Kigali (UTC+2) calendar days — compute `from` in
      // Kigali time too, or the window gains a day between 22:00–24:00 UTC.
      const KIGALI_OFFSET_MS = 2 * 3_600_000;
      const from = new Date(Date.now() + KIGALI_OFFSET_MS - (days - 1) * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const res = await api(false, false).get(`/api/orgs/${orgId}/revenue/daily`, { params: { from } });
      return res.data.data as { daily: DailyRevenueRow[] };
    },
    staleTime: 60_000,
  });
}

/** 30-day uptime + current station online states. Snapshot by default — the
 *  30-day rollup barely moves; pass `{ live: true }` to poll. */
export function useOrgUptime(orgId: string | null | undefined, opts?: LiveOption) {
  return useQuery<OrgUptime>({
    queryKey: ['console', 'uptime', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/uptime`);
      return res.data.data as OrgUptime;
    },
    ...freshness(opts, 5 * 60_000),
  });
}

/* ---------- formatting helpers ---------- */

/** 842_400 → "842k", 18_800_000 → "18.8M" — RWF KPI style from the mockup. */
export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return Math.round(n).toLocaleString('en-US');
}

export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** "2026-06-12" → "Jun 12" */
export function fmtDayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Elapsed time since an ISO instant — "1h 24m" / "12m". */
export function fmtElapsed(startTime: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(startTime).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}
