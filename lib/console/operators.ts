'use client';

/** Console Operators data layer (FE-2 / KAB-140) over the org-scoped operator API:
 *    GET /api/orgs/:id/operators              directory + per-operator rollups
 *    GET /api/orgs/:id/operators/:operatorId  profile + stats + recent activity
 *  Payload at res.data.data. */
import React from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api/api';

export type OperatorStatus = 'active' | 'inactive';

/** Lightweight operator shape returned by the directory in `fields=basic` mode —
 *  enough for selectors (filters, shift/bulk modals); no per-operator stat rollups. */
export interface OperatorOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  isTrainee: boolean;
  status: OperatorStatus;
  joinedAt: string | null;
}

export interface OperatorRow extends OperatorOption {
  totalShifts: number;
  totalReports: number;
  totalKwh: number;
  lastReportAt: string | null;
}

export interface OperatorsPagination {
  total: number;
  limit: number;
  offset: number;
  page: number;
  hasMore: boolean;
}

export interface OrgOperatorsResponse {
  operators: OperatorRow[];
  pagination: OperatorsPagination;
}

export interface OperatorsListParams {
  page: number;
  status: 'active' | 'inactive' | 'all';
  search?: string;
  chargerId?: string;
}

export function useOrgOperators(orgId: string | null | undefined, params: OperatorsListParams) {
  return useQuery<OrgOperatorsResponse>({
    queryKey: ['console', 'operators', orgId, params],
    enabled: !!orgId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/operators`, {
        signal,
        params: {
          page: params.page,
          status: params.status,
          ...(params.search ? { search: params.search } : {}),
          ...(params.chargerId ? { chargerId: params.chargerId } : {}),
        },
      });
      return res.data.data as OrgOperatorsResponse;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

interface OperatorOptionsPage {
  operators: OperatorOption[];
  pagination: OperatorsPagination;
}

export interface AllOperatorsParams {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  chargerId?: string;
}

/** Page size for the incremental "load every operator" fetch. Large enough to keep
 *  round-trips low, capped under the API's max (100) so a single page stays light. */
const ALL_OPERATORS_PAGE_SIZE = 50;

/** Loads *every* operator for selectors (schedule/shifts filters, shift & bulk-assign
 *  modals) by paging through the lightweight `fields=basic` endpoint incrementally and
 *  flattening the pages — never one heavy all-at-once request, but the full list ends up
 *  available. Also exposes fetchNextPage/hasNextPage for any future scroll-driven UI. */
export function useAllOrgOperators(orgId: string | null | undefined, params: AllOperatorsParams = {}) {
  const status = params.status ?? 'all';
  const q = useInfiniteQuery<OperatorOptionsPage>({
    queryKey: ['console', 'operators-all', orgId, status, params.search ?? '', params.chargerId ?? ''],
    enabled: !!orgId,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/operators`, {
        signal,
        params: {
          page: pageParam,
          limit: ALL_OPERATORS_PAGE_SIZE,
          status,
          fields: 'basic',
          ...(params.search ? { search: params.search } : {}),
          ...(params.chargerId ? { chargerId: params.chargerId } : {}),
        },
      });
      return res.data.data as OperatorOptionsPage;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    staleTime: 30_000,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q;
  // Auto-advance through remaining pages so callers receive the complete list.
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const operators = React.useMemo(
    () => q.data?.pages.flatMap((p) => p.operators) ?? [],
    [q.data],
  );

  return {
    operators,
    total: q.data?.pages[0]?.pagination.total ?? 0,
    isPending: q.isPending,
    isError: q.isError,
    refetch: q.refetch,
    hasNextPage: q.hasNextPage,
    fetchNextPage: q.fetchNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    /** True while the first page or any follow-up page is still loading. */
    isLoadingAll: q.isPending || q.isFetchingNextPage || q.hasNextPage,
  };
}

export interface OperatorDetail {
  operator: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    imageUrl: string | null;
    role: string;
    isTrainee: boolean;
    status: OperatorStatus;
    joinedAt: string | null;
  };
  stats: {
    totalReports: number;
    completedReports: number;
    approvedReports: number;
    flaggedReports: number;
    totalKwh: number;
    totalSessions: number;
    lastReportAt: string | null;
  };
  recentShifts: Array<{
    id: string;
    shiftDate: string | null;
    startTime: string | null;
    endTime: string | null;
    charger: { id: string; name: string | null } | null;
  }>;
  recentReports: Array<{
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    isApproved: boolean;
    isFlagged: boolean;
    kwh: number;
    sessions: number;
  }>;
}

export function useOrgOperatorDetail(orgId: string | null | undefined, operatorId: string | null) {
  return useQuery<OperatorDetail>({
    queryKey: ['console', 'operator-detail', orgId, operatorId],
    enabled: !!orgId && !!operatorId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/operators/${operatorId}`);
      return res.data.data as OperatorDetail;
    },
    staleTime: 30_000,
  });
}
