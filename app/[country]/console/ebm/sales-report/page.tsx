'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Receipt,
  DollarSign,
  GraduationCap,
  Send,
  Search,
  Download,
  Loader2,
} from 'lucide-react';
import { Badge, Btn, Card, PageHead, Stat } from '@/components/console/ui';
import { cn } from '@/lib/utils';
import { salesReportApi, SalesReportData, SalesReportTransaction } from '@/lib/api/salesReport';
import { distributeEBM, downloadEBM, downloadAndSavePDF } from '@/lib/api/chargingSessions';
import { toast } from 'sonner';
import { useReportPage, formatCurrency } from '@/lib/hooks/useReportPage';
import dayjs from 'dayjs';

const INPUT_CLASS =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90';

type SalesTypeFilter = 'ALL' | 'NORMAL' | 'TRAINING';
type DistributionFilter = 'ALL' | 'DISTRIBUTED' | 'NOT_DISTRIBUTED';

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-black">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-[#08294f] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-black dark:text-gray-300 dark:hover:bg-white/5',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DistributionCell({
  tx,
  isPending,
  onRedistribute,
}: {
  tx: SalesReportTransaction;
  isPending: boolean;
  onRedistribute: (sessionId: string, phone: string) => void;
}) {
  const fallbackPhone = tx.distributionPhone || tx.buyerPhone;

  const handleRedistribute = () => {
    onRedistribute(tx.sessionId, fallbackPhone || '');
  };

  if (tx.distributed) {
    const sent = tx.distributionSentAt
      ? new Date(tx.distributionSentAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;
    return (
      <div
        className="inline-flex flex-col items-center gap-1 leading-tight"
        title={
          tx.distributionPhone
            ? `Sent to ${tx.distributionPhone}${sent ? ` at ${sent}` : ''}`
            : undefined
        }
      >
        <Badge kind="info">Sent</Badge>
        {tx.distributionPhone && (
          <span className="mt-0.5 font-mono text-[10px] text-gray-400">
            {tx.distributionPhone}
          </span>
        )}
        <button
          type="button"
          onClick={handleRedistribute}
          disabled={isPending}
          className="text-[10px] text-[#08294f] hover:underline disabled:opacity-50"
        >
          Redistribute
        </button>
      </div>
    );
  }
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <Badge kind="neutral">Not sent</Badge>
      <button
        type="button"
        onClick={handleRedistribute}
        disabled={isPending}
        className="text-[10px] text-[#08294f] hover:underline disabled:opacity-50"
      >
        Redistribute
      </button>
    </div>
  );
}

