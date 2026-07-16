'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Building2, 
  Car, 
  CreditCard, 
  FileText, 
  Users, 
  Calendar,
  DollarSign,
  Battery,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Tag,
  Briefcase,
  User,
  Hash,
  Search,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { addBusinessContract, getBusiness, unassignVehicleFromBusiness, updateBusinessContract, type Business } from '@/lib/api/adminBusiness'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { VehicleManagementModal } from './VehicleManagementModal'
import { EditBusinessModal } from './EditBusinessModal'
import { EditVehicleModal } from './EditVehicleModal'
import { PricingStartChip } from './PricingStartChip'
import { BulkAddVehiclesModal } from './BulkAddVehiclesModal'
import { LicensePlateBadge } from '@/components/ui/LicensePlateBadge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface BusinessDetailsProps {
  businessId: string
  onBack: () => void
  onEditBusiness: (business: Business) => void
  onAddVehicle: (businessId: string, businessName: string) => void
  onViewVehicle?: (businessId: string, vehicleId: string) => void
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const addContractSchema = z.object({
  contractName: z.string().min(2, 'Contract name must be at least 2 characters'),
  invoicingDateOfTheMonth: z
    .number()
    .int('Invoicing date must be a whole number')
    .min(1, 'Invoicing date must be between 1 and 31')
    .max(31, 'Invoicing date must be between 1 and 31'),
  defaultPricingTiers: z
    .array(
      z.object({
        minKwh: z.number().min(0, 'Minimum KWH must be 0 or greater'),
        maxKwh: z.number().optional(),
        ratePerKwh: z.number().min(0.01, 'Rate per KWH must be greater than 0'),
      })
    )
    .min(1, 'At least one pricing tier is required'),
})

type AddContractFormData = z.infer<typeof addContractSchema>

