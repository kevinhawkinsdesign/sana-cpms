export enum ShopVehicleCategory {
    PASSENGER = 'PASSENGER',
    COMMERCIAL = 'COMMERCIAL'
  }
  
  export enum ShopVehicleClassification {
    SEDAN = 'SEDAN',
    COMPACT_SUV = 'COMPACT_SUV',
    SUV = 'SUV',
    PICKUP = 'PICKUP',
    VAN = 'VAN',
    LIGHT_DUTY_TRUCK = 'LIGHT_DUTY_TRUCK',
    TRUCK = 'TRUCK',
    REFRIGERATED = 'REFRIGERATED',
    BUS = 'BUS'
  }
  
  export enum ShopVehicleKabisaProduct {
    CORE = 'CORE',
    NON_CORE = 'NON_CORE',
    OTHERS = 'OTHERS',
    ALTERNATIVE = 'ALTERNATIVE'
  }
  
  export interface VehicleColor {
    id: string;
    shopVehicleId: string;
    color: string;
    imageUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface IShopVehicle {
    id: string;
    shopId: string;
    make: string;
    model: string;
    year: number;
    trim: string[];
    category: ShopVehicleCategory;
    classification: ShopVehicleClassification;
    kabisaProduct: ShopVehicleKabisaProduct;
    range: number;
    price: number;
    currency: string;
    optionalExtras: string[];
    doors: number;
    seats: number;
    storageCapacity: number;
    storageCapacityUnit: string;
    details: string;
    mainImage: string;
    orderImage?: string;
    additionalImages: string[];
    batteryCapacity: number;
    availableColors: VehicleColor[];
    country: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  // Optional: Helper function to check if a string is a valid enum value
  export const isValidCategory = (value: string): value is ShopVehicleCategory => {
    return Object.values(ShopVehicleCategory).includes(value as ShopVehicleCategory);
  };
  
  export const isValidClassification = (value: string): value is ShopVehicleClassification => {
    return Object.values(ShopVehicleClassification).includes(value as ShopVehicleClassification);
  };
  
  export const isValidKabisaProduct = (value: string): value is ShopVehicleKabisaProduct => {
    return Object.values(ShopVehicleKabisaProduct).includes(value as ShopVehicleKabisaProduct);
  };

  export type ShopOrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

  export interface ShopOrder {
    id: string;
    orderId: string;
    vehicleId: string;
    make: string;
    model: string;
    year: number;
    trim?: string;
    color: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    paymentMethod: string;
    currency: string;
    price: number;
    country: string;
    comments?: string;
    status: ShopOrderStatus;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export enum PaymentMethod {
    MOMO = 'MOMO',
    CARD = 'CARD',
    BANK_TRANSFER = 'BANK_TRANSFER',
    CASH = 'CASH'
  }

  export enum SupportedCurrency {
    USD = 'USD',
    RWF = 'RWF',
    EUR = 'EUR'
  }