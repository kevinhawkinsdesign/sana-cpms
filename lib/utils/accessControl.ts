import { BusinessInvitation } from '@/lib/api/business';

export type UserAccessLevel = 'personal' | 'invited' | 'business_driver' | 'business_finance' | 'business_owner' | 'system_admin';
export type BusinessRole = 'OWNER' | 'FINANCE' | 'DRIVER';

export interface AccessControlContext {
  userRole: string;
  hasBusinesses: boolean;
  selectedBusiness: any;
  pendingInvitations: BusinessInvitation[];
  businessRole?: BusinessRole; // User's role in the selected business
}

/**
 * Determines the user's access level based on their current state
 */
export function getUserAccessLevel(context: AccessControlContext): UserAccessLevel {
  const { userRole, hasBusinesses, selectedBusiness, pendingInvitations, businessRole } = context;

  // System admins and operators have full access
  if (['ADMIN', 'OPERATOR', 'SUPER_ADMIN'].includes(userRole)) {
    return 'system_admin';
  }

  // If user has pending invitations but no businesses, they're invited
  if (pendingInvitations.length > 0 && !hasBusinesses) {
    return 'invited';
  }

  // If user has businesses and is in business context
  if (hasBusinesses && selectedBusiness && businessRole) {
    switch (businessRole) {
      case 'OWNER':
        return 'business_owner';
      case 'FINANCE':
        return 'business_finance';
      case 'DRIVER':
        return 'business_driver';
      default:
        return 'business_driver'; // Default to most restrictive
    }
  }

  // Default to personal access
  return 'personal';
}

/**
 * Checks if user can access a specific feature
 */
export function canAccessFeature(
  feature: string, 
  accessLevel: UserAccessLevel
): boolean {
  const restrictions: Record<UserAccessLevel, string[]> = {
    'personal': [
      // Personal users can access most personal features
    ],
    'invited': [
      // Invited users are restricted from:
      'payment_methods',
      'billing_history',
      'financial_reports',
      'team_management',
      'business_settings',
      'fleet_management',
      'business_contracts',
      'admin_functions',
      'personal_vehicles', // When in business context
      'personal_sessions', // When in business context
    ],
    'business_driver': [
      // Drivers can only see their assigned vehicles and sessions
      'team_management',
      'business_settings',
      'business_contracts',
      'admin_functions',
      'fleet_management', // Can't manage fleet, only view assigned vehicles
      'business_invitations', // Can't send invitations
      'create_business', // Can't create businesses
      'financial_reports', // Can't view financial data
      'billing_history', // Can't view billing
    ],
    'business_finance': [
      // Finance managers have most access except ownership functions
      'admin_functions', // System admin functions only
      'create_business', // Can't create new businesses (only owners)
    ],
    'business_owner': [
      // Owners have full business access
      'admin_functions', // System admin functions only
    ],
    'system_admin': [
      // System admins have full access
    ]
  };

  return !restrictions[accessLevel]?.includes(feature);
}

/**
 * Gets the appropriate dashboard content based on access level
 */
export function getDashboardContent(accessLevel: UserAccessLevel) {
  switch (accessLevel) {
    case 'invited':
      return {
        showPersonalStats: true,
        showBusinessStats: false,
        showInvitationBanner: true,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    case 'personal':
      return {
        showPersonalStats: true,
        showBusinessStats: false,
        showInvitationBanner: true,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    case 'business_driver':
      return {
        showPersonalStats: true,
        showBusinessStats: true,
        showInvitationBanner: false,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    case 'business_finance':
      return {
        showPersonalStats: true,
        showBusinessStats: true,
        showInvitationBanner: false,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    case 'business_owner':
      return {
        showPersonalStats: true,
        showBusinessStats: true,
        showInvitationBanner: false,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    case 'system_admin':
      return {
        showPersonalStats: true,
        showBusinessStats: true,
        showInvitationBanner: false,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
    
    default:
      return {
        showPersonalStats: true,
        showBusinessStats: false,
        showInvitationBanner: true,
        showQuickActions: true,
        showRecentActivity: true,
        message: null
      };
  }
}

/**
 * Gets menu items that should be hidden based on access level
 */
export function getRestrictedMenuItems(accessLevel: UserAccessLevel): string[] {
  const restrictions: Record<UserAccessLevel, string[]> = {
    'personal': [],
    'invited': [
      'businessManagement',
      'createBusiness',
      'teamManagement',
      'businessInvitations',
      'fleetManagement',
      'businessContracts'
    ],
    'business_driver': [
      'createBusiness',
      'teamManagement',
      'businessInvitations',
      'businessContracts',
      'fleetManagement' // Drivers can't manage fleet, only view assigned vehicles
    ],
    'business_finance': [
      'createBusiness' // Only owners can create businesses
    ],
    'business_owner': [],
    'system_admin': []
  };
  
  return restrictions[accessLevel] || [];
}
