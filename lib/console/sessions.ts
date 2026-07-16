'use client';

/** Console Sessions data layer (FE-4 / KAB-109).
 *  GET /api/orgs/:id/sessions          — paginated list + tab totals (SAAS-12)
 *  GET /api/orgs/:id/sessions/:sid      — detail + telemetry (power curve, faults,
 *                                         payment timeline, EBM/Xero) (SAAS-12)
 *
 *  Admin actions (POST/PATCH/DELETE on /api/charging-sessions/:id) wrap the
 *  same backend endpoints the admin dashboard uses, so permission gating
 *  (remote_stop_session / manage_stations) is enforced server-side.
 *
 *  Axios wrapper: payload at res.data.data. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { freshness, type LiveOption } from '@/lib/console/freshness';

export type SessionTab = 'all' | 'active' | 'completed' | 'cancelled' | 'unpaid';

/** ChargingSessionStatus (Prisma enum) values the endpoints emit. */
export type SessionStatus =
  | 'STARTED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'PAID'
  | 'EBM_ISSUED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface SessionEbm {
  id: string;
  receiptNumber: string | null; // BigInt serialised as string
  status: string;
  xeroInvoiceId: string | null;
  xeroInvoiceNumber: string | null;
  xeroPaymentId: string | null;
  xeroPaidAt: string | null;
}

export interface SessionTransaction {
  id: string;
  amount: number;
  currency: string | null;
  transactionStatus: string;
  transactionDescription: string | null;
  momoExternalId: string | null;
  payerName: string | null;
  payerPhone: string | null;
  transactionDate: string | null;
  initiatedByUserId: string | null;
  initiatedByType: string | null;
  initiatedByUser: { firstName: string | null; lastName: string | null } | null;
}

export interface OrgSessionRow {
  id: string;
  sessionId: string;
  sessionStatus: SessionStatus;
  startTime: string;
  endTime: string | null;
  chargedKwh: number | null;
  totalAmount: number | null;
  ratePerKwh: number | null;
  startSoc: number | null;
  endSoc: number | null;
  discountRate: number | null;
  discountAmount: number | null;
  isPaid: boolean;
  customerName: string | null;
  customerPhone: string | null;
  ebmTin: string | null;
  carModelMake: string | null;
  citrineStationId: string | null;
  citrineSourceId: number | null;
  charger: { id: string; name: string | null } | null;
  pedestal: { id: string; name: string | null } | null;
  gun: { id: string; name: string | null } | null;
  operator: { id: string; firstName: string | null; lastName: string | null } | null;
  licensePlate: string | null;
  transactions: SessionTransaction[];
  ebms: SessionEbm[];
}

export interface OrgSessionsResponse {
  sessions: OrgSessionRow[];
  totals: {
    all: number;
    active: number;
    completed: number;
    cancelled: number;
    unpaid: number;
    revenue: number;
    kwh: number;
    unpaidAmount: number;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** One telemetry sample over the session, normalized by the backend
 *  (buildPowerCurve). Any metric can be null for a given timestamp when that
 *  measurand wasn't reported in the OCPP meter value. */
export interface PowerCurvePoint {
  t: string;
  powerKw: number | null;
  energyKwh: number | null;
  soc: number | null;
  voltageV: number | null;
  currentA: number | null;
}

export interface SessionFault {
  errorCode: string | null;
  connectorStatus: string | null;
  info: string | null;
  timestamp: string;
}

export interface SessionTelemetry {
  degraded: boolean;
  powerCurve: PowerCurvePoint[] | null;
  faults: SessionFault[] | null;
  statusTimeline: SessionFault[] | null;
}

export interface PaymentStatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  source: string | null;
  reason: string | null;
  actorUserId: string | null;
  changedAt: string;
}

export interface MomoRequestLog {
  id: string;
  operation: string;
  momoExternalId: string | null;
  referenceId: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface SessionDetailTransaction extends SessionTransaction {
  paymentMethod: { id: string; paymentMethodType: string; momoNumber: string | null } | null;
  statusHistory: PaymentStatusHistory[];
  momoRequestLogs: MomoRequestLog[];
}

export interface OrgSessionDetail {
  session: Omit<OrgSessionRow, 'transactions' | 'ebms'> & {
    vehicle: { id: string; make: string | null; model: string | null } | null;
    transactions: SessionDetailTransaction[];
    ebms: Array<SessionEbm & { errorMessage: string | null; sessionId: string }>;
  };
  telemetry: SessionTelemetry;
}

export interface SessionsListParams {
  page: number;
  status: SessionTab;
  search?: string;
  startDate?: string;
  endDate?: string;
  chargerId?: string;
  paymentStatus?: 'paid' | 'unpaid';
}

/** Paginated sessions list + tab totals. Snapshot by default; pass
 *  `{ live: true }` to poll (e.g. an active-sessions view). */
export function useOrgSessions(
  orgId: string | null | undefined,
  params: SessionsListParams,
  opts?: LiveOption,
) {
  return useQuery<OrgSessionsResponse>({
    queryKey: ['console', 'sessions', orgId, params],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/sessions`, {
        params: {
          page: params.page,
          status: params.status,
          ...(params.search ? { search: params.search } : {}),
          ...(params.startDate ? { startDate: params.startDate } : {}),
          ...(params.endDate ? { endDate: params.endDate } : {}),
          ...(params.chargerId ? { chargerId: params.chargerId } : {}),
          ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
        },
      });
      return res.data.data as OrgSessionsResponse;
    },
    // active sessions move — keep the table populated between refetches
    placeholderData: keepPreviousData,
    ...freshness(opts, 30_000),
  });
}

export function useOrgSessionDetail(orgId: string | null | undefined, sessionId: string | null) {
  return useQuery<OrgSessionDetail>({
    queryKey: ['console', 'session-detail', orgId, sessionId],
    enabled: !!orgId && !!sessionId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/sessions/${sessionId}`);
      return res.data.data as OrgSessionDetail;
    },
    // Poll fast while the session is live (charts append-draw new telemetry),
    // back off to 30s once it has completed.
    refetchInterval: (query) =>
      isLiveStatus(query.state.data?.session.sessionStatus as SessionStatus) ? 10_000 : 30_000,
  });
}

