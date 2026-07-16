// lib/utils/roleRedirect.ts

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  OPERATOR = 'OPERATOR',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  ADMIN = 'ADMIN'
}

/**
 * Outside production we route admins (platform + org) to the SaaS **console**
 * instead of the legacy dashboard, so the team dogfoods it in dev/staging.
 * Operators + customers keep their dashboards (the console is admin-facing).
 * Flip to prod by setting NODE_ENV=production (or removing this gate when the
 * console fully replaces the admin dashboard).
 */
const ADMIN_USES_CONSOLE = process.env.NODE_ENV !== 'production';

export const getDashboardPathByRole = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return ADMIN_USES_CONSOLE ? '/console' : '/dashboard/admin';
    case UserRole.ORGANIZATION_ADMIN:
      return ADMIN_USES_CONSOLE ? '/console' : '/dashboard/org-admin';
    case UserRole.OPERATOR:
      return '/dashboard/operator';
    case UserRole.CUSTOMER:
      return '/dashboard/customer';
    default:
      return '/dashboard';
  }
};

export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
}; 