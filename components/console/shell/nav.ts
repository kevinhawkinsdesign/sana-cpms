/** Console nav config (FE-2 / KAB-107). Single source for sidebar + ⌘K palette.
 *  Every item is perm-gated against GET /auth/orgs permissions (lib/console/orgs). */
import type { IconName } from '@/components/console/ui';
import { hasPerm, type OrgsData } from '@/lib/console/orgs';
import type { ShellSection } from '@/components/console/SectionShell';

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
      { id: 'incidents', label: 'Incidents', icon: 'alert', path: '/incidents', perm: 'view_incidents' },
      { id: 'tags', label: 'Tags', icon: 'tag', path: '/tags', perm: 'manage_tags' },
      { id: 'tariffs', label: 'Tariffs & Rates', icon: 'tariff', path: '/tariffs', perm: 'manage_tariffs' },
    ],
  },
  {
    group: 'Feedback',
    requireRole: ADMIN_ROLES,
    items: [
      { id: 'feedback-reviews', label: 'Reviews', icon: 'star', path: '/feedback/reviews', perm: 'view_feedback' },
      { id: 'feedback-reports', label: 'Reports', icon: 'message', path: '/feedback/reports', perm: 'view_feedback' },
    ],
  },
  {
    group: 'Finance',
    requireRole: ADMIN_ROLES,
    items: [
      {
        id: 'ebm', label: 'Finance & EBM', icon: 'money', path: '/ebm',
        perm: 'view_ebm', anyPerm: ['view_ebm', 'manage_ebm', 'view_revenue'],
      },
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
      {
        id: 'admin-hub', label: 'Admin', icon: 'shield', path: '/admin',
        perm: 'manage_sub_orgs', anyPerm: ['manage_sub_orgs', 'manage_org_settings', 'manage_members', 'view_chargers'],
      },
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
      { id: 'me-incidents', label: 'Incidents', icon: 'alert', path: '/me/incidents', perm: 'view_incidents' },
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

/** Finance + EBM (KAB-…): Revenue & Billing and Compliance (previously their
 *  own top-level "Business" sidebar group) plus the 10 previously-separate
 *  EBM/EBM Config sidebar entries — all merged into one hub's sub-nav under
 *  /console/ebm (see SectionShell), matching the reference design's
 *  contiguous FINANCE / EBM / EBM CONFIG grouping. */
export const EBM_SECTIONS: ShellSection[] = [
  { id: 'ebm-revenue', label: 'Revenue & Billing', group: 'Finance', segment: 'revenue', perm: 'view_revenue' },
  { id: 'ebm-compliance', label: 'Compliance', group: 'Finance', segment: 'compliance', perm: 'view_ebm' },
  { id: 'ebm-proforma', label: 'Proforma EBM', group: 'EBM', segment: 'proforma', perm: 'view_ebm' },
  { id: 'ebm-missing', label: 'Missing EBM', group: 'EBM', segment: 'missing', perm: 'view_ebm' },
  { id: 'ebm-failed', label: 'Failed EBM', group: 'EBM', segment: 'failed', perm: 'view_ebm' },
  { id: 'ebm-plu-report', label: 'PLU Report', group: 'EBM', segment: 'plu-report', perm: 'view_ebm' },
  { id: 'ebm-xz-reports', label: 'X/Z Reports', group: 'EBM', segment: 'xz-reports', perm: 'view_ebm' },
  { id: 'ebm-sales-report', label: 'Sales Report', group: 'EBM', segment: 'sales-report', perm: 'view_ebm' },
  { id: 'ebm-config', label: 'EBM Configuration', group: 'EBM Config', segment: 'config', perm: 'manage_ebm' },
  { id: 'ebm-items', label: 'EBM Items', group: 'EBM Config', segment: 'items', perm: 'manage_ebm' },
  { id: 'ebm-codes-sync', label: 'CIS / VSDC Codes', group: 'EBM Config', segment: 'codes-sync', perm: 'manage_ebm' },
  { id: 'ebm-vsdc-init', label: 'VSDC Initialization', group: 'EBM Config', segment: 'vsdc-init', perm: 'manage_ebm' },
];
export const EBM_GROUPS: string[] = ['Finance', 'EBM', 'EBM Config'];

/** Platform Admin (KAB-162): the 5 previously-separate sidebar entries, now
 *  sub-nav sections under /console/admin. Distinct from Fleet, which keeps
 *  its own separate /admin/* pages untouched (see AdminSectionLayout). */
export const PLATFORM_ADMIN_SECTIONS: ShellSection[] = [
  { id: 'padmin-organizations', label: 'Organizations', group: 'Platform Admin', segment: 'organizations', perm: 'manage_sub_orgs' },
  { id: 'padmin-countries', label: 'Countries', group: 'Platform Admin', segment: 'countries', perm: 'manage_org_settings' },
  { id: 'padmin-users', label: 'Users', group: 'Platform Admin', segment: 'users', perm: 'manage_members' },
  { id: 'padmin-audit', label: 'Audit Log', group: 'Platform Admin', segment: 'audit-logs', perm: 'manage_org_settings' },
  { id: 'padmin-citrine', label: 'Citrine Sync', group: 'Platform Admin', segment: 'citrine', perm: 'view_chargers' },
];
export const PLATFORM_ADMIN_GROUPS: string[] = ['Platform Admin'];
/** Leaf segments under /admin that belong to this merge — everything else
 *  under /admin (Fleet's pages) passes through the layout unchanged. */
export const PLATFORM_ADMIN_SEGMENTS = new Set(PLATFORM_ADMIN_SECTIONS.map((s) => s.segment));

/** Active-item test: overview matches the console index only; others match
 *  their subtree (e.g. /stations and /stations/ch-01). */
export function isNavActive(item: NavItem, consolePath: string): boolean {
  if (item.path === '') return consolePath === '' || consolePath === '/';
  return consolePath === item.path || consolePath.startsWith(`${item.path}/`);
}
