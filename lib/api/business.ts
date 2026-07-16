import api from './api';

// Types based on the actual backend response structure
export interface Business {
  id: string;
  name: string;
  tin?: string;
  role?: 'OWNER' | 'FINANCE' | 'DRIVER'; // Add role for frontend use
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUser {
  id: string;
  userId: string;
  businessId: string;
  role: 'OWNER' | 'FINANCE' | 'DRIVER';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  business?: Business; // Add business info
  createdAt: string;
}

export interface BusinessInvitation {
  id: string;
  businessId: string;
  invitationRole: 'OWNER' | 'FINANCE' | 'DRIVER';
  invitedEmail?: string;
  invitedPhone?: string;
  invitationCode: string;
  invitedByUserId?: string;
  invitationAcceptedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  business?: {
    id: string;
    name: string;
    tin?: string;
  };
  invitedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface BusinessContract {
  id: string;
  businessId: string;
  contractName: string;
  invoicingDateOfTheMonth?: number;
  pricingTiers: PricingTier[];
  createdAt: string;
  updatedAt: string;
}

export interface PricingTier {
  id: string;
  minKwh: number;
  maxKwh?: number;
  ratePerKwh: number;
}

export interface BusinessVehicle {
  id: string;
  businessId: string;
  kabisaId: string;
  licensePlates: string[];
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  chargingStatus: 'AVAILABLE' | 'CHARGING' | 'OFFLINE';
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAssignment {
  id: string;
  businessId: string;
  vehicleId: string;
  userId?: string;
  assignmentType: 'PERMANENT' | 'TEMPORARY';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessStats {
  totalSessions: number;
  totalSpent: number;
  totalKwh: number;
  vehicleCount: number; // Add missing property
  paymentMethodCount: number; // Add missing property
  freeAllowances: number; // Add missing property
  businessCount: number; // Add missing property
  teamMemberCount: number;
  fleetVehicleCount: number;
  contractCount: number;
  averageSessionCost: number;
  monthlyGrowth: number;
}

// API Functions based on the actual backend structure

// Business CRUD
export const createBusiness = async (businessData: { name: string; tin?: string }): Promise<Business> => {
  try {
    console.log('Creating business with data:', businessData);
    const response = await api().post('/api/business', businessData);
    console.log('Create business response:', response);
    console.log('Response data structure:', JSON.stringify(response.data, null, 2));
    
    // Check if the response is successful (status 200-299)
    if (response.status >= 200 && response.status < 300) {
      // If the business was created successfully, return it
      if (response.data?.data?.business) {
        console.log('Found business in response.data.data.business');
        return response.data.data.business;
      }
      // If the response structure is different, try to extract business data
      if (response.data?.business) {
        console.log('Found business in response.data.business');
        return response.data.business;
      }
      // If the response is the business object directly
      if (response.data?.id && response.data?.name) {
        console.log('Found business in response.data directly');
        return response.data;
      }
      
      // If we have a success message but no business data, this might be a backend issue
      if (response.data?.message && response.data.message.toLowerCase().includes('success')) {
        console.warn('Received success message but no business data in response');
        throw new Error('Business created successfully but response data is incomplete');
      }
    }
    
    // If we reach here, there was an error
    const errorMessage = response.data?.message || response.data?.error || 'Failed to create business';
    throw new Error(errorMessage);
  } catch (error) {
    console.error('Error creating business:', error);
    throw error;
  }
};

export const getUserBusinesses = async (): Promise<Business[]> => {
  try {
    console.log('Fetching user businesses...');
    const response = await api().get('/api/business/user');
    console.log('Get user businesses response:', response);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch user businesses');
    }
    
    // Fix: Use the correct data key and transform the structure
    const businessUsers = response.data.data.businessUsers || [];
    console.log('Business users from API:', businessUsers);
    
    // Transform BusinessUser to Business format
    return businessUsers.map((businessUser: any) => ({
      id: businessUser.business.id,
      name: businessUser.business.name,
      tin: businessUser.business.tin,
      role: businessUser.role, // Add role for frontend use
      createdAt: businessUser.business.createdAt,
      updatedAt: businessUser.business.updatedAt
    }));
  } catch (error) {
    console.error('Error fetching user businesses:', error);
    return [];
  }
};

export const getBusiness = async (businessId: string): Promise<Business> => {
  try {
    const response = await api().get(`/api/business/${businessId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch business');
    }
    
    return response.data.data.business;
  } catch (error) {
    console.error('Error fetching business:', error);
    throw error;
  }
};

export const updateBusiness = async (businessId: string, businessData: { name?: string; tin?: string }): Promise<Business> => {
  try {
    const response = await api().put(`/api/business/${businessId}`, businessData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update business');
    }
    
    return response.data.data.business;
  } catch (error) {
    console.error('Error updating business:', error);
    throw error;
  }
};

export const deactivateBusiness = async (businessId: string): Promise<void> => {
  try {
    const response = await api().delete(`/api/business/${businessId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to deactivate business');
    }
  } catch (error) {
    console.error('Error deactivating business:', error);
    throw error;
  }
};

// Business Users
export const getBusinessUsers = async (businessId: string): Promise<BusinessUser[]> => {
  try {
    console.log('Fetching business users for business:', businessId);
    const response = await api().get(`/api/business/${businessId}/users`);
    console.log('Get business users response:', response);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to fetch business users';
      throw new Error(errorMessage);
    }
    
    // Fix: Use the correct data key
    return response.data.data.businessUsers || [];
  } catch (error: any) {
    console.error('Error fetching business users:', error);
    console.error('Error details:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      businessId
    });
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to view business users');
    } else if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INSUFFICIENT_PERMISSIONS')) {
        throw new Error('You do not have permission to view business users');
      }
      throw new Error(backendMessage || 'Insufficient permissions');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('BUSINESS_NOT_FOUND')) {
        throw new Error('Business not found');
      }
      throw new Error('Business not found');
    }
    
    // Return empty array for other errors to prevent dashboard crash
    return [];
  }
};

