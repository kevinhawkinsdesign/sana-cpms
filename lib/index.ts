export enum ID_STATUS {
    FOUND = 'Found',
    NOT_FOUND = 'Not Found',
    UNREGISTERED = 'Unregistered',
    INCOMPLETE_REGISTRATION = 'Incomplete Registration',
    INACTIVE = 'Inactive',
}

export enum USER_ROLES {
    CUSTOMER = 'CUSTOMER',
    OPERATOR = 'CHARGING_OPERATOR',
    ADMIN = 'ADMIN',
    SALES = 'SALES',
    MARKETING = 'MARKETING',
    CHARGING_MANAGER = 'CHARGING_MANAGER',
    MANAGER = 'MANAGER'
}


export enum OperationStatus {
    OPERATIONAL = 'OPERATIONAL',
    UNDER_REPAIR = 'UNDER_REPAIR',
    CLOSED = 'CLOSED',
    CANCELLED = 'CANCELLED',
    BEING_INSTALLED = 'BEING_INSTALLED'
}

export enum KabisaIdType {
    CHARGER = "CHARGER",
    VEHICLE = "VEHICLE",
    EQUIPMENT = "EQUIPMENT",
    METER = "METER",
}

export enum KabisaIdStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    INCOMPLETE_REGISTRATION = "INCOMPLETE_REGISTRATION"
}