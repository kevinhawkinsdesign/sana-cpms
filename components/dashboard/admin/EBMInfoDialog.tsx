'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle, FileText, Save, X } from 'lucide-react'
import { getSessionEBMInfo, updateSessionEBMInfo, getCurrentVsdcCodes, type SessionEBMInfo, type UpdateSessionEBMInfoData, type VsdcCodeItem } from '@/lib/api/admin'
import { cn } from '@/lib/utils'

interface EBMInfoDialogProps {
  readonly sessionId: string
  readonly open: boolean
  readonly onClose: () => void
  readonly readonly?: boolean
}

export function EBMInfoDialog({ sessionId, open, onClose, readonly }: EBMInfoDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<SessionEBMInfo>({
    ebmTin: '',
    purchaseCode: '',
    customerPhone: '',
    ebmPaymentMethodCode: null,
    ebmPaymentMethodName: null
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)

  // Fetch EBM info
  const { data: ebmInfoData, isLoading, error } = useQuery({
    queryKey: ['sessionEBMInfo', sessionId],
    queryFn: () => getSessionEBMInfo(sessionId),
    enabled: open && !!sessionId,
    staleTime: 0, // Always fetch fresh data when dialog opens
  })

  // Fetch VSDC payment methods from database
  const { data: vsdcCodesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['vsdcCurrentCodes'],
    queryFn: () => getCurrentVsdcCodes(),
    enabled: open,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const paymentMethods: VsdcCodeItem[] = vsdcCodesData?.data?.paymentMethods || []

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateSessionEBMInfoData) => updateSessionEBMInfo(sessionId, data),
    onSuccess: (response) => {
      toast.success(response.message || 'EBM info updated successfully')
      queryClient.invalidateQueries({ queryKey: ['sessionEBMInfo', sessionId] })
      setIsEditing(false)
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to update EBM info'
      toast.error(errorMessage)

      // Set field-specific errors if available
      if (error.message?.includes('TIN')) {
        setErrors(prev => ({ ...prev, ebmTin: error.message }))
      } else if (error.message?.includes('purchase code')) {
        setErrors(prev => ({ ...prev, purchaseCode: error.message }))
      } else if (error.message?.includes('phone')) {
        setErrors(prev => ({ ...prev, customerPhone: error.message }))
      } else if (error.message?.includes('payment')) {
        setErrors(prev => ({ ...prev, paymentMethod: error.message }))
      } else {
        setErrors({ general: errorMessage })
      }
    }
  })

  // Initialize form data when EBM info is loaded
  useEffect(() => {
    if (ebmInfoData?.data?.ebmInfo) {
      const info = ebmInfoData.data.ebmInfo
      setFormData({
        ebmTin: info.ebmTin || '',
        purchaseCode: info.purchaseCode || '',
        customerPhone: info.customerPhone || '',
        ebmPaymentMethodCode: info.ebmPaymentMethodCode || null,
        ebmPaymentMethodName: info.ebmPaymentMethodName || null
      })
      setErrors({})
      setIsEditing(false)
    }
  }, [ebmInfoData])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setErrors({})
    }
  }, [open])

  const handleChange = (field: keyof SessionEBMInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    if (errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.general
        return newErrors
      })
    }
  }

  const handlePaymentMethodChange = (value: string) => {
    if (value === '__clear__') {
      setFormData(prev => ({
        ...prev,
        ebmPaymentMethodCode: null,
        ebmPaymentMethodName: null
      }))
    } else {
      const selected = paymentMethods.find(pm => pm.code === value)
      if (selected) {
        setFormData(prev => ({
          ...prev,
          ebmPaymentMethodCode: selected.code,
          ebmPaymentMethodName: selected.name
        }))
      }
    }
    if (errors.paymentMethod) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.paymentMethod
        return newErrors
      })
    }
  }

  // Validate TIN field
  const validateTin = (tin: string | null | undefined): string | null => {
    if (!tin) return null
    const trimmed = tin.trim()
    if (!trimmed) return null

    if (!/^\d{9}$/.test(trimmed)) {
      return 'TIN must be exactly 9 digits'
    }
    if (trimmed === '999999999') {
      return 'Generic TIN (999999999) is not allowed'
    }
    if (/^7\d{8,9}$/.test(trimmed)) {
      return 'Phone numbers should be provided in customer phone field, not TIN field'
    }
    return null
  }

  // Validate purchase code field
  const validatePurchaseCode = (code: string | null | undefined): string | null => {
    if (!code) return null
    const trimmed = code.trim()
    if (!trimmed) return null

    if (!/^\d{6}$/.test(trimmed)) {
      return 'Purchase code must be exactly 6 digits'
    }
    return null
  }

  // Validate customer phone field
  const validateCustomerPhone = (phone: string | null | undefined): string | null => {
    if (!phone) return null
    const trimmed = phone.trim()
    if (!trimmed) return null

    if (!/^7\d{8,9}$/.test(trimmed)) {
      return 'Phone number must start with 7 and be followed by 8-9 digits'
    }
    return null
  }

  // Check if form has any value
  const hasAnyValue = (): boolean => {
    return Boolean(
      formData.ebmTin?.trim() ||
      formData.purchaseCode?.trim() ||
      formData.customerPhone?.trim() ||
      formData.ebmPaymentMethodCode
    )
  }

  // Build update data object
  const buildUpdateData = (): UpdateSessionEBMInfoData => {
    const updateData: UpdateSessionEBMInfoData = {}
    const currentInfo = ebmInfoData?.data?.ebmInfo

    if (formData.ebmTin !== (currentInfo?.ebmTin ?? '')) {
      updateData.ebmTin = formData.ebmTin?.trim() || null
    }
    if (formData.purchaseCode !== (currentInfo?.purchaseCode ?? '')) {
      updateData.purchaseCode = formData.purchaseCode?.trim() || null
    }
    if (formData.customerPhone !== (currentInfo?.customerPhone ?? '')) {
      updateData.customerPhone = formData.customerPhone?.trim() || null
    }
    if (formData.ebmPaymentMethodCode !== (currentInfo?.ebmPaymentMethodCode ?? null)) {
      updateData.ebmPaymentMethodCode = formData.ebmPaymentMethodCode || null
      updateData.ebmPaymentMethodName = formData.ebmPaymentMethodName || null
    }

    return updateData
  }

  const handleSave = () => {
    // Validate form
    const newErrors: Record<string, string> = {}

    const tinError = validateTin(formData.ebmTin)
    if (tinError) newErrors.ebmTin = tinError

    const purchaseCodeError = validatePurchaseCode(formData.purchaseCode)
    if (purchaseCodeError) newErrors.purchaseCode = purchaseCodeError

    const phoneError = validateCustomerPhone(formData.customerPhone)
    if (phoneError) newErrors.customerPhone = phoneError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const updateData = buildUpdateData()

    // If no changes, just exit edit mode
    if (Object.keys(updateData).length === 0) {
      setIsEditing(false)
      return
    }

    // Ensure at least one field is provided
    const hasValue = hasAnyValue()
    if (hasValue || Object.keys(updateData).length > 0) {
      updateMutation.mutate(updateData)
    } else {
      toast.error('At least one field must be provided')
    }
  }

  const handleCancel = () => {
    // Reset to original values
    if (ebmInfoData?.data?.ebmInfo) {
      const info = ebmInfoData.data.ebmInfo
      setFormData({
        ebmTin: info.ebmTin || '',
        purchaseCode: info.purchaseCode || '',
        customerPhone: info.customerPhone || '',
        ebmPaymentMethodCode: info.ebmPaymentMethodCode || null,
        ebmPaymentMethodName: info.ebmPaymentMethodName || null
      })
    }
    setIsEditing(false)
    setErrors({})
  }

  const handleClear = (field: keyof SessionEBMInfo) => {
    handleChange(field, '')
  }

  // Get display name for current payment method
  const getPaymentMethodDisplay = (): string => {
    if (formData.ebmPaymentMethodName) {
      return formData.ebmPaymentMethodName
    }
    return 'Default (based on transaction)'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session EBM Info
          </DialogTitle>
          <DialogDescription>
            View and update EBM (Electronic Billing Machine) information for this charging session.
            This information will be used when generating EBMs.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load EBM info'}
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && (
          <div className="space-y-4 py-4">
            {readonly && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  EBM has already been generated. Information cannot be modified.
                </AlertDescription>
              </Alert>
            )}
            {errors.general && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Payment Method Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="paymentMethod" className="text-sm font-medium">
                  EBM Payment Method
                </Label>
                {isEditing && formData.ebmPaymentMethodCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePaymentMethodChange('__clear__')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reset to Default
                  </Button>
                )}
              </div>
              {isEditing ? (
                <Select
                  value={formData.ebmPaymentMethodCode || ''}
                  onValueChange={handlePaymentMethodChange}
                  disabled={updateMutation.isPending || isLoadingCodes}
                >
                  <SelectTrigger className={cn(
                    errors.paymentMethod && 'border-red-500',
                    'bg-white border-blue-300 ring-1 ring-blue-200'
                  )}>
                    <SelectValue placeholder={isLoadingCodes ? "Loading payment methods..." : "Default (based on transaction)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.code} value={pm.code}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="paymentMethod"
                  value={getPaymentMethodDisplay()}
                  disabled
                  className="bg-gray-50 font-semibold text-black"
                />
              )}
              {errors.paymentMethod && (
                <p className="text-xs text-red-500">{errors.paymentMethod}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Override the payment method shown on EBM. If not set, defaults to the transaction payment method.
              </p>
            </div>

            {/* EBM TIN Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ebmTin" className="text-sm font-medium">
                  EBM TIN (Tax Identification Number)
                </Label>
                {isEditing && formData.ebmTin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClear('ebmTin')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Input
                id="ebmTin"
                value={formData.ebmTin || ''}
                onChange={(e) => handleChange('ebmTin', e.target.value)}
                placeholder={isEditing ? "Enter 9-digit TIN" : "Not set"}
                disabled={!isEditing || updateMutation.isPending}
                maxLength={9}
                className={cn(
                  errors.ebmTin && 'border-red-500',
                  isEditing ? 'bg-white border-blue-300 ring-1 ring-blue-200' : 'bg-gray-50 font-semibold text-black'
                )}
              />
              {errors.ebmTin && (
                <p className="text-xs text-red-500">{errors.ebmTin}</p>
              )}
            </div>

            {/* Purchase Code Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="purchaseCode" className="text-sm font-medium">
                  Purchase Code
                </Label>
                {isEditing && formData.purchaseCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClear('purchaseCode')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Input
                id="purchaseCode"
                value={formData.purchaseCode || ''}
                onChange={(e) => handleChange('purchaseCode', e.target.value)}
                placeholder={isEditing ? "Enter 6-digit purchase code" : "Not set"}
                disabled={!isEditing || updateMutation.isPending}
                maxLength={6}
                className={cn(
                  errors.purchaseCode && 'border-red-500',
                  isEditing ? 'bg-white border-blue-300 ring-1 ring-blue-200' : 'bg-gray-50 font-semibold text-black'
                )}
              />
              {errors.purchaseCode && (
                <p className="text-xs text-red-500">{errors.purchaseCode}</p>
              )}
            </div>

            {/* Customer Phone Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customerPhone" className="text-sm font-medium">
                  Customer Phone Number
                </Label>
                {isEditing && formData.customerPhone && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClear('customerPhone')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Input
                id="customerPhone"
                value={formData.customerPhone || ''}
                onChange={(e) => handleChange('customerPhone', e.target.value)}
                placeholder={isEditing ? "Enter phone number" : "Not set"}
                disabled={!isEditing || updateMutation.isPending}
                maxLength={10}
                className={cn(
                  errors.customerPhone && 'border-red-500',
                  isEditing ? 'bg-white border-blue-300 ring-1 ring-blue-200' : 'bg-gray-50 font-semibold text-black'
                )}
              />
              {errors.customerPhone && (
                <p className="text-xs text-red-500">{errors.customerPhone}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              {!readonly && (
                <Button
                  onClick={() => setIsEditing(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Edit EBM Info
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
