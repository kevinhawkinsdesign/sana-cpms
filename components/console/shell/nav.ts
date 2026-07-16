/** Console nav config (FE-2 / KAB-107). Single source for sidebar + ⌘K palette.
 *  Every item is perm-gated against GET /auth/orgs permissions (lib/console/orgs). */
import type { IconName } from '@/components/console/ui';
import { hasPerm, type OrgsData } from '@/lib/console/orgs';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Path under /{country}/console — '' is the Overview index. */
  path: string;
  perm: string;
  /** When set, the item is visible/allowed if the member holds ANY of these
   *  perms (used by aggregate pages like Settings that contain several
   *  sub-sections gated by different perms). Falls back to `perm` when absent. */
  anyPerm?: string[];
}

export interface NavGroup {
  group: string | null;
  items: NavItem[];
  /** When set, the whole group only shows for these active-org roles (platform
   *  admins see it too unless `strictRole` is set). */
  requireRole?: string[];
  /** When true, platform admins don't bypass `requireRole` — the group is
   *  visible only to the listed roles, period. Used for operator self-service
   *  pages that don't make sense for admins. */
  strictRole?: boolean;
  /** Platform scope (KAB-162): the group is visible ONLY to platform admins
   *  (KABISA / parent-org members — `data.isPlatformAdmin`), regardless of the
   *  active org role. Cross-org fleet & admin pages live here. */
  requirePlatformAdmin?: boolean;
}

// NB: this is a declarative config of uniform { id, label, icon, path, perm }
// records — Sonar's copy/paste detector flags the repeated shape as
// "duplication", which is noise for a config list, so nav.ts is listed under
// sonar.cpd.exclusions in .sonarcloud.properties.
/** Roles that see admin-facing console pages (everything except My Work). */
const ADMIN_ROLES = ['ORG_OWNER', 'ORG_ADMIN', 'FINANCE', 'VIEWER'];

export const NAV_GROUPS: NavGroup[] = [
  {
    group: null,
    requireRole: ADMIN_ROLES,
    items: [{ id: 'overview', label: 'Overview', icon: 'home', path: '', perm: 'view_dashboard' }],
  },
  {
    group: 'Infrastructure',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'stations', label: 'Stations', icon: 'station', path: '/stations', perm: 'view_chargers' },
      { id: 'sessions', label: 'Sessions', icon: 'bolt', path: '/sessions', perm: 'view_sessions' },
      { id: 'tags', label: 'Tags', icon: 'tag', path: '/tags', perm: 'manage_tags' },
      { id: 'tariffs', label: 'Tariffs & Rates', icon: 'tariff', path: '/tariffs', perm: 'manage_tariffs' },
    ],
  },
  {
    group: 'Business',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'revenue', label: 'Revenue & Billing', icon: 'money', path: '/revenue', perm: 'view_revenue' },
      { id: 'compliance', label: 'Compliance', icon: 'shield', path: '/compliance', perm: 'view_ebm' },
    ],
  },
  {
    group: 'EBM',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'proforma', label: 'Proforma EBM', icon: 'doc', path: '/ebm/proforma', perm: 'view_ebm' },
      { id: 'missing-ebm', label: 'Missing EBM', icon: 'alert', path: '/ebm/missing', perm: 'view_ebm' },
      { id: 'failed-ebm', label: 'Failed EBM', icon: 'refresh', path: '/ebm/failed', perm: 'view_ebm' },
      { id: 'plu-report', label: 'PLU Report', icon: 'doc', path: '/ebm/plu-report', perm: 'view_ebm' },
      { id: 'xz-reports', label: 'X/Z Reports', icon: 'doc', path: '/ebm/xz-reports', perm: 'view_ebm' },
      { id: 'sales-report', label: 'Sales Report', icon: 'money', path: '/ebm/sales-report', perm: 'view_ebm' },
    ],
  },
  {
    group: 'EBM Config',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'ebm-config', label: 'EBM Configuration', icon: 'settings', path: '/ebm/config', perm: 'manage_ebm' },
      { id: 'ebm-items', label: 'EBM Items', icon: 'doc', path: '/ebm/items', perm: 'manage_ebm' },
      { id: 'codes-sync', label: 'CIS / VSDC Codes', icon: 'refresh', path: '/ebm/codes-sync', perm: 'manage_ebm' },
      { id: 'vsdc-init', label: 'VSDC Initialization', icon: 'settings', path: '/ebm/vsdc-init', perm: 'manage_ebm' },
    ],
  },
  {
    group: 'People & Shifts',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'operators', label: 'Operators', icon: 'people', path: '/operators', perm: 'view_shifts' },
      { id: 'schedule', label: 'Schedule', icon: 'clock', path: '/schedule', perm: 'view_shifts' },
      { id: 'shifts', label: 'Shift Reports', icon: 'doc', path: '/shifts', perm: 'view_shifts' },
    ],
  },
  {
    group: 'Organization',
    requireRole: ADMIN_ROLES,
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        path: '/settings',
        perm: 'manage_org_settings',
        anyPerm: ['manage_org_settings', 'manage_members'],
      },
    ],
  },
  {
    group: 'Fleet',
    requirePlatformAdmin: true,
    items: [
      { id: 'admin-vehicles', label: 'Vehicles', icon: 'car', path: '/admin/vehicles', perm: 'manage_fleets' },
      { id: 'admin-shop-vehicles', label: 'Shop Vehicles', icon: 'tag', path: '/admin/shop-vehicles', perm: 'manage_fleets' },
      { id: 'admin-shop-orders', label: 'Shop Orders', icon: 'doc', path: '/admin/shop-orders', perm: 'view_customers' },
      { id: 'admin-vehicles-debt', label: 'Vehicles with Debt', icon: 'money', path: '/admin/vehicles-with-debt', perm: 'view_customers' },
      { id: 'admin-businesses', label: 'Businesses', icon: 'building', path: '/admin/businesses', perm: 'manage_fleets' },
    ],
  },
  {
    group: 'Platform Admin',
    requirePlatformAdmin: true,
    items: [
      { id: 'admin-organizations', label: 'Organizations', icon: 'building', path: '/admin/organizations', perm: 'manage_sub_orgs' },
      { id: 'admin-countries', label: 'Countries', icon: 'globe', path: '/admin/countries', perm: 'manage_org_settings' },
      { id: 'admin-users', label: 'Users', icon: 'people', path: '/admin/users', perm: 'manage_members' },
      { id: 'admin-audit', label: 'Audit Log', icon: 'shield', path: '/admin/audit-logs', perm: 'manage_org_settings' },
      { id: 'admin-citrine', label: 'Citrine Sync', icon: 'monitor', path: '/admin/citrine', perm: 'view_chargers' },
    ],
  },
  {
    group: 'My Work',
    requireRole: ['OPERATOR'],
    strictRole: true,
    items: [
      { id: 'me', label: 'Operator Dashboard', icon: 'home', path: '/me', perm: 'view_sessions' },
      { id: 'me-shifts', label: 'Check In / Out', icon: 'clock', path: '/me/shifts', perm: 'view_shifts' },
      { id: 'me-charge', label: 'Start / End Session', icon: 'bolt', path: '/me/charge', perm: 'view_sessions' },
      { id: 'me-transfer', label: 'My Sessions', icon: 'refresh', path: '/me/sessions', perm: 'view_sessions' },
    ],
  },
];

