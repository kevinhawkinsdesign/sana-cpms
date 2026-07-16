'use client'

import { ArrowLeft, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangeFilter } from '@/components/reports/DateRangeFilter'

interface ReportPageHeaderProps {
  title: string
  subtitle: string
  isDownloading: boolean
  isLoading: boolean
  hasData: boolean
  onBack: () => void
  onDownload: () => void
  dateRange: { startDate: Date; endDate: Date }
  onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void
}

export function ReportPageHeader({
  title,
  subtitle,
  isDownloading,
  isLoading,
  hasData,
  onBack,
  onDownload,
  dateRange,
  onDateRangeChange,
}: ReportPageHeaderProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button
          onClick={onDownload}
          disabled={isDownloading || isLoading || !hasData}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
        </CardContent>
      </Card>
    </>
  )
}

export function ReportAuthSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </div>
  )
}

export function ReportErrorCard() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-destructive">
        Failed to load report data. Please try again.
      </CardContent>
    </Card>
  )
}

export function ReportEmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No data found</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
