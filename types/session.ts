export const kabisaIdPattern = /^[A-Z0-9]{8}$/;
export const carPlatePattern = /^[A-Z0-9]{3,10}$/;
export const pinPattern = /^[0-9]{4}$/;

export const KabisaIdOrLicensePlatePattern = new RegExp(`^(?:${kabisaIdPattern.source}|${carPlatePattern.source})$`);



export interface VehicleInfo {
    freeChargingExpiration: string | null;
    licenseNumber: string;
    make: string | null;
    model: string | null;
    imageUrl: string | null;
    kabisaId: string;
}

export interface ChargingInfo {
    standardPrice: number | null;
    name: string;
    kabisaId: string;
    paymentMethodName?: string | null;
    paymentMethodEnum?: string | null;
    /** Optional free allowance details when session is using FREE_ALLOWANCE */
    freeAllowance?: {
        freeKwhLimit?: number | null;
        periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null;
        customDays?: number | null;
        remainingFreeKwhThisPeriod?: number | null;
    } | null;
}

export interface ChargeSessionResult {
    status: boolean;
    message: string;
    chargerInfo: ChargingInfo;
    vehicleInfo: VehicleInfo;
    paymentInfo?: any;
    textMessageStatus?: boolean;
    textMessageMessage?: string;
    sessionId?: string;
    needsRegistration?: boolean;
}