'use client';

/** Console Feedback data layer — ratings/reviews left by drivers after a
 *  session, plus operational issue reports (plug damage, card reader, safety,
 *  etc.) raised by drivers or operators. Two related but distinct surfaces:
 *  reviews are read-only sentiment, reports have a status workflow.
 *  Axios wrapper: payload lives at res.data.data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { toast } from 'sonner';
import type { BadgeKind } from '@/components/console/ui';

export interface Review {
  id: string;
  sessionId: string;
  chargerId: string | null;
  chargerName: string | null;
  customerId: string | null;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface ReviewsSummary {
  count: number;
  average: number | null;
  distribution: Record<string, number>; // '1'..'5' -> count
}

export function useOrgReviewsSummary(orgId: string | null | undefined) {
  return useQuery<ReviewsSummary>({
    queryKey: ['console', 'feedback-reviews-summary', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/feedback/reviews/summary`);
      return res.data.data as ReviewsSummary;
    },
    staleTime: 60_000,
  });
}

export interface ReviewsFilters {
  rating?: string; // '1'..'5' | 'all'
  search?: string;
  page?: number;
  limit?: number;
}

export function useOrgReviews(orgId: string | null | undefined, filters: ReviewsFilters = {}) {
  const { rating = 'all', search = '', page = 1, limit = 20 } = filters;
  return useQuery({
    queryKey: ['console', 'feedback-reviews', orgId, rating, search, page, limit],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/feedback/reviews`, {
        params: { rating, search, page, limit },
      });
      return res.data.data as { reviews: Review[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    },
    staleTime: 30_000,
  });
}

export type ReportStatus = 'open' | 'investigating' | 'resolved';
export type ReportSeverity = 'high' | 'medium' | 'low';

export interface Report {
  id: string;
  chargerId: string | null;
  chargerName: string | null;
  category: string;
  severity: ReportSeverity;
  status: ReportStatus;
  description: string;
  reporterName: string;
  reporterType: 'customer' | 'operator';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReportsResponse {
  reports: Report[];
  totals: { open: number; investigating: number; resolved: number };
}

export function useOrgReports(orgId: string | null | undefined, filters: { status?: ReportStatus | 'all'; severity?: ReportSeverity | 'all' } = {}) {
  return useQuery<ReportsResponse>({
    queryKey: ['console', 'feedback-reports', orgId, filters.status ?? 'all', filters.severity ?? 'all'],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/feedback/reports`, {
        params: { status: filters.status ?? 'all', severity: filters.severity ?? 'all' },
      });
      return res.data.data as ReportsResponse;
    },
    staleTime: 20_000,
  });
}

export function useUpdateReportStatus(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { reportId: string; status: ReportStatus }) => {
      const res = await api(false, false).patch(`/api/orgs/${orgId}/feedback/reports/${vars.reportId}`, { status: vars.status });
      return res.data.data.report as Report;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'feedback-reports', orgId] });
      toast.success('Report updated');
    },
    onError: () => toast.error("Couldn't update the report", { duration: Infinity }),
  });
}

export function reportSeverityBadge(severity: ReportSeverity): { kind: BadgeKind; label: string } {
  if (severity === 'high') return { kind: 'err', label: 'High' };
  if (severity === 'medium') return { kind: 'warn', label: 'Medium' };
  return { kind: 'neutral', label: 'Low' };
}

export function reportStatusBadge(status: ReportStatus): { kind: BadgeKind; label: string } {
  if (status === 'open') return { kind: 'err', label: 'Open' };
  if (status === 'investigating') return { kind: 'warn', label: 'Investigating' };
  return { kind: 'ok', label: 'Resolved' };
}
