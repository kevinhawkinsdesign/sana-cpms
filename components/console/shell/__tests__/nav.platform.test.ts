/**
 * KAB-162: the platform Fleet nav group is visible ONLY to platform admins,
 * regardless of the active-org role — even an ORG_OWNER who holds the fleet
 * perms must not see it. Pure-function test over visibleNavGroups.
 */
jest.mock('../../../../lib/console/orgs', () => ({
  hasPerm: (data: { isPlatformAdmin?: boolean; permissions?: string[] | null } | undefined, perm: string) => {
    if (!data) return false;
    if (data.isPlatformAdmin) return true;
    return data.permissions?.includes(perm) ?? false;
  },
}));

import { visibleNavGroups } from '../nav';

type OrgsLike = Parameters<typeof visibleNavGroups>[0];

const orgsData = (over: Partial<NonNullable<OrgsLike>>): OrgsLike => ({
  orgs: [],
  activeOrgId: 'o1',
  isPlatformAdmin: false,
  permissions: [],
  activeOrg: { id: 'o1', role: 'ORG_OWNER' },
  ...over,
});

describe('visibleNavGroups — platform Fleet scope (KAB-162)', () => {
  it('shows the Fleet group with all five items to a platform admin', () => {
    const fleet = visibleNavGroups(orgsData({ isPlatformAdmin: true })).find((g) => g.group === 'Fleet');
    expect(fleet).toBeTruthy();
    expect(fleet?.items.map((i) => i.id).sort()).toEqual([
      'admin-businesses',
      'admin-shop-orders',
      'admin-shop-vehicles',
      'admin-vehicles',
      'admin-vehicles-debt',
    ]);
  });

  it('hides the Fleet group from a non-platform-admin, even an ORG_OWNER with fleet perms', () => {
    const groups = visibleNavGroups(
      orgsData({ isPlatformAdmin: false, permissions: ['manage_fleets', 'view_customers', 'view_dashboard'] }),
    );
    expect(groups.find((g) => g.group === 'Fleet')).toBeUndefined();
  });

  it('shows the Platform Admin group (orgs/countries/users/audit/citrine) only to platform admins', () => {
    const adminGroups = visibleNavGroups(orgsData({ isPlatformAdmin: true }));
    const platform = adminGroups.find((g) => g.group === 'Platform Admin');
    expect(platform?.items.map((i) => i.id).sort()).toEqual([
      'admin-audit',
      'admin-citrine',
      'admin-countries',
      'admin-organizations',
      'admin-users',
    ]);

    const nonAdmin = visibleNavGroups(
      orgsData({ isPlatformAdmin: false, permissions: ['manage_sub_orgs', 'manage_members', 'manage_org_settings', 'view_chargers'] }),
    );
    expect(nonAdmin.find((g) => g.group === 'Platform Admin')).toBeUndefined();
  });
});
