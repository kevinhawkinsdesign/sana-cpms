'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Zap,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { Card, Btn, PageHead, Stat } from '@/components/console/ui';
import { cn } from '@/lib/utils';
import { pluReportApi, PluReportData } from '@/lib/api/pluReport';
import { useReportPage, formatCurrency, formatNumber } from '@/lib/hooks/useReportPage';
import dayjs from 'dayjs';

const INPUT_CLASS =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#0B4F42] focus:ring-3 focus:ring-[#0B4F42]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90';

export default function ConsolePluReportPage() {
  const report = useReportPage({
    reportName: 'PLU report',
    filePrefix: 'plu-report',
    downloadFn: pluReportApi.downloadPdf,
    defaultStartDaysAgo: 10,
  });

  const { data, isLoading, error } = useQuery<PluReportData>({
    queryKey: ['pluReport', report.startISO, report.endISO],
    queryFn: () => pluReportApi.getReportData(report.startISO, report.endISO),
    enabled: report.isAdmin,
  });

  if (!report.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-2 text-center">
          <span className="kc-skeleton mx-auto block h-8 w-48 rounded-md" />
          <span className="kc-skeleton mx-auto block h-4 w-64 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHead
        title="PLU Report"
        sub="Sales summary by item for the selected date range"
        actions={
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dayjs(report.dateRange.startDate).format('YYYY-MM-DD')}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime())) {
                  report.setDateRange((prev) => ({
                    ...prev,
                    startDate: d,
                  }));
                }
              }}
              className={cn(INPUT_CLASS, 'w-40')}
            />
            <span className="text-sm text-gray-400">to</span>
            <input
              type="date"
              value={dayjs(report.dateRange.endDate).format('YYYY-MM-DD')}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime())) {
                  report.setDateRange((prev) => ({
                    ...prev,
                    endDate: d,
                  }));
                }
              }}
              className={cn(INPUT_CLASS, 'w-40')}
            />
            <Btn
              variant="primary"
              size="sm"
              icon="download"
              onClick={report.handleDownloadPdf}
              loading={report.isDownloading}
              disabled={isLoading || !data?.items?.length}
            >
              Download PDF
            </Btn>
          </div>
        }
      />

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="kc-skeleton h-[90px] rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <Card className="p-7 text-center text-sm text-gray-400">
          Something went wrong loading the PLU report. Please try again.
        </Card>
      )}

      {/* Data */}
      {!isLoading && !error && data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Total Transactions"
              value={data.totalTransactions.toLocaleString()}
              icon={<ShoppingCart size={16} />}
            />
            <Stat
              label="Total Quantity (kWh)"
              value={formatNumber(data.grandTotalQuantity)}
              icon={<Zap size={16} />}
            />
            <Stat
              label="Total Tax"
              value={formatCurrency(data.grandTotalTax)}
              icon={<Receipt size={16} />}
            />
            <Stat
              label="Grand Total"
              value={formatCurrency(data.grandTotalAmount)}
              icon={<DollarSign size={16} />}
            />
          </div>

          {/* Table */}
          {data.items.length === 0 ? (
            <Card className="p-7 text-center text-sm text-gray-400">
              No completed EBM sales found for the selected date range.
            </Card>
          ) : (
            <Card title="Items Summary">
              <div className="overflow-x-auto">
                <table className="kc-table">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-center">Tax Rate</th>
                      <th className="text-right">Qty Sold</th>
                      <th className="text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => (
                      <tr key={item.itemCode}>
                        <td className="font-medium">{idx + 1}</td>
                        <td className="font-mono text-xs">{item.itemCode}</td>
                        <td>{item.itemName}</td>
                        <td className="text-right">{formatNumber(item.unitPrice)}</td>
                        <td className="text-center">
                          {item.taxTypeCode}-{item.taxRate}%
                        </td>
                        <td className="text-right">{formatNumber(item.quantitySold)}</td>
                        <td className="text-right font-medium">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-white/5">
                      <td colSpan={5} className="text-right">
                        Grand Total
                      </td>
                      <td className="text-right">{formatNumber(data.grandTotalQuantity)}</td>
                      <td className="text-right">{formatCurrency(data.grandTotalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
