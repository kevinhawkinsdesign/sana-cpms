'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/components/ui/button"
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

import { EnhancedPaymentDialog } from "./EnhancedPaymentDialog"
import { FinishRegistrationDialog } from "./FinishRegistrationDialog"
import { InvoiceCustomerPopup } from "./InvoiceCustomerPopup"
import { FreeAllowancePopup } from "./FreeAllowancePopup"
import { ContractPaymentPopup } from "./ContractPaymentPopup"
import { EBMOperatorPopup, EBMFormData } from "./EBMOperatorPopup"
import { endChargingSession, getSessionById, generateEbm, EndSessionData as EndSessionApiData } from "@/lib/api/chargingSessions"
import { FormInputQrScanner } from "@/components/shared/FormInputQrScanner"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter"
import { DASHBOARD_BASE, sessionsListHref } from "@/lib/utils/operatorNav"
import ImageUpload from "@/components/ui/image-upload"
import { Label } from "@/components/ui/label"

// Define the schema
const endSessionSchema = z.object({
  vehicleIdentifier: z.string().min(3, "Vehicle identifier must be at least 3 characters").max(10, "Vehicle identifier must be at most 10 characters").transform(val => val.toUpperCase()),
  chargedKwh: z.number().min(0.1, "Energy charged must be at least 0.1 kWh").max(400, "Energy charged cannot exceed 400 kWh"),
  endSoc: z.number().min(0).max(100, "SOC must be between 0 and 100"),
})

type EndSessionData = z.infer<typeof endSessionSchema>

