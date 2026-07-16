'use client';

/** Manage access for a single member (KAB-126). Opens from the Team table.
 *  Access is DECREASE-ONLY: the toggles are exactly the member's role default
 *  permissions, and un-checking removes one. You can't grant beyond the role —
 *  to add more, change the member's role. Reset re-applies the role default.
 *  Guards mirror the backend: a permission the actor doesn't hold themselves
 *  can't be re-granted (no privilege escalation). */
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Btn, SearchBox } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { useOrgs } from '@/lib/console/orgs';
import {
  permissionLabel,
  roleBadgeKind,
  roleLabel,
  useMemberPermissions,
  useOrgRoles,
  useUpdateMemberPermissions,
  type OrgMember,
} from '@/lib/console/team';

export function ManageAccessModal({
  member,
  orgId,
  onClose,
}: Readonly<{ member: OrgMember; orgId: string; onClose: () => void }>) {
  const { data: orgsData } = useOrgs();
  const isPlatformAdmin = !!orgsData?.isPlatformAdmin;
  const roles = useOrgRoles(orgId);
  const memberPerms = useMemberPermissions(orgId, member.userId);
  const update = useUpdateMemberPermissions(orgId);
  const catalog = roles.data;

  // Permissions the actor holds — can't grant what you don't have (unless platform admin).
  const actorPerms = useMemo(() => new Set(orgsData?.permissions ?? []), [orgsData]);
  const canGrant = (key: string) => isPlatformAdmin || actorPerms.has(key);

  const [draft, setDraft] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (memberPerms.data) setDraft(new Set(memberPerms.data.permissions));
  }, [memberPerms.data]);

  const loading = roles.isPending || memberPerms.isPending || !draft || !catalog;

  // Decrease-only: the editable universe is the member's role default perms.
  // You can only remove from these — never add beyond the role.
  const roleDefaults = useMemo(
    () => new Set(catalog?.roles.find((r) => r.role === member.role)?.permissions ?? []),
    [catalog, member.role],
  );

  // Filter the role's permissions by a search (label or code).
  const [search, setSearch] = useState('');
  const filteredGroups = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (key) =>
            roleDefaults.has(key) &&
            (!q || key.toLowerCase().includes(q) || permissionLabel(catalog, key).toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [catalog, roleDefaults, search]);

  const dirty = useMemo(() => {
    if (!draft || !memberPerms.data) return false;
    const orig = new Set(memberPerms.data.permissions);
    return draft.size !== orig.size || [...draft].some((p) => !orig.has(p));
  }, [draft, memberPerms.data]);

  const toggle = (key: string) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = () => {
    if (!draft) return;
    update.mutate({ userId: member.userId, permissions: [...draft] }, { onSuccess: onClose });
  };
  const resetToRole = () =>
    update.mutate({ userId: member.userId, permissions: null }, { onSuccess: onClose });

  return (
    <ModalShell onClose={onClose}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Manage access</div>
          <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{member.name}</span>
            <Badge kind={roleBadgeKind(member.role)}>{roleLabel(member.role)}</Badge>
            {memberPerms.data?.customized ? <Badge kind="info">custom access</Badge> : null}
          </div>
        </div>

        <div style={{ padding: '14px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="kc-skeleton" style={{ height: 28, borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                These are the <b>{roleLabel(member.role)}</b> role&apos;s permissions. Un-check any to remove it
                for this member — access can only be reduced. To grant more, change their role. Reset re-applies
                the full role default.
              </div>
              <div style={{ marginBottom: 14 }}>
                <SearchBox value={search} onChange={setSearch} placeholder="Search permissions…" />
              </div>
              {filteredGroups.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--text3)' }}>
                  No permissions match “{search}”.
                </div>
              ) : null}
              {filteredGroups.map((g) => (
                <div key={g.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                    {g.label}
                  </div>
                  {g.permissions.map((key) => {
                    const checked = !!draft!.has(key);
                    // Can't re-grant a permission the actor doesn't hold (the
                    // backend rejects it) — but an already-granted one can still
                    // be un-checked to remove it.
                    const disabled = !canGrant(key) && !checked;
                    return (
                      <label
                        key={key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, padding: '5px 4px', fontSize: 13,
                          color: disabled ? 'var(--text3)' : 'var(--text)', cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(key)} />
                        <span style={{ flex: 1 }}>{permissionLabel(catalog, key)}</span>
                        {!canGrant(key) ? (
                          <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>you lack this</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Btn
            size="sm"
            variant="ghost"
            onClick={resetToRole}
            disabled={loading || update.isPending || !memberPerms.data?.customized}
          >
            Reset to role default
          </Btn>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Btn size="sm" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Btn>
            <Btn size="sm" variant="primary" icon="check" loading={update.isPending} disabled={loading || !dirty} onClick={save}>
              Save access
            </Btn>
          </span>
        </div>
    </ModalShell>
  );
}
