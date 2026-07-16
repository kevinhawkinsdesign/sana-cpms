'use client'

import React, { useState, useMemo } from 'react'
import {
  Zap,
  Clock,
  User,
  Battery,
  MapPin,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Square,
  XCircle,
  DollarSign,
  Activity,
  Trash2,
  Calendar,
  Car,
  User as UserIcon,
  TrendingUp,
  Settings,
  X,
  Share2,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import CustomerInfoDialog, { type CustomerInfoFormValues } from '@/components/shared/CustomerInfoDialog'
import { useSessionRowInteractions } from '@/lib/hooks/useSessionRowInteractions'
import { AnimatedCounter } from '@/components/ui/animated-counter'
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

// Types for different session data structures
export interface BaseSession {
  id: string
  sessionId: string
  source?: 'MANUAL' | 'REMOTE'
  vehicleId: string
  gunId: string
  chargerId: string
  operatorId: string
  startSoc: number
  endSoc: number | null
  chargedKwh: number | null
  startTime: string
  endTime: string | null
  sessionStatus: 'STARTED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PAID' | 'EBM_ISSUED' | 'REFUNDED' | 'completed' | 'failed' | 'in_progress' | 'paused'
  totalAmount: number | null
  imageUrl: string | null
  carModelMake: string | null
  customerName: string | null
  customerPhone?: string | null
  ebmTin?: string | null
  description?: string | null
  commonSessionTag?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  vehicle?: {
    make?: string
    model?: string
    kabisaId?: string
    licensePlates?: Array<{
      licencePlateNumber?: string
    }>
  }
  operator?: {
    firstName?: string
    lastName?: string
    email?: string
  }
  charger?: {
    name?: string
    kabisaId?: string
    location?: string
  }
  gun?: {
    name?: string
  }
  pedestal?: {
    name?: string
  }
  // Additional fields for different contexts
  stationName?: string
  location?: string
  paymentType?: string
  duration?: number
  cost?: number
  maskedCard?: string
  category?: string[]
  // Payment method fields
  isPaid?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
}

export interface SessionsTableProps<T extends BaseSession = BaseSession> {
  sessions: T[]
  isLoading?: boolean
  title?: string
  description?: string
  showSearch?: boolean
  showFilter?: boolean
  showActions?: boolean
  showStats?: boolean
  showPagination?: boolean
  maxHeight?: string
  currentPage?: number
  totalPages?: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange?: (page: number) => void
  onViewDetails?: (session: T) => void
  onDeleteSession?: (session: T) => void
  onTransferSession?: (session: T) => void
  onPaymentSession?: (session: T) => void
  onEndSession?: (session: T) => void
  // Controlled search/status. When either handler is provided the table stops
  // filtering client-side for that axis and forwards values to the parent so
  // it can query the backend.
  searchValue?: string
  onSearchChange?: (value: string) => void
  statusValue?: string
  onStatusChange?: (value: string) => void
  // Called when user adds missing vehicle/customer info. Defaults to opening
  // the built-in CustomerInfoDialog if not provided.
  onAddVehicleInfo?: (session: T) => void
  // Fired after the built-in CustomerInfoDialog successfully saves. Parent
  // should use this to refetch data in background instead of full page reload.
  onCustomerInfoSaved?: () => void | Promise<void>
  customActions?: Array<{
    label: string
    icon: React.ReactNode
    onClick: (session: T) => void
    variant?: 'default' | 'destructive'
  }>
  /** When set, the matching row (compared on `sessionId` and `id`) is highlighted. */
  highlightedSessionId?: string | null
  userRole?: 'admin' | 'operator' | 'customer'
  emptyMessage?: string
  searchPlaceholder?: string
  className?: string
}

function SessionsTable<T extends BaseSession = BaseSession>({
  sessions = [],
  isLoading = false,
  title = "Sessions",
  description,
  showSearch = true,
  showFilter = true,
  showActions = true,
  showStats = false,
  showPagination = false,
  maxHeight = "400px",
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onViewDetails,
  onDeleteSession,
  onTransferSession,
  onPaymentSession,
  onEndSession,
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  onAddVehicleInfo,
  onCustomerInfoSaved,
  customActions = [],
  highlightedSessionId,
  userRole = 'admin',
  emptyMessage = "No sessions found",
  searchPlaceholder = "Search by session ID, EBM invoice #, customer, vehicle, operator, charger, license plate, date...",
  className = ""
}: SessionsTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'STARTED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PAID' | 'EBM_ISSUED' | 'REFUNDED' | 'completed' | 'failed' | 'in_progress'>('all')
  const [customerInfoSession, setCustomerInfoSession] = useState<T | null>(null)
  const [customerFormValues, setCustomerFormValues] = useState<CustomerInfoFormValues>({ name: '', phone: '', licensePlateNumber: '' })

  // Row interactions: tap opens the details popup (delegating to the parent's
  // `onViewDetails` so navigation state lives outside the table). Long-press
  // opens that row's actions dropdown via controlled `open` state.
  const sessionsById = useMemo(
    () => Object.fromEntries(sessions.map((s) => [s.id, s])) as Record<string, T>,
    [sessions],
  )
  const { getRowProps, actionCellStopProps, getDropdownProps } = useSessionRowInteractions({
    onClick: (id) => {
      const session = sessionsById[id]
      if (session) onViewDetails?.(session)
    },
  })

  // Controlled vs uncontrolled search/status. When parent provides handlers we
  // stop filtering client-side for that axis — backend returns already-filtered data.
  const isSearchControlled = typeof onSearchChange === 'function'
  const isStatusControlled = typeof onStatusChange === 'function'
  const effectiveSearch = isSearchControlled ? (searchValue ?? '') : searchTerm
  const effectiveStatus = isStatusControlled ? (statusValue ?? 'all') : statusFilter
  const applyClientSearch = !isSearchControlled
  const applyClientStatus = !isStatusControlled

  // Normalize session status for consistent filtering
  const normalizeStatus = (status: string | undefined | null) => {
    if (!status) return ''
    const upper = status.toString().toUpperCase()
    switch (upper) {
      case 'COMPLETED':
        return 'COMPLETED'
      case 'FAILED':
      case 'CANCELLED':
        return 'CANCELLED'
      case 'IN_PROGRESS':
      case 'STARTED':
        return 'STARTED'
      case 'PAUSED':
        return 'PAUSED'
      case 'PAID':
        return 'PAID'
      default:
        return upper
    }
  }

  // Filter sessions based on search and status (client-side only when not controlled).
  const filteredSessions = useMemo(() => {
    if (!applyClientSearch && !applyClientStatus) return sessions
    return sessions.filter((session) => {
      const matchesSearch = !applyClientSearch || (() => {
        const searchLower = searchTerm.toLowerCase()
        if (!searchLower) return true
        return (
          session.sessionId?.toLowerCase().includes(searchLower) ||
          session.vehicle?.kabisaId?.toLowerCase().includes(searchLower) ||
          session.vehicle?.make?.toLowerCase().includes(searchLower) ||
          session.vehicle?.model?.toLowerCase().includes(searchLower) ||
          session.vehicle?.licensePlates?.[0]?.licencePlateNumber?.toLowerCase().includes(searchLower) ||
          session.operator?.firstName?.toLowerCase().includes(searchLower) ||
          session.operator?.lastName?.toLowerCase().includes(searchLower) ||
          session.operator?.email?.toLowerCase().includes(searchLower) ||
          session.operatorId?.toLowerCase().includes(searchLower) ||
          session.charger?.name?.toLowerCase().includes(searchLower) ||
          session.charger?.kabisaId?.toLowerCase().includes(searchLower) ||
          session.gun?.name?.toLowerCase().includes(searchLower) ||
          session.pedestal?.name?.toLowerCase().includes(searchLower) ||
          session.stationName?.toLowerCase().includes(searchLower) ||
          session.location?.toLowerCase().includes(searchLower) ||
          session.customerName?.toLowerCase().includes(searchLower) ||
          session.carModelMake?.toLowerCase().includes(searchLower) ||
          session.sessionStatus?.toLowerCase().includes(searchLower) ||
          session.description?.toLowerCase().includes(searchLower) ||
          session.commonSessionTag?.toLowerCase().includes(searchLower) ||
          session.paymentMethodName?.toLowerCase().includes(searchLower) ||
          session.paymentMethodEnum?.toLowerCase().includes(searchLower) ||
          session.totalAmount?.toString().includes(searchLower) ||
          session.chargedKwh?.toString().includes(searchLower) ||
          (session.startTime && new Date(session.startTime).toLocaleDateString().includes(searchLower)) ||
          (session.endTime && new Date(session.endTime).toLocaleDateString().includes(searchLower))
        )
      })()

      const matchesStatus = !applyClientStatus || (() => {
        const normalizedStatus = normalizeStatus(session.sessionStatus)
        const normalizedFilter = statusFilter === 'all' ? 'all' : statusFilter.toString().toUpperCase()
        return normalizedFilter === 'all' || normalizedStatus === normalizedFilter
      })()

      return matchesSearch && matchesStatus
    })
  }, [sessions, searchTerm, statusFilter, applyClientSearch, applyClientStatus])

  // Calculate stats
  const stats = useMemo(() => {
    const total = sessions.length
    const completed = sessions.filter(s => normalizeStatus(s.sessionStatus) === 'COMPLETED').length
    const started = sessions.filter(s => normalizeStatus(s.sessionStatus) === 'STARTED').length
    const paused = sessions.filter(s => normalizeStatus(s.sessionStatus) === 'PAUSED').length
    const active = started + paused
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    const totalKwh = sessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0)

    return { total, completed, started, paused, active, totalRevenue, totalKwh }
  }, [sessions])

  // Group split sessions (with commonSessionTag) into pairs for display
  type GroupedRow =
    | { type: 'single'; session: T }
    | { type: 'split'; tag: string; sessions: T[] }

  const groupedRows = useMemo<GroupedRow[]>(() => {
    if (!filteredSessions.length) return []

    const tagMap = new Map<string, T[]>()

    // Collect sessions by commonSessionTag
    filteredSessions.forEach((session) => {
      if (session.commonSessionTag) {
        const existing = tagMap.get(session.commonSessionTag) || []
        existing.push(session)
        tagMap.set(session.commonSessionTag, existing)
      }
    })

    const usedTags = new Set<string>()
    const rows: GroupedRow[] = []

    // Preserve original order while grouping tags that have exactly 2 sessions.
    // For split pairs, we ensure the "first" session (used for row-spanned cells)
    // is the earlier one by startTime (fallback to createdAt as needed).
    for (const session of filteredSessions) {
      const tag = session.commonSessionTag

      if (tag && tagMap.get(tag)?.length === 2) {
        if (usedTags.has(tag)) continue
        usedTags.add(tag)

        const pair = [...(tagMap.get(tag) || [])]
        pair.sort((a, b) => {
          const aTime = a.startTime || a.createdAt
          const bTime = b.startTime || b.createdAt
          return new Date(aTime).getTime() - new Date(bTime).getTime()
        })

        rows.push({
          type: 'split',
          tag,
          sessions: pair,
        })
      } else {
        rows.push({
          type: 'single',
          session,
        })
      }
    }

    return rows
  }, [filteredSessions])

  // Helper functions
  const getStatusColor = (status: string) => {
    return getStatusDisplayColor(status)
  }

  const getStatusIcon = getSessionStatusIcon

  const formatDuration = formatSessionDuration

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return `${amount.toFixed(2)} RWF`
  }

  const handleViewDetails = (session: T) => {
    onViewDetails?.(session)
  }

  const handleDeleteSession = (session: T) => {
    onDeleteSession?.(session)
  }

  const handleTransferSession = (session: T) => {
    onTransferSession?.(session)
  }

  const handlePaymentSession = (session: T) => {
    onPaymentSession?.(session)
  }

  const handleEndSession = (session: T) => {
    onEndSession?.(session)
  }

  const openCustomerInfoDialog = (session: T) => {
    setCustomerInfoSession(session)
    setCustomerFormValues({
      name: session.customerName ?? '',
      phone: session.customerPhone ?? '',
      licensePlateNumber: session.vehicle?.licensePlates?.[0]?.licencePlateNumber ?? '',
    })
  }


  // Determine which columns to show based on user role
  const getVisibleColumns = () => {
    const baseColumns = ['status', 'type', 'vehicle', 'customer', 'operator', 'location', 'sessionTime', 'energy', 'payment', 'actions']

    switch (userRole) {
      case 'admin':
        return baseColumns
      case 'operator':
        return baseColumns.filter(col => col !== 'operator') // Remove operator column for operator view
      case 'customer':
        return baseColumns.filter(col => col !== 'customer' && col !== 'operator') // Remove customer and operator columns for customer view
      default:
        return baseColumns
    }
  }

  // Determine if a session has any vehicle info worth showing
  const hasVehicleInfo = (session: T) => {
    return !!(
      session.vehicle?.make ||
      session.vehicle?.model ||
      session.vehicle?.kabisaId ||
      session.vehicle?.licensePlates?.[0]?.licencePlateNumber ||
      session.carModelMake
    )
  }

  // Reuse CustomerInfoDialog for the "Add vehicle info" CTA unless parent overrides
  const handleAddVehicleInfo = (session: T) => {
    if (onAddVehicleInfo) return onAddVehicleInfo(session)
    openCustomerInfoDialog(session)
  }

  const visibleColumns = getVisibleColumns()

  const renderRow = (session: T, isSplit = false, isFirstInSplit = false) => {
    const sharedCellRowSpan = isSplit && isFirstInSplit ? 2 : 1
    let splitBorderClasses = ''
    if (isSplit && isFirstInSplit) {
      // Top row: outer border on top/sides only, no bottom (so center line is invisible)
      splitBorderClasses = 'border-2 border-indigo-400 border-b-0 rounded-t-full'
    } else if (isSplit && !isFirstInSplit) {
      // Bottom row: outer border on bottom/sides only, no top
      splitBorderClasses = 'border-2 border-indigo-400 border-t-0 rounded-b-full'
    }

    const rowProps = onViewDetails ? getRowProps(session.id) : { className: 'hover:bg-gray-50' }
    const isHighlighted =
      !!highlightedSessionId &&
      (session.sessionId === highlightedSessionId || session.id === highlightedSessionId)
    const highlightClasses = isHighlighted
      ? 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 ring-2 ring-inset ring-amber-300'
      : ''

    return (
      <TableRow
        key={session.id}
        {...rowProps}
        className={`${rowProps.className} ${highlightClasses} ${splitBorderClasses}`.replace(/\s+/g, ' ').trim()}
      >
        {visibleColumns.includes('status') && (
          <TableCell className="min-w-[120px]">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${getStatusColor(session.sessionStatus)} font-medium border px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide`}
              >
                {getStatusDisplayLabel(session.sessionStatus)}
              </Badge>
            </div>
          </TableCell>
        )}

        {visibleColumns.includes('type') && (!isSplit || isFirstInSplit) && (
          <TableCell rowSpan={isSplit ? sharedCellRowSpan : undefined}>
            {session.source ? (
              <Badge
                variant="outline"
                className={
                  session.source === 'REMOTE'
                    ? 'border-purple-200 bg-purple-50 text-purple-700 text-[11px] font-medium'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-gray-300 text-[11px] font-medium'
                }
              >
                {session.source === 'REMOTE' ? 'Remote' : 'Manual'}
              </Badge>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
            )}
          </TableCell>
        )}

        {visibleColumns.includes('vehicle') && (!isSplit || isFirstInSplit) && (
          <TableCell
            className="min-w-[200px]"
            rowSpan={isSplit ? sharedCellRowSpan : undefined}
          >
            {hasVehicleInfo(session) ? (
              <div className="flex items-center gap-2">
                <Car className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    {session.carModelMake ||
                      [session.vehicle?.make, session.vehicle?.model].filter(Boolean).join(' ') ||
                      'Unknown Vehicle'}
                  </div>
                  {(session.vehicle?.kabisaId || session.vehicleId) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.vehicle?.kabisaId || session.vehicleId}
                    </div>
                  )}
                  {session.vehicle?.licensePlates?.[0]?.licencePlateNumber && (
                    <div className="text-xs text-blue-600 font-medium">
                      {session.vehicle.licensePlates[0].licencePlateNumber}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Car className="h-3 w-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-gray-400 dark:text-gray-500 italic">No vehicle</div>
                  {userRole === 'operator' && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => handleAddVehicleInfo(session)}
                    >
                      Add vehicle info
                    </button>
                  )}
                </div>
              </div>
            )}
          </TableCell>
        )}

        {visibleColumns.includes('customer') && (!isSplit || isFirstInSplit) && (
          <TableCell rowSpan={isSplit ? sharedCellRowSpan : undefined}>
            <div className="flex items-center gap-2">
              <UserIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="text-sm">
                {session.customerName || 'N/A'}
              </span>
            </div>
            {session.customerPhone && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{session.customerPhone}</div>
            )}
            {session.ebmTin && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">TIN: {session.ebmTin}</div>
            )}
            {userRole === 'operator' && session.source === 'REMOTE' && (session as any).customerInfoAdded === false && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => openCustomerInfoDialog(session)}
              >
                Add customer info
              </button>
            )}
          </TableCell>
        )}

        {visibleColumns.includes('operator') && (!isSplit || isFirstInSplit) && (
          <TableCell
            className="min-w-[180px]"
            rowSpan={isSplit ? sharedCellRowSpan : undefined}
          >
            <div className="flex items-center gap-2">
              <UserIcon className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {session.operator?.firstName && session.operator?.lastName
                    ? `${session.operator.firstName} ${session.operator.lastName}`
                    : 'Unknown Operator'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.operator?.email || session.operatorId}
                </div>
              </div>
            </div>
          </TableCell>
        )}

        {visibleColumns.includes('location') && (!isSplit || isFirstInSplit) && (
          <TableCell
            className="min-w-[160px]"
            rowSpan={isSplit ? sharedCellRowSpan : undefined}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {session.charger?.name || 'Unknown Charger'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.charger?.kabisaId || session.chargerId}
                </div>
                {(session.pedestal?.name || session.gun?.name) && (
                  <div className="text-xs text-blue-600 font-medium">
                    {session.pedestal?.name && <>Pedestal: {session.pedestal.name}</>}
                    {session.pedestal?.name && session.gun?.name && ' · '}
                    {session.gun?.name && <>Gun: {session.gun.name}</>}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        )}

        {visibleColumns.includes('sessionTime') && (!isSplit || isFirstInSplit) && (
          <TableCell rowSpan={isSplit ? sharedCellRowSpan : undefined}>
            {(() => {
              const start = new Date(session.startTime)
              const end = session.endTime ? new Date(session.endTime) : null
              const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' }
              const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
              const sameDay =
                !!end &&
                start.getFullYear() === end.getFullYear() &&
                start.getMonth() === end.getMonth() &&
                start.getDate() === end.getDate()

              const durationMin = end
                ? Math.round((end.getTime() - start.getTime()) / (1000 * 60))
                : null

              if (!end) {
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm">{start.toLocaleDateString('en-US', dateOpts)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{start.toLocaleTimeString('en-US', timeOpts)}</div>
                  </>
                )
              }

              if (sameDay) {
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm">{start.toLocaleDateString('en-US', dateOpts)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {start.toLocaleTimeString('en-US', timeOpts)} → {end.toLocaleTimeString('en-US', timeOpts)}
                    </div>
                    {durationMin !== null && (
                      <div className="text-xs" style={{ color: '#0E159A' }}>Duration: {durationMin} min</div>
                    )}
                  </>
                )
              }

              return (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm">{start.toLocaleDateString('en-US', dateOpts)}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{start.toLocaleTimeString('en-US', timeOpts)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">→</span>
                    <span className="text-sm">{end.toLocaleDateString('en-US', dateOpts)}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{end.toLocaleTimeString('en-US', timeOpts)}</div>
                  {durationMin !== null && (
                    <div className="text-xs mt-1" style={{ color: '#0E159A' }}>Duration: {durationMin} min</div>
                  )}
                </>
              )
            })()}
          </TableCell>
        )}

        {visibleColumns.includes('energy') && (
          <TableCell>
            <div className="flex items-center gap-2">
              <Battery className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              {session.chargedKwh != null ? (
                <span className="text-sm">
                  <AnimatedCounter value={session.chargedKwh} decimals={1} suffix=" kWh" duration={800} />
                </span>
              ) : (
                <span className="text-sm">N/A</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>{session.startSoc ?? 0}%</span>
              <span>→</span>
              {session.endSoc != null ? (
                <AnimatedCounter value={session.endSoc} decimals={0} suffix="%" duration={800} />
              ) : (
                <span>N/A</span>
              )}
            </div>
            {session.chargedKwh && session.totalAmount && (
              <div className="text-xs" style={{ color: '#0E159A' }}>
                Rate:{' '}
                {Math.round(
                  session.totalAmount / session.chargedKwh,
                )}{' '}
                RWF/kWh
              </div>
            )}
          </TableCell>
        )}

        {visibleColumns.includes('payment') && (
          <TableCell className="min-w-[180px]">
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {session.paymentMethodName || 'N/A'}
              </div>
              {normalizeStatus(session.sessionStatus) === 'STARTED' ? (
                <div className="text-xs text-yellow-600 font-medium">
                  <Activity className="h-3 w-3 inline mr-1" />
                  Active
                </div>
              ) : session.totalAmount && session.totalAmount > 0 ? (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {session.totalAmount.toLocaleString()} RWF
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">-</div>
              )}
              {session.description && (
                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {session.description}
                </div>
              )}
            </div>
          </TableCell>
        )}

        {visibleColumns.includes('actions') && showActions && (
          <TableCell className="text-right" {...actionCellStopProps}>
            {(() => {
              const normalizedStatus = normalizeStatus(session.sessionStatus)
              const canPay =
                !!onPaymentSession &&
                normalizedStatus === 'COMPLETED' &&
                session.sessionStatus !== 'PAID' &&
                session.isPaid !== true
              const canEnd =
                !!onEndSession &&
                normalizedStatus === 'STARTED' &&
                session.source !== 'REMOTE'
              const hasOverflow = canEnd || !!onTransferSession || (!!onDeleteSession && userRole === 'admin') || customActions.length > 0

              return (
                <div className="flex items-center justify-end gap-1">
                  {canPay && (
                    <Button
                      size="sm"
                      onClick={() => handlePaymentSession(session)}
                      className="h-8 text-gray-900 dark:text-white hover:brightness-95"
                      style={{ backgroundColor: '#FFC200' }}
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      Pay
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(session)}
                    className="h-8"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                  {hasOverflow && (
                    <DropdownMenu {...getDropdownProps(session.id)}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEnd && (
                          <DropdownMenuItem
                            onClick={() => handleEndSession(session)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            End Session
                          </DropdownMenuItem>
                        )}
                        {onTransferSession && (
                          <DropdownMenuItem onClick={() => handleTransferSession(session)}>
                            <User className="h-4 w-4 mr-2" />
                            Transfer Session
                          </DropdownMenuItem>
                        )}
                        {onDeleteSession && userRole === 'admin' && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteSession(session)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Session
                          </DropdownMenuItem>
                        )}
                        {customActions.map((action, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => action.onClick(session)}
                            className={
                              action.variant === 'destructive'
                                ? 'text-red-600 dark:text-red-400 focus:text-red-600'
                                : ''
                            }
                          >
                            {action.icon}
                            <span className="ml-2">{action.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })()}
          </TableCell>
        )}
      </TableRow>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {title} ({totalItems || sessions.length})
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {showStats && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Total: {stats.total}</span>
                <span>UNPAID: {stats.completed}</span>
                <span>Active: {stats.active}</span>
                <span>Paused: {stats.paused}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          {(showSearch || showFilter) && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {showSearch && (
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={effectiveSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      if (isSearchControlled) onSearchChange?.(value)
                      else setSearchTerm(value)
                    }}
                    className="pl-10 pr-10 w-full"
                  />
                  {effectiveSearch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                      onClick={() => {
                        if (isSearchControlled) onSearchChange?.('')
                        else setSearchTerm('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              {showFilter && (() => {
                const setStatus = (value: string) => {
                  if (isStatusControlled) onStatusChange?.(value)
                  else setStatusFilter(value as any)
                }
                const statusLabel = effectiveStatus === 'all'
                  ? 'All Status'
                  : getStatusDisplayLabel(String(effectiveStatus))
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        {statusLabel}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStatus('all')}>All Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('STARTED')}>Charging</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('PAUSED')}>Paused</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('COMPLETED')}>Unpaid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('PAID')}>Paid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('EBM_ISSUED')}>EBM Issued</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('REFUNDED')}>Refunded</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatus('CANCELLED')}>Cancelled</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })()}
            </div>
          )}

          {/* Search Results Indicator */}
          {effectiveSearch && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Search className="h-4 w-4" />
                <span>
                  {isSearchControlled ? (
                    <>Searching for "{effectiveSearch}"</>
                  ) : (
                    <>
                      Found <span className="font-semibold">{filteredSessions.length}</span> sessions matching "{effectiveSearch}"
                      {filteredSessions.length !== sessions.length && (
                        <span className="text-blue-600"> (out of {sessions.length} total)</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Sessions Table */}
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
            <div style={{ maxHeight }} className="overflow-y-auto">
                <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-white dark:bg-[#1A1A1A] z-10">
                  <TableRow>
                    {visibleColumns.includes('status') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Status</TableHead>
                    )}
                    {visibleColumns.includes('type') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Type</TableHead>
                    )}
                    {visibleColumns.includes('vehicle') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Vehicle</TableHead>
                    )}
                    {visibleColumns.includes('customer') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Customer</TableHead>
                    )}
                    {visibleColumns.includes('operator') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Operator</TableHead>
                    )}
                    {visibleColumns.includes('location') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Location</TableHead>
                    )}
                    {visibleColumns.includes('sessionTime') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Session Time</TableHead>
                    )}
                    {visibleColumns.includes('energy') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Energy & SOC</TableHead>
                    )}
                    {visibleColumns.includes('payment') && (
                      <TableHead className="bg-gray-50 dark:bg-white/5">Payment</TableHead>
                    )}
                    {visibleColumns.includes('actions') && showActions && (
                      <TableHead className="bg-gray-50 dark:bg-white/5 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                        <div className="text-center">
                          <Zap className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                          {effectiveSearch && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                              Try adjusting your search terms
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedRows.map((group) => {
                      if (group.type === 'single') {
                        return renderRow(group.session)
                      }

                      const [first, second] = group.sessions

                      return (
                        <React.Fragment key={group.tag}>
                          {renderRow(first, true, true)}
                          {renderRow(second, true, false)}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-blue-50 gap-4">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-semibold text-blue-600">{totalItems}</span> results
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange?.(currentPage - 1)}
                    className={currentPage <= 1
                      ? 'pointer-events-none opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200'
                    }
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  const isActive = pageNumber === currentPage;

                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => onPageChange?.(pageNumber)}
                        isActive={isActive}
                        className={`cursor-pointer transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 scale-105'
                            : 'hover:bg-blue-100 hover:text-blue-700 hover:scale-105'
                        }`}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => onPageChange?.(currentPage + 1)}
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
      </Card>
    )
  }

  return (
    <>
      {renderContent()}

      <CustomerInfoDialog
        sessionId={customerInfoSession?.id ?? null}
        initialValues={customerFormValues}
        open={!!customerInfoSession}
        onOpenChange={(open) => { if (!open) setCustomerInfoSession(null) }}
        session={customerInfoSession as any}
        onSaved={async () => { await onCustomerInfoSaved?.() }}
      />
    </>
  )
}

export default SessionsTable
