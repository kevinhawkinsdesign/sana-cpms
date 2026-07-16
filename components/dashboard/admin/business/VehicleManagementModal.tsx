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
import { Label } from '@/components/ui/label'
import { FreeChargingAllowanceForm, type FreeChargingFormValues } from '@/components/dashboard/admin/shared/FreeChargingAllowanceForm'
import { FreeChargingAllowancesTabContent } from '@/components/dashboard/admin/shared/FreeChargingAllowancesTabContent'
import {
  formatAdminCurrency,
  getPaymentMethodIcon,
  getPaymentMethodBadgeVariant,
  createHandleAllowance,
} from '@/components/dashboard/admin/shared/vehicleAdminUtils'
import { useVehicleAllowanceManagement } from '@/components/dashboard/admin/shared/useVehicleAllowanceManagement'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  getVehiclePaymentMethods,
  addKabisaPaymentMethod,
  addFreeChargingAllowance,
  updateFreeChargingAllowance,
  deleteFreeChargingAllowance,
  deactivatePaymentMethod,
  type PaymentMethod,
  type FreeChargingAllowance
} from '@/lib/api/adminBusiness'
import { getAllChargers, type Charger } from '@/lib/api/admin'

interface VehicleManagementModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: any
  businessId: string
  initialTab?: 'payment-methods' | 'free-charging'
}

// Form schemas
const kabisaPaymentSchema = z.object({
  isDefault: z.boolean().default(false),
  balance: z.number().min(0, 'Balance must be non-negative'),
  currency: z.string().default('RWF')
})

type KabisaPaymentFormData = z.infer<typeof kabisaPaymentSchema>
type FreeChargingFormData = FreeChargingFormValues

export function VehicleManagementModal({ isOpen, onClose, vehicle, businessId, initialTab = 'payment-methods' }: VehicleManagementModalProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  React.useEffect(() => {
    if (isOpen) setActiveTab(initialTab)
  }, [isOpen, initialTab])
  const [isAddKabisaOpen, setIsAddKabisaOpen] = useState(false)
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
    queryKey: ['vehicle-payment-methods', businessId, vehicle?.id],
    queryFn: () => getVehiclePaymentMethods(businessId, vehicle.id),
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
      addKabisaPaymentMethod(businessId, vehicle.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-payment-methods', businessId, vehicle.id] })
      toast.success(response.message)
      setIsAddKabisaOpen(false)
      kabisaForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Add free charging allowance mutation
  const addAllowanceMutation = useMutation({
    mutationFn: (data: import('@/lib/api/adminBusiness').AddFreeChargingRequest) =>
      addFreeChargingAllowance(businessId, vehicle.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      toast.success(response.message)
      setIsAddAllowanceOpen(false)
      freeChargingForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Update free charging allowance mutation
  const updateAllowanceMutation = useMutation({
    mutationFn: ({ allowanceId, data }: { allowanceId: string; data: import('@/lib/api/adminBusiness').AddFreeChargingRequest }) =>
      updateFreeChargingAllowance(businessId, vehicle.id, allowanceId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
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
      updateFreeChargingAllowance(businessId, vehicle.id, allowanceId, { isUnlimited, isActive: false }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      queryClient.invalidateQueries({ queryKey: ['business-vehicles', businessId] })
      toast.success('Allowance deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Delete free charging allowance mutation
  const deleteAllowanceMutation = useMutation({
    mutationFn: (allowanceId: string) =>
      deleteFreeChargingAllowance(businessId, vehicle.id, allowanceId),
    onSuccess: (response) => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      queryClient.invalidateQueries({ queryKey: ['business-vehicles', businessId] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      // Invalidate all queries that might contain this vehicle's data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey
          return (
            Array.isArray(queryKey) && 
            (queryKey.includes('business') || queryKey.includes('vehicle'))
          )
        }
      })
      // Force a refetch of the current business data
      queryClient.refetchQueries({ queryKey: ['business', businessId] })
      toast.success(response.message)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Delete payment method mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentMethodId: string) => 
      deactivatePaymentMethod(businessId, vehicle.id, paymentMethodId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-payment-methods', businessId, vehicle.id] })
      toast.success(response.message)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  const handleAddKabisa = (data: KabisaPaymentFormData) => {
    addKabisaMutation.mutate(data)
  }

  const handleAddAllowance = createHandleAllowance(
    editingAllowance,
    updateAllowanceMutation.mutate,
    addAllowanceMutation.mutate
  )

  const handleDeletePaymentMethod = (paymentMethodId: string) => {
    if (confirm('Are you sure you want to deactivate this payment method?')) {
      deletePaymentMutation.mutate(paymentMethodId)
    }
  }

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

const formatTierRange = (min: number, max?: number | null) => {
  const pretty = (value: number) => value.toLocaleString()
  if (max === undefined || max === null || max >= 1_000_000) {
    return `${pretty(min)}+`
  }
  return `${pretty(min)} - ${pretty(max)}`
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
            Manage payment methods and free charging allowances for this vehicle
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
                <Button 
                  onClick={() => setIsAddKabisaOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add KABISA Payment
                </Button>
              </div>

              {paymentMethodsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading payment methods...</p>
                  </div>
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method: PaymentMethod) => (
                    <Card key={method.id} className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                              {getPaymentMethodIcon(method.paymentMethodType || 'UNKNOWN')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getPaymentMethodBadgeVariant(method.paymentMethodType || 'UNKNOWN')}>
                                  {method.paymentMethodType || 'Unknown'}
                                </Badge>
                                {method.isDefault && (
                                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {method.paymentProviderName && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {method.paymentProviderName}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs px-3 py-1 ${method.isActive === false ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}`}>
                              {method.isActive === false ? 'Inactive' : 'Active'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePaymentMethod(method.id)}
                              disabled={deletePaymentMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {method.paymentMethodType === 'CONTRACT' && method.businessPaymentContract ? (
                          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Contract</p>
                                <p className="text-lg font-semibold text-gray-900">{method.businessPaymentContract.contractName}</p>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium text-gray-800">Invoice day:</span>{' '}
                                {method.businessPaymentContract.invoicingDateOfTheMonth}th
                              </div>
                            </div>

                            {method.businessPaymentContract.businessPaymentContractPricingDiscounts &&
                              method.businessPaymentContract.businessPaymentContractPricingDiscounts.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pricing tiers</p>
                                <div className="space-y-2">
                                  {method.businessPaymentContract.businessPaymentContractPricingDiscounts
                                    .sort((a, b) => a.order - b.order)
                                    .map((tier) => (
                                      <div
                                        key={tier.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border border-blue-100 bg-white px-3 py-2 text-sm"
                                      >
                                        <span className="font-medium text-gray-800">
                                          {formatTierRange(tier.minKwh, tier.maxKwh)} kWh
                                        </span>
                                        <span className="text-gray-600">
                                          <span className="font-semibold text-blue-700">
                                            {formatAdminCurrency(tier.ratePerKwh, method.currency || 'RWF')}
                                          </span>{' '}
                                          / kWh
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium text-gray-800">Currency:</span> {method.currency || 'RWF'}
                          </div>
                        )}

                        {method.createdAt && (
                          <div className="text-xs text-gray-500">
                            Added on {new Date(method.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600">No payment methods</p>
                    <p className="text-sm text-gray-500 mt-1">Add a KABISA payment method to get started</p>
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
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
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
              idPrefix="business"
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
