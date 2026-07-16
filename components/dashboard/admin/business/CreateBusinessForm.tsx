'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Building2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save,
  X
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
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
import { createBusiness, type CreateBusinessRequest, type PricingTier } from '@/lib/api/adminBusiness'
import ImageUpload from '@/components/ui/image-upload'

// Form validation schema
const businessFormSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  tin: z.string().length(9, 'TIN must be exactly 9 digits').regex(/^[0-9]{9}$/, 'TIN must contain only numbers'),
  imageUrl: z.string().optional(),
  contractName: z.string().min(2, 'Contract name must be at least 2 characters'),
  invoicingDateOfTheMonth: z.number().min(1, 'Must be between 1 and 31').max(31, 'Must be between 1 and 31'),
  defaultPricingTiers: z.array(z.object({
    minKwh: z.number().min(0, 'Minimum KWH must be 0 or greater'),
    maxKwh: z.number().optional(),
    ratePerKwh: z.number().min(0.01, 'Rate per KWH must be greater than 0')
  })).min(1, 'At least one pricing tier is required')
})

type BusinessFormData = z.infer<typeof businessFormSchema>

interface CreateBusinessFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateBusinessForm: React.FC<CreateBusinessFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const queryClient = useQueryClient()

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: '',
      tin: '',
      imageUrl: '',
      contractName: '',
      invoicingDateOfTheMonth: 1,
      defaultPricingTiers: [
        { minKwh: 0, maxKwh: undefined, ratePerKwh: 0 }
      ]
    }
  })

  // Stable entity ID per dialog open for uploads
  const [entityId, setEntityId] = React.useState<string>('')
  React.useEffect(() => {
    if (isOpen) {
      setEntityId(
        typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
      )
    }
  }, [isOpen])

  const businessName = form.watch('name')
  const contractName = form.watch('contractName')

  useEffect(() => {
    const hasManuallyEditedContractName = !!form.formState.dirtyFields.contractName
    const canAutoFillContractName = !hasManuallyEditedContractName || !contractName

    if (!businessName || !canAutoFillContractName || contractName === businessName) {
      return
    }

    form.setValue('contractName', businessName, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [businessName, contractName, form])

  // Create business mutation
  const createBusinessMutation = useMutation({
    mutationFn: createBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Business created successfully')
      onSuccess()
      handleClose()
    },
    onError: (error: any) => {
      console.error('Create business error:', error)
      toast.error(error.message || 'Failed to create business')
    }
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const onSubmit = (data: BusinessFormData) => {
    // Omit empty strings so the BE doesn't persist '' into nullable columns.
    const trimmedImage = (data.imageUrl || '').trim()
    createBusinessMutation.mutate({
      ...data,
      imageUrl: trimmedImage === '' ? undefined : trimmedImage,
    })
  }

  const addPricingTier = () => {
    const currentTiers = form.getValues('defaultPricingTiers')
    const lastTier = currentTiers[currentTiers.length - 1]
    
    const newTier: PricingTier = {
      minKwh: lastTier?.maxKwh || (lastTier?.minKwh || 0) + 100, // Better logic
      maxKwh: undefined,
      ratePerKwh: 0.5 // Valid default rate
    }
    
    form.setValue('defaultPricingTiers', [...currentTiers, newTier])
  }

  const removePricingTier = (index: number) => {
    const currentTiers = form.getValues('defaultPricingTiers')
    if (currentTiers.length > 1) {
      form.setValue('defaultPricingTiers', currentTiers.filter((_, i) => i !== index))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Business
          </DialogTitle>
          <DialogDescription>
            Create a new pre-registered business with contract and pricing configuration
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Identification Number (TIN) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter TIN number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique tax identification number for the business
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          name="business-logo"
                          label="Logo"
                          currentImage={field.value || null}
                          onImageChange={(_, url) => field.onChange(url || '')}
                          isRequired={false}
                          uploadContext="business-logo"
                          entityId={entityId}
                          compact
                        />
                      </FormControl>
                      <FormDescription>Optional logo/image for the business</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contractName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contract name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoicingDateOfTheMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoicing Date (Day of Month) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="31" 
                          placeholder="15"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Day of the month when invoices will be generated
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Tiers
                </CardTitle>
                <CardDescription>
                  Configure pricing tiers for different consumption levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultPricingTiers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Tiers *</FormLabel>
                      <div className="space-y-3">
                        {field.value.map((tier, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-1">
                              <Label className="text-xs text-gray-500">Min KWH</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={tier.minKwh}
                                onChange={(e) => {
                                  const newTiers = [...field.value]
                                  newTiers[index].minKwh = parseFloat(e.target.value)
                                  field.onChange(newTiers)
                                }}
                                className="mt-1"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-gray-500">Max KWH (optional)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={tier.maxKwh || ''}
                                onChange={(e) => {
                                  const newTiers = [...field.value]
                                  newTiers[index].maxKwh = e.target.value ? parseFloat(e.target.value) : undefined
                                  field.onChange(newTiers)
                                }}
                                className="mt-1"
                                placeholder="No limit"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-gray-500">Rate per KWH</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tier.ratePerKwh}
                                onChange={(e) => {
                                  const newTiers = [...field.value]
                                  newTiers[index].ratePerKwh = parseFloat(e.target.value)
                                  field.onChange(newTiers)
                                }}
                                className="mt-1"
                              />
                            </div>
                            {field.value.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePricingTier(index)}
                                className="mt-6"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addPricingTier}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Pricing Tier
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBusinessMutation.isPending}
                className="flex items-center gap-2"
              >
                {createBusinessMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Business
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
