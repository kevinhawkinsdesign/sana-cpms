/** Shared org-role / permission metadata for the mock backend — single source
 *  for /api/auth/orgs (real gating, checked by the sidebar's hasPerm), the
 *  /api/orgs/:id/roles reference catalog (Settings → Roles & Permissions), and
 *  /api/orgs/:id/members/:userId/permissions (Manage access overrides). The
 *  permission keys here MUST match components/console/shell/nav.ts's `perm`
 *  strings exactly — that's the real gate the sidebar checks against. */

export type OrgRoleKey = 'ORG_OWNER' | 'ORG_ADMIN' | 'FINANCE' | 'OPERATOR' | 'VIEWER';

export const ALL_PERMISSIONS = [
  'view_dashboard',
  'view_chargers',
  'manage_tags',
  'manage_tariffs',
  'view_sessions',
  'view_incidents',
  'manage_incidents',
  'view_revenue',
  'view_feedback',
  'manage_feedback',
  'view_ebm',
  'manage_ebm',
  'view_shifts',
  'manage_members',
  'manage_org_settings',
  'manage_sub_orgs',
  'manage_fleets',
  'view_customers',
] as const;

export const PERMISSION_META: Record<(typeof ALL_PERMISSIONS)[number], { label: string; group: string; ownerOnly?: boolean }> = {
  view_dashboard: { label: 'View overview dashboard', group: 'overview' },
  view_chargers: { label: 'View stations', group: 'infrastructure' },
  manage_tags: { label: 'Manage RFID tags', group: 'infrastructure' },
  manage_tariffs: { label: 'Manage tariffs & rates', group: 'infrastructure' },
  view_sessions: { label: 'View charging sessions', group: 'sessions' },
  view_incidents: { label: 'View incidents & uptime', group: 'incidents' },
  manage_incidents: { label: 'Acknowledge & resolve incidents', group: 'incidents' },
  view_revenue: { label: 'View revenue & billing', group: 'business' },
  view_feedback: { label: 'View ratings, reviews & reports', group: 'feedback' },
  manage_feedback: { label: 'Respond to & resolve reports', group: 'feedback' },
  view_ebm: { label: 'View compliance (EBM)', group: 'compliance' },
  manage_ebm: { label: 'Manage EBM configuration', group: 'compliance' },
  view_shifts: { label: 'View operator shifts', group: 'people' },
  manage_members: { label: 'Manage team members', group: 'people' },
  manage_org_settings: { label: 'Manage organization settings', group: 'organization', ownerOnly: true },
  manage_sub_orgs: { label: 'Manage sub-organizations', group: 'organization', ownerOnly: true },
  manage_fleets: { label: 'Manage fleet & shop inventory', group: 'organization' },
  view_customers: { label: 'View customers & orders', group: 'organization' },
};

export const PERMISSION_GROUPS: Array<{ key: string; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'incidents', label: 'Incidents & Uptime' },
  { key: 'business', label: 'Business' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'people', label: 'People' },
  { key: 'organization', label: 'Organization' },
];

export const ROLE_META: Record<OrgRoleKey, { label: string; description: string }> = {
  ORG_OWNER: { label: 'Owner', description: 'Full access to everything, including billing and organization settings. Every org has exactly one.' },
  ORG_ADMIN: { label: 'Admin', description: 'Runs day-to-day operations — stations, sessions, incidents, feedback, team, and revenue. Cannot change org-level billing settings or manage sub-organizations.' },
  FINANCE: { label: 'Finance', description: 'Revenue, billing, and compliance reporting, plus read access to sessions and feedback. No station or team management.' },
  OPERATOR: { label: 'Operator', description: 'Field-facing role: sessions, shifts, stations, and incident response — acknowledging and resolving faults at sites they work.' },
  VIEWER: { label: 'Viewer', description: 'Read-only access across sessions, stations, revenue, compliance, incidents, and feedback. Can\'t make changes anywhere.' },
};

export const ROLE_PERMISSIONS: Record<OrgRoleKey, string[]> = {
  ORG_OWNER: [...ALL_PERMISSIONS],
  ORG_ADMIN: ALL_PERMISSIONS.filter((p) => p !== 'manage_sub_orgs'),
  FINANCE: ['view_dashboard', 'view_revenue', 'view_sessions', 'view_ebm', 'view_customers', 'view_feedback'],
  OPERATOR: ['view_dashboard', 'view_sessions', 'view_shifts', 'view_chargers', 'view_incidents', 'manage_incidents'],
  VIEWER: ['view_dashboard', 'view_sessions', 'view_chargers', 'view_revenue', 'view_ebm', 'view_incidents', 'view_feedback'],
};

export function rolePermissions(role: string | null | undefined): string[] {
  return ROLE_PERMISSIONS[(role as OrgRoleKey) ?? 'VIEWER'] ?? ROLE_PERMISSIONS.VIEWER;
}
