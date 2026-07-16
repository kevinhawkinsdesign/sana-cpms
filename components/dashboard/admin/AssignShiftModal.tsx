'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Users, 
  User as UserIcon, 
  Mail, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  X,
  Search,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { getAllUsers, updateShift, type User } from '@/lib/api/shifts'
import { getOperators } from '@/lib/api/admin'
import { getAuthTokens } from '@/lib/utils/authStorage'

interface AssignShiftModalProps {
  isOpen: boolean
  onClose: () => void
  shiftId: string
  shiftDetails?: {
    dayOfWeek: number
    startTime?: string
    endTime?: string
    charger?: {
      name: string
      kabisaId: string
    }
  }
  onSuccess: () => void
}

const AssignShiftModal: React.FC<AssignShiftModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  shiftDetails,
  onSuccess
}) => {
  const queryClient = useQueryClient()
  const [selectedOperator, setSelectedOperator] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all users (operators)
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const tokens = getAuthTokens()
      const result = await getAllUsers()
      return result
    },
    enabled: isOpen
  })

  const { data: operatorsData } = useQuery({
    queryKey: ['adminOperators'],
    queryFn: getOperators,
    enabled: isOpen
  })

  // Handle error with useEffect
  React.useEffect(() => {
    if (error) {
      console.error('🔍 AssignShiftModal - Error fetching users:', error)
      toast.error('Failed to load operators')
    }
  }, [error])

  // Assign operator mutation
  const assignOperatorMutation = useMutation({
    mutationFn: ({ shiftId, operatorId }: { shiftId: string; operatorId: string }) =>
      updateShift(shiftId, { operatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Operator assigned successfully')
      onSuccess()
      onClose()
      setSelectedOperator('')
      setSearchTerm('')
    },
    onError: (error: any) => {
      console.error('Assign operator error:', error)
      toast.error(error.message || 'Failed to assign operator')
    }
  })

  const users = (usersData as any)?.data?.users || []
  const adminOperators = operatorsData?.data?.operators || []
  const traineeByOperatorId = Object.fromEntries(
    adminOperators.map((op) => [op.id, op.isTrainee])
  )
  // Filter only operators
  const operators = users.filter((user: User) => user.role === 'OPERATOR')

  // Filter operators by search term
  const filteredOperators = operators.filter((operator: User) =>
    operator.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    operator.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    operator.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }

  const getTimeDisplay = (startTime?: string, endTime?: string): string => {
    if (startTime && endTime) {
      return `${startTime} - ${endTime}`
    }
    return 'Flexible'
  }

  const handleAssignOperator = () => {
    if (!selectedOperator) {
      toast.error('Please select an operator')
      return
    }

    assignOperatorMutation.mutate({ shiftId, operatorId: selectedOperator })
  }

  const handleClose = () => {
    setSelectedOperator('')
    setSearchTerm('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Operator to Shift
          </DialogTitle>
          <DialogDescription>
            Select an operator to assign to this shift
          </DialogDescription>
        </DialogHeader>

        {/* Shift Details */}
        {shiftDetails && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Shift Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Day</p>
                    <p className="text-sm text-gray-600">{getDayName(shiftDetails.dayOfWeek)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-gray-600">
                      {getTimeDisplay(shiftDetails.startTime, shiftDetails.endTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Charger</p>
                    <p className="text-sm text-gray-600">
                      {shiftDetails.charger ? shiftDetails.charger.name : 'Any charger'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search operators by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Operators List */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {filteredOperators.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No operators found</p>
                    {searchTerm && (
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOperators.map((operator: User) => (
                  <Card 
                    key={operator.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedOperator === operator.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOperator(operator.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {operator.firstName?.[0]}{operator.lastName?.[0]}
                          </div>
                          {selectedOperator === operator.id && (
                            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Operator Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">
                              {operator.firstName} {operator.lastName}
                            </h3>
                            <Badge variant={operator.isVerified ? "default" : "secondary"}>
                              {operator.isVerified ? "Verified" : "Unverified"}
                            </Badge>
                            {(traineeByOperatorId[operator.id] || operator.isTrainee) && (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                                Trainee
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{operator.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{operator.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={operator.isActive ? "default" : "secondary"}>
                            {operator.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {operator.userType}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">Failed to load operators</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignOperator}
            disabled={!selectedOperator || assignOperatorMutation.isPending}
            className="flex items-center gap-2"
          >
            {assignOperatorMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Assign Operator
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssignShiftModal
