'use client';

/** UserDetailDrawer's Organizations section (KAB-179): manage a user's org
 *  memberships — add (org + role), change role, reactivate, remove — for active
 *  users. Every change is confirmed via ConfirmDialog. Blocked users (no detail)
 *  get a read-only org list. Role here is the OrgMembership role, distinct from
 *  the global User.role. */
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Badge, Btn, Icon, Select } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import type { OrgMember } from '@/lib/console/team';
import {
  useUserDetail,
  useAllPlatformOrgs,
  useAddUserOrg,
  useChangeUserOrg,
  useRemoveUserOrg,
  type User,
  type OrgMembershipRole,
} from '@/lib/console/platformAdmin';

/** Access management (permission override) targets one membership; the page
 *  renders ManageAccessModal at its level so the drawer's transform doesn't
 *  trap the modal's fixed overlay. */
export interface AccessTarget { member: OrgMember; orgId: string; orgName: string }

const ROLE_OPTIONS: { value: OrgMembershipRole; label: string }[] = [
  { value: 'ORG_OWNER', label: 'Owner' },
  { value: 'ORG_ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'VIEWER', label: 'Viewer' },
];
const ROLE_LABELS = ROLE_OPTIONS.map((o) => o.label);
const LABEL_TO_ROLE: Record<string, OrgMembershipRole> = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.label, o.value]));
const ROLE_TO_LABEL: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));

/** A membership change awaiting confirmation. */
type Pending =
  | { kind: 'add'; orgId: string; orgName: string; role: OrgMembershipRole }
  | { kind: 'remove'; orgId: string; orgName: string }
  | { kind: 'reactivate'; orgId: string; orgName: string }
  | { kind: 'role'; orgId: string; orgName: string; role: OrgMembershipRole };

const PENDING_TITLE: Record<Pending['kind'], string> = {
  add: 'Add organization',
  remove: 'Remove organization',
  reactivate: 'Reactivate membership',
  role: 'Change role',
};
const PENDING_LABEL: Record<Pending['kind'], string> = {
  add: 'Add',
  remove: 'Remove',
  reactivate: 'Reactivate',
  role: 'Change role',
};

function userLabel(u: User): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || 'this user';
}

function pendingBody(p: Pending, user: User): React.ReactNode {
  const org = <b>{p.orgName}</b>;
  const who = <b>{userLabel(user)}</b>;
  switch (p.kind) {
    case 'add':
      return <>Add {org} to {who} as <b>{ROLE_TO_LABEL[p.role]}</b>?</>;
    case 'remove':
      return <>Remove {org} from {who}? They&apos;ll lose access to it.</>;
    case 'reactivate':
      return <>Reactivate {who}&apos;s membership in {org}?</>;
    case 'role':
      return <>Change {who}&apos;s role in {org} to <b>{ROLE_TO_LABEL[p.role]}</b>?</>;
  }
}

