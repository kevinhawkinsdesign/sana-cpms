'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { Loader2, Zap, AlertCircle, CheckCircle, Clock, AlertTriangle, Phone, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormInputQrScanner } from "@/components/shared/FormInputQrScanner"
import { VehicleConfirmationDialog } from "./VehicleConfirmationDialog"
import { QuickRegistrationDialog } from "./QuickRegistrationDialog"
import PopupKabisaGenerator from "./PopupKabisaGenerator"
import { startChargingSession, getCustomerByLicensePlate, checkDebtPaymentStatus, retryDebtPayment, getAvailableGuns, getCurrentUser, type CustomerLookupResponse, type AvailableGunsPedestal } from "@/lib/api/chargingSessions"
import { useAuth } from "@/lib/auth/authContext"
import { CarModelSelect } from "@/components/ui/CarModelSelect"
import { VehicleInfo, ChargingInfo } from "@/types/session"
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter"
import { DASHBOARD_BASE, sessionHomeHref } from "@/lib/utils/operatorNav"
import { debounce } from "@/lib/utils"
import ImageUpload from "@/components/ui/image-upload"
import { getOperatorShifts, checkInOperator, type CheckInData } from "@/lib/api/shiftsAndInspections";
import { useActiveShift } from "@/lib/hooks/useActiveShift";
import { Badge } from "@/components/ui/badge";
import { normalizeLicensePlate } from "@/lib/utils/formatters";

// ===== Shift Timing Utilities =====
function getShiftTimingIndicator(dayOfWeek: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const today = new Date()
  const todayDayOfWeek = today.getDay()
  
  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }
  
  switch (daysUntil) {
    case 0:
      return { label: 'Today', variant: 'default' } // Green for today
    case 1:
      return { label: 'Tomorrow', variant: 'destructive' } // Red for others
    case 2:
      return { label: 'In 2 days', variant: 'destructive' } // Red for others
    case 3:
      return { label: 'In 3 days', variant: 'destructive' } // Red for others
    case 4:
      return { label: 'In 4 days', variant: 'destructive' } // Red for others
    case 5:
      return { label: 'In 5 days', variant: 'destructive' } // Red for others
    case 6:
      return { label: 'In 6 days', variant: 'destructive' } // Red for others
    default:
      return { label: 'Upcoming', variant: 'destructive' } // Red for others
  }
}

// ===== Shift Sorting Utilities =====
function getDaysUntilShift(dayOfWeek: number): number {
  const today = new Date()
  const todayDayOfWeek = today.getDay()
  
  // Calculate days until the shift
  let daysUntil = dayOfWeek - todayDayOfWeek
  if (daysUntil < 0) {
    daysUntil += 7 // Next week
  }
  
  return daysUntil
}

function sortShiftsByProximity(shifts: any[]): any[] {
  return [...shifts].sort((a, b) => {
    const daysUntilA = getDaysUntilShift(a.dayOfWeek)
    const daysUntilB = getDaysUntilShift(b.dayOfWeek)
    
    // If same day, sort by start time
    if (daysUntilA === daysUntilB) {
      return a.startTime.localeCompare(b.startTime)
    }
    
    return daysUntilA - daysUntilB
  })
}

const createStartSessionSchema = (customerName?: string) => {
  const shouldRequireOdometer = customerName?.trim().toLowerCase() === 'ox ntuma'

  return z.object({
    vehicleIdentifier: z
      .string()
      .min(3, "Vehicle identifier must be at least 3 characters")
      .max(10, "Vehicle identifier must be at most 10 characters")
      .transform(val => normalizeLicensePlate(val)),
    startSoc: z.number().min(0).max(100, "SOC must be between 0 and 100"),
    imageUrl: z.string().min(1, "Vehicle image is required"),
    carModelMake: z.string().min(1, "Vehicle make and model is required"),
    customerName: z.string().min(1, "Customer name is required"),
    operatorShiftReportId: z.string().optional(),
    odometerReading: shouldRequireOdometer 
      ? z.number().min(0, "Odometer reading is required for this customer")
      : z.number().optional(),
    odometerReadingImage: shouldRequireOdometer
      ? z.string().min(1, "Odometer reading image is required for this customer")
      : z.string().optional(),
  })
}

type StartSessionData = z.infer<ReturnType<typeof createStartSessionSchema>>

/**
 * StartSession Component
 *
 * Session Data Persistence Features:
 * 1. Auto-populates customerName and carModelMake from license plate lookup (carModelMake is now required)
 * 2. Tracks when fields are manually modified by operator (fieldModifications state)
 * 3. Only auto-populates fields that haven't been manually modified
 * 4. Shows "Modified" indicator on fields that have been changed by operator
 * 5. Ensures final form values (including operator modifications) are sent to API
 * 6. Logs detailed information about what data is being sent vs what was auto-populated
 *
 * Expected Behavior:
 * - If operator scans license plate → fields auto-populate
 * - If operator changes any field → it's marked as modified and won't be overwritten
 * - When session starts → operator's final values are stored permanently
 */
