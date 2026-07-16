'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt, Lock, CheckCircle, AlertCircle, Loader2, XCircle, Phone, Building2, User, WifiOff } from 'lucide-react'
import { validateTin, generateEbm } from '@/lib/api/chargingSessions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { KABISA_TIN } from '@/lib/constants/kabisaTin'

interface EBMOperatorPopupProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: (ebmData: EBMFormData) => void
  readonly onSkip: () => void
  readonly sessionId: string
  readonly sessionData: any
  /** Phone used to settle MOMO payment. When provided, overrides the session's
   *  customerPhone as the prefill source so the operator sees the exact number
   *  that was charged. */
  readonly initialPhone?: string
}

export interface EBMFormData {
  skipEbm: boolean
  ebmCustomerName: string
  ebmTin?: string
  purchaseCode?: string
  ebmCustomerPhone?: string
  ebmDistributionPhone?: string
  tinValidated: boolean
}

// Detect if input looks like a TIN (9 digits, doesn't start with 7)
const isTinFormat = (value: string): boolean => {
  if (!value || value.length !== 9) return false
  return !value.startsWith('7')
}

// Normalize phone to 9-digit format (remove country code or leading 0)
const normalizePhone = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '')
  if (digitsOnly.startsWith('250')) return digitsOnly.slice(3)
  if (digitsOnly.startsWith('0')) return digitsOnly.slice(1)
  return digitsOnly
}

