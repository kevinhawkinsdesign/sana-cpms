import { createDateRangeReportApi } from './reportApiFactory';

export interface PluReportItem {
  itemCode: string;
  itemName: string;
  unitPrice: number;
  taxTypeCode: string;
  taxRate: number;
  quantitySold: number;
  totalAmount: number;
  totalTax: number;
}

export interface PluReportData {
  items: PluReportItem[];
  grandTotalAmount: number;
  grandTotalTax: number;
  grandTotalQuantity: number;
  totalTransactions: number;
  startDate: string;
  endDate: string;
}

export const pluReportApi = createDateRangeReportApi<PluReportData>({
  dataEndpoint: '/api/ebm/plu-report/data',
  pdfEndpoint: '/api/ebm/plu-report/pdf',
  dataErrorMessage: 'Failed to fetch PLU report data',
  pdfErrorMessage: 'Failed to download PLU report PDF',
});
