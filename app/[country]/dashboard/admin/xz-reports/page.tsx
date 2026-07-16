'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { toast } from 'sonner'
import {
  Download,
  ArrowLeft,
  FileText,
  ShoppingCart,
  Receipt,
  DollarSign,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { xzReportApi, XZReportData, ReportHistoryItem } from '@/lib/api/xzReport'
import { downloadAndSavePDF } from '@/lib/api/chargingSessions'
import dayjs from 'dayjs'

const formatCurrency = (amount: number) =>
  `RWF ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatNumber = (num: number, decimals = 2) =>
  num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

type TabType = 'x-report' | 'z-report' | 'history'

export default function XZReportsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabType>('x-report')
  const [xReportData, setXReportData] = useState<XZReportData | null>(null)
  const [zReportData, setZReportData] = useState<XZReportData | null>(null)
  const [isDownloadingX, setIsDownloadingX] = useState(false)
  const [isDownloadingZ, setIsDownloadingZ] = useState(false)

  // History tab state
  const [historyFilter, setHistoryFilter] = useState<string>('ALL')
  const [historyOffset, setHistoryOffset] = useState(0)
  const historyLimit = 20

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // X Report mutation
  const generateXMutation = useMutation({
    mutationFn: xzReportApi.generateXReport,
    onSuccess: (data) => {
      setXReportData(data)
      toast.success('X Report generated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate X Report')
    },
  })

  // Z Report mutation
  const generateZMutation = useMutation({
    mutationFn: xzReportApi.generateZReport,
    onSuccess: (data) => {
      setZReportData(data)
      toast.success('Z Report generated successfully')
      // Invalidate history to refresh the list
      queryClient.invalidateQueries({ queryKey: ['reportHistory'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate Z Report')
    },
  })

  // Report history query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reportHistory', historyFilter, historyOffset],
    queryFn: () => {
      const typeFilter = historyFilter === 'ALL' ? undefined : historyFilter
      return xzReportApi.getReportHistory(typeFilter, historyLimit, historyOffset)
    },
    enabled: !!user && user.role === UserRole.ADMIN && activeTab === 'history',
  })

  const handleGenerateX = () => {
    generateXMutation.mutate()
  }

  const handleGenerateZ = () => {
    const confirmed = window.confirm(
      'Are you sure you want to generate a Z Report? This will close the current sales period.'
    )
    if (confirmed) {
      generateZMutation.mutate()
    }
  }

  const handleDownloadXPdf = async () => {
    try {
      setIsDownloadingX(true)
      const blob = xReportData
        ? await xzReportApi.downloadReportPdf(xReportData.reportId)
        : await xzReportApi.generateXReportPdf()
      const timestamp = dayjs().format('YYYY-MM-DD-HHmmss')
      await downloadAndSavePDF(blob, `x-report-${timestamp}.pdf`)
      toast.success('X Report PDF downloaded successfully')
    } catch {
      toast.error('Failed to download X Report PDF')
    } finally {
      setIsDownloadingX(false)
    }
  }

  const handleDownloadZPdf = async () => {
    try {
      setIsDownloadingZ(true)
      let blob: Blob
      if (zReportData) {
        blob = await xzReportApi.downloadReportPdf(zReportData.reportId)
      } else {
        // No in-memory report — look up the latest Z report from history
        const history = await xzReportApi.getReportHistory('Z', 1, 0)
        if (history.items.length > 0) {
          blob = await xzReportApi.downloadReportPdf(history.items[0].id)
        } else {
          // No Z report exists at all — generate one
          blob = await xzReportApi.generateZReportPdf()
        }
      }
      const timestamp = dayjs().format('YYYY-MM-DD-HHmmss')
      await downloadAndSavePDF(blob, `z-report-${timestamp}.pdf`)
      toast.success('Z Report PDF downloaded successfully')
    } catch {
      toast.error('Failed to download Z Report PDF')
    } finally {
      setIsDownloadingZ(false)
    }
  }

  const handleDownloadHistoryPdf = async (reportId: string, reportType: string, reportNumber: number) => {
    try {
      const blob = await xzReportApi.downloadReportPdf(reportId)
      await downloadAndSavePDF(blob, `${reportType.toLowerCase()}-report-${reportNumber}.pdf`)
      toast.success('Report PDF downloaded successfully')
    } catch {
      toast.error('Failed to download report PDF')
    }
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              X/Z Daily Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate and view daily sales reports
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'x-report' ? 'default' : 'outline'}
              onClick={() => setActiveTab('x-report')}
              className="flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              X Report
            </Button>
            <Button
              variant={activeTab === 'z-report' ? 'default' : 'outline'}
              onClick={() => setActiveTab('z-report')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Z Report
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Report History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* X Report Tab */}
      {activeTab === 'x-report' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate X Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                X Reports provide a snapshot of sales since the last Z report without closing the current period.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerateX}
                  disabled={generateXMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {generateXMutation.isPending ? 'Generating...' : 'Generate X Report'}
                </Button>
                <Button
                  onClick={handleDownloadXPdf}
                  disabled={isDownloadingX}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingX ? 'Downloading...' : 'Download PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {xReportData && <ReportDataDisplay data={xReportData} />}
        </div>
      )}

      {/* Z Report Tab */}
      {activeTab === 'z-report' && (
        <div className="space-y-6">
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                Important Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 dark:text-amber-500">
                Generating a Z report closes the current sales period. All subsequent X reports will start from this point.
                This action should typically be performed at the end of each business day.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate Z Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Z Reports close the current sales period and provide a final summary of all transactions.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerateZ}
                  disabled={generateZMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {generateZMutation.isPending ? 'Generating...' : 'Generate Z Report'}
                </Button>
                <Button
                  onClick={handleDownloadZPdf}
                  disabled={isDownloadingZ}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingZ ? 'Downloading...' : 'Download PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {zReportData && <ReportDataDisplay data={zReportData} />}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={historyFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => {
                    setHistoryFilter('ALL')
                    setHistoryOffset(0)
                  }}
                  size="sm"
                >
                  All Reports
                </Button>
                <Button
                  variant={historyFilter === 'X' ? 'default' : 'outline'}
                  onClick={() => {
                    setHistoryFilter('X')
                    setHistoryOffset(0)
                  }}
                  size="sm"
                >
                  X Reports Only
                </Button>
                <Button
                  variant={historyFilter === 'Z' ? 'default' : 'outline'}
                  onClick={() => {
                    setHistoryFilter('Z')
                    setHistoryOffset(0)
                  }}
                  size="sm"
                >
                  Z Reports Only
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !historyData || historyData.items.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No reports found</h3>
                  <p className="text-sm text-muted-foreground">
                    No reports have been generated yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Report #</TableHead>
                          <TableHead className="w-20">Type</TableHead>
                          <TableHead>Period Start</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead className="text-right">NS Total</TableHead>
                          <TableHead className="text-right">NR Total</TableHead>
                          <TableHead>Generated By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.reportNumber}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  item.reportType === 'X'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}
                              >
                                {item.reportType}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {dayjs(item.periodStart).format('MMM D, YYYY HH:mm')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {dayjs(item.periodEnd).format('MMM D, YYYY HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.nsSalesTotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.nrRefundTotal)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.generatedBy.firstName && item.generatedBy.lastName
                                ? `${item.generatedBy.firstName} ${item.generatedBy.lastName}`
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {dayjs(item.createdAt).format('MMM D, YYYY HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDownloadHistoryPdf(item.id, item.reportType, item.reportNumber)
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {historyOffset + 1} to{' '}
                      {Math.min(historyOffset + historyLimit, historyData.total)} of {historyData.total} reports
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryOffset(Math.max(0, historyOffset - historyLimit))}
                        disabled={historyOffset === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryOffset(historyOffset + historyLimit)}
                        disabled={historyOffset + historyLimit >= historyData.total}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Component to display report data (used for both X and Z reports)
function ReportDataDisplay({ data }: { data: XZReportData }) {
  const netSales = data.nsSalesTotal - data.nrRefundTotal

  return (
    <div className="space-y-6">
      {/* Period Info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Report Period:</span> Since last Z report
            <br />
            <span className="font-medium">Period Start:</span> {dayjs(data.periodStart).format('MMM D, YYYY HH:mm')}
            <br />
            {data.periodEnd && (
              <>
                <span className="font-medium">Period End:</span> {dayjs(data.periodEnd).format('MMM D, YYYY HH:mm')}
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              NS Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.nsSalesTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.nsReceiptCount} receipt{data.nsReceiptCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              NR Total
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.nrRefundTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.nrReceiptCount} refund{data.nrReceiptCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Sales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              NS - NR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Items Sold
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalItemsSold.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Normal Sales (NS)</TableCell>
                  <TableCell className="text-right">{data.nsReceiptCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsSalesTotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Refunds (NR)</TableCell>
                  <TableCell className="text-right">{data.nrReceiptCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrRefundTotal)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Net</TableCell>
                  <TableCell className="text-right">
                    {data.nsReceiptCount - data.nrReceiptCount}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(netSales)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead className="text-right">NS Taxable</TableHead>
                  <TableHead className="text-right">NS Tax</TableHead>
                  <TableHead className="text-right">NR Taxable</TableHead>
                  <TableHead className="text-right">NR Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Type A (18%)</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxableAmtA)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxAmtA)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxableAmtA)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxAmtA)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Type B (0%)</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxableAmtB)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxAmtB)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxableAmtB)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxAmtB)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Type C</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxableAmtC)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxAmtC)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxableAmtC)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxAmtC)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Type D</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxableAmtD)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nsTax.taxAmtD)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxableAmtD)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.nrTax.taxAmtD)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Table */}
      {data.paymentMethods && data.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">NS Amount</TableHead>
                    <TableHead className="text-right">NR Amount</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentMethods.map((method) => (
                    <TableRow key={method.code}>
                      <TableCell className="font-medium">{method.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(method.nsAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(method.nrAmount)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(method.nsAmount - method.nrAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Receipts Table */}
      {(data.copyReceiptCount > 0 || data.trainingReceiptCount > 0 || data.proformaReceiptCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.copyReceiptCount > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Copy</TableCell>
                      <TableCell className="text-right">{data.copyReceiptCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.copyReceiptTotal)}</TableCell>
                    </TableRow>
                  )}
                  {data.trainingReceiptCount > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Training</TableCell>
                      <TableCell className="text-right">{data.trainingReceiptCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.trainingReceiptTotal)}</TableCell>
                    </TableRow>
                  )}
                  {data.proformaReceiptCount > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Proforma</TableCell>
                      <TableCell className="text-right">{data.proformaReceiptCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.proformaReceiptTotal)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