export function StartSession({ basePath = DASHBOARD_BASE }: Readonly<{ basePath?: string }> = {}) {
  const [showQuickRegistration, setShowQuickRegistration] = useState(false)
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [chargingInfo, setChargingInfo] = useState<ChargingInfo | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const [showCreateId, setShowCreateId] = useState(false)
  const [currentField, setCurrentField] = useState<'vehicleIdentifier'>('vehicleIdentifier')
  const [vehicleImage, setVehicleImage] = useState<string>('')
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState<string>('')
  const [checkInImage, setCheckInImage] = useState<string>('')
  const [meterReading, setMeterReading] = useState<string>('')
  const [meterImage, setMeterImage] = useState<string>('')
  const [odometerReading, setOdometerReading] = useState<string>('')
  const [odometerImage, setOdometerImage] = useState<string>('')
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerLookupResponse | null>(null)
  const [showDebtDialog, setShowDebtDialog] = useState(false)
  const [debtInfo, setDebtInfo] = useState<{ vehicleId: string; debtBalance: number; debtNote?: string; currency: string } | null>(null)
  const [debtPaymentPhone, setDebtPaymentPhone] = useState('')
  const [debtPaymentLoading, setDebtPaymentLoading] = useState(false)
  const [pendingSessionData, setPendingSessionData] = useState<StartSessionData | null>(null)
  const [debtPaymentTransactionId, setDebtPaymentTransactionId] = useState<string | null>(null)
  const [debtPaymentStatus, setDebtPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle')
  const [debtPaymentError, setDebtPaymentError] = useState<string | null>(null)
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<number>(0)
  const [debtPaymentCurrency, setDebtPaymentCurrency] = useState<string>('RWF')
  const pendingSessionDataRef = useRef<StartSessionData | null>(null)
  const debtPollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedGunId, setSelectedGunId] = useState<string>('')
  // Unique ID per form render — prevents R2 key collisions when multiple
  // sessions are created during the same shift (session doesn't exist yet at upload time)
  const [uploadEntityId] = useState(() => crypto.randomUUID())
  const [fieldModifications, setFieldModifications] = useState<{
    customerName: { isModified: boolean; originalValue: string | null }
    carModelMake: { isModified: boolean; originalValue: string | null }
  }>({
    customerName: { isModified: false, originalValue: null },
    carModelMake: { isModified: false, originalValue: null }
  })

  // Keep ref in sync with state for use in polling callback
  useEffect(() => {
    pendingSessionDataRef.current = pendingSessionData
  }, [pendingSessionData])

  // Cleanup debt payment polling on unmount
  useEffect(() => {
    return () => {
      if (debtPollingTimerRef.current) {
        clearTimeout(debtPollingTimerRef.current)
      }
    }
  }, [])

  const router = useLocalizedRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user: authUser, updateClientUser } = useAuth()

  // Refresh user data to pick up admin changes (e.g. autofill toggle) without re-login
  const { data: freshUser, isFetched: isUserFetched } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    refetchOnWindowFocus: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Sync fresh user data into auth context when it changes
  useEffect(() => {
    if (freshUser && freshUser.autofillEnabled !== authUser?.autofillEnabled) {
      updateClientUser({ autofillEnabled: freshUser.autofillEnabled })
    }
  }, [freshUser?.autofillEnabled])

  const autofillEnabled = (freshUser?.autofillEnabled ?? authUser?.autofillEnabled) !== false
  // Keep a ref so closures (debounce, lookupCustomer) always read the latest value
  const autofillEnabledRef = useRef(autofillEnabled)
  autofillEnabledRef.current = autofillEnabled

  // Function to check if customer is OX Ntuma
  const shouldShowOdometerFields = (customerName: string) => {
    if (!customerName) return false
    return customerName.trim().toLowerCase() === 'ox ntuma'
  }

  // Use custom hook for active shift management
  const { activeShiftReport, hasActiveShift, unclosedPreviousShifts, hasUnclosedPreviousShifts } = useActiveShift()

  // Fetch available shifts for check-in
  const { data: shiftsData } = useQuery({
    queryKey: ['operatorShifts'],
    queryFn: getOperatorShifts,
  })

  const shifts = shiftsData?.shifts || []

  // Fetch available guns from offline pedestals for the checked-in charger
  const chargerId = activeShiftReport?.operatorShift?.charger?.id
  const { data: availableGunsData, isLoading: gunsLoading } = useQuery({
    queryKey: ['availableGuns', chargerId],
    queryFn: () => getAvailableGuns(chargerId!),
    enabled: !!chargerId,
  })

  const pedestalsWithGuns: AvailableGunsPedestal[] = availableGunsData?.pedestals || []
  const allGuns = pedestalsWithGuns.flatMap(p => p.guns.map(g => ({ ...g, pedestalName: p.name })))
  const hasAnyGuns = allGuns.length > 0
  // When all pedestals are OFFLINE, charger is entirely offline — skip gun selection
  // and let the backend assign a gun randomly
  const chargerFullyOffline = availableGunsData ? !availableGunsData.hasOnlinePedestals : false
  const showGunSelector = !chargerFullyOffline && hasAnyGuns

  // Reset selected gun when charger changes (e.g. operator checks into a different shift)
  useEffect(() => {
    setSelectedGunId('')
  }, [chargerId])

  useEffect(() => {
    if (!meterReading) {
      setMeterImage('')
    }
  }, [meterReading])

  const form = useForm<StartSessionData>({
    resolver: zodResolver(createStartSessionSchema()),
    defaultValues: {
      vehicleIdentifier: searchParams.get('vehicleIdentifier') || "",
      startSoc: undefined,
      imageUrl: "",
      carModelMake: "",
      customerName: "",
      odometerReading: undefined,
      odometerReadingImage: "",
    }
  })

  // Update form resolver when customer name changes
  useEffect(() => {
    const customerName = form.watch('customerName')
    const newSchema = createStartSessionSchema(customerName)
    form.clearErrors()
    // Note: We can't dynamically change the resolver in react-hook-form
    // The validation will be handled in the onSubmit function
  }, [form.watch('customerName')])

  // Customer lookup function with debouncing
  const lookupCustomer = async (licensePlate: string) => {
    if (!autofillEnabledRef.current) return

    const normalizedPlate = normalizeLicensePlate(licensePlate)

    if (!normalizedPlate || normalizedPlate.length < 3) {
      setCustomerData(null)
      return
    }

    setCustomerLookupLoading(true)
    try {
      const data = await getCustomerByLicensePlate(normalizedPlate)
      
      // Filter out null values from vehicleInfo to prevent null submissions
      const filteredData = {
        ...data,
        vehicleInfo: data.vehicleInfo ? {
          ...data.vehicleInfo,
          // Only include make and model if they are not null
          ...(data.vehicleInfo.make !== null && { make: data.vehicleInfo.make }),
          ...(data.vehicleInfo.model !== null && { model: data.vehicleInfo.model })
        } : null
      }
      
      setCustomerData(filteredData)

      // Only auto-populate fields if they haven't been manually modified
      if (data.customerName && !fieldModifications.customerName.isModified) {
        form.setValue('customerName', data.customerName)
        setFieldModifications(prev => ({
          ...prev,
          customerName: { ...prev.customerName, originalValue: data.customerName }
        }))
      }

      if (data.vehicleInfo && !fieldModifications.carModelMake.isModified) {
        const carModelMake = `${data.vehicleInfo.make || ''} ${data.vehicleInfo.model || ''}`.trim()
        if (carModelMake) {
          form.setValue('carModelMake', carModelMake)
          setFieldModifications(prev => ({
            ...prev,
            carModelMake: { ...prev.carModelMake, originalValue: carModelMake }
          }))
        }
      }
    } catch (error: any) {
      // Reset customer data on error
      setCustomerData(null)
      console.error('Customer lookup error:', error)
    } finally {
      setCustomerLookupLoading(false)
    }
  }

  // Debounced customer lookup
  const debouncedLookupCustomer = useCallback(
    debounce((licensePlate: string) => {
      lookupCustomer(licensePlate)
    }, 500),
    [autofillEnabled]
  )

  // Auto-populate form fields from URL parameters
  useEffect(() => {
    const vehicleIdentifier = searchParams.get('vehicleIdentifier')
    const fromScanner = searchParams.get('fromScanner')

    if (vehicleIdentifier) {
      const normalizedVehicleId = normalizeLicensePlate(vehicleIdentifier)
      form.setValue('vehicleIdentifier', normalizedVehicleId, { shouldValidate: true })
      // Trigger customer lookup only after fresh user data is loaded
      if (isUserFetched && autofillEnabled) {
        lookupCustomer(normalizedVehicleId)
      }
    }

    // If coming from scanner and we have vehicle ID, focus on the SOC field
    if (fromScanner === 'true' && vehicleIdentifier) {
      setTimeout(() => {
        const socInput = document.querySelector('input[name="startSoc"]')
        if (socInput) {
          (socInput as HTMLInputElement).focus()
        }
      }, 100) // Small delay to ensure DOM is ready
    }
  }, [form, searchParams, isUserFetched, autofillEnabled])

  // Start session mutation
  const { mutate: startSession, isPending } = useMutation({
    mutationFn: async (data: StartSessionData) => {
      // Check if operator has active shift
      if (!activeShiftReport) {
        throw new Error('You must be checked in to start a charging session. Please check in from the dashboard first.')
      }

      return await startChargingSession(data)
    },
    onSuccess: (result) => {
      const data = result

      // Handle debt decision required
      if (data?.requiresDebtDecision) {
        setDebtInfo(data.debtInfo)
        setShowDebtDialog(true)
        return
      }

      // Handle cancelled due to debt
      if (data?.cancelled) {
        toast.error(`Session cancelled: ${data.reason || 'Outstanding debt'}`)
        setShowDebtDialog(false)
        setDebtInfo(null)
        setPendingSessionData(null)
        return
      }

      // Handle debt payment validation pending — start polling
      if (data?.requiresPaymentValidation) {
        const txnId = data.transactionId
        setDebtPaymentTransactionId(txnId)
        setDebtPaymentStatus('pending')
        setDebtPaymentAmount(data.amount)
        setDebtPaymentCurrency(data.currency || 'RWF')
        toast.info(`Payment of ${data.amount} ${data.currency} initiated to ${data.phone}. Waiting for confirmation...`)
        pollDebtPaymentStatus(txnId)
        return
      }

      // Normal success - session started
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

      console.log('Session created successfully:', {
        sessionId: data.session.id,
        sessionCustomerName: data.session.customerName,
        sessionCarModelMake: data.session.carModelMake,
        vehicleData: data.vehicle,
        finalFormData: {
          customerName: form.getValues('customerName'),
          carModelMake: form.getValues('carModelMake')
        }
      })

      // Payment method: prefer API name, fallback to label from enum (in case response omits name)
      const paymentMethodName =
        data.paymentMethodName ??
        (data.paymentMethodEnum === 'FREE_ALLOWANCE' ? 'Free Allowance' : undefined)
      const paymentMethodEnum = data.paymentMethodEnum

      setChargingInfo({
        standardPrice: data.ratePerKwh,
        name: data.charger.name,
        kabisaId: data.charger.kabisaId,
        paymentMethodName: paymentMethodName ?? null,
        paymentMethodEnum: paymentMethodEnum ?? null,
        freeAllowance: data.freeAllowance ?? null,
      })
      setVehicleInfo({
        freeChargingExpiration: null,
        licenseNumber: data.vehicle.licensePlate,
        make: data.vehicle.make,
        model: data.vehicle.model,
        imageUrl: data.vehicle.imageUrl,
        kabisaId: data.vehicle.kabisaId
      })

      setNeedsRegistration(false)
      setShowConfirmation(true)
      setShowDebtDialog(false)
      setDebtInfo(null)
      setPendingSessionData(null)
      setDebtPaymentPhone('')
    },
    onError: (error: any) => {
      console.error("Error starting session:", error)
    }
  })

  // Quick registration mutation - keeping for compatibility
  const { mutate: registerVehicle, isPending: isRegisteringVehicle } = useMutation({
    mutationFn: async (data: any) => {
      // This would need to be updated to match new API
      const response = await fetch("/api/register/idRegisterVehicleQuick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    onSuccess: (data) => {
      if (data.status) {
        setShowQuickRegistration(false)
        const formValues = form.getValues()
        startSession(formValues)
      } else {
        // Backend will handle error messaging through api.ts interceptors
        console.error("Registration failed:", data.message)
      }
    },
    onError: (error) => {
      console.error("Registration error:", error)
      // Backend will handle error messaging through api.ts interceptors
    }
  })

  const onSubmit = (data: StartSessionData) => {
    // Get the current form values (which include operator modifications)
    const customerName = form.getValues('customerName')
    
    // Validate odometer fields if required
    if (shouldShowOdometerFields(customerName)) {
      if (!data.odometerReading || data.odometerReading < 0) {
        form.setError('odometerReading', {
          type: 'manual',
          message: 'Odometer reading is required for this customer'
        })
        return
      }
      if (!data.odometerReadingImage) {
        form.setError('odometerReadingImage', {
          type: 'manual',
          message: 'Odometer reading image is required for this customer'
        })
        return
      }
    }

    const finalData = {
      ...data,
      // Ensure we're using the current form values
      customerName: customerName,
      carModelMake: form.getValues('carModelMake'),
      operatorShiftReportId: activeShiftReport?.id || '',
      imageUrl: vehicleImage || data.imageUrl,
      gunId: selectedGunId || undefined
    }

    // Add odometer fields if customer name contains OX or NTUMA
    if (shouldShowOdometerFields(customerName)) {
      finalData.odometerReading = data.odometerReading
      finalData.odometerReadingImage = data.odometerReadingImage 
    }

    // Debug logging to track what data is being sent
    console.log('Final session data being sent:', {
      ...finalData,
      fieldModifications,
      originalLookupData: customerData,
      odometerRequired: shouldShowOdometerFields(customerName)
    })

    // Save for potential re-submission with debt decision
    setPendingSessionData(finalData)
    startSession(finalData)
  }

  const handleQuickRegistration = (data: any) => {
    registerVehicle(data)
  }

  const confirmVehicleAndStart = () => {
    // Backend handles success messaging through api.ts interceptors; just return
    // the operator to their home base (dashboard or console).
    router.push(sessionHomeHref(basePath))
  }

  const handleImageChange = (name: string, url: string) => {
    if (name === 'vehicle-image') {
      setVehicleImage(url)
      form.setValue('imageUrl', url)
    } else if (name === 'checkin-image') {
      setCheckInImage(url)
    } else if (name === 'meter-image') {
      setMeterImage(url)
    }
  }

  // ===== Debt Payment Polling =====
  const pollDebtPaymentStatus = useCallback((transactionId: string) => {
    let attempts = 0
    const maxAttempts = 24 // 2 minutes at 5s intervals

    const poll = async () => {
      attempts++
      try {
        const result = await checkDebtPaymentStatus(transactionId)
        const paymentStatus = result.data.status

        if (paymentStatus === 'COMPLETED') {
          setDebtPaymentStatus('completed')
          toast.success('Debt payment confirmed! Starting session...')

          // Auto-resubmit session without debt fields
          const currentPendingData = pendingSessionDataRef.current
          if (currentPendingData) {
            const { debtPaymentDecision, debtPaymentPhone: _, ...sessionData } = currentPendingData as any
            setShowDebtDialog(false)
            setDebtInfo(null)
            setDebtPaymentTransactionId(null)
            setDebtPaymentPhone('')
            setDebtPaymentStatus('idle')
            setPendingSessionData(null)
            startSession(sessionData)
          }
          return
        }

        if (paymentStatus === 'FAILED') {
          setDebtPaymentStatus('failed')
          setDebtPaymentError(result.data.reason || 'Payment was rejected or timed out')
          return
        }

        // Still PENDING
        if (attempts >= maxAttempts) {
          setDebtPaymentStatus('failed')
          setDebtPaymentError('Payment confirmation timed out. You can retry the payment.')
          return
        }

        // Continue polling
        debtPollingTimerRef.current = setTimeout(poll, 5000)
      } catch (error: any) {
        setDebtPaymentStatus('failed')
        setDebtPaymentError(error.message || 'Failed to check payment status')
      }
    }

    // Start first poll after 5 seconds
    debtPollingTimerRef.current = setTimeout(poll, 5000)
  }, [startSession])

  // ===== Debt Payment Handlers =====
  const handleDebtPayNow = () => {
    if (!pendingSessionData || !debtPaymentPhone) {
      toast.error('Please enter a phone number for payment')
      return
    }

    setDebtPaymentLoading(true)
    startSession({
      ...pendingSessionData,
      debtPaymentDecision: 'PAY_NOW',
      debtPaymentPhone: debtPaymentPhone
    })
    setDebtPaymentLoading(false)
  }

  const handleDebtCancel = () => {
    if (!pendingSessionData) {
      setShowDebtDialog(false)
      return
    }

    startSession({
      ...pendingSessionData,
      debtPaymentDecision: 'CANCEL'
    })
  }

  const handleDebtPaymentRetry = async () => {
    if (!debtPaymentTransactionId || !debtPaymentPhone) {
      toast.error('Please enter a phone number for payment')
      return
    }

    setDebtPaymentLoading(true)
    setDebtPaymentError(null)
    try {
      const result = await retryDebtPayment(debtPaymentTransactionId, debtPaymentPhone)
      const newTransactionId = result.data.transactionId
      setDebtPaymentTransactionId(newTransactionId)
      setDebtPaymentStatus('pending')
      pollDebtPaymentStatus(newTransactionId)
      toast.info('Payment retry initiated. Waiting for confirmation...')
    } catch (error: any) {
      setDebtPaymentError(error.message || 'Failed to retry payment')
      toast.error(error.message || 'Failed to retry payment')
    } finally {
      setDebtPaymentLoading(false)
    }
  }

  const handleDebtDialogClose = () => {
    if (debtPollingTimerRef.current) {
      clearTimeout(debtPollingTimerRef.current)
      debtPollingTimerRef.current = null
    }
    setShowDebtDialog(false)
    setDebtInfo(null)
    setPendingSessionData(null)
    setDebtPaymentPhone('')
    setDebtPaymentTransactionId(null)
    setDebtPaymentStatus('idle')
    setDebtPaymentError(null)
  }

  // ===== Day Validation =====
  const validateShiftDay = (shift: any): boolean => {
    const today = new Date()
    const todayDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    if (shift.dayOfWeek !== todayDayOfWeek) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const todayName = dayNames[todayDayOfWeek]
      const shiftDayName = dayNames[shift.dayOfWeek]
      
      toast.error(`Cannot check in to ${shiftDayName} shift on ${todayName}. Please select a shift for today.`)
      return false
    }
    return true
  }

  const handleCheckIn = async () => {
    if (!selectedShiftId) {
      // Backend will handle error messaging through api.ts interceptors
      return
    }

    if (meterReading && (!meterImage || meterImage.trim() === '')) {
      toast.error('Please capture a meter reading photo before checking in.')
      return
    }

    // Validate that the selected shift is for today (check-in only)
    const selectedShift = shifts.find((s: any) => s.id === selectedShiftId)
    if (selectedShift && !validateShiftDay(selectedShift)) {
      return
    }

    setCheckInLoading(true)
    try {
      await checkInOperator({
        operatorShiftId: selectedShiftId,
        operatorLatitude: '0.0000', // TODO: Get actual GPS coordinates
        operatorLongitude: '0.0000',
        imageUrl: checkInImage && checkInImage.trim() !== '' ? checkInImage : undefined,
        checkInMeterReading: meterReading ? parseFloat(meterReading) : undefined,
        checkInMeterReadingImageUrl: meterImage && meterImage.trim() !== '' ? meterImage : undefined,
      })
      
      // Backend will handle success messaging through api.ts interceptors
      setShowShiftModal(false)
      setSelectedShiftId('')
      setCheckInImage('')
      setMeterReading('')
      setMeterImage('')
      
      // Refresh the shift reports
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
    } catch (error: any) {
      // Backend will handle error messaging through api.ts interceptors
      console.error('Check-in error:', error)
    } finally {
      setCheckInLoading(false)
    }
  }

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }

  // Visual indicator component for modified fields (hidden when autofill is disabled)
  const ModificationIndicator = ({ isModified }: { isModified: boolean }) => {
    if (!autofillEnabled || !isModified) return null

    return (
      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
        Modified
      </span>
    )
  }

  const CreateNewAction = ({ fieldName }: { fieldName: 'gunId' | 'vehicleIdentifier' }) => (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Don't have one?</span>
      <Button
        variant="link"
        className="px-1 h-auto font-medium"
        onClick={() => {
          setCurrentField('vehicleIdentifier')
          setShowCreateId(true)
        }}
      >
        Create new one
      </Button>
    </div>
  )

  return (
    <>
      {/* Shift Status Indicator */}
      {!activeShiftReport && (
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {/* Warning about unclosed previous shifts */}
          {hasUnclosedPreviousShifts && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium text-yellow-800">Previous Shifts Not Closed</h3>
                  <p className="text-sm text-yellow-700">
                    You have {unclosedPreviousShifts.length} unclosed shift{unclosedPreviousShifts.length > 1 ? 's' : ''} from previous days. 
                    Please contact an administrator to close them properly.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Main check-in prompt */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-orange-700">
                    You need to check in for today's shift before starting charging sessions.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowShiftModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                Check In
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeShiftReport && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <h3 className="font-medium text-green-800">Shift Active</h3>
              <p className="text-sm text-green-700">
                Started: {new Date(activeShiftReport.checkInTime).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gun Selection from Charger Pedestals */}
      {activeShiftReport && !chargerFullyOffline && (
        <div className="mb-4 sm:mb-6">
          <Label className="text-sm font-medium mb-2 block">
            Select Charging Gun <span className="text-red-500">*</span>
          </Label>
          {gunsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading guns...
            </div>
          )}
          {!gunsLoading && !hasAnyGuns && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-700">No available guns on offline pedestals for this charger. All guns may be in use or under maintenance.</p>
            </div>
          )}
          {!gunsLoading && hasAnyGuns && (
            <Select value={selectedGunId} onValueChange={setSelectedGunId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a gun..." />
              </SelectTrigger>
              <SelectContent>
                {pedestalsWithGuns.map((pedestal) =>
                  pedestal.guns.length > 0 && (
                    <SelectGroup key={pedestal.id}>
                      <SelectLabel className="flex items-center gap-2">
                        {pedestal.name || 'Unnamed Pedestal'}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {pedestal.onlineStatus}
                        </Badge>
                      </SelectLabel>
                      {pedestal.guns.map((gun) => (
                        <SelectItem key={gun.id} value={gun.id}>
                          <span className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-green-500" />
                            {gun.name || gun.gunNumber || gun.kabisaId}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <FormInputQrScanner
            control={form.control}
            name="vehicleIdentifier"
            label="Vehicle Identifier"
            placeholder="Scan Kabisa ID / Enter License Plate"
            description="This is the License Plate found on the vehicle / Kabisa QR Code on Vehicle"
            onValueChange={(value) => {
              const normalized = normalizeLicensePlate(value)

              if (value !== normalized) {
                form.setValue('vehicleIdentifier', normalized, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }

              // Trigger customer lookup when vehicle identifier changes
              if (normalized && normalized.length >= 3) {
                debouncedLookupCustomer(normalized)
              } else {
                setCustomerData(null)
              }
            }}
          />


          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Customer Name
                  <ModificationIndicator isModified={fieldModifications.customerName.isModified} />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter customer name"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      // Mark as manually modified
                      setFieldModifications(prev => ({
                        ...prev,
                        customerName: { ...prev.customerName, isModified: true }
                      }))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Odometer Fields - Only show when customer name contains OX or NTUMA */}
          {shouldShowOdometerFields(form.watch('customerName')) && (
            <>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  This customer requires additional odometer information.
                </p>
              </div>

              <FormField
                control={form.control}
                name="odometerReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Odometer Reading <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter odometer reading"
                        {...field}
                        onChange={e => {
                          field.onChange(e.target.valueAsNumber)
                          setOdometerReading(e.target.value)
                        }}
                        value={odometerReading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>
                  Odometer Reading Image <span className="text-red-500">*</span>
                </FormLabel>
                <ImageUpload
                  name="odometer-image"
                  label="Odometer Photo"
                  currentImage={odometerImage}
                  onImageChange={(name, url) => {
                    setOdometerImage(url)
                    form.setValue('odometerReadingImage', url)
                  }}
                  isRequired={true}
                  classNames="w-full max-w-xs"
                  uploadContext="session-odometer"
                  entityId={uploadEntityId}
                />
              </div>
            </>
          )}

          <FormField
            control={form.control}
            name="startSoc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting Battery Level (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter starting SOC"
                    {...field}
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carModelMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Car Model/Make (Required)
                  <ModificationIndicator isModified={fieldModifications.carModelMake.isModified} />
                </FormLabel>
                <FormControl>
                  <CarModelSelect
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      // Mark as manually modified
                      setFieldModifications(prev => ({
                        ...prev,
                        carModelMake: { ...prev.carModelMake, isModified: true }
                      }))
                    }}
                    placeholder="Search and select car model/make..."
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Vehicle Image <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <ImageUpload
                    name="vehicle-image"
                    label="Vehicle Photo"
                    currentImage={vehicleImage}
                    onImageChange={handleImageChange}
                    isRequired={true}
                    classNames="w-full max-w-xs"
                    uploadContext="session-photo"
                    entityId={uploadEntityId}
                  />
                </FormControl>
                {fieldState.error && (
                  <FormMessage className="text-red-500 text-sm">
                    {fieldState.error.message}
                  </FormMessage>
                )}
               
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-11 sm:h-12 text-sm sm:text-base"
            disabled={isPending || !activeShiftReport || !vehicleImage || (showGunSelector && !selectedGunId)}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {(() => {
              if (!activeShiftReport) return 'Check In to Start Session'
              if (showGunSelector && !selectedGunId) return 'Select a Gun to Continue'
              return 'Start Charging Session'
            })()}
          </Button>
        
        </form>
      </Form>

      <Dialog open={showCreateId} onOpenChange={setShowCreateId}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Generate New Vehicle ID
            </DialogTitle>
          </DialogHeader>
          <PopupKabisaGenerator
            onSelectId={(id: string) => {
              form.setValue(currentField, id)
              setShowCreateId(false)
            }}
            onClose={() => setShowCreateId(false)}
          />
        </DialogContent>
      </Dialog>

      <VehicleConfirmationDialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        vehicleInfo={vehicleInfo}
        chargingInfo={chargingInfo}
        needsRegistration={needsRegistration}
        onConfirm={confirmVehicleAndStart}
      />

      <QuickRegistrationDialog
        open={showQuickRegistration}
        onClose={() => setShowQuickRegistration(false)}
        onSubmit={handleQuickRegistration}
        isLoading={isRegisteringVehicle}
        vehicleId={form.getValues("vehicleIdentifier")}
      />

      {/* Vehicle Debt Dialog */}
      {showDebtDialog && debtInfo && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/40 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white/98 backdrop-blur-sm rounded-lg p-4 sm:p-6 max-w-md w-full shadow-2xl border border-gray-300/60">

            {/* === IDLE STATE: Show debt info + pay/cancel === */}
            {debtPaymentStatus === 'idle' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Outstanding Debt</h3>
                    <p className="text-sm text-gray-500">This vehicle has an unpaid balance</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-red-600 mb-1">Amount Due</p>
                    <p className="text-3xl font-bold text-red-700">
                      {debtInfo.debtBalance.toLocaleString()} {debtInfo.currency}
                    </p>
                    {debtInfo.debtNote && (
                      <p className="text-sm text-red-500 mt-2">{debtInfo.debtNote}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  The vehicle must clear this debt before starting a charging session. Choose an option below:
                </p>

                <div className="space-y-3 mb-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Pay via Mobile Money</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Enter phone number (e.g. 078XXXXXXX)"
                      value={debtPaymentPhone}
                      onChange={(e) => setDebtPaymentPhone(e.target.value)}
                      className="mb-2"
                    />
                    <Button
                      onClick={handleDebtPayNow}
                      disabled={!debtPaymentPhone || isPending || debtPaymentLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {(isPending || debtPaymentLoading) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Pay {debtInfo.debtBalance.toLocaleString()} {debtInfo.currency} Now
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDebtCancel}
                    disabled={isPending}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Session
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDebtDialogClose}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}

            {/* === PENDING STATE: Waiting for payment confirmation === */}
            {debtPaymentStatus === 'pending' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Waiting for Payment</h3>
                    <p className="text-sm text-gray-500">Please confirm on your phone</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 mb-1">Amount</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {debtPaymentAmount.toLocaleString()} {debtPaymentCurrency}
                    </p>
                    <p className="text-sm text-blue-500 mt-2">
                      Sent to {debtPaymentPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking payment status...</span>
                </div>

                <Button
                  variant="outline"
                  onClick={handleDebtDialogClose}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            )}

            {/* === FAILED STATE: Payment failed, show retry === */}
            {debtPaymentStatus === 'failed' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment Failed</h3>
                    <p className="text-sm text-gray-500">The payment was not completed</p>
                  </div>
                </div>

                {debtPaymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{debtPaymentError}</p>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {debtPaymentAmount.toLocaleString()} {debtPaymentCurrency}
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Retry Payment</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Enter phone number (e.g. 078XXXXXXX)"
                      value={debtPaymentPhone}
                      onChange={(e) => setDebtPaymentPhone(e.target.value)}
                      className="mb-2"
                    />
                    <Button
                      onClick={handleDebtPaymentRetry}
                      disabled={!debtPaymentPhone || debtPaymentLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {debtPaymentLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Retry Payment
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleDebtDialogClose}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            )}

            {/* === COMPLETED STATE: Brief success before auto-redirect === */}
            {debtPaymentStatus === 'completed' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment Confirmed</h3>
                    <p className="text-sm text-gray-500">Starting charging session...</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Starting session...</span>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Shift Check-in Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/40 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white/98 backdrop-blur-sm rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-300/60">
            <h3 className="text-lg font-semibold mb-3 sm:mb-4">Start Your Shift</h3>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Shift Selection */}
              <div>
                <Label>Select Shift</Label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a shift...</option>
                  {sortShiftsByProximity(shifts).map((shift) => {
                    const timing = getShiftTimingIndicator(shift.dayOfWeek)
                    return (
                      <option key={shift.id} value={shift.id}>
                        {getDayName(shift.dayOfWeek)} - {shift.startTime} to {shift.endTime} ({timing.label})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Check-in Photo */}
              <div>
                <Label>Check-in Photo (Optional)</Label>
                <ImageUpload
                  name="checkin-image"
                  label="Take a photo of yourself"
                  currentImage={checkInImage}
                  onImageChange={handleImageChange}
                  isRequired={false}
                  classNames="w-full"
                  uploadContext="shift-checkin-selfie"
                  entityId={selectedShiftId || undefined}
                />
              </div>

              {/* Meter Reading */}
              <div>
                <Label>Initial Meter Reading (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter meter reading"
                  value={meterReading}
                  onChange={(e) => setMeterReading(e.target.value)}
                />
              </div>

              {/* Meter Photo */}
              {meterReading && (
                <div>
                  <Label>Meter Photo</Label>
                  <ImageUpload
                    name="meter-image"
                    label="Take a photo of the meter"
                    currentImage={meterImage}
                    onImageChange={handleImageChange}
                    isRequired={true}
                    cameraOnly
                    classNames="w-full"
                    uploadContext="shift-checkin-meter"
                    entityId={selectedShiftId || undefined}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
                <Button 
                  onClick={handleCheckIn}
                  disabled={!selectedShiftId || checkInLoading}
                  className="flex-1 order-2 sm:order-1 h-10 sm:h-11"
                >
                  {checkInLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Check In
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowShiftModal(false)}
                  disabled={checkInLoading}
                  className="order-1 sm:order-2 h-10 sm:h-11"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
