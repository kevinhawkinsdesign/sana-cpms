import api from '@/lib/api/api'

// Types for the new vehicle structure
export interface UserVehicle {
  id: string;
  kabisaId: string;
  model?: string;
  make?: string;
  vin?: string;
  imageUrl?: string;
  batteryCapacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isKabisaOwner: boolean;
  chargingStatus: 'AVAILABLE' | 'CHARGING' | 'OFFLINE';
  vehicleLicensePlates: Array<{
    id: string;
    licencePlateNumber: string;
    isActive: boolean;
  }>;
  vehicleInsurances: Array<any>; // Will be defined when insurance API is available
}

export interface BusinessVehicle {
  id: string;
  kabisaId: string;
  model?: string;
  make?: string;
  vin?: string;
  imageUrl?: string;
  batteryCapacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isKabisaOwner: boolean;
  chargingStatus: 'AVAILABLE' | 'CHARGING' | 'OFFLINE';
  vehicleLicensePlates: Array<{
    id: string;
    licencePlateNumber: string;
    isActive: boolean;
  }>;
  vehicleInsurances: Array<any>; // Will be defined when insurance API is available
}

// User Vehicle API Functions
export const addVehicleToUser = async (vehicleData: {
  licensePlate: string;
  model?: string;
  make?: string;
  vin?: string;
  imageUrl?: string;
  batteryCapacity?: number;
}) => {
  try {
    const response = await api().post('/api/user/vehicles', vehicleData);
    
    // According to backend documentation, successful creation returns 201
    if (response.status !== 201) {
      throw new Error(response.data?.message || 'Failed to add vehicle');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to add vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding vehicle to user:', error);
    throw error;
  }
};

export const updateUserVehicle = async (vehicleId: string, updateData: {
  model?: string;
  make?: string;
  imageUrl?: string;
  batteryCapacity?: number;
}) => {
  try {
    const response = await api().put(`/api/user/vehicles/${vehicleId}`, updateData);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to update vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating user vehicle:', error);
    throw error;
  }
};

export const getUserVehicles = async (): Promise<UserVehicle[]> => {
  try {
    // FIXED: Remove userId parameter, use correct endpoint
    const response = await api().get('/api/vehicles/user/vehicles');
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to get user vehicles');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to get user vehicles');
    }
    
    return response.data.data?.vehicles || [];
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    return [];
  }
};

export const deleteUserVehicle = async (vehicleId: string) => {
  try {
    const response = await api().delete(`/api/user/vehicles/${vehicleId}`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to delete vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting user vehicle:', error);
    throw error;
  }
};

// Business Vehicle API Functions
export const createBusinessVehicle = async (businessId: string, vehicleData: {
  model?: string;
  make?: string;
  vin?: string;
  imageUrl?: string;
  batteryCapacity?: number;
}) => {
  try {
    const response = await api().post(`/api/business/${businessId}/vehicles`, vehicleData);
    
    // According to backend documentation, successful creation returns 201
    if (response.status !== 201) {
      throw new Error(response.data?.message || 'Failed to create business vehicle');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to create business vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating business vehicle:', error);
    throw error;
  }
};

export const getBusinessVehicles = async (businessId: string): Promise<BusinessVehicle[]> => {
  try {
    const response = await api().get(`/api/business/${businessId}/vehicles`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to get business vehicles');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to get business vehicles');
    }
    
    return response.data.data?.vehicles || [];
  } catch (error: any) {
    console.error('Error fetching business vehicles:', error);
    return [];
  }
};

export const updateBusinessVehicle = async (businessId: string, vehicleId: string, updateData: {
  model?: string;
  make?: string;
  imageUrl?: string;
  batteryCapacity?: number;
}) => {
  try {
    const response = await api().put(`/api/business/${businessId}/vehicles/${vehicleId}`, updateData);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to update business vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating business vehicle:', error);
    throw error;
  }
};

export const deleteBusinessVehicle = async (businessId: string, vehicleId: string) => {
  try {
    const response = await api().delete(`/api/business/${businessId}/vehicles/${vehicleId}`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to delete business vehicle');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting business vehicle:', error);
    throw error;
  }
};

// Legacy functions for backward compatibility (deprecated)
export async function fetchVehicles(): Promise<any[]> {
  console.warn('fetchVehicles is deprecated. Use getUserVehicles or getBusinessVehicles instead.');
  return [];
}

export async function fetchVehicleById(id: string): Promise<any | null> {
  console.warn('fetchVehicleById is deprecated. Use specific user or business vehicle functions instead.');
  return null;
}

export async function fetchVehiclesByClassification(classification: string): Promise<any[]> {
  console.warn('fetchVehiclesByClassification is deprecated.');
  return [];
}

// Legacy functions - keeping for backward compatibility but marking as deprecated
export async function registerVehicle(licensePlateNumber: string) {
  console.warn('registerVehicle is deprecated. Use addVehicleToUser instead.');
  try {
    const response = await api().post('/api/vehicle-ownership', { licensePlateNumber });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function removeVehicle(vehicleKabisaId: string) {
  console.warn('removeVehicle is deprecated. Use deleteUserVehicle or deleteBusinessVehicle instead.');
  try {
    const response = await api().delete(`/api/vehicle-ownership/${vehicleKabisaId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}