export const addUserToBusiness = async (businessId: string, userId: string, role: 'OWNER' | 'FINANCE' | 'DRIVER'): Promise<BusinessUser> => {
  try {
    const response = await api().post(`/api/business/${businessId}/users`, { userId, role });
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to add user to business');
    }
    
    return response.data.data.user;
  } catch (error) {
    console.error('Error adding user to business:', error);
    throw error;
  }
};

export const updateBusinessUserRole = async (businessId: string, userId: string, role: 'OWNER' | 'FINANCE' | 'DRIVER'): Promise<BusinessUser> => {
  try {
    const response = await api().put(`/api/business/${businessId}/users/${userId}`, { role });
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update business user role');
    }
    
    return response.data.data.user;
  } catch (error) {
    console.error('Error updating business user role:', error);
    throw error;
  }
};

export const removeUserFromBusiness = async (businessId: string, userId: string): Promise<void> => {
  try {
    const response = await api().delete(`/api/business/${businessId}/users/${userId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to remove user from business');
    }
  } catch (error) {
    console.error('Error removing user from business:', error);
    throw error;
  }
};

// Business Invitations
export const createBusinessInvitation = async (
  businessId: string, 
  invitationData: {
    invitationRole: 'OWNER' | 'FINANCE' | 'DRIVER';
    invitedEmail?: string;
    invitedPhone?: string;
  }
): Promise<BusinessInvitation> => {
  try {
    // Validate that either email or phone is provided
    if (!invitationData.invitedEmail && !invitationData.invitedPhone) {
      throw new Error('Either email or phone number is required');
    }

    console.log('Creating business invitation:', invitationData);
    const response = await api().post(`/api/business/${businessId}/invitations`, invitationData);
    console.log('Create invitation response:', response);
    
    // Backend returns 201 for successful creation
    if (response.status !== 201 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to create business invitation';
      throw new Error(errorMessage);
    }
    
    return response.data.data.invitation;
  } catch (error: any) {
    console.error('Error creating business invitation:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 400) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('EMAIL_OR_PHONE_REQUIRED')) {
        throw new Error('Either email or phone number is required');
      }
      throw new Error(backendMessage || 'Invalid invitation data');
    } else if (error.response?.status === 401) {
      throw new Error('Please log in to create invitations');
    } else if (error.response?.status === 403) {
      throw new Error('You do not have permission to create invitations for this business');
    } else if (error.response?.status === 404) {
      throw new Error('Business not found');
    }
    
    throw error;
  }
};



export interface AcceptInvitationResponse {
  businessUser: {
    id: string;
    businessId: string;
    userId: string;
    role: 'OWNER' | 'FINANCE' | 'DRIVER';
  };
  business: {
    id: string;
    name: string;
  };
}

export const acceptInvitation = async (invitationCode: string): Promise<AcceptInvitationResponse> => {
  try {
    console.log('Accepting invitation with code:', invitationCode);
    const response = await api().post('/api/business/invitations/accept', { invitationCode });
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to accept invitation';
      throw new Error(errorMessage);
    }
    
    console.log('Invitation accepted successfully:', response.data);
    return response.data.data;
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 400) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('USER_ALREADY_MEMBER')) {
        throw new Error('You are already a member of this business');
      }
      throw new Error(backendMessage || 'Invalid invitation data');
    } else if (error.response?.status === 401) {
      throw new Error('Please log in to accept this invitation');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INVALID_INVITATION')) {
        throw new Error('Invalid or expired invitation code');
      }
      throw new Error('Invitation not found');
    }
    
    throw error;
  }
};

export const getPendingInvitations = async (): Promise<BusinessInvitation[]> => {
  try {
    console.log('Fetching pending invitations...');
    // const response = await api().get('/api/business/user/pending-invitations');
    
    // if (response.status !== 200 || response.data?.status !== 'success') {
    //   const errorMessage = response.data?.message || 'Failed to fetch pending invitations';
    //   throw new Error(errorMessage);
    // }
    
    // console.log('Pending invitations response:', response.data);
    // return response.data.data.invitations || [];
    
    // Temporarily return empty array while API is commented out
    console.log('Pending invitations API commented out - returning empty array');
    return [];
  } catch (error: any) {
    console.error('Error fetching pending invitations:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to view your invitations');
    }
    
    // Return empty array for other errors to prevent UI crashes
    return [];
  }
};

export const getInvitationDetails = async (invitationCode: string): Promise<BusinessInvitation> => {
  try {
    console.log('Fetching invitation details for code:', invitationCode);
    const response = await api().get(`/api/business/invitations/${invitationCode}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to fetch invitation details';
      throw new Error(errorMessage);
    }
    
    console.log('Invitation details response:', response.data);
    return response.data.data.invitation;
  } catch (error: any) {
    console.error('Error fetching invitation details:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 400) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INVALID_INVITATION')) {
        throw new Error('Invalid invitation code format');
      }
      throw new Error(backendMessage || 'Invalid invitation data');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INVALID_INVITATION')) {
        throw new Error('Invalid or expired invitation code');
      }
      throw new Error('Invitation not found');
    }
    
    throw error;
  }
};

