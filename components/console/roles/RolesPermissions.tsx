'use client';

/** Roles & Permissions (KAB-126) — a read-only reference matrix of what each
 *  role can do. Role permission sets are FIXED defaults and can't be edited per
 *  org: to change what someone can access, change their role (Team), and to
 *  trim an individual below their role use Manage access. The Owner role holds
 *  the full catalog. */
import React, { useMemo, useState } from 'react';
import { Badge, Card, Icon, SearchBox } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { permissionLabel, roleBadgeKind, useOrgRoles } from '@/lib/console/team';

export function RolesPermissions() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const roles = useOrgRoles(orgId);
  const catalog = roles.data;

  // Permission search over the matrix rows (label or code).
  const [search, setSearch] = useState('');
  const filteredGroups = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    if (!q) return catalog.groups;
    return catalog.groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (key) => key.toLowerCase().includes(q) || permissionLabel(catalog, key).toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [catalog, search]);

  const sectionHead = (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 650 }}>Roles &amp; permissions</div>
      <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
        What each role can do — these are fixed defaults. To change someone&apos;s access, change their role
        in Team; to trim one person below their role, use Manage access.
      </div>
    </div>
  );

  if (roles.isPending || !catalog) {
    return (
      <div>
        {sectionHead}
        <span className="kc-skeleton" style={{ display: 'block', height: 360, maxWidth: 720 }} />
      </div>
    );
  }
  if (roles.isError) {
    return (
      <div>
        {sectionHead}
        <Card style={{ padding: 28, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          Couldn&apos;t load roles.
        </Card>
      </div>
    );
  }

  const roleCols = catalog.roles;
  const roleHas = (perms: readonly string[], perm: string) => perms.includes(perm);

  return (
    <div>
      {sectionHead}

      <div style={{ maxWidth: 360, marginBottom: 12 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search permissions…" />
      </div>

      <Card pad={false}>
        <div style={{ overflowX: 'auto' }}>
          <table className="kc-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Permission</th>
                {roleCols.map((r) => (
                  <th key={r.role} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Badge kind={roleBadgeKind(r.role)}>{r.label}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={1 + roleCols.length} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
                    No permissions match “{search}”.
                  </td>
                </tr>
              ) : null}
              {filteredGroups.map((g) => (
                <React.Fragment key={g.key}>
                  <tr>
                    <td
                      colSpan={1 + roleCols.length}
                      style={{ fontWeight: 600, color: 'var(--text2)', background: 'var(--sunken)' }}
                    >
                      {g.label}
                    </td>
                  </tr>
                  {g.permissions.map((permKey) => (
                    <tr key={permKey}>
                      <td>{permissionLabel(catalog, permKey)}</td>
                      {roleCols.map((r) => (
                        <td key={r.role} style={{ textAlign: 'center' }}>
                          {roleHas(r.permissions, permKey) ? (
                            <span style={{ color: 'var(--ok, #16a34a)', display: 'inline-flex' }}>
                              <Icon name="check" size={14} />
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text3)' }}>·</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
