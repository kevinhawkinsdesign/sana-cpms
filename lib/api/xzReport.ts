import api from './api';
import { ApiResponse } from './reportApiFactory';

// ============================================================================
// Interfaces
// ============================================================================

export interface TaxBreakdown {
  taxableAmtA: number; taxAmtA: number;
  taxableAmtB: number; taxAmtB: number;
  taxableAmtC: number; taxAmtC: number;
  taxableAmtD: number; taxAmtD: number;
}

export interface PaymentMethodEntry {
  code: string;
  name: string;
  nsAmount: number;
  nrAmount: number;
}

export interface XZReportData {
  reportType: 'X' | 'Z';
  reportId: string;
  reportNumber: number;
  tradeName: string;
  tin: string;
  cisDesignation: string;
  mrc: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;

  nsSalesTotal: number;
  nsReceiptCount: number;
  nrRefundTotal: number;
  nrReceiptCount: number;

  nsTax: TaxBreakdown;
  nrTax: TaxBreakdown;

  copyReceiptCount: number;
  copyReceiptTotal: number;
  trainingReceiptCount: number;
  trainingReceiptTotal: number;
  proformaReceiptCount: number;
  proformaReceiptTotal: number;

  paymentMethods: PaymentMethodEntry[];

  totalItemsSold: number;
  totalDiscounts: number;
  openingDeposit: number;
  incompleteSales: number;

  zReportNumber?: number;
  lastZReportDate?: string;
}

export interface ReportHistoryItem {
  id: string;
  reportType: string;
  reportNumber: number;
  periodStart: string;
  periodEnd: string;
  nsSalesTotal: number;
  nrRefundTotal: number;
  nsReceiptCount: number;
  nrReceiptCount: number;
  createdAt: string;
  generatedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface ReportHistoryResponse {
  items: ReportHistoryItem[];
  total: number;
}

// ApiResponse imported from reportApiFactory

// ============================================================================
// API Functions
// ============================================================================

export const xzReportApi = {
  generateXReport: async (): Promise<XZReportData> => {
    const response = await api().post<ApiResponse<XZReportData>>('/api/ebm/x-report/generate');
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to generate X report');
    }
    return response.data.data;
  },

  generateXReportPdf: async (): Promise<Blob> => {
    const response = await api().post('/api/ebm/x-report/generate/pdf', {}, { responseType: 'blob' });
    if (response.status !== 200) {
      throw new Error('Failed to generate X report PDF');
    }
    return response.data as Blob;
  },

  generateZReport: async (): Promise<XZReportData> => {
    const response = await api().post<ApiResponse<XZReportData>>('/api/ebm/z-report/generate');
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to generate Z report');
    }
    return response.data.data;
  },

  generateZReportPdf: async (): Promise<Blob> => {
    const response = await api().post('/api/ebm/z-report/generate/pdf', {}, { responseType: 'blob' });
    if (response.status !== 200) {
      throw new Error('Failed to generate Z report PDF');
    }
    return response.data as Blob;
  },

  getReportHistory: async (
    reportType?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ReportHistoryResponse> => {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const response = await api().get<ApiResponse<ReportHistoryResponse>>(
      `/api/ebm/daily-reports?${params.toString()}`
    );
    if (response.status !== 200 || !response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch report history');
    }
    return response.data.data;
  },

  downloadReportPdf: async (reportId: string): Promise<Blob> => {
    const response = await api().get(`/api/ebm/daily-reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
    if (response.status !== 200) {
      throw new Error('Failed to download report PDF');
    }
    return response.data as Blob;
  },
};
