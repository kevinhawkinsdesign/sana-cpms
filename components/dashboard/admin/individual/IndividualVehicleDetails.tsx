'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Car, 
  User, 
  CreditCard, 
  DollarSign, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Battery,
  Tag,
  Phone,
  Mail,
  Hash,
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Infinity,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { getIndividualVehicle, deactivateIndividualVehicle, type IndividualVehicle } from '@/lib/api/adminIndividual'
import {
  formatAdminCurrency,
  formatLongDate,
  getPaymentMethodIcon,
  getPaymentMethodBadgeVariant,
} from '@/components/dashboard/admin/shared/vehicleAdminUtils'
import { IndividualVehicleManagementModal } from './IndividualVehicleManagementModal'
import { EditIndividualVehicleModal } from './EditIndividualVehicleModal'
import { DeactivateIndividualVehicleModal } from './DeactivateIndividualVehicleModal'

interface IndividualVehicleDetailsProps {
  isOpen: boolean
  onClose: () => void
  vehicleId: string
  onEditVehicle: (vehicle: IndividualVehicle) => void
  onDeactivateVehicle: (vehicle: IndividualVehicle) => void
  isDeactivating: boolean
}

export function IndividualVehicleDetails({ 
  isOpen, 
  onClose, 
  vehicleId, 
  onEditVehicle, 
  onDeactivateVehicle,
  isDeactivating 
}: IndividualVehicleDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isManagementOpen, setIsManagementOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch vehicle details
  const { data: vehicleData, isLoading, error } = useQuery({
    queryKey: ['individual-vehicle', vehicleId],
    queryFn: () => getIndividualVehicle(vehicleId),
    enabled: isOpen && !!vehicleId
  })

  const vehicle = vehicleData?.data?.vehicle


  if (!isOpen) return null

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Vehicle Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading vehicle information...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !vehicle) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Error Loading Vehicle</DialogTitle>
            <DialogDescription>
              Failed to load vehicle details. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">Failed to load vehicle details</p>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-6 w-6 text-blue-600" />
                <div>
                  <DialogTitle className="text-xl">
                    {vehicle.make} {vehicle.model}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm">{vehicle.kabisaId}</span>
                    <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManagementOpen(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage
                </Button>
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
                    <DropdownMenuItem 
                      onClick={() => setIsDeactivateOpen(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 h-auto p-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger value="payment-methods" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <span className="hidden sm:inline">Payment Methods</span>
                  <span className="sm:hidden">Payments</span>
                </TabsTrigger>
                <TabsTrigger value="free-charging" className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <span className="hidden sm:inline">Free Charging</span>
                  <span className="sm:hidden">Free</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vehicle Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        Vehicle Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Make</p>
                          <p className="font-medium">{vehicle.make}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Model</p>
                          <p className="font-medium">{vehicle.model}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vehicle.licensePlates?.[0]?.licencePlateNumber && (
                          <div>
                            <p className="text-sm text-gray-600">License Plate</p>
                            <p className="font-medium font-mono bg-gray-50 px-2 py-1 rounded">
                              {vehicle.licensePlates[0].licencePlateNumber}
                            </p>
                          </div>
                        )}
                        {vehicle.vin && (
                          <div>
                            <p className="text-sm text-gray-600">VIN</p>
                            <p className="font-medium font-mono text-sm bg-gray-50 px-2 py-1 rounded break-all">
                              {vehicle.vin}
                            </p>
                          </div>
                        )}
                      </div>
                      {vehicle.batteryCapacity && (
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-600">Battery Capacity:</span>
                          <span className="font-medium">{vehicle.batteryCapacity} kWh</span>
                        </div>
                      )}
                      {vehicle.imageUrl && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Image</p>
                          <img 
                            src={vehicle.imageUrl} 
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Owner Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Owner Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">
                          {vehicle.owner?.firstName} {vehicle.owner?.lastName}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Phone:</span>
                          <span className="font-medium">{vehicle.owner?.phone}</span>
                        </div>
                        {vehicle.owner?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="font-medium">{vehicle.owner?.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-4 w-4 ${vehicle.owner?.isActive ? 'text-green-600' : 'text-red-600'}`} />
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant={vehicle.owner?.isActive ? "default" : "secondary"}>
                          {vehicle.owner?.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <p className="text-sm text-gray-600">Payment Methods</p>
                        <p className="font-medium">
                          {vehicle.paymentMethods?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Free Allowances</p>
                        <p className="font-medium">
                          {vehicle.freeChargingAllowances?.length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment-methods" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Payment Methods</h3>
                  <Button 
                    onClick={() => setIsManagementOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Payment Methods
                  </Button>
                </div>

                {vehicle.paymentMethods && vehicle.paymentMethods.length > 0 ? (
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
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No payment methods</p>
                      <p className="text-sm text-gray-500 mt-1">Add payment methods to get started</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="free-charging" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Free Charging Allowances</h3>
                  <Button 
                    onClick={() => setIsManagementOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Allowances
                  </Button>
                </div>

                {vehicle.freeChargingAllowances && vehicle.freeChargingAllowances.length > 0 ? (
                  <div className="space-y-4">
                    {vehicle.freeChargingAllowances.map((allowance) => (
                      <Card key={allowance.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
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
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Type</p>
                              <div className="flex items-center gap-2">
                                {allowance.isUnlimited ? (
                                  <>
                                    <Infinity className="h-4 w-4 text-blue-600" />
                                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                                      Unlimited
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <Tag className="h-4 w-4 text-green-600" />
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      {allowance.remainingCount} sessions
                                    </Badge>
                                  </>
                                )}
                              </div>
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
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <DollarSign className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No free charging allowances</p>
                      <p className="text-sm text-gray-500 mt-1">Add a free charging allowance to get started</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Management Modal */}
      {vehicle && (
        <IndividualVehicleManagementModal
          isOpen={isManagementOpen}
          onClose={() => setIsManagementOpen(false)}
          vehicle={vehicle}
        />
      )}

      {/* Edit Modal */}
      {vehicle && (
        <EditIndividualVehicleModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          vehicle={vehicle}
          onSuccess={() => {
            setIsEditOpen(false)
            queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicleId] })
          }}
        />
      )}

      {/* Deactivate Modal */}
      {vehicle && (
        <DeactivateIndividualVehicleModal
          isOpen={isDeactivateOpen}
          onClose={() => setIsDeactivateOpen(false)}
          vehicle={vehicle}
          onConfirm={(vehicleId) => {
            onDeactivateVehicle(vehicle)
            setIsDeactivateOpen(false)
          }}
        />
      )}
    </>
  )
}
