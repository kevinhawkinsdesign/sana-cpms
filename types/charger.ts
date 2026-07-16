// Charger API Types based on the new API documentation

export enum ChargerOperationStatus {
  OPERATIONAL = 'OPERATIONAL',
  UNDER_REPAIR = 'UNDER_REPAIR',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  BEING_INSTALLED = 'BEING_INSTALLED',
  PLANNED_FOR_FUTURE_DATE = 'PLANNED_FOR_FUTURE_DATE'
}

export enum ChargingStatus {
  IN_USE = 'IN_USE',
  AVAILABLE = 'AVAILABLE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE'
}

export type PedestalOnlineStatus = 'OFFLINE' | 'ONLINE'

export interface Gun {
  id: string;
  kabisaId: string;
  name?: string;
  chargerId?: string;
  gunNumber?: string;
  citrineConnectorId?: string;
  chargingStatus: ChargingStatus;
  currentSessionId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pedestal {
  id: string;
  chargerId: string;
  name?: string;
  onlineStatus: PedestalOnlineStatus;
  citrineChargerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  guns?: Gun[];
}

export interface Meter {
  id: string;
  kabisaId: string;
  meterName?: string;
  meterNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Charger {
  id: string;
  kabisaId: string;
  meterId?: string;
  gunNumber?: string;
  latitude?: number;
  longitude?: number;
  googleMapLink?: string;
  name?: string;
  ownerName: string;
  operationalStatus: ChargerOperationStatus;
  address?: string;
  internet?: string;
  type?: string;
  cableAttached?: string;
  connector?: string;
  manufacturerName?: string;
  modelName?: string;
  power: number;
  country?: string;
  momoCode?: string;
  imageUrl?: string;
  haveMeterReading?: boolean;
  generateEbm?: boolean;
  hasTwoMeters?: boolean;
  pricePerKwh?: number;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerWebsite?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Guns at top level for list responses that flatten structure */
  guns?: Gun[];
  /** Nested pedestals with guns (backend list/detail) */
  pedestals?: Pedestal[];
}

export interface ChargersApiResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    chargers: Charger[];
  };
  error?: {
    code: string;
    details: string;
  };
}

// GeoJSON Types
export interface ChargerGeoJsonProperties {
  id: string;
  kabisaId: string;
  name?: string;
  power?: number;
  category: 'dc' | 'ac';
  owner?: string;
  isKabisa: boolean;
  status: string;
  operationalStatus: string;
  gunsCount: number;
  gunStatuses: string[];
  availability: {
    available: number;
    total: number;
  };
  address?: string;
  meterId?: string;
  imageUrl?: string;
  haveMeterReading: boolean;
  liveUpdatedAt?: string;
  searchText?: string;
}

export interface ChargerGeoJsonFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: ChargerGeoJsonProperties;
}

export interface ChargerGeoJsonCollection {
  type: 'FeatureCollection';
  features: ChargerGeoJsonFeature[];
}

export interface ChargersGeoJsonApiResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    geojson: ChargerGeoJsonCollection;
  };
  error?: {
    code: string;
    details: string;
  };
}

// Legacy charger interface for backward compatibility
export interface LegacyCharger {
  [x: string]: any;
  "Kabisa ID": string;
  Name: string;
  "Charging Status": string;
  "Operational Status": string;
  Internet: string;
  Connector: string;
  "Standard Charging Price": number;
  "MoMo Code": number | string;
  Latitude: number | null;
  Longitude: number | null;
  "Power (kW)": number;
  Type: string;
  Address: string;
  image: string | null;
  googleMapLink: string | null;
  chargerCode: string | null;
}

/** Collect all guns from a charger (top-level guns or from pedestals). */
export function getChargerGuns(charger: Charger): Gun[] {
  if (charger.guns?.length) return charger.guns
  if (charger.pedestals?.length) {
    return charger.pedestals.flatMap((p) => p.guns ?? [])
  }
  return []
}

// Helper function to convert new API charger to legacy format for existing components
export function convertChargerToLegacy(charger: Charger): LegacyCharger {
  const guns = getChargerGuns(charger)
  const availableGuns = guns.filter(gun => gun.chargingStatus === ChargingStatus.AVAILABLE).length
  const totalGuns = guns.length
  
  return {
    "Kabisa ID": charger.kabisaId,
    Name: charger.name || 'Charging Station',
    "Charging Status": availableGuns > 0 ? 'Available' : 'In Use',
    "Operational Status": charger.operationalStatus,
    Internet: charger.internet || 'N/A',
    Connector: charger.connector || 'Unknown',
    "Standard Charging Price": 0, // Not provided in new API
    "MoMo Code": charger.momoCode || '',
    Latitude: charger.latitude ?? null,
    Longitude: charger.longitude ?? null,
    "Power (kW)": charger.power,
    Type: charger.type || 'Unknown',
    Address: charger.address || 'N/A',
    image: charger.imageUrl || null,
    googleMapLink: charger.googleMapLink || null,
    chargerCode: charger.kabisaId,
    // Additional fields for compatibility
    availableGuns,
    totalGuns,
    guns
  };
}
