/*
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/authContext'
import {
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Users,
  MapPin,
  Timer,
  Zap,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import {
  getPendingShiftSwaps,
  type ShiftSwap,
  getShiftSwapStatusColor,
  formatTimeTo12Hour,
  getDayName,
} from '@/lib/api/shiftsAndInspections'
import { ShiftSwapBanner } from '@/components/shared/ShiftSwapBanner'

interface PendingSwapRequestsProps {
  className?: string
}

export function PendingSwapRequests({ className }: PendingSwapRequestsProps) {
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwap | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch pending swap requests
  const { data: pendingSwaps, isLoading, error, refetch } = useQuery({
    queryKey: ['pendingShiftSwaps'],
    queryFn: getPendingShiftSwaps,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  })


  const handleViewDetails = (swap: ShiftSwap) => {
    setSelectedSwap(swap)
    setShowDetails(true)
  }

  const getOperatorInitials = (name?: string | null) => {
    if (!name || typeof name !== 'string') {
      return '?'
    }

    const trimmed = name.trim()
    if (!trimmed) {
      return '?'
    }

    const initials = trimmed
      .split(/\s+/)
      .map(part => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()

    return initials || '?'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Swap Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading pending requests...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Swap Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-red-800">Failed to Load Requests</h3>
            <p className="text-red-600 mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const swaps = pendingSwaps || []

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Swap Requests
          </CardTitle>
          <CardDescription>
            {swaps.length === 0
              ? 'No pending swap requests at the moment'
              : `${swaps.length} pending request${swaps.length === 1 ? '' : 's'} waiting for your response`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {swaps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Pending Requests</h3>
              <p className="text-sm max-w-md mx-auto leading-relaxed">
                When other operators request to swap shifts with you, they'll appear here for your review and approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {swaps.map((swap) => (
                <div key={swap.id} className="space-y-4">
                 
                  <ShiftSwapBanner
                    shiftSwap={{
                      id: swap.id,
                      operator: {
                        firstName: swap.operator?.name?.split(' ')[0] || 'Unknown',
                        lastName: swap.operator?.name?.split(' ').slice(1).join(' ') || 'Operator'
                      },
                      swapDate: swap.swapDate,
                      startTime: swap.startTime,
                      endTime: swap.endTime,
                      reason: swap.reason
                    }}
                    currentUserName={user?.firstName || 'Operator'}
                    className="border-l-4 border-l-yellow-400"
                  />
                  
                 
                  <div className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleViewDetails(swap)}
                      className="text-sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                        </Button>
                      </div>
                    </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Swap Request Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedSwap && (
            <div className="space-y-6">
           
              <div className="flex items-center gap-4">
                <Badge className={getShiftSwapStatusColor(selectedSwap.status)}>
                  {selectedSwap.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Requested on {new Date(selectedSwap.createdAt).toLocaleString()}
                </span>
              </div>

            
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Original Shift
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Day:</span> {getDayName(selectedSwap.dayOfWeek)}</p>
                    <p><span className="font-medium">Time:</span> {formatTimeTo12Hour(selectedSwap.startTime)} - {formatTimeTo12Hour(selectedSwap.endTime)}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Swap Date
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Date:</span> {new Date(selectedSwap.swapDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Day:</span> {getDayName(new Date(selectedSwap.swapDate).getDay())}</p>
                  </div>
                </div>
              </div>

             
              {selectedSwap.reason && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Reason
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedSwap.reason}
                  </p>
                </div>
              )}

              <Separator />

             
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  )
}
*/
