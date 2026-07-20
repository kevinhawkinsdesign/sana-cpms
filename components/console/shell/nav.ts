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
      { id: 'feedback-hub', label: 'Feedback', icon: 'star', path: '/feedback', perm: 'view_feedback' },
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
      { id: 'operators-hub', label: 'People & Shifts', icon: 'people', path: '/operators', perm: 'view_shifts' },
    ],
  },
  {
    group: 'Fleet',
    requirePlatformAdmin: true,
    items: [
      {
        id: 'admin-hub', label: 'Fleet', icon: 'car', path: '/admin',
        perm: 'manage_fleets', anyPerm: ['manage_fleets', 'view_customers'],
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
  {
    group: 'Organization',
    requireRole: ADMIN_ROLES,
    items: [
      {
        id: 'settings',
        label: 'Settings & Admin',
        icon: 'settings',
        path: '/settings',
        perm: 'manage_org_settings',
        anyPerm: ['manage_org_settings', 'manage_members'],
      },
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

/** Sections inside the consolidated Settings & Admin area (/settings/*).
 *  Single source for the sub-nav, the ⌘K palette deep-links, and per-section
 *  guards. `segment` is appended to /settings ('' = the General index).
 *  The Platform Admin group folds in the previously-separate "Admin" hub
 *  (Organizations, Countries, Users, Audit Log, Citrine Sync); those sections
 *  set `requirePlatformAdmin` so a regular org admin whose perm string
 *  happens to overlap (e.g. manage_org_settings) can't reach them. */
export const SETTINGS_SECTIONS: ShellSection[] = [
  { id: 'general', label: 'General', group: 'Organization', segment: '', perm: 'manage_org_settings', icon: 'settings' },
  { id: 'billing', label: 'Billing & Plan', group: 'Organization', segment: 'billing', perm: 'manage_org_settings', icon: 'money' },
  { id: 'team', label: 'Team & Members', group: 'Access', segment: 'team', perm: 'manage_members', icon: 'people' },
  { id: 'roles', label: 'Roles & Permissions', group: 'Access', segment: 'roles', perm: 'manage_members', icon: 'key' },
  { id: 'tax', label: 'Tax & EBM', group: 'Finance', segment: 'tax', perm: 'manage_org_settings', icon: 'doc' },
  {
    id: 'padmin-organizations', label: 'Organizations', group: 'Platform Admin', segment: 'organizations',
    perm: 'manage_sub_orgs', icon: 'building', requirePlatformAdmin: true,
  },
  {
    id: 'padmin-countries', label: 'Countries', group: 'Platform Admin', segment: 'countries',
    perm: 'manage_org_settings', icon: 'globe', requirePlatformAdmin: true,
  },
  {
    id: 'padmin-users', label: 'Users', group: 'Platform Admin', segment: 'users',
    perm: 'manage_members', icon: 'people', requirePlatformAdmin: true,
  },
  {
    id: 'padmin-audit', label: 'Audit Log', group: 'Platform Admin', segment: 'audit-logs',
    perm: 'manage_org_settings', icon: 'doc', requirePlatformAdmin: true,
  },
  {
    id: 'padmin-citrine', label: 'Citrine Sync', group: 'Platform Admin', segment: 'citrine',
    perm: 'view_chargers', icon: 'refresh', requirePlatformAdmin: true,
  },
];

/** Ordered group headings for the settings sub-nav. */
export const SETTINGS_GROUPS: string[] = ['Organization', 'Access', 'Finance', 'Platform Admin'];

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

/** Feedback: Reviews and Reports merged into one hub under /console/feedback
 *  (both already shared that URL prefix, so no page moves were needed). */
export const FEEDBACK_SECTIONS: ShellSection[] = [
  { id: 'feedback-reviews', label: 'Reviews', group: 'Feedback', segment: 'reviews', perm: 'view_feedback' },
  { id: 'feedback-reports', label: 'Reports', group: 'Feedback', segment: 'reports', perm: 'view_feedback' },
];
export const FEEDBACK_GROUPS: string[] = ['Feedback'];

/** People & Shifts: Operators, Schedule, and Shift Reports merged into one
 *  hub under /console/operators (Schedule and Shift Reports moved there from
 *  their old top-level /schedule and /shifts paths). Operators itself is the
 *  '' segment — the hub's index. */
export const PEOPLE_SECTIONS: ShellSection[] = [
  { id: 'operators', label: 'Operators', group: 'People & Shifts', segment: '', perm: 'view_shifts' },
  { id: 'schedule', label: 'Schedule', group: 'People & Shifts', segment: 'schedule', perm: 'view_shifts' },
  { id: 'shifts', label: 'Shift Reports', group: 'People & Shifts', segment: 'shifts', perm: 'view_shifts' },
];
export const PEOPLE_GROUPS: string[] = ['People & Shifts'];

/** Fleet: the 5 previously-separate sidebar entries merged into one hub under
 *  /console/admin (Fleet's existing prefix — no page moves needed here either,
 *  since Platform Admin already moved out to /settings/*). Every section is
 *  platform-admin-only: manage_fleets and view_customers are both granted to
 *  ORG_OWNER/ORG_ADMIN in ALL_PERMISSIONS, so without requirePlatformAdmin a
 *  regular (non-platform) org admin could reach cross-org fleet data. */
export const FLEET_SECTIONS: ShellSection[] = [
  { id: 'admin-vehicles', label: 'Vehicles', group: 'Fleet', segment: 'vehicles', perm: 'manage_fleets', requirePlatformAdmin: true },
  { id: 'admin-shop-vehicles', label: 'Shop Vehicles', group: 'Fleet', segment: 'shop-vehicles', perm: 'manage_fleets', requirePlatformAdmin: true },
  { id: 'admin-shop-orders', label: 'Shop Orders', group: 'Fleet', segment: 'shop-orders', perm: 'view_customers', requirePlatformAdmin: true },
  { id: 'admin-vehicles-debt', label: 'Vehicles with Debt', group: 'Fleet', segment: 'vehicles-with-debt', perm: 'view_customers', requirePlatformAdmin: true },
  { id: 'admin-businesses', label: 'Businesses', group: 'Fleet', segment: 'businesses', perm: 'manage_fleets', requirePlatformAdmin: true },
];
export const FLEET_GROUPS: string[] = ['Fleet'];

/** Active-item test: overview matches the console index only; others match
 *  their subtree (e.g. /stations and /stations/ch-01). */
export function isNavActive(item: NavItem, consolePath: string): boolean {
  if (item.path === '') return consolePath === '' || consolePath === '/';
  return consolePath === item.path || consolePath.startsWith(`${item.path}/`);
}
