'use client'

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { toast } from 'sonner'
import {
  Download,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Search,
  FileText,
  Users,
  Zap,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  getAllShiftReports,
  AdminShiftReportsParams,
  ShiftReportSortField,
} from '@/lib/api/shiftsAndInspections'
import { enhanceReportsWithLateness, ShiftReportWithLateness } from '@/lib/utils/latenessCalculation'
import { generateShiftReportsPdf } from '@/lib/utils/shiftReportsPdf'
import { getAllUsers } from '@/lib/api/admin'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { ShiftStatCard } from '@/components/reports/admin/ShiftStatCard'
import { ShiftReportRow, ShiftReportHeader, SortField, SortDirection } from '@/components/reports/admin/ShiftReportRow'
import {
  ShiftReportFiltersBar,
  StatusFilter,
  LatenessFilter,
  ReviewFilter,
} from '@/components/reports/admin/ShiftReportFiltersBar'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'
const ITEMS_PER_PAGE = 25

// Whitelists for URL → state hydration. Anything outside these falls back to
// the default so a hand-typed URL can't poison the query (or the Prisma
// sortBy clause downstream).
const VALID_SORT_FIELDS: SortField[] = [
  'startTime', 'endTime', 'site', 'operator', 'duration',
  'sessions', 'kwhSold', 'kwhMeter', 'discrepancy', 'revenue',
]
const VALID_STATUS: StatusFilter[] = ['all', 'active', 'completed']
const VALID_LATENESS: LatenessFilter[] = ['all', 'onTime', 'late', 'early']
const VALID_REVIEW: ReviewFilter[] = ['all', 'approved', 'flagged', 'pending', 'flaggedThenApproved']

const defaultDateRange = () => ({
  startDate: dayjs().tz(KIGALI_TIMEZONE).subtract(7, 'days').startOf('day').toDate(),
  endDate: dayjs().tz(KIGALI_TIMEZONE).endOf('day').toDate(),
})

const parseDateParam = (v: string | null, fallback: Date, end = false): Date => {
  if (!v) return fallback
  const d = dayjs.tz(v, KIGALI_TIMEZONE)
  if (!d.isValid()) return fallback
  return (end ? d.endOf('day') : d.startOf('day')).toDate()
}

