import { z } from 'zod';

export enum VehicleCategory {
  PASSENGER = 'PASSENGER',
  COMMERCIAL = 'COMMERCIAL'
}

export enum VehicleClassification {
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

export enum KabisaProduct {
  CORE = 'CORE',
  NON_CORE = 'NON_CORE',
  OTHERS = 'OTHERS',
  ALTERNATIVE = 'ALTERNATIVE'
}

export const vehicleSchema = z.object({
  modelId: z.string().uuid("Please select a valid model"),
  makeId: z.string().uuid("Please select a valid make"),
  year: z.coerce.number()
    .min(1900, "Year must be after 1900")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  trims: z.array(z.string()).min(1, "At least trim is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  category: z.nativeEnum(VehicleCategory),
  classification: z.nativeEnum(VehicleClassification),
  kabisaProduct: z.nativeEnum(KabisaProduct),
  range: z.coerce.number().min(0, "Range must be a positive number"),
  optionalExtras: z.string(),
  doors: z.coerce.number().min(0, "Number of doors must be a positive number"),
  seats: z.coerce.number().min(0, "Number of seats must be a positive number"),
  storageCapacity: z.coerce.number().min(0, "Storage capacity must be a positive number"),
  storageCapacityUnit: z.string().min(1, "Unit is required"),
  details: z.string().min(1, "Details are required"),
  mainImage: z.string().min(1, "Main image is required"),
  batteryCapacity: z.coerce.number().min(0, "Battery capacity must be a positive number"),
  colors: z.array(z.object({
    name: z.string().min(1, "Color name is required"),
    imageUrl: z.string().url().optional(),
  })).min(1, "At least one color must be selected"),
  additionalImages: z.array(z.string().url()).optional(),
  orderImage: z.string().url().optional(),
  country: z.string().min(1, "Country is required"),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;