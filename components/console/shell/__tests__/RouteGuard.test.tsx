import { render, screen } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';
import { useOrgs } from '../../../../lib/console/orgs';

/**
 * Regression: the perms denial must NOT fire during useOrgs' placeholder phase.
 * useOrgs seeds placeholderData (permissions: null) so TanStack Query reports
 * `isPending: false` immediately on a cold load — gating denial on `!isPending`
 * alone flashed AccessDenied for everyone until /auth/orgs resolved. RouteGuard
 * must wait for real data (`isPlaceholderData === false`).
 */

jest.mock('next/navigation', () => ({
  useParams: () => ({ country: 'rw' }),
  // A perm-gated route — Settings needs manage_org_settings OR manage_members.
  usePathname: () => '/rw/console/settings',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

// Keep hasPerm faithful to the real implementation; only stub the data hook.
jest.mock('../../../../lib/console/orgs', () => ({
  useOrgs: jest.fn(),
  hasPerm: (
    data: { isPlatformAdmin?: boolean; permissions?: string[] | null } | undefined,
    perm: string,
  ): boolean => {
    if (!data) return false;
    if (data.isPlatformAdmin) return true;
    return data.permissions?.includes(perm) ?? false;
  },
}));

jest.mock('../../AccessDenied', () => ({
  AccessDenied: () => <div data-testid="access-denied">denied</div>,
}));

const mockUseOrgs = useOrgs as unknown as jest.Mock;
const Child = () => <div data-testid="child">child</div>;
const renderGuard = () => render(<RouteGuard><Child /></RouteGuard>);

const denied = () => screen.queryByTestId('access-denied');
const child = () => screen.queryByTestId('child');

describe('RouteGuard — placeholder/permissions gating', () => {
  afterEach(() => jest.clearAllMocks());

  it('does NOT deny during the placeholder phase (permissions null, isPlaceholderData)', () => {
    // Cold load: placeholder data present, query not "pending", perms not real yet.
    mockUseOrgs.mockReturnValue({
      data: { activeOrgId: 'o1', isPlatformAdmin: false, permissions: null },
      isPending: false,
      isPlaceholderData: true,
    });
    renderGuard();
    expect(denied()).toBeNull();
    expect(child()).not.toBeNull();
  });

  it('does NOT deny while genuinely pending with no data', () => {
    mockUseOrgs.mockReturnValue({ data: undefined, isPending: true, isPlaceholderData: false });
    renderGuard();
    expect(denied()).toBeNull();
    expect(child()).not.toBeNull();
  });

  it('denies once resolved when the member lacks the permission', () => {
    mockUseOrgs.mockReturnValue({
      data: { activeOrgId: 'o1', isPlatformAdmin: false, permissions: ['view_dashboard'] },
      isPending: false,
      isPlaceholderData: false,
    });
    renderGuard();
    expect(denied()).not.toBeNull();
    expect(child()).toBeNull();
  });

  it('renders children once resolved when the member has the permission', () => {
    mockUseOrgs.mockReturnValue({
      // A member holding manage_members also has an admin role — the Settings
      // group is role-gated (ADMIN_ROLES), so the role must be present.
      data: { activeOrgId: 'o1', isPlatformAdmin: false, permissions: ['manage_members'], activeOrg: { id: 'o1', role: 'ORG_ADMIN' } },
      isPending: false,
      isPlaceholderData: false,
    });
    renderGuard();
    expect(denied()).toBeNull();
    expect(child()).not.toBeNull();
  });

  it('renders children for a platform admin once resolved', () => {
    mockUseOrgs.mockReturnValue({
      data: { activeOrgId: null, isPlatformAdmin: true, permissions: null },
      isPending: false,
      isPlaceholderData: false,
    });
    renderGuard();
    expect(denied()).toBeNull();
    expect(child()).not.toBeNull();
  });
});
