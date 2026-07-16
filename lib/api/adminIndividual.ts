import api from './api'

// Types
export interface IndividualVehicle {
  id: string
  kabisaId: string
  make: string
  model: string
  vin?: string
  imageUrl?: string
  batteryCapacity?: number
  chargingStatus?: string
  isKabisaOwner?: boolean
  isPreRegistered?: boolean
  isActive: boolean
  vehicleLicensePlates?: VehicleLicensePlate[]
  vehicleOwnerships?: VehicleOwnership[]
  paymentMethods?: PaymentMethod[]
  freeChargingAllowances?: FreeChargingAllowance[]
  createdAt: string
  updatedAt: string
  // Debt tracking
  debtBalance?: number
  debtNote?: string
  // Computed properties for easier access
  licensePlates?: VehicleLicensePlate[]
  owner?: User
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentMethod {
  id: string
  type: 'INVOICE' | 'KABISA' | 'MOMO' | 'CARD'
  isDefault: boolean
  isActive: boolean
  balance?: number
  currency?: string
  phoneNumber?: string
  network?: string
  createdAt: string
  updatedAt: string
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
  vehicleId: string
  remainingCount: number | null
  isUnlimited: boolean
  isActive?: boolean
  validFrom: string
  validUntil: string | null
  chargerAllowances?: FreeChargingAllowanceCharger[]
  allowedChargerIds?: string[] | null
  createdAt: string
  updatedAt: string
  freeKwhLimit?: number | null
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null
  customDays?: number | null
  remainingFreeKwhThisPeriod?: number | null
}

export interface VehicleLicensePlate {
  id: string
  licencePlateNumber: string
  vehicleId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface VehicleOwnership {
  id: string
  vehicleId: string
  userId: string
  businessId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: User
}

// Request Types
export interface CreateIndividualVehicleRequest {
  licensePlate: string
  model: string
  make: string
  vin?: string
  imageUrl?: string
  batteryCapacity?: number
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  ownerIdNumber?: string
}

export interface UpdateIndividualVehicleRequest {
  licensePlate?: string
  model?: string
  make?: string
  vin?: string
  imageUrl?: string
  batteryCapacity?: number
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  ownerIdNumber?: string
}

export interface AddKabisaPaymentRequest {
  isDefault: boolean
  balance: number
  currency: string
}

export interface AddMomoPaymentRequest {
  isDefault: boolean
  phoneNumber: string
  network: string
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
export interface CreateIndividualVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: {
      id: string
      kabisaId: string
      make: string
      model: string
      vin?: string
      imageUrl?: string
      batteryCapacity?: number
      isActive: boolean
      createdAt: string
      updatedAt: string
    }
    paymentMethod: {
      id: string
      type: string
      isDefault: boolean
      isActive: boolean
      createdAt: string
    }
  }
}

export interface GetIndividualVehiclesResponse {
  status: string
  message: string
  data: {
    vehicles: IndividualVehicle[]
  }
}

export interface GetIndividualVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: IndividualVehicle
  }
}

export interface UpdateIndividualVehicleResponse {
  status: string
  message: string
  data: {
    vehicle: IndividualVehicle
  }
}

export interface AddKabisaPaymentResponse {
  status: string
  message: string
  data: {
    paymentMethod: PaymentMethod
  }
}

