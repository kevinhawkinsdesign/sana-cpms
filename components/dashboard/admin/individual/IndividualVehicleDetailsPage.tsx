'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  Car, 
  User, 
  CreditCard, 
  DollarSign, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  Battery,
  Tag,
  Phone,
  Mail,
  Hash,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  TrendingUp,
  Infinity,
  Plus,
  Settings,
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getIndividualVehicle, deactivateIndividualVehicle, activateIndividualVehicle, clearVehicleDebt, getVehicleDebtLogs, type IndividualVehicle, type VehicleDebtLog } from '@/lib/api/adminIndividual'
import {
  formatAdminCurrency,
  formatLongDate,
  getPaymentMethodIcon,
  getPaymentMethodBadgeVariant,
} from '@/components/dashboard/admin/shared/vehicleAdminUtils'
import { IndividualVehicleManagementModal } from './IndividualVehicleManagementModal'
import { EditIndividualVehicleModal } from './EditIndividualVehicleModal'
import { DeactivateIndividualVehicleModal } from './DeactivateIndividualVehicleModal'
import { VehicleDebtManagementModal } from './VehicleDebtManagementModal'
import { LicensePlateBadge } from '@/components/ui/LicensePlateBadge'

function getAllowancePeriodSuffix(a: { periodType?: string | null; customDays?: number | null }): string {
  if (a.periodType === 'DAY') return '/day'
  if (a.periodType === 'WEEK') return '/week'
  if (a.periodType === 'MONTH') return '/month'
  if (a.periodType === 'YEAR') return '/year'
  if (a.periodType === 'CUSTOM' && a.customDays != null) return ` every ${a.customDays} days`
  return ''
}

interface IndividualVehicleDetailsPageProps {
  vehicleId: string
  onBack: () => void
  onEditVehicle: (vehicle: IndividualVehicle) => void
  onDeactivateVehicle: (vehicle: IndividualVehicle) => void
}

