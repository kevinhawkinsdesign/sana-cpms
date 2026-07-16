import { render, screen } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';
import { useOrgs } from '../../../../lib/console/orgs';

/**
 * Security regression: the operator-only "My Work" group is role-scoped
 * (requireRole: ['OPERATOR']). RouteGuard must enforce that on direct
 * navigation — a non-operator who happens to hold the perms (e.g. an org admin
 * via the catalog superset) must not reach /console/me by URL.
 */

jest.mock('next/navigation', () => ({
  useParams: () => ({ country: 'rw' }),
  usePathname: () => '/rw/console/me/sessions',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

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
const resolved = (over: Record<string, unknown>) => ({
  data: { activeOrgId: 'o1', isPlatformAdmin: false, ...over },
  isPending: false,
  isPlaceholderData: false,
});

const OPERATOR_PERMS = ['view_dashboard', 'view_sessions', 'view_shifts', 'transfer_session'];

describe('RouteGuard — My Work role gating', () => {
  afterEach(() => jest.clearAllMocks());

  it('allows an OPERATOR with view_sessions', () => {
    mockUseOrgs.mockReturnValue(resolved({ permissions: OPERATOR_PERMS, activeOrg: { id: 'o1', role: 'OPERATOR' } }));
    renderGuard();
    expect(screen.queryByTestId('access-denied')).toBeNull();
    expect(screen.queryByTestId('child')).not.toBeNull();
  });

  it('denies an org admin with the perms but not the OPERATOR role', () => {
    mockUseOrgs.mockReturnValue(resolved({ permissions: [...OPERATOR_PERMS, 'manage_members'], activeOrg: { id: 'o1', role: 'ORG_ADMIN' } }));
    renderGuard();
    expect(screen.queryByTestId('access-denied')).not.toBeNull();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('denies a platform admin — My Work is operator-only (strictRole)', () => {
    // strictRole means platform admins do NOT bypass the OPERATOR gate, per the
    // file docblock: a non-operator must not reach /console/me by URL.
    mockUseOrgs.mockReturnValue(resolved({ isPlatformAdmin: true, permissions: null, activeOrg: { id: 'o1', role: null } }));
    renderGuard();
    expect(screen.queryByTestId('access-denied')).not.toBeNull();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('denies an operator without view_sessions for this route (redirected away)', () => {
    // Operators are redirected to their first visible page (me/shifts) rather
    // than shown an AccessDenied wall — either way they never see this page.
    mockUseOrgs.mockReturnValue(resolved({ permissions: ['view_dashboard', 'view_shifts', 'transfer_session'], activeOrg: { id: 'o1', role: 'OPERATOR' } }));
    renderGuard();
    expect(screen.queryByTestId('child')).toBeNull();
  });
});
