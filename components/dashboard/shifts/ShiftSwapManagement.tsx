/*
'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Send,
  Inbox,
  History,
  CheckCircle,
  XCircle,
  Calendar,
  Search,
  Filter
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ShiftSwapRequestForm } from './ShiftSwapRequestForm'
import { PendingSwapRequests } from './PendingSwapRequests'
import {
  getAllSwapRequests,
  type ShiftSwap,
  getShiftSwapStatusColor,
  formatTimeTo12Hour,
  getDayName,
} from '@/lib/api/shiftsAndInspections'

interface ShiftSwapManagementProps {
  className?: string
}

export function ShiftSwapManagement({ className }: ShiftSwapManagementProps) {
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [hasError, setHasError] = useState(false)
  const queryClient = useQueryClient()

  // Error boundary effect
  React.useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleError)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleError)
    }
  }, [])

  // If there's an error, show a fallback UI instead of crashing
  if (hasError) {
    return (
      <div className={className}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Something went wrong
            </h3>
            <p className="text-red-600 mb-4">
              There was an error loading the shift swap management. Please try refreshing the page.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setHasError(false)
                window.location.reload()
              }}
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch all shift swaps with proper categorization and fallback
  const { data: swapData, isLoading: swapsLoading, error: swapsError, refetch } = useQuery({
    queryKey: ['allShiftSwaps'],
    queryFn: async () => {
      try {
        return await getAllSwapRequests()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error fetching shift swaps'
        console.warn('getAllSwapRequests failed:', message)
        throw error instanceof Error ? error : new Error(message)
      }
    },
    retry: 1, // Reduce retries to fail faster
    refetchOnWindowFocus: false, // Reduce unnecessary requests
    staleTime: 30000, // 30 seconds
  })

  const sentSwaps = swapData?.sent || []
  const receivedSwaps = swapData?.received || []
  const allSwaps = swapData?.all || []

  // Filter swaps based on search and status
  const filterSwaps = (swaps: ShiftSwap[]) => {
    return swaps.filter(swap => {
      const matchesSearch = !searchQuery ||
        getDayName(swap.dayOfWeek).toLowerCase().includes(searchQuery.toLowerCase()) ||
        swap.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        swap.operator?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        swap.targetOperator?.name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || swap.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }

  // Categorize swaps for stats
  const pendingSwaps = receivedSwaps.filter(swap => swap.status === 'PENDING')
  const approvedSwaps = allSwaps.filter(swap => swap.status === 'APPROVED')
  const rejectedSwaps = allSwaps.filter(swap => swap.status === 'REJECTED')
  const cancelledSwaps = allSwaps.filter(swap => swap.status === 'CANCELLED')

  const handleRequestSuccess = () => {
    setShowRequestForm(false)
    setActiveTab('pending')
    // Refresh all related queries
    queryClient.invalidateQueries({ queryKey: ['allShiftSwaps'] })
    queryClient.invalidateQueries({ queryKey: ['pendingShiftSwaps'] })
    queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['allShiftSwaps'] })
    queryClient.invalidateQueries({ queryKey: ['pendingShiftSwaps'] })
    queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
    refetch()
  }

  return (
    <div className={className}>
     
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Shift Swaps</h2>
          <p className="text-muted-foreground">
            Manage shift swap requests and view swap history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={swapsLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${swapsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowRequestForm(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Swap
          </Button>
        </div>
      </div>

     
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {swapsLoading ? '...' : pendingSwaps.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {swapsLoading ? '...' : approvedSwaps.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {swapsLoading ? '...' : rejectedSwaps.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Declined requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {swapsLoading ? '...' : allSwaps.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All time requests
            </p>
          </CardContent>
        </Card>
      </div>

  
      {swapsError && !swapData && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Limited functionality</span>
            </div>
            <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">
              Some shift swap features may not be available. You can still view your shifts in the "My Shifts" tab.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by day, reason, or operator name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

    
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-1 text-xs sm:text-sm">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
            {pendingSwaps.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingSwaps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-1 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Sent</span>
            <span className="sm:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-1 text-xs sm:text-sm">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Received</span>
            <span className="sm:hidden">In</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">All History</span>
            <span className="sm:hidden">All</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingSwapRequests />
        </TabsContent>

        <TabsContent value="sent">
          <SwapHistory
            swaps={filterSwaps(sentSwaps)}
            title="Requests I Made"
            emptyMessage="You haven't sent any swap requests yet."
            isLoading={swapsLoading}
            error={swapsError}
            showRequestType="sent"
          />
        </TabsContent>

        <TabsContent value="received">
          <SwapHistory
            swaps={filterSwaps(receivedSwaps)}
            title="Requests I Received"
            emptyMessage="You haven't received any swap requests yet."
            isLoading={swapsLoading}
            error={swapsError}
            showRequestType="received"
          />
        </TabsContent>

        <TabsContent value="history">
          <SwapHistory
            swaps={filterSwaps(allSwaps)}
            title="Complete Swap History"
            emptyMessage="No swap requests found."
            isLoading={swapsLoading}
            error={swapsError}
            showRequestType="all"
          />
        </TabsContent>
      </Tabs>

      
      <ShiftSwapRequestForm
        open={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  )
}

// Swap History Component
interface SwapHistoryProps {
  swaps: ShiftSwap[]
  title: string
  emptyMessage: string
  isLoading: boolean
  error?: Error | null
  showRequestType: 'sent' | 'received' | 'all'
}

function SwapHistory({ swaps, title, emptyMessage, isLoading, error, showRequestType }: SwapHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p>Loading swap history...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium mb-2 text-red-800">Error Loading History</h3>
          <p className="text-red-600 mb-2">{error.message}</p>
          <p className="text-sm text-gray-500">Please try refreshing the page.</p>
        </CardContent>
      </Card>
    )
  }

  if (swaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No History Found</h3>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  const getOperatorName = (swap: ShiftSwap, currentUserId?: string) => {
    // For sent requests, show the target operator
    if (showRequestType === 'sent') {
      return swap.targetOperator?.name || 'Unknown Operator'
    }
    // For received requests, show the requesting operator
    if (showRequestType === 'received') {
      return swap.operator?.name || 'Unknown Operator'
    }
    // For all history, show the other party based on the relationship
    return swap.operator?.name || swap.targetOperator?.name || 'Unknown Operator'
  }

  const getRequestLabel = (swap: ShiftSwap) => {
    if (showRequestType === 'sent') {
      return `Requested from ${getOperatorName(swap)}`
    }
    if (showRequestType === 'received') {
      return `Request from ${getOperatorName(swap)}`
    }
    return `With ${getOperatorName(swap)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <Badge variant="outline">{swaps.length} request{swaps.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="space-y-4">
        {swaps.map((swap) => (
          <Card key={swap.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getShiftSwapStatusColor(swap.status)}>
                      {swap.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(swap.createdAt).toLocaleDateString()}
                    </span>
                    {swap.approvedAt && (
                      <span className="text-xs text-green-600">
                        ✓ Approved {new Date(swap.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                 
                  <div>
                    <h4 className="font-medium text-base">
                      {getDayName(swap.dayOfWeek)} - {formatTimeTo12Hour(swap.startTime)} to {formatTimeTo12Hour(swap.endTime)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {getRequestLabel(swap)}
                    </p>
                  </div>

              
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Swap date: {new Date(swap.swapDate).toLocaleDateString()}
                    </span>
                  </div>

                 
                  {swap.operatorShift?.charger && (
                    <p className="text-sm text-muted-foreground">
                      Station: {swap.operatorShift.charger.name}
                    </p>
                  )}

                  
                  {swap.reason && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                        "{swap.reason}"
                      </p>
                    </div>
                  )}

                  
                  {swap.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Rejection reason:</strong> {swap.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

               
                <div className="flex sm:flex-col gap-2">
                  {swap.status === 'APPROVED' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Approved</span>
                    </div>
                  )}
                  {swap.status === 'REJECTED' && (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs">Rejected</span>
                    </div>
                  )}
                  {swap.status === 'PENDING' && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
*/
