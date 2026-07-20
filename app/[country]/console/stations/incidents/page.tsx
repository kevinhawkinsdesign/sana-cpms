'use client';

/** Console Incidents — keep the network up and jump on time-sensitive faults.
 *  One place to see every open/acknowledged/resolved fault across stations &
 *  plugs, with elapsed time up front so a 47-minute-old critical fault reads
 *  differently from a 4-minute-old one. Acknowledge/Resolve write straight
 *  back into the same fault feed Overview and Stations already read from
 *  (lib/mock/handlers/console.ts), so this is the one place to act on them.
 *  Gated behind `view_incidents`; actions further behind `manage_incidents`. */
import React from 'react';
import { Badge, Btn, Card, Icon, PageHead, Select, SummaryStrip, Tabs } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useUrlState } from '@/lib/console/useUrlState';
import {
  errorCodeLabel,
  fmtElapsedShort,
  incidentSeverityBadge,
  incidentStatusBadge,
  useOrgIncidents,
  useUpdateIncidentStatus,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/lib/console/incidents';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
];
const SEVERITY_LABELS: Record<string, string> = { all: 'All severities', critical: 'Critical', warning: 'Warning', info: 'Info' };
const SEVERITY_VALUES: Record<string, string> = { 'All severities': 'all', Critical: 'critical', Warning: 'warning', Info: 'info' };

export default function ConsoleIncidentsPage() {
  const { data: orgsData, isPending: orgsPending, isPlaceholderData } = useOrgs();
  const permsResolved = !!orgsData && !orgsPending && !isPlaceholderData;
  const allowed = orgsData?.isPlatformAdmin || hasPerm(orgsData, 'view_incidents');
  const canManage = !!orgsData?.isPlatformAdmin || hasPerm(orgsData, 'manage_incidents');
  const orgId = orgsData?.activeOrgId ?? null;

  const { get, set } = useUrlState({ status: 'all', severity: 'all' });
  const status = get('status') as IncidentStatus | 'all';
  const severity = get('severity') as IncidentSeverity | 'all';

  const { data, isPending } = useOrgIncidents(orgId, { status, severity });
  const update = useUpdateIncidentStatus(orgId);

  if (permsResolved && !allowed) return <AccessDenied title="Incidents" />;

  const incidents = data?.incidents ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <PageHead title="Incidents" sub="Every open, acknowledged, and resolved fault across stations and plugs" />
      {!totals ? (
        <span className="kc-skeleton block h-24" />
      ) : (
        <SummaryStrip
          items={[
            { label: 'Critical & open', value: totals.criticalOpen, deltaKind: totals.criticalOpen ? 'err' : 'ok', delta: totals.criticalOpen ? 'needs attention' : 'all clear' },
            { label: 'Open', value: totals.open, deltaKind: 'neutral' },
            { label: 'Acknowledged', value: totals.acknowledged, deltaKind: 'info' },
            { label: 'Resolved', value: totals.resolved, deltaKind: 'ok' },
          ]}
        />
      )}

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 pt-2 dark:border-gray-800">
          <Tabs tabs={STATUS_TABS} value={status} onChange={(id) => set('status', id)} style={{ border: 'none' }} />
          <div className="pb-2">
            <Select
              options={Object.keys(SEVERITY_VALUES)}
              value={SEVERITY_LABELS[severity] ?? 'All severities'}
              onChange={(label) => set('severity', SEVERITY_VALUES[label] ?? 'all')}
              style={{ width: 160 }}
            />
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }, (_, i) => <span key={i} className="kc-skeleton h-10 rounded" />)}
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No incidents match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Station · plug</th>
                  <th>Fault</th>
                  <th>Status</th>
                  <th>{status === 'resolved' ? 'Resolved' : 'Elapsed'}</th>
                  <th>By</th>
                  {canManage && <th className="num">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => {
                  const sev = incidentSeverityBadge(i.severity);
                  const st = incidentStatusBadge(i.status);
                  const urgent = i.status !== 'resolved' && i.severity === 'critical';
                  return (
                    <tr key={i.id}>
                      <td><Badge kind={sev.kind} dot>{sev.label}</Badge></td>
                      <td className="text-gray-700 dark:text-gray-300">
                        {i.chargerName ?? '—'}
                        {i.connectorId != null && <span className="text-gray-400"> · Gun {i.connectorId}</span>}
                      </td>
                      <td className="text-gray-500 dark:text-gray-400">{errorCodeLabel(i.errorCode)}</td>
                      <td><Badge kind={st.kind}>{st.label}</Badge></td>
                      <td className={urgent ? 'mono font-medium text-red-500' : 'mono text-gray-500 dark:text-gray-400'}>
                        {fmtElapsedShort(i.elapsedMinutes)}
                        {urgent && i.elapsedMinutes >= 15 && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px]">
                            <Icon name="alert" size={11} /> SLA
                          </span>
                        )}
                      </td>
                      <td className="text-gray-500 dark:text-gray-400">{i.resolvedBy ?? i.acknowledgedBy ?? '—'}</td>
                      {canManage && (
                        <td className="num">
                          <div className="flex justify-end gap-1.5">
                            {i.status === 'open' && (
                              <Btn size="xs" onClick={() => update.mutate({ incidentId: i.id, status: 'acknowledged' })} disabled={update.isPending}>
                                Acknowledge
                              </Btn>
                            )}
                            {i.status !== 'resolved' && (
                              <Btn size="xs" variant="primary" onClick={() => update.mutate({ incidentId: i.id, status: 'resolved' })} disabled={update.isPending}>
                                Resolve
                              </Btn>
                            )}
                            {i.status === 'resolved' && (
                              <Btn size="xs" variant="ghost" onClick={() => update.mutate({ incidentId: i.id, status: 'open' })} disabled={update.isPending}>
                                Reopen
                              </Btn>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
