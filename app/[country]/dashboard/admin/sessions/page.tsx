'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { useSharedSessionId } from '@/lib/hooks/useSharedSessionId'
import { useUrlPagination } from '@/lib/hooks/useUrlPagination'
import { useSessionRowInteractions } from '@/lib/hooks/useSessionRowInteractions'
import { useMomoStatusCheck } from '@/lib/hooks/useMomoStatusCheck'
import { useAdminEBMDialogs } from '@/components/dashboard/admin/AdminSessionEBMDialogs'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Zap,
  Clock,
  User,
  Battery,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  AlertCircle,
  Play,
  Square,
  XCircle,
  DollarSign,
  Activity,
  Trash2,
  Plus,
  Archive,
  X,
  Share2,
  RefreshCw,
  Edit,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  FileText,
  Undo2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { getStatusDisplayLabel, getStatusDisplayColor, formatSessionDuration } from '@/lib/utils/formatters'
import { getSessionStatusIcon } from '@/lib/utils/sessionStatusIcon'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  getAllSessions,
  getActiveSessions,
  getAdminSessionStats,
  deleteChargingSession,
  pauseChargingSession,
  resumeChargingSession,
  cancelChargingSession,
  uncancelChargingSession,
  getUserDetails,
  type AdminSession
} from '@/lib/api/admin'
import { EBMDownloadIcon } from '@/components/shared/EBMDownloadButton'
import { isEligibleForEbm } from '@/lib/utils/ebmEligibility'
import { AdminSessionEditDialog } from '@/components/dashboard/admin/AdminSessionEditDialog'
import { SessionActionDialog } from '@/components/dashboard/admin/SessionActionDialog'
import { DeleteSessionDialog } from '@/components/dashboard/admin/DeleteSessionDialog'
import { CreateSessionDialog } from '@/components/dashboard/admin/CreateSessionDialog'
import { StatCard } from '@/components/shared/StatCard'
import { getOperatorDisplay } from '@/lib/utils/operatorDisplay'

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'STARTED':
      return <Play className="h-4 w-4 text-blue-500" />
    case 'COMPLETED':
      return <Square className="h-4 w-4 text-red-500" />
    case 'CANCELLED':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'REFUNDED':
      return <Undo2 className="h-4 w-4 text-purple-500" />
    default:
      return <Activity className="h-4 w-4 text-gray-500" />
  }
}

const formatDuration = formatSessionDuration

// The edit dialog's financial/payment actions only apply to finalized sessions
// (matches the backend guard + the session detail page) — don't offer Edit otherwise.
const EDITABLE_SESSION_STATUSES = ['COMPLETED', 'PAID', 'EBM_ISSUED', 'REFUNDED']
const isSessionEditable = (status: string) => EDITABLE_SESSION_STATUSES.includes(status)

