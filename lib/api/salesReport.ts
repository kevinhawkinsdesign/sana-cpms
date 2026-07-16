import { createDateRangeReportApi } from './reportApiFactory';

export interface SalesReportTransaction {
  sessionId: string;
  buyerTin: string | null;
  /** Phone on the EBM (MOMO payer phone if MOMO paid, else what operator set). */
  buyerPhone: string | null;
  buyerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  items: string;
  vat: number;
  receiptType: string;
  /** 'Training Sale' when VSDC salesTypeCode === 'T', else 'Normal Sale'. */
  salesType: string;
  salesTypeCode: string | null;
  paymentMethod: string;
  distributionPhone: string | null;
  distributionSentAt: string | null;
  distributed: boolean;
}

export interface SalesReportBreakdown {
  count: number;
  totalSalesAmount: number;
  totalVat: number;
}

export interface SalesReportData {
  transactions: SalesReportTransaction[];
  totalSalesAmount: number;
  totalVat: number;
  totalTransactions: number;
  breakdownBySalesType: {
    normal: SalesReportBreakdown;
    training: SalesReportBreakdown;
  };
  distributionSummary: {
    distributed: number;
    notDistributed: number;
  };
  startDate: string;
  endDate: string;
}

export const salesReportApi = createDateRangeReportApi<SalesReportData>({
  dataEndpoint: '/api/ebm/sales-report/data',
  pdfEndpoint: '/api/ebm/sales-report/pdf',
  dataErrorMessage: 'Failed to fetch sales report data',
  pdfErrorMessage: 'Failed to download sales report PDF',
});
