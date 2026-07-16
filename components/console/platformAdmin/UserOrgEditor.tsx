'use client';

/** Manage which organizations a user belongs to (platform-admin). Renders the
 *  user's orgs as removable chips plus an "Add" picker; each change hits the
 *  membership endpoints and refetches the directory. The home org (organizationId)
 *  is tinted and labelled. Shared by the users table (inline) and the edit modal.
 *  In read-only mode (blocked users, whose membership writes 404) it just lists
 *  the chips. */
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Icon, Select } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ROLE_OPTIONS, roleLabel, type OrgRole } from '@/lib/console/team';
import {
  useAllPlatformOrgs,
  useAddUserOrg,
  useRemoveUserOrg,
  defaultOrgRoleFor,
  type User,
} from '@/lib/console/platformAdmin';

const ROLE_LABELS = ROLE_OPTIONS.map((r) => r.label);
const LABEL_TO_ROLE: Record<string, OrgRole> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.label, r.value]));

type OrgRef = { id: string; name: string };
type PendingAction =
  | { kind: 'add'; org: OrgRef; role: OrgRole }
  | { kind: 'remove'; org: OrgRef };

function userLabel(u: User): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || 'this user';
}

export function UserOrgEditor({ user, editable = true }: Readonly<{ user: User; editable?: boolean }>) {
  const addOrg = useAddUserOrg();
  const removeOrg = useRemoveUserOrg();
  const busy = addOrg.isPending || removeOrg.isPending;
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  // The caller passes a live user (the page resolves it by id from the current
  // directory data, and re-renders on refetch), so chips stay fresh without a
  // cache lookup here.
  const orgs = user.organizations ?? [];

  const { data: allOrgs, isPending: orgsLoading } = useAllPlatformOrgs();
  const currentIds = new Set(orgs.map((o) => o.id));
  const available = (allOrgs ?? []).filter((o) => !currentIds.has(o.id));

  const runPending = () => {
    if (!pending) return;
    const done = { onSettled: () => setPending(null) };
    if (pending.kind === 'add') {
      addOrg.mutate({ id: user.id, orgId: pending.org.id, role: pending.role }, done);
    } else {
      removeOrg.mutate({ id: user.id, orgId: pending.org.id }, done);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {orgs.length === 0 && !editable && <span className="text-[var(--text3)]">—</span>}

      {orgs.map((o) => {
        const isHome = o.id === user.organizationId;
        return (
          <span
            key={o.id}
            title={isHome ? 'Home organization' : o.name}
            className={
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ' +
              (isHome
                ? 'bg-[#eaf0fa] text-[#1f4f8f] dark:bg-[#4561de]/15 dark:text-[#9fb3ee]'
                : 'bg-[#eef1f6] text-[#566882] dark:bg-white/10 dark:text-white/70')
            }
          >
            <span className="max-w-[140px] truncate">{o.name}</span>
            {editable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending({ kind: 'remove', org: o })}
                aria-label={`Remove ${o.name}`}
                className="ml-0.5 rounded-sm opacity-70 transition hover:opacity-100 hover:text-[#c0392b] disabled:opacity-30"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
        );
      })}

      {editable && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              disabled={busy}
              aria-label="Add organization"
              className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-gray-300 px-1.5 py-0.5 text-xs font-medium text-[var(--text3)] transition hover:border-[#08294f] hover:text-[#08294f] disabled:opacity-40 dark:border-gray-700 dark:hover:border-white/40 dark:hover:text-white"
            >
              <Icon name="plus" size={12} /> Add
            </button>
          </DropdownMenu.Trigger>
          {/* No Portal — console theme tokens are scoped to .kc-root. */}
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="kc-fadeup z-[60] w-[240px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-black"
          >
            <div className="max-h-[240px] overflow-y-auto">
              {orgsLoading ? (
                <div className="px-2 py-1.5 text-xs text-[var(--text3)]">Loading…</div>
              ) : available.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-[var(--text3)]">Already in every organization</div>
              ) : (
                available.map((o) => (
                  <DropdownMenu.Item
                    key={o.id}
                    onSelect={() => setPending({ kind: 'add', org: { id: o.id, name: o.name }, role: defaultOrgRoleFor(user.role) })}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <Icon name="building" size={14} style={{ color: 'var(--text3)' }} />
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  </DropdownMenu.Item>
                ))
              )}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'add' ? 'Add organization' : 'Remove organization'}
          body={
            pending.kind === 'add' ? (
              <span className="flex flex-col gap-2">
                <span>Add <b>{pending.org.name}</b> to <b>{userLabel(user)}</b> as:</span>
                <Select
                  options={ROLE_LABELS}
                  value={roleLabel(pending.role)}
                  onChange={(label) =>
                    setPending({ kind: 'add', org: pending.org, role: LABEL_TO_ROLE[label] ?? 'VIEWER' })
                  }
                  style={{ width: 160 }}
                />
              </span>
            ) : (
              <>
                Remove <b>{pending.org.name}</b> from <b>{userLabel(user)}</b>? They&apos;ll lose access to it.
              </>
            )
          }
          confirmLabel={pending.kind === 'add' ? 'Add' : 'Remove'}
          confirmVariant={pending.kind === 'add' ? 'primary' : 'danger'}
          confirmIcon={pending.kind === 'add' ? 'plus' : 'x'}
          pending={busy}
          onCancel={() => setPending(null)}
          onConfirm={runPending}
        />
      )}
    </span>
  );
}