/* ---------- status presentation ---------- */

import type { BadgeKind } from '@/components/console/ui';

/** Session status → badge kind + label (Prisma enum, distinct from the shared
 *  STATUS_BADGE map which keys on lower-case station/EBM states). */
export const SESSION_STATUS: Record<SessionStatus, { kind: BadgeKind; label: string }> = {
  STARTED: { kind: 'charge', label: 'Charging' },
  PAUSED: { kind: 'warn', label: 'Paused' },
  COMPLETED: { kind: 'ok', label: 'Completed' },
  PAID: { kind: 'ok', label: 'Paid' },
  EBM_ISSUED: { kind: 'ok', label: 'Receipt issued' },
  CANCELLED: { kind: 'neutral', label: 'Cancelled' },
  REFUNDED: { kind: 'neutral', label: 'Refunded' },
};

export function isLiveStatus(s: SessionStatus): boolean {
  return s === 'STARTED' || s === 'PAUSED';
}

/* ---------- telemetry chart helpers (KAB-118) ---------- */

/** One metric sample plotted against elapsed time. `t` (clock time) is kept so
 *  the chart tooltip can show both elapsed and actual time. */
export interface MetricPoint {
  elapsedSec: number;
  t: string;
  value: number;
}

/** Build a metric's points vs. elapsed time since the first reading, skipping
 *  samples that lack that measurand (null) so missing readings don't render as
 *  drops to zero. */
export function metricPoints(
  points: PowerCurvePoint[],
  pick: (p: PowerCurvePoint) => number | null,
  /** Shared time origin (ms). Pass when several metrics must share one X axis
   *  (e.g. Voltage + Current on the dual chart) so their elapsed-time values
   *  align — otherwise each series re-bases on its own first non-null sample
   *  and the axes drift apart. Defaults to this series' first sample. */
  originMs?: number,
): MetricPoint[] {
  const present = points.filter((p) => pick(p) != null);
  if (present.length === 0) return [];
  const t0 = originMs ?? new Date(present[0].t).getTime();
  return present.map((p) => ({
    elapsedSec: Math.max(0, Math.round((new Date(p.t).getTime() - t0) / 1000)),
    t: p.t,
    value: pick(p) as number,
  }));
}

/** Min/max Y-domain with a small buffer, for signals that don't sit near zero
 *  (voltage, energy register, current) — otherwise a 0-baseline squashes them
 *  flat. Returns undefined for empty data so the chart keeps its default.
 *
 *  The padded floor is clamped to 0 for non-negative series so a metric that
 *  touches zero (e.g. energy at session start) never renders a meaningless
 *  negative Y-axis — while a high-baseline series keeps its zoomed view. */
export function fitDomain(
  data: number[],
  pad = 0.05,
): { yMin: number; yMax: number } | undefined {
  if (data.length === 0) return undefined;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  // only clamp upward when the data itself is non-negative; signed data is left alone
  const floor = (v: number) => (lo >= 0 ? Math.max(0, v) : v);
  if (lo === hi) return { yMin: floor(lo - 1), yMax: hi + 1 };
  const margin = (hi - lo) * pad;
  return { yMin: floor(lo - margin), yMax: hi + margin };
}

/** Badge for a session status, tolerant of values the backend adds later —
 *  an unmapped status renders neutral with its raw label instead of crashing. */
export function sessionStatusBadge(status: string): { kind: BadgeKind; label: string } {
  return SESSION_STATUS[status as SessionStatus] ?? { kind: 'neutral', label: status || 'Unknown' };
}

