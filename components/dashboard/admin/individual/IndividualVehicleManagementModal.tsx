'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  X,
  Car,
  CreditCard,
  Plus,
  Eye,
  Calendar,
  Battery,
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  getVehiclePaymentMethods,
  addKabisaPaymentMethod,
  addMomoPaymentMethod,
  deactivatePaymentMethod,
  addFreeChargingAllowance,
  updateFreeChargingAllowance,
  deleteFreeChargingAllowance,
  type PaymentMethod,
  type FreeChargingAllowance
} from '@/lib/api/adminIndividual'
import { getAllChargers, type Charger } from '@/lib/api/admin'
import { FreeChargingAllowanceForm, type FreeChargingFormValues } from '@/components/dashboard/admin/shared/FreeChargingAllowanceForm'
import { FreeChargingAllowancesTabContent } from '@/components/dashboard/admin/shared/FreeChargingAllowancesTabContent'
import {
  formatAdminCurrency,
  formatShortDate,
  getPaymentMethodIcon,
  getPaymentMethodBadgeVariant,
  createHandleAllowance,
} from '@/components/dashboard/admin/shared/vehicleAdminUtils'
import { useVehicleAllowanceManagement } from '@/components/dashboard/admin/shared/useVehicleAllowanceManagement'

interface IndividualVehicleManagementModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: any
}

// Form schemas
const kabisaPaymentSchema = z.object({
  isDefault: z.boolean().default(false),
  balance: z.number().min(0, 'Balance must be non-negative'),
  currency: z.string().default('RWF')
})

const momoPaymentSchema = z.object({
  isDefault: z.boolean().default(false),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
  network: z.string().min(1, 'Network is required')
})

type KabisaPaymentFormData = z.infer<typeof kabisaPaymentSchema>
type MomoPaymentFormData = z.infer<typeof momoPaymentSchema>
type FreeChargingFormData = FreeChargingFormValues

