'use client';

/** Console Shifts data layer (FE-9 / KAB-114) over SAAS-SHIFTS:
 *    GET /api/orgs/:id/shifts            paginated shift reports + totals
 *    GET /api/orgs/:id/shifts/:shiftId   detail
 *  Backend reuses the admin shift-report service; the row shape is large, so
 *  detail is typed loosely and rendered defensively. Payload at res.data.data. */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';

export interface ShiftPayments {
  momo: number;
  momoCode: number;
  invoice: number;
  free: number;
}

export interface ShiftReportRow {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  shiftDurationMinutes: number | null;
  chargingSessionCount: number | null;
  kwhSold: number | null;
  moneyCollectedRwf: number | null;
  meterTotalKwh: number | null;
  isApproved: boolean;
  isFlagged: boolean;
  payments?: ShiftPayments;
  operator: { id: string; firstName: string | null; lastName: string | null; imageUrl: string | null } | null;
  operatorShift: { charger: { name: string | null } | null } | null;
}

export interface OrgShiftsResponse {
  reports: ShiftReportRow[];
  pagination: { total: number; limit: number; offset: number; page: number; hasMore: boolean };
  totals: { count: number; activeCount: number; kwhSum: number; rwfSum: number };
}

export interface ShiftsListParams {
  page: number;
  status: 'all' | 'active' | 'completed';
  search?: string;
  operatorId?: string;
  lateness?: 'all' | 'onTime' | 'late' | 'early';
  review?: 'all' | 'approved' | 'flagged' | 'pending' | 'flaggedThenApproved';
  startDate?: string;
  endDate?: string;
}

/** Query params for the list + export (KAB-143 filters). */
function shiftsQueryParams(params: ShiftsListParams): Record<string, string | number> {
  return {
    status: params.status,
    ...(params.search ? { search: params.search } : {}),
    ...(params.operatorId ? { operatorId: params.operatorId } : {}),
    ...(params.lateness && params.lateness !== 'all' ? { lateness: params.lateness } : {}),
    ...(params.review && params.review !== 'all' ? { review: params.review } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
  };
}

export function useOrgShifts(orgId: string | null | undefined, params: ShiftsListParams) {
  return useQuery<OrgShiftsResponse>({
    queryKey: ['console', 'shifts', orgId, params],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/shifts`, {
        params: { page: params.page, ...shiftsQueryParams(params) },
      });
      return res.data.data as OrgShiftsResponse;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** KAB-143: approve/un-approve a shift report (manage_shifts). */
export function useApproveShift(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { shiftId: string; approved: boolean; reason?: string }) => {
      await api(false, false).post(`/api/orgs/${orgId}/shifts/${vars.shiftId}/approval`, {
        approved: vars.approved, reason: vars.reason ?? '',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console', 'shifts', orgId] }),
  });
}

/** KAB-143: flag/un-flag a shift report (manage_shifts). */
export function useFlagShift(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { shiftId: string; flagged: boolean; reason?: string }) => {
      await api(false, false).post(`/api/orgs/${orgId}/shifts/${vars.shiftId}/flag`, {
        flagged: vars.flagged, reason: vars.reason ?? '',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['console', 'shifts', orgId] }),
  });
}

/** KAB-143: download the filtered report set as CSV. */
export async function exportOrgShifts(orgId: string, params: ShiftsListParams): Promise<void> {
  const res = await api(false, false).get(`/api/orgs/${orgId}/shifts/export`, {
    params: shiftsQueryParams(params),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shift-reports.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Detail payload is large and varied — surface it loosely and read fields
 *  defensively in the page. */
export interface OrgShiftDetail {
  detail: {
    report: Record<string, unknown> & {
      id: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      operator?: { firstName: string | null; lastName: string | null } | null;
      operatorShift?: { charger?: { name: string | null } | null } | null;
      payments?: ShiftPayments;
      kwhSold?: number | null;
      moneyCollectedRwf?: number | null;
      meterTotalKwh?: number | null;
      chargingSessionCount?: number | null;
      shiftDurationMinutes?: number | null;
      isApproved?: boolean;
      isFlagged?: boolean;
      comments?: string | null;
    };
    [key: string]: unknown;
  };
}

export function useOrgShiftDetail(orgId: string | null | undefined, shiftId: string | null) {
  return useQuery<OrgShiftDetail>({
    queryKey: ['console', 'shift-detail', orgId, shiftId],
    enabled: !!orgId && !!shiftId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/shifts/${shiftId}`);
      return res.data.data as OrgShiftDetail;
    },
    staleTime: 30_000,
  });
}

/* ---------- helpers ---------- */

export function operatorName(o: { firstName: string | null; lastName: string | null } | null | undefined): string {
  if (!o) return 'Unknown';
  return [o.firstName, o.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export function fmtDuration(mins: number | null | undefined): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