/** Visibility/route-guard test for a nav item: honours `anyPerm` (any-of) when
 *  present, else the single required `perm`. */
export function navItemAllowed(
  has: (perm: string) => boolean,
  item: Pick<NavItem, 'perm' | 'anyPerm'>,
): boolean {
  return item.anyPerm ? item.anyPerm.some(has) : has(item.perm);
}

/** Sidebar + ⌘K share this: perm-gate every item (honouring `anyPerm`),
 *  role-gate the group, drop empties. Platform admins bypass role gating
 *  (support/visibility). */
export function visibleNavGroups(data: OrgsData | undefined): NavGroup[] {
  const role = data?.activeOrg?.role ?? null;
  const has = (perm: string) => hasPerm(data, perm);
  return NAV_GROUPS
    .filter((g) => {
      // Platform-scope groups are visible only to platform admins, period.
      if (g.requirePlatformAdmin) return !!data?.isPlatformAdmin;
      if (!g.requireRole) return true;
      return (!g.strictRole && data?.isPlatformAdmin) || (role !== null && g.requireRole.includes(role));
    })
    .map((g) => ({ ...g, items: g.items.filter((item) => navItemAllowed(has, item)) }))
    .filter((g) => g.items.length > 0);
}

/** Sections inside the consolidated Settings area (/settings/*). Single source
 *  for the settings sub-nav, the ⌘K palette deep-links, and per-section guards.
 *  `segment` is appended to /settings ('' = the General index). */
export interface SettingsSection {
  id: string;
  label: string;
  group: 'Organization' | 'Access' | 'Finance';
  segment: string;
  perm: string;
  icon: IconName;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general', label: 'General', group: 'Organization', segment: '', perm: 'manage_org_settings', icon: 'settings' },
  { id: 'billing', label: 'Billing & Plan', group: 'Organization', segment: 'billing', perm: 'manage_org_settings', icon: 'money' },
  { id: 'team', label: 'Team & Members', group: 'Access', segment: 'team', perm: 'manage_members', icon: 'people' },
  { id: 'roles', label: 'Roles & Permissions', group: 'Access', segment: 'roles', perm: 'manage_members', icon: 'key' },
  { id: 'tax', label: 'Tax & EBM', group: 'Finance', segment: 'tax', perm: 'manage_org_settings', icon: 'doc' },
];

/** Ordered group headings for the settings sub-nav. */
export const SETTINGS_GROUPS: Array<SettingsSection['group']> = ['Organization', 'Access', 'Finance'];

/** Active-item test: overview matches the console index only; others match
 *  their subtree (e.g. /stations and /stations/ch-01). */
export function isNavActive(item: NavItem, consolePath: string): boolean {
  if (item.path === '') return consolePath === '' || consolePath === '/';
  return consolePath === item.path || consolePath.startsWith(`${item.path}/`);
}
