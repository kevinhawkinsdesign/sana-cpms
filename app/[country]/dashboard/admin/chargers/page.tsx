'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Battery, 
  MapPin, 
  Zap, 
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wrench,
  Power,
  Edit,
  Cpu,
  Cable,
  Loader2
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
  DialogTitle 
} from "@/components/ui/dialog"
import {
  getAllChargers,
  createCharger,
  updateCharger,
  deleteCharger,
  getCharger,
  type Charger,
  type ChargerUpdateData,
} from '@/lib/api/admin'
import { getChargerGuns } from '@/types/charger'
import GunManagement from '@/components/dashboard/admin/GunManagement'
import { StatCard } from '@/components/shared/StatCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const AdminChargersPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const statusOptions = ['OPERATIONAL', 'UNDER_REPAIR', 'CLOSED', 'CANCELLED', 'BEING_INSTALLED', 'PLANNED_FOR_FUTURE_DATE'] as const
  const [statusFilter, setStatusFilter] = useState<'all' | (typeof statusOptions)[number]>('all')
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)
  const [isChargerDetailsOpen, setIsChargerDetailsOpen] = useState(false)
  const [isGunManagementOpen, setIsGunManagementOpen] = useState(false)
  const [isCreateChargerOpen, setIsCreateChargerOpen] = useState(false)
  const [isEditChargerOpen, setIsEditChargerOpen] = useState(false)
  // Pedestal editing is handled inside GunManagement
  const [createForm, setCreateForm] = useState({
    name: '',
    power: '',
    address: '',
    latitude: '',
    longitude: '',
    ownerName: '',
    momoCode: '',
    meterId: '',
    gunNumber: '',
    imageUrl: '',
    generateEbm: false,
    hasTwoMeters: false,
    pricePerKwh: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerWebsite: '',
  })
  const [editChargerForm, setEditChargerForm] = useState({
    name: '',
    power: '',
    address: '',
    latitude: '',
    longitude: '',
    ownerName: '',
    momoCode: '',
    meterId: '',
    gunNumber: '',
    imageUrl: '',
    operationalStatus: 'OPERATIONAL' as ChargerUpdateData['operationalStatus'],
    generateEbm: false,
    hasTwoMeters: false,
    pricePerKwh: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerWebsite: '',
  })

  // Fetch chargers data
  const { data: chargersData, isLoading: chargersLoading } = useQuery({
    queryKey: ['chargers'],
    queryFn: getAllChargers
  })

  // Fetch full charger (pedestals + guns) when details modal is open
  const { data: chargerDetailData, isLoading: chargerDetailLoading } = useQuery({
    queryKey: ['charger', selectedCharger?.id],
    queryFn: () => getCharger(selectedCharger!.id),
    enabled: isChargerDetailsOpen && !!selectedCharger?.id
  })
  const chargerDetail = chargerDetailData?.data
  // Use refetched detail data when available so the modal reflects updates
  const displayCharger = chargerDetail?.charger ?? selectedCharger
  const pedestals = chargerDetail?.pedestals ?? selectedCharger?.pedestals ?? []

  // Create charger mutation
  const createChargerMutation = useMutation({
    mutationFn: createCharger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chargers'] })
      toast.success('Charger created successfully')
      setIsCreateChargerOpen(false)
      setCreateForm({ name: '', power: '', address: '', latitude: '', longitude: '', ownerName: '', momoCode: '', meterId: '', gunNumber: '', imageUrl: '', generateEbm: false, hasTwoMeters: false, pricePerKwh: '', ownerPhone: '', ownerEmail: '', ownerWebsite: '' })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create charger')
    }
  })

  const updateChargerMutation = useMutation({
    mutationFn: ({ chargerId, data }: { chargerId: string; data: ChargerUpdateData }) => updateCharger(chargerId, data),
    onSuccess: (_data, { chargerId }) => {
      queryClient.invalidateQueries({ queryKey: ['chargers'] })
      queryClient.invalidateQueries({ queryKey: ['charger', chargerId] })
      queryClient.invalidateQueries({ queryKey: ['chargerWithGuns', chargerId] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
      toast.success('Charger updated successfully')
      setIsEditChargerOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update charger')
    }
  })

  // Charger management mutations
  const deleteChargerMutation = useMutation({
    mutationFn: deleteCharger,
    onSuccess: (_data, chargerId) => {
      queryClient.invalidateQueries({ queryKey: ['chargers'] })
      queryClient.removeQueries({ queryKey: ['charger', chargerId] })
      queryClient.removeQueries({ queryKey: ['chargerWithGuns', chargerId] })
      toast.success('Charger deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete charger')
    }
  })

  // Calculate real stats from API data
  const chargers = chargersData?.data?.chargers || []

  const stats = {
    totalChargers: chargers.length,
    operationalChargers: chargers.filter((c: Charger) => c.operationalStatus === 'OPERATIONAL').length,
    underRepairChargers: chargers.filter((c: Charger) => c.operationalStatus === 'UNDER_REPAIR').length,
    activeChargers: chargers.filter((c: Charger) => c.isActive).length,
    totalPower: Math.round(chargers.reduce((sum: number, c: Charger) => sum + c.power, 0) * 100) / 100,
    operationalRate: chargers.length > 0 ? Math.round((chargers.filter((c: Charger) => c.operationalStatus === 'OPERATIONAL').length / chargers.length) * 100) : 0
  }

  const filteredChargers = chargers.filter((charger: Charger) => {
    const matchesSearch =
      charger.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charger.kabisaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charger.address?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || charger.operationalStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by number of guns descending (chargers with more guns first)
  const sortedChargers = [...filteredChargers].sort((a, b) => {
    const gunsA = getChargerGuns(a).length
    const gunsB = getChargerGuns(b).length
    return gunsB - gunsA
  })

  const isAdminOrOrgAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZATION_ADMIN;

  const handleDeleteCharger = (chargerId: string) => {
    if (confirm('Are you sure you want to delete this charger? This action cannot be undone.')) {
      deleteChargerMutation.mutate(chargerId)
    }
  }

  const handleViewChargerDetails = (charger: Charger) => {
    setSelectedCharger(charger)
    setIsChargerDetailsOpen(true)
  }

  const handleManageGuns = (charger: Charger) => {
    setSelectedCharger(charger)
    setIsGunManagementOpen(true)
  }

  const openEditCharger = () => {
    if (!selectedCharger) return
    setEditChargerForm({
      name: selectedCharger.name ?? '',
      power: String(selectedCharger.power),
      address: selectedCharger.address ?? '',
      latitude: selectedCharger.latitude != null ? String(selectedCharger.latitude) : '',
      longitude: selectedCharger.longitude != null ? String(selectedCharger.longitude) : '',
      ownerName: selectedCharger.ownerName ?? '',
      momoCode: selectedCharger.momoCode ?? '',
      meterId: selectedCharger.meterId ?? '',
      gunNumber: selectedCharger.gunNumber ?? '',
      imageUrl: selectedCharger.imageUrl ?? '',
      operationalStatus: selectedCharger.operationalStatus,
      generateEbm: selectedCharger.generateEbm ?? false,
      hasTwoMeters: selectedCharger.hasTwoMeters ?? false,
      pricePerKwh: selectedCharger.pricePerKwh != null ? String(selectedCharger.pricePerKwh) : '',
      ownerPhone: selectedCharger.ownerPhone ?? '',
      ownerEmail: selectedCharger.ownerEmail ?? '',
      ownerWebsite: selectedCharger.ownerWebsite ?? '',
    })
    setIsEditChargerOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-green-100 text-green-800'
      case 'UNDER_REPAIR':
        return 'bg-yellow-100 text-yellow-800'
      case 'CLOSED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'BEING_INSTALLED':
      case 'PLANNED_FOR_FUTURE_DATE':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'UNDER_REPAIR':
        return <Wrench className="h-4 w-4 text-yellow-500" />
      case 'CLOSED':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <AdminAccessGuard>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Charger Management</h1>
          <p className="text-gray-600 mt-2">
            Manage charging stations, monitor status, and control operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateChargerOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Charger
          </Button>
        </div>
      </div>

      {/* Quick Stats - Backend Integrated */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Chargers"
          value={stats.totalChargers}
          description={`${stats.totalChargers} charging stations`}
          icon={<Battery className="h-4 w-4 text-white" />}
          color="bg-blue-600"
          isLoading={chargersLoading}
        />
        <StatCard
          title="Operational"
          value={stats.operationalChargers}
          description={`${stats.operationalRate}% operational rate`}
          icon={<CheckCircle className="h-4 w-4 text-white" />}
          color="bg-green-600"
          isLoading={chargersLoading}
        />
        <StatCard
          title="Under repair"
          value={stats.underRepairChargers}
          description={`${stats.underRepairChargers} under repair`}
          icon={<Wrench className="h-4 w-4 text-white" />}
          color="bg-yellow-600"
          isLoading={chargersLoading}
        />
        <StatCard
          title="Total Power"
          value={`${stats.totalPower}kW`}
          description={`${stats.totalPower}kW total capacity`}
          icon={<Power className="h-4 w-4 text-white" />}
          color="bg-purple-600"
          isLoading={chargersLoading}
        />
      </div>

      {/* Charger Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                All Chargers
              </CardTitle>
              <CardDescription>
                Monitor charger status, location, and operational details
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
                placeholder="Search by name, ID, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter === 'all' ? 'All Status' : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Status
                </DropdownMenuItem>
                {statusOptions.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                    {s.replaceAll('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Chargers Table with Scrollable Container */}
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="bg-gray-50">Charger</TableHead>
                    <TableHead className="bg-gray-50">Power</TableHead>
                    <TableHead className="bg-gray-50">Status</TableHead>
                    <TableHead className="bg-gray-50">Active</TableHead>
                    <TableHead className="bg-gray-50">EBM</TableHead>
                    <TableHead className="bg-gray-50 text-center">Pedestals</TableHead>
                    <TableHead className="bg-gray-50 text-center">Guns</TableHead>
                    <TableHead className="bg-gray-50">Location</TableHead>
                    <TableHead className="bg-gray-50 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedChargers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-center">
                          <Battery className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No chargers found</p>
                          {searchTerm && (
                            <p className="text-sm text-gray-400 mt-1">
                              Try adjusting your search terms
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedChargers.map((charger) => {
                      const pedestalCount = charger.pedestals?.length ?? 0
                      const gunCount = getChargerGuns(charger).length
                      return (
                      <TableRow key={charger.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Battery className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{charger.name ?? 'Charging Station'}</div>
                              <div className="text-sm text-gray-500">
                                {charger.kabisaId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{Math.round(charger.power * 100) / 100}kW</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(charger.operationalStatus)}
                            <Badge className={getStatusColor(charger.operationalStatus)}>
                              {charger.operationalStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={charger.isActive ? "default" : "secondary"}>
                            {charger.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {charger.generateEbm ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Enabled</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            onClick={() => handleViewChargerDetails(charger)}
                          >
                            <Cpu className="h-3 w-3 text-muted-foreground" />
                            {pedestalCount}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                            onClick={() => handleManageGuns(charger)}
                          >
                            <Cable className="h-3 w-3 text-muted-foreground" />
                            {gunCount}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{charger.address ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewChargerDetails(charger)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedCharger(charger); setEditChargerForm({
                                name: charger.name ?? '',
                                power: String(charger.power),
                                address: charger.address ?? '',
                                latitude: charger.latitude != null ? String(charger.latitude) : '',
                                longitude: charger.longitude != null ? String(charger.longitude) : '',
                                ownerName: charger.ownerName ?? '',
                                momoCode: charger.momoCode ?? '',
                                meterId: charger.meterId ?? '',
                                gunNumber: charger.gunNumber ?? '',
                                imageUrl: charger.imageUrl ?? '',
                                operationalStatus: charger.operationalStatus,
                                generateEbm: charger.generateEbm ?? false,
                                hasTwoMeters: charger.hasTwoMeters ?? false,
                                pricePerKwh: charger.pricePerKwh != null ? String(charger.pricePerKwh) : '',
                                ownerPhone: charger.ownerPhone ?? '',
                                ownerEmail: charger.ownerEmail ?? '',
                                ownerWebsite: charger.ownerWebsite ?? '',
                              }); setIsEditChargerOpen(true); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Charger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageGuns(charger)}>
                                <Battery className="h-4 w-4 mr-2" />
                                Manage Guns
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCharger(charger.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Charger
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ); })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charger Details Modal */}
      <Dialog open={isChargerDetailsOpen} onOpenChange={setIsChargerDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Charger Details</span>
              {selectedCharger && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={openEditCharger}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setIsChargerDetailsOpen(false); handleManageGuns(selectedCharger) }}>
                    <Cable className="h-4 w-4 mr-1" /> Pedestals &amp; Guns
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCharger && (
            <div className="space-y-6">
              {chargerDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium">{displayCharger!.name ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kabisa ID</span>
                      <p className="font-medium">{displayCharger!.kabisaId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address</span>
                      <p className="font-medium">{displayCharger!.address ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Power</span>
                      <p className="font-medium">{Math.round(displayCharger!.power * 100) / 100} kW</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <div><Badge className={getStatusColor(displayCharger!.operationalStatus)}>{displayCharger!.operationalStatus.replaceAll('_', ' ')}</Badge></div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Active</span>
                      <div><Badge variant={displayCharger!.isActive ? 'default' : 'secondary'}>{displayCharger!.isActive ? 'Yes' : 'No'}</Badge></div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EBM generation</span>
                      <div>
                        {displayCharger!.generateEbm ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Enabled</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Disabled</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coordinates</span>
                      <p className="font-medium">{displayCharger!.latitude ?? '—'}, {displayCharger!.longitude ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated</span>
                      <p className="font-medium">{new Date(displayCharger!.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Pedestals & Guns summary */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-4 w-4" /> Pedestals &amp; Guns
                      </h3>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setIsChargerDetailsOpen(false); handleManageGuns(selectedCharger!) }}>
                        Manage all
                      </Button>
                    </div>
                    {pedestals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pedestals yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {pedestals.map((pedestal) => (
                          <div key={pedestal.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-medium text-sm">{pedestal.name || 'Unnamed'}</span>
                              <Badge variant={pedestal.onlineStatus === 'ONLINE' ? 'default' : 'secondary'} className="text-xs">{pedestal.onlineStatus}</Badge>
                              {pedestal.citrineChargerId && <span className="text-xs text-muted-foreground">Citrine: {pedestal.citrineChargerId}</span>}
                            </div>
                            {(pedestal.guns ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No guns</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(pedestal.guns ?? []).map((gun) => (
                                  <div key={gun.id} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs bg-gray-50">
                                    <Cable className="h-3 w-3 text-blue-500" />
                                    <span className="font-medium">{gun.name || gun.kabisaId}</span>
                                    {gun.gunNumber && <span className="text-muted-foreground">#{gun.gunNumber}</span>}
                                    <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(gun.chargingStatus)}`}>
                                      {gun.chargingStatus.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Charger popup */}
      <Dialog open={isEditChargerOpen} onOpenChange={setIsEditChargerOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit charger</DialogTitle>
            <DialogDescription>Update charger details. Save to apply.</DialogDescription>
          </DialogHeader>
          {selectedCharger && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editChargerForm.name}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Charger name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Power (kW) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editChargerForm.power}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, power: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={editChargerForm.address}
                  onChange={(e) => setEditChargerForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={editChargerForm.latitude}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, latitude: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input
                    type="number"
                    step="any"
                    value={editChargerForm.longitude}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, longitude: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Owner name</label>
                  <Input
                    value={editChargerForm.ownerName}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, ownerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Operational status</label>
                  <Select
                    value={editChargerForm.operationalStatus}
                    onValueChange={(v) => setEditChargerForm((f) => ({ ...f, operationalStatus: v as ChargerUpdateData['operationalStatus'] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">MoMo code</label>
                  <Input
                    value={editChargerForm.momoCode}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, momoCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Meter ID</label>
                  <Input
                    value={editChargerForm.meterId}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, meterId: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Gun number</label>
                  <Input
                    value={editChargerForm.gunNumber}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, gunNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Image URL</label>
                  <Input
                    value={editChargerForm.imageUrl}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Price per kWh (RWF)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={editChargerForm.pricePerKwh}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, pricePerKwh: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Owner phone</label>
                  <Input
                    type="tel"
                    value={editChargerForm.ownerPhone}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, ownerPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Owner email</label>
                  <Input
                    type="email"
                    value={editChargerForm.ownerEmail}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Owner website</label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={editChargerForm.ownerWebsite}
                    onChange={(e) => setEditChargerForm((f) => ({ ...f, ownerWebsite: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={editChargerForm.generateEbm}
                  onChange={(e) => setEditChargerForm((f) => ({ ...f, generateEbm: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0E159A] focus:ring-[#0E159A]"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Enable EBM generation</div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Sessions on this charger will auto-generate EBM receipts and show the operator EBM popup after payment. Off = station excluded from rollout.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={editChargerForm.hasTwoMeters}
                  onChange={(e) => setEditChargerForm((f) => ({ ...f, hasTwoMeters: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0E159A] focus:ring-[#0E159A]"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Has two meters</div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Operator check-in and check-out forms will show a second meter reading field for this station.
                  </p>
                </div>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditChargerOpen(false)}>Cancel</Button>
                <Button
                  disabled={!editChargerForm.power || updateChargerMutation.isPending}
                  onClick={() => {
                    const power = Number(editChargerForm.power)
                    if (Number.isNaN(power) || power <= 0) return
                    // Diff form against original — only ship changed fields so
                    // empty strings don't trip Joi's min(1) on fields the user
                    // never touched.
                    const orig = selectedCharger!
                    const data: ChargerUpdateData = {}
                    if (power !== orig.power) data.power = power
                    if (editChargerForm.operationalStatus !== orig.operationalStatus) {
                      data.operationalStatus = editChargerForm.operationalStatus
                    }
                    if (editChargerForm.generateEbm !== (orig.generateEbm ?? false)) {
                      data.generateEbm = editChargerForm.generateEbm
                    }
                    if (editChargerForm.hasTwoMeters !== (orig.hasTwoMeters ?? false)) {
                      data.hasTwoMeters = editChargerForm.hasTwoMeters
                    }
                    const name = editChargerForm.name.trim()
                    if (name !== (orig.name ?? '') && name) data.name = name
                    const address = editChargerForm.address.trim()
                    if (address !== (orig.address ?? '') && address) data.address = address
                    const latStr = editChargerForm.latitude.trim()
                    const origLatStr = orig.latitude != null ? String(orig.latitude) : ''
                    if (latStr !== origLatStr && latStr) data.latitude = Number(latStr)
                    const lngStr = editChargerForm.longitude.trim()
                    const origLngStr = orig.longitude != null ? String(orig.longitude) : ''
                    if (lngStr !== origLngStr && lngStr) data.longitude = Number(lngStr)
                    const ownerName = editChargerForm.ownerName.trim()
                    if (ownerName !== (orig.ownerName ?? '') && ownerName) data.ownerName = ownerName
                    const momoCode = editChargerForm.momoCode.trim()
                    if (momoCode !== (orig.momoCode ?? '')) data.momoCode = momoCode
                    const meterId = editChargerForm.meterId.trim()
                    if (meterId !== (orig.meterId ?? '')) data.meterId = meterId
                    const gunNumber = editChargerForm.gunNumber.trim()
                    if (gunNumber !== (orig.gunNumber ?? '')) data.gunNumber = gunNumber
                    const imageUrl = editChargerForm.imageUrl.trim()
                    if (imageUrl !== (orig.imageUrl ?? '')) data.imageUrl = imageUrl
                    const priceStr = editChargerForm.pricePerKwh.trim()
                    const origPriceStr = orig.pricePerKwh != null ? String(orig.pricePerKwh) : ''
                    if (priceStr !== origPriceStr) {
                      if (!priceStr) {
                        // Explicit null clears the field server-side; undefined would be stripped
                        // by JSON serialization and the backend would never receive the clear.
                        data.pricePerKwh = null
                      } else {
                        const priceNum = Number(priceStr)
                        if (Number.isNaN(priceNum) || priceNum < 0) {
                          toast.error('Price per kWh must be a non-negative number')
                          return
                        }
                        data.pricePerKwh = priceNum
                      }
                    }
                    // For cleared nullable fields, send null (not '') so the DB column
                    // is NULL rather than an empty string. Matches the pricePerKwh fix.
                    const ownerPhone = editChargerForm.ownerPhone.trim()
                    if (ownerPhone !== (orig.ownerPhone ?? '')) data.ownerPhone = ownerPhone || null
                    const ownerEmail = editChargerForm.ownerEmail.trim()
                    if (ownerEmail !== (orig.ownerEmail ?? '')) data.ownerEmail = ownerEmail || null
                    const ownerWebsite = editChargerForm.ownerWebsite.trim()
                    if (ownerWebsite !== (orig.ownerWebsite ?? '')) data.ownerWebsite = ownerWebsite || null
                    if (Object.keys(data).length === 0) {
                      setIsEditChargerOpen(false)
                      return
                    }
                    updateChargerMutation.mutate({ chargerId: selectedCharger.id, data })
                  }}
                >
                  {updateChargerMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pedestal editing is now handled inside GunManagement */}

      {/* Create Charger Modal */}
      <Dialog open={isCreateChargerOpen} onOpenChange={setIsCreateChargerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Charger</DialogTitle>
            <DialogDescription>
              Fill in the details to register a new charging station.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g. Charger A1"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Power (kW) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 50"
                  value={createForm.power}
                  onChange={(e) => setCreateForm(f => ({ ...f, power: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="Enter full address"
                value={createForm.address}
                onChange={(e) => setCreateForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. -1.9441"
                  value={createForm.latitude}
                  onChange={(e) => setCreateForm(f => ({ ...f, latitude: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 30.0619"
                  value={createForm.longitude}
                  onChange={(e) => setCreateForm(f => ({ ...f, longitude: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Owner name</label>
                <Input
                  placeholder="Owner name"
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">MoMo code</label>
                <Input
                  placeholder="MoMo code"
                  value={createForm.momoCode}
                  onChange={(e) => setCreateForm(f => ({ ...f, momoCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Meter ID</label>
                <Input
                  placeholder="Meter ID"
                  value={createForm.meterId}
                  onChange={(e) => setCreateForm(f => ({ ...f, meterId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Gun number</label>
                <Input
                  placeholder="Gun number label"
                  value={createForm.gunNumber}
                  onChange={(e) => setCreateForm(f => ({ ...f, gunNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Image URL</label>
              <Input
                placeholder="https://..."
                value={createForm.imageUrl}
                onChange={(e) => setCreateForm(f => ({ ...f, imageUrl: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Price per kWh (RWF)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 250"
                  value={createForm.pricePerKwh}
                  onChange={(e) => setCreateForm(f => ({ ...f, pricePerKwh: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Owner phone</label>
                <Input
                  type="tel"
                  placeholder="e.g. +250 7xx xxx xxx"
                  value={createForm.ownerPhone}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Owner email</label>
                <Input
                  type="email"
                  placeholder="owner@example.com"
                  value={createForm.ownerEmail}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Owner website</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={createForm.ownerWebsite}
                  onChange={(e) => setCreateForm(f => ({ ...f, ownerWebsite: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={createForm.generateEbm}
                onChange={(e) => setCreateForm(f => ({ ...f, generateEbm: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0E159A] focus:ring-[#0E159A]"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Enable EBM generation</div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Sessions on this charger will auto-generate EBM receipts and show the operator EBM popup after payment.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={createForm.hasTwoMeters}
                onChange={(e) => setCreateForm(f => ({ ...f, hasTwoMeters: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0E159A] focus:ring-[#0E159A]"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Has two meters</div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Operator check-in and check-out forms will show a second meter reading field for this station.
                </p>
              </div>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCreateChargerOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!createForm.power || createChargerMutation.isPending}
                onClick={() => {
                  const power = Number(createForm.power)
                  if (!createForm.power || Number.isNaN(power) || power <= 0) return
                  const payload: import('@/lib/api/admin').ChargerCreateData = { power }
                  if (createForm.name.trim()) payload.name = createForm.name.trim()
                  if (createForm.address.trim()) payload.address = createForm.address.trim()
                  if (createForm.latitude.trim()) payload.latitude = Number(createForm.latitude)
                  if (createForm.longitude.trim()) payload.longitude = Number(createForm.longitude)
                  if (createForm.ownerName.trim()) payload.ownerName = createForm.ownerName.trim()
                  if (createForm.momoCode.trim()) payload.momoCode = createForm.momoCode.trim()
                  if (createForm.meterId.trim()) payload.meterId = createForm.meterId.trim()
                  if (createForm.gunNumber.trim()) payload.gunNumber = createForm.gunNumber.trim()
                  if (createForm.imageUrl.trim()) payload.imageUrl = createForm.imageUrl.trim()
                  if (createForm.generateEbm) payload.generateEbm = true
                  if (createForm.hasTwoMeters) payload.hasTwoMeters = true
                  if (createForm.pricePerKwh.trim()) {
                    const p = Number(createForm.pricePerKwh)
                    if (Number.isNaN(p) || p < 0) {
                      toast.error('Price per kWh must be a non-negative number')
                      return
                    }
                    payload.pricePerKwh = p
                  }
                  if (createForm.ownerPhone.trim()) payload.ownerPhone = createForm.ownerPhone.trim()
                  if (createForm.ownerEmail.trim()) payload.ownerEmail = createForm.ownerEmail.trim()
                  if (createForm.ownerWebsite.trim()) payload.ownerWebsite = createForm.ownerWebsite.trim()
                  createChargerMutation.mutate(payload)
                }}
              >
                {createChargerMutation.isPending ? 'Creating...' : 'Create Charger'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gun Management Modal */}
      {selectedCharger && (
        <GunManagement
          chargerId={selectedCharger.id}
          chargerName={selectedCharger.name ?? selectedCharger.kabisaId ?? 'Charger'}
          isOpen={isGunManagementOpen}
          onClose={() => setIsGunManagementOpen(false)}
        />
      )}
    </div>
    </AdminAccessGuard>
  )
}

export default AdminChargersPage
