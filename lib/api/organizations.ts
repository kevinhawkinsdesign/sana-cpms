import api from './api'
import type { Organization, OrganizationDetail, CreateOrganizationData, UpdateOrganizationData } from '@/types/organization'

// Get all organizations
export const getAllOrganizations = async (): Promise<{ status: string; message: string; data: Organization[] }> => {
  try {
    const response = await api().get('/api/admin/organizations')
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getAllOrganizations:', error)
    throw error
  }
}

// Get single organization with users and chargers (supports server-side search/filter)
export const getOrganization = async (orgId: string, filters?: {
  userSearch?: string;
  userRole?: string;
  chargerSearch?: string;
  chargerStatus?: string;
}): Promise<{ status: string; message: string; data: OrganizationDetail }> => {
  try {
    const params = new URLSearchParams()
    if (filters?.userSearch) params.set('userSearch', filters.userSearch)
    if (filters?.userRole) params.set('userRole', filters.userRole)
    if (filters?.chargerSearch) params.set('chargerSearch', filters.chargerSearch)
    if (filters?.chargerStatus) params.set('chargerStatus', filters.chargerStatus)
    const qs = params.toString()
    const response = await api().get(`/api/admin/organizations/${orgId}${qs ? `?${qs}` : ''}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getOrganization:', error)
    throw error
  }
}

// Create organization
export const createOrganization = async (data: CreateOrganizationData): Promise<{ status: string; message: string; data: Organization }> => {
  try {
    const response = await api().post('/api/admin/organizations', data)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in createOrganization:', error)
    throw error
  }
}

// Update organization
export const updateOrganization = async (orgId: string, data: UpdateOrganizationData): Promise<{ status: string; message: string; data: Organization }> => {
  try {
    const response = await api().put(`/api/admin/organizations/${orgId}`, data)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in updateOrganization:', error)
    throw error
  }
}

// Delete organization (soft delete)
export const deleteOrganization = async (orgId: string): Promise<{ status: string; message: string }> => {
  try {
    const response = await api().delete(`/api/admin/organizations/${orgId}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in deleteOrganization:', error)
    throw error
  }
}

// Assign users to organization
export const assignUsersToOrganization = async (orgId: string, userIds: string[]): Promise<{ status: string; message: string; data: { count: number } }> => {
  try {
    const response = await api().post(`/api/admin/organizations/${orgId}/users`, { userIds })
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in assignUsersToOrganization:', error)
    throw error
  }
}

// Remove user from organization
export const removeUserFromOrganization = async (orgId: string, userId: string): Promise<{ status: string; message: string }> => {
  try {
    const response = await api().delete(`/api/admin/organizations/${orgId}/users/${userId}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in removeUserFromOrganization:', error)
    throw error
  }
}

// Assign chargers to organization
export const assignChargersToOrganization = async (orgId: string, chargerIds: string[]): Promise<{ status: string; message: string; data: { count: number } }> => {
  try {
    const response = await api().post(`/api/admin/organizations/${orgId}/chargers`, { chargerIds })
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in assignChargersToOrganization:', error)
    throw error
  }
}

// Remove charger from organization
export const removeChargerFromOrganization = async (orgId: string, chargerId: string): Promise<{ status: string; message: string }> => {
  try {
    const response = await api().delete(`/api/admin/organizations/${orgId}/chargers/${chargerId}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in removeChargerFromOrganization:', error)
    throw error
  }
}

// Get users not in this organization (for add picker)
export const getAvailableUsers = async (orgId: string, search?: string): Promise<{ status: string; message: string; data: Array<{ id: string; firstName: string; lastName: string; email: string; phone: string; role: string; organizationId: string | null }> }> => {
  try {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await api().get(`/api/admin/organizations/${orgId}/available-users${params}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getAvailableUsers:', error)
    throw error
  }
}

// Get chargers not in this organization (for add picker)
export const getAvailableChargers = async (orgId: string, search?: string): Promise<{ status: string; message: string; data: Array<{ id: string; kabisaId: string; name: string; address: string; operationalStatus: string; power: number; organizationId: string | null }> }> => {
  try {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await api().get(`/api/admin/organizations/${orgId}/available-chargers${params}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getAvailableChargers:', error)
    throw error
  }
}
