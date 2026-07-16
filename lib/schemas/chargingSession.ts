import { z } from 'zod'

export const startSessionSchema = z.object({
  cId: z.string().regex(/^[A-Z0-9]{8}$/, "Charger ID must be 8 characters long"),
  vId: z.string().regex(/^[A-Z0-9]{8}$/, "Vehicle ID must be 8 characters long"),
  socStart: z.union([
    z.number().min(0).max(100),
    z.string().min(1)
  ]).pipe(
    z.coerce.number().refine(val => val >= 0 && val <= 100, {
      message: "SOC must be between 0 and 100"
    })
  )
})

export const endSessionSchema = z.object({
  vId: z.string().regex(/^[A-Z0-9]{8}$/, "Vehicle ID must be 8 characters long"),
  energyCharged: z.union([
    z.number().min(0).max(1000),
    z.string().min(1)
  ]).pipe(
    z.coerce.number().refine(val => val >= 0, {
      message: "Energy must be positive"
    }).refine(val => val <= 1000, {
      message: "Energy charged cannot exceed 1000 kWh"
    })
  ),
  socEnd: z.union([
    z.number().min(0).max(100),
    z.string().min(1)
  ]).pipe(
    z.coerce.number().refine(val => val >= 0 && val <= 100, {
      message: "SOC must be between 0 and 100"
    })
  ),
  paymentType: z.enum(["MoMo", "Invoice"])
})

export type StartSessionData = z.infer<typeof startSessionSchema>
export type EndSessionData = z.infer<typeof endSessionSchema>

export interface VehicleInfo {
  licenseNumber: string
  make: string
  model: string
  imageUrl: string
}

export interface ChargingInfo {
  freeChargingExpiration?: string
  standardPrice: number
}