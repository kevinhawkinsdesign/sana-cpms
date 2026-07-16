// lib/constants/usermanage.ts

/**
 * ID Status enum for tracking user ID verification states
 */
export enum ID_STATUS {
    FOUND = 'Found',
    NOT_FOUND = 'Not Found',
    UNREGISTERED = 'Unregistered',
    INCOMPLETE_REGISTRATION = 'Incomplete Registration',
    INACTIVE = 'Inactive',
}

/**
 * User roles enum for system access control
 */
export enum USER_ROLES {
    CUSTOMER = 'CUSTOMER',
    OPERATOR = 'CHARGING_OPERATOR',
    ADMIN = 'ADMIN',
    SALES = 'SALES',
    MARKETING = 'MARKETING',
    CHARGING_MANAGER = 'CHARGING_MANAGER',
    MANAGER = 'MANAGER'
}

/**
 * Operation status enum for equipment/facility status tracking
 */
export enum OperationStatus {
    OPERATIONAL = 'OPERATIONAL',
    UNDER_REPAIR = 'UNDER_REPAIR',
    CLOSED = 'CLOSED',
    CANCELLED = 'CANCELLED',
    BEING_INSTALLED = 'BEING_INSTALLED'
}

/**
 * Kabisa ID type enum for different equipment types
 */
export enum KabisaIdType {
    CHARGER = "CHARGER",
    VEHICLE = "VEHICLE",
    EQUIPMENT = "EQUIPMENT",
    METER = "METER",
}

/**
 * Kabisa ID status enum for equipment registration status
 */
export enum KabisaIdStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    INCOMPLETE_REGISTRATION = "INCOMPLETE_REGISTRATION"
}

// Type definitions for better TypeScript support
export type UserRole = keyof typeof USER_ROLES;
export type IdStatus = keyof typeof ID_STATUS;
export type OperationStatusType = keyof typeof OperationStatus;
export type KabisaIdTypeValue = keyof typeof KabisaIdType;
export type KabisaIdStatusValue = keyof typeof KabisaIdStatus;

// Helper functions for working with enums
export const getUserRoleDisplayName = (role: USER_ROLES): string => {
    const displayNames: Record<USER_ROLES, string> = {
        [USER_ROLES.CUSTOMER]: 'Customer',
        [USER_ROLES.OPERATOR]: 'Charging Operator',
        [USER_ROLES.ADMIN]: 'Administrator',
        [USER_ROLES.SALES]: 'Sales Representative',
        [USER_ROLES.MARKETING]: 'Marketing Specialist',
        [USER_ROLES.CHARGING_MANAGER]: 'Charging Manager',
        [USER_ROLES.MANAGER]: 'Manager'
    };
    return displayNames[role] || role;
};

export const getIdStatusDisplayName = (status: ID_STATUS): string => {
    return status; // Already human-readable
};

export const getOperationStatusDisplayName = (status: OperationStatus): string => {
    const displayNames: Record<OperationStatus, string> = {
        [OperationStatus.OPERATIONAL]: 'Operational',
        [OperationStatus.UNDER_REPAIR]: 'Under Repair',
        [OperationStatus.CLOSED]: 'Closed',
        [OperationStatus.CANCELLED]: 'Cancelled',
        [OperationStatus.BEING_INSTALLED]: 'Being Installed'
    };
    return displayNames[status] || status;
};

export const getKabisaIdTypeDisplayName = (type: KabisaIdType): string => {
    const displayNames: Record<KabisaIdType, string> = {
        [KabisaIdType.CHARGER]: 'Charger',
        [KabisaIdType.VEHICLE]: 'Vehicle',
        [KabisaIdType.EQUIPMENT]: 'Equipment',
        [KabisaIdType.METER]: 'Meter'
    };
    return displayNames[type] || type;
};

export const getKabisaIdStatusDisplayName = (status: KabisaIdStatus): string => {
    const displayNames: Record<KabisaIdStatus, string> = {
        [KabisaIdStatus.ACTIVE]: 'Active',
        [KabisaIdStatus.INACTIVE]: 'Inactive',
        [KabisaIdStatus.INCOMPLETE_REGISTRATION]: 'Incomplete Registration'
    };
    return displayNames[status] || status;
};

