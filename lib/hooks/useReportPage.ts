import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { toast } from 'sonner'
import { downloadAndSavePDF } from '@/lib/api/chargingSessions'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

export const formatCurrency = (amount: number) =>
  `RWF ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatNumber = (num: number, decimals = 2) =>
  num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

interface UseReportPageOptions {
  reportName: string
  filePrefix: string
  downloadFn: (startDate: string, endDate: string) => Promise<Blob>
  defaultStartDaysAgo?: number
}

export function useReportPage({ reportName, filePrefix, downloadFn, defaultStartDaysAgo = 0 }: UseReportPageOptions) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useLocalizedRouter()
  const [isDownloading, setIsDownloading] = useState(false)

  const [dateRange, setDateRange] = useState({
    startDate: dayjs().tz(KIGALI_TIMEZONE).subtract(defaultStartDaysAgo, 'days').startOf('day').toDate(),
    endDate: dayjs().tz(KIGALI_TIMEZONE).endOf('day').toDate(),
  })

  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const startISO = dateRange.startDate.toISOString()
  const endISO = dateRange.endDate.toISOString()

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true)
      const blob = await downloadFn(startISO, endISO)
      const startStr = dayjs(dateRange.startDate).format('YYYY-MM-DD')
      const endStr = dayjs(dateRange.endDate).format('YYYY-MM-DD')
      await downloadAndSavePDF(blob, `${filePrefix}-${startStr}-${endStr}.pdf`)
      toast.success(`${reportName} downloaded successfully`)
    } catch {
      toast.error(`Failed to download ${reportName} PDF`)
    } finally {
      setIsDownloading(false)
    }
  }

  const isAdmin = !!user && user.role === UserRole.ADMIN

  return {
    user,
    router,
    isAdmin,
    dateRange,
    setDateRange,
    startISO,
    endISO,
    isDownloading,
    handleDownloadPdf,
  }
}
