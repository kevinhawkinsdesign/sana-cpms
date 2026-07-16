'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Car, 
  User, 
  Edit, 
  AlertCircle,
  CheckCircle,
  X,
  Calendar,
  Battery,
  Tag,
  Phone,
  Mail,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { updateIndividualVehicle, type UpdateIndividualVehicleRequest, type IndividualVehicle } from '@/lib/api/adminIndividual'

interface EditIndividualVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: IndividualVehicle | null
  onSuccess?: () => void
}

// Form schema - matches backend validation exactly
const editVehicleSchema = z.object({
  // Vehicle details
  licensePlate: z.string()
    .min(1, 'License plate is required')
    .max(20, 'License plate must be 20 characters or less'),
  model: z.string()
    .min(1, 'Model is required')
    .max(100, 'Model must be 100 characters or less'),
  make: z.string()
    .min(1, 'Make is required')
    .max(100, 'Make must be 100 characters or less'),
  vin: z.string()
    .length(17, 'VIN must be exactly 17 characters')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  batteryCapacity: z.number()
    .min(1, 'Battery capacity must be positive')
    .optional()
    .or(z.undefined()),
  
  // Owner details
  ownerName: z.string()
    .min(1, 'Owner name is required')
    .max(200, 'Owner name must be 200 characters or less'),
  ownerPhone: z.string()
    .max(15, 'Phone number must be 15 characters or less')
    .optional()
    .or(z.literal('')),
  ownerEmail: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  ownerIdNumber: z.string()
    .min(5, 'ID number must be at least 5 characters')
    .max(50, 'ID number must be 50 characters or less')
    .optional()
    .or(z.literal(''))
})

type EditVehicleFormData = z.infer<typeof editVehicleSchema>

export function EditIndividualVehicleModal({ isOpen, onClose, vehicle, onSuccess }: EditIndividualVehicleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EditVehicleFormData>({
    resolver: zodResolver(editVehicleSchema),
    defaultValues: {
      licensePlate: '',
      model: '',
      make: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: undefined,
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      ownerIdNumber: ''
    }
  })

  // Update form when vehicle changes
  React.useEffect(() => {
    if (vehicle) {
      form.reset({
        licensePlate: vehicle.licensePlates?.[0]?.licencePlateNumber || '',
        model: vehicle.model || '',
        make: vehicle.make || '',
        vin: vehicle.vin || '',
        imageUrl: vehicle.imageUrl || '',
        batteryCapacity: vehicle.batteryCapacity || undefined,
        ownerName: `${vehicle.owner?.firstName || ''} ${vehicle.owner?.lastName || ''}`.trim(),
        ownerPhone: vehicle.owner?.phone || '',
        ownerEmail: vehicle.owner?.email || '',
        ownerIdNumber: ''
      })
    }
  }, [vehicle, form])

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: (data: UpdateIndividualVehicleRequest) => 
      updateIndividualVehicle(vehicle!.id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['individual-vehicle', vehicle?.id] })
      // Use backend success message
      toast.success(response.message || 'Vehicle updated successfully')
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      // Use backend error message only
      toast.error(error.message || 'Failed to update vehicle')
      setIsSubmitting(false)
    }
  })

  const handleSubmit = (data: EditVehicleFormData) => {
    if (!vehicle) return
    
    setIsSubmitting(true)
    
    // Clean up the data
    const cleanedData: UpdateIndividualVehicleRequest = {
      // Plates are uppercase in Rwanda — normalize for case-consistent dedupe.
      licensePlate: data.licensePlate.trim().toUpperCase(),
      model: data.model,
      make: data.make,
      ownerName: data.ownerName,
      ...(data.ownerPhone && data.ownerPhone.length > 0 && { ownerPhone: data.ownerPhone }),
      ...(data.vin && data.vin.length === 17 && { vin: data.vin }),
      ...(data.imageUrl && data.imageUrl.length > 0 && { imageUrl: data.imageUrl }),
      ...(data.batteryCapacity && typeof data.batteryCapacity === 'number' && !isNaN(data.batteryCapacity) && { batteryCapacity: data.batteryCapacity }),
      ...(data.ownerEmail && data.ownerEmail.length > 0 && { ownerEmail: data.ownerEmail }),
      ...(data.ownerIdNumber && data.ownerIdNumber.length > 0 && { ownerIdNumber: data.ownerIdNumber })
    }

    updateVehicleMutation.mutate(cleanedData)
  }

  if (!vehicle) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Edit className="h-6 w-6 text-blue-600" />
            Edit Individual Vehicle
          </DialogTitle>
          <DialogDescription>
            Update vehicle and owner information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  Vehicle Information
                </CardTitle>
                <CardDescription>
                  Update the basic details about the vehicle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make *</FormLabel>
                        <FormControl>
                          <Input placeholder="Tesla" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model *</FormLabel>
                        <FormControl>
                          <Input placeholder="Model 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC-123" {...field} />
                      </FormControl>
                      <FormDescription>
                        Vehicle license plate number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VIN (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1HGBH41JXMN109186" 
                            {...field}
                            maxLength={17}
                          />
                        </FormControl>
                        <FormDescription>
                          17-character Vehicle Identification Number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="batteryCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Battery Capacity (kWh)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="75"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Battery capacity in kilowatt-hours
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/vehicle.jpg" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL to vehicle image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Owner Information
                </CardTitle>
                <CardDescription>
                  Update the details of the vehicle owner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormDescription>
                        Full name of the vehicle owner
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+250788123456" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Owner&apos;s phone number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="john@example.com" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Owner's email address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ownerIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234567890123" 
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Owner's identification number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Current Information Summary */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                  <AlertCircle className="h-4 w-4" />
                  Current Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Kabisa ID:</p>
                    <p className="font-medium font-mono">{vehicle.kabisaId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status:</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Created:</p>
                    <p className="font-medium">
                      {new Date(vehicle.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated:</p>
                    <p className="font-medium">
                      {new Date(vehicle.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || updateVehicleMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting || updateVehicleMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Vehicle...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Vehicle
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