export const declineInvitation = async (invitationCode: string): Promise<void> => {
  try {
    console.log('Declining invitation with code:', invitationCode);
    const response = await api().post('/api/business/invitations/decline', { invitationCode });
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to decline invitation';
      throw new Error(errorMessage);
    }
    
    console.log('Invitation declined successfully');
  } catch (error: any) {
    console.error('Error declining invitation:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 400) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('USER_ALREADY_MEMBER')) {
        throw new Error('You are already a member of this business');
      }
      throw new Error(backendMessage || 'Invalid invitation data');
    } else if (error.response?.status === 401) {
      throw new Error('Please log in to decline this invitation');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INVALID_INVITATION')) {
        throw new Error('Invalid or expired invitation code');
      }
      throw new Error('Invitation not found');
    }
    
    throw error;
  }
};

// Admin functions for managing business invitations
export const getBusinessInvitations = async (businessId: string): Promise<BusinessInvitation[]> => {
  try {
    console.log('Fetching business invitations for business:', businessId);
    const response = await api().get(`/api/business/${businessId}/invitations`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to fetch business invitations';
      throw new Error(errorMessage);
    }
    
    console.log('Business invitations response:', response.data);
    return response.data.data.invitations || [];
  } catch (error: any) {
    console.error('Error fetching business invitations:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to view business invitations');
    } else if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INSUFFICIENT_PERMISSIONS')) {
        throw new Error('You do not have permission to view business invitations');
      }
      throw new Error(backendMessage || 'Insufficient permissions');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('BUSINESS_NOT_FOUND')) {
        throw new Error('Business not found');
      }
      throw new Error('Business not found');
    }
    
    return [];
  }
};