/* ---------- admin action mutations (KAB-129) ---------- */

/** Mutable fields on `PATCH /charging-sessions/:id`. Mirrors the backend
 *  `adminUpdateChargingSessionSchema` Joi shape so a single source of truth
 *  governs which keys we may send. */
export interface SessionEditPayload {
  startSoc?: number;
  endSoc?: number;
  chargedKwh?: number;
  startTime?: string;
  endTime?: string;
  ratePerKwh?: number;
  discountRate?: number;
  discountAmount?: number;
  customerName?: string;
  carModelMake?: string;
  imageUrl?: string;
  odometerReading?: number;
  odometerReadingImage?: string;
  chargerScreen?: string;
  forceInvoicedCustomer?: boolean;
}

/** Customer-info patch (separate endpoint with its own permission scope). */
export interface SessionCustomerInfoPayload {
  customerName?: string;
  customerPhone?: string;
  licensePlateNumber?: string;
  vehicleImageUrl?: string;
  carModelMake?: string;
  odometerReading?: number;
  odometerReadingImage?: string;
}

/** Extract a useful error message from the API envelope ({status,message,...}).
 *  Falls back to the HTTP error or a generic label so the toast is never empty. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

/** Invalidate every cache that depends on this session: the detail query, the
 *  list query (totals + row state), and the dashboard rollups. Used by every
 *  mutation below so a successful action immediately re-renders fresh data. */
function useInvalidateSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!orgId) return;
    qc.invalidateQueries({ queryKey: ['console', 'session-detail', orgId, sessionId] });
    qc.invalidateQueries({ queryKey: ['console', 'sessions', orgId] });
    qc.invalidateQueries({ queryKey: ['console', 'dashboard', orgId] });
  };
}

export function useStopRemoteSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/end-remote`);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Stop failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/cancel`, { reason });
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Cancel failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUncancelSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/uncancel`, {});
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Uncancel failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function usePauseSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const body = reason ? { reason } : {};
      const res = await api(false, false).post(`/api/charging-sessions/${id}/pause`, body);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Pause failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useResumeSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/resume`, {});
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Resume failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SessionEditPayload }) => {
      const res = await api(false, false).patch(`/api/charging-sessions/${id}`, payload);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Update failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSessionCustomerInfo(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SessionCustomerInfoPayload }) => {
      const res = await api(false, false).patch(`/api/charging-sessions/${id}/customer-info`, payload);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Update failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Re-prompt the customer's MoMo for the outstanding amount on an unpaid
 * session. Same endpoint operators use in the end-session pay dialog —
 * `processPaymentFromUtil` runs the full MTN STK push and the backend polls
 * status from there. The admin enters the customer's phone in the modal.
 */
export function useRetrySessionMomo(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, phone }: { id: string; phone: string }) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/pay-momo`, { phone });
      if (res.data?.status === 'error') throw new Error(res.data.message || 'MoMo prompt failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Re-prompt the customer via the operator-verified MoMo Code flow (the
 * fallback when STK push is repeatedly missed). Mirrors the operator path.
 */
export function useRetrySessionMomoCode(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api(false, false).post(`/api/charging-sessions/${id}/pay-momo-code`);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'MoMo code prompt failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * Admin write-off: flip an unpaid session to PAID without an actual money
 * movement (gated by `manage_billing` server-side). Audit is recorded on the
 * synthetic 0-amount transaction by the backend.
 */
export function useMarkSessionPaid(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const body = note?.trim() ? { note: note.trim() } : {};
      const res = await api(false, false).post(`/api/charging-sessions/${id}/mark-paid`, body);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Mark paid failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useRetryDebtPayment(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async ({ transactionId, phone }: { transactionId: string; phone: string }) => {
      const res = await api(false, false).post(`/api/charging-sessions/debt-payment-retry/${transactionId}`, { phone });
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Debt retry failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useRegenerateEbm(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      // GET /:sessionId/ebm is idempotent — returns the existing receipt or
      // generates a new one if missing. The endpoint name is misleading; it is
      // effectively a "ensure receipt exists" RPC the admin dashboard uses.
      const res = await api(false, false).get(`/api/charging-sessions/${id}/ebm`);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Receipt generation failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSession(orgId: string | null | undefined, sessionId: string | null | undefined) {
  const invalidate = useInvalidateSession(orgId, sessionId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api(false, false).delete(`/api/charging-sessions/${id}`);
      if (res.data?.status === 'error') throw new Error(res.data.message || 'Delete failed');
      return res.data;
    },
    onSuccess: invalidate,
  });
}

/** Surface a mutation error to the user with a sensible fallback. Re-exported
 *  so component code doesn't have to dig into Axios error shapes. */
export { apiErrorMessage as sessionMutationErrorMessage };
