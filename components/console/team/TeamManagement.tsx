'use client';

/** Team & users management (KAB-129): members table with inline role editing,
 *  a role→permissions explanation (KAB-126), invite / resend / revoke (KAB-125)
 *  and remove-with-confirm. Mutating actions gate on `manage_members`; everyone
 *  else gets a read-only view. Guard/permission errors from the API surface as
 *  toasts (the data layer forwards the backend message). */
import React, { useMemo, useState } from 'react';
import { Avatar, Badge, Btn, Card, Icon, SearchBox, Select } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ManageAccessModal } from './ManageAccessModal';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import {
  ROLE_OPTIONS,
  permissionLabel,
  roleBadgeKind,
  roleLabel,
  inviteExpiryLabel,
  useInviteMember,
  useOrgInvitations,
  useOrgMembers,
  useOrgRoles,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateMemberRole,
  type OrgInvitation,
  type OrgMember,
  type OrgRole,
  type RolesAndPermissions,
} from '@/lib/console/team';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: Readonly<{ value: OrgRole; onChange: (r: OrgRole) => void; disabled?: boolean }>) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrgRole)}
      style={{
        padding: '4px 24px 4px 8px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: disabled ? 'transparent' : 'var(--surface)',
        color: 'var(--text)',
        fontSize: 12.5,
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        appearance: 'none',
      }}
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

/** Grouped list of what a role grants — the KAB-126 explanation. */
function RoleGrants({ role, catalog }: Readonly<{ role: OrgRole; catalog: RolesAndPermissions | undefined }>) {
  const entry = catalog?.roles.find((r) => r.role === role);
  if (!catalog || !entry) return null;
  const granted = new Set(entry.permissions);
  const groups = catalog.groups
    .map((g) => ({ label: g.label, perms: g.permissions.filter((p) => granted.has(p)) }))
    .filter((g) => g.perms.length > 0);
  return (
    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
      <div style={{ marginBottom: 6, color: 'var(--text3)' }}>{entry.description}</div>
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 4 }}>
          <span style={{ color: 'var(--text3)' }}>{g.label}: </span>
          {g.perms.map((p) => permissionLabel(catalog, p)).join(', ')}
        </div>
      ))}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
  pending,
  catalog,
}: Readonly<{
  onClose: () => void;
  onInvite: (email: string, role: OrgRole) => void;
  pending: boolean;
  catalog: RolesAndPermissions | undefined;
}>) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('VIEWER');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'default' }}
      />
      <form
        className="kc-fadeup"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) onInvite(email.trim(), role);
        }}
        style={{
          position: 'relative', width: 460, maxWidth: 'calc(100vw - 32px)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', padding: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 4 }}>Invite a teammate</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 16 }}>
          They&apos;ll get an email link to join this organization.
        </div>
        <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          autoFocus
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--bg-0)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', marginBottom: 14,
          }}
        />
        <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text2)', marginBottom: 6 }}>Role</label>
        <div style={{ marginBottom: 12 }}>
          <RoleSelect value={role} onChange={setRole} />
        </div>
        <div
          style={{
            marginBottom: 18, padding: 10, borderRadius: 8, background: 'var(--sunken)',
            border: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto',
          }}
        >
          <RoleGrants role={role} catalog={catalog} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn size="sm" onClick={onClose} type="button">
            Cancel
          </Btn>
          <Btn size="sm" variant="primary" type="submit" loading={pending} icon="plus">
            Send invite
          </Btn>
        </div>
      </form>
    </div>
  );
}

/** Shared confirm dialog (modal chrome + danger action) for destructive team
 *  actions — remove member / revoke invitation. */