export const BusinessDetails: React.FC<BusinessDetailsProps> = ({
  businessId,
  onBack,
  onEditBusiness,
  onAddVehicle,
  onViewVehicle
}) => {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const openContractParam = searchParams?.get('openContract')
  const [activeTab, setActiveTab] = useState('vehicles')
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [vehicleModalInitialTab, setVehicleModalInitialTab] = useState<'payment-methods' | 'free-charging'>('payment-methods')
  const [vehicleToEdit, setVehicleToEdit] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('')
  const debouncedVehicleSearch = useDebouncedValue(vehicleSearchTerm, 300)
  const [vehicleToUnassign, setVehicleToUnassign] = useState<{ id: string; make: string; model: string; licensePlate?: string } | null>(null)
  const [isAddContractOpen, setIsAddContractOpen] = useState(false)
  const [contractDialogMode, setContractDialogMode] = useState<'add' | 'edit'>('add')
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false)

  const addContractForm = useForm<AddContractFormData>({
    resolver: zodResolver(addContractSchema),
    defaultValues: {
      contractName: '',
      invoicingDateOfTheMonth: 1,
      defaultPricingTiers: [{ minKwh: 0, maxKwh: undefined, ratePerKwh: 0.5 }],
    },
  })

  // Unassign vehicle mutation
  const unassignVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => unassignVehicleFromBusiness(businessId, { vehicleId }),
    onSuccess: (response) => {
      toast.success(response.message || 'Vehicle unassigned successfully')
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      setVehicleToUnassign(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unassign vehicle')
      setVehicleToUnassign(null)
    }
  })

  const addContractMutation = useMutation({
    mutationFn: (data: AddContractFormData) => addBusinessContract(businessId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      setIsAddContractOpen(false)
      addContractForm.reset()
      const assignedVehicleCount = response.data.assignedVehicleCount || 0
      toast.success(
        assignedVehicleCount > 0
          ? `Contract added successfully. ${assignedVehicleCount} vehicle(s) assigned.`
          : 'Contract added successfully'
      )
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add contract')
    },
  })

  const updateContractMutation = useMutation({
    mutationFn: (data: AddContractFormData) => updateBusinessContract(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      setIsAddContractOpen(false)
      addContractForm.reset()
      toast.success('Contract updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update contract')
    },
  })

  const handleUnassignVehicle = (vehicle: any) => {
    setVehicleToUnassign({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      licensePlate: vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber
    })
  }

  const confirmUnassignVehicle = () => {
    if (vehicleToUnassign) {
      unassignVehicleMutation.mutate(vehicleToUnassign.id)
    }
  }

  const { data: businessData, isLoading, error } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => getBusiness(businessId),
    enabled: !!businessId
  })

  const business = businessData?.data?.business

  const handleViewVehicle = (vehicle: any, tab: 'payment-methods' | 'free-charging' = 'payment-methods') => {
    setVehicleModalInitialTab(tab)
    setSelectedVehicle(vehicle)
    setIsVehicleModalOpen(true)
  }

  const handleCloseVehicleModal = () => {
    setIsVehicleModalOpen(false)
    setSelectedVehicle(null)
  }

  const handleEditBusiness = () => {
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
  }

  const handleEditSuccess = (updatedBusiness: Business) => {
    // Invalidate and refetch the business data
    queryClient.invalidateQueries({ queryKey: ['business', businessId] })
    setIsEditModalOpen(false)
  }

  const handleOpenAddContract = () => {
    if (!business) return
    setContractDialogMode('add')
    addContractForm.reset({
      contractName: business.name,
      invoicingDateOfTheMonth: 1,
      defaultPricingTiers: [{ minKwh: 0, maxKwh: undefined, ratePerKwh: 0.5 }],
    })
    setIsAddContractOpen(true)
  }

  const handleOpenEditContract = () => {
    if (!business) return
    setContractDialogMode('edit')
    addContractForm.reset({
      contractName: business.businessPaymentContract?.contractName || business.name,
      invoicingDateOfTheMonth: business.businessPaymentContract?.invoicingDateOfTheMonth || 1,
      defaultPricingTiers:
        business.defaultPricingTiers && business.defaultPricingTiers.length > 0
          ? business.defaultPricingTiers.map((tier) => ({
              minKwh: tier.minKwh,
              maxKwh: tier.maxKwh,
              ratePerKwh: tier.ratePerKwh,
            }))
          : [{ minKwh: 0, maxKwh: undefined, ratePerKwh: 0.5 }],
    })
    setIsAddContractOpen(true)
  }

  const handleCloseAddContract = () => {
    setIsAddContractOpen(false)
    addContractForm.reset()
  }

  const handleAddContractSubmit = (data: AddContractFormData) => {
    if (contractDialogMode === 'edit') {
      updateContractMutation.mutate(data)
      return
    }
    addContractMutation.mutate(data)
  }

  const addContractPricingTier = () => {
    const currentTiers = addContractForm.getValues('defaultPricingTiers')
    const lastTier = currentTiers[currentTiers.length - 1]
    const nextMin = typeof lastTier?.maxKwh === 'number' ? lastTier.maxKwh : (lastTier?.minKwh ?? 0) + 100

    addContractForm.setValue('defaultPricingTiers', [
      ...currentTiers,
      { minKwh: nextMin, maxKwh: undefined, ratePerKwh: 0.5 },
    ])
  }

  const removeContractPricingTier = (index: number) => {
    const currentTiers = addContractForm.getValues('defaultPricingTiers')
    if (currentTiers.length <= 1) return
    addContractForm.setValue(
      'defaultPricingTiers',
      currentTiers.filter((_, i) => i !== index)
    )
  }

  // Auto-open the contract editor when ?openContract=1 is present
  const [didAutoOpenContract, setDidAutoOpenContract] = useState(false)
  useEffect(() => {
    if (!business || didAutoOpenContract || openContractParam !== '1') return
    setActiveTab('contract')
    if (business.businessPaymentContract) {
      handleOpenEditContract()
    } else {
      handleOpenAddContract()
    }
    setDidAutoOpenContract(true)
  }, [business, openContractParam, didAutoOpenContract])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !business) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-600">Failed to load business details.</p>
          <p className="text-sm text-gray-500 mt-1">Please try again or go back to the list.</p>
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Filter vehicles based on debounced search term
  const filteredVehicles = business.vehicleOwnerships?.filter(ownership => {
    const vehicle = ownership.vehicle;
    const searchLower = debouncedVehicleSearch.trim().toLowerCase();
    if (!searchLower) return true;
    return (
      (vehicle.make && vehicle.make.toLowerCase().includes(searchLower)) ||
      (vehicle.model && vehicle.model.toLowerCase().includes(searchLower)) ||
      (vehicle.kabisaId && vehicle.kabisaId.toLowerCase().includes(searchLower)) ||
      (vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber &&
       `${vehicle.vehicleLicensePlates[0].licencePlateNumber}`.toLowerCase().includes(searchLower))
    );
  }) || [];

  const totalVehicles = business.vehicleOwnerships?.length || 0
  const totalPayments = business.paymentMethods?.length || 0
  const totalUsers = business.businessUsers?.length || 0
  const totalInvoices = business.businessPaymentContractInvoices?.length || 0
  const totalPricingTiers = business.defaultPricingTiers?.length || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="rounded-full h-10 w-10 p-0 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {business.imageUrl ? (
              <img src={business.imageUrl} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="text-base text-gray-600">TIN: {business.tin}</p>
              <PricingStartChip
                tiers={business.defaultPricingTiers}
                size="md"
                onManage={business.businessPaymentContract ? handleOpenEditContract : handleOpenAddContract}
                manageLabel={business.businessPaymentContract ? 'Edit Pricing' : 'Add Contract'}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
        
          <Button variant="outline" onClick={handleEditBusiness}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Professional Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vehicles</CardTitle>
            <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
              <Car className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{business.vehicleOwnerships?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Registered vehicles</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payments</CardTitle>
            <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{business.paymentMethods?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Payment methods</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Users</CardTitle>
            <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{business.businessUsers?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Created</CardTitle>
            <div className="h-8 w-8 rounded bg-white flex items-center justify-center">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {new Date(business.createdAt).toLocaleDateString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Registration date</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger
            value="vehicles"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <Car className="h-4 w-4" />
            Vehicles
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              {totalVehicles}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="contract"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <FileText className="h-4 w-4" />
            Contract
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
              {totalPricingTiers}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Payments
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
              {totalPayments}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <Users className="h-4 w-4" />
            Users
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
              {totalUsers}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            Invoices
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold">
              {totalInvoices}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <Briefcase className="h-5 w-5 text-kabisa-blue" />
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="h-4 w-4" /> Name</span>
                  <span className="font-semibold">{business.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600"><Tag className="h-4 w-4" /> TIN</span>
                  <span className="font-semibold">{business.tin}</span>
                </div>
                {business.businessPaymentContract && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600"><FileText className="h-4 w-4" /> Contract</span>
                      <span className="font-semibold">{business.businessPaymentContract.contractName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4" /> Invoicing Date</span>
                      <span className="font-semibold">{business.businessPaymentContract.invoicingDateOfTheMonth}th of month</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4" /> Created On</span>
                  <span className="font-semibold">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 text-kabisa-blue" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-gray-800">Business registered</p>
                      <p className="text-sm text-gray-500">Activated on {new Date(business.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-kabisa-blue flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-gray-800">{business.vehicleOwnerships?.length || 0} vehicles</p>
                      <p className="text-sm text-gray-500">{business.vehicleOwnerships?.length || 0} vehicles registered</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-purple-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-gray-800">{business.paymentMethods?.length || 0} payment methods</p>
                      <p className="text-sm text-gray-500">Payment options available</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Vehicles ({filteredVehicles.length} of {totalVehicles})
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage vehicles assigned to this business.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Button onClick={() => onAddVehicle(business.id, business.name)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>
          </div>

          {/* Debounced search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by model, make, kabisa ID, or license plate..."
                  value={vehicleSearchTerm}
                  onChange={(e) => setVehicleSearchTerm(e.target.value)}
                  className="pl-9 pr-9 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {vehicleSearchTerm && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setVehicleSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredVehicles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((ownership) => {
                const v = ownership.vehicle
                const plate = v.vehicleLicensePlates?.[0]?.licencePlateNumber
                const allowance = v.freeChargingAllowances?.[0]
                return (
                  <Card
                    key={ownership.id}
                    className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {v.imageUrl ? (
                      <div className="relative h-32 w-full bg-gray-100">
                        <img
                          src={v.imageUrl}
                          alt={`${v.make} ${v.model}`}
                          className="h-full w-full object-cover"
                        />
                        {plate && (
                          <div className="absolute top-2 right-2">
                            <LicensePlateBadge plate={String(plate)} size="sm" />
                          </div>
                        )}
                      </div>
                    ) : null}

                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        {!v.imageUrl && (
                          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {v.make} {v.model}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono">ID: {v.kabisaId}</p>
                        </div>
                      </div>
                      {!v.imageUrl && plate && (
                        <div className="flex justify-center pt-1">
                          <LicensePlateBadge plate={String(plate)} size="md" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleViewVehicle(v, 'free-charging')}
                        className="w-full text-left rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 hover:border-blue-300 hover:bg-blue-50/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Manage free charging"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <DollarSign className="h-3.5 w-3.5" />
                          Free Charging
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {allowance
                            ? allowance.isUnlimited
                              ? 'Unlimited'
                              : `${allowance.remainingCount} left`
                            : 'Add allowance'}
                        </div>
                      </button>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVehicle(v)}
                          className="flex-1"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVehicleToEdit(v)}
                          className="text-gray-700 hover:text-blue-700 hover:border-blue-300"
                          aria-label="Edit vehicle"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassignVehicle(v)}
                          disabled={unassignVehicleMutation.isPending}
                          className="text-gray-700 hover:text-red-600 hover:border-red-300"
                          aria-label="Delete vehicle"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : debouncedVehicleSearch ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <Search className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No vehicles found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search terms</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <Car className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No vehicles</p>
                <p className="text-sm text-gray-500 mt-1">Add vehicles to this business</p>
                <Button
                  onClick={() => onAddVehicle(business.id, business.name)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Payment Methods ({business.paymentMethods?.length || 0})</h3>
          
          <Separator />
          
          {business.paymentMethods && business.paymentMethods.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">
                  Payment Methods ({business.paymentMethods.length} {business.paymentMethods.length === 1 ? 'method' : 'methods'})
                </h3>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Type</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Provider</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Balance</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Currency</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Default</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Status</TableHead>
                    <TableHead className="font-medium text-gray-700 py-3 text-sm">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {business.paymentMethods.map((method, index) => (
                    <TableRow 
                      key={method.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded flex items-center justify-center ${
                            method.paymentMethodType === 'KABISA' ? 'bg-blue-100' :
                            method.paymentMethodType === 'CONTRACT' ? 'bg-purple-100' :
                            'bg-green-100'
                          }`}>
                            <CreditCard className={`h-4 w-4 ${
                              method.paymentMethodType === 'KABISA' ? 'text-blue-600' :
                              method.paymentMethodType === 'CONTRACT' ? 'text-purple-600' :
                              'text-green-600'
                            }`} />
                          </div>
                          <Badge variant="outline" className={`text-xs px-2 py-1 ${
                            method.paymentMethodType === 'KABISA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            method.paymentMethodType === 'CONTRACT' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {method.paymentMethodType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-900">
                          {method.paymentProviderName || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        {method.balance !== undefined && method.balance !== null ? (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {method.balance.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-900">{method.currency || '-'}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        {method.isDefault ? (
                          <Badge className="bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 text-xs">
                            Default
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge 
                          className={`font-semibold text-xs px-2 py-1 ${
                            method.isActive 
                            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' 
                            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                          }`}
                        >
                          {method.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">
                          {method.createdAt ? new Date(method.createdAt).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No payment methods found.</p>
                <p className="text-sm text-gray-500 mt-1">This business has no payment methods configured.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Business Users ({business.businessUsers?.length || 0})</h3>
          
          <Separator />
          
          {business.businessUsers && business.businessUsers.length > 0 ? (
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {business.businessUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-25 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-kabisa-blue/10 flex items-center justify-center text-kabisa-blue font-semibold flex-shrink-0">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell className="text-gray-600">{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`font-semibold text-sm px-3 py-1 ${
                          user.isActive 
                          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' 
                          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No users found for this business.</p>
                <p className="text-sm text-gray-500 mt-1">This business currently has no registered users.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Payment Invoices ({business.businessPaymentContractInvoices?.length || 0})</h3>
          
          <Separator />
          
          {business.businessPaymentContractInvoices && business.businessPaymentContractInvoices.length > 0 ? (
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {business.businessPaymentContractInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-gray-25 transition-colors">
                    <TableCell className="font-medium text-gray-900">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">{invoice.amount.toFixed(2)} RWF</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`font-semibold text-sm px-3 py-1 ${
                          invoice.status === 'PAID' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 
                          invoice.status === 'PENDING' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20' : 
                          'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-kabisa-blue">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No invoices have been generated.</p>
                <p className="text-sm text-gray-500 mt-1">This business has no outstanding or paid invoices.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contract" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Contract & Pricing</h3>
            {business.businessPaymentContract ? (
              <Button variant="outline" onClick={handleOpenEditContract}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
            ) : (
              <Button onClick={handleOpenAddContract}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contract
              </Button>
            )}
          </div>
          
          <Separator />
          
          {business.businessPaymentContract ? (
            <div className="space-y-6">
              {/* Contract Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <FileText className="h-5 w-5 text-kabisa-blue" />
                    Contract Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" /> Contract Name
                      </span>
                      <span className="font-semibold text-gray-900">
                        {business.businessPaymentContract.contractName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" /> Invoicing Date
                      </span>
                      <span className="font-semibold text-gray-900">
                        {business.businessPaymentContract.invoicingDateOfTheMonth}th of month
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Tiers */}
              {business.defaultPricingTiers && business.defaultPricingTiers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                      <DollarSign className="h-5 w-5 text-kabisa-blue" />
                      Pricing Tiers
                    </CardTitle>
                    <CardDescription>
                      Configured pricing structure for different consumption levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {business.defaultPricingTiers.map((tier, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Min KWH</div>
                            <div className="text-sm font-medium text-gray-900">{tier.minKwh}</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Max KWH</div>
                            <div className="text-sm font-medium text-gray-900">
                              {tier.maxKwh ? tier.maxKwh : 'No limit'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Rate per KWH</div>
                            <div className="text-sm font-medium text-gray-900">
                              {tier.ratePerKwh} RWF
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Tier Range</div>
                            <div className="text-sm font-medium text-gray-900">
                              {tier.maxKwh 
                                ? `${tier.minKwh} - ${tier.maxKwh} kWh`
                                : `${tier.minKwh}+ kWh`
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-8 h-64 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No contract found for this business.</p>
                <p className="text-sm text-gray-500 mt-1">This business has no active contract or pricing configuration.</p>
                <Button onClick={handleOpenAddContract} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contract
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isAddContractOpen} onOpenChange={(open) => !open && handleCloseAddContract()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contractDialogMode === 'edit' ? 'Edit Business Contract' : 'Add Business Contract'}</DialogTitle>
            <DialogDescription>
              {contractDialogMode === 'edit'
                ? 'Update contract and pricing tiers for this business.'
                : 'Create a contract for this business. All vehicles currently owned by this business will be assigned to the contract.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...addContractForm}>
            <form onSubmit={addContractForm.handleSubmit(handleAddContractSubmit)} className="space-y-4">
              <FormField
                control={addContractForm.control}
                name="contractName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contract name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addContractForm.control}
                name="invoicingDateOfTheMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoicing Date (Day of Month)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addContractForm.control}
                name="defaultPricingTiers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Tiers</FormLabel>
                    <div className="space-y-3">
                      {field.value.map((tier, index) => (
                        <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-3">
                          <div>
                            <FormLabel className="text-xs">Min KWH</FormLabel>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={tier.minKwh}
                              onChange={(e) => {
                                const nextTiers = [...field.value]
                                nextTiers[index].minKwh = Number(e.target.value)
                                field.onChange(nextTiers)
                              }}
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">Max KWH (optional)</FormLabel>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={typeof tier.maxKwh === 'number' ? tier.maxKwh : ''}
                              onChange={(e) => {
                                const nextTiers = [...field.value]
                                nextTiers[index].maxKwh = e.target.value ? Number(e.target.value) : undefined
                                field.onChange(nextTiers)
                              }}
                              placeholder="No limit"
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">Rate per KWH</FormLabel>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.ratePerKwh}
                              onChange={(e) => {
                                const nextTiers = [...field.value]
                                nextTiers[index].ratePerKwh = Number(e.target.value)
                                field.onChange(nextTiers)
                              }}
                            />
                          </div>
                          {field.value.length > 1 && (
                            <div className="md:col-span-3 flex justify-end">
                              <Button type="button" variant="outline" size="sm" onClick={() => removeContractPricingTier(index)}>
                                Remove Tier
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addContractPricingTier}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pricing Tier
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseAddContract}
                  disabled={addContractMutation.isPending || updateContractMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addContractMutation.isPending || updateContractMutation.isPending}>
                  {contractDialogMode === 'edit'
                    ? (updateContractMutation.isPending ? 'Saving...' : 'Save Contract')
                    : (addContractMutation.isPending ? 'Adding...' : 'Add Contract')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Management Modal */}
      <VehicleManagementModal
        isOpen={isVehicleModalOpen}
        onClose={handleCloseVehicleModal}
        vehicle={selectedVehicle}
        businessId={businessId}
        initialTab={vehicleModalInitialTab}
      />

      {/* Edit Vehicle Modal */}
      <EditVehicleModal
        isOpen={!!vehicleToEdit}
        onClose={() => setVehicleToEdit(null)}
        businessId={businessId}
        vehicle={vehicleToEdit}
      />

      {/* Bulk Add Vehicles Modal */}
      <BulkAddVehiclesModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        businessId={businessId}
        businessName={business.name}
        existingLicensePlates={
          business.vehicleOwnerships
            ?.flatMap((o) => o.vehicle.vehicleLicensePlates || [])
            .map((p: any) => String(p?.licencePlateNumber ?? ''))
            .filter(Boolean) || []
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['business', businessId] })
          queryClient.invalidateQueries({ queryKey: ['businesses'] })
        }}
      />

      {/* Edit Business Modal */}
      <EditBusinessModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        business={business}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Vehicle Confirmation Dialog */}
      <AlertDialog open={!!vehicleToUnassign} onOpenChange={() => setVehicleToUnassign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-semibold text-gray-900">
                {vehicleToUnassign?.make} {vehicleToUnassign?.model}
              </span>
              {vehicleToUnassign?.licensePlate && (
                <> (License: <span className="font-mono">{vehicleToUnassign.licensePlate}</span>)</>
              )}
              {' '}from this business?
              <br /><br />
              The vehicle's master record is preserved and can be reassigned later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassignVehicleMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassignVehicle}
              disabled={unassignVehicleMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {unassignVehicleMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}