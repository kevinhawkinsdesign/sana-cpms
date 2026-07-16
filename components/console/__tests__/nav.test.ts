import { visibleNavGroups } from '@/components/console/shell/nav';
import type { OrgsData } from '@/lib/console/orgs';

const OPERATOR_PERMS = [
  'view_dashboard', 'view_sessions', 'view_customers', 'view_chargers',
  'view_ebm', 'view_shifts', 'remote_stop_session', 'remote_charger_commands', 'transfer_session',
];

function orgsData(over: Partial<OrgsData> = {}): OrgsData {
  return {
    orgs: [],
    activeOrgId: 'org-1',
    isPlatformAdmin: false,
    permissions: [],
    activeOrg: { id: 'org-1', role: null },
    ...over,
  };
}

const myWork = (groups: ReturnType<typeof visibleNavGroups>) =>
  groups.find((g) => g.group === 'My Work');

describe('visibleNavGroups — My Work operator gating', () => {
  it('shows all operator self-service items for an OPERATOR', () => {
    const groups = visibleNavGroups(
      orgsData({ permissions: OPERATOR_PERMS, activeOrg: { id: 'org-1', role: 'OPERATOR' } }),
    );
    const g = myWork(groups);
    expect(g).toBeDefined();
    expect(g!.items.map((i) => i.id)).toEqual(['me', 'me-shifts', 'me-charge', 'me-transfer']);
  });

  it('hides My Work from an org admin (not an operator role)', () => {
    const groups = visibleNavGroups(
      // Admin holds the perms but is not the OPERATOR role.
      orgsData({ permissions: [...OPERATOR_PERMS, 'manage_members'], activeOrg: { id: 'org-1', role: 'ORG_ADMIN' } }),
    );
    expect(myWork(groups)).toBeUndefined();
  });

  it('hides My Work from a platform admin — strictRole keeps it operator-only', () => {
    const groups = visibleNavGroups(orgsData({ isPlatformAdmin: true, activeOrg: { id: 'org-1', role: null } }));
    expect(myWork(groups)).toBeUndefined();
  });

  it('drops the session items (incl. My Sessions) when the operator lacks view_sessions', () => {
    const groups = visibleNavGroups(
      orgsData({
        permissions: OPERATOR_PERMS.filter((p) => p !== 'view_sessions'),
        activeOrg: { id: 'org-1', role: 'OPERATOR' },
      }),
    );
    const g = myWork(groups);
    expect(g).toBeDefined();
    // Only Check In / Out (view_shifts) survives; me / me-charge / me-transfer need view_sessions.
    expect(g!.items.map((i) => i.id)).toEqual(['me-shifts']);
  });

  it('returns nothing for an unauthenticated/empty state', () => {
    expect(myWork(visibleNavGroups(undefined))).toBeUndefined();
  });
});
