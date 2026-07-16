// lib/utils/roleMapping.ts

import { UserRole } from './roleRedirect';

/**
 * Maps frontend role constants to backend role values
 * This ensures consistency between frontend UI and backend API expectations
 */
export const mapToBackendRole = (frontendRole: UserRole | string): string => {
  switch (frontendRole) {
    case UserRole.OPERATOR:
      return 'operator'; // Backend expects lowercase 'operator'
    case UserRole.ADMIN:
      return 'admin'; // Backend expects lowercase 'admin'
    case UserRole.CUSTOMER:
      return 'customer'; // Backend expects lowercase 'customer'
    default:
      // If it's already a backend role, return as is
      return String(frontendRole).toLowerCase();
  }
};

/**
 * Maps backend role values to frontend role constants
 * This ensures consistency between backend API responses and frontend UI
 */
export const mapToFrontendRole = (backendRole: string): UserRole => {
  switch (backendRole.toLowerCase()) {
    case 'operator':
    case 'charging_operator':
    case 'charging_operator':
      return UserRole.OPERATOR;
    case 'admin':
      return UserRole.ADMIN;
    case 'customer':
    case 'user':
      return UserRole.CUSTOMER;
    default:
      // Default to customer for unknown roles
      return UserRole.CUSTOMER;
  }
};

/**
 * Checks if a user has the required role for a specific operation
 * This handles both frontend and backend role formats
 */
export const hasRole = (userRole: string | UserRole, requiredRoles: (string | UserRole)[]): boolean => {
  const normalizedUserRole = typeof userRole === 'string' ? userRole.toLowerCase() : userRole;
  
  return requiredRoles.some(requiredRole => {
    const normalizedRequiredRole = typeof requiredRole === 'string' ? requiredRole.toLowerCase() : requiredRole;
    return normalizedUserRole === normalizedRequiredRole;
  });
};
