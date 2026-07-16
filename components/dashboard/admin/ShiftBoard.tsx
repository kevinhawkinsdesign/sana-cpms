'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Users,
  Clock,
  MapPin,
  X,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  Search,
  Filter,
  AlertTriangle,
  FileEdit,
  Upload,
  LogOut,
  LogIn,
  Trash,
  Power,
  Mail,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Phone
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { getAllShifts, getAllUsers, createShift, updateShift, deleteShift, forceCheckoutOperator, forceCheckInOperator, deletePastShifts, type Shift, type User, type ForceCheckInData } from '@/lib/api/shifts'
import { getOperators } from '@/lib/api/admin'
import { getAllShiftReports, type ShiftReport } from '@/lib/api/shiftsAndInspections'
import CreateShiftForm from './CreateShiftForm'
import { OperatorRow } from './OperatorRow'
import { CreateShiftModal } from './CreateShiftModal'
import { EditWarningModal, DeleteWarningModal } from './ShiftProtectionModals'
import { PublishDraftsModal } from './PublishDraftsModal'
import { useDraftShifts } from '@/hooks/useDraftShifts'

interface ShiftBoardProps {
  className?: string
}

export const ShiftBoard: React.FC<ShiftBoardProps> = ({ className }) => {
  const queryClient = useQueryClient()
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    return startOfWeek
  })
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ operatorId: string; dayOfWeek: number; date?: string } | null>(null)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStation, setSelectedStation] = useState<string>('all')
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  // Protection warnings
  const [showEditWarning, setShowEditWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [pendingEditShift, setPendingEditShift] = useState<Shift | null>(null)
  const [pendingDeleteShift, setPendingDeleteShift] = useState<Shift | null>(null)

  // Admin actions
  const [showForceCheckoutModal, setShowForceCheckoutModal] = useState(false)
  const [selectedReportForCheckout, setSelectedReportForCheckout] = useState<ShiftReport | null>(null)
  const [showDeletePastShiftsModal, setShowDeletePastShiftsModal] = useState(false)
  const [showPastShiftsPreview, setShowPastShiftsPreview] = useState(false)
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false)
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<{ report: ShiftReport; shift: Shift | null } | null>(null)
  const [forceCheckoutComments, setForceCheckoutComments] = useState('')
  const [forceCheckoutMeterReading, setForceCheckoutMeterReading] = useState('')
  const [showForceCheckInModal, setShowForceCheckInModal] = useState(false)
  const [selectedShiftForCheckIn, setSelectedShiftForCheckIn] = useState<Shift | null>(null)
  const [forceCheckInComments, setForceCheckInComments] = useState('')
  const [checkInSearch, setCheckInSearch] = useState('')

  // Draft mode
  const {
    drafts,
    isDraftMode,
    toggleDraftMode,
    addDraft,
    updateDraft,
    deleteDraft,
    clearAllDrafts,
    getDraftCount,
    getDraftsForWeek
  } = useDraftShifts()
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch data for current week
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', currentWeek.toISOString()],
    queryFn: () => {
      const startDate = new Date(currentWeek)
      const endDate = new Date(currentWeek)
      endDate.setDate(startDate.getDate() + 6)

      return getAllShifts({ startDate, endDate })
    }
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers
  })

  const { data: operatorsData } = useQuery({
    queryKey: ['adminOperators'],
    queryFn: getOperators
  })

  // Fetch all shift reports to find active ones (admin only)
  const { data: shiftReportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['allShiftReports'],
    queryFn: getAllShiftReports
  })

  // Find active shift reports (checked in but not checked out)
  const activeShiftReports = useMemo(() => {
    const reports = shiftReportsData?.reports || []
    return reports.filter((report: ShiftReport) => {
      const hasCheckIn = !!report.checkInTime
      const hasNoCheckOut = !report.checkOutTime
      const isActive = report.isActive !== false
      return hasCheckIn && hasNoCheckOut && isActive
    })
  }, [shiftReportsData])


  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift updated successfully')
      setIsCreateFormOpen(false)
      setEditShift(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update shift')
    }
  })

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success('Shift deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete shift')
    }
  })

  // Force checkout mutation
  const forceCheckoutMutation = useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data?: any }) =>
      forceCheckoutOperator(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['allShiftReports'] })
      toast.success('Operator force checked out successfully')
      setShowForceCheckoutModal(false)
      setSelectedReportForCheckout(null)
      setForceCheckoutComments('')
      setForceCheckoutMeterReading('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to force checkout operator')
    }
  })

  // Force check-in mutation
  const forceCheckInMutation = useMutation({
    mutationFn: ({ operatorShiftId, data }: { operatorShiftId: string; data?: ForceCheckInData }) =>
      forceCheckInOperator(operatorShiftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['allShiftReports'] })
      toast.success('Operator force checked in successfully')
      setShowForceCheckInModal(false)
      setSelectedShiftForCheckIn(null)
      setForceCheckInComments('')
      setCheckInSearch('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to force check in operator')
    }
  })

  // Delete past shifts mutation
  const deletePastShiftsMutation = useMutation({
    mutationFn: deletePastShifts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(`Successfully deleted ${data.data.deletedCount} past shift(s)`)
      setShowDeletePastShiftsModal(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete past shifts')
    }
  })

  // Process data
  const publishedShifts = shiftsData?.data?.shifts || []
  const weekDrafts = getDraftsForWeek(currentWeek)

  // Merge published shifts with drafts when in draft mode
  const shifts = isDraftMode
    ? [...publishedShifts, ...weekDrafts as any[]] // Cast drafts to Shift type
    : publishedShifts

  // Find past shifts (shiftDate < today)
  const pastShifts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return shifts.filter((shift: Shift) => {
      if (!shift.shiftDate) return false
      try {
        const shiftDate = new Date(shift.shiftDate)
        shiftDate.setHours(0, 0, 0, 0)
        return shiftDate < today && shift.isActive !== false
      } catch {
        return false
      }
    })
  }, [shifts])

  // Shifts an operator could be force-checked-in to (published, assigned, active,
  // not yet checked in, and not future-dated). Drafts are excluded — you can only check
  // in to a real shift, and you can't check in to one that hasn't started yet.
  const notCheckedInShifts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return publishedShifts.filter((shift: Shift) => {
      if (shift.isCheckedIn || shift.isActive === false || !shift.operatorId) return false
      if (!shift.shiftDate) return true
      try {
        const d = new Date(shift.shiftDate)
        d.setHours(0, 0, 0, 0)
        return d <= today
      } catch {
        return true
      }
    })
  }, [publishedShifts])

  const users = usersData?.data?.users || []
  const operators = users.filter((user: User) => user.role === 'OPERATOR')
  const adminOperators = operatorsData?.data?.operators || []
  const traineeMap = useMemo(() => {
    const m = new Map<string, boolean>()
    adminOperators.forEach((op) => m.set(op.id, op.isTrainee))
    return m
  }, [adminOperators])

  const operatorDirectory = useMemo(() => {
    const map = new Map<string, User>()

    operators.forEach((operator) => {
      if (operator?.id) {
        const isTrainee = traineeMap.get(operator.id)
        map.set(operator.id, {
          ...operator,
          isTrainee: isTrainee ?? operator.isTrainee ?? false
        })
      }
    })

    shifts.forEach((shift) => {
      if (!shift.operatorId || map.has(shift.operatorId)) return

      const operatorInfo = shift.operator as Partial<User> | undefined
      const isTrainee = traineeMap.get(shift.operatorId)

      const fallback: User = {
        id: shift.operatorId,
        firstName: operatorInfo?.firstName || 'Unknown',
        lastName: operatorInfo?.lastName || '',
        email: operatorInfo?.email || '',
        phone: operatorInfo?.phone || '',
        role: operatorInfo?.role || 'OPERATOR',
        userType: operatorInfo?.userType || 'OPERATOR',
        imageUrl: operatorInfo?.imageUrl,
        avatar: operatorInfo?.avatar,
        profilePicture: operatorInfo?.profilePicture,
        picture: operatorInfo?.picture,
        isVerified: true,
        isActive: true,
        isTrainee: isTrainee ?? operatorInfo?.isTrainee ?? false,
        createdAt: operatorInfo?.createdAt || '',
        updatedAt: operatorInfo?.updatedAt || ''
      }

      map.set(shift.operatorId, fallback)
    })

    return Array.from(map.values())
  }, [operators, shifts, traineeMap])

  type ShiftSubmissionPayload = {
    operatorId: string
    shiftDate: string
    dayOfWeek?: number
    startTime?: string | null
    endTime?: string | null
    chargerId?: string
    chargerName?: string
    isLastShift?: boolean
  }

  const handleShiftCreate = async (
    payload: ShiftSubmissionPayload,
    options?: { draftId?: string }
  ) => {
    const normalizedDay =
      typeof payload.dayOfWeek === 'number'
        ? payload.dayOfWeek
        : new Date(payload.shiftDate).getDay()

    if (Number.isNaN(normalizedDay)) {
      throw new Error('Unable to determine day of week for this shift')
    }

    const normalizedStart = normalizeDraftTime(payload.startTime)
    const normalizedEnd = normalizeDraftTime(payload.endTime)

    if (isDraftMode || options?.draftId) {
      const operatorInfo = operatorDirectory.find(op => op.id === payload.operatorId)
      const timestamp = new Date().toISOString()

      const draftData = {
        operatorId: payload.operatorId,
        shiftDate: payload.shiftDate,
        dayOfWeek: normalizedDay,
        startTime: normalizedStart || undefined,
        endTime: normalizedEnd || undefined,
        chargerId: payload.chargerId,
        isLastShift: payload.isLastShift ?? false,
        updatedAt: timestamp,
        operator: operatorInfo
          ? {
            id: operatorInfo.id,
            firstName: operatorInfo.firstName,
            lastName: operatorInfo.lastName,
            email: operatorInfo.email,
            phone: operatorInfo.phone
          }
          : undefined,
        charger: payload.chargerName
          ? {
            id: payload.chargerId || `draft-charger-${Date.now()}`,
            kabisaId: '',
            name: payload.chargerName,
            address: ''
          }
          : undefined,
      }

      if (options?.draftId) {
        updateDraft(options.draftId, draftData)
      } else {
        addDraft(draftData)
      }

      return
    }

    await createShift({
      operatorId: payload.operatorId,
      shiftDate: payload.shiftDate,
      dayOfWeek: normalizedDay,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      chargerId: payload.chargerId,
      isLastShift: payload.isLastShift ?? false,
    })

    queryClient.invalidateQueries({ queryKey: ['shifts'] })
  }

  // Filter shifts by selected date if date filter is active
  const filteredShiftsForOverlap = useMemo(() => {
    if (!selectedDateFilter) {
      return shifts
    }

    const filterDate = new Date(selectedDateFilter + 'T00:00:00')
    filterDate.setHours(0, 0, 0, 0)
    const filterDateStr = filterDate.toISOString().split('T')[0]
    const filterDayOfWeek = filterDate.getDay()

    const filtered = shifts.filter(shift => {
      // Priority: Check shiftDate first (most accurate)
      if (shift.shiftDate) {
        try {
          const shiftDate = new Date(shift.shiftDate)
          shiftDate.setHours(0, 0, 0, 0)
          const shiftDateStr = shiftDate.toISOString().split('T')[0]

          // Normalize both dates to compare just the date part
          if (shiftDateStr === filterDateStr) {
            return true
          }
        } catch (e) {
          console.warn('Error parsing shiftDate:', shift.shiftDate, e)
        }
      }

      // Fallback: If no shiftDate, check if dayOfWeek matches
      // This handles recurring shifts that don't have specific dates
      if (shift.dayOfWeek !== undefined && shift.dayOfWeek !== null) {
        return shift.dayOfWeek === filterDayOfWeek
      }

      return false
    })

    // Debug logging
    if (selectedDateFilter) {
      console.log('Date Filter Debug:', {
        selectedDate: selectedDateFilter,
        filterDateStr,
        filterDayOfWeek,
        totalShifts: shifts.length,
        filteredShifts: filtered.length,
        sampleShift: shifts[0] ? {
          id: shifts[0].id,
          shiftDate: shifts[0].shiftDate,
          dayOfWeek: shifts[0].dayOfWeek
        } : null
      })
    }

    return filtered
  }, [shifts, selectedDateFilter])

  // Filter shifts by active status if active filter is enabled
  const filteredShiftsByActive = useMemo(() => {
    if (!showActiveOnly) {
      return filteredShiftsForOverlap
    }
    const activeFiltered = filteredShiftsForOverlap.filter(shift => shift.isActive === true)

    // Debug logging
    if (showActiveOnly) {
      console.log('Active Filter Debug:', {
        showActiveOnly,
        beforeFilter: filteredShiftsForOverlap.length,
        afterFilter: activeFiltered.length,
        sampleShift: filteredShiftsForOverlap[0] ? {
          id: filteredShiftsForOverlap[0].id,
          isActive: filteredShiftsForOverlap[0].isActive
        } : null
      })
    }

    return activeFiltered
  }, [filteredShiftsForOverlap, showActiveOnly])

  // Final filtered shifts (date + active filters applied)
  const filteredShifts = filteredShiftsByActive

  // Determine overlapping shifts (same day, time, charger)
  const overlapColorPalette = [
    { badgeClass: 'bg-emerald-200 text-emerald-900 border-emerald-300', ringClass: 'ring-emerald-300' },
    { badgeClass: 'bg-sky-200 text-sky-900 border-sky-300', ringClass: 'ring-sky-300' },
    { badgeClass: 'bg-amber-200 text-amber-900 border-amber-300', ringClass: 'ring-amber-300' },
    { badgeClass: 'bg-purple-200 text-purple-900 border-purple-300', ringClass: 'ring-purple-300' },
    { badgeClass: 'bg-rose-200 text-rose-900 border-rose-300', ringClass: 'ring-rose-300' },
    { badgeClass: 'bg-lime-200 text-lime-900 border-lime-300', ringClass: 'ring-lime-300' },
  ] as const

  const overlappingShiftMeta = useMemo(() => {
    const groups = new Map<string, Shift[]>()
    const meta: Record<string, { count: number; index: number; color: typeof overlapColorPalette[number] }> = {}
    let paletteIndex = 0

    filteredShifts.forEach((shift) => {
      if (shift.dayOfWeek === undefined || shift.dayOfWeek === null) return
      const start = shift.startTime || ''
      const end = shift.endTime || ''
      const chargerId = shift.chargerId || shift.charger?.id || ''

      if (!start || !end || !chargerId) return

      const key = `${shift.dayOfWeek}|${start}|${end}|${chargerId}`
      const arr = groups.get(key)
      if (arr) {
        arr.push(shift)
      } else {
        groups.set(key, [shift])
      }
    })

    groups.forEach((group) => {
      if (group.length > 1) {
        const ordered = [...group].sort((a, b) => {
          const opA = `${a.operator?.lastName || ''}${a.operator?.firstName || ''}`
          const opB = `${b.operator?.lastName || ''}${b.operator?.firstName || ''}`
          return opA.localeCompare(opB)
        })

        const palette = overlapColorPalette[paletteIndex % overlapColorPalette.length]
        paletteIndex += 1

        ordered.forEach((shift, index) => {
          meta[shift.id] = { count: ordered.length, index, color: palette }
        })
      }
    })

    return meta
  }, [filteredShifts])

  // Get unique stations from shifts
  const uniqueStations = useMemo(() => {
    const stations = new Set<string>()
    filteredShifts.forEach((shift: Shift) => {
      if (shift.charger?.name) {
        stations.add(shift.charger.name)
      }
    })
    return Array.from(stations).sort()
  }, [filteredShifts])

  const normalizeDraftTime = (time?: string | null) => {
    if (!time || time === 'flexible') {
      return ''
    }
    return time
  }

  const handlePublishDrafts = async (draftIds: string[]) => {
    const draftsToPublish = drafts.filter((draft) => draftIds.includes(draft.id))

    if (draftsToPublish.length === 0) {
      toast.error('No drafts selected for publishing')
      return
    }

    try {
      for (const draft of draftsToPublish) {
        if (!draft.shiftDate || !draft.operatorId) {
          throw new Error('Draft shift is missing required information')
        }

        await createShift({
          operatorId: draft.operatorId,
          shiftDate: new Date(draft.shiftDate).toISOString(),
          dayOfWeek: draft.dayOfWeek,
          startTime: normalizeDraftTime(draft.startTime),
          endTime: normalizeDraftTime(draft.endTime),
          chargerId: draft.chargerId,
          isLastShift: draft.isLastShift ?? false,
        })
      }

      draftsToPublish.forEach((draft) => deleteDraft(draft.id))
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(`Published ${draftsToPublish.length} shift${draftsToPublish.length === 1 ? '' : 's'}`)
    } catch (error: any) {
      console.error('Error publishing drafts:', error)
      toast.error(error?.message || 'Failed to publish draft shifts')
      throw error
    }
  }

  // Filter operators based on search term and selected station
  const filteredOperators = useMemo(() => {
    const baseFiltered = operatorDirectory.filter((operator: User) => {
      // Search filter - check name and email
      const matchesSearch = searchTerm === '' ||
        operator.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${operator.firstName} ${operator.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.email?.toLowerCase().includes(searchTerm.toLowerCase())

      // Station filter - check if operator has shifts at selected station
      if (selectedStation === 'all') {
        return matchesSearch
      }

      const hasShiftsAtStation = filteredShifts.some((shift: Shift) =>
        shift.operatorId === operator.id && shift.charger?.name === selectedStation
      )

      return matchesSearch && hasShiftsAtStation
    })
    if (!showOnlyDuplicates) {
      return baseFiltered
    }

    return baseFiltered.filter((operator: User) => {
      return filteredShifts.some(
        (shift) => shift.operatorId === operator.id && overlappingShiftMeta[shift.id]
      )
    })
  }, [operatorDirectory, searchTerm, selectedStation, filteredShifts, showOnlyDuplicates, overlappingShiftMeta])

  // Days of week for labels
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]

  // Generate week days - if date filter is active, show only that date
  const weekDays = useMemo(() => {
    if (selectedDateFilter) {
      const filterDate = new Date(selectedDateFilter)
      filterDate.setHours(0, 0, 0, 0)
      return [{
        date: filterDate,
        dayOfWeek: filterDate.getDay(),
        dayName: filterDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: filterDate.getDate(),
        month: filterDate.toLocaleDateString('en-US', { month: 'short' })
      }]
    }

    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeek)
      date.setDate(currentWeek.getDate() + i)
      days.push({
        date,
        dayOfWeek: date.getDay(),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' })
      })
    }
    return days
  }, [currentWeek, selectedDateFilter])


  // Organize shifts by operator and date (now supports multiple shifts per day)
  const shiftsByOperator = useMemo(() => {
    const organized: { [operatorId: string]: { [dayOfWeek: number]: Shift[] } } = {}

    operatorDirectory.forEach(operator => {
      if (operator?.id) {
        organized[operator.id] = {}
      }
    })

    filteredShifts.forEach(shift => {
      if (!shift.operatorId) return
      if (!organized[shift.operatorId]) {
        organized[shift.operatorId] = {}
      }

      const dayOfWeek = typeof shift.dayOfWeek === 'number'
        ? shift.dayOfWeek
        : new Date(shift.shiftDate).getDay()

      if (Number.isNaN(dayOfWeek)) return

      if (!organized[shift.operatorId][dayOfWeek]) {
        organized[shift.operatorId][dayOfWeek] = []
      }

      organized[shift.operatorId][dayOfWeek].push(shift)
    })

    // Sort shifts within each day by start time
    Object.keys(organized).forEach(operatorId => {
      Object.keys(organized[operatorId]).forEach(dayKey => {
        const day = parseInt(dayKey)
        organized[operatorId][day].sort((a, b) => {
          if (!a.startTime) return 1
          if (!b.startTime) return -1
          return a.startTime.localeCompare(b.startTime)
        })
      })
    })

    return organized
  }, [filteredShifts, operatorDirectory])

  // ===== DEBUG LOGGING FOR MULTIPLE SHIFTS =====
  // Debug 1: Check backend response for multiple shifts per day
  React.useEffect(() => {
    if (!shiftsData?.data?.shifts) return

    const rawShifts = shiftsData.data.shifts
    console.log('[ShiftBoard Debug] Raw backend response:', {
      totalShifts: rawShifts.length,
      currentWeek: currentWeek.toISOString()
    })

    // Group by operator + date to find multiples
    const groupedByOperatorDate = new Map<string, Shift[]>()
    rawShifts.forEach(shift => {
      const key = `${shift.operatorId}|${shift.shiftDate || 'no-date'}`
      if (!groupedByOperatorDate.has(key)) {
        groupedByOperatorDate.set(key, [])
      }
      groupedByOperatorDate.get(key)!.push(shift)
    })

    // Find operators with multiple shifts on same day
    const multipleShifts: Array<{ key: string; count: number; shifts: Shift[] }> = []
    groupedByOperatorDate.forEach((shifts, key) => {
      if (shifts.length > 1) {
        multipleShifts.push({ key, count: shifts.length, shifts })
      }
    })

    if (multipleShifts.length > 0) {
      console.log('[ShiftBoard Debug] ✅ Found multiple shifts per day from backend:', multipleShifts)
    } else {
      console.log('[ShiftBoard Debug] ❌ NO multiple shifts per day in backend response')
      console.log('[ShiftBoard Debug] → This suggests the backend is filtering or deduplicating shifts')
    }
  }, [shiftsData, currentWeek])

  // Debug 2: Check if shifts survive filtering
  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    setCurrentWeek(startOfWeek)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const shift = shifts.find(s => s.id === active.id)
    setDraggedShift(shift || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const shift = shifts.find(s => s.id === active.id)
      const targetData = over.data.current

      if (shift && targetData) {
        const { operatorId, dayOfWeek } = targetData
        const targetSlot = shiftsByOperator[operatorId]?.[dayOfWeek]
        const isDraftShift = Boolean((shift as any)?.isDraft)
        const targetDayEntry = weekDays.find(day => day.dayOfWeek === dayOfWeek)
        const targetDateISO = targetDayEntry?.date?.toISOString()
        const operatorInfo = operatorDirectory.find(op => op.id === operatorId)

        if (isDraftShift) {
          if (
            targetSlot &&
            !(shift.operatorId === operatorId && shift.dayOfWeek === dayOfWeek)
          ) {
            toast.error('This slot already has a shift')
          } else if (!targetDateISO) {
            toast.error('Unable to determine the target date for this shift')
          } else {
            updateDraft(shift.id, {
              operatorId,
              dayOfWeek,
              shiftDate: targetDateISO,
              updatedAt: new Date().toISOString(),
              operator: operatorInfo
                ? {
                  id: operatorInfo.id,
                  firstName: operatorInfo.firstName,
                  lastName: operatorInfo.lastName,
                  email: operatorInfo.email,
                  phone: operatorInfo.phone
                }
                : (shift.operator as any),
            })
          }
        } else {
          // Check if target cell is empty
          if (!targetSlot) {
            updateShiftMutation.mutate({
              id: shift.id,
              data: { operatorId, dayOfWeek }
            })
          } else {
            toast.error('This slot is already occupied')
          }
        }
      }
    }

    setDraggedShift(null)
  }

  // Cell interaction handlers
  const handleCellClick = (operatorId: string, dayOfWeek: number, date: Date) => {
    // When clicking a cell with multiple shifts, just open create modal
    // Individual shifts will be edited via their own click handlers
    setSelectedCell({ operatorId, dayOfWeek, date: date.toISOString() })
    setIsCreateModalOpen(true)
  }

  const handleEditShiftDirect = (shift: Shift) => {
    // Draft shifts can be edited directly without warnings
    if ((shift as any)?.isDraft) {
      // For drafts, we could open edit form or handle differently
      // For now, just open the form
      setEditShift(shift)
      setIsCreateFormOpen(true)
      return
    }

    // Check if shift is checked in before editing
    if (shift.isCheckedIn) {
      setPendingEditShift(shift)
      setShowEditWarning(true)
    } else {
      setEditShift(shift)
      setIsCreateFormOpen(true)
    }
  }

  const handleDeleteShiftDirect = (shift: Shift) => {
    handleDeleteShift(shift.id)
  }

  const handleConfirmEdit = () => {
    if (pendingEditShift) {
      setEditShift(pendingEditShift)
      setIsCreateFormOpen(true)
    }
    setShowEditWarning(false)
    setPendingEditShift(null)
  }

  const handleCancelEdit = () => {
    setShowEditWarning(false)
    setPendingEditShift(null)
  }

  const handleCreateShift = () => {
    setEditShift(null)
    setIsCreateFormOpen(true)
  }

  const handleDeleteShift = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId)
    if (shift) {
      if (editShift?.id === shift.id) {
        setIsCreateFormOpen(false)
        setEditShift(null)
      }
      if ((shift as any)?.isDraft) {
        deleteDraft(shift.id)
        toast.success('Draft shift removed')
        return
      }
      // Check if shift is checked in before deleting
      if (shift.isCheckedIn) {
        setPendingDeleteShift(shift)
        setShowDeleteWarning(true)
      } else {
        setShiftToDelete(shift)
        setIsDeleteModalOpen(true)
      }
    }
  }

  const handleConfirmDelete = () => {
    if (pendingDeleteShift) {
      // Safety check: drafts should not get here, but handle just in case
      if ((pendingDeleteShift as any)?.isDraft) {
        deleteDraft(pendingDeleteShift.id)
        toast.success('Draft shift removed')
      } else {
        setShiftToDelete(pendingDeleteShift)
        setIsDeleteModalOpen(true)
      }
    }
    setShowDeleteWarning(false)
    setPendingDeleteShift(null)
  }

  const handleCancelDelete = () => {
    setShowDeleteWarning(false)
    setPendingDeleteShift(null)
  }

  const handleSuccess = () => {
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
  }

  // Handlers for admin actions
  const handleShowShiftDetails = (report: ShiftReport) => {
    // Find the corresponding shift
    const correspondingShift = shifts.find((shift: Shift) => shift.id === report.operatorShiftId)
    setSelectedShiftForDetails({ report, shift: correspondingShift || null })
    setShowShiftDetailsModal(true)
  }

  const handleForceCheckout = (report: ShiftReport) => {
    setSelectedReportForCheckout(report)
    setShowForceCheckoutModal(true)
    setForceCheckoutComments('')
    setForceCheckoutMeterReading('')
  }

  const handleForceCheckoutFromDetails = () => {
    if (selectedShiftForDetails) {
      setShowShiftDetailsModal(false)
      handleForceCheckout(selectedShiftForDetails.report)
    }
  }

  const handleConfirmForceCheckout = () => {
    if (!selectedReportForCheckout) return

    const data: any = {}
    if (forceCheckoutComments) data.comments = forceCheckoutComments
    if (forceCheckoutMeterReading) {
      const reading = parseFloat(forceCheckoutMeterReading)
      if (!isNaN(reading)) {
        data.checkOutMeterReading = reading
      }
    }

    forceCheckoutMutation.mutate({
      reportId: selectedReportForCheckout.id,
      data: Object.keys(data).length > 0 ? data : undefined
    })
  }

  const handleConfirmForceCheckIn = () => {
    if (!selectedShiftForCheckIn) return
    const data: ForceCheckInData = {}
    if (forceCheckInComments) data.comments = forceCheckInComments
    forceCheckInMutation.mutate({
      operatorShiftId: selectedShiftForCheckIn.id,
      data: Object.keys(data).length > 0 ? data : undefined
    })
  }

  const handleDeletePastShifts = () => {
    deletePastShiftsMutation.mutate()
  }

  // Loading state
  if (shiftsLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-4 px-4 sm:px-6 border-b shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shift Board</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage operator schedules and assignments</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" onClick={goToCurrentWeek} className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Today</span>
            <span className="xs:hidden">Today</span>
          </Button>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreateShift} className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Create Shift</span>
            <span className="sm:hidden">Create</span>
          </Button>

          {/* Draft Mode Toggle */}
          <Button
            variant={isDraftMode ? "default" : "outline"}
            onClick={toggleDraftMode}
            className={`text-xs sm:text-sm ${isDraftMode ? 'bg-amber-500 hover:bg-amber-600 border-amber-600' : ''}`}
          >
            <FileEdit className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {isDraftMode ? 'Draft Mode' : 'Edit Drafts'}
            </span>
            <span className="sm:hidden">Drafts</span>
            {getDraftCount() > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white text-amber-700 text-xs">
                {getDraftCount()}
              </Badge>
            )}
          </Button>

          {/* Draft Mode Actions */}
          {isDraftMode && getDraftCount() > 0 && (
            <>
              <Button
                variant="default"
                onClick={() => setShowPublishModal(true)}
                className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
              >
                <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Publish</span>
                <span className="sm:hidden">Publish</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all drafts? This cannot be undone.')) {
                    clearAllDrafts()
                    toast.success('All drafts cleared')
                  }
                }}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Clear Drafts</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </>
          )}

          {/* Admin Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <Settings className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Admin Actions</span>
                <span className="sm:hidden">Admin</span>
                {activeShiftReports.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 text-xs">
                    {activeShiftReports.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {activeShiftReports.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                    Active Shifts ({activeShiftReports.length})
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {activeShiftReports.map((report: ShiftReport) => {
                      const operator = report.operator
                      const operatorName = operator
                        ? `${operator.firstName || ''} ${operator.lastName || ''}`.trim()
                        : 'Unknown Operator'
                      const correspondingShift = shifts.find((shift: Shift) => shift.id === report.operatorShiftId)
                      const checkInDate = report.checkInTime ? new Date(report.checkInTime) : null

                      return (
                        <div key={report.id} className="px-2 py-1">
                          <DropdownMenuItem
                            onClick={() => handleShowShiftDetails(report)}
                            className="text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Power className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{operatorName}</div>
                                  {checkInDate && (
                                    <div className="text-xs text-gray-500">
                                      Checked in: {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                            </div>
                          </DropdownMenuItem>
                        </div>
                      )
                    })}
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setSelectedShiftForCheckIn(null)
                  setForceCheckInComments('')
                  setCheckInSearch('')
                  setShowForceCheckInModal(true)
                }}
                className="text-green-700 focus:text-green-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Force Check-in Operator
                {notCheckedInShifts.length > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                    {notCheckedInShifts.length}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowPastShiftsPreview(true)}
                className="text-orange-600 focus:text-orange-600"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Past Shifts
                {pastShifts.length > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700">
                    {pastShifts.length}
                  </Badge>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Draft Mode Banner */}
      {isDraftMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-amber-800">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              <span className="text-sm font-medium">
                Draft Mode Active - Changes will be saved locally
                {getDraftCount() > 0 && ` (${getDraftCount()} draft${getDraftCount() === 1 ? '' : 's'})`}
              </span>
            </div>
            {getDraftCount() > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white text-amber-700">
                  {getDraftCount()} draft{getDraftCount() === 1 ? '' : 's'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-800 hover:bg-amber-100"
                  onClick={() => {
                    if (confirm('Clear all draft shifts? This cannot be undone.')) {
                      clearAllDrafts()
                      toast.success('Draft schedule cleared')
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Draft Schedule
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-center px-4 sm:px-6 pt-4">
        {/* Search Bar */}
        <div className="relative w-full lg:flex-1 flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden h-10">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full"
          />
          <div className="h-full w-px bg-gray-200 mx-2" />
          <Button
            variant="ghost"
            size="icon"
            className="h-full rounded-none"
            onClick={() => {/* Search action if needed */ }}
          >
            <Search className="h-5 w-5 text-orange-500" />
          </Button>
        </div>

        {/* Station Selection */}
        <div className="relative w-full lg:w-[250px]">
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="bg-white rounded-lg border border-gray-200 h-10 w-full">
              <SelectValue placeholder="All Stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {uniqueStations.map((station) => (
                <SelectItem key={station} value={station}>
                  {station}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div className="relative w-full lg:w-[200px]">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 h-10 px-3">
            <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <Input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-sm"
              placeholder="Filter by date"
            />
            {selectedDateFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setSelectedDateFilter('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Shifts Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            Active shifts only
          </label>
          <button
            type="button"
            onClick={() => setShowActiveOnly((prev) => !prev)}
            aria-pressed={showActiveOnly}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${showActiveOnly ? 'bg-green-600' : 'bg-gray-300'
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${showActiveOnly ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {/* Duplicate Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-between sm:justify-end">
          <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            Show only duplicate shifts
          </label>
          <button
            type="button"
            onClick={() => setShowOnlyDuplicates((prev) => !prev)}
            aria-pressed={showOnlyDuplicates}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${showOnlyDuplicates ? 'bg-blue-600' : 'bg-gray-300'
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${showOnlyDuplicates ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {/* Date Display */}
        <div className="w-full lg:w-auto">
          <div className={`bg-white rounded-lg border px-3 sm:px-4 py-2 h-10 flex items-center ${selectedDateFilter ? 'border-blue-500 bg-blue-50' : ''}`}>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
              {selectedDateFilter ? (
                <>
                  <span className="hidden sm:inline">
                    {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="sm:hidden">
                    {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {weekDays[0].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDays[weekDays.length - 1].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="sm:hidden">
                    {weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[weekDays.length - 1].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="block md:hidden space-y-3 px-4 sm:px-6 pb-6">
        {filteredOperators.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <p className="text-lg font-medium">No operators found</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Try adjusting your search' : 'No operators match the current filter'}
              </p>
            </CardContent>
          </Card>
        ) : filteredShifts.length === 0 && selectedDateFilter ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No shifts found for this date</p>
              <p className="text-sm mt-2">
                No operators had shifts on {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSelectedDateFilter('')}
              >
                Clear Date Filter
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOperators.map((operator) => {
            const operatorShifts = shiftsByOperator[operator.id] || {}
            return (
              <Card key={operator.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage
                        src={operator.imageUrl || operator.avatar || operator.profilePicture || operator.picture}
                        alt={`${operator.lastName || 'Operator'}, ${operator.firstName || 'Unknown'}`}
                      />
                      <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-600">
                        {operator.firstName?.charAt(0) || ''}{operator.lastName?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate text-sm">
                        {operator.lastName || 'Operator'}, {operator.firstName || 'Unknown'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{operator.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {weekDays.map((day) => {
                      const shifts = operatorShifts[day.dayOfWeek] || []
                      const hasShifts = shifts.length > 0
                      return (
                        <div
                          key={day.dayOfWeek}
                          className={`p-3 rounded-lg border transition-all ${hasShifts
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                            }`}
                          onClick={!hasShifts ? () => handleCellClick(operator.id, day.dayOfWeek, day.date) : undefined}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-600">
                                {day.dayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {day.dayNumber} {day.month}
                              </span>
                            </div>
                            {hasShifts && (
                              <Badge variant="secondary" className="text-xs">
                                {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'}
                              </Badge>
                            )}
                          </div>
                          {hasShifts ? (
                            <div className="space-y-1.5">
                              {shifts.map((shift) => {
                                const isCheckedIn = shift.isCheckedIn || false
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={() => handleEditShiftDirect(shift)}
                                    className={`p-2 rounded border cursor-pointer transition-all ${isCheckedIn
                                      ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                      : 'bg-white border-blue-200 hover:bg-blue-50'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          {shift.startTime && shift.endTime ? (
                                            <>
                                              <Clock className={`h-3 w-3 flex-shrink-0 ${isCheckedIn ? 'text-green-600' : 'text-blue-600'}`} />
                                              <span className={`text-sm font-medium ${isCheckedIn ? 'text-green-700' : 'text-blue-700'}`}>
                                                {shift.startTime} - {shift.endTime}
                                              </span>
                                            </>
                                          ) : (
                                            <span className={`text-xs italic ${isCheckedIn ? 'text-green-600' : 'text-blue-600'}`}>
                                              Flexible
                                            </span>
                                          )}
                                        </div>
                                        {shift.charger?.name && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                            <span className="text-xs text-gray-600 truncate">
                                              {shift.charger.name}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteShift(shift.id)
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1 text-xs"
                                onClick={() => handleCellClick(operator.id, day.dayOfWeek, day.date)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Shift
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="text-xs text-gray-400">No shift</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Desktop View - Grid Layout */}
      <div className="hidden md:block flex-1 px-4 sm:px-6 pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Card className="overflow-hidden shadow-lg border-0 h-full">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="overflow-x-auto flex-1">
                <div className="grid grid-cols-8 gap-0 min-w-full">
                  {/* Sticky Header Row */}
                  <div className="sticky top-0 z-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-3 sm:p-6 border-r border-blue-500 relative overflow-hidden min-w-[120px]">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">

                    </div>
                    <div className="relative z-10 flex items-center justify-center h-full">
                      <span className="font-bold text-white text-sm sm:text-lg">Operators</span>
                    </div>
                  </div>

                  {weekDays.map((day, index) => (
                    <div key={day.dayOfWeek} className="sticky top-0 z-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 p-2 sm:p-4 border-b border-r border-gray-200 text-center relative overflow-hidden hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 min-w-[100px]">
                      {/* Subtle background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `linear-gradient(45deg, #3b82f6 25%, transparent 25%), linear-gradient(-45deg, #3b82f6 25%, transparent 25%)`,
                          backgroundSize: '8px 8px'
                        }}></div>
                      </div>
                      <div className="relative z-10">
                        <div className="text-center">
                          {/* Day of week - top right */}
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            {day.dayName.toUpperCase()}
                          </div>
                          {/* Main day number - large and prominent */}
                          <div className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">
                            {day.dayNumber}
                          </div>
                          {/* Month - bottom */}
                          <div className="text-xs text-blue-600 font-medium">
                            {day.month}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Scrollable Operator Rows Container */}
                  <div className="col-span-8 flex-1">
                    <div className="overflow-y-auto h-full" style={{ height: 'calc(100vh - 300px)' }}>
                      <div className="grid grid-cols-8 gap-0 min-w-[800px] sm:min-w-full">
                        {/* Operator Rows */}
                        {filteredOperators.length === 0 ? (
                          <div className="col-span-8 text-center py-12 text-gray-500">
                            <p className="text-lg font-medium">No operators found</p>
                            <p className="text-sm mt-2">
                              {searchTerm ? 'Try adjusting your search' : 'No operators match the current filter'}
                            </p>
                          </div>
                        ) : filteredShifts.length === 0 && selectedDateFilter ? (
                          <div className="col-span-8 text-center py-12 text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium">No shifts found for this date</p>
                            <p className="text-sm mt-2">
                              No operators had shifts on {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => setSelectedDateFilter('')}
                            >
                              Clear Date Filter
                            </Button>
                          </div>
                        ) : (
                          <SortableContext items={filteredOperators.map(op => op.id)} strategy={verticalListSortingStrategy}>
                            {filteredOperators.map((operator) => (
                              <OperatorRow
                                key={operator.id}
                                operator={operator}
                                weekDays={weekDays}
                                shiftsByOperator={shiftsByOperator}
                                onCellClick={handleCellClick}
                                onEditShift={handleEditShiftDirect}
                                onDeleteShift={(shift) => handleDeleteShift(shift.id)}
                                overlappingMeta={overlappingShiftMeta}
                              />
                            ))}
                          </SortableContext>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drag Overlay */}
          <DragOverlay>
            {draggedShift ? (
              <div className="bg-blue-500 text-white p-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                  {/* Operator Avatar */}
                  {(() => {
                    const operator = filteredOperators.find(op => op.id === draggedShift.operatorId) || operators.find(op => op.id === draggedShift.operatorId)
                    if (operator) {
                      const initials = `${operator.firstName?.charAt(0) || ''}${operator.lastName?.charAt(0) || ''}`.toUpperCase() || 'OP'
                      const getRandomColor = (initials: string) => {
                        const colors = [
                          'bg-blue-100 text-blue-600',
                          'bg-green-100 text-green-600',
                          'bg-purple-100 text-purple-600',
                          'bg-orange-100 text-orange-600',
                          'bg-pink-100 text-pink-600',
                          'bg-indigo-100 text-indigo-600',
                          'bg-teal-100 text-teal-600',
                          'bg-red-100 text-red-600',
                        ]
                        const index = initials.charCodeAt(0) % colors.length
                        return colors[index]
                      }
                      const colorClass = getRandomColor(initials)

                      return (
                        <Avatar className="w-6 h-6">
                          <AvatarImage
                            src={operator.imageUrl || operator.avatar || operator.profilePicture || operator.picture}
                            alt={`${operator.firstName || 'Unknown'} ${operator.lastName || 'Operator'}`}
                          />
                          <AvatarFallback className={`text-xs font-semibold ${colorClass}`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      )
                    }
                    return null
                  })()}

                  {/* Shift Time */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {draggedShift.startTime && draggedShift.endTime
                        ? `${draggedShift.startTime} - ${draggedShift.endTime}`
                        : 'Flexible Shift'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Quick Create Modal */}
      <CreateShiftModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setSelectedCell(null)
        }}
        selectedCell={selectedCell}
        operators={searchTerm || selectedStation !== 'all' ? operators : filteredOperators}
        onCreateSuccess={() => {
          setIsCreateModalOpen(false)
          setSelectedCell(null)
        }}
        isDraftMode={isDraftMode}
        onCreateShift={handleShiftCreate}
      />

      {/* Full Create/Edit Form */}
      <CreateShiftForm
        isOpen={isCreateFormOpen}
        onClose={() => {
          setIsCreateFormOpen(false)
          setEditShift(null)
        }}
        onSuccess={handleSuccess}
        editShift={editShift}
        isDraftMode={isDraftMode}
        onCreateShift={handleShiftCreate}
        onDeleteShift={(shift) => handleDeleteShift(shift.id)}
      />

      {/* Protection Warning Modals */}
      <EditWarningModal
        isOpen={showEditWarning}
        shift={pendingEditShift}
        onCancel={handleCancelEdit}
        onConfirm={handleConfirmEdit}
      />

      <DeleteWarningModal
        isOpen={showDeleteWarning}
        shift={pendingDeleteShift}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <PublishDraftsModal
        isOpen={showPublishModal}
        drafts={drafts}
        operators={operators}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublishDrafts}
      />

      {/* Shift Details Modal */}
      <Dialog open={showShiftDetailsModal} onOpenChange={setShowShiftDetailsModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-green-600" />
              Active Shift Details
            </DialogTitle>
            <DialogDescription>
              Review shift information before force checkout
            </DialogDescription>
          </DialogHeader>

          {selectedShiftForDetails && (
            <div className="py-4 space-y-4">
              {/* Operator Information */}
              {selectedShiftForDetails.report.operator && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold mb-3">
                    <UserIcon className="h-4 w-4" />
                    Operator Information
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Name:</span>
                      <span>
                        {selectedShiftForDetails.report.operator.firstName} {selectedShiftForDetails.report.operator.lastName}
                      </span>
                    </div>
                    {selectedShiftForDetails.report.operator.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{selectedShiftForDetails.report.operator.email}</span>
                      </div>
                    )}
                    {selectedShiftForDetails.report.operator.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{selectedShiftForDetails.report.operator.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shift Information */}
              {selectedShiftForDetails.shift && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-900 font-semibold mb-3">
                    <Calendar className="h-4 w-4" />
                    Shift Information
                  </div>
                  <div className="space-y-2 text-sm">
                    {selectedShiftForDetails.shift.shiftDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {(() => {
                            const shiftDate = new Date(selectedShiftForDetails.shift!.shiftDate)
                            const dayName = daysOfWeek.find(day => day.value === selectedShiftForDetails.shift!.dayOfWeek)?.label || 'Unknown'
                            return `${dayName}, ${shiftDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}`
                          })()}
                        </div>
                      </div>
                    )}
                    {(selectedShiftForDetails.shift.startTime || selectedShiftForDetails.shift.endTime) ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="font-medium">Time:</span>{' '}
                          {selectedShiftForDetails.shift.startTime && selectedShiftForDetails.shift.endTime
                            ? `${selectedShiftForDetails.shift.startTime} - ${selectedShiftForDetails.shift.endTime}`
                            : 'Flexible Schedule'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="italic text-gray-600">Flexible Schedule</span>
                      </div>
                    )}
                    {selectedShiftForDetails.shift.charger && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="font-medium">Charger:</span>{' '}
                          {selectedShiftForDetails.shift.charger.name}
                        </div>
                      </div>
                    )}
                    {selectedShiftForDetails.shift.isLastShift && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Last Shift of Day
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Check-in Information */}
              {selectedShiftForDetails.report.checkInTime && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-900 font-semibold mb-3">
                    <Clock className="h-4 w-4" />
                    Check-in Information
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="font-medium">Checked in:</span>{' '}
                        {new Date(selectedShiftForDetails.report.checkInTime).toLocaleString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {selectedShiftForDetails.report.checkInMeterReading && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Check-in Meter Reading:</span>
                        <span>{selectedShiftForDetails.report.checkInMeterReading}</span>
                      </div>
                    )}
                    {selectedShiftForDetails.report.checkInLatitude && selectedShiftForDetails.report.checkInLongitude && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>
                          Location: {parseFloat(selectedShiftForDetails.report.checkInLatitude).toFixed(6)}, {parseFloat(selectedShiftForDetails.report.checkInLongitude).toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duration Information */}
              {selectedShiftForDetails.report.checkInTime && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold mb-2">
                    <Clock className="h-4 w-4" />
                    Shift Duration
                  </div>
                  <div className="text-sm">
                    {(() => {
                      const checkInTime = new Date(selectedShiftForDetails.report.checkInTime)
                      const now = new Date()
                      const durationMs = now.getTime() - checkInTime.getTime()
                      const hours = Math.floor(durationMs / (1000 * 60 * 60))
                      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
                      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowShiftDetailsModal(false)
              setSelectedShiftForDetails(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleForceCheckoutFromDetails}
              className="bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Force Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Checkout Modal */}
      <Dialog open={showForceCheckoutModal} onOpenChange={setShowForceCheckoutModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <LogOut className="h-5 w-5" />
              Force Checkout Operator
            </DialogTitle>
            <DialogDescription>
              Force checkout an operator from their active shift. This action will complete their shift report.
            </DialogDescription>
          </DialogHeader>

          {selectedReportForCheckout && (
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Operator Information
                </div>
                {selectedReportForCheckout.operator && (
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-amber-600" />
                      <span>
                        {selectedReportForCheckout.operator.firstName} {selectedReportForCheckout.operator.lastName}
                      </span>
                    </div>
                    {selectedReportForCheckout.operator.email && (
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-amber-600" />
                        <span>{selectedReportForCheckout.operator.email}</span>
                      </div>
                    )}
                  </div>
                )}
                {selectedReportForCheckout.checkInTime && (
                  <div className="text-sm text-gray-700 mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>
                        Checked in: {new Date(selectedReportForCheckout.checkInTime).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="comments" className="text-sm font-medium">
                    Comments (Optional)
                  </Label>
                  <Input
                    id="comments"
                    value={forceCheckoutComments}
                    onChange={(e) => setForceCheckoutComments(e.target.value)}
                    placeholder="e.g., Operator forgot to checkout"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="meterReading" className="text-sm font-medium">
                    Checkout Meter Reading (Optional)
                  </Label>
                  <Input
                    id="meterReading"
                    type="number"
                    step="0.01"
                    value={forceCheckoutMeterReading}
                    onChange={(e) => setForceCheckoutMeterReading(e.target.value)}
                    placeholder="Enter final meter reading"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-semibold mb-1">Note:</p>
                <p>This will automatically calculate all shift metrics (sessions, energy, duration) and complete the shift report.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowForceCheckoutModal(false)
              setSelectedReportForCheckout(null)
              setForceCheckoutComments('')
              setForceCheckoutMeterReading('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmForceCheckout}
              disabled={forceCheckoutMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {forceCheckoutMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Checking Out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Force Checkout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Check-in Modal */}
      <Dialog open={showForceCheckInModal} onOpenChange={setShowForceCheckInModal}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <LogIn className="h-5 w-5" />
              Force Check-in Operator
            </DialogTitle>
            <DialogDescription>
              Check an operator in on their behalf. Pick the shift to start its report now.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 overflow-y-auto">
            <Input
              placeholder="Search by operator or station…"
              value={checkInSearch}
              onChange={(e) => setCheckInSearch(e.target.value)}
            />

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {notCheckedInShifts.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No assigned operators are waiting to be checked in this week.
                </p>
              )}
              {notCheckedInShifts
                .filter((shift: Shift) => {
                  const q = checkInSearch.trim().toLowerCase()
                  if (!q) return true
                  const op = shift.operator
                  const name = op ? `${op.firstName || ''} ${op.lastName || ''}`.toLowerCase() : ''
                  const station = shift.charger?.name?.toLowerCase() || ''
                  return name.includes(q) || station.includes(q)
                })
                .map((shift: Shift) => {
                  const op = shift.operator
                  const operatorName = op ? `${op.firstName || ''} ${op.lastName || ''}`.trim() : 'Unknown operator'
                  const isSelected = selectedShiftForCheckIn?.id === shift.id
                  const shiftDay = shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
                  const timeRange = shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : ''
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShiftForCheckIn(shift)}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="font-medium truncate">{operatorName}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        {shift.charger?.name && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{shift.charger.name}</span>
                        )}
                        {shiftDay && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{shiftDay}</span>}
                        {timeRange && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeRange}</span>}
                      </div>
                    </button>
                  )
                })}
            </div>

            <div>
              <Label htmlFor="checkInComments" className="text-sm font-medium">
                Comments (Optional)
              </Label>
              <Input
                id="checkInComments"
                value={forceCheckInComments}
                onChange={(e) => setForceCheckInComments(e.target.value)}
                placeholder="e.g., Operator on site, phone died"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowForceCheckInModal(false)
              setSelectedShiftForCheckIn(null)
              setForceCheckInComments('')
              setCheckInSearch('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmForceCheckIn}
              disabled={!selectedShiftForCheckIn || forceCheckInMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {forceCheckInMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Checking In...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Force Check-in
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Past Shifts Preview Modal */}
      <Dialog open={showPastShiftsPreview} onOpenChange={setShowPastShiftsPreview}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Past Shifts Preview
            </DialogTitle>
            <DialogDescription>
              Review the shifts that will be deleted. Only shifts where the shift date is before today will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {pastShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">No past shifts found</p>
                <p className="text-sm text-gray-500 mt-2">
                  All shifts are from today or future dates.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-900">
                        {pastShifts.length} past shift{pastShifts.length === 1 ? '' : 's'} will be deleted
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {pastShifts.length}
                    </Badge>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                  <div className="divide-y">
                    {pastShifts.map((shift: Shift) => {
                      const shiftDate = new Date(shift.shiftDate)
                      const dayName = daysOfWeek.find(day => day.value === shift.dayOfWeek)?.label || 'Unknown'

                      return (
                        <div key={shift.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900">
                                  {dayName}, {shiftDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>

                              {shift.startTime && shift.endTime ? (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-500 italic">Flexible Schedule</span>
                                </div>
                              )}

                              {shift.operator && (
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">
                                    {shift.operator.firstName} {shift.operator.lastName}
                                  </span>
                                  {shift.operator.email && (
                                    <span className="text-xs text-gray-500">
                                      ({shift.operator.email})
                                    </span>
                                  )}
                                </div>
                              )}

                              {shift.charger && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">
                                    {shift.charger.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {shift.isLastShift && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Last Shift
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will perform a soft delete (mark as <code className="bg-blue-100 px-1 rounded">isActive: false</code>), not a permanent deletion.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPastShiftsPreview(false)}>
              Cancel
            </Button>
            {pastShifts.length > 0 && (
              <Button
                onClick={() => {
                  setShowPastShiftsPreview(false)
                  setShowDeletePastShiftsModal(true)
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Trash className="h-4 w-4 mr-2" />
                Proceed to Delete ({pastShifts.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Past Shifts Confirmation Modal */}
      <Dialog open={showDeletePastShiftsModal} onOpenChange={setShowDeletePastShiftsModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              Confirm Delete Past Shifts
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {pastShifts.length} past shift{pastShifts.length === 1 ? '' : 's'}?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-bold">Final Confirmation</span>
              </div>

              <div className="text-sm text-red-800 space-y-2">
                <p>This action will:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Soft delete <strong>{pastShifts.length} shift{pastShifts.length === 1 ? '' : 's'}</strong> where <code className="bg-red-100 px-1 rounded">shiftDate &lt; today</code></li>
                  <li>Mark shifts as <code className="bg-red-100 px-1 rounded">isActive: false</code></li>
                  <li>NOT delete shifts from today or future dates</li>
                  <li>NOT permanently delete shifts (soft delete only)</li>
                </ul>
              </div>

              <div className="bg-white border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> This operation is safe to run multiple times (idempotent). Only past shifts will be affected.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePastShiftsModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeletePastShifts}
              disabled={deletePastShiftsMutation.isPending}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePastShiftsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Past Shifts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Shift
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {shiftToDelete && (
            <div className="py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {daysOfWeek.find(day => day.value === shiftToDelete.dayOfWeek)?.label}
                  </span>
                </div>
                {shiftToDelete.startTime && shiftToDelete.endTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {shiftToDelete.startTime} - {shiftToDelete.endTime}
                    </span>
                  </div>
                )}
                {!shiftToDelete.startTime && !shiftToDelete.endTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Flexible Schedule</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setShiftToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (shiftToDelete) {
                  // Safety check: Never try to delete drafts from database
                  if ((shiftToDelete as any)?.isDraft) {
                    deleteDraft(shiftToDelete.id)
                    toast.success('Draft shift removed')
                  } else {
                    deleteShiftMutation.mutate(shiftToDelete.id)
                  }
                  setIsDeleteModalOpen(false)
                  setShiftToDelete(null)
                }
              }}
              disabled={deleteShiftMutation.isPending}
            >
              {deleteShiftMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
