'use client';

/** Console shift swaps (KAB) over the org-scoped API:
 *    GET  /api/orgs/:id/swaps?status=pending|all
 *    POST /api/orgs/:id/swaps
 *    POST /api/orgs/:id/swaps/:swapId/respond
 *  Approve physically reassigns the shift on the BE, so the calendar updates. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';

export interface OrgSwap {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  swapDate: string;
  startTime: string | null;
  endTime: string | null;
  shiftId: string;
  fromOperatorId: string;
  fromOperatorName: string;
  toOperatorId: string;
  toOperatorName: string;
  chargerName: string | null;
  createdAt: string;
}

export function useOrgSwaps(orgId: string | null | undefined, status: 'pending' | 'all' = 'pending') {
  return useQuery<{ swaps: OrgSwap[] }>({
    queryKey: ['console', 'swaps', orgId, status],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/swaps`, { params: { status } });
      return res.data.data as { swaps: OrgSwap[] };
    },
    staleTime: 15_000,
  });
}

function useInvalidateSwaps(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['console', 'swaps', orgId] });
    qc.invalidateQueries({ queryKey: ['console', 'shift-calendar', orgId] });
  };
}

export function useCreateSwap(orgId: string | null | undefined) {
  const invalidate = useInvalidateSwaps(orgId);
  return useMutation({
    mutationFn: async (input: { operatorShiftId: string; targetOperatorId: string; reason?: string }) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/swaps`, input);
      return res.data.data as OrgSwap;
    },
    onSuccess: invalidate,
  });
}

export function useRespondSwap(orgId: string | null | undefined) {
  const invalidate = useInvalidateSwaps(orgId);
  return useMutation({
    mutationFn: async (vars: { swapId: string; approved: boolean; rejectionReason?: string }) => {
      await api(false, false).post(`/api/orgs/${orgId}/swaps/${vars.swapId}/respond`, {
        approved: vars.approved, rejectionReason: vars.rejectionReason,
      });
    },
    onSuccess: invalidate,
  });
}
