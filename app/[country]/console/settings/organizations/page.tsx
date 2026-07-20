'use client';

/** Platform · Organizations (KAB-163): cross-org directory via the new
 *  /api/admin/platform/organizations API (KAB-161). Server-paginated, filterable
 *  by status & plan. Row click → org detail (suspend / fee). Platform-admin only. */
import React from 'react';
import { useParams } from 'next/navigation';
import { Avatar, Badge, Btn, PageHead, Select, rowNav, useConsoleNav } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ClickableImage } from '@/components/console/ImageLightbox';
import { ListCard } from '@/components/console/ListCard';
import { OrgFormModal } from '@/components/console/platformAdmin/OrgFormModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState } from '@/lib/console/useConsoleListState';
import {
  usePlatformOrg,
  usePlatformOrgs,
  useSuspendOrg,
  useArchiveOrg,
  type PlatformOrg,
} from '@/lib/console/platformAdmin';

const STATUS_OPTIONS = ['All', 'Active', 'Suspended', 'Pending'] as const;
const STATUS_TO_PARAM: Record<string, string | undefined> = {
  All: undefined,
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
  Pending: 'PENDING_VERIFICATION',
};
const STATUS_FROM_PARAM: Record<string, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspended', PENDING_VERIFICATION: 'Pending' };

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge kind="ok">active</Badge>;
  if (status === 'SUSPENDED') return <Badge kind="err">suspended</Badge>;
  return <Badge kind="warn">{status.toLowerCase().replaceAll('_', ' ')}</Badge>;
}

export default function ConsoleAdminOrganizationsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { get, setMany, page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState({ status: '', parent: '' });
  const status = get('status');
  const parent = get('parent');
  const [creating, setCreating] = React.useState(false);
  const [rowModal, setRowModal] = React.useState<{ kind: 'edit' | 'suspend' | 'archive'; org: PlatformOrg } | null>(null);
  const suspendOrg = useSuspendOrg();
  const archiveOrg = useArchiveOrg();

  const { data, isPending, isError, refetch } = usePlatformOrgs({
    page,
    search: search || undefined,
    status: status || undefined,
    parentOrgId: parent || undefined,
  });
  // Name for the sub-orgs filter chip (drill-in from an org detail's Sub-orgs card).
  const { data: parentOrg } = usePlatformOrg(parent || null);

  const base = `/${params.country}/console`;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHead
        title="Organizations"
        sub="Every organization on the platform"
        actions={
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>
            New organization
          </Btn>
        }
      />

      <ListCard
        title="Organizations"
        totalLabel={pagination ? `${pagination.total} total` : undefined}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={submitSearch}
        action={
          <span className="flex items-center gap-2">
            {parent && (
              <Btn size="xs" variant="secondary" icon="x" onClick={() => setMany({ parent: '', page: '1' })}>
                Sub-orgs of {parentOrg?.name ?? '…'}
              </Btn>
            )}
            <Select
              options={[...STATUS_OPTIONS]}
              value={STATUS_FROM_PARAM[status] ?? 'All'}
              onChange={(label) => setMany({ status: STATUS_TO_PARAM[label] ?? '', page: '1' })}
              style={{ width: 150 }}
            />
          </span>
        }
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        totalItems={pagination?.total}
        onPageChange={gotoPage}
        isPending={isPending}
        isError={isError}
        isEmpty={!!data && data.organizations.length === 0}
        emptyMessage={
          parent
            ? `${parentOrg?.name ?? 'This organization'} has no sub-organizations.`
            : search
              ? `No organizations match "${search}".`
              : 'No organizations.'
        }
        errorMessage="Couldn't load organizations."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th className="num">Members</th>
              <th className="num">Chargers</th>
              <th className="num">Fee</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.organizations.map((o) => (
              <tr key={o.id} {...rowNav(() => navigate(`${base}/settings/organizations/${o.id}`))}>
                <td>
                  <span className="flex items-center gap-2.5">
                    {o.logo ? (
                      <ClickableImage src={o.logo} title={`${o.name} logo`} className="h-7 w-7 rounded-full border border-[var(--border)] bg-white object-cover" />
                    ) : (
                      <Avatar name={o.name} />
                    )}
                    <span className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {o.name}{o.isParentOrganization && <span className="ml-2 text-xs text-[var(--text3)]">platform</span>}
                      </span>
                      {o.country && <span className="text-xs text-[var(--text3)]">{o.country.name}</span>}
                    </span>
                  </span>
                </td>
                <td className="capitalize text-gray-500 dark:text-gray-400">{o.plan.toLowerCase()}</td>
                <td className="num mono">{fmtNumber(o._count.users)}</td>
                <td className="num mono">{fmtNumber(o._count.chargers)}</td>
                <td className="num mono">{o.platformFeePercent != null ? `${o.platformFeePercent}%` : '—'}</td>
                <td>{statusBadge(o.status)}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    <Btn size="xs" variant="ghost" onClick={() => setRowModal({ kind: 'edit', org: o })}>Edit</Btn>
                    {o.status === 'SUSPENDED' ? (
                      <Btn
                        size="xs"
                        variant="ghost"
                        disabled={suspendOrg.isPending && suspendOrg.variables?.id === o.id}
                        onClick={() => suspendOrg.mutate({ id: o.id, suspend: false })}
                      >
                        Reactivate
                      </Btn>
                    ) : (
                      !o.isParentOrganization && (
                        <Btn size="xs" variant="ghost" onClick={() => setRowModal({ kind: 'suspend', org: o })}>Suspend</Btn>
                      )
                    )}
                    {!o.isParentOrganization && (
                      <Btn size="xs" variant="ghost" onClick={() => setRowModal({ kind: 'archive', org: o })}>Archive</Btn>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {rowModal?.kind === 'edit' && <OrgFormModal mode="edit" org={rowModal.org} onClose={() => setRowModal(null)} />}
      {rowModal?.kind === 'suspend' && (
        <ConfirmDialog
          title="Suspend organization?"
          body={<>Suspending <strong>{rowModal.org.name}</strong> blocks its access until reactivated.</>}
          confirmLabel="Suspend"
          pending={suspendOrg.isPending}
          onCancel={() => setRowModal(null)}
          onConfirm={() => suspendOrg.mutate({ id: rowModal.org.id, suspend: true }, { onSettled: () => setRowModal(null) })}
        />
      )}
      {rowModal?.kind === 'archive' && (
        <ConfirmDialog
          title="Archive organization?"
          body={
            <>
              Archiving removes <strong>{rowModal.org.name}</strong> from the platform. Only an empty organization — no
              chargers, members or sub-organizations — can be archived; suspend it instead to cut off access.
            </>
          }
          confirmLabel="Archive"
          pending={archiveOrg.isPending}
          onCancel={() => setRowModal(null)}
          onConfirm={() => archiveOrg.mutate(rowModal.org.id, { onSettled: () => setRowModal(null) })}
        />
      )}

      {creating && (
        <OrgFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onCreated={(o) => navigate(`${base}/settings/organizations/${o.id}`)}
        />
      )}
    </div>
  );
}