// Role hierarchy and permissions (for access control)
export const ROLE_HIERARCHY: Record<USER_ROLES, number> = {
    [USER_ROLES.CUSTOMER]: 1,
    [USER_ROLES.SALES]: 2,
    [USER_ROLES.MARKETING]: 2,
    [USER_ROLES.OPERATOR]: 3,
    [USER_ROLES.CHARGING_MANAGER]: 4,
    [USER_ROLES.MANAGER]: 5,
    [USER_ROLES.ADMIN]: 6
};

// Check if a role can manage another role
export const canManageRole = (managerRole: USER_ROLES, targetRole: USER_ROLES): boolean => {
    return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
};

// Get roles that a user can assign (based on their own role)
export const getAssignableRoles = (currentUserRole: USER_ROLES): USER_ROLES[] => {
    const currentLevel = ROLE_HIERARCHY[currentUserRole];
    return Object.entries(ROLE_HIERARCHY)
        .filter(([_, level]) => level < currentLevel)
        .map(([role, _]) => role as USER_ROLES);
};

// Status color mappings for UI components
export const ID_STATUS_COLORS: Record<ID_STATUS, string> = {
    [ID_STATUS.FOUND]: 'green',
    [ID_STATUS.NOT_FOUND]: 'red',
    [ID_STATUS.UNREGISTERED]: 'yellow',
    [ID_STATUS.INCOMPLETE_REGISTRATION]: 'orange',
    [ID_STATUS.INACTIVE]: 'gray'
};

export const USER_ROLE_COLORS: Record<USER_ROLES, string> = {
    [USER_ROLES.ADMIN]: 'red',
    [USER_ROLES.MANAGER]: 'blue',
    [USER_ROLES.CHARGING_MANAGER]: 'blue',
    [USER_ROLES.OPERATOR]: 'purple',
    [USER_ROLES.SALES]: 'green',
    [USER_ROLES.MARKETING]: 'pink',
    [USER_ROLES.CUSTOMER]: 'gray'
};

export const OPERATION_STATUS_COLORS: Record<OperationStatus, string> = {
    [OperationStatus.OPERATIONAL]: 'green',
    [OperationStatus.UNDER_REPAIR]: 'yellow',
    [OperationStatus.CLOSED]: 'red',
    [OperationStatus.CANCELLED]: 'red',
    [OperationStatus.BEING_INSTALLED]: 'blue'
};

export const KABISA_ID_STATUS_COLORS: Record<KabisaIdStatus, string> = {
    [KabisaIdStatus.ACTIVE]: 'green',
    [KabisaIdStatus.INACTIVE]: 'red',
    [KabisaIdStatus.INCOMPLETE_REGISTRATION]: 'yellow'
};

// Validation helpers
export const isValidUserRole = (role: string): role is USER_ROLES => {
    return Object.values(USER_ROLES).includes(role as USER_ROLES);
};

export const isValidIdStatus = (status: string): status is ID_STATUS => {
    return Object.values(ID_STATUS).includes(status as ID_STATUS);
};

export const isValidOperationStatus = (status: string): status is OperationStatus => {
    return Object.values(OperationStatus).includes(status as OperationStatus);
};

export const isValidKabisaIdType = (type: string): type is KabisaIdType => {
    return Object.values(KabisaIdType).includes(type as KabisaIdType);
};

export const isValidKabisaIdStatus = (status: string): status is KabisaIdStatus => {
    return Object.values(KabisaIdStatus).includes(status as KabisaIdStatus);
};

// Export all enums as a single object for easier importing
export const ENUMS = {
    ID_STATUS,
    USER_ROLES,
    OperationStatus,
    KabisaIdType,
    KabisaIdStatus
} as const;

// Default exports for convenience
export default {
    ID_STATUS,
    USER_ROLES,
    OperationStatus,
    KabisaIdType,
    KabisaIdStatus,
    getUserRoleDisplayName,
    getIdStatusDisplayName,
    getOperationStatusDisplayName,
    getKabisaIdTypeDisplayName,
    getKabisaIdStatusDisplayName,
    canManageRole,
    getAssignableRoles,
    isValidUserRole,
    isValidIdStatus,
    isValidOperationStatus,
    isValidKabisaIdType,
    isValidKabisaIdStatus
};