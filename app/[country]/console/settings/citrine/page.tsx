'use client';

/** Platform · Citrine Sync (KAB-163): live sync status + recent events from
 *  /api/admin/citrine. Read-only observability, polled every 15s. The status
 *  payload is a dynamic metrics snapshot, so it's flattened defensively.
 *  Platform-admin only. */
import React from 'react';
import { Btn, Card, PageHead } from '@/components/console/ui';
import { useCitrineStatus, useCitrineEvents, type CitrineEvent } from '@/lib/console/platformAdmin';

function flattenPrimitives(obj: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null) continue;
    if (Array.isArray(v)) out.push([key, `${v.length} items`]);
    else if (typeof v === 'object') out.push(...flattenPrimitives(v as Record<string, unknown>, key));
    else out.push([key, String(v)]);
  }
  return out;
}

function eventTime(e: CitrineEvent): string {
  const ts = e.at ?? e.ts ?? e.timestamp;
  return ts ? new Date(ts).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' }) : '—';
}

const META_KEYS = new Set(['type', 'kind', 'at', 'ts', 'timestamp', 'message']);

function eventDetail(e: CitrineEvent): string {
  if (e.message) return String(e.message);
  const rest = Object.fromEntries(Object.entries(e).filter(([k]) => !META_KEYS.has(k)));
  return Object.keys(rest).length ? JSON.stringify(rest) : '—';
}

export default function ConsoleAdminCitrinePage() {
  const status = useCitrineStatus();
  const events = useCitrineEvents(100);

  const metrics = status.data ? flattenPrimitives(status.data).slice(0, 24) : [];
  const rows = events.data?.events ?? [];

  return (
    <div className="space-y-6">
      <PageHead
        title="Citrine Sync"
        sub="Live sync status and recent events"
        actions={<Btn size="sm" variant="ghost" icon="refresh" onClick={() => { status.refetch(); events.refetch(); }}>Refresh</Btn>}
      />

      <Card title="Sync status" pad={false}>
        {status.isPending ? (
          <div className="p-5"><span className="kc-skeleton block" style={{ height: 120 }} /></div>
        ) : status.isError ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Couldn&apos;t load Citrine status.</div>
        ) : metrics.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No status metrics.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-[#eef1f6] py-1.5 text-sm dark:border-[#242424]">
                <span className="mono truncate text-[var(--text3)]">{k}</span>
                <span className="mono text-right text-gray-800 dark:text-white/90">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent events" pad={false} action={<span className="text-xs text-[var(--text3)]">{rows.length} shown</span>}>
        {events.isPending ? (
          <div className="p-5"><span className="kc-skeleton block" style={{ height: 120 }} /></div>
        ) : events.isError ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Couldn&apos;t load Citrine events.</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No events yet.</div>
        ) : (
          <table className="kc-table">
            <thead><tr><th>Type</th><th>Time</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-800 dark:text-white/90">{e.type ?? e.kind ?? '—'}</td>
                  <td className="mono text-gray-500 dark:text-gray-400">{eventTime(e)}</td>
                  <td className="mono truncate text-gray-500 dark:text-gray-400" style={{ maxWidth: 420 }}>{eventDetail(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
