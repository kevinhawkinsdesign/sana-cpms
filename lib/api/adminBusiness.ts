import { ReactNode } from 'react'
import api from './api'

// Types
export interface Business {
  id: string
  name: string
  tin: string
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  businessUsers?: BusinessUser[]
  vehicleOwnerships?: VehicleOwnership[]
  paymentMethods?: PaymentMethod[]
  businessPaymentContractInvoices?: BusinessPaymentContractInvoice[]
  businessPaymentContract?: BusinessPaymentContract
  defaultPricingTiers?: PricingTier[]
  _count?: {
    vehicleOwnerships: number
    paymentMethods: number
  }
}

export interface BusinessUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  isActive: boolean
}

export interface VehicleOwnership {
  id: string
  vehicle: {
    id: string
    kabisaId: string
    model: string
    make: string
    vin?: string
    imageUrl?: string
    batteryCapacity?: number
    vehicleLicensePlates?: VehicleLicensePlate[]
    freeChargingAllowances?: FreeChargingAllowance[]
  }
}

export interface VehicleLicensePlate {
  licencePlateNumber: ReactNode
  id: string
  licensePlate: string
  isActive: boolean
}

export interface PaymentMethod {
  id: string
  paymentMethodType: 'KABISA' | 'CONTRACT' | 'INVOICE'
  isDefault: boolean
  balance?: number
  currency: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  paymentProviderName?: string | null
  businessPaymentContractId?: string | null
  businessPaymentContract?: {
    id: string
    contractName: string
    invoicingDateOfTheMonth: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    businessPaymentContractPricingDiscounts?: Array<{
      id: string
      businessPaymentContractId: string
      minKwh: number
      maxKwh: number
      ratePerKwh: number
      order: number
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
  }
}

export interface FreeChargingAllowanceCharger {
  id: string
  chargerId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FreeChargingAllowance {
  id: string
  remainingCount: number
  isUnlimited: boolean
  isActive?: boolean
  validFrom: string
  validUntil?: string
  chargerAllowances?: FreeChargingAllowanceCharger[]
  allowedChargerIds?: string[] | null
  freeKwhLimit?: number | null
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null
  customDays?: number | null
  remainingFreeKwhThisPeriod?: number | null
}

export interface BusinessPaymentContractInvoice {
  id: string
  invoiceNumber: string
  amount: number
  status: string
  dueDate: string
}

export interface BusinessPaymentContract {
  id: string
  contractName: string
  invoicingDateOfTheMonth: number
}

export interface PricingTier {
  minKwh: number
  maxKwh?: number
  ratePerKwh: number
}

// Request Types
export interface CreateBusinessRequest {
  name: string
  tin: string
  imageUrl?: string | null
  contractName: string
  invoicingDateOfTheMonth: number
  defaultPricingTiers: PricingTier[]
}

export interface UpdateBusinessRequest {
  name?: string
  tin?: string
  imageUrl?: string | null
  contractName?: string
  invoicingDateOfTheMonth?: number
}

export interface AddBusinessContractRequest {
  contractName: string
  invoicingDateOfTheMonth: number
  defaultPricingTiers: PricingTier[]
}

export interface AddVehicleRequest {
  licensePlate: string
  model: string
  make: string
  vin?: string
  imageUrl?: string
  batteryCapacity?: number
}

export interface AddKabisaPaymentRequest {
  isDefault: boolean
  balance: number
  currency: string
}

export interface AddFreeChargingRequest {
  remainingCount?: number
  isUnlimited: boolean
  validFrom: string
  validUntil?: string
  chargers?: string[] | null
  freeKwhLimit?: number
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'
  customDays?: number
  isActive?: boolean
}

// Response Types
export interface CreateBusinessResponse {
  status: string
  message: string
  data: {
    business: Business
    contract: BusinessPaymentContract
    pricingTiers: PricingTier[]
  }
}

export interface GetBusinessesResponse {
  status: string
  message: string
  data: {
    businesses: Business[]
  }
}

export interface GetBusinessResponse {
  status: string
  message: string
  data: {
    business: Business
  }
}

export interface UpdateBusinessResponse {
  status: string
  message: string
  data: {
    business: Business
  }
}

export interface AddBusinessContractResponse {
  status: string
  message: string
  data: {
    contract: BusinessPaymentContract
    paymentMethod: PaymentMethod
    assignedVehicleCount: number
  }
}

export interface UpdateBusinessContractResponse {
  status: string
  message: string
  data: {
    contract: BusinessPaymentContract
    pricingTiers: PricingTier[]
  }
}

export interface AddVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: {
      id: string
      kabisaId: string
      model: string
      make: string
      vin?: string
      imageUrl?: string
      batteryCapacity?: number
    }
    action: 'assigned' | 'created' 
    licensePlate: VehicleLicensePlate
    ownership: VehicleOwnership
    assignment: any
    invoicePaymentMethod: PaymentMethod
  }
}

export interface GetBusinessVehiclesResponse {
  status: string
  message: string
  data: {
    vehicles: VehicleOwnership[]
  }
}

export interface AddKabisaPaymentResponse {
  status: string
  message: string
  data: {
    paymentMethod: PaymentMethod
  }
}

export interface GetVehiclePaymentMethodsResponse {
  status: string
  message: string
  data: {
    paymentMethods: PaymentMethod[]
  }
}

export interface AddFreeChargingResponse {
  status: string
  message: string
  data: {
    allowance: FreeChargingAllowance
  }
}

