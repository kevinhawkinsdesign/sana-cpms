import api from './api';

// EBM Item Types
export interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface EbmItem {
  id: string;
  itemCode: string;
  itemClassCode: string;
  itemName: string;
  taxTypeCode: string;
  taxRate: number;
  unitPrice: number | string; // Can be Decimal string from backend
  quantityUnitCode: string;
  packageUnitCode: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserInfo | null;
  // VSDC fields
  itemTypeCode: string;
  originCountryCode: string;
  insuranceApplicable: boolean;
  groupPriceLevel1?: number | string | null;
  groupPriceLevel2?: number | string | null;
  groupPriceLevel3?: number | string | null;
  groupPriceLevel4?: number | string | null;
  groupPriceLevel5?: number | string | null;
  barcode?: string | null;
  standardItemName?: string | null;
  additionalInfo?: string | null;
  // VSDC registration status
  vsdcRegistered: boolean;
  vsdcRegisteredAt?: string | null;
  vsdcLastSyncAt?: string | null;
  vsdcErrorMessage?: string | null;
  vsdcRetryCount: number;
}

export interface CreateEbmItemData {
  itemCode?: string; // Optional - auto-generated if not provided
  itemClassCode: string;
  itemName: string;
  taxTypeCode: string;
  taxRate: number;
  unitPrice: number;
  quantityUnitCode?: string;
  packageUnitCode?: string;
  isDefault?: boolean;
  // VSDC fields
  itemTypeCode?: string;
  originCountryCode?: string;
  insuranceApplicable?: boolean;
  groupPriceLevel1?: number | null;
  groupPriceLevel2?: number | null;
  groupPriceLevel3?: number | null;
  groupPriceLevel4?: number | null;
  groupPriceLevel5?: number | null;
  barcode?: string;
  standardItemName?: string;
  additionalInfo?: string;
  // Auto-register flag
  autoRegisterVsdc?: boolean;
}

export interface UpdateEbmItemData {
  itemCode?: string;
  itemClassCode?: string;
  itemName?: string;
  taxTypeCode?: string;
  taxRate?: number;
  unitPrice?: number;
  quantityUnitCode?: string;
  packageUnitCode?: string;
  isDefault?: boolean;
  // VSDC fields
  itemTypeCode?: string;
  originCountryCode?: string;
  insuranceApplicable?: boolean;
  groupPriceLevel1?: number | null;
  groupPriceLevel2?: number | null;
  groupPriceLevel3?: number | null;
  groupPriceLevel4?: number | null;
  groupPriceLevel5?: number | null;
  barcode?: string;
  standardItemName?: string;
  additionalInfo?: string;
}

export interface VsdcRegistrationResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface VsdcSyncResult {
  success: boolean;
  message: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
}