const AdminSessionsPageBody = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const searchParams = useSearchParams()
  // When set (via the "View sessions" button on a Shift Details drawer), the
  // list is constrained server-side to the sessions logged during that shift.
  const shiftReportId = searchParams.get('shiftReportId') || undefined
  const { sharedSessionId, setSharedSessionId, hasConsumed, markConsumed } = useSharedSessionId()
  const { currentPage, currentLimit: itemsPerPage, setPage, resetPage } = useUrlPagination()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'STARTED' | 'PAUSED' | 'COMPLETED' | 'PAID' | 'EBM_ISSUED' | 'REFUNDED' | 'CANCELLED'>('all')
  const [selectedSession, setSelectedSession] = useState<AdminSession | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'active'>('all')
  const [sessionToDelete, setSessionToDelete] = useState<AdminSession | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [operatorCache, setOperatorCache] = useState<Record<string, { firstName: string; lastName: string; email: string }>>({})
  const [loadingOperators, setLoadingOperators] = useState<Set<string>>(new Set())
  const [sessionToEdit, setSessionToEdit] = useState<AdminSession | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: 'pause' | 'resume' | 'cancel' | 'uncancel' | null; session: AdminSession | null }>({ type: null, session: null })

  const invalidateSessionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['allSessions'] })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
    queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
  }

  // Shared MOMO + EBM dialog stack — same hooks as the standalone session
  // page so logic stays in one place. Proforma download lives on the page only
  // (no inline list trigger after modal removal).
  const checkMomoStatusMutation = useMomoStatusCheck(invalidateSessionQueries)
  const ebmDialogs = useAdminEBMDialogs(selectedSession, {
    userRole: user?.role,
    onSaleEbmCompleted: () => {
      setSelectedSession((prev) =>
        prev
          ? { ...prev, hasCompletedSaleEbm: true, hasCompletedNormalEbm: true }
          : prev,
      )
    },
    onAfterEBMAction: invalidateSessionQueries,
  })

  // Debounced search term for backend queries
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 400)
    return () => clearTimeout(handle)
  }, [searchTerm])

  // Wrap the filter setters so changing a filter also jumps back to page 1.
  // We do this in the user-input handler instead of an effect so a deep link
  // like `?page=30` doesn't get clobbered on mount (StrictMode would double-fire
  // an "after mount" effect and clear the URL).
  const resetIfNeeded = () => {
    if (currentPage !== 1) resetPage()
  }
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    resetIfNeeded()
  }
  const handleStatusFilterChange = (value: typeof statusFilter) => {
    setStatusFilter(value)
    resetIfNeeded()
  }
  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode)
    resetIfNeeded()
  }

  // Fetch sessions data with pagination (backend-filtered)
  const { data: allSessionsData, isLoading: allSessionsLoading, isFetching: allSessionsFetching } = useQuery({
    queryKey: ['allSessions', currentPage, itemsPerPage, debouncedSearch, statusFilter, shiftReportId],
    queryFn: () => getAllSessions({ page: currentPage, limit: itemsPerPage, search: debouncedSearch || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, shiftReportId }),
  })

  const { data: activeSessionsData, isLoading: activeSessionsLoading, isFetching: activeSessionsFetching } = useQuery({
    queryKey: ['activeSessions', currentPage, itemsPerPage, debouncedSearch, statusFilter],
    queryFn: () => getActiveSessions({ page: currentPage, limit: itemsPerPage, search: debouncedSearch || undefined, status: statusFilter !== 'all' ? statusFilter : undefined }),
  })

  // Fetch operator details as fallback
  const fetchOperatorDetails = async (operatorId: string) => {
    if (operatorCache[operatorId] || loadingOperators.has(operatorId)) {
      return operatorCache[operatorId]
    }

    setLoadingOperators(prev => new Set([...prev, operatorId]))

    try {
      const response = await getUserDetails(operatorId)
      const operatorData = {
        firstName: response.data.user.firstName || 'Unknown',
        lastName: response.data.user.lastName || 'Operator',
        email: response.data.user.email || ''
      }
      setOperatorCache(prev => ({ ...prev, [operatorId]: operatorData }))
      return operatorData
    } catch {
      const fallbackData = { firstName: 'Unknown', lastName: 'Operator', email: operatorId }
      setOperatorCache(prev => ({ ...prev, [operatorId]: fallbackData }))
      return fallbackData
    } finally {
      setLoadingOperators(prev => {
        const newSet = new Set(prev)
        newSet.delete(operatorId)
        return newSet
      })
    }
  }

  // Mutations
  const deleteSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) => deleteChargingSession(sessionId, reason),
    onSuccess: (response) => {
      invalidateSessionQueries()
      queryClient.invalidateQueries({ queryKey: ['archivedSessions'] })
      toast.success('Session moved to Archive')
      if (response?.data?.airtableWarning) toast.warning(response.data.airtableWarning)
      setIsDeleteDialogOpen(false)
      setSessionToDelete(null)
    },
    onError: (error: any) => { toast.error(error.message || 'Failed to delete session') }
  })

  const pauseSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      pauseChargingSession(sessionId, reason ? { reason } : undefined),
    onSuccess: (response) => { invalidateSessionQueries(); toast.success(response?.message || 'Session paused successfully'); closeActionDialog() },
    onError: (error: any) => { toast.error(error.message || 'Failed to pause session') }
  })

  const resumeSessionMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => resumeChargingSession(sessionId),
    onSuccess: (response) => { invalidateSessionQueries(); toast.success(response?.message || 'Session resumed successfully'); closeActionDialog() },
    onError: (error: any) => { toast.error(error.message || 'Failed to resume session') }
  })

  const cancelSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      cancelChargingSession(sessionId, { reason }),
    onSuccess: (response) => { invalidateSessionQueries(); toast.success(response?.message || 'Session cancelled successfully'); closeActionDialog() },
    onError: (error: any) => { toast.error(error.message || 'Failed to cancel session') }
  })

  const uncancelSessionMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => uncancelChargingSession(sessionId),
    onSuccess: (response) => { invalidateSessionQueries(); toast.success(response?.message || 'Session uncancelled successfully'); closeActionDialog() },
    onError: (error: any) => { toast.error(error.message || 'Failed to uncancel session') }
  })

  // Get the appropriate data based on view mode. A shift filter only makes
  // sense against the full list (a finished shift has no active sessions), so
  // force the "all" view whenever shiftReportId is set.
  const effectiveViewMode = shiftReportId ? 'all' : viewMode
  const sessionsData = effectiveViewMode === 'active' ? activeSessionsData : allSessionsData
  const sessionsLoading = effectiveViewMode === 'active' ? activeSessionsLoading : allSessionsLoading
  const sessionsFetching = effectiveViewMode === 'active' ? activeSessionsFetching : allSessionsFetching
  const sessions = sessionsData?.data?.sessions || []
  const pagination = sessionsData?.data?.pagination

  // Stats — single server-side aggregate endpoint (no row loading)
  const { data: sessionStatsData } = useQuery({
    queryKey: ['adminSessionStats'],
    queryFn: () => getAdminSessionStats(),
    staleTime: 5 * 60 * 1000,
  })

  const stats = sessionStatsData?.data?.stats ?? {
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    totalRevenue: 0,
    totalKwh: 0,
    completionRate: 0,
  }

  // Server-side pagination logic (sessions already filtered by backend)
  const totalPages = pagination?.totalPages || 1
  const totalItems = pagination?.total || 0
  const filteredSessions = sessions

  const handlePageChange = (page: number) => {
    setPage(page)
  }

  // Snap back to the last real page when a deep link (or a now-narrower filter
  // like ?shiftReportId=) leaves us past the end of the result set. We wait for
  // data to confirm the page is out of range rather than resetting on mount, so
  // legitimate `?page=N` deep links are still honored (see useUrlPagination).
  // `total` is counted independently of `skip`, so totalPages is accurate even
  // when the current page itself came back empty.
  useEffect(() => {
    if (sessionsLoading || sessionsFetching) return
    if (totalItems > 0 && currentPage > totalPages) {
      setPage(totalPages)
    }
  }, [sessionsLoading, sessionsFetching, totalItems, totalPages, currentPage, setPage])

  // Fetch missing operator details
  useEffect(() => {
    if (sessions.length > 0) {
      const missing = sessions.filter(
        (s: AdminSession) => !s.operator?.firstName && !operatorCache[s.operatorId] && !loadingOperators.has(s.operatorId)
      )
      for (const session of missing.slice(0, 5)) {
        if (session.operatorId) fetchOperatorDetails(session.operatorId)
      }
    }
  }, [sessions])

  // Map a row id (we use `session.id` so the dropdown's open state and the
  // session detail popup share the same key) back to the AdminSession.
  const sessionsById = React.useMemo(
    () => Object.fromEntries(sessions.map((s: AdminSession) => [s.id, s])),
    [sessions],
  ) as Record<string, AdminSession>

  const goToSessionPage = (sid: string) =>
    router.push(`/dashboard/admin/sessions/${sid}`)

  const { getRowProps, actionCellStopProps, getDropdownProps } = useSessionRowInteractions({
    onClick: (id) => {
      const session = sessionsById[id]
      if (!session) return
      goToSessionPage(session.sessionId)
    },
  })

  // Backwards-compat: old shareable URLs use `?sessionId=…`. Redirect them to
  // the new path-based route so deep links keep working.
  useEffect(() => {
    if (!sharedSessionId || hasConsumed(sharedSessionId)) return
    markConsumed(sharedSessionId)
    setSharedSessionId(null)
    goToSessionPage(sharedSessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedSessionId])

  const isAdminOrOrgAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZATION_ADMIN;

  const closeActionDialog = () => setPendingAction({ type: null, session: null })

  const handleDeleteSession = (session: AdminSession) => {
    setSessionToDelete(session)
    setIsDeleteDialogOpen(true)
  }

  const openActionDialog = (type: 'pause' | 'resume' | 'cancel' | 'uncancel', session: AdminSession) => {
    setPendingAction({ type, session })
  }

  const handleEditSession = (session: AdminSession) => {
    setSessionToEdit(session)
    setIsEditDialogOpen(true)
  }

  const handleConfirmSessionAction = (actionType: string, sessionId: string, reason?: string) => {
    switch (actionType) {
      case 'pause':
        pauseSessionMutation.mutate({ sessionId, reason })
        break
      case 'resume':
        resumeSessionMutation.mutate({ sessionId })
        break
      case 'cancel':
        cancelSessionMutation.mutate({ sessionId, reason: reason! })
        break
      case 'uncancel':
        uncancelSessionMutation.mutate({ sessionId })
        break
    }
  }

  const actionIsSubmitting =
    (pendingAction.type === 'pause' && pauseSessionMutation.isPending) ||
    (pendingAction.type === 'resume' && resumeSessionMutation.isPending) ||
    (pendingAction.type === 'cancel' && cancelSessionMutation.isPending) ||
    (pendingAction.type === 'uncancel' && uncancelSessionMutation.isPending)

  return (
    <AdminAccessGuard>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Charging Sessions</h1>
          <p className="text-gray-600 mt-2">
            Monitor all charging sessions, track performance, and manage operations
          </p>
        </div>
        {!shiftReportId && (
          <div className="flex items-center gap-3">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              onClick={() => handleViewModeChange('all')}
            >
              All Sessions
            </Button>
            <Button
              variant={viewMode === 'active' ? 'default' : 'outline'}
              onClick={() => handleViewModeChange('active')}
            >
              Active Sessions
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/admin/sessions/archive')}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create session
            </Button>
          </div>
        )}
      </div>

      {/* Shift filter banner — shown when arriving from a Shift Details drawer */}
      {shiftReportId && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Filter className="h-4 w-4 flex-shrink-0" />
            <span>
              Showing only the charging sessions logged during the selected shift.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => router.push('/dashboard/admin/sessions')}
          >
            <X className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          description={`${stats.totalSessions} sessions recorded`}
          icon={<Zap className="h-4 w-4 text-white" />}
          color="bg-blue-600"
          isLoading={allSessionsLoading}
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeSessions}
          description={`${stats.activeSessions} currently charging`}
          icon={<Activity className="h-4 w-4 text-white" />}
          color="bg-green-600"
          isLoading={activeSessionsLoading}
        />
        <StatCard
          title="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} RWF`}
          description={`${stats.completionRate}% completion rate`}
          icon={<DollarSign className="h-4 w-4 text-white" />}
          color="bg-emerald-600"
          isLoading={allSessionsLoading}
        />
        <StatCard
          title="Total kWh"
          value={`${stats.totalKwh.toLocaleString()}kWh`}
          description={`${stats.totalKwh.toLocaleString()}kWh delivered`}
          icon={<Battery className="h-4 w-4 text-white" />}
          color="bg-purple-600"
          isLoading={allSessionsLoading}
        />
      </div>

      {/* Sessions Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {shiftReportId
                  ? 'Shift Sessions'
                  : effectiveViewMode === 'active' ? 'Active Sessions' : 'All Sessions'} ({totalItems})
              </CardTitle>
              <CardDescription>
                {shiftReportId
                  ? 'Charging sessions logged during the selected shift'
                  : effectiveViewMode === 'active'
                    ? 'Monitor currently active charging sessions'
                    : 'View all charging sessions with detailed information'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by session ID, EBM invoice #, customer (name/phone/TIN), vehicle, operator, charger, amount..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter === 'all' ? 'All Status' : getStatusDisplayLabel(statusFilter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('all')}>All Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('STARTED')}>Charging</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('PAUSED')}>Paused</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('COMPLETED')}>Unpaid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('PAID')}>Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('EBM_ISSUED')}>EBM Issued</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('REFUNDED')}>Refunded</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('CANCELLED')}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sessions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Charger</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoading || sessionsFetching ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading sessions…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="text-center">
                        <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No sessions found</p>
                        {searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">
                            Try adjusting your search terms
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session: AdminSession) => {
                    const operator = getOperatorDisplay(session, operatorCache, loadingOperators)
                    const rowProps = getRowProps(session.id)
                    // Keep highlighting the last-viewed session after the popup
                    // closes; users can re-find their row after dismissing it.
                    const highlightId = sharedSessionId || selectedSession?.sessionId
                    const isHighlighted = !!highlightId && session.sessionId === highlightId
                    return (
                      <TableRow
                        key={session.id}
                        {...rowProps}
                        className={`${rowProps.className}${isHighlighted ? ' bg-amber-50 hover:bg-amber-100 ring-2 ring-inset ring-amber-300' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{session.sessionId}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(session.startTime).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.customerName || session.customerPhone || session.ebmTin ? (
                            <div className="leading-tight">
                              {session.customerName && (
                                <div className="text-sm font-medium">{session.customerName}</div>
                              )}
                              {session.customerPhone && (
                                <div className="text-xs text-gray-500 font-mono">{session.customerPhone}</div>
                              )}
                              {session.ebmTin && (
                                <div className="text-xs text-gray-500 font-mono">TIN: {session.ebmTin}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{session.vehicle?.make} {session.vehicle?.model}</span>
                          </div>
                          <div className="text-xs text-gray-500">{session.vehicle?.kabisaId}</div>
                          {session.vehicle?.licensePlates?.[0]?.licencePlateNumber && (
                            <div className="text-xs font-mono font-medium text-blue-600">
                              {session.vehicle.licensePlates[0].licencePlateNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{operator.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">{operator.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Battery className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{session.charger?.name}</span>
                          </div>
                          <div className="text-xs text-gray-500">{session.charger?.kabisaId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{formatDuration(session.startTime, session.endTime)}</span>
                          </div>
                          {session.chargedKwh && (
                            <div className="text-xs text-gray-500">{session.chargedKwh.toLocaleString()} kWh</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(session.sessionStatus)}
                            <Badge className={getStatusDisplayColor(session.sessionStatus)}>
                              {getStatusDisplayLabel(session.sessionStatus)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{session.paymentMethodName || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          {session.totalAmount ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium">{session.totalAmount.toLocaleString()} RWF</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" {...actionCellStopProps}>
                          <div className="flex items-center justify-end gap-2">
                            {isSessionEditable(session.sessionStatus) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSessionToEdit(session); setIsEditDialogOpen(true) }}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit Session"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <EBMDownloadIcon
                              sessionId={session.sessionId}
                              sessionStatus={session.sessionStatus}
                              paymentMethodEnum={session.paymentMethodEnum}
                              hasCompletedSaleEbm={session.hasCompletedSaleEbm}
                            />
                            <DropdownMenu {...getDropdownProps(session.id)}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => goToSessionPage(session.sessionId)}>
                                  <Eye className="h-4 w-4 mr-2" />View Details
                                </DropdownMenuItem>
                                {isSessionEditable(session.sessionStatus) && (
                                  <DropdownMenuItem onClick={() => { setSessionToEdit(session); setIsEditDialogOpen(true) }}>
                                    <Edit className="h-4 w-4 mr-2" />Edit Session
                                  </DropdownMenuItem>
                                )}
                                {session.sessionStatus === 'STARTED' && (
                                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'pause', session })}>
                                    <PauseCircle className="h-4 w-4 mr-2" />Pause Session
                                  </DropdownMenuItem>
                                )}
                                {session.sessionStatus === 'PAUSED' && (
                                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'resume', session })}>
                                    <PlayCircle className="h-4 w-4 mr-2" />Resume Session
                                  </DropdownMenuItem>
                                )}
                                {(session.sessionStatus === 'STARTED' || session.sessionStatus === 'PAUSED') && (
                                  <DropdownMenuItem
                                    onClick={() => setPendingAction({ type: 'cancel', session })}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />Cancel Session
                                  </DropdownMenuItem>
                                )}
                                {session.sessionStatus === 'CANCELLED' && (
                                  <DropdownMenuItem onClick={() => setPendingAction({ type: 'uncancel', session })}>
                                    <RotateCcw className="h-4 w-4 mr-2" />Un-cancel Session
                                  </DropdownMenuItem>
                                )}
                                {session.paymentMethodEnum === 'MOMO' && (
                                  <DropdownMenuItem
                                    onClick={() => checkMomoStatusMutation.mutate(session.id)}
                                    disabled={checkMomoStatusMutation.isPending}
                                  >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${checkMomoStatusMutation.isPending ? 'animate-spin' : ''}`} />
                                    Check MOMO Status
                                  </DropdownMenuItem>
                                )}
                                {isEligibleForEbm({ sessionStatus: session.sessionStatus, paymentMethodEnum: session.paymentMethodEnum }) && (
                                  <DropdownMenuItem
                                    onClick={() => { setSelectedSession(session); ebmDialogs.handlers.openDistribution() }}
                                    disabled={!session.hasCompletedSaleEbm}
                                  >
                                    <Share2 className="h-4 w-4 mr-2" />{session.hasCompletedSaleEbm ? 'Distribute EBM' : 'Distribute EBM (Pending)'}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { setSelectedSession(session); ebmDialogs.handlers.openInfo() }}>
                                  <FileText className="h-4 w-4 mr-2" />{session.hasCompletedSaleEbm ? 'View EBM Info' : 'View/Edit EBM Info'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setSessionToDelete(session); setIsDeleteDialogOpen(true) }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />Delete Session
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-blue-50 gap-4 mt-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-semibold text-blue-600">{totalItems}</span> results
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage <= 1
                        ? 'pointer-events-none opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200'
                      }
                    />
                  </PaginationItem>

                  {renderPaginationPages(currentPage, totalPages, handlePageChange)}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages
                        ? 'pointer-events-none opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <SessionActionDialog
        actionType={pendingAction.type}
        session={pendingAction.session}
        isSubmitting={actionIsSubmitting}
        onClose={closeActionDialog}
        onConfirm={handleConfirmSessionAction}
      />

      <DeleteSessionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        session={sessionToDelete}
        isDeleting={deleteSessionMutation.isPending}
        onConfirm={(reason) => { if (sessionToDelete) deleteSessionMutation.mutate({ sessionId: sessionToDelete.id, reason }) }}
      />

      <CreateSessionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={invalidateSessionQueries}
      />

      {/* Edit Session Dialog */}
      <AdminSessionEditDialog
        session={sessionToEdit}
        open={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setSessionToEdit(null) }}
        onUpdated={invalidateSessionQueries}
      />

      {ebmDialogs.dialogs}
    </div>
    </AdminAccessGuard>
  )
}