export const cancelBusinessInvitation = async (businessId: string, invitationId: string): Promise<void> => {
  try {
    console.log('Cancelling invitation:', invitationId, 'for business:', businessId);
    const response = await api().delete(`/api/business/${businessId}/invitations/${invitationId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to cancel invitation';
      throw new Error(errorMessage);
    }
    
    console.log('Invitation cancelled successfully');
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to cancel invitations');
    } else if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INSUFFICIENT_PERMISSIONS')) {
        throw new Error('You do not have permission to cancel invitations');
      }
      throw new Error(backendMessage || 'Insufficient permissions');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('BUSINESS_NOT_FOUND') || backendMessage?.includes('INVALID_INVITATION')) {
        throw new Error('Business or invitation not found');
      }
      throw new Error('Business or invitation not found');
    }
    
    throw error;
  }
};

// Business Contracts
export const createBusinessContract = async (
  businessId: string, 
  contractData: { contractName: string; invoicingDateOfTheMonth?: number }
): Promise<BusinessContract> => {
  try {
    console.log('Creating business contract:', contractData);
    const response = await api().post(`/api/business/${businessId}/contracts`, contractData);
    console.log('Create contract response:', response);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to create business contract');
    }
    
    return response.data.data.contract;
  } catch (error) {
    console.error('Error creating business contract:', error);
    throw error;
  }
};

export const getBusinessContracts = async (businessId: string): Promise<BusinessContract[]> => {
  try {
    console.log(`Fetching contracts for business: ${businessId}`);
    const response = await api().get(`/api/business/${businessId}/contracts`);
    console.log('Contracts response:', response.data);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to fetch business contracts';
      throw new Error(errorMessage);
    }
    
    return response.data.data.contracts || [];
  } catch (error: any) {
    console.error('Error fetching business contracts:', error);
    console.error('Error details:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      businessId
    });
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to view business contracts');
    } else if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INSUFFICIENT_PERMISSIONS')) {
        throw new Error('You do not have permission to view business contracts');
      }
      throw new Error(backendMessage || 'Insufficient permissions');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('BUSINESS_NOT_FOUND')) {
        throw new Error('Business not found');
      } else if (backendMessage?.includes('NO_CONTRACTS_FOUND')) {
        // This is not an error - business just doesn't have contracts yet
        console.log('Business has no contracts yet, returning empty array');
        return [];
      }
      // If it's a 404, the endpoint might not exist yet - return empty array
      console.warn('Contracts endpoint returned 404, returning empty array');
      return [];
    }
    
    // For other errors, return empty array to prevent dashboard crash
    console.warn('Failed to fetch business contracts, returning empty array');
    return [];
  }
};

export const addContractPricing = async (
  businessId: string, 
  contractId: string, 
  pricingData: { minKwh: number; maxKwh?: number; ratePerKwh: number }
): Promise<PricingTier> => {
  try {
    const response = await api().post(`/api/business/${businessId}/contracts/${contractId}/pricing`, pricingData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to add contract pricing');
    }
    
    return response.data.data.pricingTier;
  } catch (error) {
    console.error('Error adding contract pricing:', error);
    throw error;
  }
};

export const updateContractPricing = async (
  businessId: string, 
  contractId: string, 
  pricingId: string, 
  pricingData: { minKwh?: number; maxKwh?: number; ratePerKwh?: number }
): Promise<PricingTier> => {
  try {
    const response = await api().put(`/api/business/${businessId}/contracts/${contractId}/pricing/${pricingId}`, pricingData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update contract pricing');
    }
    
    return response.data.data.pricingTier;
  } catch (error) {
    console.error('Error updating contract pricing:', error);
    throw error;
  }
};

// Business Vehicles
export const createBusinessVehicle = async (
  businessId: string, 
  vehicleData: {
    kabisaId: string;
    licensePlates: string[];
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    vin?: string;
  }
): Promise<BusinessVehicle> => {
  try {
    console.log('Creating business vehicle:', vehicleData);
    const response = await api().post(`/api/business/${businessId}/vehicles`, vehicleData);
    console.log('Create vehicle response:', response);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to create business vehicle');
    }
    
    return response.data.data.vehicle;
  } catch (error) {
    console.error('Error creating business vehicle:', error);
    throw error;
  }
};

export const getBusinessVehicles = async (businessId: string): Promise<BusinessVehicle[]> => {
  try {
    console.log(`Fetching vehicles for business: ${businessId}`);
    const response = await api().get(`/api/business/${businessId}/vehicles`);
    console.log('Business vehicles response:', response.data);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      const errorMessage = response.data?.message || 'Failed to fetch business vehicles';
      throw new Error(errorMessage);
    }
    
    return response.data.data.vehicles || [];
  } catch (error: any) {
    console.error('Error fetching business vehicles:', error);
    console.error('Error details:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      businessId
    });
    
    // Handle specific backend error codes
    if (error.response?.status === 401) {
      throw new Error('Please log in to view business vehicles');
    } else if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('INSUFFICIENT_PERMISSIONS')) {
        throw new Error('You do not have permission to view business vehicles');
      }
      throw new Error(backendMessage || 'Insufficient permissions');
    } else if (error.response?.status === 404) {
      const backendMessage = error.response?.data?.message;
      if (backendMessage?.includes('BUSINESS_NOT_FOUND')) {
        throw new Error('Business not found');
      }
      throw new Error('Business not found');
    }
    
    // Return empty array for other errors to prevent dashboard crash
    return [];
  }
};

export const getBusinessVehicle = async (businessId: string, vehicleId: string): Promise<BusinessVehicle> => {
  try {
    const response = await api().get(`/api/business/${businessId}/vehicles/${vehicleId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch business vehicle');
    }
    
    return response.data.data.vehicle;
  } catch (error) {
    console.error('Error fetching business vehicle:', error);
    throw error;
  }
};

export const updateBusinessVehicle = async (businessId: string, vehicleId: string, vehicleData: any): Promise<BusinessVehicle> => {
  try {
    const response = await api().put(`/api/business/${businessId}/vehicles/${vehicleId}`, vehicleData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update business vehicle');
    }
    
    return response.data.data.vehicle;
  } catch (error) {
    console.error('Error updating business vehicle:', error);
    throw error;
  }
};

export const deleteBusinessVehicle = async (businessId: string, vehicleId: string): Promise<void> => {
  try {
    const response = await api().delete(`/api/business/${businessId}/vehicles/${vehicleId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to delete business vehicle');
    }
  } catch (error) {
    console.error('Error deleting business vehicle:', error);
    throw error;
  }
};

// Business Vehicle Assignments
export const createVehicleAssignment = async (
  businessId: string, 
  assignmentData: {
    vehicleId: string;
    userId?: string;
    assignmentType: 'PERMANENT' | 'TEMPORARY';
    startDate?: string;
    endDate?: string;
  }
): Promise<VehicleAssignment> => {
  try {
    const response = await api().post(`/api/business/${businessId}/vehicle-assignments`, assignmentData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to create vehicle assignment');
    }
    
    return response.data.data.assignment;
  } catch (error) {
    console.error('Error creating vehicle assignment:', error);
    throw error;
  }
};

export const getVehicleAssignments = async (businessId: string): Promise<VehicleAssignment[]> => {
  try {
    const response = await api().get(`/api/business/${businessId}/vehicle-assignments`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch vehicle assignments');
    }
    
    return response.data.data.assignments || [];
  } catch (error) {
    console.error('Error fetching vehicle assignments:', error);
    return [];
  }
};

export const getVehicleAssignment = async (businessId: string, assignmentId: string): Promise<VehicleAssignment> => {
  try {
    const response = await api().get(`/api/business/${businessId}/vehicle-assignments/${assignmentId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch vehicle assignment');
    }
    
    return response.data.data.assignment;
  } catch (error) {
    console.error('Error fetching vehicle assignment:', error);
    throw error;
  }
};

export const updateVehicleAssignment = async (businessId: string, assignmentId: string, assignmentData: any): Promise<VehicleAssignment> => {
  try {
    const response = await api().put(`/api/business/${businessId}/vehicle-assignments/${assignmentId}`, assignmentData);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update vehicle assignment');
    }
    
    return response.data.data.assignment;
  } catch (error) {
    console.error('Error updating vehicle assignment:', error);
    throw error;
  }
};

export const removeVehicleAssignment = async (businessId: string, assignmentId: string): Promise<void> => {
  try {
    const response = await api().delete(`/api/business/${businessId}/vehicle-assignments/${assignmentId}`);
    
    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to remove vehicle assignment');
    }
  } catch (error) {
    console.error('Error removing vehicle assignment:', error);
    throw error;
  }
};

