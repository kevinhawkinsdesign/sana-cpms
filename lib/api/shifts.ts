import api from './api'

export interface Shift {
  id: string
  operatorId: string
  shiftDate: string
  dayOfWeek: number
  startTime?: string
  endTime?: string
  chargerId?: string
  isLastShift?: boolean
  isActive: boolean
  isCheckedIn?: boolean
  createdAt: string
  updatedAt: string
  operator?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  charger?: {
    id: string
    kabisaId: string
    name: string
    address: string
  }
}

export interface CreateShiftData {
  operatorId: string
  shiftDate: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  chargerId?: string
  isLastShift?: boolean
}

export interface UpdateShiftData {
  operatorId?: string
  shiftDate?: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  chargerId?: string
  isLastShift?: boolean
}

// Re-use User type from admin (same shape, defined once)
export type { User } from './admin'

export interface Charger {
  id: string
  kabisaId: string
  name: string
  address: string
  latitude: number
  longitude: number
  power: number
  operationalStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE'
  isActive: boolean
}

// Create a new operator shift
export const createShift = async (data: CreateShiftData): Promise<{ status: string; message: string; data: { shift: Shift } }> => {
  const response = await api().post('/api/operator-shift', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// Get all operator shifts (admin view) with optional date range filtering
export const getAllShifts = async (filters?: { startDate?: Date; endDate?: Date }): Promise<{ status: string; message: string; data: { shifts: Shift[] } }> => {
  let url = '/api/operator-shift'

  if (filters?.startDate || filters?.endDate) {
    const params = new URLSearchParams()

    if (filters.startDate) {
      params.append('startDate', filters.startDate.toISOString())
    }

    if (filters.endDate) {
      params.append('endDate', filters.endDate.toISOString())
    }

    url += `?${params.toString()}`
  }

  const response = await api().get(url)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

// Update an operator shift
export const updateShift = async (shiftId: string, data: UpdateShiftData): Promise<{ status: string; message: string; data: { shift: Shift } }> => {
  const response = await api().put(`/api/operator-shift/${shiftId}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// Re-export from admin to avoid duplication (same endpoint, same implementation)
export { getAllUsers, getAllChargers } from './admin'

// Delete a shift
export const deleteShift = async (shiftId: string): Promise<{ status: string; message: string }> => {
  const response = await api().delete(`/api/operator-shift/${shiftId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// Force checkout operator from active shift (Admin only)
export interface ForceCheckoutData {
  comments?: string
  checkOutMeterReading?: number
  checkOutMeterReadingImageUrl?: string
}

export const forceCheckoutOperator = async (
  reportId: string,
  data?: ForceCheckoutData
): Promise<{ status: string; message: string; data: { report: any; totalKwhCharged: number; operator: any } }> => {
  const response = await api().put(`/api/operator-shift/shift-reports/${reportId}/force-check-out`, data || {})

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

// Force check-in an operator on their behalf (Admin only) — checks the shift's
// operator in by the shift id (resolves the operator + any approved swap server-side).
export interface ForceCheckInData {
  comments?: string
  checkInMeterReading?: number
  checkInMeterReadingImageUrl?: string
}

export const forceCheckInOperator = async (
  operatorShiftId: string,
  data?: ForceCheckInData
): Promise<{ status: string; message: string; data: { report: any } }> => {
  const response = await api().post('/api/operator-shift/shift-reports/force-check-in', { operatorShiftId, ...(data || {}) })

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

// Delete past shifts (Admin only)
export const deletePastShifts = async (): Promise<{ status: string; message: string; data: { deletedCount: number } }> => {
  const response = await api().delete('/api/operator-shift/past-shifts')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}
