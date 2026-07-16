'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Building2, Hash, X, Save, Loader2 } from 'lucide-react'
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
import ImageUpload from '@/components/ui/image-upload'
import { updateBusiness, type Business, type UpdateBusinessRequest } from '@/lib/api/adminBusiness'

const editBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name must be less than 100 characters'),
  tin: z.string().length(9, 'TIN must be exactly 9 digits').optional().or(z.literal('')),
  imageUrl: z.string().optional(),
})

type EditBusinessFormData = z.infer<typeof editBusinessSchema>

interface EditBusinessModalProps {
  isOpen: boolean
  onClose: () => void
  business: Business
  onSuccess: (updatedBusiness: Business) => void
}

export function EditBusinessModal({ isOpen, onClose, business, onSuccess }: EditBusinessModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<EditBusinessFormData>({
    resolver: zodResolver(editBusinessSchema),
    defaultValues: {
      name: business.name,
      tin: business.tin || '',
      imageUrl: business.imageUrl || '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: business.name,
        tin: business.tin || '',
        imageUrl: business.imageUrl || '',
      })
    }
  }, [isOpen, business, form])

  const handleClose = () => {
    if (isLoading) return
    onClose()
  }

  const onSubmit = async (data: EditBusinessFormData) => {
    try {
      setIsLoading(true)

      const updateData: UpdateBusinessRequest = {}
      if (data.name !== business.name) updateData.name = data.name
      if ((data.tin || '') !== (business.tin || '')) updateData.tin = data.tin
      if ((data.imageUrl || '') !== (business.imageUrl || '')) updateData.imageUrl = data.imageUrl || null

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes detected')
        return
      }

      const response = await updateBusiness(business.id, updateData)

      if (response.status === 'success') {
        toast.success('Business updated successfully')
        onSuccess(response.data.business)
        handleClose()
      } else {
        toast.error(response.message || 'Failed to update business')
      }
    } catch (error: any) {
      console.error('Error updating business:', error)
      toast.error(error.message || 'An error occurred while updating the business')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Business
          </DialogTitle>
          <DialogDescription>Update business information</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Enter business name"
                        className="pl-10"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
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
                  <FormLabel>TIN (Tax Identification Number)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Enter 9-digit TIN"
                        maxLength={9}
                        className="pl-10 font-mono"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>TIN must be exactly 9 digits</FormDescription>
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
                      entityId={business.id}
                      compact
                    />
                  </FormControl>
                  <FormDescription>Optional logo/image for the business</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isDirty}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Business
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