// Extracted pagination rendering to reduce complexity in main component
function renderPaginationPages(
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void
) {
  const maxVisiblePages = 7
  const halfVisible = Math.floor(maxVisiblePages / 2)
  let startPage = Math.max(1, currentPage - halfVisible)
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  const pageClass = (page: number) =>
    `cursor-pointer transition-all duration-200 ${
      currentPage === page
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 scale-105'
        : 'hover:bg-blue-100 hover:text-blue-700 hover:scale-105'
    }`

  const pages: React.ReactNode[] = []

  // First page + ellipsis
  if (startPage > 1) {
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1} className={pageClass(1)}>1</PaginationLink>
      </PaginationItem>
    )
    if (startPage > 2) {
      pages.push(<PaginationItem key="ellipsis1"><span className="px-3 py-2 text-gray-500">...</span></PaginationItem>)
    }
  }

  // Visible pages
  for (let i = startPage; i <= endPage; i++) {
    if (i === 1 && startPage > 1) continue
    pages.push(
      <PaginationItem key={i}>
        <PaginationLink onClick={() => onPageChange(i)} isActive={currentPage === i} className={pageClass(i)}>{i}</PaginationLink>
      </PaginationItem>
    )
  }

  // Last page + ellipsis
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(<PaginationItem key="ellipsis2"><span className="px-3 py-2 text-gray-500">...</span></PaginationItem>)
    }
    pages.push(
      <PaginationItem key={totalPages}>
        <PaginationLink onClick={() => onPageChange(totalPages)} isActive={currentPage === totalPages} className={pageClass(totalPages)}>{totalPages}</PaginationLink>
      </PaginationItem>
    )
  }

  return pages
}

// Wrap in Suspense because the body reads `useSearchParams` — without it,
// Next.js can render the page before the URL hooks hydrate, which means a
// deep link like `?page=23` paints page 1 on first load.
const AdminSessionsPage = () => (
  <Suspense fallback={null}>
    <AdminSessionsPageBody />
  </Suspense>
)

export default AdminSessionsPage
