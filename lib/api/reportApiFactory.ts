import api from './api';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ReportApiConfig {
  dataEndpoint: string;
  pdfEndpoint: string;
  dataErrorMessage: string;
  pdfErrorMessage: string;
}

export function createDateRangeReportApi<T>(config: ReportApiConfig) {
  return {
    getReportData: async (startDate: string, endDate: string): Promise<T> => {
      const response = await api().get<ApiResponse<T>>(
        `${config.dataEndpoint}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (response.status !== 200 || !response.data?.success) {
        throw new Error(response.data?.message || config.dataErrorMessage);
      }

      return response.data.data;
    },

    downloadPdf: async (startDate: string, endDate: string): Promise<Blob> => {
      const response = await api().get(
        `${config.pdfEndpoint}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { responseType: 'blob' }
      );

      if (response.status !== 200) {
        throw new Error(config.pdfErrorMessage);
      }

      return response.data as Blob;
    },
  };
}
