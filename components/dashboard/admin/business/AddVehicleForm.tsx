'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Car, X, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { CarModelSelect } from '@/components/ui/CarModelSelect'
import ImageUpload from '@/components/ui/image-upload'
import { addVehicleToBusiness, type AddVehicleRequest } from '@/lib/api/adminBusiness'
import { splitMakeModel } from '@/lib/utils/vehicleUtils'

const vehicleFormSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  carModelMake: z
    .string()
    .min(1, 'Vehicle make and model is required')
    .refine(
      (v) => {
        const { make, model } = splitMakeModel(v)
        return !!make && !!model
      },
      {
        message: 'Pick a value that includes both make and model (e.g. Tesla Model 3)',
      },
    ),
  vin: z.string().optional(),
  imageUrl: z.string().optional(),
  batteryCapacity: z.number().min(0, 'Battery capacity must be 0 or greater').optional(),
})

type VehicleFormData = z.infer<typeof vehicleFormSchema>

interface AddVehicleFormProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  onSuccess: () => void
}

export const AddVehicleForm: React.FC<AddVehicleFormProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  // Stable entity ID per dialog open for the uploader path
  const [entityId, setEntityId] = React.useState<string>('')

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      licensePlate: '',
      carModelMake: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: undefined,
    },
  })

  // Always reset to blank when the dialog opens so we never prefill from prior state.
  React.useEffect(() => {
    if (isOpen) {
      setEntityId(
        typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
      )
      form.reset({
        licensePlate: '',
        carModelMake: '',
        vin: '',
        imageUrl: '',
        batteryCapacity: undefined,
      })
    }
  }, [isOpen, form])

  const addVehicleMutation = useMutation({
    mutationFn: (data: AddVehicleRequest) => addVehicleToBusiness(businessId, data),
    onSuccess: (response) => {
      if (response.data.action === 'assigned') {
        toast.success('Vehicle assigned to business successfully')
      } else {
        toast.success('New vehicle created and assigned to business successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      onSuccess()
      handleClose()
    },
    onError: (error: any) => {
      console.error('Add vehicle error:', error)
      if (error.message?.includes('license plate already exists')) {
        toast.error('A vehicle with this license plate already exists. Please contact support.')
      } else {
        toast.error(error.message || 'Failed to add vehicle')
      }
    },
  })

  const handleClose = () => {
    form.reset({
      licensePlate: '',
      carModelMake: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: undefined,
    })
    onClose()
  }

  const onSubmit = async (data: VehicleFormData) => {
    const { make, model } = splitMakeModel(data.carModelMake)
    const submitData: AddVehicleRequest = {
      // Rwandan plates are uppercase by convention — normalize so dedupe is
      // case-consistent with the bulk-import flow.
      licensePlate: data.licensePlate.trim().toUpperCase(),
      make,
      model,
      vin: data.vin || undefined,
      imageUrl: data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : undefined,
      batteryCapacity: data.batteryCapacity || undefined,
    }
    addVehicleMutation.mutate(submitData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Add Vehicle to {businessName}
          </DialogTitle>
          <DialogDescription>
            Add a new vehicle to this business with license plate and payment method
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="carModelMake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make / Model *</FormLabel>
                      <FormControl>
                        <CarModelSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Search and select make/model..."
                          disabled={addVehicleMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>Pick the vehicle's make and model</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ABC123" {...field} />
                      </FormControl>
                      <FormDescription>Vehicle license plate number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Vehicle Identification Number" {...field} />
                      </FormControl>
                      <FormDescription>Vehicle Identification Number</FormDescription>
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
                          min="0"
                          step="0.1"
                          placeholder="e.g., 75.0"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormDescription>Battery capacity in kilowatt-hours</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          name="vehicle-image"
                          label="Vehicle Photo"
                          currentImage={field.value || null}
                          onImageChange={(_, url) => field.onChange(url || '')}
                          isRequired={false}
                          uploadContext="vehicle-image"
                          entityId={entityId}
                          compact
                        />
                      </FormControl>
                      <FormDescription>Upload a photo of the vehicle</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={addVehicleMutation.isPending}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addVehicleMutation.isPending}
                className="flex items-center gap-2"
              >
                {addVehicleMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Vehicle
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