export function TeamManagement() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_members');

  const members = useOrgMembers(orgId);
  const invitations = useOrgInvitations(orgId);
  const roles = useOrgRoles(orgId);
  const invite = useInviteMember(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const revoke = useRevokeInvitation(orgId);
  const resend = useResendInvitation(orgId);

  const [showInvite, setShowInvite] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<OrgMember | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OrgInvitation | null>(null);
  const [accessTarget, setAccessTarget] = useState<OrgMember | null>(null);

  // Search + filters (client-side over the loaded member list).
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const allMembers = useMemo(() => members.data?.members ?? [], [members.data]);
  const memberRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMembers.filter((m) => {
      if (roleFilter !== 'All roles' && roleLabel(m.role) !== roleFilter) return false;
      if (statusFilter === 'Active' && m.status !== 'ACTIVE') return false;
      if (statusFilter === 'Suspended' && m.status !== 'SUSPENDED') return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [allMembers, search, roleFilter, statusFilter]);
  const filtersActive = search.trim() !== '' || roleFilter !== 'All roles' || statusFilter !== 'All statuses';

  const pendingInvites = invitations.data?.invitations ?? [];
  const catalog = roles.data;
  const colSpanActions = useMemo(() => (canManage ? 1 : 0), [canManage]);

  return (
    <div>
      <Card
        title="Members"
        pad={false}
        style={{ marginBottom: 16 }}
        action={
          canManage ? (
            <Btn size="sm" variant="primary" icon="plus" onClick={() => setShowInvite(true)}>
              Invite
            </Btn>
          ) : undefined
        }
      >
        {members.isPending ? (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="kc-skeleton" style={{ height: 40, borderRadius: 6 }} />
            ))}
          </div>
        ) : members.isError ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
            Couldn&apos;t load members.
          </div>
        ) : (
          <>
          {canManage ? (
            <div style={{ padding: '10px 14px 0', fontSize: 12, color: 'var(--text3)' }}>
              Use the <b>role</b> dropdown to assign a member&apos;s role, or <b>Access</b> to fine-tune
              and reduce an individual&apos;s permissions below their role.
            </div>
          ) : null}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone…" />
            </div>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={['All roles', ...ROLE_OPTIONS.map((r) => r.label)]}
              style={{ width: 150 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={['All statuses', 'Active', 'Suspended']}
              style={{ width: 150 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
              {memberRows.length} of {allMembers.length}
            </span>
          </div>
          <table className="kc-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last active</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {memberRows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={m.name} size={28} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 500 }}>{m.name}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text3)' }}>
                          {m.email ?? m.phone ?? '—'}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {canManage ? (
                        <RoleSelect
                          value={m.role}
                          disabled={updateRole.isPending && updateRole.variables?.userId === m.userId}
                          onChange={(role) => {
                            if (role !== m.role) updateRole.mutate({ userId: m.userId, role });
                          }}
                        />
                      ) : (
                        <Badge kind={roleBadgeKind(m.role)}>{roleLabel(m.role)}</Badge>
                      )}
                      {m.hasCustomAccess ? (
                        <span title="Permissions customized away from the role default">
                          <Badge kind="info">custom access</Badge>
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    {m.status === 'ACTIVE' ? (
                      <Badge kind="ok" dot>
                        active
                      </Badge>
                    ) : (
                      <Badge kind="neutral">suspended</Badge>
                    )}
                  </td>
                  <td style={{ color: 'var(--text3)' }}>{fmtDate(m.joinedAt)}</td>
                  <td style={{ color: 'var(--text3)' }}>{fmtDate(m.lastActive)}</td>
                  {canManage ? (
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.role !== 'ORG_OWNER' ? (
                        <span title={`Assign permissions / reduce access for ${m.name}`} style={{ marginRight: 6 }}>
                          <Btn size="xs" icon="key" onClick={() => setAccessTarget(m)}>
                            Access
                          </Btn>
                        </span>
                      ) : null}
                      {m.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          aria-label={`Remove ${m.name}`}
                          title="Remove member"
                          onClick={() => setConfirmTarget(m)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'inline-flex' }}
                        >
                          <Icon name="x" size={15} />
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
              {memberRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + colSpanActions} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
                    {filtersActive ? 'No members match your filters.' : 'No members yet.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </>
        )}
      </Card>

      {canManage ? (
        <Card title="Pending invitations" pad={false}>
          {invitations.isPending ? (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 2 }, (_, i) => (
                <span key={i} className="kc-skeleton" style={{ height: 40, borderRadius: 6 }} />
              ))}
            </div>
          ) : invitations.isError ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
              Couldn&apos;t load invitations.
            </div>
          ) : (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Invited by</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>
                    <Badge kind={roleBadgeKind(inv.role)}>{roleLabel(inv.role)}</Badge>
                  </td>
                  <td style={{ color: 'var(--text2)' }}>{inv.invitedBy}</td>
                  <td style={{ color: 'var(--text3)' }} title={fmtDate(inv.expiresAt)}>
                    {inviteExpiryLabel(inv.expiresAt)}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Btn
                      size="xs"
                      icon="refresh"
                      onClick={() => resend.mutate(inv.id)}
                      disabled={resend.isPending && resend.variables === inv.id}
                      style={{ marginRight: 6 }}
                    >
                      Resend
                    </Btn>
                    <Btn
                      size="xs"
                      onClick={() => setRevokeTarget(inv)}
                      // Disable every Revoke while a confirm is open or a revoke
                      // is in flight, so a second one can't be started or retarget
                      // the dialog.
                      disabled={revoke.isPending || !!revokeTarget}
                    >
                      Revoke
                    </Btn>
                  </td>
                </tr>
              ))}
              {pendingInvites.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
                    No pending invitations.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          )}
        </Card>
      ) : null}

      {showInvite ? (
        <InviteModal
          pending={invite.isPending}
          catalog={catalog}
          onClose={() => setShowInvite(false)}
          onInvite={(email, role) => invite.mutate({ email, role }, { onSuccess: () => setShowInvite(false) })}
        />
      ) : null}

      {confirmTarget ? (
        <ConfirmDialog
          title={`Remove ${confirmTarget.name}?`}
          body="They'll lose access to this organization. Their membership is suspended and can be restored by re-inviting them."
          confirmLabel="Remove member"
          pending={removeMember.isPending}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() =>
            removeMember.mutate(confirmTarget.userId, { onSettled: () => setConfirmTarget(null) })
          }
        />
      ) : null}

      {revokeTarget ? (
        <ConfirmDialog
          title="Revoke invitation?"
          body={<>The invite to <b>{revokeTarget.email}</b> will stop working immediately. You can always send a new one.</>}
          confirmLabel="Revoke invitation"
          pending={revoke.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() =>
            revoke.mutate(revokeTarget.id, { onSettled: () => setRevokeTarget(null) })
          }
        />
      ) : null}

      {accessTarget && orgId ? (
        <ManageAccessModal member={accessTarget} orgId={orgId} onClose={() => setAccessTarget(null)} />
      ) : null}
    </div>
  );
}