export function EBMOperatorPopup({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  sessionId,
  sessionData,
  initialPhone,
}: EBMOperatorPopupProps) {
  // Form state — TIN and Phone are now independent fields
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [tinNumber, setTinNumber] = useState('')
  const [purchaseCode, setPurchaseCode] = useState('')
  // Single "send EBM to this phone via SMS" toggle, used whether TIN is
  // supplied or not. Default on — most customers want the receipt.
  const [sendViaSms, setSendViaSms] = useState(true)

  // Validation state
  const [tinValidated, setTinValidated] = useState(false)
  const [tinValidating, setTinValidating] = useState(false)
  const [tinValidationError, setTinValidationError] = useState<string | null>(null)
  const [tinValidationWarning, setTinValidationWarning] = useState<string | null>(null)
  const [validatedCustomerName, setValidatedCustomerName] = useState<string | null>(null)
  const [validatedBusiness, setValidatedBusiness] = useState<{
    name: string | null
    statusCode: string | null
    province: string | null
    district: string | null
    sector: string | null
    location: string | null
  } | null>(null)

  // EBM generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [vsdcError, setVsdcError] = useState<string | null>(null)
  const [vsdcErrorCode, setVsdcErrorCode] = useState<string | null>(null)
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set())

  // Shake animation state
  const [shakeField, setShakeField] = useState<string | null>(null)

  // Warn-before-close: the X / Esc / outside-click flow must confirm abandon
  // because no EBM is generated for this session if the operator walks away.
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  const requestClose = () => setShowAbandonConfirm(true)

  const lastValidatedTin = useRef<string | null>(null)
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Trigger shake animation on a field
  const triggerShake = (fieldName: string) => {
    setShakeField(fieldName)
    setTimeout(() => setShakeField(null), 600)
  }

  // Auto-validate TIN function
  const autoValidateTin = useCallback(async (tinValue: string) => {
    if (!tinValue || tinValue.length !== 9 || !isTinFormat(tinValue)) return
    if (lastValidatedTin.current === tinValue && tinValidated) return

    setTinValidating(true)
    setTinValidationError(null)
    setTinValidationWarning(null)

    try {
      const result = await validateTin(tinValue)

      if (result.data.isValid === true) {
        setTinValidated(true)
        setValidatedCustomerName(result.data.customerName || null)
        setValidatedBusiness(result.data.business || null)
        lastValidatedTin.current = tinValue
        if (result.data.customerName) setCustomerName(result.data.customerName)
        setTinValidationError(null)
        setTinValidationWarning(null)
      } else if (result.data.isValid === false) {
        setTinValidated(false)
        setTinValidationWarning(result.data.reason || 'TIN not found in VSDC. You can still proceed.')
        setValidatedCustomerName(null)
        setValidatedBusiness(null)
        lastValidatedTin.current = null
      } else {
        setTinValidated(false)
        setTinValidationWarning(result.data.reason || 'VSDC service unavailable. You can proceed.')
        setValidatedCustomerName(null)
        setValidatedBusiness(null)
        lastValidatedTin.current = null
      }
    } catch (error: any) {
      setTinValidationError(error.message || 'Failed to validate TIN')
      setTinValidated(false)
      setValidatedCustomerName(null)
      setValidatedBusiness(null)
      lastValidatedTin.current = null
    } finally {
      setTinValidating(false)
    }
  }, [tinValidated])

  // Initialize form when popup opens or session changes.
  // Why: sessionData prop is often a new object ref on every parent render
  // (e.g. WS telemetry tick). Depending on it would wipe the form mid-typing.
  // We only reset on open transitions or when targeting a different session.
  useEffect(() => {
    if (!isOpen) return
    // Autofill from session — name always; phone when paid with MOMO so the
    // operator doesn't have to re-type what the customer already gave us.
    const sessionInfo = sessionData?.session || {}
    const paymentInfo = sessionData?.paymentInfo || {}
    const paidWithMomo =
      paymentInfo?.paymentMethod === 'MOMO' ||
      paymentInfo?.paymentMethod === 'MOMO_CODE_PAYMENT' ||
      paymentInfo?.paymentMethodEnum === 'MOMO' ||
      paymentInfo?.paymentMethodEnum === 'MOMO_CODE_PAYMENT' ||
      (typeof paymentInfo?.paymentMethodName === 'string' &&
        paymentInfo.paymentMethodName.toLowerCase().includes('momo'))

    setCustomerName(sessionInfo.customerName || '')
    // Prefer the phone actually used to settle the MOMO payment (forwarded via
    // the payment dialog's success ctx) over the session's stored customerPhone.
    const prefillPhoneSource =
      initialPhone || (paidWithMomo ? sessionInfo.customerPhone : undefined)
    setPhoneNumber(prefillPhoneSource ? normalizePhone(prefillPhoneSource) : '')
    setTinNumber('')
    setPurchaseCode('')
    setSendViaSms(true)
    setTinValidated(false)
    setTinValidationError(null)
    setTinValidationWarning(null)
    setValidatedCustomerName(null)
    setValidatedBusiness(null)
    setIsGenerating(false)
    setGenerationStep('')
    setVsdcError(null)
    setVsdcErrorCode(null)
    setErrorFields(new Set())
    setShakeField(null)
    lastValidatedTin.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId, initialPhone])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current)
    }
  }, [])

  // Handle TIN input — allow any 9-digit number, trigger VSDC auto-validate when complete
  const handleTinChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 9)
    setTinNumber(cleanValue)
    setVsdcError(null)
    setVsdcErrorCode(null)
    setErrorFields(prev => { const n = new Set(prev); n.delete('tin'); return n })

    if (validationTimerRef.current) clearTimeout(validationTimerRef.current)

    if (tinValidated && lastValidatedTin.current !== cleanValue) {
      // Operator is editing the TIN after a successful validation — undo the
      // auto-locked name so they can edit it again if needed
      setTinValidated(false)
      setValidatedCustomerName(null)
      setValidatedBusiness(null)
      setCustomerName(sessionData?.session?.customerName || '')
    }
    setTinValidationError(null)
    setTinValidationWarning(null)

    // Block KABISA's own TIN being entered as the customer's TIN — that would
    // attribute the sale to Kabisa itself.
    if (cleanValue === KABISA_TIN) {
      setTinValidationError('Add customer TIN, instead of KABISA TIN')
      setTinValidated(false)
      return
    }

    if (cleanValue.length === 9) {
      validationTimerRef.current = setTimeout(() => autoValidateTin(cleanValue), 500)
    }
  }

  // Handle phone input — strip formatting, keep raw digits; normalize on submit
  const handlePhoneChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 13)
    setPhoneNumber(cleanValue)
    setErrorFields(prev => { const n = new Set(prev); n.delete('phone'); return n })
  }

  const getEffectivePhone = (): string | undefined => {
    if (!phoneNumber) return undefined
    const normalized = normalizePhone(phoneNumber)
    if (normalized.length === 9 && normalized.startsWith('7')) return normalized
    return undefined
  }

  const getEffectiveTin = (): string | undefined => {
    if (tinNumber.length === 9) return tinNumber
    return undefined
  }

  // Validate before submit - shake invalid fields
  const validateAndShake = (): boolean => {
    const newErrorFields = new Set<string>()
    let firstError: string | null = null

    // Reject KABISA's own TIN being submitted as a customer TIN.
    if (tinNumber === KABISA_TIN) {
      setTinValidationError('Add customer TIN, instead of KABISA TIN')
      newErrorFields.add('tin')
      firstError = 'tin'
    }

    // Purchase code required only when TIN provided
    if (tinNumber.length === 9 && tinNumber !== KABISA_TIN) {
      if (!purchaseCode || purchaseCode.length !== 6) {
        newErrorFields.add('purchaseCode')
        if (!firstError) firstError = 'purchaseCode'
      }
    }

    setErrorFields(newErrorFields)
    if (firstError) {
      triggerShake(firstError)
      return false
    }
    return true
  }

  // Handle confirm - call VSDC synchronously
  const handleConfirm = async () => {
    if (!validateAndShake()) return

    const effectivePhone = getEffectivePhone()
    const effectiveTin = getEffectiveTin()
    // Send the EBM to the operator-entered phone via SMS when the toggle is
    // on — same behavior whether the receipt is TIN-based or phone-only.
    const normalizedDistributionPhone = sendViaSms ? effectivePhone : undefined

    setIsGenerating(true)
    setVsdcError(null)
    setVsdcErrorCode(null)
    setErrorFields(new Set())
    setGenerationStep('Saving EBM information...')

    try {
      setGenerationStep('Connecting to VSDC...')
      await new Promise(r => setTimeout(r, 300)) // brief pause so user sees the step

      setGenerationStep('Generating EBM receipt...')
      // Only forward customerName when safe: (a) walk-in (no TIN) — operator-typed
      // name is the buyer, or (b) TIN validated — field is locked to the VSDC
      // business name. If TIN entered but not validated, the field may still
      // hold stale operator input; skip it so backend keeps session-level name.
      const trimmedName = customerName.trim()
      const canSendCustomerName = !effectiveTin || tinValidated
      const result = await generateEbm({
        sessionId,
        ebmTin: effectiveTin,
        purchaseCode: (effectiveTin && purchaseCode) ? purchaseCode : undefined,
        customerPhone: effectivePhone,
        customerName: canSendCustomerName ? (trimmedName || undefined) : undefined,
        distributionPhone: normalizedDistributionPhone
      })

      if (result.status === 'error') {
        setVsdcError(result.errorMessage || result.message)
        setVsdcErrorCode(result.errorCode || null)

        // Highlight specific fields based on error
        const newErrorFields = new Set<string>()
        const msg = (result.errorMessage || '').toLowerCase()
        if (msg.includes('purchase code') || result.errorCode === 'INVALID_PURCHASE_CODE') {
          newErrorFields.add('purchaseCode')
          triggerShake('purchaseCode')
        }
        if (msg.includes('tin') || result.errorCode === 'INVALID_TIN') {
          newErrorFields.add('tin')
          triggerShake('tin')
        }
        setErrorFields(newErrorFields)
        return
      }

      setGenerationStep('EBM generated successfully!')
      toast.success('EBM receipt generated successfully')

      onConfirm({
        skipEbm: false,
        ebmCustomerName: customerName.trim(),
        ebmTin: effectiveTin,
        purchaseCode: (effectiveTin && purchaseCode) ? purchaseCode : undefined,
        ebmCustomerPhone: effectivePhone,
        ebmDistributionPhone: normalizedDistributionPhone,
        tinValidated
      })
    } catch (error: any) {
      setVsdcError(error.message || 'Failed to generate EBM. You can retry or skip.')
      setVsdcErrorCode('UNKNOWN')
    } finally {
      setIsGenerating(false)
      setGenerationStep('')
    }
  }

  const isFormValid = () => {
    if (tinNumber.length === 9) {
      if (!purchaseCode || purchaseCode.length !== 6) return false
    }
    return true
  }

  const getTinFieldStyles = () => {
    if (errorFields.has('tin')) return 'border-red-500 bg-red-50 dark:bg-red-500/10 focus:border-red-500 focus:ring-red-200'
    if (tinValidating) return 'border-blue-300 dark:border-blue-500/40 focus:border-blue-500 focus:ring-blue-200'
    if (tinValidated) return 'border-green-500 bg-green-50 dark:bg-green-500/10 focus:border-green-500 focus:ring-green-200'
    if (tinValidationError) return 'border-red-300 dark:border-red-500/40 focus:border-red-500 focus:ring-red-200'
    if (tinValidationWarning) return 'border-yellow-300 dark:border-yellow-500/40 focus:border-yellow-500 focus:ring-yellow-200'
    return ''
  }

  const getTinFieldIcon = () => {
    if (tinValidating) return <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400" />
    if (tinValidated) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
    return <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
  }

  // Loading overlay view
  if (isGenerating) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-white/10 border-t-primary animate-spin" />
              <Receipt className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-gray-900 dark:text-white">Generating EBM Receipt</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{generationStep || 'Please wait...'}</p>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) requestClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {showAbandonConfirm ? (
          <div className="py-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Close without generating EBM?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No EBM receipt will be generated for this session if you close now. You can&apos;t generate it afterwards.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAbandonConfirm(false)}>
                Keep editing
              </Button>
              <Button
                onClick={() => {
                  setShowAbandonConfirm(false)
                  onClose()
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Close anyway
              </Button>
            </div>
          </div>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            EBM Receipt Information
          </DialogTitle>
        </DialogHeader>

        {/* Session Summary */}
        <Card className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-start text-sm">
              <span className="font-medium">
                {sessionData?.session?.chargedKwh?.toFixed(2) || '0'} kWh
              </span>
            </div>
          </CardContent>
        </Card>

        {/* VSDC Error Display */}
        {vsdcError && (
          <Card className={cn(
            "border",
            vsdcErrorCode === 'VSDC_OFFLINE'
              ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10"
              : "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10"
          )}>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                {vsdcErrorCode === 'VSDC_OFFLINE' ? (
                  <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={cn(
                    "font-medium text-sm",
                    vsdcErrorCode === 'VSDC_OFFLINE' ? "text-amber-800 dark:text-amber-300" : "text-red-800 dark:text-red-300"
                  )}>
                    {vsdcErrorCode === 'VSDC_OFFLINE' ? 'VSDC Service Offline' : 'EBM Generation Failed'}
                  </p>
                  <p className={cn(
                    "text-sm mt-1",
                    vsdcErrorCode === 'VSDC_OFFLINE' ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"
                  )}>
                    {vsdcError}
                  </p>
                  <p className={cn(
                    "text-xs mt-2",
                    vsdcErrorCode === 'VSDC_OFFLINE' ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {vsdcErrorCode === 'VSDC_OFFLINE'
                      ? 'Please try again in a few minutes.'
                      : 'Please correct the highlighted fields and try again, or skip.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName" className="flex items-center gap-2">
              Customer Name <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(optional)</span>
              {tinValidated && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15 px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" />
                  Verified
                </span>
              )}
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setErrorFields(prev => { const n = new Set(prev); n.delete('customerName'); return n })
            
              }}
              placeholder="Enter customer name"
              disabled={tinValidated}
              className={cn(
                tinValidated && 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-900 dark:text-green-200',
                errorFields.has('customerName') && !tinValidated && 'border-red-500 bg-red-50 dark:bg-red-500/10',
                shakeField === 'customerName' && 'animate-[shake_0.5s_ease-in-out]'
              )}
            />
            {tinValidated && validatedCustomerName && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Name verified from RRA/VSDC
              </p>
            )}
          </div>

          {/* Phone Number — always sent as customer phone; also used as SMS distribution when TIN provided */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Enter phone (+250..., 250..., 07..., or 7...)"
                maxLength={15}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            {phoneNumber && (() => {
              const normalized = normalizePhone(phoneNumber)
              const isValid = normalized.length === 9 && normalized.startsWith('7')
              const displayPhone = isValid ? `0${normalized}` : phoneNumber
              if (!isValid) {
                return (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expected 9 digits starting with 7 (e.g. 0788123456)</p>
                )
              }
              return (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="sendViaSms"
                    checked={sendViaSms}
                    onCheckedChange={(checked) => setSendViaSms(checked as boolean)}
                  />
                  <label htmlFor="sendViaSms" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    Send EBM to <span className="font-medium">{displayPhone}</span> via SMS
                  </label>
                </div>
              )
            })()}
          </div>

          {/* TIN Number — optional; only fill if customer wants the EBM tied to their TIN */}
          <div className="space-y-2">
            <Label htmlFor="tinNumber" className="flex items-center gap-2">
              TIN <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
              {tinValidated && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="tinNumber"
                value={tinNumber}
                onChange={(e) => handleTinChange(e.target.value)}
                placeholder="Enter 9-digit TIN"
                maxLength={9}
                className={cn(
                  'pr-10',
                  getTinFieldStyles(),
                  shakeField === 'tin' && 'animate-[shake_0.5s_ease-in-out]'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getTinFieldIcon()}
              </div>
            </div>
            {tinValidationError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <XCircle className="h-3 w-3" />{tinValidationError}
              </p>
            )}
            {tinValidationWarning && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{tinValidationWarning}
              </p>
            )}
            {tinValidated && (() => {
              const biz = validatedBusiness
              const companyName = biz?.name || validatedCustomerName
              const locationBits = [biz?.sector, biz?.district, biz?.province]
                .filter((s): s is string => !!s && s.trim().length > 0)
              const locationLine = locationBits.length > 0
                ? locationBits.join(', ')
                : (biz?.location || null)
              const isActive = biz?.statusCode ? biz.statusCode.toUpperCase() === 'A' : null
              return (
                <div className="rounded-md border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-300">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Verified with VSDC</span>
                    {isActive === true && (
                      <span className="ml-auto rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 px-1.5 py-0.5 text-[10px] font-medium">Active</span>
                    )}
                    {isActive === false && biz?.statusCode && (
                      <span className="ml-auto rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 text-[10px] font-medium">{biz.statusCode}</span>
                    )}
                  </div>
                  {companyName && (
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 leading-tight">{companyName}</p>
                  )}
                  {locationLine && (
                    <p className="text-xs text-green-800 dark:text-green-300">{locationLine}</p>
                  )}
                </div>
              )
            })()}
            {tinNumber.length > 0 && tinNumber.length < 9 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {9 - tinNumber.length} more digit{9 - tinNumber.length !== 1 ? 's' : ''} needed
              </p>
            )}
            {!tinNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Leave empty if customer doesn't need an EBM tied to a TIN</p>
            )}
          </div>

          {/* Purchase Code — only shown when TIN is complete */}
          {tinNumber.length === 9 && (
            <div className="space-y-2">
              <Label htmlFor="purchaseCode" className="flex items-center gap-2">
                Purchase Code <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Request purchase code against TIN <span className="font-mono font-semibold">{KABISA_TIN}</span>
              </p>
              <Input
                id="purchaseCode"
                value={purchaseCode}
                onChange={(e) => {
                  setPurchaseCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setVsdcError(null)
                  setVsdcErrorCode(null)
                  setErrorFields(prev => { const n = new Set(prev); n.delete('purchaseCode'); return n })
                }}
                placeholder="Enter 6-digit purchase code"
                maxLength={6}
                className={cn(
                  purchaseCode.length === 6 && !errorFields.has('purchaseCode') && 'border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10',
                  errorFields.has('purchaseCode') && 'border-red-500 bg-red-50 dark:bg-red-500/10',
                  shakeField === 'purchaseCode' && 'animate-[shake_0.5s_ease-in-out]'
                )}
              />
              {errorFields.has('purchaseCode') && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {vsdcErrorCode && vsdcError
                    ? 'Purchase code was rejected by VSDC'
                    : 'Purchase code must be exactly 6 digits'}
                </p>
              )}
              {!errorFields.has('purchaseCode') && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Required for TIN-based receipts</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isGenerating}
            size="lg"
            className="h-12 px-6 text-base font-medium w-full sm:w-auto"
          >
            Skip EBM
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid() || tinValidating}
            size="lg"
            className="bg-primary hover:bg-primary/90 h-12 px-10 text-base font-semibold shadow-sm hover:shadow-md active:scale-[0.99] transition-all w-full sm:w-auto sm:min-w-[240px]"
          >
            {tinValidating ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Validating...</>
            ) : (
              <><CheckCircle className="h-5 w-5 mr-2" />Generate EBM</>
            )}
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
