import api from './api'
import type { Country, CreateCountryData, UpdateCountryData } from '@/types/country'

export const getAllCountries = async (): Promise<{ status: string; message: string; data: Country[] }> => {
  try {
    const response = await api().get('/api/admin/countries')
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getAllCountries:', error)
    throw error
  }
}

export const getCountry = async (id: string): Promise<{ status: string; message: string; data: Country }> => {
  try {
    const response = await api().get(`/api/admin/countries/${id}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in getCountry:', error)
    throw error
  }
}

export const createCountry = async (data: CreateCountryData): Promise<{ status: string; message: string; data: Country }> => {
  try {
    const response = await api().post('/api/admin/countries', data)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in createCountry:', error)
    throw error
  }
}

export const updateCountry = async (id: string, data: UpdateCountryData): Promise<{ status: string; message: string; data: Country }> => {
  try {
    const response = await api().put(`/api/admin/countries/${id}`, data)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in updateCountry:', error)
    throw error
  }
}

export const deleteCountry = async (id: string): Promise<{ status: string; message: string }> => {
  try {
    const response = await api().delete(`/api/admin/countries/${id}`)
    if (response.data.status === 'error') throw new Error(response.data.message)
    return response.data
  } catch (error) {
    console.error('Error in deleteCountry:', error)
    throw error
  }
}