export interface BulkRegisterResult {
  success: boolean;
  summary: {
    succeeded: number;
    failed: number;
  };
  results: Array<{
    itemId: string;
    success: boolean;
    message: string;
    error?: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Item Classification Types
export interface EbmItemClassification {
  id: string;
  itemClsCd: string;
  itemClsNm: string;
  itemClsLvl: number | null;
  taxTyCd: string | null;
  isActive: boolean;
}

export interface ItemClassificationSearchResult {
  items: EbmItemClassification[];
  total: number;
  syncStatus: 'fresh' | 'syncing' | 'error';
}

// API Functions
// Sync Preview Types
export interface SyncPreviewSummary {
  totalFromVsdc: number;
  newItems: number;
  updatedItems: number;
  skippedItems: number;
}

export interface SyncPreviewResult {
  success: boolean;
  message: string;
  syncBatchId: string;
  summary: SyncPreviewSummary;
  errors: string[];
}

export interface SyncPreviewItem {
  id: string;
  vsdcItemCode: string;
  vsdcItemName: string;
  actionType: 'CREATE' | 'UPDATE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  vsdcData: Record<string, any>;
  localData: Record<string, any> | null;
  diffSummary: Record<string, { old: any; new: any }> | null;
  createdAt: string;
  syncBatchId: string;
  reviewedBy?: { id: string; firstName: string; lastName: string; email: string };
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface SyncPreviewStats {
  pending: number;
  approved: number;
  rejected: number;
  applied: number;
}

export interface ApplyResult {
  applied: number;
  failed: number;
  errors: string[];
}

export const ebmItemsApi = {
  /**
   * Get all EBM items
   */
  getAllItems: async (): Promise<EbmItem[]> => {
    const response = await api().get<ApiResponse<EbmItem[]>>('/api/ebm/items');

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch EBM items');
    }

    return response.data.data || [];
  },

  /**
   * Get a single EBM item by ID
   */
  getItem: async (id: string): Promise<EbmItem> => {
    const response = await api().get<ApiResponse<EbmItem>>(`/api/ebm/items/${id}`);

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch EBM item');
    }

    return response.data.data;
  },

  /**
   * Create a new EBM item
   */
  createItem: async (data: CreateEbmItemData): Promise<EbmItem> => {
    const response = await api().post<ApiResponse<EbmItem>>('/api/ebm/items', data);

    if (response.status !== 201 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to create EBM item');
    }

    return response.data.data;
  },

  /**
   * Create EBM item with optional VSDC registration
   */
  createItemWithVsdc: async (data: CreateEbmItemData): Promise<{
    item: EbmItem;
    vsdcRegistration?: VsdcRegistrationResult;
  }> => {
    const response = await api().post<ApiResponse<{
      item: EbmItem;
      vsdcRegistration?: VsdcRegistrationResult;
    }>>('/api/ebm/items/with-vsdc', data);

    if (response.status !== 201 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to create EBM item');
    }

    return response.data.data;
  },

  /**
   * Update an EBM item
   */
  updateItem: async (id: string, data: UpdateEbmItemData): Promise<EbmItem> => {
    const response = await api().put<ApiResponse<EbmItem>>(`/api/ebm/items/${id}`, data);

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to update EBM item');
    }

    return response.data.data;
  },

