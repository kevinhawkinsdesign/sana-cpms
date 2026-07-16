'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api/api'

interface Model {
  id: string
  model: string
}

interface Make {
  id: string
  make: string
  models: Model[]
}

interface Color {
  id: string
  color: string
}

export const useVehicleData = () => {
  return useQuery({
    queryKey: ['vehicle-makes'],
    queryFn: async () => {
      const response = await api().get('/api/charging-sessions/model-makes')
      
      if (response.data.status === 'success' && response.data.data?.items) {
        // Transform the array of strings into the expected format
        const makes = response.data.data.items.map((item: string, index: number) => ({
          id: index.toString(),
          make: item,
          models: []
        }))
        return makes
      }
      
      throw new Error('Failed to retrieve car model/make options')
    }
  })
}

export const useVehicleColors = () => {
  return useQuery({
    queryKey: ['vehicle-colors'],
    queryFn: async () => {
      const response = await api().get('/api/vehicle-setup/colors')
      return response.data as Color[]
    }
  })
}