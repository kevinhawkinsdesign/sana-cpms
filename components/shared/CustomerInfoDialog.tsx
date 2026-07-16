'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import ImageUpload from '@/components/ui/image-upload'
import { CarModelSelect } from '@/components/ui/CarModelSelect'
import { FormInputQrScanner } from '@/components/shared/FormInputQrScanner'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import {
  updateSessionCustomerInfo,
  getCustomerByLicensePlate,
  getCurrentUser,
  type UpdateSessionCustomerInfoData,
  type Session,
} from '@/lib/api/chargingSessions'
import { useAuth } from '@/lib/auth/authContext'
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'
import { normalizeLicensePlate } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Zap, Battery, Gauge } from 'lucide-react'

export interface CustomerInfoFormValues {
  name: string
  phone: string
  licensePlateNumber: string
}

interface FormValues {
  vehicleIdentifier: string
  customerName: string
  carModelMake: string
  odometerReading: string
}

interface CustomerInfoDialogProps {
  readonly sessionId: string | null
  readonly initialValues: CustomerInfoFormValues
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSaved?: () => void | Promise<void>
  readonly session?: Session | null
}

export default function CustomerInfoDialog({
  sessionId,
  initialValues,
  open,
  onOpenChange,
  onSaved,
  session: initialSession,
}: CustomerInfoDialogProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      vehicleIdentifier: '',
      customerName: '',
      carModelMake: '',
      odometerReading: '',
    },
  })

  const { user: authUser } = useAuth()
  const { data: freshUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 2 * 60 * 1000,
  })
  const autofillEnabled = (freshUser?.autofillEnabled ?? authUser?.autofillEnabled) !== false

  const [vehicleImage, setVehicleImage] = useState<string | null>(null)
  const [odometerImage, setOdometerImage] = useState<string | null>(null)

  const shouldShowOdometerFields = (customerName: string) => {
    if (!customerName) return false
    return customerName.trim().toLowerCase() === 'ox ntuma'
  }

  const watchedCustomerName = form.watch('customerName')
  const [liveKwh, setLiveKwh] = useState<number | null>(null)
  const [liveSoc, setLiveSoc] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lookupSeqRef = useRef(0)
  const vehicleImageRef = useRef(vehicleImage)
  vehicleImageRef.current = vehicleImage

  const loading = form.formState.isSubmitting

  // Listen to live telemetry updates
  useOperatorWs({
    onSessionTelemetry: ({ sessionId: sid, chargedKwh, currentSoc }) => {
      if (sid === sessionId) {
        if (chargedKwh != null) setLiveKwh(chargedKwh)
        if (currentSoc != null) setLiveSoc(currentSoc)
      }
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      vehicleIdentifier: initialValues.licensePlateNumber ?? '',
      customerName: initialValues.name ?? '',
      carModelMake: '',
      odometerReading: '',
    })
    setVehicleImage(null)
    setOdometerImage(null)
    setLiveKwh(initialSession?.chargedKwh ?? null)
    setLiveSoc(initialSession?.endSoc ?? null)
    lookupSeqRef.current++
  }, [open, sessionId])

  const lookupByPlate = (plate: string) => {
    if (!autofillEnabled) return
    const normalized = normalizeLicensePlate(plate)
    if (!normalized || normalized.length < 3) return
    const seq = ++lookupSeqRef.current
    getCustomerByLicensePlate(normalized)
      .then((result) => {
        if (seq !== lookupSeqRef.current) return
        if (result.customerName && !form.getValues('customerName').trim()) {
          form.setValue('customerName', result.customerName)
        }
        if (result.vehicleInfo) {
          const makeModel = [result.vehicleInfo.make, result.vehicleInfo.model].filter(Boolean).join(' ')
          if (makeModel && !form.getValues('carModelMake')) {
            form.setValue('carModelMake', makeModel)
          }
        }
      })
      .catch(() => {})
  }

  const handleVehicleIdentifierChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => lookupByPlate(value), 600)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      onOpenChange(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!sessionId) return
    if (!vehicleImage) {
      toast.error('Vehicle photo is required')
      return
    }
    const odometerRequired = shouldShowOdometerFields(values.customerName)
    if (odometerRequired) {
      if (!values.odometerReading.trim()) {
        toast.error('Odometer reading is required for this customer')
        return
      }
      const odometerValue = parseFloat(values.odometerReading)
      if (isNaN(odometerValue) || odometerValue < 0) {
        toast.error('Odometer reading must be a valid non-negative number')
        return
      }
    }
    const payload: UpdateSessionCustomerInfoData = {}
    if (values.customerName.trim()) payload.customerName = values.customerName.trim()
    if (values.vehicleIdentifier.trim()) payload.licensePlateNumber = values.vehicleIdentifier.trim()
    payload.vehicleImageUrl = vehicleImage
    if (values.carModelMake.trim()) payload.carModelMake = values.carModelMake.trim()
    if (odometerRequired && values.odometerReading.trim()) {
      payload.odometerReading = parseFloat(values.odometerReading)
      if (odometerImage) payload.odometerReadingImage = odometerImage
    }
    if (Object.keys(payload).length === 0) return
    try {
      await updateSessionCustomerInfo(sessionId, payload)
      toast.success('Customer info updated')
      onOpenChange(false)
      await onSaved?.()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update')
    }
  }

  const s = initialSession
  const chargerLabel = s?.charger?.name || 'Unknown Charger'
  const gunLabel = s?.gun?.gunNumber || s?.gun?.name
  const pedestalLabel = s?.pedestal?.name
  const displayKwh = liveKwh ?? s?.chargedKwh
  const displaySoc = liveSoc ?? s?.endSoc

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Customer Info</DialogTitle>
        </DialogHeader>

        {/* Session info bar */}
        {s && (
          <>
            <div className="rounded-lg border bg-card p-3 space-y-2">
              {/* Charger name */}
              <p className="text-sm font-semibold text-foreground truncate">{chargerLabel}</p>

              {/* Gun & Pedestal pills */}
              {(gunLabel || pedestalLabel) && (
                <div className="flex gap-2">
                  {gunLabel && (
                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-blue-500 font-medium leading-none mb-0.5">Gun</p>
                      <p className="text-xs font-bold text-blue-800 truncate">{gunLabel}</p>
                    </div>
                  )}
                  {pedestalLabel && (
                    <div className="flex-1 bg-purple-50 border border-purple-200 rounded-md px-2 py-1 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-purple-500 font-medium leading-none mb-0.5">Pedestal</p>
                      <p className="text-xs font-bold text-purple-800 truncate">{pedestalLabel}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Live kWh & SOC */}
              {(displayKwh != null || displaySoc != null) && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-md px-2.5 py-1.5 text-sm">
                  {displayKwh != null && (
                    <span className="flex items-center gap-1 font-bold text-gray-700">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <AnimatedCounter value={displayKwh} decimals={2} suffix=" kWh" duration={1200} highlightOnChange />
                    </span>
                  )}
                  {displaySoc != null && (
                    <span className="flex items-center gap-1 font-bold text-gray-700">
                      <Battery className="h-3.5 w-3.5 text-green-500" />
                      <AnimatedCounter value={displaySoc} decimals={0} suffix="%" duration={1200} highlightOnChange />
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 overflow-y-auto flex-1 pr-1">
            <FormInputQrScanner
              control={form.control}
              name="vehicleIdentifier"
              label="Vehicle Identifier"
              placeholder="Scan Kabisa ID / Enter License Plate"
              description="This is the License Plate found on the vehicle / Kabisa QR Code on Vehicle"
              onValueChange={handleVehicleIdentifierChange}
            />

            <FormField
              control={form.control}
              name="customerName"
              rules={{ required: 'Customer name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Customer Name <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carModelMake"
              rules={{ required: 'Car model/make is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Car Model/Make <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <CarModelSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search and select car model/make..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {shouldShowOdometerFields(watchedCustomerName) && (
              <>
                <Separator />
                <FormField
                  control={form.control}
                  name="odometerReading"
                  rules={{
                    required: 'Odometer reading is required for this customer',
                    validate: (value) => {
                      if (!value) return true
                      const num = parseFloat(value)
                      if (isNaN(num)) return 'Must be a valid number'
                      if (num < 0) return 'Must be greater than or equal to 0'
                      return true
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" />
                        Odometer Reading <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="any" placeholder="Enter odometer reading" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ImageUpload
                  name="odometer-image"
                  label="Odometer Photo"
                  currentImage={odometerImage}
                  onImageChange={(_name, url) => setOdometerImage(url || null)}
                  isRequired={false}
                  compact
                  uploadContext="session-odometer"
                  entityId={sessionId || undefined}
                />
              </>
            )}

            <ImageUpload
              name="vehicle-image"
              label="Vehicle Photo"
              currentImage={vehicleImage}
              onImageChange={(_name, url) => setVehicleImage(url || null)}
              isRequired={true}
              compact
              uploadContext="session-photo"
              entityId={sessionId || undefined}
            />

            <div className="flex flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !vehicleImage}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
