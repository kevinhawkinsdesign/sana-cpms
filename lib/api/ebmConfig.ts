import api from './api';

// EBM MRC Configuration Types
export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface EbmMrcConfig {
  id: string;
  mrcValue: string;
  reason?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: UserInfo;
}

export interface EbmMrcConfigDeactivated extends EbmMrcConfig {
  deactivatedAt: string;
  deactivatedBy: UserInfo;
}

export interface EbmMrcConfigHistory extends EbmMrcConfig {
  deactivatedAt?: string | null;
  deactivatedBy?: UserInfo | null;
}

export interface CreateMrcConfigData {
  mrcValue: string;
  reason?: string;
}

export interface MrcHistoryResponse {
  configs: EbmMrcConfigHistory[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

// API Functions
export const ebmConfigApi = {
  /**
   * Create or update MRC configuration
   */
  createMrcConfig: async (data: CreateMrcConfigData): Promise<EbmMrcConfig> => {
    const response = await api().post<ApiResponse<{ config: EbmMrcConfig }>>(
      '/api/admin/ebm/mrc-config',
      data
    );

    if (response.status !== 201 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to create MRC configuration');
    }

    if (!response.data?.data?.config) {
      throw new Error('Invalid response: missing config data');
    }

    return response.data.data.config;
  },

  /**
   * Get active MRC configuration
   */
  getActiveMrcConfig: async (): Promise<EbmMrcConfig | null> => {
    const response = await api().get<ApiResponse<{ config: EbmMrcConfig | null }>>(
      '/api/admin/ebm/mrc-config'
    );

    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch active MRC configuration');
    }

    if (!response.data?.data) {
      throw new Error('Invalid response: missing data');
    }

    return response.data.data.config;
  },

  /**
   * Get MRC configuration history
   */
  getMrcHistory: async (page: number = 1, limit: number = 50): Promise<MrcHistoryResponse> => {
    const response = await api().get<ApiResponse<MrcHistoryResponse>>(
      `/api/admin/ebm/mrc-config/history?page=${page}&limit=${limit}`
    );

    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to fetch MRC history');
    }

    if (!response.data?.data) {
      throw new Error('Invalid response: missing history data');
    }

    return response.data.data;
  },

  /**
   * Deactivate current MRC configuration
   */
  deactivateMrcConfig: async (): Promise<EbmMrcConfigDeactivated> => {
    const response = await api().delete<ApiResponse<{ config: EbmMrcConfigDeactivated }>>(
      '/api/admin/ebm/mrc-config'
    );

    if (response.status !== 200 || response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to deactivate MRC configuration');
    }

    if (!response.data?.data?.config) {
      throw new Error('Invalid response: missing config data');
    }

    return response.data.data.config;
  },
};
