'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserBusinesses, getDashboardStats, type Business, type BusinessStats } from '@/lib/api/business';

interface BusinessContextType {
  selectedBusiness: Business | null;
  businesses: Business[];
  stats: BusinessStats | null;
  isLoading: boolean;
  setSelectedBusiness: (business: Business | null) => void;
  refetchStats: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

interface BusinessProviderProps {
  children: React.ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      const businessesResponse = await getUserBusinesses();
      setBusinesses(businessesResponse);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses([]);
    }
  }, []);

  const fetchStats = useCallback(async (businessId?: string) => {
    try {
      const statsResponse = await getDashboardStats(businessId);
      setStats(statsResponse);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats({
        totalSessions: 0,
        totalSpent: 0,
        totalKwh: 0,
        vehicleCount: 0,
        paymentMethodCount: 0,
        freeAllowances: 0,
        businessCount: 0,
        teamMemberCount: 0,
        fleetVehicleCount: 0,
        contractCount: 0,
        averageSessionCost: 0,
        monthlyGrowth: 0
      });
    }
  }, []);

  const setSelectedBusiness = useCallback((business: Business | null) => {
    setSelectedBusinessState(business);
    fetchStats(business?.id);
  }, [fetchStats]);

  const refetchStats = useCallback(async () => {
    await fetchStats(selectedBusiness?.id);
  }, [fetchStats, selectedBusiness?.id]);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchBusinesses(),
          fetchStats()
        ]);
      } catch (error) {
        console.error('Error initializing business data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [fetchBusinesses, fetchStats]);

  const value: BusinessContextType = {
    selectedBusiness,
    businesses,
    stats,
    isLoading,
    setSelectedBusiness,
    refetchStats,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};