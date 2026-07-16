'use client';

/** Platform · Audit Log (KAB-176): every successful mutation on the platform —
 *  who did what, where, when — from /api/admin/platform/audit-logs. Search
 *  matches the action (contains, e.g. "suspend"). Platform-admin only. */
import React from 'react';
import { Badge, PageHead } from '@/components/console/ui';
import { ListCard } from '@/components/console/ListCard';
import { useConsoleListState } from '@/lib/console/useConsoleListState';
import { useAuditLogs, type AuditLogRow } from '@/lib/console/platformAudit';

function actorName(log: AuditLogRow): string {
  if (!log.actor) return 'system';
  return [log.actor.firstName, log.actor.lastName].filter(Boolean).join(' ') || log.actor.email || log.actor.id;
}

function statusBadge(code: number | undefined) {
  if (code == null) return '—';
  return <Badge kind={code < 300 ? 'ok' : 'warn'}>{code}</Badge>;
}

export default function ConsoleAdminAuditLogsPage() {
  const { page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState();
  const { data, isPending, isError, refetch } = useAuditLogs({ page, action: search || undefined });

  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHead title="Audit Log" sub="Every mutation on the platform — who did what, when" />

      <ListCard
        title="Audit log"
        totalLabel={pagination ? `${pagination.total} total` : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={submitSearch}
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        totalItems={pagination?.total}
        onPageChange={gotoPage}
        isPending={isPending}
        isError={isError}
        isEmpty={!!data && data.logs.length === 0}
        emptyMessage={search ? `No actions match "${search}".` : 'No audit entries yet.'}
        errorMessage="Couldn't load the audit log."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Organization</th>
              <th className="num">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((log) => (
              <tr key={log.id}>
                <td className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="mono font-medium text-gray-800 dark:text-white/90">{log.action}</td>
                <td className="text-gray-500 dark:text-gray-400">
                  {log.entity}
                  {log.entityId && (
                    <span className="mono block text-xs text-[var(--text3)]" title={log.entityId}>
                      {log.entityId.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="text-gray-800 dark:text-white/90">{actorName(log)}</td>
                <td className="text-gray-500 dark:text-gray-400">{log.organization?.name ?? '—'}</td>
                <td className="num">{statusBadge(log.meta?.statusCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>
    </div>
  );
}
