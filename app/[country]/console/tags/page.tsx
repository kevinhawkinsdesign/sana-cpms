'use client';

/** Console Tags registry (Kabisa Tags & Operations plan): standalone registry of
 *  RFID / ID tokens. Table-first & action-led — no KPI strip or page heading.
 *  Status + search filters, rows link to tag detail. Wired to the Tags API
 *  (lib/console/tags.ts); gated behind `manage_tags` (platform admins see it). */
import React from 'react';
import { useParams } from 'next/navigation';
import { Badge, Btn, Icon, Select, TableCard, rowNav, useConsoleNav } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { TagFormModal } from '@/components/console/tags/TagFormModal';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useUrlState } from '@/lib/console/useUrlState';
import { useOrgTags, tagScopeLabel, tagStatusBadge, type TagStatus } from '@/lib/console/tags';

const STATUS_TO_LABEL: Record<string, string> = { all: 'All', active: 'Active', blocked: 'Blocked' };
const LABEL_TO_STATUS: Record<string, string> = { All: 'all', Active: 'active', Blocked: 'blocked' };

export default function ConsoleTagsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData, isPending: orgsPending, isPlaceholderData } = useOrgs();
  // useOrgs seeds placeholder data (isPlatformAdmin:false, permissions:null), so
  // only decide access once the real perms have resolved — otherwise AccessDenied
  // flashes on every cold load.
  const permsResolved = !!orgsData && !orgsPending && !isPlaceholderData;
  const allowed = orgsData?.isPlatformAdmin || hasPerm(orgsData, 'manage_tags');

  const { get, set, setMany } = useUrlState({ status: 'all', q: '' });
  const status = get('status');
  const search = get('q');
  const [searchInput, setSearchInput] = React.useState(search);
  const [showCreate, setShowCreate] = React.useState(false);

  const { tags } = useOrgTags();
  const orgId = orgsData?.activeOrgId ?? null;
  const base = `/${params.country}/console`;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tags.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        t.idToken.toLowerCase().includes(q) ||
        (t.label ?? '').toLowerCase().includes(q) ||
        (t.assignee?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [tags, status, search]);

  if (permsResolved && !allowed) {
    return <AccessDenied title="Tags" />;
  }

  return (
    <div className="space-y-4 p-6">
      <TableCard
        title="Tags"
        totalLabel={`${filtered.length} tag${filtered.length !== 1 ? 's' : ''}`}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setMany({ q: searchInput.trim() })}
        action={
          <div className="flex items-center gap-2">
            <Select
              options={['All', 'Active', 'Blocked']}
              value={STATUS_TO_LABEL[status] ?? 'All'}
              onChange={(label) => set('status', LABEL_TO_STATUS[label] ?? 'all')}
              style={{ width: 130 }}
            />
            <Btn
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => setShowCreate(true)}
            >
              Add tag
            </Btn>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="p-7 text-center text-sm text-gray-400">
            {search ? `No tags match "${search}".` : 'No tags yet.'}
          </div>
        ) : (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Tag ID</th>
                <th>Label</th>
                <th>Assigned to</th>
                <th>Scope</th>
                <th>Last used</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const sb = tagStatusBadge(t.status as TagStatus);
                return (
                  <tr key={t.id} {...rowNav(() => navigate(`${base}/tags/${encodeURIComponent(t.id)}`))}>
                    <td>
                      <span className="mono font-medium text-gray-800 dark:text-white/90">{t.idToken}</span>
                    </td>
                    <td className="text-gray-700 dark:text-gray-300">{t.label ?? '—'}</td>
                    <td className="text-gray-500 dark:text-gray-400">
                      {t.assignee ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name={t.assignee.kind === 'operator' ? 'people' : 'shield'} size={13} />
                          {t.assignee.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="text-gray-500 dark:text-gray-400">{tagScopeLabel(t.scope)}</td>
                    <td className="text-gray-500 dark:text-gray-400">{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'never'}</td>
                    <td><Badge kind={sb.kind} dot>{sb.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>

      {showCreate && orgId ? (
        <TagFormModal
          orgId={orgId}
          mode="create"
          onClose={() => setShowCreate(false)}
          onCreated={(t) => navigate(`${base}/tags/${encodeURIComponent(t.id)}`)}
        />
      ) : null}
    </div>
  );
}