function PaymentSuccessDialog({ open, onClose, onGoToSessions }: { open: boolean, onClose: () => void, onGoToSessions: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Payment Successful</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-center text-green-700 font-semibold">
          Payment completed successfully!
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={onGoToSessions}>
            Go to Sessions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * EndSession Component
 *
 * Flow: End Session Form -> Payment Dialog -> EBM Operator Popup (after payment) -> Navigate
 *
 * EBM info is collected AFTER payment so that VSDC errors (wrong purchase code, etc.)
 * can be shown to the operator in real-time.
 */
export function EndSession({ basePath = DASHBOARD_BASE }: Readonly<{ basePath?: string }> = {}) {
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [sessionData, setSessionData] = useState<any>(null)
  const [showFinishRegistration, setShowFinishRegistration] = useState(false)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
  const [showEnhancedPayment, setShowEnhancedPayment] = useState(false)
  const [showInvoicePopup, setShowInvoicePopup] = useState(false)
  const [showFreeAllowancePopup, setShowFreeAllowancePopup] = useState(false)
  const [showContractPopup, setShowContractPopup] = useState(false)
  const [showEbmPopup, setShowEbmPopup] = useState(false)
  const [momoPaidPhone, setMomoPaidPhone] = useState<string | undefined>(undefined)
  const [pendingSessionData, setPendingSessionData] = useState<any>(null)
  const [storedSessionData, setStoredSessionData] = useState<any>(null)
  const [chargerScreen, setChargerScreen] = useState<string>('')

  const searchParams = useSearchParams()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()

  const form = useForm<EndSessionData>({
    resolver: zodResolver(endSessionSchema),
    defaultValues: {
      vehicleIdentifier: "",
      chargedKwh: undefined,
      endSoc: undefined,
    }
  })

  // Function to prefill from stored session data
  const prefillFromSessionData = async (sessionId: string) => {
    try {
      const session = await getSessionById(sessionId)
      setStoredSessionData(session)

      console.log('Retrieved session data for EndSession:', {
        sessionId: session.id,
        customerName: session.customerName,
        carModelMake: session.carModelMake,
        vehicleId: session.vehicleId
      })
    } catch (error) {
      console.error('Failed to load session data:', error)
    }
  }

  // Handle URL parameters
  useEffect(() => {
    const vehicleIdentifier = searchParams.get('vehicleIdentifier')
    const sessionId = searchParams.get('sessionId') // If available

    if (vehicleIdentifier) {
      form.setValue('vehicleIdentifier', vehicleIdentifier, { shouldValidate: true })

      // If we have sessionId, prefill from session data instead of lookup
      if (sessionId) {
        prefillFromSessionData(sessionId)
      }
    }
  }, [form, searchParams])

  // Submit form -> call end session API directly (no EBM popup before payment)
  const onSubmit = async (data: EndSessionData) => {
    // Validate that charger screen image is provided
    if (!chargerScreen) {
      toast.error('Please capture the charger screen image')
      return
    }

    const formData: EndSessionData = {
      ...data,
      chargerScreen
    }

    await processEndSession(formData)
  }

  // Process the end session API call
  const processEndSession = async (formData: EndSessionData) => {
    setLoading(true)
    try {
      // End session without EBM data - EBM will be handled after payment
      const endSessionData: EndSessionApiData = {
        ...formData
      }

      const result = await endChargingSession(endSessionData)

      // Normalize legacy vs split-session responses into a single shape
      const mainSession =
        result.session ??
        result.paidSession ??
        result.freeSession ??
        null

      const mainPaymentInfo =
        result.paymentInfo ??
        result.paidPaymentInfo ??
        result.freePaymentInfo ??
        null

      // If the backend split the session into free + paid parts,
      // compute a small summary so the payment popup can explain it.
      const freeKwh = result.freeSession?.chargedKwh ?? 0
      const paidKwh =
        result.paidSession?.chargedKwh ??
        mainSession?.chargedKwh ??
        0

      const splitEnergyInfo =
        freeKwh > 0 && paidKwh > 0
          ? {
              totalKwh: freeKwh + paidKwh,
              freeKwh,
              paidKwh,
            }
          : null

      const normalizedResult = {
        ...result,
        session: mainSession,
        paymentInfo: mainPaymentInfo,
        splitEnergyInfo,
      }

      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

      // Store the session data
      setSessionData(normalizedResult)
      if (mainSession?.id) {
        setSessionId(mainSession.id)
      }

      const paymentInfo = normalizedResult.paymentInfo


      const hasFreeAllowance = (
        (normalizedResult.shouldPay === false && normalizedResult.paymentMethodEnum === 'FREE_ALLOWANCE') ||
        (paymentInfo?.paymentMethod === 'FREE_ALLOWANCE') ||
        (normalizedResult.paymentMethodName === 'Free Charging Allowance' || normalizedResult.paymentMethodName === 'Free Allowance') ||
        (normalizedResult.paymentMethodEnum === 'FREE_ALLOWANCE') ||
        (normalizedResult.freePaymentInfo?.paymentMethod === 'FREE_ALLOWANCE') ||
        (normalizedResult.freePaymentInfo?.paymentMethodEnum === 'FREE_ALLOWANCE')
      )

      const isContractPayment = (
        normalizedResult.paymentInfo?.paymentMethod === 'CONTRACT' ||
        normalizedResult.paymentMethodEnum?.includes('CONTRACT') ||
        normalizedResult.paidPaymentInfo?.paymentMethod === 'CONTRACT' ||
        normalizedResult.paidPaymentInfo?.paymentMethodEnum === 'CONTRACT'
      )

      // Detect a fully free session (no amount to pay, covered entirely by allowance)
      const isCompletelyFreeAllowance =
        hasFreeAllowance &&
        normalizedResult.session?.totalAmount === 0 &&
        paymentInfo?.amount === 0 &&
        paymentInfo.isPaid === true

      if (isCompletelyFreeAllowance) {
        setPendingSessionData(normalizedResult)
        setShowFreeAllowancePopup(true)
      } else if (hasFreeAllowance && !paymentInfo?.shouldPay) {
        setPendingSessionData(normalizedResult)
        setShowFreeAllowancePopup(true)
      } else if (isContractPayment) {
        setPendingSessionData(normalizedResult)
        setShowContractPopup(true)
      } else if (normalizedResult.isInvoicedCustomer) {
        setPendingSessionData(normalizedResult)
        setShowInvoicePopup(true)
      } else if (
        normalizedResult.paymentInfo &&
        !normalizedResult.paymentInfo.isPaid &&
        normalizedResult.paymentInfo.amount > 0
      ) {
        setPendingSessionData(normalizedResult)
        setShowEnhancedPayment(true)
      } else {
        // Session is already paid
        setTimeout(() => {
          router.push(sessionsListHref(basePath))
        }, 2000)
      }

    } catch (error: any) {
      console.error("Error ending session:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnhancedPaymentSuccess = (ctx?: { chargerGenerateEbm?: boolean; momoPhoneNumber?: string }) => {
    setShowEnhancedPayment(false)
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })

    // Overwrite unconditionally (including to undefined) so a non-MOMO path
    // can't inherit a stale phone from an earlier attempt on the same mount.
    setMomoPaidPhone(ctx?.momoPhoneNumber)

    // Popup gated by charger's EBM rollout flag. Prefer the ctx passed from the
    // payment dialog (ws/poll/http-init all flow it through) since the local
    // sessionData shape often lacks charger.generateEbm for MOMO paths.
    const ebmEnabled =
      ctx?.chargerGenerateEbm ?? sessionData?.session?.charger?.generateEbm ?? false
    if (ebmEnabled === true) {
      setShowEbmPopup(true)
    } else {
      setTimeout(() => {
        router.push(sessionsListHref(basePath))
      }, 2000)
    }
  }

  const handleFreeAllowanceProceed = async () => {
    try {
      setShowFreeAllowancePopup(false)
      setPendingSessionData(null)
      toast.success('Session completed successfully with free charging allowance')
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })
      setTimeout(() => router.push(sessionsListHref(basePath)), 2000)
    } catch (error) {
      console.error('Error handling free allowance proceed:', error)
      toast.error('An error occurred while completing the session')
    }
  }

  const handleInvoiceProceed = async () => {
    try {
      setShowInvoicePopup(false)
      setPendingSessionData(null)
      toast.success('Session completed successfully for invoice customer')
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })
      setTimeout(() => router.push(sessionsListHref(basePath)), 2000)
    } catch (error) {
      toast.error('Failed to complete session')
      console.error('Error completing invoice session:', error)
    }
  }

  const handleContractProceed = async () => {
    try {
      setShowContractPopup(false)
      setPendingSessionData(null)
      toast.success('Session completed successfully - billed to contract')
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['operatorSessions'] })
      setTimeout(() => router.push(sessionsListHref(basePath)), 2000)
    } catch (error) {
      toast.error('Failed to complete session')
      console.error('Error completing contract session:', error)
    }
  }



  return (
    <>
      {/* Session Data Indicator */}
      {storedSessionData && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="font-medium text-green-800">Session Data Available</h3>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Customer:</strong> {storedSessionData.customerName || 'Not specified'}</p>
            <p><strong>Vehicle:</strong> {storedSessionData.carModelMake || 'Not specified'}</p>
            <p className="text-xs text-green-600 mt-2">
              This data was entered when the session started and will be used for the final session record.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormInputQrScanner
            control={form.control}
            name="vehicleIdentifier"
            label="Vehicle Identifier"
            placeholder="Scan Kabisa ID / Enter License Plate"
            description="This is the License Plate found on the vehicle / Kabisa QR Code on Vehicle"
          />



          <FormField
            control={form.control}
            name="chargedKwh"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Energy Charged (kWh)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter energy charged"
                    step="0.0001"
                    min="0.0001"
                    max="400"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Enter the total energy consumed during this session (up to 4 decimal places, maximum 400 kWh)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endSoc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End SOC (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter ending SOC"
                    min="0"
                    max="100"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Enter the final battery percentage of the vehicle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Charger Screen Image */}
          <div className="space-y-2">
            <Label>Charger Screen Image <span className="text-red-500">*</span></Label>
            <ImageUpload
              name="charger-screen"
              label="Capture charger screen"
              currentImage={chargerScreen}
              onImageChange={(name, url) => setChargerScreen(url)}
              isRequired={true}
              classNames="w-full"
              cameraOnly={true}
              uploadContext="session-photo"
              entityId={sessionId || undefined}
            />
            <p className="text-xs text-muted-foreground">
              Take a photo of the charger screen showing the final reading
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            End Session
          </Button>
        </form>
      </Form>



      <PaymentSuccessDialog
        open={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        onGoToSessions={() => {
          setShowPaymentSuccess(false)
          router.push(sessionsListHref(basePath))
        }}
      />

      <FinishRegistrationDialog
        open={showFinishRegistration}
        onClose={() => setShowFinishRegistration(false)}
        vehicleId={form.getValues('vehicleIdentifier')}
      />

      {/* Enhanced Payment Dialog - EBM popup follows after payment success */}
      {showEnhancedPayment && sessionData && (
        <EnhancedPaymentDialog
          session={sessionData.session}
          paymentInfo={sessionData.paymentInfo}
          splitEnergyInfo={sessionData.splitEnergyInfo}
          onSuccess={handleEnhancedPaymentSuccess}
          onClose={() => setShowEnhancedPayment(false)}
        />
      )}

      {/* Invoice Customer Popup */}
      <InvoiceCustomerPopup
        isOpen={showInvoicePopup}
        onClose={() => {
          setShowInvoicePopup(false)
          setPendingSessionData(null)
        }}
        onProceed={handleInvoiceProceed}
        sessionData={pendingSessionData}
      />

      {/* Free Allowance Popup */}
      <FreeAllowancePopup
        isOpen={showFreeAllowancePopup}
        onClose={() => {
          setShowFreeAllowancePopup(false)
          setPendingSessionData(null)
        }}
        onProceed={handleFreeAllowanceProceed}
        sessionData={pendingSessionData}
      />

      {/* Contract Payment Popup */}
      <ContractPaymentPopup
        isOpen={showContractPopup}
        onClose={() => {
          setShowContractPopup(false)
          setPendingSessionData(null)
        }}
        onProceed={handleContractProceed}
        sessionData={pendingSessionData}
      />

      {/* EBM Operator Popup - gated by SHOW_EBM_POPUP constant */}
      <EBMOperatorPopup
        isOpen={showEbmPopup}
        onClose={() => {
          setShowEbmPopup(false)
        }}
        onConfirm={() => {
          setShowEbmPopup(false)
          router.push(sessionsListHref(basePath))
        }}
        onSkip={() => {
          if (sessionId) {
            generateEbm({ sessionId }).catch(() => {})
          }
          setShowEbmPopup(false)
          router.push(sessionsListHref(basePath))
        }}
        sessionId={sessionId}
        initialPhone={momoPaidPhone}
        sessionData={{
          session: sessionData?.session || {
            customerName: storedSessionData?.customerName || '',
            chargedKwh: sessionData?.session?.chargedKwh || 0,
            startTime: storedSessionData?.startTime || new Date().toISOString(),
            endTime: new Date().toISOString()
          },
          paymentInfo: sessionData?.paymentInfo || {
            amount: 0,
            currency: 'RWF',
            validationDetails: {}
          }
        }}
      />
    </>
  )
}
