'use client';

/** Platform · Users (KAB-163 + KAB-173 + KAB-177): cross-org user directory via
 *  /api/admin/users (+ /users/blocked — getAllUsers omits blocked accounts, so
 *  without that list a blocked user would vanish and Unblock be unreachable).
 *  Platform-admin only. The Active view is server-paginated (page / search /
 *  role / organization all filter server-side); the Blocked and All views merge
 *  the two endpoints and paginate client-side. Manages role / verification /
 *  block / trainee / autofill + org memberships inline or from the drill-in drawer. */
import React from 'react';
import { Avatar, Badge, Btn, PageHead, Select, SummaryStrip } from '@/components/console/ui';
import { ListCard } from '@/components/console/ListCard';
import { UserFormModal } from '@/components/console/platformAdmin/UserFormModal';
import { UserDetailDrawer } from '@/components/console/platformAdmin/UserDetailDrawer';
import { UserOrgEditor } from '@/components/console/platformAdmin/UserOrgEditor';
import { ManageAccessModal } from '@/components/console/team/ManageAccessModal';
import type { AccessTarget } from '@/components/console/platformAdmin/UserMembershipsSection';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ROLE_OPTIONS as ORG_ROLE_OPTIONS } from '@/lib/console/team';
import { fmtNumber } from '@/lib/console/dashboard';
import { useConsoleListState, paginate } from '@/lib/console/useConsoleListState';
import {
  usePlatformUsers,
  useAllPlatformOrgs,
  useBlockedUsers,
  useUpdateUser,
  useVerifyUser,
  useSetUserBlocked,
  useBulkAssignUsersOrg,
  usersForStatus,
  filterUsers,
  userName,
  defaultOrgRoleFor,
  entityOptions,
  type User,
  type OrgMembershipRole,
} from '@/lib/console/platformAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUTO_ROLE = 'Auto (by role)';
const BULK_ROLE_LABELS = [AUTO_ROLE, ...ORG_ROLE_OPTIONS.map((r) => r.label)];
const BULK_LABEL_TO_ROLE: Record<string, OrgMembershipRole> = Object.fromEntries(ORG_ROLE_OPTIONS.map((r) => [r.label, r.value]));

// Matches TableCard's default page-size label (Pagination's `pageSize`), so the
// "Showing X to Y" range lines up with the server slice.
const PAGE_SIZE = 10;
const ALL_ORGS = 'All organizations';
const STATUS_OPTIONS = ['Active', 'Blocked', 'All'] as const;
const ROLE_OPTIONS = ['All', 'Customer', 'Operator', 'Org Admin', 'Admin'] as const;
const ROLE_TO_PARAM: Record<string, string | undefined> = {
  All: undefined,
  Customer: 'CUSTOMER',
  Operator: 'OPERATOR',
  'Org Admin': 'ORGANIZATION_ADMIN',
  Admin: 'ADMIN',
};
const ROLE_FROM_PARAM: Record<string, string> = { CUSTOMER: 'Customer', OPERATOR: 'Operator', ORGANIZATION_ADMIN: 'Org Admin', ADMIN: 'Admin' };
const ROW_ROLE_OPTIONS = ['Customer', 'Operator', 'Org Admin', 'Admin'];

/** Role select config for one user. An unmapped role is shown verbatim (not
 *  mislabeled as Customer) and added as an option, so the displayed value is
 *  honest and re-selecting it is a no-op (it maps to no role code). */
function roleSelectFor(role: string): { value: string; options: string[] } {
  const label = ROLE_FROM_PARAM[role];
  return label ? { value: label, options: ROW_ROLE_OPTIONS } : { value: role, options: [...ROW_ROLE_OPTIONS, role] };
}