export function IndividualVehicleDetailsPage({ 
  vehicleId, 
  onBack, 
  onEditVehicle, 
  onDeactivateVehicle 
}: IndividualVehicleDetailsPageProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isManagementOpen, setIsManagementOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [isDebtOpen, setIsDebtOpen] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch vehicle details
  const { data: vehicleData, isLoading, error } = useQuery({
    queryKey: ['individual-vehicle', vehicleId],
    queryFn: () => getIndividualVehicle(vehicleId),
    enabled: !!vehicleId
  })

  const vehicle = vehicleData?.data?.vehicle

  // Fetch debt logs
  const { data: debtLogsData } = useQuery({
    queryKey: ['vehicle-debt-logs', vehicleId],
    queryFn: () => getVehicleDebtLogs(vehicleId),
    enabled: !!vehicleId
  })

  const debtLogs = debtLogsData?.logs ?? []

  // Clear debt mutation
  const clearDebtMutation = useMutation({
    mutationFn: (vehicleId: string) => clearVehicleDebt(vehicleId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-debt-logs', vehicleId] })
      toast.success(response.message || 'Vehicle debt cleared successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear vehicle debt')
    }
  })

  // Deactivate vehicle mutation — navigates back to the list because the
  // get-vehicle endpoint filters by isActive=true and would 404 on this page.
  const deactivateVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => deactivateIndividualVehicle(vehicleId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      queryClient.removeQueries({ queryKey: ['individual-vehicle', vehicleId] })
      toast.success(response.message || 'Vehicle deactivated successfully')
      onBack()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate vehicle')
    }
  })

  // Activate vehicle mutation
  const activateVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => activateIndividualVehicle(vehicleId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicleId] })
      toast.success(response.message || 'Vehicle activated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate vehicle')
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32 mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-96 w-full" />
              </div>
              <div>
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Vehicle Not Found</h3>
              <p className="text-gray-500 mb-4">The vehicle you're looking for doesn't exist or has been removed.</p>
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vehicles
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {vehicle.imageUrl ? (
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {vehicle.make} {vehicle.model}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="font-mono text-xs text-gray-600">ID: {vehicle.kabisaId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (vehicle.isActive) {
                        if (confirm(`Deactivate ${vehicle.make} ${vehicle.model}? It will be hidden from active vehicle lists but can be re-activated later.`)) {
                          deactivateVehicleMutation.mutate(vehicle.id)
                        }
                      } else {
                        if (confirm(`Re-activate ${vehicle.make} ${vehicle.model}?`)) {
                          activateVehicleMutation.mutate(vehicle.id)
                        }
                      }
                    }}
                    disabled={deactivateVehicleMutation.isPending || activateVehicleMutation.isPending}
                    aria-label="Toggle vehicle status"
                    title={vehicle.isActive ? 'Click to deactivate' : 'Click to activate'}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${
                      vehicle.isActive
                        ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100'
                    }`}
                  >
                    {(deactivateVehicleMutation.isPending || activateVehicleMutation.isPending) ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <span className={`h-1.5 w-1.5 rounded-full ${vehicle.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LicensePlateBadge plate={vehicle.licensePlates?.[0]?.licencePlateNumber} size="lg" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditVehicle(vehicle)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Vehicle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {vehicle.isActive ? (
                    <DropdownMenuItem
                      onClick={() => setIsDeactivateOpen(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm(`Re-activate ${vehicle.make} ${vehicle.model}?`)) {
                          activateVehicleMutation.mutate(vehicle.id)
                        }
                      }}
                      className="text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {(() => {
                const paymentsCount = vehicle.paymentMethods?.length || 0
                const allowancesCount = vehicle.freeChargingAllowances?.length || 0
                const debtCount = debtLogs.length
                const TabCount: React.FC<{ value: number }> = ({ value }) => (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
                    {value}
                  </span>
                )
                return (
                  <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger
                      value="overview"
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
                    >
                      <Car className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="payment-methods"
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Payments
                      <TabCount value={paymentsCount} />
                    </TabsTrigger>
                    <TabsTrigger
                      value="free-charging"
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
                    >
                      <DollarSign className="h-4 w-4" />
                      Free Charging
                      <TabCount value={allowancesCount} />
                    </TabsTrigger>
                    <TabsTrigger
                      value="debt-history"
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Debt History
                      <TabCount value={debtCount} />
                    </TabsTrigger>
                  </TabsList>
                )
              })()}

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Vehicle Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      Vehicle Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Make</label>
                          <p className="text-lg font-semibold text-gray-900">{vehicle.make}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Model</label>
                          <p className="text-lg font-semibold text-gray-900">{vehicle.model}</p>
                        </div>
                        {vehicle.licensePlates?.[0]?.licencePlateNumber && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">License Plate</label>
                            <div className="mt-1">
                              <LicensePlateBadge
                                plate={vehicle.licensePlates[0].licencePlateNumber as any}
                                size="lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {vehicle.vin && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">VIN</label>
                            <p className="text-sm font-semibold text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-md break-all">
                              {vehicle.vin}
                            </p>
                          </div>
                        )}
                        {vehicle.batteryCapacity && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Battery Capacity</label>
                            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <Battery className="h-4 w-4 text-blue-500" />
                              {vehicle.batteryCapacity} kWh
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-600">Status</label>
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-4 w-4 ${vehicle.isActive ? 'text-green-600' : 'text-red-600'}`} />
                            <Badge variant={vehicle.isActive ? "default" : "secondary"} className="text-xs">
                              {vehicle.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 sm:col-span-2 lg:col-span-1">
                        {vehicle.chargingStatus && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Charging Status</label>
                            <Badge variant="outline" className="text-xs">
                              {vehicle.chargingStatus}
                            </Badge>
                          </div>
                        )}
                        {vehicle.isPreRegistered && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Registration</label>
                            <Badge variant="secondary" className="text-xs">
                              Pre-registered
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    {vehicle.imageUrl && (
                      <div className="mt-6">
                        <label className="text-sm font-medium text-gray-600">Vehicle Image</label>
                        <div className="mt-2">
                          <img 
                            src={vehicle.imageUrl} 
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-full h-64 object-cover rounded-lg border shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Owner Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Owner Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vehicle.owner ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Name</label>
                            <p className="text-lg font-semibold text-gray-900">
                              {vehicle.owner.firstName} {vehicle.owner.lastName}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Phone</label>
                            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-500" />
                              <span className="break-all">{vehicle.owner.phone}</span>
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {vehicle.owner.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Email</label>
                              <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Mail className="h-4 w-4 text-blue-500" />
                                <span className="break-all">{vehicle.owner.email}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">No owner information available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment-methods" className="space-y-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">Payment Methods</h3>
                  <Button 
                    onClick={() => setIsManagementOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Payment Method</span>
                    <span className="sm:hidden">Add Payment</span>
                  </Button>
                </div>

                {vehicle.paymentMethods && Array.isArray(vehicle.paymentMethods) && vehicle.paymentMethods.length > 0 ? (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicle.paymentMethods.map((method) => (
                          <TableRow key={method.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(method.type)}
                                <Badge variant={getPaymentMethodBadgeVariant(method.type)}>
                                  {method.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={method.isActive ? "default" : "secondary"}>
                                {method.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {method.balance !== undefined ? (
                                <span className="font-mono">
                                  {formatAdminCurrency(method.balance, method.currency || 'RWF')}
                                </span>
                              ) : method.phoneNumber ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm">{method.phoneNumber}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {method.network}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {method.isDefault ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatLongDate(method.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ) : (
                  <Card className="border-dashed border-2 border-gray-200">
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payment Methods</h3>
                      <p className="text-sm text-gray-500 text-center mb-4">
                        This vehicle doesn't have any payment methods configured yet.
                      </p>
                      <Button 
                        onClick={() => setIsManagementOpen(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Payment Method
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="free-charging" className="space-y-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">Free Charging Allowances</h3>
                  <Button 
                    onClick={() => setIsManagementOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Add Allowance</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>

                {vehicle.freeChargingAllowances && vehicle.freeChargingAllowances.length > 0 ? (
                  <div className="space-y-4">
                    {vehicle.freeChargingAllowances.map((allowance) => (
                      <Card key={allowance.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              Free Charging Allowance
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Active
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Type</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const hasKwh = allowance.freeKwhLimit != null && allowance.periodType
                                  if (hasKwh) {
                                    return (
                                      <>
                                        <Tag className="h-4 w-4 text-green-600" />
                                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                                          kWh cap
                                        </Badge>
                                        <span className="text-sm text-gray-700">
                                          Up to {allowance.freeKwhLimit} kWh{getAllowancePeriodSuffix(allowance)}
                                        </span>
                                      </>
                                    )
                                  }
                                  if (allowance.isUnlimited) {
                                    return (
                                      <>
                                        <Infinity className="h-4 w-4 text-blue-600" />
                                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                                          Unlimited
                                        </Badge>
                                      </>
                                    )
                                  }
                                  return (
                                    <>
                                      <Tag className="h-4 w-4 text-green-600" />
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        {allowance.remainingCount} sessions
                                      </Badge>
                                    </>
                                  )
                                })()}
                              </div>
                              {allowance.freeKwhLimit != null && allowance.periodType && typeof allowance.remainingFreeKwhThisPeriod === 'number' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {allowance.remainingFreeKwhThisPeriod} kWh left this period
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Valid From</p>
                              <p className="font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {formatLongDate(allowance.validFrom)}
                              </p>
                            </div>
                            {allowance.validUntil && (
                              <div>
                                <p className="text-sm text-gray-600">Valid Until</p>
                                <p className="font-medium flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  {formatLongDate(allowance.validUntil)}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-gray-200">
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Free Charging Allowances</h3>
                      <p className="text-sm text-gray-500 text-center mb-4">
                        This vehicle doesn't have any free charging allowances configured yet.
                      </p>
                      <Button 
                        onClick={() => setIsManagementOpen(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Allowance
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="debt-history" className="space-y-6 mt-6">
                {/* Current Debt Summary */}
                <Card className={`${(vehicle.debtBalance ?? 0) > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className={`text-2xl font-bold ${(vehicle.debtBalance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(vehicle.debtBalance ?? 0)}
                        </p>
                        {vehicle.debtNote && (
                          <p className="text-xs text-gray-500 mt-1">{vehicle.debtNote}</p>
                        )}
                      </div>
                      {(vehicle.debtBalance ?? 0) > 0 && (
                        <Badge variant="destructive">Has Debt</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Debt Logs Table */}
                {debtLogs.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Activity Log
                      </CardTitle>
                      <CardDescription>{debtLogs.length} record{debtLogs.length !== 1 ? 's' : ''}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {debtLogs.map((log) => (
                          <div
                            key={log.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  log.action === 'SET' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                  log.action === 'ADD' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                  log.action === 'CLEAR' ? 'border-green-300 text-green-700 bg-green-50' :
                                  log.action === 'PAYMENT_INITIATED' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                  log.action === 'PAYMENT_COMPLETED' ? 'border-green-300 text-green-700 bg-green-50' :
                                  log.action === 'PAYMENT_FAILED' ? 'border-red-300 text-red-700 bg-red-50' :
                                  'border-gray-300 text-gray-700'
                                }`}
                              >
                                {log.action.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                              <div>
                                <p className="text-xs text-gray-500">Previous</p>
                                <p className="font-medium">
                                  {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(log.previousBalance)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Amount</p>
                                <p className={`font-medium ${
                                  log.action === 'CLEAR' || log.action === 'PAYMENT_COMPLETED' ? 'text-green-600' :
                                  log.action === 'SET' || log.action === 'ADD' ? 'text-red-600' : ''
                                }`}>
                                  {log.amount > 0 ? `${log.action === 'CLEAR' || log.action === 'PAYMENT_COMPLETED' ? '-' : '+'}${new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(log.amount)}` : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">New Balance</p>
                                <p className="font-semibold">
                                  {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(log.newBalance)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                By: {log.performedByUser ? `${log.performedByUser.firstName} ${log.performedByUser.lastName}` : log.performedBy}
                              </span>
                              {log.note && (
                                <button
                                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                >
                                  {expandedLogId === log.id ? 'Hide Note' : 'View Note'}
                                  {expandedLogId === log.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                            </div>

                            {log.note && expandedLogId === log.id && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-sm text-gray-700">
                                {log.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No Debt History</h3>
                        <p className="text-sm text-gray-500">No debt actions have been recorded for this vehicle.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Methods</span>
                    <span className="font-semibold text-lg">{vehicle.paymentMethods?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Free Allowances</span>
                    <span className="font-semibold text-lg">{vehicle.freeChargingAllowances?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between xl:col-span-1 col-span-2">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={vehicle.isActive ? "default" : "secondary"} className="text-xs">
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debt Management */}
            <Card className={`${(vehicle.debtBalance ?? 0) > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`h-5 w-5 ${(vehicle.debtBalance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    <span>Debt Balance</span>
                  </div>
                  {(vehicle.debtBalance ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">Has Debt</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600 mb-2">Outstanding Balance</p>
                  <p className={`text-3xl font-bold ${(vehicle.debtBalance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(vehicle.debtBalance ?? 0)}
                  </p>
                  {vehicle.debtNote && (
                    <p className="text-xs text-gray-500 mt-2">{vehicle.debtNote}</p>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button
                    onClick={() => setIsDebtOpen(true)}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Debt
                  </Button>
                  {(vehicle.debtBalance ?? 0) > 0 && (
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear this vehicle\'s debt? This action cannot be undone.')) {
                          clearDebtMutation.mutate(vehicleId)
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full text-green-600 border-green-300 hover:bg-green-50"
                      disabled={clearDebtMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {clearDebtMutation.isPending ? 'Clearing...' : 'Clear Debt'}
                    </Button>
                  )}
                </div>

                {debtLogs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-600 hover:text-blue-800"
                    onClick={() => setActiveTab('debt-history')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Debt History ({debtLogs.length})
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-sm">
                      {formatLongDate(vehicle.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium text-sm">
                      {formatLongDate(vehicle.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle ID</p>
                    <p className="font-medium font-mono text-sm bg-gray-50 px-2 py-1 rounded break-all">
                      {vehicle.kabisaId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* Modals */}
      {vehicle && (
        <>
          <IndividualVehicleManagementModal
            isOpen={isManagementOpen}
            onClose={() => setIsManagementOpen(false)}
            vehicle={vehicle}
          />
          <EditIndividualVehicleModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            vehicle={vehicle}
            onSuccess={() => {
              setIsEditOpen(false)
              queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicleId] })
            }}
          />
          <DeactivateIndividualVehicleModal
            isOpen={isDeactivateOpen}
            onClose={() => setIsDeactivateOpen(false)}
            vehicle={vehicle}
            onConfirm={(vehicleId) => {
              deactivateVehicleMutation.mutate(vehicleId)
              setIsDeactivateOpen(false)
            }}
          />
          <VehicleDebtManagementModal
            isOpen={isDebtOpen}
            onClose={() => setIsDebtOpen(false)}
            vehicle={vehicle}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicleId] })
              queryClient.invalidateQueries({ queryKey: ['vehicle-debt-logs', vehicleId] })
            }}
          />
        </>
      )}
    </div>
  )
}
