'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  Zap,
  Receipt,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { pluReportApi, PluReportData } from '@/lib/api/pluReport'
import { useReportPage, formatCurrency, formatNumber } from '@/lib/hooks/useReportPage'
import { StatCard, StatCardSkeleton } from '@/components/reports/StatCard'
import {
  ReportPageHeader,
  ReportAuthSkeleton,
  ReportErrorCard,
  ReportEmptyCard,
} from '@/components/reports/ReportPageHeader'

export default function PluReportsPage() {
  const report = useReportPage({
    reportName: 'PLU report',
    filePrefix: 'plu-report',
    downloadFn: pluReportApi.downloadPdf,
    defaultStartDaysAgo: 10,
  })

  const { data, isLoading, error } = useQuery<PluReportData>({
    queryKey: ['pluReport', report.startISO, report.endISO],
    queryFn: () => pluReportApi.getReportData(report.startISO, report.endISO),
    enabled: report.isAdmin,
  })

  if (!report.isAdmin) {
    return <ReportAuthSkeleton />
  }

  return (
    <div className="space-y-6 p-6">
      <ReportPageHeader
        title="PLU Report"
        subtitle="Sales summary by item for the selected date range"
        isDownloading={report.isDownloading}
        isLoading={isLoading}
        hasData={!!data?.items?.length}
        onBack={() => report.router.push('/dashboard/admin')}
        onDownload={report.handleDownloadPdf}
        dateRange={report.dateRange}
        onDateRangeChange={report.setDateRange}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton count={4} />
        </div>
      ) : error ? (
        <ReportErrorCard />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Transactions" value={data.totalTransactions.toLocaleString()} icon={ShoppingCart} />
            <StatCard title="Total Quantity (kWh)" value={formatNumber(data.grandTotalQuantity)} icon={Zap} />
            <StatCard title="Total Tax" value={formatCurrency(data.grandTotalTax)} icon={Receipt} />
            <StatCard title="Grand Total" value={formatCurrency(data.grandTotalAmount)} icon={DollarSign} />
          </div>

          {data.items.length === 0 ? (
            <ReportEmptyCard message="No completed EBM sales found for the selected date range." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Items Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-center">Tax Rate</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item, idx) => (
                        <TableRow key={item.itemCode}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.taxTypeCode}-{item.taxRate}%
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(item.quantitySold)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right">
                          Grand Total
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.grandTotalQuantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(data.grandTotalAmount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
