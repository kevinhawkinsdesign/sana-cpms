'use client'

import { useQuery } from '@tanstack/react-query'
import api from '../api/api';
import { Charger, LegacyCharger, convertChargerToLegacy, Gun } from '@/types/charger';

// Utility functions
export const isKabisaCharger = (charger: Charger): boolean => {
  return charger.ownerName?.toLowerCase()?.trim()?.includes('kabisa') ?? false;
};

// Utility functions for guns
export const getGunsStats = (guns: Gun[]) => {
  const available = guns.filter(gun => gun.chargingStatus === 'AVAILABLE' && gun.isActive).length;
  const inUse = guns.filter(gun => gun.chargingStatus === 'IN_USE' && gun.isActive).length;
  const underMaintenance = guns.filter(gun => gun.chargingStatus === 'UNDER_MAINTENANCE' && gun.isActive).length;
  const inactive = guns.filter(gun => !gun.isActive).length;
  const total = guns.length;
  
  return {
    available,
    inUse,
    underMaintenance,
    inactive,
    total
  };
};

export const getChargerGunsStats = (charger: Charger) => {
  return getGunsStats(charger.guns || []);
};

export function useFetchChargers() {
  const {
    data: chargers = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['chargers'],
    queryFn: async (): Promise<LegacyCharger[]> => {
      try {
        const response = await api().get('/api/client/chargers');
        
        
        if (response.data && response.data.status === 'success' && response.data.data?.chargers) {
          const apiChargers: Charger[] = response.data.data.chargers;
          
          // Convert all chargers to legacy format (let map component handle missing coordinates)
          const filteredChargers = apiChargers
            .map(convertChargerToLegacy);
          
          return filteredChargers;
        }
        
        return []
      } catch (error) {
        
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: typeof window !== 'undefined' // Disable during SSR
  })

  return {
    chargers,
    isLoading,
    error: error ? (error as Error).message : null
  }
}

// New hook for raw API data (if needed)
export function useFetchChargersRaw() {
  const {
    data: chargers = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['chargers'],
    queryFn: async (): Promise<LegacyCharger[]> => {
      try {
        const response = await api().get('/api/client/chargers');


        if (response.data && response.data.status === 'success' && response.data.data?.chargers) {
          const apiChargers: Charger[] = response.data.data.chargers;

          // Convert all chargers to legacy format (let map component handle missing coordinates)
          const filteredChargers = apiChargers
            .map(convertChargerToLegacy);

          return filteredChargers;
        }

        return []
      } catch (error) {

        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: typeof window !== 'undefined' // Disable during SSR
  })

  return {
    chargers,
    isLoading,
    error: error ? (error as Error).message : null,
    getGunsStats,
    getChargerGunsStats,
    isKabisaCharger
  }
}

// New hook for GeoJSON data - optimized for map rendering
export function useFetchChargersGeoJson() {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['chargers-geojson'],
    queryFn: async (): Promise<import('@/types/charger').ChargerGeoJsonCollection> => {
      try {
        console.log('🗺️ Fetching chargers GeoJSON...');
        const response = await api().get('/api/client/chargers-geojson');

        console.log('📡 API Response:', {
          status: response.status,
          dataStatus: response.data?.status,
          featuresCount: response.data?.data?.geojson?.features?.length
        });

        if (response.data && response.data.status === 'success' && response.data.data?.geojson) {
          const geojson = response.data.data.geojson;
          console.log('✅ GeoJSON loaded:', geojson.features.length, 'features');
          return geojson;
        }

        console.warn('⚠️ No GeoJSON data in response');
        // Return empty FeatureCollection
        return {
          type: 'FeatureCollection',
          features: []
        };
      } catch (error) {
        console.error('❌ Error fetching chargers GeoJSON:', error);
        // Return empty FeatureCollection instead of throwing
        return {
          type: 'FeatureCollection',
          features: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: typeof window !== 'undefined' // Disable during SSR
  })

  console.log('🎯 useFetchChargersGeoJson hook state:', {
    isLoading,
    hasError: !!error,
    featuresCount: data?.features?.length || 0
  });

  return {
    geojson: data || { type: 'FeatureCollection' as const, features: [] },
    isLoading,
    error: error ? (error as Error).message : null
  }
}