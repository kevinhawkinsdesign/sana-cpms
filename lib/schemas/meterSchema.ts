import { z } from 'zod';

export enum PaymentPlan {
  PREPAID = 'PREPAID',
  POSTPAID = 'POSTPAID',
  // ... other payment plans
}

export enum MeterTariff {
  EV_TARIFF = 'EV_TARIFF',
  STANDARD_TARIFF = 'STANDARD_TARIFF',
  // ... other tariffs
}

export const meterSchema = z.object({
  kabisaId: z.string().min(1, "Kabisa ID is required"),
  meterNumber: z.string().min(1, "Meter number is required"),
  dateInstalled: z.string().min(1, "Installation date is required"),
  paymentPlan: z.nativeEnum(PaymentPlan),
  meterOwner: z.string().min(1, "Meter owner is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  regContact: z.string().min(1, "Registration contact is required"),
  meterTariff: z.nativeEnum(MeterTariff),
});

export type MeterFormData = z.infer<typeof meterSchema>;