export interface AddMomoPaymentResponse {
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

// Data transformation functions
const transformVehicleData = (vehicle: any): IndividualVehicle => {
  return {
    ...vehicle,
    // Map vehicleOwnerships to owner for easier access
    owner: vehicle.vehicleOwnerships?.[0]?.user,
    // Map vehicleLicensePlates to licensePlates for easier access
    licensePlates: vehicle.vehicleLicensePlates,
    // Ensure paymentMethods is always an array
    paymentMethods: vehicle.paymentMethods || [],
    // Ensure freeChargingAllowances is always an array
    freeChargingAllowances: vehicle.freeChargingAllowances || []
  }
}

// API Functions
export const createIndividualVehicle = async (data: CreateIndividualVehicleRequest): Promise<CreateIndividualVehicleResponse> => {
  try {
    console.log('Creating individual vehicle with data:', data)
    const response = await api().post('/api/admin/individuals', data)
    console.log('Create vehicle response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error creating individual vehicle:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const getAllIndividualVehicles = async (): Promise<GetIndividualVehiclesResponse> => {
  try {
    console.log('Fetching all individual vehicles')
    const response = await api().get('/api/admin/individuals')
    console.log('Get vehicles response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Transform the vehicle data to match frontend interface
    const transformedData = {
      ...response.data,
      data: {
        ...response.data.data,
        vehicles: response.data.data.vehicles.map(transformVehicleData)
      }
    }
    
    return transformedData
  } catch (error: any) {
    console.error('Error fetching individual vehicles:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const getIndividualVehicle = async (vehicleId: string): Promise<GetIndividualVehicleResponse> => {
  try {
    console.log('Fetching individual vehicle:', vehicleId)
    const response = await api().get(`/api/admin/individuals/${vehicleId}`)
    console.log('Get vehicle response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Transform the vehicle data to match frontend interface
    const transformedData = {
      ...response.data,
      data: {
        ...response.data.data,
        vehicle: transformVehicleData(response.data.data.vehicle)
      }
    }
    
    return transformedData
  } catch (error: any) {
    console.error('Error fetching individual vehicle:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const updateIndividualVehicle = async (vehicleId: string, data: UpdateIndividualVehicleRequest): Promise<UpdateIndividualVehicleResponse> => {
  try {
    console.log('Updating individual vehicle:', vehicleId, data)
    const response = await api().put(`/api/admin/individuals/${vehicleId}`, data)
    console.log('Update vehicle response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Transform the vehicle data to match frontend interface
    const transformedData = {
      ...response.data,
      data: {
        ...response.data.data,
        vehicle: transformVehicleData(response.data.data.vehicle)
      }
    }
    
    return transformedData
  } catch (error: any) {
    console.error('Error updating individual vehicle:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const deactivateIndividualVehicle = async (vehicleId: string): Promise<{ status: string; message: string; data: {} }> => {
  try {
    console.log('Deactivating individual vehicle:', vehicleId)
    const response = await api().delete(`/api/admin/individuals/${vehicleId}`)
    console.log('Deactivate vehicle response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error deactivating individual vehicle:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const activateIndividualVehicle = async (
  vehicleId: string
): Promise<{ status: string; message: string; data: {} }> => {
  const response = await api().post(`/api/admin/individuals/${vehicleId}/activate`)

  if (response.data?.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

export const addKabisaPaymentMethod = async (
  vehicleId: string,
  data: AddKabisaPaymentRequest
): Promise<AddKabisaPaymentResponse> => {
  try {
    console.log('Adding KABISA payment method:', vehicleId, data)
    const response = await api().post(
      `/api/admin/individuals/${vehicleId}/add-kabisa-payment-method`,
      data
    )
    console.log('Add KABISA payment response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error adding KABISA payment method:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const addMomoPaymentMethod = async (
  vehicleId: string,
  data: AddMomoPaymentRequest
): Promise<AddMomoPaymentResponse> => {
  try {
    console.log('Adding MOMO payment method:', vehicleId, data)
    const response = await api().post(
      `/api/admin/individuals/${vehicleId}/add-momo-payment-method`,
      data
    )
    console.log('Add MOMO payment response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error adding MOMO payment method:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const getVehiclePaymentMethods = async (vehicleId: string): Promise<GetVehiclePaymentMethodsResponse> => {
  try {
    console.log('Fetching vehicle payment methods:', vehicleId)
    const response = await api().get(`/api/admin/individuals/${vehicleId}/payment-methods`)
    console.log('Get payment methods response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error fetching payment methods:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const deactivatePaymentMethod = async (vehicleId: string, paymentMethodId: string): Promise<{ status: string; message: string; data: {} }> => {
  try {
    console.log('Deactivating payment method:', vehicleId, paymentMethodId)
    const response = await api().delete(`/api/admin/individuals/${vehicleId}/payment-methods/${paymentMethodId}`)
    console.log('Deactivate payment method response:', response.data)
    
    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error deactivating payment method:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const addFreeChargingAllowance = async (
  vehicleId: string,
  data: AddFreeChargingRequest
): Promise<AddFreeChargingResponse> => {
  try {
    console.log('Adding free charging allowance:', vehicleId, data)
    const response = await api().post(
      `/api/admin/individuals/${vehicleId}/add-free-charging-allowance`,
      data
    )
    console.log('Add free charging allowance response:', response.data)

    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error adding free charging allowance:', error)
    throw error
  }
}

export const updateFreeChargingAllowance = async (
  vehicleId: string,
  allowanceId: string,
  data: AddFreeChargingRequest
): Promise<AddFreeChargingResponse> => {
  try {
    console.log('Updating free charging allowance:', vehicleId, allowanceId, data)
    const response = await api().put(
      `/api/admin/individuals/${vehicleId}/free-charging-allowances/${allowanceId}`,
      data
    )
    console.log('Update free charging allowance response:', response.data)

    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error updating free charging allowance:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

export const deleteFreeChargingAllowance = async (
  vehicleId: string,
  allowanceId: string
): Promise<{ status: string; message: string; data: {} }> => {
  try {
    console.log('Deleting free charging allowance:', vehicleId, allowanceId)
    const response = await api().delete(
      `/api/admin/individuals/${vehicleId}/free-charging-allowances/${allowanceId}`
    )
    console.log('Delete free charging allowance response:', response.data)

    // Check if response has error status
    if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message)
    }

    // Return the response as-is from backend
    return response.data
  } catch (error: any) {
    console.error('Error deleting free charging allowance:', error)
    // The error message is already properly extracted by the API interceptor
    // Just re-throw the error as-is to preserve the backend message
    throw error
  }
}

// ===== Vehicle Debt Management =====

export interface SetVehicleDebtRequest {
  debtAmount: number
  note?: string
}

export interface AddVehicleDebtRequest {
  additionalDebt: number
  note?: string
}

export const getVehiclesWithDebt = async () => {
  const response = await api().get('/api/admin/vehicles/debt/list')
  return response.data
}

export const getVehicleDebt = async (vehicleId: string) => {
  const response = await api().get(`/api/admin/vehicles/${vehicleId}/debt`)
  return response.data
}

export const setVehicleDebt = async (vehicleId: string, data: SetVehicleDebtRequest) => {
  const response = await api().put(`/api/admin/vehicles/${vehicleId}/debt`, data)
  return response.data
}

export const addVehicleDebt = async (vehicleId: string, data: AddVehicleDebtRequest) => {
  const response = await api().post(`/api/admin/vehicles/${vehicleId}/debt/add`, data)
  return response.data
}

export const clearVehicleDebt = async (vehicleId: string) => {
  const response = await api().delete(`/api/admin/vehicles/${vehicleId}/debt`)
  return response.data
}

export const collectVehicleDebt = async (vehicleId: string, data: { phone: string }) => {
  const response = await api().post(`/api/admin/vehicles/${vehicleId}/debt/collect`, data)
  return response.data
}

export interface VehicleDebtLog {
  id: string
  vehicleId: string
  action: string
  previousBalance: number
  newBalance: number
  amount: number
  note: string | null
  performedBy: string
  performedById: string | null
  performedByUser: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

export const getVehicleDebtLogs = async (vehicleId: string): Promise<{ vehicleId: string; logs: VehicleDebtLog[] }> => {
  const response = await api().get(`/api/admin/vehicles/${vehicleId}/debt/logs`)
  return response.data.data
}
