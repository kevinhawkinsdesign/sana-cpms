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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle, Edit, Battery, Clock, User, DollarSign, Image as ImageIcon, Gauge, Percent, CreditCard } from 'lucide-react'
import ImageUpload from '@/components/ui/image-upload'
import { CarModelSelect } from '@/components/ui/CarModelSelect'
import { updateChargingSession, getSessionEBMInfo, updateSessionEBMInfo, getCurrentVsdcCodes, type AdminSession, type UpdateSessionData, type VsdcCodeItem } from '@/lib/api/admin'

interface EditSessionDialogProps {
  session: AdminSession | null
  open: boolean
  onClose: () => void
}

export function EditSessionDialog({ session, open, onClose }: EditSessionDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<UpdateSessionData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentMethodCode, setPaymentMethodCode] = useState<string | null>(null)
  const [paymentMethodName, setPaymentMethodName] = useState<string | null>(null)
  const [originalPaymentMethodCode, setOriginalPaymentMethodCode] = useState<string | null>(null)

  const isPaid = session?.sessionStatus === 'PAID' || session?.isPaid === true

  // Fetch VSDC payment methods from database
  const { data: vsdcCodesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['vsdcCurrentCodes'],
    queryFn: () => getCurrentVsdcCodes(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const paymentMethods: VsdcCodeItem[] = vsdcCodesData?.data?.paymentMethods || []

  // Fetch current EBM info to get existing payment method
  const { data: ebmInfoData } = useQuery({
    queryKey: ['sessionEBMInfo', session?.sessionId],
    queryFn: () => getSessionEBMInfo(session!.sessionId),
    enabled: open && !!session?.sessionId,
    staleTime: 0,
  })

  // Initialize form data when session changes
  useEffect(() => {
    if (session) {
      setFormData({
        startSoc: session.startSoc,
        endSoc: session.endSoc ?? undefined,
        chargedKwh: session.chargedKwh ?? undefined,
        startTime: session.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : undefined,
        endTime: session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : undefined,
        customerName: (session as any).customerName ?? null,
        carModelMake: (session as any).carModelMake ?? null,
        imageUrl: (session as any).imageUrl ?? null,
        odometerReading: (session as any).odometerReading ?? undefined,
        odometerReadingImage: (session as any).odometerReadingImage ?? null,
        ratePerKwh: (session as any).ratePerKwh ?? undefined,
        discountRate: session.discountRate ?? undefined,
        discountAmount: session.discountAmount ?? undefined,
        forceInvoicedCustomer: (session as any).forceInvoicedCustomer ?? undefined,
      })
      setErrors({})
      // Reset payment method state to avoid showing stale data from a previous session
      setPaymentMethodCode(null)
      setPaymentMethodName(null)
      setOriginalPaymentMethodCode(null)
    }
  }, [session])

  // Initialize payment method from EBM info
  useEffect(() => {
    if (ebmInfoData?.data?.ebmInfo) {
      const code = ebmInfoData.data.ebmInfo.ebmPaymentMethodCode || null
      const name = ebmInfoData.data.ebmInfo.ebmPaymentMethodName || null
      setPaymentMethodCode(code)
      setPaymentMethodName(name)
      setOriginalPaymentMethodCode(code)
    }
  }, [ebmInfoData])

  const invalidateSessionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['allSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
    if (session) {
      queryClient.invalidateQueries({ queryKey: ['session', session.id] })
      queryClient.invalidateQueries({ queryKey: ['sessionEBMInfo', session.sessionId] })
    }
    queryClient.invalidateQueries({ queryKey: ['sessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })
    queryClient.invalidateQueries({ queryKey: ['operatorActiveSessions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['allSessions'], exact: false })
      queryClient.refetchQueries({ queryKey: ['activeSessions'], exact: false })
    }, 100)
  }

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateSessionData) => {
      if (!session) throw new Error('No session selected')

      // Update session fields
      const sessionResult = await updateChargingSession(session.id, data)

      // Update payment method via EBM info endpoint if changed
      const paymentMethodChanged = paymentMethodCode !== originalPaymentMethodCode
      if (paymentMethodChanged) {
        await updateSessionEBMInfo(session.sessionId, {
          ebmPaymentMethodCode: paymentMethodCode,
          ebmPaymentMethodName: paymentMethodName,
        })
      }

      return sessionResult
    },
    onSuccess: () => {
      invalidateSessionQueries()
      toast.success('Session updated successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update session')
      if (error.message?.includes('financial fields')) {
        setErrors({ general: 'Cannot modify financial fields of a PAID session' })
      }
    }
  })

  // Separate mutation for when only payment method changes (no session fields changed)
  const paymentMethodOnlyMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      return updateSessionEBMInfo(session.sessionId, {
        ebmPaymentMethodCode: paymentMethodCode,
        ebmPaymentMethodName: paymentMethodName,
      })
    },
    onSuccess: () => {
      invalidateSessionQueries()
      toast.success('Session updated successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment method')
    }
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const isOutOfRange = (value: number | undefined, min: number, max: number) =>
      value !== undefined && (value < min || value > max)

    const isNegative = (value: number | undefined) =>
      value !== undefined && value < 0

    if (isOutOfRange(formData.startSoc, 0, 100)) {
      newErrors.startSoc = 'Start SOC must be between 0 and 100'
    }
    if (isOutOfRange(formData.endSoc, 0, 100)) {
      newErrors.endSoc = 'End SOC must be between 0 and 100'
    }
    if (isNegative(formData.chargedKwh)) {
      newErrors.chargedKwh = 'Charged kWh must be greater than or equal to 0'
    } else if (formData.chargedKwh !== undefined && formData.chargedKwh > 1000) {
      newErrors.chargedKwh = 'Charged kWh cannot exceed 1000 kWh'
    }
    if (isNegative(formData.ratePerKwh)) {
      newErrors.ratePerKwh = 'Rate per kWh must be greater than or equal to 0'
    }
    if (isOutOfRange(formData.discountRate, 0, 100)) {
      newErrors.discountRate = 'Discount rate must be between 0 and 100'
    }
    if (isNegative(formData.discountAmount)) {
      newErrors.discountAmount = 'Discount amount must be greater than or equal to 0'
    }

    if (formData.startTime && formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      newErrors.endTime = 'End time must be after start time'
    }

    // Validate odometer (required for OX Ntuma)
    const odometerRequired = shouldShowOdometerFields(formData.customerName)
    if (odometerRequired && (formData.odometerReading == null)) {
      newErrors.odometerReading = 'Odometer reading is required for this customer'
    } else if (isNegative(formData.odometerReading)) {
      newErrors.odometerReading = 'Odometer reading must be greater than or equal to 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePaymentMethodChange = (value: string) => {
    if (value === '__default__') {
      setPaymentMethodCode(null)
      setPaymentMethodName(null)
    } else {
      const selected = paymentMethods.find(pm => pm.code === value)
      if (selected) {
        setPaymentMethodCode(selected.code)
        setPaymentMethodName(selected.name)
      }
    }
  }

  const isMutating = updateMutation.isPending || paymentMethodOnlyMutation.isPending

  const hasFieldValue = (value: unknown) => value !== undefined && value !== null && value !== ''

  const checkPaidFinancialChanges = (): boolean => {
    if (!isPaid) return false
    const financialFields = ['startSoc', 'endSoc', 'chargedKwh', 'startTime', 'endTime', 'ratePerKwh', 'discountRate', 'discountAmount']
    return financialFields.some(field => hasFieldValue(formData[field as keyof UpdateSessionData]))
  }

  const buildSubmitData = (): UpdateSessionData => {
    const data: UpdateSessionData = {}
    Object.entries(formData).forEach(([key, value]) => {
      if (!hasFieldValue(value)) return
      const isDateField = (key === 'startTime' || key === 'endTime') && typeof value === 'string'
      data[key as keyof UpdateSessionData] = isDateField ? new Date(value).toISOString() as any : value as any
    })
    return data
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const paymentMethodChanged = paymentMethodCode !== originalPaymentMethodCode
    const hasChanges = Object.values(formData).some(hasFieldValue)

    if (!hasChanges && !paymentMethodChanged) {
      toast.error('Please provide at least one field to update')
      return
    }

    if (checkPaidFinancialChanges()) {
      toast.error('Cannot modify financial fields of a PAID session. Only metadata fields can be updated.')
      setErrors({ general: 'Cannot modify financial fields of a PAID session' })
      return
    }

    if (!validateForm()) return

    if (!hasChanges && paymentMethodChanged) {
      paymentMethodOnlyMutation.mutate()
      return
    }

    updateMutation.mutate(buildSubmitData())
  }

  const nullableFields: (keyof UpdateSessionData)[] = ['customerName', 'carModelMake', 'imageUrl', 'odometerReadingImage']

  const handleChange = (field: keyof UpdateSessionData, value: any) => {
    setFormData(prev => {
      const isEmpty = value === '' || value === null
      const newValue = isEmpty ? (nullableFields.includes(field) ? null : undefined) : value
      return { ...prev, [field]: newValue }
    })
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const shouldShowOdometerFields = (customerName: string | null | undefined) => {
    if (!customerName) return false
    return customerName.trim().toLowerCase() === 'ox ntuma'
  }

  const showOdometer = shouldShowOdometerFields(formData.customerName)

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Session
          </DialogTitle>
          <DialogDescription>
            Update charging session details. {isPaid && (
              <span className="text-yellow-600 font-medium">
                This session is PAID - only metadata fields can be modified.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isPaid && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This session is marked as PAID. Financial fields (SOC, kWh, times, rates) cannot be modified to prevent tampering with financial data. Only metadata fields (customer name, car model, images, etc.) can be updated.
            </AlertDescription>
          </Alert>
        )}

        {errors.general && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Financial Information Section */}
          <Card className={isPaid ? 'opacity-50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Information
              </CardTitle>
              <CardDescription>
                {isPaid ? 'These fields cannot be modified for PAID sessions' : 'Session charging and payment details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startSoc" className="flex items-center gap-1">
                    <Battery className="h-3.5 w-3.5 text-gray-500" />
                    Start SOC (%)
                    {!isPaid && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="startSoc"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={formData.startSoc ?? ''}
                    onChange={(e) => handleChange('startSoc', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.startSoc ? 'border-red-500' : ''}
                  />
                  {errors.startSoc && (
                    <p className="text-sm text-red-500 mt-1">{errors.startSoc}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endSoc" className="flex items-center gap-1">
                    <Battery className="h-3.5 w-3.5 text-gray-500" />
                    End SOC (%)
                  </Label>
                  <Input
                    id="endSoc"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={formData.endSoc ?? ''}
                    onChange={(e) => handleChange('endSoc', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.endSoc ? 'border-red-500' : ''}
                  />
                  {errors.endSoc && (
                    <p className="text-sm text-red-500 mt-1">{errors.endSoc}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="chargedKwh" className="flex items-center gap-1">
                    <Battery className="h-3.5 w-3.5 text-gray-500" />
                    Charged kWh
                  </Label>
                  <Input
                    id="chargedKwh"
                    type="number"
                    min="0"
                    max="1000"
                    step="any"
                    value={formData.chargedKwh ?? ''}
                    onChange={(e) => handleChange('chargedKwh', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.chargedKwh ? 'border-red-500' : ''}
                  />
                  {errors.chargedKwh && (
                    <p className="text-sm text-red-500 mt-1">{errors.chargedKwh}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ratePerKwh" className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                    Rate per kWh
                  </Label>
                  <Input
                    id="ratePerKwh"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.ratePerKwh ?? ''}
                    onChange={(e) => handleChange('ratePerKwh', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.ratePerKwh ? 'border-red-500' : ''}
                  />
                  {errors.ratePerKwh && (
                    <p className="text-sm text-red-500 mt-1">{errors.ratePerKwh}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* EBM Discount Section */}
          <Card className={isPaid ? 'opacity-50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                EBM Discount
              </CardTitle>
              <CardDescription>
                {isPaid ? 'These fields cannot be modified for PAID sessions' : 'Provide either a percentage or a fixed amount. If both are provided, the fixed amount takes priority.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountRate" className="flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-gray-500" />
                    Discount Rate (%)
                  </Label>
                  <Input
                    id="discountRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountRate ?? ''}
                    onChange={(e) => handleChange('discountRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.discountRate ? 'border-red-500' : ''}
                    placeholder="0 - 100"
                  />
                  {errors.discountRate && (
                    <p className="text-sm text-red-500 mt-1">{errors.discountRate}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="discountAmount" className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                    Discount Amount (RWF)
                  </Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountAmount ?? ''}
                    onChange={(e) => handleChange('discountAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isPaid || isMutating}
                    className={errors.discountAmount ? 'border-red-500' : ''}
                    placeholder="Fixed amount in RWF"
                  />
                  {errors.discountAmount && (
                    <p className="text-sm text-red-500 mt-1">{errors.discountAmount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Information Section */}
          <Card className={isPaid ? 'opacity-50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Information
              </CardTitle>
              <CardDescription>
                {isPaid ? 'These fields cannot be modified for PAID sessions' : 'Session start and end times'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime ?? ''}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    disabled={isPaid || isMutating}
                    className={errors.startTime ? 'border-red-500' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime ?? ''}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    disabled={isPaid || isMutating}
                    className={errors.endTime ? 'border-red-500' : ''}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-red-500 mt-1">{errors.endTime}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Vehicle Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer & Vehicle Information
              </CardTitle>
              <CardDescription>
                Customer details and vehicle information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={formData.customerName ?? ''}
                    onChange={(e) => handleChange('customerName', e.target.value || null)}
                    disabled={isMutating}
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <Label htmlFor="carModelMake">Car Model/Make</Label>
                  <CarModelSelect
                    value={formData.carModelMake ? String(formData.carModelMake) : undefined}
                    onValueChange={(value) => handleChange('carModelMake', value ? String(value) : null)}
                    disabled={isMutating}
                    placeholder="Select car model/make..."
                    className={errors.carModelMake ? 'border-red-500' : ''}
                  />
                  {errors.carModelMake && (
                    <p className="text-sm text-red-500 mt-1">{errors.carModelMake}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images
              </CardTitle>
              <CardDescription>
                {showOdometer ? 'Session and odometer images' : 'Session images'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-2 block">Session Image</Label>
                <ImageUpload
                  name="imageUrl"
                  label="Session Image"
                  currentImage={formData.imageUrl ?? null}
                  onImageChange={(name, url) => handleChange('imageUrl', url || null)}
                  isRequired={false}
                  classNames="w-full max-w-xs"
                  uploadContext="session-photo"
                  entityId={session?.id}
                />
              </div>

              {showOdometer && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="odometerReading" className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" />
                        Odometer Reading
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="odometerReading"
                        type="number"
                        min="0"
                        step="any"
                        value={formData.odometerReading ?? ''}
                        onChange={(e) => handleChange('odometerReading', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isMutating}
                        className={errors.odometerReading ? 'border-red-500' : ''}
                      />
                      {errors.odometerReading && (
                        <p className="text-sm text-red-500 mt-1">{errors.odometerReading}</p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block">Odometer Reading Image</Label>
                      <ImageUpload
                        name="odometerReadingImage"
                        label="Odometer Reading Image"
                        currentImage={formData.odometerReadingImage ?? null}
                        onImageChange={(name, url) => handleChange('odometerReadingImage', url || null)}
                        isRequired={false}
                        classNames="w-full max-w-xs"
                        uploadContext="session-odometer"
                        entityId={session?.id}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* EBM Payment Method Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                EBM Payment Method
              </CardTitle>
              <CardDescription>
                Override the payment method shown on EBM receipts. If not set, defaults to the transaction payment method (usually MOBILE MONEY).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="ebmPaymentMethod">Payment Method</Label>
                <Select
                  value={paymentMethodCode || '__default__'}
                  onValueChange={handlePaymentMethodChange}
                  disabled={isMutating || isLoadingCodes}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={isLoadingCodes ? "Loading..." : "Select payment method"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default (based on transaction)</SelectItem>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.code} value={pm.code}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  id="forceInvoicedCustomer"
                  type="checkbox"
                  checked={formData.forceInvoicedCustomer ?? false}
                  onChange={(e) => handleChange('forceInvoicedCustomer', e.target.checked)}
                  disabled={isMutating}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="forceInvoicedCustomer" className="font-normal cursor-pointer">
                  Force Invoiced Customer
                </Label>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isMutating}
            >
              {isMutating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Session
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

