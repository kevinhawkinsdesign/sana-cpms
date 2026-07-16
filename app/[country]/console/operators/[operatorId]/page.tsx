'use client';

/** Console Operator profile (FE-2 / KAB-140): profile, lifetime stats and
 *  recent activity for one operator. Org-scoped (404 → not in this org). */
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Badge, Btn, Card, PageHead, Stat } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { fmtNumber } from '@/lib/console/dashboard';
import { useOrgOperatorDetail } from '@/lib/console/operators';
import { useOperatorTags, tagScopeLabel, tagStatusBadge } from '@/lib/console/tags';
import { TagFormModal } from '@/components/console/tags/TagFormModal';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Report review badge (early-returns to avoid a nested ternary). */
function reportStatusBadge(r: { checkOutTime: string | null; isFlagged: boolean; isApproved: boolean }) {
  if (!r.checkOutTime) return <Badge kind="charge" dot pulse>on shift</Badge>;
  if (r.isFlagged) return <Badge kind="err">flagged</Badge>;
  if (r.isApproved) return <Badge kind="ok">approved</Badge>;
  return <Badge kind="neutral">pending</Badge>;
}

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{children}</span>
    </div>
  );
}

export default function ConsoleOperatorProfilePage() {
  const params = useParams<{ country: string; operatorId: string }>();
  const router = useRouter();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const { data, isPending, isError, refetch } = useOrgOperatorDetail(orgId, params.operatorId);
  const base = `/${params.country}/console`;
  // Tags held by this operator (Kabisa Tags plan — "Tags & access" card).
  const opTags = useOperatorTags(params.operatorId);
  const [showAssign, setShowAssign] = React.useState(false);

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHead title="Operator" crumb={<>Operators</>} back onBack={() => router.push(`${base}/operators`)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <span key={i} className="kc-skeleton" style={{ height: 90 }} />)}
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHead title="Operator" crumb={<>Operators</>} back onBack={() => router.push(`${base}/operators`)} />
        <Card>
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t load this operator.
            <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
          </div>
        </Card>
      </div>
    );
  }

  const { operator: op, stats, recentShifts, recentReports } = data;

  return (
    <div className="space-y-6">
      <PageHead
        title={op.name}
        crumb={<>Operators</>}
        back
        onBack={() => router.push(`${base}/operators`)}
        actions={op.status === 'active' ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Profile card */}
        <Card>
          <div className="flex flex-col items-center gap-3 pb-4 pt-2 text-center">
            <Avatar name={op.name} size={64} />
            <div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{op.name}</div>
              <div className="text-xs text-[var(--text3)]">{op.role}{op.isTrainee ? ' · Trainee' : ''}</div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 dark:border-white/5">
            <InfoRow label="Email">{op.email || '—'}</InfoRow>
            <InfoRow label="Phone">{op.phone || '—'}</InfoRow>
            <InfoRow label="Joined">{fmtDate(op.joinedAt)}</InfoRow>
            <InfoRow label="Last active">{fmtDate(stats.lastReportAt)}</InfoRow>
          </div>
        </Card>

        {/* Stats + activity */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Reports" value={fmtNumber(stats.totalReports)} sub={`${stats.completedReports} completed`} />
            <Stat label="Energy" value={<>{fmtNumber(stats.totalKwh)} <small>kWh</small></>} />
            <Stat label="Sessions" value={fmtNumber(stats.totalSessions)} />
            <Stat label="Review" value={`${stats.approvedReports} ✓`} sub={stats.flaggedReports ? `${stats.flaggedReports} flagged` : undefined} />
          </div>

          <Card
            title="Tags & access"
            action={
              <Btn
                variant="default"
                size="xs"
                icon="plus"
                onClick={() => setShowAssign(true)}
              >
                Assign tag
              </Btn>
            }
          >
            {opTags.length === 0 ? (
              <div className="px-2 py-5 text-center text-sm text-[var(--text3)]">No tags assigned.</div>
            ) : (
              <div className="flex flex-col">
                {opTags.map((t) => {
                  const sb = tagStatusBadge(t.status);
                  return (
                    <Link
                      key={t.id}
                      href={`${base}/tags/${encodeURIComponent(t.id)}`}
                      className="flex items-center gap-3 border-t border-gray-100 py-2.5 text-sm first:border-t-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <span className="mono font-medium text-gray-800 dark:text-white/90">{t.idToken}</span>
                      <span className="text-[var(--text3)]">· {tagScopeLabel(t.scope)}</span>
                      {t.status === 'blocked' && <Badge kind={sb.kind} dot>{sb.label}</Badge>}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Recent shifts">
            {recentShifts.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-[var(--text3)]">No shifts yet.</div>
            ) : (
              <table className="kc-table">
                <thead><tr><th>Date</th><th>Time</th><th>Charger</th></tr></thead>
                <tbody>
                  {recentShifts.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDate(s.shiftDate)}</td>
                      <td className="mono">{s.startTime || '—'}{s.endTime ? `–${s.endTime}` : ''}</td>
                      <td>{s.charger?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Recent reports">
            {recentReports.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-[var(--text3)]">No reports yet.</div>
            ) : (
              <table className="kc-table">
                <thead><tr><th>Checked in</th><th className="num">Energy</th><th className="num">Sessions</th><th>Status</th></tr></thead>
                <tbody>
                  {recentReports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`${base}/shifts/${r.id}`} className="text-gray-800 dark:text-white/90">
                          {fmtDateTime(r.checkInTime)}
                        </Link>
                      </td>
                      <td className="num mono">{fmtNumber(r.kwh)} <small>kWh</small></td>
                      <td className="num mono">{fmtNumber(r.sessions)}</td>
                      <td>{reportStatusBadge(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>

      {showAssign && orgId ? (
        <TagFormModal
          orgId={orgId}
          mode="create"
          defaultAssigneeUserId={params.operatorId}
          onClose={() => setShowAssign(false)}
        />
      ) : null}
    </div>
  );
}
