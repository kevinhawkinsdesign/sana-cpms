import api from './api';

export interface StandaloneProformaInput {
  customerName: string;
  customerTin?: string;
  customerPhone?: string;
  energyKwh: number;
  ratePerKwh: number;
  ebmItemId: string;
  purchaseCode?: string;
  discountRate?: number;
  email?: string;
  phone?: string;
}

export const standaloneProformaApi = {
  create: async (data: StandaloneProformaInput): Promise<Blob> => {
    const response = await api().post('/api/ebm/standalone-proforma', data, {
      responseType: 'blob'
    });
    return response.data;
  }
};