// Dashboard Stats - Aggregated from existing endpoints (removed non-existent endpoints)
export const getDashboardStats = async (businessId?: string): Promise<BusinessStats> => {
  try {
    // For business users, get business-specific stats
    if (businessId) {
      const [businessUsers, businessVehicles] = await Promise.allSettled([
        getBusinessUsers(businessId),
        getBusinessVehicles(businessId)
        // getBusinessContracts(businessId) // TODO: Uncomment when API is ready
      ]);

      // Handle each promise result safely
      const teamMemberCount = businessUsers.status === 'fulfilled' ? businessUsers.value.length : 0;
      const fleetVehicleCount = businessVehicles.status === 'fulfilled' ? businessVehicles.value.length : 0;
      const contractCount = 0; // TODO: Set to actual count when getBusinessContracts API is ready

      // Log any failed requests for debugging
      if (businessUsers.status === 'rejected') {
        console.warn('Failed to fetch business users:', businessUsers.reason);
      }
      if (businessVehicles.status === 'rejected') {
        console.warn('Failed to fetch business vehicles:', businessVehicles.reason);
      }
      // TODO: Add businessContracts error handling when API is ready

      return {
        totalSessions: 0, // TODO: Implement when session API is available
        totalSpent: 0,    // TODO: Implement when session API is available
        totalKwh: 0,      // TODO: Implement when session API is available
        vehicleCount: 0, // TODO: Implement when vehicle API is available
        paymentMethodCount: 0, // TODO: Implement when payment method API is available
        freeAllowances: 0, // TODO: Implement when allowance API is available
        businessCount: 0, // TODO: Implement when business API is available
        teamMemberCount,
        fleetVehicleCount,
        contractCount,
        averageSessionCost: 0, // TODO: Calculate from sessions
        monthlyGrowth: 0       // TODO: Calculate from historical data
      };
    }

    // For personal users, return basic stats
    return {
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
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
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
    };
  }
};


