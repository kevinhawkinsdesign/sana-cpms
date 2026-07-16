// lib/utils/roleRedirect.ts

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  OPERATOR = 'OPERATOR',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  ADMIN = 'ADMIN'
}

/**
 * This demo repo always routes admins (platform + org) to the SaaS
 * **console** — it's the actively-developed admin UI and the one worth
 * showing off, regardless of how the demo happens to be served (dev server
 * or a production build).
 */
const ADMIN_USES_CONSOLE = true;

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