export function IndividualVehicleManagementModal({ isOpen, onClose, vehicle }: IndividualVehicleManagementModalProps) {
  const [activeTab, setActiveTab] = useState('payment-methods')
  const [isAddKabisaOpen, setIsAddKabisaOpen] = useState(false)
  const [isAddMomoOpen, setIsAddMomoOpen] = useState(false)
  const queryClient = useQueryClient()

  // Kabisa payment form
  const kabisaForm = useForm<KabisaPaymentFormData>({
    resolver: zodResolver(kabisaPaymentSchema),
    defaultValues: {
      isDefault: false,
      balance: 0,
      currency: 'RWF'
    }
  })

  // MOMO payment form
  const momoForm = useForm<MomoPaymentFormData>({
    resolver: zodResolver(momoPaymentSchema),
    defaultValues: {
      isDefault: false,
      phoneNumber: '',
      network: 'MTN'
    }
  })

  // Free charging form
  const freeChargingForm = useForm<FreeChargingFormData>({
    resolver: zodResolver(z.any()),
    defaultValues: {
      mode: 'sessions',
      isUnlimited: false,
      validFrom: new Date().toISOString().split('T')[0],
      chargerSelectionType: 'all',
      chargers: []
    } as FreeChargingFormData
  })

  const {
    isAddAllowanceOpen, setIsAddAllowanceOpen,
    editingAllowance, setEditingAllowance,
    deleteConfirmOpen, setDeleteConfirmOpen,
    allowanceToDelete, setAllowanceToDelete,
    chargerSearchTerm, setChargerSearchTerm,
    handleEditAllowance, handleDeleteAllowance, cancelDelete,
  } = useVehicleAllowanceManagement(freeChargingForm)

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['individual-vehicle-payment-methods', vehicle?.id],
    queryFn: () => getVehiclePaymentMethods(vehicle.id),
    enabled: isOpen && !!vehicle?.id
  })

  // Fetch all chargers
  const { data: chargersData, isLoading: chargersLoading } = useQuery({
    queryKey: ['all-chargers'],
    queryFn: getAllChargers,
    enabled: isAddAllowanceOpen || !!editingAllowance
  })

  const paymentMethods = paymentMethodsData?.data?.paymentMethods || []
  const chargers = chargersData?.data?.chargers || []

  // Add Kabisa payment method mutation
  const addKabisaMutation = useMutation({
    mutationFn: (data: KabisaPaymentFormData) => 
      addKabisaPaymentMethod(vehicle.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle-payment-methods', vehicle.id] })
      // Use backend success message
      toast.success(response.message)
      setIsAddKabisaOpen(false)
      kabisaForm.reset()
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message)
    }
  })

  // Add MOMO payment method mutation
  const addMomoMutation = useMutation({
    mutationFn: (data: MomoPaymentFormData) => 
      addMomoPaymentMethod(vehicle.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle-payment-methods', vehicle.id] })
      // Use backend success message
      toast.success(response.message)
      setIsAddMomoOpen(false)
      momoForm.reset()
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message)
    }
  })

  // Deactivate payment method mutation
  const deactivatePaymentMutation = useMutation({
    mutationFn: (paymentMethodId: string) => 
      deactivatePaymentMethod(vehicle.id, paymentMethodId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle-payment-methods', vehicle.id] })
      // Use backend success message
      toast.success(response.message)
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message)
    }
  })

  // Add free charging allowance mutation
  const addAllowanceMutation = useMutation({
    mutationFn: (data: import('@/lib/api/adminIndividual').AddFreeChargingRequest) =>
      addFreeChargingAllowance(vehicle.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicle.id] })
      // Use backend success message
      toast.success(response.message)
      setIsAddAllowanceOpen(false)
      freeChargingForm.reset()
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message)
    }
  })

  // Update free charging allowance mutation
  const updateAllowanceMutation = useMutation({
    mutationFn: ({ allowanceId, data }: { allowanceId: string; data: import('@/lib/api/adminIndividual').AddFreeChargingRequest }) =>
      updateFreeChargingAllowance(vehicle.id, allowanceId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicle.id] })
      toast.success(response.message)
      setEditingAllowance(null)
      freeChargingForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Deactivate free charging allowance mutation
  const deactivateAllowanceMutation = useMutation({
    mutationFn: ({ allowanceId, isUnlimited }: { allowanceId: string; isUnlimited: boolean }) =>
      updateFreeChargingAllowance(vehicle.id, allowanceId, { isUnlimited, isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicle.id] })
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      toast.success('Allowance deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Delete free charging allowance mutation
  const deleteAllowanceMutation = useMutation({
    mutationFn: (allowanceId: string) =>
      deleteFreeChargingAllowance(vehicle.id, allowanceId),
    onSuccess: (response) => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicle.id] })
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle-payment-methods', vehicle.id] })
      // Invalidate all queries that might contain this vehicle's data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey
          return (
            Array.isArray(queryKey) && 
            (queryKey.includes('individual') || queryKey.includes('vehicle'))
          )
        }
      })
      // Force a refetch of the current vehicle data
      queryClient.refetchQueries({ queryKey: ['individual-vehicle', vehicle.id] })
      toast.success(response.message)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const handleAddKabisa = (data: KabisaPaymentFormData) => {
    addKabisaMutation.mutate(data)
  }

  const handleAddMomo = (data: MomoPaymentFormData) => {
    addMomoMutation.mutate(data)
  }

  const handleDeactivatePayment = (paymentMethodId: string) => {
    if (confirm('Are you sure you want to deactivate this payment method?')) {
      deactivatePaymentMutation.mutate(paymentMethodId)
    }
  }

  const handleAddAllowance = createHandleAllowance(
    editingAllowance,
    updateAllowanceMutation.mutate,
    addAllowanceMutation.mutate
  )

  const handleDeactivateAllowance = (allowance: FreeChargingAllowance) => {
    if (confirm('Deactivate this free charging allowance? The customer will pay via MoMo on next session.')) {
      deactivateAllowanceMutation.mutate({ allowanceId: allowance.id, isUnlimited: allowance.isUnlimited })
    }
  }

  const confirmDeleteAllowance = () => {
    if (allowanceToDelete) {
      deleteAllowanceMutation.mutate(allowanceToDelete.id)
      cancelDelete()
    }
  }


  if (!isOpen || !vehicle) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Car className="h-6 w-6 text-blue-600" />
            {vehicle.make} {vehicle.model} - Management
          </DialogTitle>
          <DialogDescription>
            Manage payment methods and free charging allowances for this individual vehicle
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
              <TabsTrigger value="free-charging">Free Charging</TabsTrigger>
            </TabsList>

            <TabsContent value="payment-methods" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Payment Methods</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsAddKabisaOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add KABISA
                  </Button>
                  <Button 
                    onClick={() => setIsAddMomoOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add MOMO
                  </Button>
                </div>
              </div>

              {paymentMethodsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading payment methods...</p>
                  </div>
                </div>
              ) : paymentMethods.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethods.map((method: PaymentMethod) => (
                        <TableRow key={method.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(method.type || 'UNKNOWN')}
                              <Badge variant={getPaymentMethodBadgeVariant(method.type || 'UNKNOWN')}>
                                {method.type || 'Unknown'}
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
                            {formatShortDate(method.createdAt)}
                          </TableCell>
                          <TableCell>
                            {method.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivatePayment(method.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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

            <TabsContent value="free-charging" className="space-y-4 mt-4">
              <FreeChargingAllowancesTabContent
                allowances={vehicle.freeChargingAllowances ?? []}
                onAddClick={() => setIsAddAllowanceOpen(true)}
                onEditClick={handleEditAllowance}
                onDeleteClick={handleDeleteAllowance}
                onDeactivateClick={handleDeactivateAllowance}
                isDeletePending={deleteAllowanceMutation.isPending}
                isDeactivatePending={deactivateAllowanceMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Add KABISA Payment Method Dialog */}
        <Dialog open={isAddKabisaOpen} onOpenChange={setIsAddKabisaOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add KABISA Payment Method</DialogTitle>
              <DialogDescription>
                Add a KABISA payment method for this vehicle
              </DialogDescription>
            </DialogHeader>
            <Form {...kabisaForm}>
              <form onSubmit={kabisaForm.handleSubmit(handleAddKabisa)} className="space-y-4">
                <FormField
                  control={kabisaForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Set as Default</FormLabel>
                        <FormDescription>
                          This payment method will be used by default for charging
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={kabisaForm.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the initial balance in RWF
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={kabisaForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Currency for the payment method
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddKabisaOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addKabisaMutation.isPending}>
                    {addKabisaMutation.isPending ? 'Adding...' : 'Add Payment Method'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add MOMO Payment Method Dialog */}
        <Dialog open={isAddMomoOpen} onOpenChange={setIsAddMomoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MOMO Payment Method</DialogTitle>
              <DialogDescription>
                Add a Mobile Money payment method for this vehicle
              </DialogDescription>
            </DialogHeader>
            <Form {...momoForm}>
              <form onSubmit={momoForm.handleSubmit(handleAddMomo)} className="space-y-4">
                <FormField
                  control={momoForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Set as Default</FormLabel>
                        <FormDescription>
                          This payment method will be used by default for charging
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={momoForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+250788123456"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the mobile money phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={momoForm.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MTN">MTN</SelectItem>
                          <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                          <SelectItem value="TIGO">TIGO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the mobile network
                      </FormDescription>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddMomoOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addMomoMutation.isPending}>
                    {addMomoMutation.isPending ? 'Adding...' : 'Add Payment Method'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Free Charging Allowance Dialog */}
        <Dialog open={isAddAllowanceOpen || !!editingAllowance} onOpenChange={(open) => {
          if (!open) {
            setIsAddAllowanceOpen(false)
            setEditingAllowance(null)
            freeChargingForm.reset()
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAllowance ? 'Edit' : 'Add'} Free Charging Allowance</DialogTitle>
              <DialogDescription>
                {editingAllowance ? 'Update the' : 'Add a'} free charging allowance for this vehicle
              </DialogDescription>
            </DialogHeader>
            <FreeChargingAllowanceForm
              form={freeChargingForm}
              chargers={chargers}
              chargersLoading={chargersLoading}
              chargerSearchTerm={chargerSearchTerm}
              onChargerSearchChange={setChargerSearchTerm}
              onSubmit={handleAddAllowance}
              onCancel={() => {
                setIsAddAllowanceOpen(false)
                setEditingAllowance(null)
                freeChargingForm.reset()
              }}
              isSubmitting={addAllowanceMutation.isPending || updateAllowanceMutation.isPending}
              isEdit={!!editingAllowance}
              idPrefix="individual"
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteConfirmOpen}
          onClose={cancelDelete}
          onConfirm={confirmDeleteAllowance}
          title="Delete Free Charging Allowance"
          description={
            allowanceToDelete
              ? `Are you sure you want to delete this free charging allowance? This action cannot be undone.`
              : undefined
          }
          isLoading={deleteAllowanceMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
