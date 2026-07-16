'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Car, Save, X } from 'lucide-react'
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
import { updateBusinessVehicle, type UpdateBusinessVehicleRequest } from '@/lib/api/adminBusiness'
import { joinMakeModel, splitMakeModel } from '@/lib/utils/vehicleUtils'

const editSchema = z.object({
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
  licensePlate: z.string().min(1, 'License plate is required'),
  vin: z.string().optional(),
  imageUrl: z.string().optional(),
  batteryCapacity: z.number().min(0, 'Must be 0 or greater').optional(),
})

type EditVehicleFormData = z.infer<typeof editSchema>

interface EditVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  vehicle: {
    id: string
    make: string
    model: string
    vin?: string | null
    imageUrl?: string | null
    batteryCapacity?: number | null
    vehicleLicensePlates?: Array<{ licencePlateNumber?: any }>
  } | null
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  isOpen,
  onClose,
  businessId,
  vehicle,
}) => {
  const queryClient = useQueryClient()

  const form = useForm<EditVehicleFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      carModelMake: '',
      licensePlate: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: undefined,
    },
  })

  useEffect(() => {
    if (vehicle && isOpen) {
      form.reset({
        carModelMake: joinMakeModel(vehicle.make, vehicle.model),
        licensePlate: String(vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber ?? ''),
        vin: vehicle.vin ?? '',
        imageUrl: vehicle.imageUrl ?? '',
        batteryCapacity: vehicle.batteryCapacity ?? undefined,
      })
    }
  }, [vehicle, isOpen, form])

  const mutation = useMutation({
    mutationFn: (data: UpdateBusinessVehicleRequest) =>
      updateBusinessVehicle(businessId, vehicle!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Vehicle updated successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update vehicle')
    },
  })

  const onSubmit = (data: EditVehicleFormData) => {
    if (!vehicle) return
    const { make, model } = splitMakeModel(data.carModelMake)
    const currentPlate = String(vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber ?? '')
    const nextPlate = data.licensePlate.trim().toUpperCase()

    // Only send fields the operator actually changed. The plate field is
    // particularly important — sending an unchanged value would still trigger
    // the BE's deactivate-and-recreate flow on the VehicleLicensePlate row.
    const payload: UpdateBusinessVehicleRequest = {}
    if (make !== (vehicle.make ?? '')) payload.make = make
    if (model !== (vehicle.model ?? '')) payload.model = model
    if (nextPlate !== currentPlate.toUpperCase()) payload.licensePlate = nextPlate
    if ((data.vin || '') !== (vehicle.vin ?? '')) payload.vin = data.vin || null
    if ((data.imageUrl || '') !== (vehicle.imageUrl ?? '')) payload.imageUrl = data.imageUrl || null
    if ((data.batteryCapacity ?? null) !== (vehicle.batteryCapacity ?? null)) {
      payload.batteryCapacity = data.batteryCapacity ?? null
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No changes detected')
      onClose()
      return
    }

    mutation.mutate(payload)
  }

  const handleClose = () => {
    if (mutation.isPending) return
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Edit Vehicle
          </DialogTitle>
          <DialogDescription>
            Update vehicle details. Changes are saved to this vehicle's master record.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      disabled={mutation.isPending}
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
                  <FormDescription>Changing the plate deactivates the old one</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl>
                    <Input placeholder="17-character VIN" {...field} />
                  </FormControl>
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
                      placeholder="e.g., 75"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
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
                      entityId={vehicle?.id || undefined}
                      compact
                    />
                  </FormControl>
                  <FormDescription>Upload a photo of the vehicle</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
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
