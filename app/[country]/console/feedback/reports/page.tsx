'use client';

/** Console Feedback → Reports. Issue reports raised by drivers or operators
 *  (plug damage, card reader, safety, billing, …) with a status workflow —
 *  the customer-facing counterpart to Incidents' automated fault feed.
 *  Gated behind `view_feedback`; status changes further behind `manage_feedback`. */
import React from 'react';
import { Badge, Btn, Card, Icon, PageHead, Select, SummaryStrip, Tabs } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useUrlState } from '@/lib/console/useUrlState';
import {
  reportSeverityBadge,
  reportStatusBadge,
  useOrgReports,
  useUpdateReportStatus,
  type ReportSeverity,
  type ReportStatus,
} from '@/lib/console/feedback';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'resolved', label: 'Resolved' },
];
const SEVERITY_LABELS: Record<string, string> = { all: 'All severities', high: 'High', medium: 'Medium', low: 'Low' };
const SEVERITY_VALUES: Record<string, string> = { 'All severities': 'all', High: 'high', Medium: 'medium', Low: 'low' };

export default function ConsoleFeedbackReportsPage() {
  const { data: orgsData, isPending: orgsPending, isPlaceholderData } = useOrgs();
  const permsResolved = !!orgsData && !orgsPending && !isPlaceholderData;
  const allowed = orgsData?.isPlatformAdmin || hasPerm(orgsData, 'view_feedback');
  const canManage = !!orgsData?.isPlatformAdmin || hasPerm(orgsData, 'manage_feedback');
  const orgId = orgsData?.activeOrgId ?? null;

  const { get, set } = useUrlState({ status: 'all', severity: 'all' });
  const status = get('status') as ReportStatus | 'all';
  const severity = get('severity') as ReportSeverity | 'all';

  const { data, isPending } = useOrgReports(orgId, { status, severity });
  const update = useUpdateReportStatus(orgId);

  if (permsResolved && !allowed) return <AccessDenied title="Reports" />;

  const reports = data?.reports ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <PageHead title="Reports" sub="Issue reports raised by drivers or operators" />
      {!totals ? (
        <span className="kc-skeleton block h-24" />
      ) : (
        <SummaryStrip
          items={[
            { label: 'Open', value: totals.open, deltaKind: totals.open ? 'err' : 'ok' },
            { label: 'Investigating', value: totals.investigating, deltaKind: 'info' },
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
            {Array.from({ length: 4 }, (_, i) => <span key={i} className="kc-skeleton h-16 rounded" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No reports match this filter.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reports.map((r) => {
              const sev = reportSeverityBadge(r.severity);
              const st = reportStatusBadge(r.status);
              return (
                <div key={r.id} className="flex flex-col gap-1.5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge kind={sev.kind}>{sev.label}</Badge>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{r.category}</span>
                      <Badge kind={st.kind}>{st.label}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{r.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {r.chargerName && (
                        <span className="inline-flex items-center gap-1"><Icon name="station" size={12} /> {r.chargerName}</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Icon name={r.reporterType === 'operator' ? 'people' : 'user'} size={12} /> {r.reporterName}
                      </span>
                    </div>
                    {canManage && r.status !== 'resolved' && (
                      <div className="flex gap-1.5">
                        {r.status === 'open' && (
                          <Btn size="xs" onClick={() => update.mutate({ reportId: r.id, status: 'investigating' })} disabled={update.isPending}>
                            Investigate
                          </Btn>
                        )}
                        <Btn size="xs" variant="primary" onClick={() => update.mutate({ reportId: r.id, status: 'resolved' })} disabled={update.isPending}>
                          Resolve
                        </Btn>
                      </div>
                    )}
                    {canManage && r.status === 'resolved' && (
                      <Btn size="xs" variant="ghost" onClick={() => update.mutate({ reportId: r.id, status: 'open' })} disabled={update.isPending}>
                        Reopen
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
