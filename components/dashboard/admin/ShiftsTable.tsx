'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { getAllShifts, deleteShift, type Shift } from '@/lib/api/shifts'

interface ShiftsTableProps {
  onAssignOperator: (shiftId: string, shiftDetails: Shift) => void
  onCreateShift: () => void
  onEditShift: (shift: Shift) => void
}

const ShiftsTable: React.FC<ShiftsTableProps> = ({
  onAssignOperator,
  onCreateShift,
  onEditShift
}) => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Fetch shifts
  const { data: shiftsData, isLoading, error } = useQuery({
    queryKey: ['shifts'],
    queryFn: getAllShifts
  })

  // Delete shift mutation
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

  const shifts = shiftsData?.data?.shifts || []

  // Filter and search shifts
  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch = 
      shift.operator?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.operator?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.operator?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.charger?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && shift.isActive) ||
      (statusFilter === 'inactive' && !shift.isActive)

    return matchesSearch && matchesStatus
  })

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

  const handleDeleteShift = (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteShiftMutation.mutate(shiftId)
    }
  }

  const handleAssignOperator = (shift: Shift) => {
    onAssignOperator(shift.id, shift)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Operator Shifts
              </CardTitle>
              <CardDescription>
                Manage operator shifts and assignments
              </CardDescription>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Failed to load shifts</p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['shifts'] })}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Operator Shifts
            </CardTitle>
            <CardDescription>
              Manage operator shifts and assignments
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
              placeholder="Search by operator name, email, or charger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Shifts Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Charger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Shift</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No shifts found</p>
                      {searchTerm && (
                        <p className="text-sm text-gray-400 mt-1">
                          Try adjusting your search terms
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{getDayName(shift.dayOfWeek)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{getTimeDisplay(shift.startTime, shift.endTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.operator ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">
                              {shift.operator.firstName} {shift.operator.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {shift.operator.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 italic">No operator assigned</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {shift.charger ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{shift.charger.name}</div>
                            <div className="text-sm text-gray-500">
                              {shift.charger.kabisaId}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 italic">Any charger</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.isActive ? "default" : "secondary"}>
                        {shift.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {shift.isLastShift ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!shift.operator && (
                            <DropdownMenuItem onClick={() => handleAssignOperator(shift)}>
                              <Users className="h-4 w-4 mr-2" />
                              Assign Operator
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEditShift(shift)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Shift
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteShift(shift.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Shift
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default ShiftsTable
