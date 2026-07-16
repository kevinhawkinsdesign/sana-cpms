import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { getUserVehicles, UserVehicle } from '../vehicles';
import { useAuth } from '../../auth/authContext';

export function useUserDashboardOverview() {
  return useQuery({
    queryKey: ['userDashboardOverview'],
    queryFn: async () => {
      try {
        const { data } = await api(true).get('/api/user-dashboard/overview');
        return data;
      } catch (error) {
        return {
          balance: { balance: 0, currency: 'RWF' },
          vehicles: [],
          sessions: []
        };
      }
    }
  });
}

export function useUserDashboardVehicles() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['userDashboardVehicles', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          console.error('User ID not available from auth context');
          throw new Error('User ID not available');
        }
        
        console.log('Fetching vehicles for user ID:', user.id);
        // FIXED: Remove userId parameter
        const vehicles = await getUserVehicles();
        console.log('Vehicles fetched:', vehicles);
        return vehicles;
      } catch (error) {
        console.error('Error fetching user vehicles:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });
}

export function useUserVehicles(userId: string) {
  return useQuery({
    queryKey: ['userVehicles', userId],
    queryFn: async () => {
      try {
        // FIXED: Remove userId parameter
        const vehicles = await getUserVehicles();
        return vehicles;
      } catch (error) {
        console.error('Error fetching user vehicles:', error);
        return [];
      }
    },
    enabled: !!userId
  });
}

export function useUserDashboardEntitlements() {
  return useQuery({
    queryKey: ['userDashboardEntitlements'],
    queryFn: async () => {
      try {
        const { data } = await api(true).get('/api/user-dashboard/entitlements');
        return data;
      } catch (error) {
        return [];
      }
    }
  });
}

export function useUserDashboardSessions(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['userDashboardSessions', page, limit],
    queryFn: async () => {
      try {
        const { data } = await api(true).get(`/api/user-dashboard/sessions?page=${page}&limit=${limit}`);
        return data;
      } catch (error) {
        return { sessions: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };
      }
    }
  });
}

export function useUserDashboardPaymentMethods() {
  return useQuery({
    queryKey: ['userDashboardPaymentMethods'],
    queryFn: async () => {
      try {
        const { data } = await api(true).get('/api/user/profile');
        
        if (data?.status !== 'success') {
          throw new Error(data?.message || 'Failed to get user profile');
        }
        
        // Payment methods are included in the user profile response
        return data.data?.paymentMethods || [];
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        return [];
      }
    }
  });
}

export function useUserDashboardBalance() {
  return useQuery({
    queryKey: ['userDashboardBalance'],
    queryFn: async () => {
      try {
        const { data } = await api(true).get('/api/user-dashboard/balance');
        return data;
      } catch (error) {
        return { balance: 0, currency: 'RWF' };
      }
    }
  });
}

export function useUserDashboardStats() {
  return useQuery({
    queryKey: ['userDashboardStats'],
    queryFn: async () => {
      try {
        const { data } = await api(true).get('/api/user-dashboard/stats');
        return data;
      } catch (error) {
        return {
          totalSessions: 0,
          completedSessions: 0,
          totalKwh: 0,
          totalSpent: 0
        };
      }
    }
  });
} 