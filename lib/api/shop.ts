import api from './api';
import { IShopVehicle, ShopOrder } from '@/types/shop';

// Shop Vehicles API Client
export class ShopVehiclesAPI {
  // Get all shop vehicles
  static async getAllVehicles(): Promise<IShopVehicle[]> {
    try {
      const response = await api(false).get('/api/client/shop-vehicles');
      
      if (response.data.status === 'success') {
        return response.data.data.vehicles || [];
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching shop vehicles:', error);
      throw error;
    }
  }

  // Get vehicles by shop ID
  static async getVehiclesByShopId(shopId: string): Promise<IShopVehicle[]> {
    try {
      const response = await api(false).get(`/api/client/shop-vehicles/${shopId}`);
      
      if (response.data.status === 'success') {
        return response.data.data.vehicles || [];
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles by shop ID:', error);
      throw error;
    }
  }

  // Get single vehicle by ID
  static async getVehicleById(vehicleId: string): Promise<IShopVehicle> {
    try {
      const response = await api(false).get(`/api/client/shop-vehicles/${vehicleId}`);
      
      if (response.data.status === 'success') {
        return response.data.data.vehicle;
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicle');
      }
    } catch (error) {
      console.error('Error fetching vehicle by ID:', error);
      throw error;
    }
  }

  // Create shop order
  static async createOrder(orderData: {
    vehicleId: string;
    trim?: string;
    color: string;
    paymentMethod: string;
    currency?: string;
    comments?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }): Promise<ShopOrder> {
    try {
      const response = await api(false).post('/api/client/shop-orders', orderData);
      
      if (response.data.status === 'success') {
        return response.data.data.order;
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating shop order:', error);
      throw error;
    }
  }
}

export default ShopVehiclesAPI;