export default function ConsoleAdminUsersPage() {
  const { get, setMany, page, search, searchInput, setSearchInput, submitSearch, gotoPage } = useConsoleListState({ role: '', org: '', status: '' });
  const role = get('role');
  const status = get('status') || 'Active';

  // Org filter is id-backed (server takes organizationId). Guard a stale/non-id
  // ?org= so we never send a bad uuid to the API.
  const { data: allOrgs } = useAllPlatformOrgs();
  const orgList = React.useMemo(() => allOrgs ?? [], [allOrgs]);
  const orgSel = React.useMemo(() => entityOptions(orgList, ALL_ORGS), [orgList]);
  const orgIdSet = React.useMemo(() => new Set(orgList.map((o) => o.id)), [orgList]);
  const rawOrg = get('org');
  // Before the org list loads, trust a uuid-shaped ?org= so a deep link isn't
  // dropped (a bad value just yields no matches); once loaded, require a real org.
  const orgId = orgList.length === 0 ? (UUID_RE.test(rawOrg) ? rawOrg : '') : orgIdSet.has(rawOrg) ? rawOrg : '';

  const isServerPaged = status === 'Active';
  // Active → server page. All → full active set (server-filtered) for the merge.
  // Blocked → active list is unused, so keep the fetch tiny (its total still
  // feeds the "Active users" summary).
  const usersParams =
    status === 'Active'
      ? { page, limit: PAGE_SIZE, search: search || undefined, role: role || undefined, organizationId: orgId || undefined }
      : status === 'All'
        ? { search: search || undefined, role: role || undefined, organizationId: orgId || undefined }
        : { page: 1, limit: 1 };

  const { data: activeData, isPending: activePending, isError: activeError, isPlaceholderData: activeStale, refetch } = usePlatformUsers(usersParams);
  const { data: blockedUsers, isPending: blockedPending, isError: blockedError } = useBlockedUsers();
  const activeUsers = activeData?.users;
  const activePagination = activeData?.pagination;
  // Unfiltered active total for the summary stat (independent of search/filters).
  const { data: activeCount } = usePlatformUsers({ page: 1, limit: 1 });

  const updateUserM = useUpdateUser();
  const verifyM = useVerifyUser();
  const blockM = useSetUserBlocked();
  // Disable only the row whose mutation is in flight (not every row's buttons).
  const rowBusy = (id: string) =>
    (updateUserM.isPending && updateUserM.variables?.id === id) ||
    (verifyM.isPending && verifyM.variables === id) ||
    (blockM.isPending && blockM.variables?.id === id);

  const [creating, setCreating] = React.useState(false);
  // Store the opened user as a snapshot (not just an id) so the drawer/modal
  // survives a refetch that drops the user from the current page/filter.
  const [selectedSnap, setSelectedSnap] = React.useState<User | null>(null);
  const [editingSnap, setEditingSnap] = React.useState<User | null>(null);
  const [accessTarget, setAccessTarget] = React.useState<AccessTarget | null>(null);

  // Bulk assign: select users, then add them all to one org with a role.
  const bulkAssign = useBulkAssignUsersOrg();
  const [selected, setSelected] = React.useState<Map<string, User>>(new Map());
  const [bulkOrg, setBulkOrg] = React.useState('');
  const [bulkRoleLabel, setBulkRoleLabel] = React.useState(AUTO_ROLE);
  const [confirmBulk, setConfirmBulk] = React.useState(false);
  const selectedUsers = [...selected.values()];
  const toggleSelect = (u: User) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  const clearSelection = () => setSelected(new Map());
  const resolveBulkRole = (u: User): OrgMembershipRole =>
    bulkRoleLabel === AUTO_ROLE ? defaultOrgRoleFor(u.role) : BULK_LABEL_TO_ROLE[bulkRoleLabel] ?? 'VIEWER';
  const runBulkAssign = () =>
    bulkAssign.mutate(
      { orgId: bulkOrg, assignments: selectedUsers.map((u) => ({ userId: u.id, role: resolveBulkRole(u) })) },
      {
        onSuccess: () => { clearSelection(); setBulkOrg(''); setBulkRoleLabel(AUTO_ROLE); },
        onSettled: () => setConfirmBulk(false),
      },
    );
  // Drop the selection when the view (tab / filter / search) changes, so a bulk
  // action can never target a stale, no-longer-visible set of users.
  React.useEffect(() => {
    setSelected(new Map());
    setBulkOrg('');
  }, [status, search, role, orgId]);

  // Rows + paging: Active is server-paginated; Blocked/All merge + paginate here.
  let rows: User[];
  let safePage: number;
  let totalPages: number;
  let totalItems: number;
  if (isServerPaged) {
    rows = activeUsers ?? [];
    safePage = activePagination?.page ?? 1;
    totalPages = activePagination?.totalPages ?? 1;
    totalItems = activePagination?.total ?? rows.length;
  } else {
    const merged = usersForStatus(status, status === 'All' ? activeUsers : [], blockedUsers);
    const filtered = filterUsers(merged, search, role, orgId);
    const p = paginate(filtered, page, PAGE_SIZE);
    rows = p.pageItems;
    safePage = p.page;
    totalPages = p.totalPages;
    totalItems = filtered.length;
  }

  // 'All' merges the active list client-side, so a stale placeholder active
  // result (e.g. right after a tab switch) would show a wrong list — treat it as
  // loading. 'Active' keeps keepPreviousData's smooth server paging.
  const isPending =
    status === 'Blocked' ? blockedPending
    : status === 'All' ? activePending || blockedPending || activeStale
    : activePending;
  const isError = status === 'Blocked' ? blockedError : status === 'All' ? activeError || blockedError : activeError;

  // Bulk selection acts on active rows (add-membership 404s for blocked users).
  const pageActive = rows.filter((u) => u.isActive);
  const allPageSelected = pageActive.length > 0 && pageActive.every((u) => selected.has(u.id));
  const toggleAllPage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (allPageSelected) pageActive.forEach((u) => next.delete(u.id));
      else pageActive.forEach((u) => next.set(u.id, u));
      return next;
    });

  const activeTotal = activeCount?.pagination?.total ?? 0;
  const blocked = blockedUsers?.length ?? 0;
  const orgCount = orgList.length;

  // Prefer the freshest copy from the loaded rows (so the drawer/modal reflect
  // mutations immediately), but fall back to the opened snapshot so they never
  // vanish when a refetch drops the user from the current page/filter.
  const loaded = [...(activeUsers ?? []), ...(blockedUsers ?? [])];
  const selectedUser = selectedSnap ? loaded.find((u) => u.id === selectedSnap.id) ?? selectedSnap : null;
  const editing = editingSnap ? loaded.find((u) => u.id === editingSnap.id) ?? editingSnap : null;

  return (
    <div className="space-y-6">
      <PageHead
        title="Users"
        sub="Every user on the platform, across organizations"
        actions={
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setCreating(true)}>
            New user
          </Btn>
        }
      />

      <SummaryStrip
        items={[
          { label: 'Active users', value: fmtNumber(activeTotal) },
          { label: 'Organizations', value: fmtNumber(orgCount) },
          { label: 'Blocked', value: fmtNumber(blocked), deltaKind: blocked ? 'err' : 'neutral' },
        ]}
      />

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#dbe6f5] bg-[#f2f7fd] px-4 py-3 dark:border-[#2a3a52] dark:bg-[#141d2b]">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
            {selectedUsers.length} selected
          </span>
          <span className="text-sm text-[var(--text3)]">Assign to</span>
          <Select
            options={['Organization…', ...orgSel.labels.filter((l) => l !== ALL_ORGS)]}
            value={bulkOrg ? orgSel.labelForId(bulkOrg) : 'Organization…'}
            onChange={(label) => setBulkOrg(label === 'Organization…' ? '' : orgSel.idFor(label) ?? '')}
            style={{ width: 180 }}
          />
          <span className="text-sm text-[var(--text3)]">as</span>
          <Select options={BULK_ROLE_LABELS} value={bulkRoleLabel} onChange={setBulkRoleLabel} style={{ width: 150 }} />
          <span className="ml-auto flex items-center gap-2">
            <Btn size="sm" variant="ghost" onClick={clearSelection}>Clear</Btn>
            <Btn size="sm" variant="primary" icon="building" disabled={!bulkOrg} onClick={() => setConfirmBulk(true)}>
              Assign
            </Btn>
          </span>
        </div>
      )}

      <ListCard
        title="Users"
        totalLabel={`${totalItems} total`}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={submitSearch}
        action={
          <span className="flex gap-2">
            <Select
              options={[...STATUS_OPTIONS]}
              value={status}
              onChange={(label) => setMany({ status: label === 'Active' ? '' : label, page: '1' })}
              style={{ width: 110 }}
            />
            <Select
              options={[...ROLE_OPTIONS]}
              value={ROLE_FROM_PARAM[role] ?? 'All'}
              onChange={(label) => setMany({ role: ROLE_TO_PARAM[label] ?? '', page: '1' })}
              style={{ width: 130 }}
            />
            <Select
              options={orgSel.labels}
              value={orgSel.labelForId(orgId)}
              onChange={(label) => setMany({ org: orgSel.idFor(label) ?? '', page: '1' })}
              style={{ width: 180 }}
            />
          </span>
        }
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={gotoPage}
        isPending={isPending}
        isError={isError}
        isEmpty={rows.length === 0}
        emptyMessage={search || orgId || role ? 'No users match these filters.' : 'No users.'}
        errorMessage="Couldn't load users."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allPageSelected}
                  onChange={toggleAllPage}
                  disabled={pageActive.length === 0}
                  style={{ cursor: pageActive.length === 0 ? 'default' : 'pointer' }}
                />
              </th>
              <th>User</th>
              <th>Contact</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const roleSel = roleSelectFor(u.role);
              const rb = rowBusy(u.id);
              return (
              <tr key={u.id}>
                <td>
                  {u.isActive && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${userName(u)}`}
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                </td>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={userName(u)} />
                    <span className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-white/90">{userName(u)}</span>
                      {u.isTrainee && <span className="text-xs text-[var(--text3)]">Trainee</span>}
                    </span>
                  </span>
                </td>
                <td className="text-gray-500 dark:text-gray-400">{u.email || u.phone || '—'}</td>
                <td className="text-gray-500 dark:text-gray-400">
                  <UserOrgEditor user={u} editable={u.isActive} />
                </td>
                <td>
                  {u.isActive ? (
                    <Select
                      options={roleSel.options}
                      value={roleSel.value}
                      onChange={(label) => {
                        const next = ROLE_TO_PARAM[label];
                        if (next && next !== u.role) updateUserM.mutate({ id: u.id, data: { role: next } });
                      }}
                      style={{ width: 140 }}
                    />
                  ) : (
                    // Mutations 404 for blocked accounts — unblock first.
                    <span className="text-gray-500 dark:text-gray-400">{roleSel.value}</span>
                  )}
                </td>
                <td>{u.isVerified ? <Badge kind="ok">verified</Badge> : <Badge kind="neutral">no</Badge>}</td>
                <td>{u.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="err">blocked</Badge>}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    <Btn size="xs" variant="ghost" onClick={() => setSelectedSnap(u)}>View</Btn>
                    {u.isActive && (
                      <Btn size="xs" variant="ghost" disabled={rb} onClick={() => setEditingSnap(u)}>Edit</Btn>
                    )}
                    {!u.isVerified && u.isActive && (
                      <Btn size="xs" variant="ghost" disabled={rb} onClick={() => verifyM.mutate(u.id)}>Verify</Btn>
                    )}
                    <Btn size="xs" variant="ghost" disabled={rb} onClick={() => blockM.mutate({ id: u.id, blocked: u.isActive })}>
                      {u.isActive ? 'Block' : 'Unblock'}
                    </Btn>
                    {u.role === 'OPERATOR' && u.isActive && (
                      <>
                        <Btn size="xs" variant={u.isTrainee ? 'secondary' : 'ghost'} disabled={rb} onClick={() => updateUserM.mutate({ id: u.id, data: { isTrainee: !u.isTrainee } })}>Trainee</Btn>
                        <Btn size="xs" variant={u.autofillEnabled ? 'secondary' : 'ghost'} disabled={rb} onClick={() => updateUserM.mutate({ id: u.id, data: { autofillEnabled: !u.autofillEnabled } })}>Autofill</Btn>
                      </>
                    )}
                  </span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </ListCard>

      {creating && <UserFormModal onClose={() => setCreating(false)} />}
      {editing && <UserFormModal mode="edit" user={editing} onClose={() => setEditingSnap(null)} />}
      {selectedUser && (
        <UserDetailDrawer
          // Remount per user so drawer-local state (e.g. the add-membership role)
          // never carries over between users.
          key={selectedUser.id}
          user={selectedUser}
          onClose={() => setSelectedSnap(null)}
          // Hand off to the page-level edit modal — nesting a ModalShell inside
          // the drawer would trap its fixed overlay (kc-fadeup transform).
          onEdit={() => { setSelectedSnap(null); setEditingSnap(selectedUser); }}
          // Access management renders here (over the drawer) for the same reason.
          onManageAccess={setAccessTarget}
        />
      )}
      {accessTarget && (
        <ManageAccessModal
          member={accessTarget.member}
          orgId={accessTarget.orgId}
          onClose={() => setAccessTarget(null)}
        />
      )}
      {confirmBulk && (
        <ConfirmDialog
          title="Assign users to organization"
          body={
            <>
              Add <b>{selectedUsers.length}</b> user{selectedUsers.length === 1 ? '' : 's'} to{' '}
              <b>{orgSel.labelForId(bulkOrg)}</b>{' '}
              {bulkRoleLabel === AUTO_ROLE ? (
                <>with a role based on each user&apos;s current role</>
              ) : (
                <>as <b>{bulkRoleLabel}</b></>
              )}
              ?
            </>
          }
          confirmLabel="Assign"
          confirmVariant="primary"
          confirmIcon="building"
          pending={bulkAssign.isPending}
          onCancel={() => setConfirmBulk(false)}
          onConfirm={runBulkAssign}
        />
      )}
    </div>
  );
}