export function UserMembershipsSection({
  user,
  editable,
  onOpenOrg,
  onManageAccess,
}: Readonly<{
  user: User;
  editable: boolean;
  onOpenOrg: (orgId: string) => void;
  onManageAccess: (target: AccessTarget) => void;
}>) {
  const { data: detail } = useUserDetail(user.isActive ? user.id : null);
  const { data: allOrgs } = useAllPlatformOrgs();
  const addOrg = useAddUserOrg();
  const changeOrg = useChangeUserOrg();
  const removeOrg = useRemoveUserOrg();
  const busy = addOrg.isPending || changeOrg.isPending || removeOrg.isPending;
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [addRole, setAddRole] = React.useState<OrgMembershipRole>('VIEWER');

  const runPending = () => {
    if (!pending) return;
    const done = { onSettled: () => setPending(null) };
    if (pending.kind === 'add') addOrg.mutate({ id: user.id, orgId: pending.orgId, role: pending.role }, done);
    else if (pending.kind === 'remove') removeOrg.mutate({ id: user.id, orgId: pending.orgId }, done);
    else if (pending.kind === 'reactivate') changeOrg.mutate({ id: user.id, orgId: pending.orgId, status: 'ACTIVE' }, done);
    else changeOrg.mutate({ id: user.id, orgId: pending.orgId, role: pending.role }, done);
  };

  // Blocked users (or non-editable): membership writes 404, so just list names.
  if (!editable || !user.isActive) {
    const orgs = user.organizations ?? [];
    if (orgs.length === 0) return <p className="py-1 text-sm text-[var(--text3)]">No organization.</p>;
    return (
      <div className="flex flex-col gap-0.5">
        {orgs.map((o) => (
          <div key={o.id} className="px-2 py-1 text-sm font-medium text-gray-800 dark:text-white/90">{o.name}</div>
        ))}
      </div>
    );
  }

  const memberships = detail?.memberships ?? [];
  const memberOrgIds = new Set(memberships.map((m) => m.organization.id));
  // A legacy home org (organizationId with no OrgMembership row) still appears
  // in the directory — surface it here too so the drawer matches the table.
  const homeOrg = (user.organizations ?? []).find((o) => o.id === user.organizationId);
  const homeOnly = homeOrg && !memberOrgIds.has(homeOrg.id) ? homeOrg : null;
  const available = (allOrgs ?? []).filter(
    (o) => !memberOrgIds.has(o.id) && o.id !== homeOnly?.id,
  );

  return (
    <div className="flex flex-col gap-1">
      {memberships.length === 0 && !homeOnly && (
        <p className="py-1 text-sm text-[var(--text3)]">No organization.</p>
      )}

      {homeOnly && (
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f7f9fc] dark:hover:bg-white/[.04]">
          <button type="button" onClick={() => onOpenOrg(homeOnly.id)} className="flex min-w-0 items-center gap-2 text-left">
            <span className="truncate font-medium text-gray-800 dark:text-white/90">{homeOnly.name}</span>
            <Badge kind="info">home</Badge>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setPending({ kind: 'remove', orgId: homeOnly.id, orgName: homeOnly.name })}
            aria-label={`Remove ${homeOnly.name}`}
            className="rounded-sm p-1 text-[var(--text3)] transition hover:text-[#c0392b] disabled:opacity-30"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {memberships.map((m) => {
        const isHome = m.organization.id === user.organizationId;
        const suspended = m.status !== 'ACTIVE';
        return (
          <div
            key={m.organization.id}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f7f9fc] dark:hover:bg-white/[.04]"
          >
            <button type="button" onClick={() => onOpenOrg(m.organization.id)} className="flex min-w-0 items-center gap-2 text-left">
              <span className="truncate font-medium text-gray-800 dark:text-white/90">{m.organization.name}</span>
              {isHome && <Badge kind="info">home</Badge>}
              {suspended && <Badge kind="warn">suspended</Badge>}
            </button>
            <span className="flex shrink-0 items-center gap-1.5">
              {suspended ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPending({ kind: 'reactivate', orgId: m.organization.id, orgName: m.organization.name })}
                  className="rounded-md px-2 py-1 text-xs font-medium text-[#1f7a45] transition hover:bg-[#e8f6ee] disabled:opacity-40 dark:hover:bg-[#1f7a45]/15"
                >
                  Reactivate
                </button>
              ) : (
                <>
                  <Select
                    options={ROLE_LABELS}
                    value={ROLE_TO_LABEL[m.role] ?? m.role}
                    onChange={(label) => {
                      const role = LABEL_TO_ROLE[label];
                      if (role && role !== m.role) {
                        setPending({ kind: 'role', orgId: m.organization.id, orgName: m.organization.name, role });
                      }
                    }}
                    style={{ width: 116 }}
                  />
                  {/* Owners hold every permission — nothing to reduce (matches Team). */}
                  {m.role !== 'ORG_OWNER' && (
                    <Btn
                      size="xs"
                      icon="key"
                      disabled={busy}
                      onClick={() =>
                        onManageAccess({
                          orgId: m.organization.id,
                          orgName: m.organization.name,
                          member: {
                            id: '',
                            userId: user.id,
                            name: userLabel(user),
                            email: user.email ?? null,
                            phone: user.phone ?? null,
                            imageUrl: null,
                            role: m.role as OrgMember['role'],
                            status: 'ACTIVE',
                            joinedAt: '',
                            lastActive: null,
                          },
                        })
                      }
                    >
                      Access
                    </Btn>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPending({ kind: 'remove', orgId: m.organization.id, orgName: m.organization.name })}
                    aria-label={`Remove ${m.organization.name}`}
                    className="rounded-sm p-1 text-[var(--text3)] transition hover:text-[#c0392b] disabled:opacity-30"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </>
              )}
            </span>
          </div>
        );
      })}

      {available.length > 0 && (
        <div className="mt-1 flex items-center gap-2 px-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-[var(--text3)] transition hover:border-[#0B4F42] hover:text-[#0B4F42] disabled:opacity-40 dark:border-gray-700 dark:hover:border-white/40 dark:hover:text-white"
              >
                <Icon name="plus" size={13} /> Add membership
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="kc-fadeup z-[60] w-[240px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-black"
            >
              <div className="max-h-[240px] overflow-y-auto">
                {available.map((o) => (
                  <DropdownMenu.Item
                    key={o.id}
                    onSelect={() => setPending({ kind: 'add', orgId: o.id, orgName: o.name, role: addRole })}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <Icon name="building" size={14} style={{ color: 'var(--text3)' }} />
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  </DropdownMenu.Item>
                ))}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <span className="text-xs text-[var(--text3)]">as</span>
          <Select
            options={ROLE_LABELS}
            value={ROLE_TO_LABEL[addRole]}
            onChange={(label) => setAddRole(LABEL_TO_ROLE[label] ?? 'VIEWER')}
            style={{ width: 116 }}
          />
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={PENDING_TITLE[pending.kind]}
          body={pendingBody(pending, user)}
          confirmLabel={PENDING_LABEL[pending.kind]}
          confirmVariant={pending.kind === 'remove' ? 'danger' : 'primary'}
          confirmIcon={pending.kind === 'remove' ? 'x' : pending.kind === 'add' ? 'plus' : 'check'}
          pending={busy}
          onCancel={() => setPending(null)}
          onConfirm={runPending}
        />
      )}
    </div>
  );
}
