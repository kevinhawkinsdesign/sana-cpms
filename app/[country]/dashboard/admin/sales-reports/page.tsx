'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart,
  Receipt,
  DollarSign,
  GraduationCap,
  Send,
  Search,
  Download,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { salesReportApi, SalesReportData, SalesReportTransaction } from '@/lib/api/salesReport'
import { distributeEBM, downloadEBM, downloadAndSavePDF } from '@/lib/api/chargingSessions'
import { toast } from 'sonner'
import { useReportPage, formatCurrency } from '@/lib/hooks/useReportPage'
import { StatCard, StatCardSkeleton } from '@/components/reports/StatCard'
import {
  ReportPageHeader,
  ReportAuthSkeleton,
  ReportErrorCard,
  ReportEmptyCard,
} from '@/components/reports/ReportPageHeader'

type SalesTypeFilter = 'ALL' | 'NORMAL' | 'TRAINING'
type DistributionFilter = 'ALL' | 'DISTRIBUTED' | 'NOT_DISTRIBUTED'

function SalesReportContent({
  data,
  onRedistributed,
}: {
  data: SalesReportData
  onRedistributed: () => void
}) {
  const [search, setSearch] = useState('')
  const [salesTypeFilter, setSalesTypeFilter] = useState<SalesTypeFilter>('ALL')
  const [distributionFilter, setDistributionFilter] = useState<DistributionFilter>('ALL')
  const [redistributeDialog, setRedistributeDialog] = useState<{
    open: boolean
    sessionId: string
    phone: string
  }>({
    open: false,
    sessionId: '',
    phone: '',
  })
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null)

  const handleDownloadEbm = async (sessionId: string) => {
    setDownloadingSessionId(sessionId)
    try {
      const pdfBlob = await downloadEBM(sessionId)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `EBM_Receipt_${sessionId.slice(0, 8)}_${timestamp}.pdf`
      await downloadAndSavePDF(pdfBlob, filename)
      toast.success('EBM downloaded successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download EBM receipt')
    } finally {
      setDownloadingSessionId(null)
    }
  }
  const redistributeMutation = useMutation({
    mutationFn: ({ sessionId, phone }: { sessionId: string; phone: string }) =>
      distributeEBM({ sessionId, phone }),
    onSuccess: () => {
      toast.success('EBM redistributed successfully')
      setRedistributeDialog({
        open: false,
        sessionId: '',
        phone: '',
      })
      onRedistributed()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to redistribute EBM')
    },
  })

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return data.transactions.filter((t) => {
      if (salesTypeFilter === 'NORMAL' && t.salesTypeCode === 'T') return false
      if (salesTypeFilter === 'TRAINING' && t.salesTypeCode !== 'T') return false
      if (distributionFilter === 'DISTRIBUTED' && !t.distributed) return false
      if (distributionFilter === 'NOT_DISTRIBUTED' && t.distributed) return false
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
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [data.transactions, search, salesTypeFilter, distributionFilter])

  const filteredTotals = useMemo(() => {
    let amount = 0
    let vat = 0
    for (const t of filtered) {
      amount += t.totalAmount
      vat += t.vat
    }
    return {
      count: filtered.length,
      totalAmount: Math.round(amount * 100) / 100,
      totalVat: Math.round(vat * 100) / 100,
    }
  }, [filtered])

  const anyFilter =
    salesTypeFilter !== 'ALL' || distributionFilter !== 'ALL' || search.trim().length > 0

  return (
    <>
      <Dialog
        open={redistributeDialog.open}
        onOpenChange={(open) =>
          setRedistributeDialog((prev) => ({
            ...prev,
            open,
          }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redistribute EBM</DialogTitle>
            <DialogDescription>
              Enter the phone number that should receive this EBM link.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={redistributeDialog.phone}
            onChange={(e) =>
              setRedistributeDialog((prev) => ({
                ...prev,
                phone: e.target.value,
              }))
            }
            placeholder="e.g. 78xxxxxxx"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRedistributeDialog({
                  open: false,
                  sessionId: '',
                  phone: '',
                })
              }
              disabled={redistributeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const phone = redistributeDialog.phone.trim()
                if (!phone) {
                  toast.error('Phone number is required for redistribution')
                  return
                }
                redistributeMutation.mutate({
                  sessionId: redistributeDialog.sessionId,
                  phone,
                })
              }}
              disabled={redistributeMutation.isPending}
            >
              {redistributeMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top-level breakdown cards: totals, then per-sales-type and distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Transactions" value={data.totalTransactions.toLocaleString()} icon={ShoppingCart} />
        <StatCard title="Total VAT" value={formatCurrency(data.totalVat)} icon={Receipt} />
        <StatCard title="Total Sales" value={formatCurrency(data.totalSalesAmount)} icon={DollarSign} />
        <StatCard
          title="Normal Sales"
          value={`${data.breakdownBySalesType.normal.count.toLocaleString()} · ${formatCurrency(data.breakdownBySalesType.normal.totalSalesAmount)}`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Training Sales"
          value={`${data.breakdownBySalesType.training.count.toLocaleString()} · ${formatCurrency(data.breakdownBySalesType.training.totalSalesAmount)}`}
          icon={GraduationCap}
        />
        <StatCard
          title="Distributed"
          value={`${data.distributionSummary.distributed.toLocaleString()} / ${data.totalTransactions.toLocaleString()}`}
          icon={Send}
        />
      </div>

      {data.transactions.length === 0 ? (
        <ReportEmptyCard message="No completed sales found for the selected date range." />
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Sales Transactions</CardTitle>
              <div className="text-sm text-muted-foreground">
                {anyFilter
                  ? `Showing ${filteredTotals.count.toLocaleString()} of ${data.totalTransactions.toLocaleString()}`
                  : `${data.totalTransactions.toLocaleString()} total`}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search session ID, TIN, phone, name, invoice #, payment method"
                  className="pl-8"
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Buyer TIN</TableHead>
                    <TableHead>Buyer Phone</TableHead>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-center">Receipt Type</TableHead>
                    <TableHead className="text-center">Sales Type</TableHead>
                    <TableHead className="text-center">Distribution</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">EBM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center text-sm text-muted-foreground py-8">
                        No transactions match current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t, idx) => (
                      <TableRow key={`${t.invoiceNumber}-${idx}`}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{t.sessionId}</TableCell>
                        <TableCell className="font-mono text-xs">{t.buyerTin || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{t.buyerPhone || '-'}</TableCell>
                        <TableCell>{t.buyerName}</TableCell>
                        <TableCell>{t.invoiceNumber}</TableCell>
                        <TableCell>{t.invoiceDate}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(t.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm">{t.items}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(t.vat)}
                        </TableCell>
                        <TableCell className="text-center">{t.receiptType}</TableCell>
                        <TableCell className="text-center">
                          {/* Fall back to deriving the label from the code (or '-')
                              so rows from an older backend without salesType still render. */}
                          <span
                            className={
                              t.salesTypeCode === 'T'
                                ? 'inline-block rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium'
                                : 'inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium'
                            }
                          >
                            {t.salesType || (t.salesTypeCode === 'T' ? 'Training Sale' : t.salesTypeCode ? 'Normal Sale' : '-')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <DistributionCell
                            tx={t}
                            isPending={redistributeMutation.isPending}
                            onRedistribute={(sessionId, phone) =>
                              setRedistributeDialog({
                                open: true,
                                sessionId,
                                phone,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>{t.paymentMethod}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download EBM"
                            disabled={downloadingSessionId === t.sessionId}
                            onClick={() => handleDownloadEbm(t.sessionId)}
                          >
                            {downloadingSessionId === t.sessionId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {filtered.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell colSpan={7} className="text-right">
                        {anyFilter ? 'Filtered total' : 'Total'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(filteredTotals.totalAmount)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        {formatCurrency(filteredTotals.totalVat)}
                      </TableCell>
                      <TableCell colSpan={5} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="inline-flex rounded-md border border-gray-200 bg-white overflow-hidden">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={
                'px-3 py-1.5 text-xs font-medium transition-colors ' +
                (active
                  ? 'bg-[#0E159A] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50')
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DistributionCell({
  tx,
  isPending,
  onRedistribute,
}: {
  tx: SalesReportTransaction
  isPending: boolean
  onRedistribute: (sessionId: string, phone: string) => void
}) {
  const fallbackPhone = tx.distributionPhone || tx.buyerPhone

  const handleRedistribute = () => {
    onRedistribute(tx.sessionId, fallbackPhone || '')
  }

  if (tx.distributed) {
    const sent = tx.distributionSentAt
      ? new Date(tx.distributionSentAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
    return (
      <div
        className="inline-flex flex-col items-center leading-tight gap-1"
        title={tx.distributionPhone ? `Sent to ${tx.distributionPhone}${sent ? ` at ${sent}` : ''}` : undefined}
      >
        <span className="inline-block rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium">
          Sent
        </span>
        {tx.distributionPhone && (
          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {tx.distributionPhone}
          </span>
        )}
        <button
          type="button"
          onClick={handleRedistribute}
          disabled={isPending}
          className="text-[10px] text-[#0E159A] hover:underline disabled:opacity-50"
        >
          Redistribute
        </button>
      </div>
    )
  }
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="inline-block rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium">
        Not sent
      </span>
      <button
        type="button"
        onClick={handleRedistribute}
        disabled={isPending}
        className="text-[10px] text-[#0E159A] hover:underline disabled:opacity-50"
      >
        Redistribute
      </button>
    </div>
  )
}

function ReportBody({
  data,
  isLoading,
  error,
  onRedistributed,
}: {
  data: SalesReportData | undefined
  isLoading: boolean
  error: Error | null
  onRedistributed: () => void
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCardSkeleton count={3} />
      </div>
    )
  }

  if (error) {
    return <ReportErrorCard />
  }

  if (data) {
    return <SalesReportContent data={data} onRedistributed={onRedistributed} />
  }

  return null
}

export default function SalesReportsPage() {
  const report = useReportPage({
    reportName: 'Sales report',
    filePrefix: 'sales-report',
    downloadFn: salesReportApi.downloadPdf,
  })

  const queryClient = useQueryClient()
  const queryKey = ['salesReport', report.startISO, report.endISO] as const
  const { data, isLoading, error } = useQuery<SalesReportData>({
    queryKey,
    queryFn: () => salesReportApi.getReportData(report.startISO, report.endISO),
    enabled: report.isAdmin,
  })

  if (!report.isAdmin) {
    return <ReportAuthSkeleton />
  }

  return (
    <div className="space-y-6 p-6">
      <ReportPageHeader
        title="Sales Report"
        subtitle="Individual sales transactions for the selected date range"
        isDownloading={report.isDownloading}
        isLoading={isLoading}
        hasData={!!data?.transactions?.length}
        onBack={() => report.router.push('/dashboard/admin')}
        onDownload={report.handleDownloadPdf}
        dateRange={report.dateRange}
        onDateRangeChange={report.setDateRange}
      />

      <ReportBody
        data={data}
        isLoading={isLoading}
        error={error}
        onRedistributed={() => queryClient.invalidateQueries({ queryKey })}
      />
    </div>
  )
}
