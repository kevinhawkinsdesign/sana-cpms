'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllOrganizations } from '@/lib/api/organizations';
import { useAuth } from '@/lib/auth/authContext';
import { UserRole } from '@/lib/utils/roleRedirect';
import type { Organization } from '@/types/organization';

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  setSelectedOrganization: (org: Organization | null) => void;
  refetchOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    // Only ADMIN and ORGANIZATION_ADMIN need org data
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ORGANIZATION_ADMIN) return;

    setIsLoading(true);
    try {
      if (user.role === UserRole.ADMIN) {
        const response = await getAllOrganizations();
        setOrganizations(response.data || []);
      } else if (user.role === UserRole.ORGANIZATION_ADMIN && user.organization) {
        // ORGANIZATION_ADMIN only sees their own org
        const org: Organization = {
          id: user.organization.id,
          name: user.organization.name,
          logo: user.organization.logo,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        };
        setOrganizations([org]);
        setSelectedOrganization(org);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        organizations,
        isLoading,
        setSelectedOrganization,
        refetchOrganizations: fetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