const AdminShiftReportsPageBody = () => {
  const { user, isLoading: authLoading } = useAuth()
  const localizedRouter = useLocalizedRouter()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Hydrate initial state from URL once. After this, state is the source of
  // truth and a single effect mirrors it back to the URL.
  const initialDefaults = useMemo(() => defaultDateRange(), [])
  const initial = useMemo(() => {
    const sp = searchParams
    const sortByRaw = sp?.get('sortBy') as SortField | null
    const sortDirRaw = sp?.get('sortDir')
    const statusRaw = sp?.get('status') as StatusFilter | null
    const latenessRaw = sp?.get('lateness') as LatenessFilter | null
    const reviewRaw = sp?.get('review') as ReviewFilter | null
    return {
      dateRange: {
        startDate: parseDateParam(sp?.get('dateStart') ?? null, initialDefaults.startDate, false),
        endDate: parseDateParam(sp?.get('dateEnd') ?? null, initialDefaults.endDate, true),
      },
      search: sp?.get('search') ?? '',
      status: (statusRaw && VALID_STATUS.includes(statusRaw) ? statusRaw : 'all') as StatusFilter,
      lateness: (latenessRaw && VALID_LATENESS.includes(latenessRaw) ? latenessRaw : 'all') as LatenessFilter,
      review: (reviewRaw && VALID_REVIEW.includes(reviewRaw) ? reviewRaw : 'all') as ReviewFilter,
      operatorId: sp?.get('operatorId') ?? 'all',
      sortField: (sortByRaw && VALID_SORT_FIELDS.includes(sortByRaw) ? sortByRaw : 'startTime') as SortField,
      sortDirection: (sortDirRaw === 'asc' ? 'asc' : 'desc') as SortDirection,
      page: (() => {
        const p = Number(sp?.get('page'))
        return Number.isFinite(p) && p > 0 ? p : 1
      })(),
    }
    // We only seed from URL once on mount; later state changes drive the URL,
    // not the other way around, to avoid hydration ping-pong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [dateRange, setDateRange] = useState(initial.dateRange)
  const [searchTerm, setSearchTerm] = useState(initial.search)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initial.search)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initial.status)
  const [latenessFilter, setLatenessFilter] = useState<LatenessFilter>(initial.lateness)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(initial.review)
  const [operatorFilter, setOperatorFilter] = useState<string>(initial.operatorId)
  const [sortField, setSortField] = useState<SortField>(initial.sortField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initial.sortDirection)
  const [currentPage, setCurrentPage] = useState(initial.page)
  const [isExporting, setIsExporting] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mirror filter/sort/page state back to the URL. router.replace (not push)
  // keeps the back button useful — sort changes don't pile up history. Date
  // range only persists when the user moves it off the default window so the
  // canonical /shifts/reports URL stays clean on first load.
  // Format URL dates in Kigali TZ to match how parseDateParam reads them
  // back. The Date objects carry a UTC instant pinned to midnight Kigali;
  // if we formatted in the browser's local TZ, browsers west of UTC+2 would
  // see the previous calendar day and round-trip an off-by-one date.
  const defaultStartIso = useMemo(
    () => dayjs(initialDefaults.startDate).tz(KIGALI_TIMEZONE).format('YYYY-MM-DD'),
    [initialDefaults.startDate]
  )
  const defaultEndIso = useMemo(
    () => dayjs(initialDefaults.endDate).tz(KIGALI_TIMEZONE).format('YYYY-MM-DD'),
    [initialDefaults.endDate]
  )

  useEffect(() => {
    const qs = new URLSearchParams()
    if (sortField !== 'startTime') qs.set('sortBy', sortField)
    if (sortDirection !== 'desc') qs.set('sortDir', sortDirection)
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    if (latenessFilter !== 'all') qs.set('lateness', latenessFilter)
    if (reviewFilter !== 'all') qs.set('review', reviewFilter)
    if (operatorFilter !== 'all') qs.set('operatorId', operatorFilter)
    if (debouncedSearchTerm) qs.set('search', debouncedSearchTerm)
    if (currentPage > 1) qs.set('page', String(currentPage))
    const startIso = dayjs(dateRange.startDate).tz(KIGALI_TIMEZONE).format('YYYY-MM-DD')
    const endIso = dayjs(dateRange.endDate).tz(KIGALI_TIMEZONE).format('YYYY-MM-DD')
    if (startIso !== defaultStartIso) qs.set('dateStart', startIso)
    if (endIso !== defaultEndIso) qs.set('dateEnd', endIso)
    const next = qs.toString() ? `${pathname}?${qs.toString()}` : pathname
    const current = searchParams && searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    if (next !== current) router.replace(next, { scroll: false })
  }, [
    sortField,
    sortDirection,
    statusFilter,
    latenessFilter,
    reviewFilter,
    operatorFilter,
    debouncedSearchTerm,
    currentPage,
    dateRange.startDate,
    dateRange.endDate,
    pathname,
    router,
    searchParams,
    defaultStartIso,
    defaultEndIso,
  ])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [searchTerm])

  // Build server params from the current filter/sort/page state. The query
  // key is the same object so React Query refetches when any of these change.
  const queryParams: AdminShiftReportsParams = useMemo(
    () => ({
      dateStart: dayjs(dateRange.startDate).tz(KIGALI_TIMEZONE).startOf('day').toDate(),
      dateEnd: dayjs(dateRange.endDate).tz(KIGALI_TIMEZONE).endOf('day').toDate(),
      operatorId: operatorFilter,
      status: statusFilter,
      lateness: latenessFilter,
      review: reviewFilter,
      search: debouncedSearchTerm,
      sortBy: sortField as ShiftReportSortField,
      sortDir: sortDirection,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    }),
    [
      dateRange.startDate,
      dateRange.endDate,
      operatorFilter,
      statusFilter,
      latenessFilter,
      reviewFilter,
      debouncedSearchTerm,
      sortField,
      sortDirection,
      currentPage,
    ]
  )

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['adminShiftReports', queryParams],
    queryFn: () => getAllShiftReports(queryParams),
    placeholderData: keepPreviousData,
  })

  // Operator dropdown list — full directory, so admins can filter to operators
  // who have no rows on the current page yet.
  const { data: usersData } = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers,
    enabled: !!user && user.role === UserRole.ADMIN,
  })

  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      localizedRouter.push('/dashboard')
    }
  }, [user, authLoading, localizedRouter])

  const enhancedReports = useMemo(() => {
    if (!data?.reports) return []
    return enhanceReportsWithLateness(data.reports)
  }, [data])

  const operators = useMemo(() => {
    const list: Array<{ id: string; name: string }> = []
    if (usersData?.data?.users) {
      usersData.data.users.forEach((u) => {
        list.push({ id: u.id, name: `${u.firstName} ${u.lastName}` })
      })
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [usersData])

  const totals = data?.totals
  const pagination = data?.pagination
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1
  const reports = enhancedReports

  // Fetches every row in the current filter set by paging the backend at
  // limit=500 until hasMore=false. Extracted so future export formats can
  // reuse the same loop without duplicating the chunking logic.
  const collectAllFilteredReports = async (): Promise<typeof reports> => {
    const chunkLimit = 500
    const all: typeof reports = []
    let page = 1
    while (true) {
      const chunk = await getAllShiftReports({ ...queryParams, page, limit: chunkLimit })
      const enhanced = enhanceReportsWithLateness(chunk.reports) as typeof reports
      all.push(...enhanced)
      if (!chunk.pagination.hasMore) break
      page += 1
      if (page > 100) break // hard safety stop
    }
    return all
  }

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      const allReports = await collectAllFilteredReports()
      if (allReports.length === 0) {
        toast.error('No reports to export for the current filters')
        return
      }
      const doc = generateShiftReportsPdf(allReports)
      doc.save(`shift-reports-${dayjs().format('YYYY-MM-DD')}.pdf`)
      toast.success(`Exported ${allReports.length} reports to PDF`)
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const resetFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setOperatorFilter('all')
    setStatusFilter('all')
    setLatenessFilter('all')
    setReviewFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    !!searchTerm || operatorFilter !== 'all' || statusFilter !== 'all' || latenessFilter !== 'all' || reviewFilter !== 'all'

  if (authLoading || (isLoading && !data)) {
    return (
      <AdminAccessGuard>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AdminAccessGuard>
    )
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <AdminAccessGuard>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
            <Button onClick={() => localizedRouter.push('/dashboard')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AdminAccessGuard>
    )
  }

  if (error) {
    return (
      <AdminAccessGuard>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
              <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </div>
          </div>
        </div>
      </AdminAccessGuard>
    )
  }

  const formatKwh = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const formatRwf = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
        ? `${(n / 1000).toFixed(0)}K`
        : n.toLocaleString('en-US')

  return (
    <AdminAccessGuard>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shift Reports</h1>
            <p className="text-gray-600 mt-2">
              View and analyze operator shift attendance and performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" /> {isExporting ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ShiftStatCard
              icon={FileText}
              iconBg="bg-blue-50"
              iconColor="text-blue-700"
              accent="bg-blue-500"
              label="Total Reports"
              value={(totals?.count ?? 0).toString()}
              sub="Filtered"
            />
            <ShiftStatCard
              icon={Users}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-700"
              accent="bg-emerald-500"
              label="Active Shifts"
              value={(totals?.activeCount ?? 0).toString()}
              sub="Currently active"
            />
            <ShiftStatCard
              icon={Zap}
              iconBg="bg-amber-50"
              iconColor="text-amber-700"
              accent="bg-amber-400"
              label="kWh Sold"
              value={formatKwh(totals?.kwhSum ?? 0)}
              sub="This period · kWh"
            />
            <ShiftStatCard
              icon={Wallet}
              iconBg="bg-slate-100"
              iconColor="text-slate-900"
              accent="bg-slate-900"
              label="Money Collected"
              value={totals?.rwfSum !== null && totals?.rwfSum !== undefined ? formatRwf(totals.rwfSum) : '—'}
              sub={totals?.rwfSum === null ? 'Page only' : 'This period · RWF'}
            />
          </div>

          {/* Reports card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <ShiftReportFiltersBar
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onStartDateChange={(d) => {
                setDateRange((p) => ({
                  ...p,
                  startDate: dayjs(d).tz(KIGALI_TIMEZONE).startOf('day').toDate(),
                }))
                setCurrentPage(1)
              }}
              onEndDateChange={(d) => {
                setDateRange((p) => ({
                  ...p,
                  endDate: dayjs(d).tz(KIGALI_TIMEZONE).endOf('day').toDate(),
                }))
                setCurrentPage(1)
              }}
              search={searchTerm}
              onSearchChange={setSearchTerm}
              operatorFilter={operatorFilter}
              onOperatorFilterChange={(v) => {
                setOperatorFilter(v)
                setCurrentPage(1)
              }}
              operators={operators}
              statusFilter={statusFilter}
              onStatusFilterChange={(v) => {
                setStatusFilter(v)
                setCurrentPage(1)
              }}
              latenessFilter={latenessFilter}
              onLatenessFilterChange={(v) => {
                setLatenessFilter(v)
                setCurrentPage(1)
              }}
              reviewFilter={reviewFilter}
              onReviewFilterChange={(v) => {
                setReviewFilter(v)
                setCurrentPage(1)
              }}
              onReset={resetFilters}
              showReset={hasActiveFilters}
            />

            {reports.length === 0 ? (
              <EmptyState hasActiveFilters={hasActiveFilters} onReset={resetFilters} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-[1520px]">
                    <ShiftReportHeader
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <div>
                      {reports.map((report) => (
                        <ShiftReportRow
                          key={report.id}
                          report={report as ShiftReportWithLateness}
                          selected={false}
                          onClick={() => {
                            // Round-trip the current filter/sort/page state via
                            // ?returnTo= so the detail page's back link can
                            // restore the user's view exactly.
                            const currentQs = searchParams?.toString() ?? ''
                            const returnTo = currentQs ? `?returnTo=${encodeURIComponent(currentQs)}` : ''
                            localizedRouter.push(`/dashboard/admin/shifts/reports/${report.id}${returnTo}`)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {pagination && pagination.total > pagination.limit && (
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 flex-wrap">
                    <span className="text-xs text-slate-500">
                      Showing {pagination.offset + 1} to{' '}
                      {Math.min(pagination.offset + reports.length, pagination.total)} of{' '}
                      {pagination.total} reports
                    </span>
                    <Pagination>
                      <PaginationContent className="flex gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-40 text-slate-400'
                                : 'text-slate-700 hover:underline'
                            }
                          >
                            &lt;
                          </PaginationPrevious>
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) pageNum = i + 1
                          else if (currentPage <= 3) pageNum = i + 1
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                          else pageNum = currentPage - 2 + i
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className={`px-2.5 py-1 rounded transition-colors text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'bg-amber-50 border border-amber-300 text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={
                              currentPage === totalPages
                                ? 'pointer-events-none opacity-40 text-slate-400'
                                : 'text-slate-700 hover:underline'
                            }
                          >
                            &gt;
                          </PaginationNext>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </AdminAccessGuard>
  )
}

interface EmptyStateProps {
  hasActiveFilters: boolean
  onReset: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasActiveFilters, onReset }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 bg-white">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-300/20 to-amber-500/20 blur-2xl rounded-full" />
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-300/10 to-amber-500/10 border-2 border-amber-300/30 flex items-center justify-center">
        <Search className="w-9 h-9 text-amber-500/70" />
      </div>
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reports Found</h3>
    <p className="text-sm text-slate-500 text-center max-w-md mb-5">
      {hasActiveFilters
        ? 'No shift reports match your current filters. Try adjusting your search criteria or date range.'
        : 'No shift reports available for the selected date range.'}
    </p>
    {hasActiveFilters && (
      <Button variant="outline" onClick={onReset} className="gap-2">
        Clear All Filters
      </Button>
    )}
  </div>
)

// Suspense wrapper is required by Next.js because the body uses
// useSearchParams (CSR boundary). Without it the route fails to build.
const AdminShiftReportsPage = () => (
  <Suspense fallback={null}>
    <AdminShiftReportsPageBody />
  </Suspense>
)

export default AdminShiftReportsPage