function SalesReportContent({
  data,
  onRedistributed,
}: {
  data: SalesReportData;
  onRedistributed: () => void;
}) {
  const [search, setSearch] = useState('');
  const [salesTypeFilter, setSalesTypeFilter] = useState<SalesTypeFilter>('ALL');
  const [distributionFilter, setDistributionFilter] = useState<DistributionFilter>('ALL');
  const [redistributeModal, setRedistributeModal] = useState<{
    open: boolean;
    sessionId: string;
    phone: string;
  }>({
    open: false,
    sessionId: '',
    phone: '',
  });
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null);

  const handleDownloadEbm = async (sessionId: string) => {
    setDownloadingSessionId(sessionId);
    try {
      const pdfBlob = await downloadEBM(sessionId);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `EBM_Receipt_${sessionId.slice(0, 8)}_${timestamp}.pdf`;
      await downloadAndSavePDF(pdfBlob, filename);
      toast.success('EBM downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download EBM receipt');
    } finally {
      setDownloadingSessionId(null);
    }
  };

  const redistributeMutation = useMutation({
    mutationFn: ({ sessionId, phone }: { sessionId: string; phone: string }) =>
      distributeEBM({ sessionId, phone }),
    onSuccess: () => {
      toast.success('EBM redistributed successfully');
      setRedistributeModal({ open: false, sessionId: '', phone: '' });
      onRedistributed();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to redistribute EBM');
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (salesTypeFilter === 'NORMAL' && t.salesTypeCode === 'T') return false;
      if (salesTypeFilter === 'TRAINING' && t.salesTypeCode !== 'T') return false;
      if (distributionFilter === 'DISTRIBUTED' && !t.distributed) return false;
      if (distributionFilter === 'NOT_DISTRIBUTED' && t.distributed) return false;
      if (needle) {
        const hay = [
          t.sessionId,
          t.buyerTin,
          t.buyerPhone,
          t.buyerName,
          t.invoiceNumber,
          t.paymentMethod,
          t.distributionPhone,
        ]
          .filter((v): v is string => !!v)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data.transactions, search, salesTypeFilter, distributionFilter]);

  const filteredTotals = useMemo(() => {
    let amount = 0;
    let vat = 0;
    for (const t of filtered) {
      amount += t.totalAmount;
      vat += t.vat;
    }
    return {
      count: filtered.length,
      totalAmount: Math.round(amount * 100) / 100,
      totalVat: Math.round(vat * 100) / 100,
    };
  }, [filtered]);

  const anyFilter =
    salesTypeFilter !== 'ALL' || distributionFilter !== 'ALL' || search.trim().length > 0;

  return (
    <>
      {/* Redistribute Modal */}
      {redistributeModal.open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[16vh]">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setRedistributeModal({ open: false, sessionId: '', phone: '' })}
            className="absolute inset-0 cursor-default border-none bg-black/50"
          />
          <div className="kc-fadeup relative w-[500px] max-w-[calc(100vw-32px)] rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
            <div className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
              Redistribute EBM
            </div>
            <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Enter the phone number that should receive this EBM link.
            </div>
            <input
              type="text"
              value={redistributeModal.phone}
              onChange={(e) =>
                setRedistributeModal((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="e.g. 78xxxxxxx"
              autoFocus
              className={cn(INPUT_CLASS, 'mb-5')}
            />
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/5">
              <Btn
                size="sm"
                onClick={() =>
                  setRedistributeModal({ open: false, sessionId: '', phone: '' })
                }
                disabled={redistributeMutation.isPending}
              >
                Cancel
              </Btn>
              <Btn
                size="sm"
                variant="primary"
                onClick={() => {
                  const phone = redistributeModal.phone.trim();
                  if (!phone) {
                    toast.error('Phone number is required for redistribution');
                    return;
                  }
                  redistributeMutation.mutate({
                    sessionId: redistributeModal.sessionId,
                    phone,
                  });
                }}
                loading={redistributeMutation.isPending}
              >
                {redistributeMutation.isPending ? 'Sending...' : 'Send'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Total Transactions"
          value={data.totalTransactions.toLocaleString()}
          icon={<ShoppingCart size={16} />}
        />
        <Stat
          label="Total VAT"
          value={formatCurrency(data.totalVat)}
          icon={<Receipt size={16} />}
        />
        <Stat
          label="Total Sales"
          value={formatCurrency(data.totalSalesAmount)}
          icon={<DollarSign size={16} />}
        />
        <Stat
          label="Normal Sales"
          value={`${data.breakdownBySalesType.normal.count.toLocaleString()}`}
          sub={formatCurrency(data.breakdownBySalesType.normal.totalSalesAmount)}
          icon={<ShoppingCart size={16} />}
        />
        <Stat
          label="Training Sales"
          value={`${data.breakdownBySalesType.training.count.toLocaleString()}`}
          sub={formatCurrency(data.breakdownBySalesType.training.totalSalesAmount)}
          icon={<GraduationCap size={16} />}
        />
        <Stat
          label="Distributed"
          value={`${data.distributionSummary.distributed.toLocaleString()} / ${data.totalTransactions.toLocaleString()}`}
          icon={<Send size={16} />}
        />
      </div>

      {data.transactions.length === 0 ? (
        <Card className="p-7 text-center text-sm text-gray-400">
          No completed sales found for the selected date range.
        </Card>
      ) : (
        <Card
          title={
            <div className="flex items-center justify-between gap-3">
              <span>Sales Transactions</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {anyFilter
                  ? `Showing ${filteredTotals.count.toLocaleString()} of ${data.totalTransactions.toLocaleString()}`
                  : `${data.totalTransactions.toLocaleString()} total`}
              </span>
            </div>
          }
        >
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search session ID, TIN, phone, name, invoice #, payment method"
                className={cn(INPUT_CLASS, 'pl-8')}
              />
            </div>

            <FilterPills
              label="Sales type"
              value={salesTypeFilter}
              onChange={(v) => setSalesTypeFilter(v)}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'TRAINING', label: 'Training' },
              ]}
            />

            <FilterPills
              label="Distribution"
              value={distributionFilter}
              onChange={(v) => setDistributionFilter(v)}
              options={[
                { value: 'ALL', label: 'All' },
                { value: 'DISTRIBUTED', label: 'Sent' },
                { value: 'NOT_DISTRIBUTED', label: 'Not sent' },
              ]}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Session ID</th>
                  <th>Buyer TIN</th>
                  <th>Buyer Phone</th>
                  <th>Buyer Name</th>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th className="text-right">Total Amount</th>
                  <th>Items</th>
                  <th className="text-right">VAT</th>
                  <th className="text-center">Receipt Type</th>
                  <th className="text-center">Sales Type</th>
                  <th className="text-center">Distribution</th>
                  <th>Payment Method</th>
                  <th className="text-right">EBM</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="py-8 text-center text-sm text-gray-400"
                    >
                      No transactions match current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t, idx) => (
                    <tr key={`${t.invoiceNumber}-${idx}`}>
                      <td className="font-medium">{idx + 1}</td>
                      <td className="font-mono text-xs">{t.sessionId}</td>
                      <td className="font-mono text-xs">{t.buyerTin || '-'}</td>
                      <td className="font-mono text-xs">{t.buyerPhone || '-'}</td>
                      <td>{t.buyerName}</td>
                      <td>{t.invoiceNumber}</td>
                      <td>{t.invoiceDate}</td>
                      <td className="text-right font-medium">{formatCurrency(t.totalAmount)}</td>
                      <td className="text-sm">{t.items}</td>
                      <td className="text-right">{formatCurrency(t.vat)}</td>
                      <td className="text-center">{t.receiptType}</td>
                      <td className="text-center">
                        <Badge kind={t.salesTypeCode === 'T' ? 'warn' : 'ok'}>
                          {t.salesType ||
                            (t.salesTypeCode === 'T'
                              ? 'Training Sale'
                              : t.salesTypeCode
                                ? 'Normal Sale'
                                : '-')}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <DistributionCell
                          tx={t}
                          isPending={redistributeMutation.isPending}
                          onRedistribute={(sessionId, phone) =>
                            setRedistributeModal({ open: true, sessionId, phone })
                          }
                        />
                      </td>
                      <td>{t.paymentMethod}</td>
                      <td className="text-right">
                        <Btn
                          size="xs"
                          variant="ghost"
                          disabled={downloadingSessionId === t.sessionId}
                          onClick={() => handleDownloadEbm(t.sessionId)}
                        >
                          {downloadingSessionId === t.sessionId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Btn>
                      </td>
                    </tr>
                  ))
                )}
                {filtered.length > 0 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-white/5">
                    <td colSpan={7} className="text-right">
                      {anyFilter ? 'Filtered total' : 'Total'}
                    </td>
                    <td className="text-right">{formatCurrency(filteredTotals.totalAmount)}</td>
                    <td />
                    <td className="text-right">{formatCurrency(filteredTotals.totalVat)}</td>
                    <td colSpan={5} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function ReportBody({
  data,
  isLoading,
  error,
  onRedistributed,
}: {
  data: SalesReportData | undefined;
  isLoading: boolean;
  error: Error | null;
  onRedistributed: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className="kc-skeleton h-[90px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-7 text-center text-sm text-gray-400">
        Something went wrong loading the sales report. Please try again.
      </Card>
    );
  }

  if (data) {
    return <SalesReportContent data={data} onRedistributed={onRedistributed} />;
  }

  return null;
}

export default function ConsoleSalesReportPage() {
  const report = useReportPage({
    reportName: 'Sales report',
    filePrefix: 'sales-report',
    downloadFn: salesReportApi.downloadPdf,
  });

  const queryClient = useQueryClient();
  const queryKey = ['salesReport', report.startISO, report.endISO] as const;
  const { data, isLoading, error } = useQuery<SalesReportData>({
    queryKey,
    queryFn: () => salesReportApi.getReportData(report.startISO, report.endISO),
    enabled: report.isAdmin,
  });

  if (!report.isAdmin) {
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
      <PageHead
        title="Sales Report"
        sub="Individual sales transactions for the selected date range"
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
              disabled={isLoading || !data?.transactions?.length}
            >
              Download PDF
            </Btn>
          </div>
        }
      />

      <ReportBody
        data={data}
        isLoading={isLoading}
        error={error}
        onRedistributed={() => queryClient.invalidateQueries({ queryKey })}
      />
    </div>
  );
}