// API Functions
export const createBusiness = async (data: CreateBusinessRequest): Promise<CreateBusinessResponse> => {
  const response = await api().post('/api/admin/businesses', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const getAllBusinesses = async (): Promise<GetBusinessesResponse> => {
  const response = await api().get('/api/admin/businesses')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const getBusiness = async (businessId: string): Promise<GetBusinessResponse> => {
  const response = await api().get(`/api/admin/businesses/${businessId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const updateBusiness = async (businessId: string, data: UpdateBusinessRequest): Promise<UpdateBusinessResponse> => {
  const response = await api().put(`/api/admin/businesses/${businessId}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const addBusinessContract = async (
  businessId: string,
  data: AddBusinessContractRequest
): Promise<AddBusinessContractResponse> => {
  const response = await api().post(`/api/admin/businesses/${businessId}/contracts`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export const updateBusinessContract = async (
  businessId: string,
  data: AddBusinessContractRequest
): Promise<UpdateBusinessContractResponse> => {
  const response = await api().put(`/api/admin/businesses/${businessId}/contracts`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export const deactivateBusiness = async (businessId: string): Promise<{ status: string; message: string; data: {} }> => {
  const response = await api().delete(`/api/admin/businesses/${businessId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}


export const addVehicleToBusiness = async (
  businessId: string,
  data: AddVehicleRequest,
  options?: { silent?: boolean }
): Promise<AddVehicleResponse> => {
  const client = options?.silent ? api(false, false) : api()
  const response = await client.post(`/api/admin/businesses/${businessId}/vehicles/add-or-assign`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export const getBusinessVehicles = async (businessId: string): Promise<GetBusinessVehiclesResponse> => {
  const response = await api().get(`/api/admin/businesses/${businessId}/vehicles`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const deactivateVehicle = async (businessId: string, vehicleId: string): Promise<{ status: string; message: string; data: {} }> => {
  const response = await api().delete(`/api/admin/businesses/${businessId}/vehicles/${vehicleId}`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export interface UpdateBusinessVehicleRequest {
  make?: string
  model?: string
  vin?: string | null
  imageUrl?: string | null
  batteryCapacity?: number | null
  licensePlate?: string
}

export interface UpdateBusinessVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: {
      id: string
      kabisaId: string
      make: string
      model: string
      vin?: string | null
      imageUrl?: string | null
      batteryCapacity?: number | null
      vehicleLicensePlates?: VehicleLicensePlate[]
    }
  }
}

export const updateBusinessVehicle = async (
  businessId: string,
  vehicleId: string,
  data: UpdateBusinessVehicleRequest
): Promise<UpdateBusinessVehicleResponse> => {
  const response = await api().put(`/api/admin/businesses/${businessId}/vehicles/${vehicleId}`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export interface UnassignVehicleRequest {
  vehicleId?: string
  licensePlate?: string
}

export interface UnassignVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: {
      id: string
      kabisaId: string
      make: string
      model: string
      vin?: string
      isActive: boolean
      createdAt: string
      updatedAt: string
    }
  }
}

export const unassignVehicleFromBusiness = async (
  businessId: string,
  data: UnassignVehicleRequest
): Promise<UnassignVehicleResponse> => {
  const response = await api().delete(`/api/admin/businesses/${businessId}/vehicles/unassign`, { data })
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const addKabisaPaymentMethod = async (
  businessId: string,
  vehicleId: string,
  data: AddKabisaPaymentRequest
): Promise<AddKabisaPaymentResponse> => {
  const response = await api().post(
    `/api/admin/businesses/${businessId}/vehicles/${vehicleId}/add-kabisa-payment-method`,
    data
  )
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const getVehiclePaymentMethods = async (
  businessId: string,
  vehicleId: string
): Promise<GetVehiclePaymentMethodsResponse> => {
  const response = await api().get(`/api/admin/businesses/${businessId}/vehicles/${vehicleId}/payment-methods`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

export const addFreeChargingAllowance = async (
  businessId: string,
  vehicleId: string,
  data: AddFreeChargingRequest
): Promise<AddFreeChargingResponse> => {
  const response = await api().post(
    `/api/admin/businesses/${businessId}/vehicles/${vehicleId}/add-free-charging-allowance`,
    data
  )

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export const updateFreeChargingAllowance = async (
  businessId: string,
  vehicleId: string,
  allowanceId: string,
  data: AddFreeChargingRequest
): Promise<AddFreeChargingResponse> => {
  try {
    console.log('Updating free charging allowance:', businessId, vehicleId, allowanceId, data)
    const response = await api().put(
      `/api/admin/businesses/${businessId}/vehicles/${vehicleId}/free-charging-allowances/${allowanceId}`,
      data
    )
    console.log('Update free charging allowance response:', response.data)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data
  } catch (error: any) {
    console.error('Error updating free charging allowance:', error)
    throw error
  }
}

export const deleteFreeChargingAllowance = async (
  businessId: string,
  vehicleId: string,
  allowanceId: string
): Promise<{ status: string; message: string; data: {} }> => {
  try {
    console.log('Deleting business free charging allowance:', businessId, vehicleId, allowanceId)
    const response = await api().delete(
      `/api/admin/businesses/${businessId}/vehicles/${vehicleId}/free-charging-allowances/${allowanceId}`
    )
    console.log('Delete business free charging allowance response:', response.data)

    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    return response.data
  } catch (error: any) {
    console.error('Error deleting business free charging allowance:', error)
    throw error
  }
}

export const deactivatePaymentMethod = async (
  businessId: string,
  vehicleId: string,
  paymentMethodId: string
): Promise<{ status: string; message: string; data: {} }> => {
  try {
    console.log('Deactivating business payment method:', businessId, vehicleId, paymentMethodId)
    const response = await api().delete(`/api/admin/businesses/${businessId}/vehicles/${vehicleId}/payment-methods/${paymentMethodId}`)
    console.log('Deactivate business payment method response:', response.data)
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data
  } catch (error) {
    console.error('Error deactivating business payment method:', error)
    throw error
  }
}
