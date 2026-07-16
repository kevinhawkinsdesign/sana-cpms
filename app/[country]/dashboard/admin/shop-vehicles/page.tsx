'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
  Car,
  Pencil,
  Store,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getShopVehicles,
  createShopVehicle,
  updateShopVehicle,
  deleteShopVehicle,
  type ShopVehicleCreateData,
} from '@/lib/api/admin'
import { IShopVehicle, ShopVehicleCategory, ShopVehicleClassification, ShopVehicleKabisaProduct } from '@/types/shop'
import { StatCard } from '@/components/shared/StatCard'
import ImageUpload from '@/components/ui/image-upload'
import { ScrollArea } from "@/components/ui/scroll-area"

const CLASSIFICATION_LABELS: Record<string, string> = {
  SEDAN: 'Sedan',
  COMPACT_SUV: 'Compact SUV',
  SUV: 'SUV',
  PICKUP: 'Pickup',
  VAN: 'Van',
  LIGHT_DUTY_TRUCK: 'Light Duty Truck',
  TRUCK: 'Truck',
  REFRIGERATED: 'Refrigerated',
  BUS: 'Bus',
}

const KABISA_PRODUCT_LABELS: Record<string, string> = {
  CORE: 'Core',
  NON_CORE: 'Non-Core',
  OTHERS: 'Others',
  ALTERNATIVE: 'Alternative',
}

const initialFormState: ShopVehicleCreateData = {
  shopId: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  trim: [],
  category: 'PASSENGER',
  classification: 'SEDAN',
  kabisaProduct: 'CORE',
  range: 0,
  price: 0,
  currency: 'RWF',
  optionalExtras: [],
  doors: 4,
  seats: 5,
  storageCapacity: 0,
  storageCapacityUnit: 'L',
  details: '',
  mainImage: '',
  orderImage: '',
  additionalImages: [],
  batteryCapacity: 0,
  availableColors: [],
  country: 'RW',
}

const AdminShopVehiclesPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'PASSENGER' | 'COMMERCIAL'>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<IShopVehicle | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<IShopVehicle | null>(null)
  const [form, setForm] = useState<ShopVehicleCreateData>({ ...initialFormState })

  // Temp state for array inputs
  const [trimInput, setTrimInput] = useState('')
  const [extrasInput, setExtrasInput] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorImageUrl, setColorImageUrl] = useState('')

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['admin-shop-vehicles'],
    queryFn: getShopVehicles,
  })

  const createMutation = useMutation({
    mutationFn: createShopVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-vehicles'] })
      toast.success('Vehicle created successfully')
      closeForm()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create vehicle')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopVehicleCreateData> }) =>
      updateShopVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-vehicles'] })
      toast.success('Vehicle updated successfully')
      closeForm()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vehicle')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteShopVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-vehicles'] })
      toast.success('Vehicle deactivated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate vehicle')
    },
  })

  const vehicles: IShopVehicle[] = vehiclesData?.data?.shopVehicles || []

  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.isActive).length,
    passenger: vehicles.filter((v) => v.category === 'PASSENGER').length,
    commercial: vehicles.filter((v) => v.category === 'COMMERCIAL').length,
  }

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.classification?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    if (!isLoading && user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingVehicle(null)
    setForm({ ...initialFormState })
    setTrimInput('')
    setExtrasInput('')
    setColorName('')
    setColorImageUrl('')
  }

  const openCreateForm = () => {
    setEditingVehicle(null)
    setForm({ ...initialFormState })
    setIsFormOpen(true)
  }

  const openEditForm = (vehicle: IShopVehicle) => {
    setEditingVehicle(vehicle)
    setForm({
      shopId: vehicle.shopId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim || [],
      category: vehicle.category,
      classification: vehicle.classification,
      kabisaProduct: vehicle.kabisaProduct,
      range: vehicle.range,
      price: vehicle.price,
      currency: vehicle.currency || 'RWF',
      optionalExtras: vehicle.optionalExtras || [],
      doors: vehicle.doors,
      seats: vehicle.seats,
      storageCapacity: vehicle.storageCapacity,
      storageCapacityUnit: vehicle.storageCapacityUnit || 'L',
      details: vehicle.details,
      mainImage: vehicle.mainImage,
      orderImage: vehicle.orderImage || '',
      additionalImages: vehicle.additionalImages || [],
      batteryCapacity: vehicle.batteryCapacity,
      availableColors: vehicle.availableColors?.map((c) => ({ color: c.color, imageUrl: c.imageUrl })) || [],
      country: vehicle.country || 'RW',
    })
    setIsFormOpen(true)
  }

  const handleSubmit = () => {
    if (!form.make || !form.model || !form.mainImage || !form.details) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.availableColors.length === 0) {
      toast.error('Please add at least one available color')
      return
    }

    if (editingVehicle) {
      const { shopId, ...updateData } = form
      updateMutation.mutate({ id: editingVehicle.id, data: updateData })
    } else {
      if (!form.shopId) {
        toast.error('Shop ID is required')
        return
      }
      createMutation.mutate(form)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to deactivate this vehicle?')) {
      deleteMutation.mutate(id)
    }
  }

  const addTrim = () => {
    if (trimInput.trim()) {
      setForm((f) => ({ ...f, trim: [...(f.trim || []), trimInput.trim()] }))
      setTrimInput('')
    }
  }

  const removeTrim = (index: number) => {
    setForm((f) => ({ ...f, trim: (f.trim || []).filter((_, i) => i !== index) }))
  }

  const addExtra = () => {
    if (extrasInput.trim()) {
      setForm((f) => ({ ...f, optionalExtras: [...(f.optionalExtras || []), extrasInput.trim()] }))
      setExtrasInput('')
    }
  }

  const removeExtra = (index: number) => {
    setForm((f) => ({ ...f, optionalExtras: (f.optionalExtras || []).filter((_, i) => i !== index) }))
  }

  const addColor = () => {
    if (colorName.trim() && colorImageUrl.trim()) {
      setForm((f) => ({
        ...f,
        availableColors: [...f.availableColors, { color: colorName.trim(), imageUrl: colorImageUrl.trim() }],
      }))
      setColorName('')
      setColorImageUrl('')
    }
  }

  const removeColor = (index: number) => {
    setForm((f) => ({ ...f, availableColors: f.availableColors.filter((_, i) => i !== index) }))
  }

  const handleImageChange = (name: string, url: string) => {
    if (name === 'mainImage') {
      setForm((f) => ({ ...f, mainImage: url }))
    } else if (name === 'orderImage') {
      setForm((f) => ({ ...f, orderImage: url }))
    } else if (name === 'colorImage') {
      setColorImageUrl(url)
    } else if (name.startsWith('additionalImage-')) {
      // Adding a new additional image
      if (url) {
        setForm((f) => ({ ...f, additionalImages: [...(f.additionalImages || []), url] }))
      }
    }
  }

  const removeAdditionalImage = (index: number) => {
    setForm((f) => ({
      ...f,
      additionalImages: (f.additionalImages || []).filter((_, i) => i !== index),
    }))
  }

  if (isLoading) return null

  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'RWF',
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop Vehicles</h1>
          <p className="text-gray-600 mt-2">
            Manage vehicles listed for sale on the shop
          </p>
        </div>
        <Button onClick={openCreateForm} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vehicles"
          value={stats.total}
          description={`${stats.total} vehicles listed`}
          icon={<Car className="h-4 w-4 text-white" />}
          color="bg-blue-600"
          isLoading={vehiclesLoading}
        />
        <StatCard
          title="Active"
          value={stats.active}
          description={`${stats.active} currently active`}
          icon={<Store className="h-4 w-4 text-white" />}
          color="bg-green-600"
          isLoading={vehiclesLoading}
        />
        <StatCard
          title="Passenger"
          value={stats.passenger}
          description="Passenger vehicles"
          icon={<Car className="h-4 w-4 text-white" />}
          color="bg-purple-600"
          isLoading={vehiclesLoading}
        />
        <StatCard
          title="Commercial"
          value={stats.commercial}
          description="Commercial vehicles"
          icon={<Car className="h-4 w-4 text-white" />}
          color="bg-orange-600"
          isLoading={vehiclesLoading}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            All Shop Vehicles
          </CardTitle>
          <CardDescription>
            Vehicles available for sale on the website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by make, model, or classification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCategoryFilter('all')}>All Categories</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCategoryFilter('PASSENGER')}>Passenger</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCategoryFilter('COMMERCIAL')}>Commercial</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="bg-gray-50">Vehicle</TableHead>
                    <TableHead className="bg-gray-50">Category</TableHead>
                    <TableHead className="bg-gray-50">Classification</TableHead>
                    <TableHead className="bg-gray-50">Price</TableHead>
                    <TableHead className="bg-gray-50">Range</TableHead>
                    <TableHead className="bg-gray-50">Battery</TableHead>
                    <TableHead className="bg-gray-50">Status</TableHead>
                    <TableHead className="bg-gray-50 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Car className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No vehicles found</p>
                        {searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your search terms</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(vehicle.orderImage || vehicle.mainImage) ? (
                              <img
                                src={vehicle.orderImage || vehicle.mainImage}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Car className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                              <div className="text-sm text-gray-500">{vehicle.year}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vehicle.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{CLASSIFICATION_LABELS[vehicle.classification] || vehicle.classification}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{formatPrice(vehicle.price, vehicle.currency)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{vehicle.range} km</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{vehicle.batteryCapacity} kWh</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                            {vehicle.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedVehicle(vehicle); setIsDetailsOpen(true) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditForm(vehicle)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Vehicle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(vehicle.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
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

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
            <DialogDescription>
              {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.year})` : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedVehicle && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Main Image */}
                {selectedVehicle.mainImage && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={selectedVehicle.mainImage}
                      alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Make</Label>
                    <p className="text-sm font-medium">{selectedVehicle.make}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Model</Label>
                    <p className="text-sm font-medium">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Year</Label>
                    <p className="text-sm font-medium">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Category</Label>
                    <p className="text-sm font-medium">{selectedVehicle.category}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Classification</Label>
                    <p className="text-sm font-medium">{CLASSIFICATION_LABELS[selectedVehicle.classification] || selectedVehicle.classification}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Kabisa Product</Label>
                    <p className="text-sm font-medium">{KABISA_PRODUCT_LABELS[selectedVehicle.kabisaProduct] || selectedVehicle.kabisaProduct}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Price</Label>
                    <p className="text-sm font-medium">{formatPrice(selectedVehicle.price, selectedVehicle.currency)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Range</Label>
                    <p className="text-sm font-medium">{selectedVehicle.range} km</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Battery Capacity</Label>
                    <p className="text-sm font-medium">{selectedVehicle.batteryCapacity} kWh</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Doors</Label>
                    <p className="text-sm font-medium">{selectedVehicle.doors}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Seats</Label>
                    <p className="text-sm font-medium">{selectedVehicle.seats}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Storage</Label>
                    <p className="text-sm font-medium">{selectedVehicle.storageCapacity} {selectedVehicle.storageCapacityUnit}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Country</Label>
                    <p className="text-sm font-medium">{selectedVehicle.country}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <Badge variant={selectedVehicle.isActive ? "default" : "secondary"}>
                      {selectedVehicle.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {selectedVehicle.trim && selectedVehicle.trim.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Trim Options</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedVehicle.trim.map((t, i) => (
                        <Badge key={i} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVehicle.optionalExtras && selectedVehicle.optionalExtras.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Optional Extras</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedVehicle.optionalExtras.map((e, i) => (
                        <Badge key={i} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-500">Details</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedVehicle.details}</p>
                </div>

                {selectedVehicle.availableColors && selectedVehicle.availableColors.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Available Colors</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {selectedVehicle.availableColors.map((c, i) => (
                        <div key={i} className="border rounded-lg p-2">
                          {c.imageUrl && (
                            <img src={c.imageUrl} alt={c.color} className="w-full h-20 object-cover rounded mb-1" />
                          )}
                          <p className="text-xs text-center font-medium">{c.color}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVehicle.additionalImages && selectedVehicle.additionalImages.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Additional Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {selectedVehicle.additionalImages.map((img, i) => (
                        <img key={i} src={img} alt={`Additional ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Update the vehicle details below.' : 'Fill in the details to list a new vehicle for sale.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
                {!editingVehicle && (
                  <div className="space-y-1">
                    <Label>Shop ID <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter shop UUID"
                      value={form.shopId}
                      onChange={(e) => setForm((f) => ({ ...f, shopId: e.target.value }))}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Make <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. BYD"
                      value={form.make}
                      onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Model <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. Atto 3"
                      value={form.model}
                      onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Year <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={1900}
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Category <span className="text-red-500">*</span></Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASSENGER">Passenger</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Classification <span className="text-red-500">*</span></Label>
                    <Select value={form.classification} onValueChange={(v) => setForm((f) => ({ ...f, classification: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Kabisa Product <span className="text-red-500">*</span></Label>
                    <Select value={form.kabisaProduct} onValueChange={(v) => setForm((f) => ({ ...f, kabisaProduct: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(KABISA_PRODUCT_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Specifications</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Range (km) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.range}
                      onChange={(e) => setForm((f) => ({ ...f, range: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Battery (kWh) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.batteryCapacity}
                      onChange={(e) => setForm((f) => ({ ...f, batteryCapacity: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Doors <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.doors}
                      onChange={(e) => setForm((f) => ({ ...f, doors: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Seats <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.seats}
                      onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Storage Capacity <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.storageCapacity}
                      onChange={(e) => setForm((f) => ({ ...f, storageCapacity: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Storage Unit</Label>
                    <Select value={form.storageCapacityUnit || 'L'} onValueChange={(v) => setForm((f) => ({ ...f, storageCapacityUnit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Liters (L)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="m3">Cubic Meters (m3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input
                      placeholder="RW"
                      value={form.country || ''}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Price <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select value={form.currency || 'RWF'} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RWF">RWF</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1">
                <Label>Details <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Vehicle details and description..."
                  rows={4}
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                />
              </div>

              {/* Trim Options */}
              <div className="space-y-2">
                <Label>Trim Options</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a trim option"
                    value={trimInput}
                    onChange={(e) => setTrimInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrim(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addTrim}>Add</Button>
                </div>
                {form.trim && form.trim.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.trim.map((t, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {t}
                        <button onClick={() => removeTrim(i)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Extras */}
              <div className="space-y-2">
                <Label>Optional Extras</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an optional extra"
                    value={extrasInput}
                    onChange={(e) => setExtrasInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addExtra}>Add</Button>
                </div>
                {form.optionalExtras && form.optionalExtras.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.optionalExtras.map((e, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {e}
                        <button onClick={() => removeExtra(i)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ImageUpload
                    name="mainImage"
                    label="Main Image"
                    currentImage={form.mainImage || null}
                    onImageChange={handleImageChange}
                    isRequired={true}
                    uploadContext="product-main"
                    entityId={editingVehicle?.id}
                  />
                  <ImageUpload
                    name="orderImage"
                    label="Order Image"
                    currentImage={form.orderImage || null}
                    onImageChange={handleImageChange}
                    isRequired={false}
                    uploadContext="product-order"
                    entityId={editingVehicle?.id}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Additional Images</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {(form.additionalImages || []).map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt={`Additional ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => removeAdditionalImage(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <ImageUpload
                      key={`add-img-${(form.additionalImages || []).length}`}
                      name="additionalImage"
                      label="Add Image"
                      currentImage={null}
                      onImageChange={(_name, url) => {
                        if (url) {
                          setForm((f) => ({ ...f, additionalImages: [...(f.additionalImages || []), url] }))
                        }
                      }}
                      isRequired={false}
                      classNames="!w-24 !h-24 sm:!w-24 sm:!h-24"
                      uploadContext="product-additional"
                      entityId={editingVehicle?.id}
                    />
                  </div>
                </div>
              </div>

              {/* Available Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Available Colors <span className="text-red-500">*</span>
                </h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label>Color Name</Label>
                    <Input
                      placeholder="e.g. Pearl White"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUpload
                      name="colorImage"
                      label="Color Image"
                      currentImage={colorImageUrl || null}
                      onImageChange={handleImageChange}
                      isRequired={false}
                      classNames="!w-20 !h-20 sm:!w-20 sm:!h-20"
                      uploadContext="product-additional"
                      entityId={editingVehicle?.id}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addColor}
                    disabled={!colorName.trim() || !colorImageUrl.trim()}
                    className="mb-4"
                  >
                    Add
                  </Button>
                </div>
                {form.availableColors.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {form.availableColors.map((c, i) => (
                      <div key={i} className="border rounded-lg p-2 relative group">
                        {c.imageUrl && (
                          <img src={c.imageUrl} alt={c.color} className="w-full h-20 object-cover rounded mb-1" />
                        )}
                        <p className="text-xs text-center font-medium">{c.color}</p>
                        <button
                          onClick={() => removeColor(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending)
                    ? 'Saving...'
                    : editingVehicle
                      ? 'Update Vehicle'
                      : 'Create Vehicle'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminShopVehiclesPage
