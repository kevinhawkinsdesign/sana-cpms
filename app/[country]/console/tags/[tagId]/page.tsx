'use client';

/** Console Tag detail (Kabisa Tags & Operations plan, 3a): who holds the tag,
 *  where it works (org-wide or scoped sites), and recent authorizations. Scope
 *  drives which chargers receive the tag via Send Local List. Wired to the Tags
 *  API (lib/console/tags.ts) — edit/assign/scope go through the edit modal;
 *  block & delete are inline. */
import React from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge, Btn, Card, Icon, PageHead, useConsoleNav } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { TagFormModal } from '@/components/console/tags/TagFormModal';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useTag, useUpdateTag, useDeleteTag, tagWriteError, tagStatusBadge } from '@/lib/console/tags';

const AUTH_BADGE = { Accepted: 'ok', Blocked: 'err', Rejected: 'err' } as const;

export default function ConsoleTagDetailPage() {
  const params = useParams<{ country: string; tagId: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData, isPending: orgsPending, isPlaceholderData } = useOrgs();
  // Decide access only once perms resolve (placeholder data would flash AccessDenied).
  const permsResolved = !!orgsData && !orgsPending && !isPlaceholderData;
  const allowed = orgsData?.isPlatformAdmin || hasPerm(orgsData, 'manage_tags');

  const base = `/${params.country}/console`;
  const tagId = decodeURIComponent(params.tagId);
  const orgId = orgsData?.activeOrgId ?? null;
  const { tag, authorizations } = useTag(tagId);

  const update = useUpdateTag(tagId);
  const del = useDeleteTag();
  const [showEdit, setShowEdit] = React.useState(false);

  const toggleBlock = () => {
    if (!orgId) return;
    const next = tag?.status === 'blocked' ? 'active' : 'blocked';
    update.mutate(
      { status: next },
      {
        onSuccess: () => toast.success(next === 'blocked' ? 'Tag blocked' : 'Tag unblocked'),
        onError: (e) => toast.error(tagWriteError(e, 'Could not change the tag status')),
      },
    );
  };

  const confirmDelete = () => {
    if (!orgId) return;
    toast('Delete this tag?', {
      description: 'It will be blocked in CitrineOS and removed from the registry.',
      action: {
        label: 'Delete',
        onClick: () =>
          del.mutate(tagId, {
            onSuccess: () => {
              toast.success('Tag deleted');
              navigate(`${base}/tags`);
            },
            onError: (e) => toast.error(tagWriteError(e, 'Could not delete the tag')),
          }),
      },
    });
  };

  if (permsResolved && !allowed) return <AccessDenied title="Tags" />;

  if (!tag) {
    return (
      <div className="space-y-4 p-6">
        <PageHead title="Tag not found" crumb="Tags" back onBack={() => navigate(`${base}/tags`)} />
        <Card className="p-6 text-center text-sm text-gray-400">This tag doesn&apos;t exist.</Card>
      </div>
    );
  }

  const sb = tagStatusBadge(tag.status);
  const blocked = tag.status === 'blocked';
  const sites = tag.scope === 'all' ? [] : tag.scope;

  return (
    <div className="space-y-4 p-6">
      <PageHead
        title={<span className="mono">{tag.idToken}</span>}
        sub={<span className="inline-flex items-center gap-2">{tag.label ?? 'Tag'}<Badge kind={sb.kind} dot>{sb.label}</Badge></span>}
        crumb="Tags"
        back
        onBack={() => navigate(`${base}/tags`)}
        actions={
          <div className="flex gap-2">
            <Btn variant={blocked ? 'secondary' : 'danger'} size="sm" icon="stop" onClick={toggleBlock} disabled={update.isPending || !orgId}>
              {blocked ? 'Unblock' : 'Block'}
            </Btn>
            <Btn variant="default" size="sm" icon="settings" onClick={() => setShowEdit(true)} disabled={!orgId}>Edit</Btn>
            <Btn variant="default" size="sm" icon="trash" onClick={confirmDelete} disabled={del.isPending || !orgId}>Delete</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
        <div className="flex flex-col gap-4">
          <Card title="Assignment" action={<Btn variant="default" size="xs" onClick={() => setShowEdit(true)}>Change</Btn>}>
            {tag.assignee ? (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#08294f] font-bold text-[#FFD400]">
                  {tag.assignee.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-white/90">{tag.assignee.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tag.assignee.kind === 'operator' ? 'Operator' : 'Team member'}
                    {tag.assignee.email ? ` · ${tag.assignee.email}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">Unassigned — anyone can use this tag where it&apos;s scoped.</div>
            )}
          </Card>

          <Card
            title="Where it works"
            action={tag.scope !== 'all' ? <Btn variant="default" size="xs" icon="plus" onClick={() => setShowEdit(true)}>Add site</Btn> : undefined}
          >
            {tag.scope === 'all' ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Icon name="globe" size={15} /> Authorize at every station in the org
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sites.map((s) => (
                  <div key={s} className="flex items-center gap-2 rounded-lg border border-[#e6ebf2] px-3 py-2 text-sm dark:border-[#2A2A2A]">
                    <Icon name="station" size={14} /> {s}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-400">
              Scoped stations receive this tag in their <span className="font-medium">local list</span> — keeping offline authorization in sync.
            </p>
          </Card>

          <Card title="Authorization" action={<Btn variant="default" size="xs" onClick={() => setShowEdit(true)}>Edit</Btn>}>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Tag type</dt>
                <dd className="mono text-gray-700 dark:text-gray-300">{tag.idTokenType ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Real-time auth</dt>
                <dd>
                  {tag.realTimeAuth === 'Allowed' ? (
                    <Badge kind="neutral">Cached only</Badge>
                  ) : tag.realTimeAuth === 'AllowedOffline' ? (
                    <Badge kind="warn" dot>Allow if offline</Badge>
                  ) : (
                    <Badge kind="ok" dot>Always verify</Badge>
                  )}
                </dd>
              </div>
              {tag.chargingPriority != null ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Charging priority</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{tag.chargingPriority}</dd>
                </div>
              ) : null}
              {tag.concurrentTransaction ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Concurrent</dt>
                  <dd className="text-gray-700 dark:text-gray-300">Allowed</dd>
                </div>
              ) : null}
              {tag.parentIdToken ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Parent tag</dt>
                  <dd className="mono text-gray-700 dark:text-gray-300">{tag.parentIdToken}</dd>
                </div>
              ) : null}
              {tag.language1 || tag.language2 ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Language</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{[tag.language1, tag.language2].filter(Boolean).join(' / ')}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-gray-400">
              {tag.realTimeAuth === 'Allowed'
                ? 'The charger trusts the cached status and never checks with us.'
                : tag.assignee
                ? 'Charging is verified live: refused while the assigned operator is checked out, the tag is blocked/expired, or out of scope.'
                : 'Charging is verified live on every charge against the tag’s status and scope.'}
            </p>
          </Card>
        </div>

        <Card title="Recent authorizations" pad={false}>
          <table className="kc-table">
            <thead>
              <tr><th>Time</th><th>Station</th><th className="num">Conn.</th><th>Result</th></tr>
            </thead>
            <tbody>
              {authorizations.map((a, i) => (
                <tr key={`${a.time}-${i}`}>
                  <td className="text-gray-500 dark:text-gray-400">{a.time}</td>
                  <td className="text-gray-700 dark:text-gray-300">{a.station}</td>
                  <td className="num mono">{a.connector}</td>
                  <td><Badge kind={AUTH_BADGE[a.result]} dot>{a.result}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {showEdit && orgId ? (
        <TagFormModal orgId={orgId} mode="edit" tag={tag} onClose={() => setShowEdit(false)} />
      ) : null}
    </div>
  );
}
