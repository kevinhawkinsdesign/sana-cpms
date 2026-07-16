'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Car, 
  User, 
  CreditCard, 
  Upload, 
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createIndividualVehicle, type CreateIndividualVehicleRequest } from '@/lib/api/adminIndividual'

interface CreateIndividualVehicleFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Form schema - matches backend validation exactly
const createVehicleSchema = z.object({
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

type CreateVehicleFormData = z.infer<typeof createVehicleSchema>

export function CreateIndividualVehicleForm({ isOpen, onClose, onSuccess }: CreateIndividualVehicleFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<CreateVehicleFormData>({
    resolver: zodResolver(createVehicleSchema),
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

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: (data: CreateIndividualVehicleRequest) => createIndividualVehicle(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['individual-vehicles'] })
      // Use backend success message
      toast.success(response.message)
      form.reset()
      setCurrentStep(1)
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      // Use backend error message only - no fallback
      toast.error(error.message)
      setIsSubmitting(false)
    }
  })

  const handleSubmit = (data: CreateVehicleFormData) => {
    console.log('Form submitted with data:', data)
    setIsSubmitting(true)
    
    // Clean up the data
    const cleanedData: CreateIndividualVehicleRequest = {
      // Plates are uppercase in Rwanda — normalize so casing is consistent
      // across all vehicle entry points and dedupe.
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

    console.log('Cleaned data for API:', cleanedData)
    createVehicleMutation.mutate(cleanedData)
  }

  const nextStep = (e?: React.MouseEvent) => {
    console.log('Next step clicked, current step:', currentStep)
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (currentStep === 1) {
      // Validate vehicle details
      const vehicleFields = ['licensePlate', 'model', 'make'] as const
      const isValid = vehicleFields.every(field => {
        const value = form.getValues(field)
        return value && value.length > 0
      })
      
      console.log('Validation result:', isValid)
      if (isValid) {
        setCurrentStep(2)
      } else {
        // Trigger form validation to show field-specific errors
        form.trigger(vehicleFields)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    { id: 1, title: 'Vehicle Details', description: 'Basic vehicle information' },
    { id: 2, title: 'Owner Details', description: 'Owner information' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Car className="h-6 w-6 text-blue-600" />
            Create Individual Vehicle
          </DialogTitle>
          <DialogDescription>
            Register a new individual vehicle with owner information
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                currentStep >= step.id 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-600"
              )}>
                {currentStep > step.id ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <div className="ml-3">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-blue-600" : "text-gray-500"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-16 h-0.5 mx-4",
                  currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      Vehicle Information
                    </CardTitle>
                    <CardDescription>
                      Enter the basic details about the vehicle
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
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Owner Information
                    </CardTitle>
                    <CardDescription>
                      Enter the details of the vehicle owner
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
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                {currentStep < steps.length ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || createVehicleMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting || createVehicleMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Vehicle...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Vehicle
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