  /**
   * Deactivate an EBM item (soft delete)
   */
  deactivateItem: async (id: string): Promise<void> => {
    const response = await api().delete<ApiResponse<null>>(`/api/ebm/items/${id}`);

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to deactivate EBM item');
    }
  },

  /**
   * Set an item as the default
   */
  setDefaultItem: async (id: string): Promise<EbmItem> => {
    const response = await api().post<ApiResponse<EbmItem>>(`/api/ebm/items/${id}/set-default`);

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to set default EBM item');
    }

    return response.data.data;
  },

  /**
   * Get items not yet registered with VSDC
   */
  getUnregisteredItems: async (): Promise<EbmItem[]> => {
    const response = await api().get<ApiResponse<EbmItem[]>>('/api/ebm/items/unregistered');

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch unregistered items');
    }

    return response.data.data || [];
  },

  /**
   * Register a single item with VSDC
   */
  registerWithVsdc: async (id: string): Promise<{
    item: EbmItem;
    error?: string;
  }> => {
    const response = await api().post<ApiResponse<{
      item: EbmItem;
      error?: string;
    }>>(`/api/ebm/items/${id}/register-vsdc`);

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to register item with VSDC');
    }

    return response.data.data;
  },

  /**
   * Retry VSDC registration for a failed item
   */
  retryVsdcRegistration: async (id: string): Promise<{
    success: boolean;
    message: string;
    item?: EbmItem;
    error?: string;
  }> => {
    const response = await api().post<ApiResponse<{
      item?: EbmItem;
      error?: string;
    }>>(`/api/ebm/items/${id}/retry-vsdc`);

    return {
      success: response.data?.success || false,
      message: response.data?.message || 'Unknown response',
      item: response.data?.data?.item,
      error: response.data?.data?.error,
    };
  },

  /**
   * Sync items from VSDC
   */
  syncFromVsdc: async (lastSyncDate?: string): Promise<VsdcSyncResult> => {
    const response = await api().post<ApiResponse<VsdcSyncResult>>(
      '/api/ebm/items/sync-vsdc',
      lastSyncDate ? { lastSyncDate } : {}
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to sync items from VSDC');
    }

    return response.data.data;
  },

  /**
   * Bulk register items with VSDC
   */
  bulkRegisterWithVsdc: async (itemIds: string[]): Promise<BulkRegisterResult> => {
    const response = await api().post<ApiResponse<BulkRegisterResult>>(
      '/api/ebm/items/bulk-register-vsdc',
      { itemIds }
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to bulk register items');
    }

    return response.data.data;
  },

  // ============================================================================
  // VSDC Sync Preview (Approval Workflow)
  // ============================================================================

  /**
   * Create a sync preview - fetches from VSDC and creates pending items for review
   */
  createSyncPreview: async (lastSyncDate?: string): Promise<SyncPreviewResult> => {
    const response = await api().post<ApiResponse<SyncPreviewResult>>(
      '/api/ebm/sync-preview/create',
      lastSyncDate ? { lastSyncDate } : {}
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to create sync preview');
    }

    return response.data.data;
  },

  /**
   * Get pending preview items for review
   */
  getPendingPreviews: async (syncBatchId?: string): Promise<SyncPreviewItem[]> => {
    const params = syncBatchId ? `?syncBatchId=${syncBatchId}` : '';
    const response = await api().get<ApiResponse<SyncPreviewItem[]>>(
      `/api/ebm/sync-preview/pending${params}`
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch pending previews');
    }

    return response.data.data || [];
  },

  /**
   * Get sync preview statistics
   */
  getSyncPreviewStats: async (): Promise<SyncPreviewStats> => {
    const response = await api().get<ApiResponse<SyncPreviewStats>>(
      '/api/ebm/sync-preview/stats'
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch sync stats');
    }

    return response.data.data;
  },

  /**
   * Get sync history (applied/rejected items)
   */
  getSyncHistory: async (options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SyncPreviewItem[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api().get<ApiResponse<{ items: SyncPreviewItem[]; total: number }>>(
      `/api/ebm/sync-preview/history${queryString}`
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch sync history');
    }

    return response.data.data;
  },

  /**
   * Approve preview items
   */
  approvePreviews: async (previewIds: string[]): Promise<{ approved: number }> => {
    const response = await api().post<ApiResponse<{ approved: number }>>(
      '/api/ebm/sync-preview/approve',
      { previewIds }
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to approve previews');
    }

    return response.data.data;
  },

  /**
   * Reject preview items
   */
  rejectPreviews: async (previewIds: string[], reason?: string): Promise<{ rejected: number }> => {
    const response = await api().post<ApiResponse<{ rejected: number }>>(
      '/api/ebm/sync-preview/reject',
      { previewIds, reason }
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to reject previews');
    }

    return response.data.data;
  },

  /**
   * Apply all approved preview items
   */
  applyApprovedPreviews: async (): Promise<ApplyResult> => {
    const response = await api().post<ApiResponse<ApplyResult>>(
      '/api/ebm/sync-preview/apply'
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to apply previews');
    }

    return response.data.data;
  },

  /**
   * Clear old pending previews
   */
  clearOldPreviews: async (olderThanDays?: number): Promise<{ deleted: number }> => {
    const response = await api().post<ApiResponse<{ deleted: number }>>(
      '/api/ebm/sync-preview/clear-old',
      olderThanDays ? { olderThanDays } : {}
    );

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to clear old previews');
    }

    return response.data.data;
  },

  // ============================================================================
  // Item Classification Search
  // ============================================================================

  /**
   * Search item classifications with background VSDC refresh
   */
  getItemClassifications: async (search?: string, limit?: number): Promise<ItemClassificationSearchResult> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('isActive', 'true');
    params.append('limit', String(limit || 50));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api().get<ApiResponse<ItemClassificationSearchResult>>(
      `/api/ebm/item-classifications/search${queryString}`
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch item classifications');
    }

    return response.data.data;
  },
};
