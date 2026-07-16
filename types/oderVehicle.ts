import { z } from 'zod';

// Vehicle Information
export const vehicleInfoSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  trim: z.string(),
  colors: z.array(z.string()),
});

export interface VehicleInfo {
  ID: string;
  Make: string;
  Model: string;
  Year: number;
  Trim: string;
  'Color Options': string[];
  'Available Color Options': string[];
  Category: string;
  'Range (km)': number;
  Seats: number;
  Doors: number;
  'Battery Capacity': number;
  'Storage Capacity (CBM)': number;
  'Optional Extras': string[];
  Details: string;
  Images: string[];
  'List Price (RWF)': string;
  'Two year warranty cost': number;
  'Source Country': string;
  'Manufacturer Insurance': string;
  'Status': string;
  'Description': string;
}


// Add-On
export const addOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cost: z.number(),
  category: z.string(),
  categoryMutuallyExclusive: z.boolean(),
  isSelected: z.boolean().default(false),
});


export type AddOn = z.infer<typeof addOnSchema>;


export interface AddOnFromBackend {
  ID: string;
  Name: string;
  Description: string;
  Category: string;
  CategoryMutuallyExclusive: boolean;
  Cost: number;
}


// Discount
export const discountSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cost: z.number(),
  category: z.string(),
  categoryMutuallyExclusive: z.boolean(),
});


export interface DiscountFromBackend {
  ID: string;
  Name: string;
  Description: string;
  Category: string;
  CategoryMutuallyExclusive: boolean;
  Cost: number;
}

export type Discount = z.infer<typeof discountSchema>;

// Price Information
export const priceInfoSchema = z.object({
  price: z.number(),
  currency: z.string(),
  upfrontAmount: z.number().optional(),
  upfrontPercent: z.number().optional()
});

export type PriceInfo = z.infer<typeof priceInfoSchema>;

// Form Data
export const formDataSchema = z.object({
  color: z.string().nonempty('Please select a color'),
  upfrontPercent: z.number().min(0).max(100, 'Upfront percentage must be between 0 and 100'),
  saleCountry: z.enum(['Rwanda', 'Kenya'], {
    errorMap: () => ({ message: 'Please select a valid country' }),
  }),
  currency: z.enum(['USD', 'RWF', 'KSh'], {
    errorMap: () => ({ message: 'Please select a valid currency' }),
  }),
  paymentMethod: z.enum(['Financing', 'Cash'], {
    errorMap: () => ({ message: 'Please select a valid payment method' }),
  }),
  firstName: z.string().nonempty('First name is required'),
  lastName: z.string().nonempty('Last name is required'),
  company: z.string().optional(),
  phoneNumber: z.string().nonempty('Phone number is required')
    .regex(/^\+?[0-9]{10,14}$/, 'Invalid phone number format'),
  emailAddress: z.string().email('Invalid email address'),
});

export type FormData = z.infer<typeof formDataSchema>;

// API Request Types
export const vehicleOrderRequestSchema = z.object({
  order: z.object({
    ID: z.string(),
    Make: z.string(),
    Model: z.string(),
    Year: z.number(),
    Trim: z.string(),
    Color: z.string(),
    addOnIds: z.array(z.string()),
    discountIds: z.array(z.string()),
    saleCountry: z.enum(['Rwanda', 'Kenya']),
  }),
  customer: z.object({
    "First Name": z.string(),
    "Last Name": z.string(),
    Email: z.string().email(),
    Phone: z.string(),
  }),
  payment: z.object({
    "Payment Method": z.enum(['Financing', 'Cash']),
    "Payment Currency": z.enum(['USD', 'RWF', 'KSh']),
  }),
});

export type VehicleOrderRequest = z.infer<typeof vehicleOrderRequestSchema>;

// API Response Types
export const vehicleOrderResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  orderId: z.string().optional(),
});

export type VehicleOrderResponse = z.infer<typeof vehicleOrderResponseSchema>;

export const vehiclePriceRequestSchema = z.object({
  vehicleId: z.string(),
  addOnIds: z.array(z.string()),
  discountIds: z.array(z.string()),
  saleCountry: z.enum(['Rwanda', 'Kenya']),
  currency: z.enum(['USD', 'RWF', 'KSh']),
  payment: z.object({
    upfrontPercent: z.number().min(0).max(100),
  }),
});

export type VehiclePriceRequest = z.infer<typeof vehiclePriceRequestSchema>;

export const vehiclePriceResponseSchema = z.object({
  price: priceInfoSchema,
});

export type VehiclePriceResponse = z.infer<typeof vehiclePriceResponseSchema>;



export interface VehicleFormData {
  color: string;
  upfrontPercent: number;
  saleCountry: string;
  currency: string;
  paymentMethod: string;
  firstName: string;
  lastName: string;
  company?: string;
  phoneNumber: string;
  emailAddress: string;
}