'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  IdCard, 
  Plus, 
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Link,
  Unlink,
  Battery,
  Zap,
  Car,
  Wrench,
  AlertCircle,
  CheckCircle,
  XCircle,
  Copy,
  QrCode
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  getAllKabisaIds,
  getUnassignedKabisaIds,
  getAssignedKabisaIds,
  getKabisaIdsByType,
  createKabisaId,
  updateKabisaId,
  deleteKabisaId,
  assignKabisaId,
  unassignKabisaId
} from '@/lib/api/admin'
import PopupKabisaGenerator from '@/components/dashboard/sessions/PopupKabisaGenerator'

import { StatCard } from '@/components/shared/StatCard'

const AdminKabisaIdsPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'CHARGER' | 'GUN' | 'METER' | 'VEHICLE'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [selectedKabisaId, setSelectedKabisaId] = useState<any>(null)
  const [isKabisaIdDetailsOpen, setIsKabisaIdDetailsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false)
  const [selectedIdForAction, setSelectedIdForAction] = useState<string>('')

  // Fetch Kabisa IDs data based on filters
  const { data: kabisaIdsData, isLoading: kabisaIdsLoading } = useQuery({
    queryKey: ['kabisaIds', typeFilter, statusFilter],
    queryFn: async () => {
      if (statusFilter === 'assigned') {
        return getAssignedKabisaIds()
      } else if (statusFilter === 'unassigned') {
        return getUnassignedKabisaIds()
      } else if (typeFilter !== 'all') {
        return getKabisaIdsByType(typeFilter)
      } else {
        return getAllKabisaIds()
      }
    }
  })

  // Kabisa ID management mutations
  const deleteKabisaIdMutation = useMutation({
    mutationFn: deleteKabisaId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kabisaIds'] })
      toast.success('Kabisa ID deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate Kabisa ID')
    }
  })

  const assignKabisaIdMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assignKabisaId(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kabisaIds'] })
      toast.success('Kabisa ID assigned successfully')
      setIsAssignModalOpen(false)
      setSelectedIdForAction('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign Kabisa ID')
    }
  })

  const unassignKabisaIdMutation = useMutation({
    mutationFn: unassignKabisaId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kabisaIds'] })
      toast.success('Kabisa ID unassigned successfully')
      setIsUnassignModalOpen(false)
      setSelectedIdForAction('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unassign Kabisa ID')
    }
  })

  // Calculate real stats from API data
  const kabisaIds = kabisaIdsData?.data?.kabisaIds || []

  const stats = {
    totalKabisaIds: kabisaIds.length,
    assignedKabisaIds: kabisaIds.filter((id: any) => id.isAssigned).length,
    unassignedKabisaIds: kabisaIds.filter((id: any) => !id.isAssigned).length,
    chargerIds: kabisaIds.filter((id: any) => id.kabisaIdType === 'CHARGER').length,
    gunIds: kabisaIds.filter((id: any) => id.kabisaIdType === 'GUN').length,
    meterIds: kabisaIds.filter((id: any) => id.kabisaIdType === 'METER').length,
    vehicleIds: kabisaIds.filter((id: any) => id.kabisaIdType === 'VEHICLE').length,
    activeIds: kabisaIds.filter((id: any) => id.isActive).length,
    assignmentRate: kabisaIds.length > 0 ? Math.round((kabisaIds.filter((id: any) => id.isAssigned).length / kabisaIds.length) * 100) : 0
  }

  // Filter Kabisa IDs based on search and filters
  const filteredKabisaIds = kabisaIds.filter((kabisaId: any) => {
    const matchesSearch = 
      kabisaId.kabisaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kabisaId.kabisaIdType?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleAssign = (id: string) => {
    setSelectedIdForAction(id)
    setIsAssignModalOpen(true)
  }

  const handleUnassign = (id: string) => {
    setSelectedIdForAction(id)
    setIsUnassignModalOpen(true)
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success('Kabisa ID copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy Kabisa ID')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CHARGER':
        return <Battery className="h-4 w-4" />
      case 'GUN':
        return <Zap className="h-4 w-4" />
      case 'METER':
        return <Wrench className="h-4 w-4" />
      case 'VEHICLE':
        return <Car className="h-4 w-4" />
      default:
        return <IdCard className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return null
  }

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kabisa ID Management</h1>
          <p className="text-muted-foreground">
            Manage and assign Kabisa IDs to different equipment types
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New ID
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Kabisa IDs"
          value={stats.totalKabisaIds}
          description="All generated IDs"
          icon={<IdCard className="h-4 w-4 text-white" />}
          isLoading={kabisaIdsLoading}
          color="bg-blue-600"
        />
        <StatCard
          title="Assigned IDs"
          value={stats.assignedKabisaIds}
          description="Currently in use"
          icon={<Link className="h-4 w-4 text-white" />}
          isLoading={kabisaIdsLoading}
          trend={`${stats.assignmentRate}% assignment rate`}
          color="bg-green-600"
        />
        <StatCard
          title="Unassigned IDs"
          value={stats.unassignedKabisaIds}
          description="Available for assignment"
          icon={<Unlink className="h-4 w-4 text-white" />}
          isLoading={kabisaIdsLoading}
          color="bg-orange-600"
        />
        <StatCard
          title="Active IDs"
          value={stats.activeIds}
          description="Currently active"
          icon={<CheckCircle className="h-4 w-4 text-white" />}
          isLoading={kabisaIdsLoading}
          color="bg-purple-600"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Kabisa IDs</CardTitle>
          <CardDescription>
            Manage all Kabisa IDs in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search Kabisa IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CHARGER">Chargers</SelectItem>
                  <SelectItem value="GUN">Guns</SelectItem>
                  <SelectItem value="METER">Meters</SelectItem>
                  <SelectItem value="VEHICLE">Vehicles</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="bg-gray-50">Kabisa ID</TableHead>
                    <TableHead className="bg-gray-50">Type</TableHead>
                    <TableHead className="bg-gray-50">Status</TableHead>
                    <TableHead className="bg-gray-50">Assignment</TableHead>
                    <TableHead className="bg-gray-50">Created</TableHead>
                    <TableHead className="bg-gray-50 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kabisaIdsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredKabisaIds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <IdCard className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No Kabisa IDs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKabisaIds.map((kabisaId: any) => (
                      <TableRow key={kabisaId.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {kabisaId.kabisaId}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyId(kabisaId.kabisaId)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(kabisaId.kabisaIdType)}
                            <span className="capitalize">{kabisaId.kabisaIdType?.toLowerCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={kabisaId.isActive ? "default" : "secondary"}>
                            {kabisaId.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={kabisaId.isAssigned ? "default" : "outline"}>
                            {kabisaId.isAssigned ? "Assigned" : "Unassigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(kabisaId.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedKabisaId(kabisaId)
                                setIsKabisaIdDetailsOpen(true)
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyId(kabisaId.kabisaId)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy ID
                              </DropdownMenuItem>
                              {kabisaId.isAssigned ? (
                                <DropdownMenuItem onClick={() => handleUnassign(kabisaId.id)}>
                                  <Unlink className="mr-2 h-4 w-4" />
                                  Unassign
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleAssign(kabisaId.id)}>
                                  <Link className="mr-2 h-4 w-4" />
                                  Assign
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => deleteKabisaIdMutation.mutate(kabisaId.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
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
          </div>
        </CardContent>
      </Card>

      {/* Kabisa ID Details Modal */}
      <Dialog open={isKabisaIdDetailsOpen} onOpenChange={setIsKabisaIdDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kabisa ID Details</DialogTitle>
            <DialogDescription>
              Detailed information about this Kabisa ID
            </DialogDescription>
          </DialogHeader>
          {selectedKabisaId && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Kabisa ID</label>
                  <p className="text-sm text-gray-600 font-mono">{selectedKabisaId.kabisaId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-gray-600 capitalize">{selectedKabisaId.kabisaIdType?.toLowerCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedKabisaId.isActive ? "default" : "secondary"}>
                    {selectedKabisaId.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Assignment</label>
                  <Badge variant={selectedKabisaId.isAssigned ? "default" : "outline"}>
                    {selectedKabisaId.isAssigned ? "Assigned" : "Unassigned"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-gray-600">{new Date(selectedKabisaId.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Updated</label>
                  <p className="text-sm text-gray-600">{new Date(selectedKabisaId.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Kabisa ID Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] min-h-[600px]">
          <DialogHeader>
            <DialogTitle>Generate New Kabisa ID</DialogTitle>
            <DialogDescription>
              Create a new unique Kabisa ID for equipment
            </DialogDescription>
          </DialogHeader>
          <PopupKabisaGenerator
            onSelectId={(id) => {
              setIsCreateModalOpen(false)
              queryClient.invalidateQueries({ queryKey: ['kabisaIds'] })
              toast.success('New Kabisa ID generated successfully')
            }}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Assign Kabisa ID Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Kabisa ID</DialogTitle>
            <DialogDescription>
              Assign this Kabisa ID to an entity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <Select onValueChange={(value: any) => {
                // Handle entity type selection
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHARGER">Charger</SelectItem>
                  <SelectItem value="GUN">Gun</SelectItem>
                  <SelectItem value="METER">Meter</SelectItem>
                  <SelectItem value="VEHICLE">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Entity ID</label>
              <Input placeholder="Enter entity ID" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle assignment
              assignKabisaIdMutation.mutate({
                id: selectedIdForAction,
                data: { entityId: 'test', entityType: 'CHARGER' }
              })
            }}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Kabisa ID Modal */}
      <Dialog open={isUnassignModalOpen} onOpenChange={setIsUnassignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unassign Kabisa ID</DialogTitle>
            <DialogDescription>
              Are you sure you want to unassign this Kabisa ID?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnassignModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => unassignKabisaIdMutation.mutate(selectedIdForAction)}
            >
              Unassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminKabisaIdsPage
