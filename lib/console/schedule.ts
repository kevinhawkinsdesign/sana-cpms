'use client';

/** Console Schedule data layer (FE-3 / KAB-141) over the org-scoped shift API:
 *    GET    /api/orgs/:id/shifts/calendar?from&to[&operatorId]   FullCalendar feed
 *    POST   /api/orgs/:id/shifts                                  create
 *    PUT    /api/orgs/:id/shifts/:shiftId                         update
 *    DELETE /api/orgs/:id/shifts/:shiftId                         delete
 *  Payload at res.data.data. */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';

export interface ShiftEvent {
  id: string;
  operatorId: string;
  operatorName: string;
  chargerId: string | null;
  chargerName: string | null;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  color: string;
  /** Set when the shift was generated from a recurring template. */
  shiftTemplateId?: string | null;
}

export interface ShiftWriteInput {
  operatorId: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  chargerId?: string;
  isLastShift?: boolean;
}

export function useOrgShiftCalendar(
  orgId: string | null | undefined,
  range: { from: string; to: string; operatorId?: string } | null,
) {
  return useQuery<{ events: ShiftEvent[] }>({
    queryKey: ['console', 'shift-calendar', orgId, range],
    enabled: !!orgId && !!range,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/shifts/calendar`, {
        params: { from: range!.from, to: range!.to, ...(range!.operatorId ? { operatorId: range!.operatorId } : {}) },
      });
      return res.data.data as { events: ShiftEvent[] };
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

function useInvalidateCalendar(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['console', 'shift-calendar', orgId] });
}

export function useCreateShift(orgId: string | null | undefined) {
  const invalidate = useInvalidateCalendar(orgId);
  return useMutation({
    mutationFn: async (input: ShiftWriteInput) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/shifts`, input);
      return res.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateShift(orgId: string | null | undefined) {
  const invalidate = useInvalidateCalendar(orgId);
  return useMutation({
    mutationFn: async ({ shiftId, input }: { shiftId: string; input: Partial<ShiftWriteInput> }) => {
      const res = await api(false, false).put(`/api/orgs/${orgId}/shifts/${shiftId}`, input);
      return res.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteShift(orgId: string | null | undefined) {
  const invalidate = useInvalidateCalendar(orgId);
  return useMutation({
    mutationFn: async (shiftId: string) => {
      await api(false, false).delete(`/api/orgs/${orgId}/shifts/${shiftId}`);
    },
    onSuccess: invalidate,
  });
}

export interface BulkAssignInput {
  operatorIds: string[];
  chargerId?: string | null;
  daysOfWeek: number[];
  startTime?: string | null;
  endTime?: string | null;
  startDate: string;
  endDate: string;
}

export interface BulkAssignResult {
  created: number;
  skipped: number;
  operators: number;
  days: number;
}

/** KAB: bulk-assign shifts (many operators × weekdays × date range). */
export function useBulkAssignShifts(orgId: string | null | undefined) {
  const invalidate = useInvalidateCalendar(orgId);
  return useMutation({
    mutationFn: async (input: BulkAssignInput) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/shifts/bulk`, input);
      return res.data.data as BulkAssignResult;
    },
    onSuccess: invalidate,
  });
}
