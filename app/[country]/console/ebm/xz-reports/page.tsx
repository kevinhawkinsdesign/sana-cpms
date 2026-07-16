'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/authContext';
import { UserRole } from '@/lib/utils/roleRedirect';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  ShoppingCart,
  Receipt,
  DollarSign,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge, Btn, Card, PageHead, Stat, Tabs } from '@/components/console/ui';
import { cn } from '@/lib/utils';
import { xzReportApi, XZReportData, ReportHistoryItem } from '@/lib/api/xzReport';
import { downloadAndSavePDF } from '@/lib/api/chargingSessions';
import dayjs from 'dayjs';

const formatCurrency = (amount: number) =>
  `RWF ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatNumber = (num: number, decimals = 2) =>
  num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

type TabType = 'x-report' | 'z-report' | 'history';

const TAB_DEFS = [
  { id: 'x-report', label: 'X Report' },
  { id: 'z-report', label: 'Z Report' },
  { id: 'history', label: 'Report History' },
];

export default function ConsoleXZReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useLocalizedRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('x-report');
  const [xReportData, setXReportData] = useState<XZReportData | null>(null);
  const [zReportData, setZReportData] = useState<XZReportData | null>(null);
  const [isDownloadingX, setIsDownloadingX] = useState(false);
  const [isDownloadingZ, setIsDownloadingZ] = useState(false);

  // History tab state
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [historyOffset, setHistoryOffset] = useState(0);
  const historyLimit = 20;

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // X Report mutation
  const generateXMutation = useMutation({
    mutationFn: xzReportApi.generateXReport,
    onSuccess: (data) => {
      setXReportData(data);
      toast.success('X Report generated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate X Report');
    },
  });

  // Z Report mutation
  const generateZMutation = useMutation({
    mutationFn: xzReportApi.generateZReport,
    onSuccess: (data) => {
      setZReportData(data);
      toast.success('Z Report generated successfully');
      queryClient.invalidateQueries({ queryKey: ['reportHistory'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate Z Report');
    },
  });

  // Report history query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reportHistory', historyFilter, historyOffset],
    queryFn: () => {
      const typeFilter = historyFilter === 'ALL' ? undefined : historyFilter;
      return xzReportApi.getReportHistory(typeFilter, historyLimit, historyOffset);
    },
    enabled: !!user && user.role === UserRole.ADMIN && activeTab === 'history',
  });

  const handleGenerateX = () => {
    generateXMutation.mutate();
  };

  const handleGenerateZ = () => {
    const confirmed = window.confirm(
      'Are you sure you want to generate a Z Report? This will close the current sales period.',
    );
    if (confirmed) {
      generateZMutation.mutate();
    }
  };

  const handleDownloadXPdf = async () => {
    try {
      setIsDownloadingX(true);
      const blob = xReportData
        ? await xzReportApi.downloadReportPdf(xReportData.reportId)
        : await xzReportApi.generateXReportPdf();
      const timestamp = dayjs().format('YYYY-MM-DD-HHmmss');
      await downloadAndSavePDF(blob, `x-report-${timestamp}.pdf`);
      toast.success('X Report PDF downloaded successfully');
    } catch {
      toast.error('Failed to download X Report PDF');
    } finally {
      setIsDownloadingX(false);
    }
  };

  const handleDownloadZPdf = async () => {
    try {
      setIsDownloadingZ(true);
      let blob: Blob;
      if (zReportData) {
        blob = await xzReportApi.downloadReportPdf(zReportData.reportId);
      } else {
        const history = await xzReportApi.getReportHistory('Z', 1, 0);
        if (history.items.length > 0) {
          blob = await xzReportApi.downloadReportPdf(history.items[0].id);
        } else {
          blob = await xzReportApi.generateZReportPdf();
        }
      }
      const timestamp = dayjs().format('YYYY-MM-DD-HHmmss');
      await downloadAndSavePDF(blob, `z-report-${timestamp}.pdf`);
      toast.success('Z Report PDF downloaded successfully');
    } catch {
      toast.error('Failed to download Z Report PDF');
    } finally {
      setIsDownloadingZ(false);
    }
  };

  const handleDownloadHistoryPdf = async (
    reportId: string,
    reportType: string,
    reportNumber: number,
  ) => {
    try {
      const blob = await xzReportApi.downloadReportPdf(reportId);
      await downloadAndSavePDF(blob, `${reportType.toLowerCase()}-report-${reportNumber}.pdf`);
      toast.success('Report PDF downloaded successfully');
    } catch {
      toast.error('Failed to download report PDF');
    }
  };

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <span className="kc-skeleton mx-auto block h-8 w-48 rounded-md" />
          <span className="kc-skeleton mx-auto block h-4 w-64 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHead title="X/Z Daily Reports" sub="Generate and view daily sales reports" />

      {/* Tab Navigation */}
      <Tabs
        tabs={TAB_DEFS}
        value={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {/* X Report Tab */}
      {activeTab === 'x-report' && (
        <div className="space-y-6">
          <Card title="Generate X Report">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                X Reports provide a snapshot of sales since the last Z report without closing the
                current period.
              </p>
              <div className="flex flex-wrap gap-3">
                <Btn
                  variant="primary"
                  size="sm"
                  icon="doc"
                  onClick={handleGenerateX}
                  loading={generateXMutation.isPending}
                >
                  {generateXMutation.isPending ? 'Generating...' : 'Generate X Report'}
                </Btn>
                <Btn
                  size="sm"
                  icon="download"
                  onClick={handleDownloadXPdf}
                  loading={isDownloadingX}
                >
                  {isDownloadingX ? 'Downloading...' : 'Download PDF'}
                </Btn>
              </div>
            </div>
          </Card>

          {xReportData && <ReportDataDisplay data={xReportData} />}
        </div>
      )}

      {/* Z Report Tab */}
      {activeTab === 'z-report' && (
        <div className="space-y-6">
          {/* Warning card */}
          <div className="rounded-2xl border border-amber-400 bg-amber-50 p-5 dark:border-amber-600 dark:bg-amber-950/20">
            <div className="mb-2 flex items-center gap-2 text-base font-medium text-amber-700 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Important Warning
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-500">
              Generating a Z report closes the current sales period. All subsequent X reports will
              start from this point. This action should typically be performed at the end of each
              business day.
            </p>
          </div>

          <Card title="Generate Z Report">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Z Reports close the current sales period and provide a final summary of all
                transactions.
              </p>
              <div className="flex flex-wrap gap-3">
                <Btn
                  variant="primary"
                  size="sm"
                  icon="doc"
                  onClick={handleGenerateZ}
                  loading={generateZMutation.isPending}
                >
                  {generateZMutation.isPending ? 'Generating...' : 'Generate Z Report'}
                </Btn>
                <Btn
                  size="sm"
                  icon="download"
                  onClick={handleDownloadZPdf}
                  loading={isDownloadingZ}
                >
                  {isDownloadingZ ? 'Downloading...' : 'Download PDF'}
                </Btn>
              </div>
            </div>
          </Card>

          {zReportData && <ReportDataDisplay data={zReportData} />}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'X', 'Z'] as const).map((f) => (
              <Btn
                key={f}
                size="xs"
                variant={historyFilter === f ? 'primary' : 'default'}
                onClick={() => {
                  setHistoryFilter(f);
                  setHistoryOffset(0);
                }}
              >
                {f === 'ALL' ? 'All Reports' : `${f} Reports Only`}
              </Btn>
            ))}
          </div>

          {/* History Table */}
          <Card title="Report History">
            {historyLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="kc-skeleton h-12 rounded-md" />
                ))}
              </div>
            ) : !historyData || historyData.items.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
                  No reports found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No reports have been generated yet.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="kc-table">
                    <thead>
                      <tr>
                        <th className="w-20">Report #</th>
                        <th className="w-20">Type</th>
                        <th>Period Start</th>
                        <th>Period End</th>
                        <th className="text-right">NS Total</th>
                        <th className="text-right">NR Total</th>
                        <th>Generated By</th>
                        <th>Date</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.items.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium">{item.reportNumber}</td>
                          <td>
                            <Badge kind={item.reportType === 'X' ? 'info' : 'ok'}>
                              {item.reportType}
                            </Badge>
                          </td>
                          <td className="text-sm">
                            {dayjs(item.periodStart).format('MMM D, YYYY HH:mm')}
                          </td>
                          <td className="text-sm">
                            {dayjs(item.periodEnd).format('MMM D, YYYY HH:mm')}
                          </td>
                          <td className="text-right">{formatCurrency(item.nsSalesTotal)}</td>
                          <td className="text-right">{formatCurrency(item.nrRefundTotal)}</td>
                          <td className="text-sm">
                            {item.generatedBy.firstName && item.generatedBy.lastName
                              ? `${item.generatedBy.firstName} ${item.generatedBy.lastName}`
                              : 'N/A'}
                          </td>
                          <td className="text-sm">
                            {dayjs(item.createdAt).format('MMM D, YYYY HH:mm')}
                          </td>
                          <td>
                            <Btn
                              size="xs"
                              variant="ghost"
                              icon="download"
                              onClick={() =>
                                handleDownloadHistoryPdf(
                                  item.id,
                                  item.reportType,
                                  item.reportNumber,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {historyOffset + 1} to{' '}
                    {Math.min(historyOffset + historyLimit, historyData.total)} of{' '}
                    {historyData.total} reports
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      size="xs"
                      onClick={() =>
                        setHistoryOffset(Math.max(0, historyOffset - historyLimit))
                      }
                      disabled={historyOffset === 0}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Btn>
                    <Btn
                      size="xs"
                      onClick={() => setHistoryOffset(historyOffset + historyLimit)}
                      disabled={historyOffset + historyLimit >= historyData.total}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Btn>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/** Displays report data for both X and Z reports. */
function ReportDataDisplay({ data }: { data: XZReportData }) {
  const netSales = data.nsSalesTotal - data.nrRefundTotal;

  return (
    <div className="space-y-6">
      {/* Period Info */}
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">Report Period:</span>{' '}
          Since last Z report
          <br />
          <span className="font-medium text-gray-800 dark:text-white/90">Period Start:</span>{' '}
          {dayjs(data.periodStart).format('MMM D, YYYY HH:mm')}
          <br />
          {data.periodEnd && (
            <>
              <span className="font-medium text-gray-800 dark:text-white/90">Period End:</span>{' '}
              {dayjs(data.periodEnd).format('MMM D, YYYY HH:mm')}
            </>
          )}
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="NS Total"
          value={formatCurrency(data.nsSalesTotal)}
          sub={`${data.nsReceiptCount} receipt${data.nsReceiptCount !== 1 ? 's' : ''}`}
          icon={<DollarSign size={16} />}
        />
        <Stat
          label="NR Total"
          value={formatCurrency(data.nrRefundTotal)}
          sub={`${data.nrReceiptCount} refund${data.nrReceiptCount !== 1 ? 's' : ''}`}
          icon={<Receipt size={16} />}
        />
        <Stat
          label="Net Sales"
          value={formatCurrency(netSales)}
          sub="NS - NR"
          icon={<DollarSign size={16} />}
        />
        <Stat
          label="Items Sold"
          value={data.totalItemsSold.toLocaleString()}
          icon={<ShoppingCart size={16} />}
        />
      </div>

      {/* Sales Summary */}
      <Card title="Sales Summary">
        <div className="overflow-x-auto">
          <table className="kc-table">
            <thead>
              <tr>
                <th>Type</th>
                <th className="text-right">Count</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Normal Sales (NS)</td>
                <td className="text-right">{data.nsReceiptCount}</td>
                <td className="text-right">{formatCurrency(data.nsSalesTotal)}</td>
              </tr>
              <tr>
                <td className="font-medium">Refunds (NR)</td>
                <td className="text-right">{data.nrReceiptCount}</td>
                <td className="text-right">{formatCurrency(data.nrRefundTotal)}</td>
              </tr>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-white/5">
                <td>Net</td>
                <td className="text-right">{data.nsReceiptCount - data.nrReceiptCount}</td>
                <td className="text-right">{formatCurrency(netSales)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tax Breakdown */}
      <Card title="Tax Breakdown">
        <div className="overflow-x-auto">
          <table className="kc-table">
            <thead>
              <tr>
                <th>Tax Type</th>
                <th className="text-right">NS Taxable</th>
                <th className="text-right">NS Tax</th>
                <th className="text-right">NR Taxable</th>
                <th className="text-right">NR Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Type A (18%)</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxableAmtA)}</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxAmtA)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxableAmtA)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxAmtA)}</td>
              </tr>
              <tr>
                <td className="font-medium">Type B (0%)</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxableAmtB)}</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxAmtB)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxableAmtB)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxAmtB)}</td>
              </tr>
              <tr>
                <td className="font-medium">Type C</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxableAmtC)}</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxAmtC)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxableAmtC)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxAmtC)}</td>
              </tr>
              <tr>
                <td className="font-medium">Type D</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxableAmtD)}</td>
                <td className="text-right">{formatCurrency(data.nsTax.taxAmtD)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxableAmtD)}</td>
                <td className="text-right">{formatCurrency(data.nrTax.taxAmtD)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Methods */}
      {data.paymentMethods && data.paymentMethods.length > 0 && (
        <Card title="Payment Method Breakdown">
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th className="text-right">NS Amount</th>
                  <th className="text-right">NR Amount</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentMethods.map((method) => (
                  <tr key={method.code}>
                    <td className="font-medium">{method.name}</td>
                    <td className="text-right">{formatCurrency(method.nsAmount)}</td>
                    <td className="text-right">{formatCurrency(method.nrAmount)}</td>
                    <td className="text-right font-medium">
                      {formatCurrency(method.nsAmount - method.nrAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Other Receipts */}
      {(data.copyReceiptCount > 0 ||
        data.trainingReceiptCount > 0 ||
        data.proformaReceiptCount > 0) && (
        <Card title="Other Receipts">
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Receipt Type</th>
                  <th className="text-right">Count</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.copyReceiptCount > 0 && (
                  <tr>
                    <td className="font-medium">Copy</td>
                    <td className="text-right">{data.copyReceiptCount}</td>
                    <td className="text-right">{formatCurrency(data.copyReceiptTotal)}</td>
                  </tr>
                )}
                {data.trainingReceiptCount > 0 && (
                  <tr>
                    <td className="font-medium">Training</td>
                    <td className="text-right">{data.trainingReceiptCount}</td>
                    <td className="text-right">{formatCurrency(data.trainingReceiptTotal)}</td>
                  </tr>
                )}
                {data.proformaReceiptCount > 0 && (
                  <tr>
                    <td className="font-medium">Proforma</td>
                    <td className="text-right">{data.proformaReceiptCount}</td>
                    <td className="text-right">{formatCurrency(data.proformaReceiptTotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
