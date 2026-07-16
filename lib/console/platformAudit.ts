'use client';

/** Console audit-log data layer (KAB-176) over GET /api/admin/platform/audit-logs
 *  — the read side of the backend's global audit trail. Platform-admin only. */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { unwrapEnvelope } from '@/lib/console/platformAdmin';

export interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: {
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
  } | null;
  createdAt: string;
  actor: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  organization: { id: string; name: string } | null;
}

export interface AuditLogsPage {
  logs: AuditLogRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuditLogsParams {
  page: number;
  /** Case-insensitive contains-match on the action, e.g. "suspend". */
  action?: string;
  entity?: string;
  orgId?: string;
}

export function useAuditLogs(params: AuditLogsParams) {
  return useQuery({
    queryKey: ['console', 'platform', 'audit-logs', params],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(params.page), limit: '20' });
      if (params.action) q.set('action', params.action);
      if (params.entity) q.set('entity', params.entity);
      if (params.orgId) q.set('orgId', params.orgId);
      return unwrapEnvelope<AuditLogsPage>(await api().get(`/api/admin/platform/audit-logs?${q.toString()}`));
    },
    staleTime: 30_000,
  });
}
