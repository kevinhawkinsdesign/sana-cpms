'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Calculator, Car, ChevronDown, ChevronUp, Loader2, RefreshCw, UploadCloud, Wallet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ImageUpload from '@/components/ui/image-upload'
import {
  previewSessionEdit,
  updateChargingSession,
  setSessionPaymentStatus,
  syncSessionToAirtable,
  getSessionAllowedPaymentMethods,
  getSessionEBMInfo,
  updateSessionEBMInfo,
  getCurrentVsdcCodes,
  type AdminSession,
  type SessionEditPreview,
  type SessionPaymentMethod,
  type UpdateSessionData,
  type VsdcCodeItem,
} from '@/lib/api/admin'

const PAYMENT_METHOD_LABELS: Record<SessionPaymentMethod, string> = {
  MOMO: 'MoMo — sends a real request-to-pay',
  MOMO_CODE_PAYMENT: 'MoMo code — record payment',
  CARD: 'Card — record payment',
  CONTRACT: 'Contract',
  FREE_ALLOWANCE: 'Free Allowance',
  KABISA: 'Kabisa',
}
// Methods an EBM can be issued for (MoMo is async, so only MoMo-code records + issues now).
const EBM_ELIGIBLE_METHODS: SessionPaymentMethod[] = ['MOMO', 'MOMO_CODE_PAYMENT', 'CARD']

interface AdminSessionEditDialogProps {
  session: AdminSession | null
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

const formatAmount = (value: number | null | undefined, currency = 'RWF') =>
  value == null ? '—' : `${Math.round(value).toLocaleString()} ${currency}`

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))
const strOrNull = (s: string) => (s.trim() === '' ? null : s.trim())
// Empty, null and 0 all mean "no discount" — so clearing a 0/empty field isn't a change.
const normDiscount = (n: number | null) => (n == null || n === 0 ? null : n)

// before → after row in the recalculation preview
function DiffRow({ label, from, to, changed }: { label: string; from: React.ReactNode; to: React.ReactNode; changed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        <span className="text-gray-400">{from}</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <span className={changed ? 'text-blue-600' : 'text-gray-700'}>{to}</span>
      </span>
    </div>
  )
}

export function AdminSessionEditDialog({ session, open, onClose, onUpdated }: AdminSessionEditDialogProps) {
  const queryClient = useQueryClient()

  const currentPlate = session?.vehicle?.licensePlates?.[0]?.licencePlateNumber ?? ''
  const currentKwh = session?.chargedKwh ?? null
  const currentDiscountRate = session?.discountRate ?? null
  const currentDiscountAmount = session?.discountAmount ?? null

  // Top (always visible)
  const [licensePlate, setLicensePlate] = useState('')
  const [chargedKwh, setChargedKwh] = useState('')
  const [reason, setReason] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [ebmConfirmed, setEbmConfirmed] = useState(false)
  // Two independent skip choices so they don't clobber each other:
  const [skipEbmEdit, setSkipEbmEdit] = useState(false) // skip refund on a price-edit EBM reconcile
  const [skipEbmUnpaid, setSkipEbmUnpaid] = useState(false) // skip refund when marking unpaid

  // Folded "more details"
  const [showMore, setShowMore] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [carModelMake, setCarModelMake] = useState('')
  const [startSoc, setStartSoc] = useState('')
  const [endSoc, setEndSoc] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [chargerScreen, setChargerScreen] = useState<string | null>(null)
  const [discountRate, setDiscountRate] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [ebmCode, setEbmCode] = useState<string>('__default__')
  const [originalEbmCode, setOriginalEbmCode] = useState<string>('__default__')

  // Force a recalculation even if nothing else changed.
  const [forceRecalc, setForceRecalc] = useState(false)
  // Payment-status transition
  const [showPayment, setShowPayment] = useState(false)
  const [payTarget, setPayTarget] = useState<'' | 'PAID' | 'UNPAID' | 'EBM_ISSUED'>('')
  const [payMethod, setPayMethod] = useState<SessionPaymentMethod | ''>('')
  const [payPhone, setPayPhone] = useState('')

  useEffect(() => {
    if (open && session) {
      setLicensePlate(currentPlate)
      setChargedKwh(currentKwh != null ? String(currentKwh) : '')
      setReason('')
      setProofUrl(null)
      setEbmConfirmed(false)
      setSkipEbmEdit(false)
      setSkipEbmUnpaid(false)
      setForceRecalc(false)
      setShowPayment(false)
      setPayTarget('')
      setPayMethod('')
      setPayPhone('')
      setShowMore(false)
      setEbmCode('__default__')
      setOriginalEbmCode('__default__')
      setCustomerName(session.customerName ?? '')
      setCarModelMake(session.carModelMake ?? '')
      setStartSoc(session.startSoc != null ? String(session.startSoc) : '')
      setEndSoc(session.endSoc != null ? String(session.endSoc) : '')
      setImageUrl((session as { imageUrl?: string | null }).imageUrl ?? null)
      setChargerScreen((session as { chargerScreen?: string | null }).chargerScreen ?? null)
      setDiscountRate(currentDiscountRate != null ? String(currentDiscountRate) : '')
      setDiscountAmount(currentDiscountAmount != null ? String(currentDiscountAmount) : '')
    }
  }, [open, session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // EBM info (current payment-method code) + the VSDC code list for the dropdown.
  const { data: ebmInfoData } = useQuery({
    queryKey: ['sessionEBMInfo', session?.sessionId],
    queryFn: () => getSessionEBMInfo(session!.sessionId),
    enabled: open && !!session?.sessionId,
    staleTime: 0,
  })
  const { data: vsdcCodesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['vsdcCurrentCodes'],
    queryFn: () => getCurrentVsdcCodes(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })
  const paymentMethods: VsdcCodeItem[] = vsdcCodesData?.data?.paymentMethods || []

  useEffect(() => {
    const code = ebmInfoData?.data?.ebmInfo?.ebmPaymentMethodCode || '__default__'
    setEbmCode(code)
    setOriginalEbmCode(code)
  }, [ebmInfoData])

  // Changing the recalc inputs invalidates a prior edit-EBM confirmation / skip choice
  // (only the edit one — not the unpaid one, which belongs to the payment-status flow).
  useEffect(() => {
    setEbmConfirmed(false)
    setSkipEbmEdit(false)
  }, [licensePlate, chargedKwh, discountRate, discountAmount])

  // Reset the chosen method + the unpaid skip-EBM choice when the payment target changes.
  useEffect(() => {
    setPayMethod('')
    setSkipEbmUnpaid(false)
  }, [payTarget])

  // ── Change detection ──
  const plateChanged = licensePlate.trim() !== '' && licensePlate.trim().toUpperCase() !== currentPlate.toUpperCase()
  const kwhNumber = numOrNull(chargedKwh)
  const kwhValid = kwhNumber == null || (!Number.isNaN(kwhNumber) && kwhNumber >= 0 && kwhNumber <= 1000)
  const kwhChanged = kwhNumber != null && kwhNumber !== currentKwh
  const discountRateNum = numOrNull(discountRate)
  const discountAmountNum = numOrNull(discountAmount)
  const discountChanged = normDiscount(discountRateNum) !== normDiscount(currentDiscountRate)
    || normDiscount(discountAmountNum) !== normDiscount(currentDiscountAmount)
  const priceAffectingChanged = plateChanged || kwhChanged || discountChanged || forceRecalc

  const customerNameChanged = strOrNull(customerName) !== (session?.customerName ?? null)
  const carModelChanged = strOrNull(carModelMake) !== (session?.carModelMake ?? null)
  const startSocChanged = numOrNull(startSoc) !== (session?.startSoc ?? null)
  const endSocChanged = numOrNull(endSoc) !== (session?.endSoc ?? null)
  const imageChanged = (imageUrl ?? null) !== ((session as { imageUrl?: string | null } | null)?.imageUrl ?? null)
  const chargerScreenChanged = (chargerScreen ?? null) !== ((session as { chargerScreen?: string | null } | null)?.chargerScreen ?? null)
  const metadataChanged = customerNameChanged || carModelChanged || startSocChanged || endSocChanged || imageChanged || chargerScreenChanged
  const ebmMethodChanged = ebmCode !== originalEbmCode
  const paymentStatusChanged = payTarget !== ''
  // (sessionFieldChanged / hasChange depend on the preview — computed below it.)

  // ── Debounced preview (price-affecting inputs only) ──
  const [debounced, setDebounced] = useState({ plate: '', kwh: '', rate: '', amount: '' })
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ plate: licensePlate, kwh: chargedKwh, rate: discountRate, amount: discountAmount }), 400)
    return () => clearTimeout(t)
  }, [licensePlate, chargedKwh, discountRate, discountAmount])

  const dPlateChanged = debounced.plate.trim() !== '' && debounced.plate.trim().toUpperCase() !== currentPlate.toUpperCase()
  const dKwhNum = numOrNull(debounced.kwh)
  const dKwhChanged = dKwhNum != null && !Number.isNaN(dKwhNum) && dKwhNum !== currentKwh
  const dDiscountChanged = normDiscount(numOrNull(debounced.rate)) !== normDiscount(currentDiscountRate)
    || normDiscount(numOrNull(debounced.amount)) !== normDiscount(currentDiscountAmount)
  const shouldPreview = open && !!session && (dPlateChanged || dKwhChanged || dDiscountChanged || forceRecalc) && kwhValid

  const previewQuery = useQuery({
    queryKey: ['sessionEditPreview', session?.id, debounced.plate, debounced.kwh, debounced.rate, debounced.amount, forceRecalc],
    queryFn: () =>
      previewSessionEdit(session!.id, {
        licensePlate: dPlateChanged ? debounced.plate.trim() : undefined,
        chargedKwh: dKwhChanged ? Number(debounced.kwh) : undefined,
        discountAmount: numOrNull(debounced.amount) != null ? Number(debounced.amount) : undefined,
        discountRate: numOrNull(debounced.amount) == null && numOrNull(debounced.rate) != null ? Number(debounced.rate) : undefined,
        recalculate: forceRecalc || undefined,
      }),
    enabled: shouldPreview,
    // Always fetch a fresh preview (no cache reuse) so toggling Recalculate off/on can't
    // show a stale price; previewSettled holds Save disabled until the refetch resolves.
    staleTime: 0,
  })

  // Ignore the query's cached data once the preview is disabled (price change reverted),
  // and only honour requiresEbmRefund while there's a live price-affecting change — so a
  // stale "true" can't keep the save button disabled after the change is undone.
  const preview: SessionEditPreview | undefined = shouldPreview ? previewQuery.data?.data : undefined
  const requiresEbmRefund = priceAffectingChanged && (preview?.requiresEbmRefund ?? false)
  // Prefer the explicit payment-method enum; the name string is only a fallback heuristic.
  const isMomo = session?.paymentMethodEnum === 'MOMO'
    || /MOMO|MOBILE/.test((preview?.current.paymentMethod ?? session?.paymentMethodName ?? '').toUpperCase())

  // forceRecalc alone counts as a change only if it actually moves the amount.
  const recalcProducesChange = forceRecalc && (preview?.amountChanged ?? false)
  // Proof only triggers a field-edit save when it isn't being routed to the
  // payment-status call — otherwise updateChargingSession would get an empty payload.
  const proofForFieldEdit = !!proofUrl && !paymentStatusChanged
  const sessionFieldChanged = plateChanged || kwhChanged || discountChanged || metadataChanged || proofForFieldEdit || recalcProducesChange
  const paymentStatusValid =
    !paymentStatusChanged ||
    payTarget === 'UNPAID' ||
    (!!payMethod && (payMethod !== 'MOMO' || payPhone.trim().length >= 8))
  const hasChange = sessionFieldChanged || ebmMethodChanged || paymentStatusChanged

  // Allowed methods to mark this session paid — resolved by the backend for the plate
  // currently in the field (re-fetches when the license plate changes).
  const { data: allowedMethodsData, isLoading: isLoadingMethods, isFetching: isFetchingMethods } = useQuery({
    queryKey: ['sessionAllowedPaymentMethods', session?.id, debounced.plate],
    queryFn: () => getSessionAllowedPaymentMethods(session!.id, debounced.plate.trim() || undefined),
    enabled: open && !!session?.id && showPayment && (payTarget === 'PAID' || payTarget === 'EBM_ISSUED'),
    staleTime: 60 * 1000,
  })
  // Block method selection until the allowed-methods list has settled, so a choice is
  // never made on a stale/empty list (which would mis-decide Free vs Force Free Allowance).
  const methodsNotReady = isLoadingMethods || isFetchingMethods
  const allowedMethods: SessionPaymentMethod[] = allowedMethodsData?.data?.methods ?? []
  // For "mark paid + issue EBM" only synchronous EBM-eligible methods qualify — MoMo is
  // an async request-to-pay, so the EBM can't be issued until the customer confirms.
  // For a plain "mark paid", Free allowance is always offered: when the plate has no
  // allowance the backend mints + consumes an individual one for this session.
  const methodOptions = payTarget === 'EBM_ISSUED'
    ? allowedMethods.filter((m) => EBM_ELIGIBLE_METHODS.includes(m) && m !== 'MOMO')
    : Array.from(new Set<SessionPaymentMethod>([...allowedMethods, 'FREE_ALLOWANCE']))
  const payAmount = allowedMethodsData?.data?.amount
  const payCurrency = allowedMethodsData?.data?.currency ?? 'RWF'

  // Clear the selected method if the (re-resolved) allowed list no longer contains it.
  useEffect(() => {
    if (payMethod && methodOptions.length > 0 && !methodOptions.includes(payMethod)) setPayMethod('')
  }, [methodOptions, payMethod])

  const invalidate = () => {
    if (!session) return
    queryClient.invalidateQueries({ queryKey: ['session', session.sessionId] })
    queryClient.invalidateQueries({ queryKey: ['session', session.id] })
    queryClient.invalidateQueries({ queryKey: ['sessionHistory', session.id] })
    queryClient.invalidateQueries({ queryKey: ['sessionEBMInfo', session.sessionId] })
    queryClient.invalidateQueries({ queryKey: ['allSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['activeSessions'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      let lastMessage = 'Session updated'

      if (sessionFieldChanged) {
        const payload: UpdateSessionData = {}
        if (priceAffectingChanged) payload.recalculate = true
        if (plateChanged) payload.licensePlate = licensePlate.trim()
        if (kwhChanged) payload.chargedKwh = Number(chargedKwh)
        if (discountChanged) {
          if (discountAmountNum != null) payload.discountAmount = discountAmountNum
          else if (discountRateNum != null) payload.discountRate = discountRateNum
          else payload.discountAmount = 0
        }
        if (customerNameChanged) payload.customerName = strOrNull(customerName)
        if (carModelChanged) payload.carModelMake = strOrNull(carModelMake)
        if (startSocChanged && numOrNull(startSoc) != null) payload.startSoc = Number(startSoc)
        if (endSocChanged && numOrNull(endSoc) != null) payload.endSoc = Number(endSoc)
        if (imageChanged) payload.imageUrl = imageUrl
        if (chargerScreenChanged) payload.chargerScreen = chargerScreen
        // Attach reason/proof here only when there's no payment-status change — otherwise
        // they're sent with setSessionPaymentStatus below, to avoid a double submission.
        if (reason.trim() && !paymentStatusChanged) payload.reason = reason.trim()
        if (proofUrl && !paymentStatusChanged) payload.paymentProofUrl = proofUrl
        // Only relevant when this edit actually triggers an EBM refund.
        if (skipEbmEdit && requiresEbmRefund) payload.skipEbmRefund = true
        const res = await updateChargingSession(session.id, payload)
        lastMessage = res.message || lastMessage
        if (res.data.reconciliation?.warning) toast.warning(res.data.reconciliation.warning)
      }

      if (ebmMethodChanged) {
        const selected = paymentMethods.find((pm) => pm.code === ebmCode)
        await updateSessionEBMInfo(session.sessionId, {
          ebmPaymentMethodCode: ebmCode === '__default__' ? null : ebmCode,
          ebmPaymentMethodName: ebmCode === '__default__' ? null : selected?.name ?? null,
        })
      }

      if (paymentStatusChanged) {
        const res = await setSessionPaymentStatus(session.id, {
          status: payTarget as 'PAID' | 'UNPAID' | 'EBM_ISSUED',
          paymentMethod: payTarget !== 'UNPAID' ? (payMethod || undefined) : undefined,
          phone: payMethod === 'MOMO' ? payPhone.trim() || undefined : undefined,
          // Payment proof only makes sense for a paid action — never for UNPAID.
          proofUrl: payTarget !== 'UNPAID' ? (proofUrl || undefined) : undefined,
          reason: reason.trim() || undefined,
          skipEbmRefund: payTarget === 'UNPAID' && skipEbmUnpaid ? true : undefined,
          // Mint + consume an individual allowance only when the plate has none
          // (the "Force Free Allowance" case); otherwise the backend uses the existing one.
          createFreeAllowance: payMethod === 'FREE_ALLOWANCE' && !allowedMethods.includes('FREE_ALLOWANCE') ? true : undefined,
        })
        lastMessage = res.message || lastMessage
        if (res.data.reconciliation?.warning) toast.warning(res.data.reconciliation.warning)
      }
      return lastMessage
    },
    onSuccess: (message) => {
      invalidate()
      toast.success(message)
      onUpdated?.()
      onClose()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update session'),
  })

  // Force-push this session to Airtable now (independent of the edit save).
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session selected')
      return syncSessionToAirtable(session.id)
    },
    onSuccess: (res) => {
      invalidate()
      toast.success(res.message || 'Synced to Airtable')
    },
    onError: (error: any) => toast.error(error.message || 'Failed to sync to Airtable'),
  })

  // Save can't fire until the price-affecting preview for the current inputs settles.
  const inputsSettled =
    debounced.plate === licensePlate && debounced.kwh === chargedKwh && debounced.rate === discountRate && debounced.amount === discountAmount
  const needsPreview = priceAffectingChanged
  const previewSettled = !needsPreview || (inputsSettled && previewQuery.isSuccess && !previewQuery.isFetching)
  // !methodsNotReady holds Save while the allowed-methods list is (re)fetching for the
  // current plate, so the Free-vs-Force-Free-Allowance decision (createFreeAllowance) is
  // never made on a stale/empty list — which would mint a duplicate allowance. (The plate
  // debounce window is already covered by previewSettled, since a plate change needs a preview.)
  const canSave = hasChange && kwhValid && previewSettled && paymentStatusValid && (!requiresEbmRefund || skipEbmEdit || ebmConfirmed) && !methodsNotReady && !saveMutation.isPending

  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 shrink-0" />
            Edit &amp; recalculate session
          </DialogTitle>
          <DialogDescription>
            Change the license plate or kWh and the amount is recalculated from the current pricing. The session ID never changes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Session ID</span>
            <span className="ml-2 font-mono font-medium break-all">{session.sessionId}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="licensePlate" className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5 text-gray-500" /> License plate
              </Label>
              <Input
                id="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder={currentPlate || 'e.g. RAA123A'}
                className="font-mono"
              />
              {currentPlate && <p className="mt-1 text-xs text-gray-400">Current: {currentPlate}</p>}
            </div>

            <div>
              <Label htmlFor="chargedKwh">Charged kWh</Label>
              <Input
                id="chargedKwh"
                type="number"
                min="0"
                max="1000"
                step="any"
                value={chargedKwh}
                onChange={(e) => setChargedKwh(e.target.value)}
                className={!kwhValid ? 'border-red-500' : ''}
              />
              {!kwhValid && <p className="mt-1 text-xs text-red-500">kWh must be between 0 and 1000</p>}
              {currentKwh != null && <p className="mt-1 text-xs text-gray-400">Current: {currentKwh} kWh</p>}
            </div>
          </div>

          {!plateChanged && !kwhChanged && !discountChanged && (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setForceRecalc((v) => !v)}>
              <Calculator className="h-4 w-4" /> {forceRecalc ? 'Cancel recalculation' : 'Recalculate price from current pricing'}
            </Button>
          )}

          {/* Recalculation preview */}
          {shouldPreview && (
            <Card>
              <CardContent className="p-3">
                {previewQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Recalculating…
                  </div>
                ) : previewQuery.isError ? (
                  <p className="py-2 text-sm text-red-500">Could not compute preview. Check the inputs and try again.</p>
                ) : preview ? (
                  <div className="space-y-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</span>
                      {preview.vehicle.willCreate ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">New vehicle will be created</span>
                      ) : preview.vehicle.existing ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Relink to existing{preview.vehicle.existing.make ? ` · ${preview.vehicle.existing.make} ${preview.vehicle.existing.model ?? ''}`.trim() : ''}
                        </span>
                      ) : null}
                    </div>
                    <DiffRow label="License plate" from={preview.current.licensePlate ?? '—'} to={preview.updated.licensePlate ?? '—'} changed={preview.current.licensePlate !== preview.updated.licensePlate} />
                    <DiffRow label="Charged kWh" from={preview.current.chargedKwh ?? '—'} to={preview.updated.chargedKwh} changed={preview.current.chargedKwh !== preview.updated.chargedKwh} />
                    <DiffRow label="Rate / kWh" from={formatAmount(preview.current.ratePerKwh, preview.updated.currency)} to={formatAmount(preview.updated.ratePerKwh, preview.updated.currency)} changed={preview.current.ratePerKwh !== preview.updated.ratePerKwh} />
                    <DiffRow label="Total amount" from={formatAmount(preview.current.totalAmount, preview.updated.currency)} to={formatAmount(preview.updated.totalAmount, preview.updated.currency)} changed={preview.amountChanged} />
                    <p className="pt-1 text-xs text-gray-400">Pricing tier: {preview.updated.userType}{preview.updated.isInvoicedCustomer ? ' · invoiced' : ''}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* EBM reconciliation warning + explicit confirm / skip */}
          {requiresEbmRefund && (
            <Alert variant={skipEbmEdit ? 'default' : 'destructive'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>
                  This session has an EBM invoice.{' '}
                  {skipEbmEdit
                    ? <>The EBM will be <strong>left unchanged</strong> — the amount changes but the existing receipt is kept (settle it manually).</>
                    : <>Saving will <strong>refund the original EBM (credit note)</strong> and automatically <strong>re-issue a corrected EBM</strong> for the new amount.</>}
                </p>
                {!skipEbmEdit && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={ebmConfirmed} onChange={(e) => setEbmConfirmed(e.target.checked)} />
                    I understand — refund and re-issue the EBM
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={skipEbmEdit} onChange={(e) => setSkipEbmEdit(e.target.checked)} />
                  Skip EBM refund — keep the existing EBM (settle it manually)
                </label>
              </AlertDescription>
            </Alert>
          )}

          {preview?.amountChanged && isMomo && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This session was paid by MoMo, attach proof of new payment made below.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="mb-1 block">Payment proof (optional)</Label>
            <ImageUpload
              name="paymentProof"
              label="Upload payment proof"
              currentImage={proofUrl}
              onImageChange={(_name, url) => setProofUrl(url)}
              isRequired={false}
              uploadContext="payment-proof"
              entityId={session.id}
              compact
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this session being edited?" maxLength={500} />
          </div>

          {/* Folded "more details" */}
          <Button type="button" variant="ghost" size="sm" className="w-full justify-between gap-2" onClick={() => setShowMore((v) => !v)}>
            <span className="min-w-0 truncate text-left text-sm">More details</span>
            {showMore ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </Button>

          {showMore && (
            <div className="space-y-4 rounded-md border border-gray-100 p-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customerName">Customer name</Label>
                  <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="carModelMake">Make &amp; model</Label>
                  <Input id="carModelMake" value={carModelMake} onChange={(e) => setCarModelMake(e.target.value)} placeholder="e.g. Tesla Model 3" />
                </div>
                <div>
                  <Label htmlFor="startSoc">Start SOC (%)</Label>
                  <Input id="startSoc" type="number" min="0" max="100" step="any" value={startSoc} onChange={(e) => setStartSoc(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endSoc">End SOC (%)</Label>
                  <Input id="endSoc" type="number" min="0" max="100" step="any" value={endSoc} onChange={(e) => setEndSoc(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="discountRate">EBM discount (%)</Label>
                  <Input id="discountRate" type="number" min="0" max="100" step="any" value={discountRate} onChange={(e) => { setDiscountRate(e.target.value); if (e.target.value) setDiscountAmount('') }} />
                </div>
                <div>
                  <Label htmlFor="discountAmount">EBM discount amount</Label>
                  <Input id="discountAmount" type="number" min="0" step="any" value={discountAmount} onChange={(e) => { setDiscountAmount(e.target.value); if (e.target.value) setDiscountRate('') }} />
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Session image</Label>
                <ImageUpload
                  name="sessionImage"
                  label="Upload session image"
                  currentImage={imageUrl}
                  onImageChange={(_name, url) => setImageUrl(url || null)}
                  isRequired={false}
                  uploadContext="session-photo"
                  entityId={session.id}
                  compact
                />
              </div>

              <div>
                <Label className="mb-1 block">Charger screen</Label>
                <ImageUpload
                  name="chargerScreen"
                  label="Upload charger screen photo"
                  currentImage={chargerScreen}
                  onImageChange={(_name, url) => setChargerScreen(url || null)}
                  isRequired={false}
                  uploadContext="charger-screen"
                  entityId={session.id}
                  compact
                />
              </div>

              <div>
                <Label htmlFor="ebmPaymentMethod">EBM payment method</Label>
                <Select value={ebmCode} onValueChange={setEbmCode} disabled={isLoadingCodes}>
                  <SelectTrigger id="ebmPaymentMethod" className="mt-1">
                    <SelectValue placeholder={isLoadingCodes ? 'Loading…' : 'Select payment method'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default (based on transaction)</SelectItem>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.code} value={pm.code}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-400">Overrides the method shown on the EBM receipt (no re-issue).</p>
              </div>
            </div>
          )}

          {forceRecalc && preview && !preview.amountChanged && !plateChanged && !kwhChanged && !discountChanged && (
            <p className="text-xs text-gray-500">Recalculated — the amount is already up to date.</p>
          )}

          {/* Payment status */}
          <Button type="button" variant="ghost" size="sm" className="w-full justify-between gap-2" onClick={() => setShowPayment((v) => !v)}>
            <span className="flex min-w-0 items-center gap-2 truncate text-left text-sm"><Wallet className="h-4 w-4 shrink-0" /> Payment status</span>
            {showPayment ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </Button>

          {showPayment && (
            <div className="space-y-3 rounded-md border border-gray-100 p-3">
              <div>
                <Label htmlFor="payTarget">Set payment status</Label>
                <Select value={payTarget || '__none__'} onValueChange={(v) => setPayTarget(v === '__none__' ? '' : (v as 'PAID' | 'UNPAID' | 'EBM_ISSUED'))}>
                  <SelectTrigger id="payTarget" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Keep as-is</SelectItem>
                    <SelectItem value="UNPAID">Mark unpaid (void transactions)</SelectItem>
                    <SelectItem value="PAID">Mark paid</SelectItem>
                    <SelectItem value="EBM_ISSUED">Mark paid + issue EBM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(payTarget === 'PAID' || payTarget === 'EBM_ISSUED') && (
                <>
                  {payAmount != null && (
                    <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                      <span className="text-gray-500">Amount to charge</span>
                      <span className="font-semibold">{formatAmount(payAmount, payCurrency)}</span>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="payMethod">Payment method</Label>
                    <Select value={payMethod || ''} onValueChange={(v) => setPayMethod(v as SessionPaymentMethod)} disabled={methodsNotReady}>
                      <SelectTrigger id="payMethod" className="mt-1">
                        <SelectValue placeholder={methodsNotReady ? 'Loading methods…' : 'Select a method'} />
                      </SelectTrigger>
                      <SelectContent>
                        {methodOptions.map((m) => {
                          // Free allowance: "Free Allowance" when the plate already has one,
                          // "Force Free Allowance" when we'll mint + consume an individual one.
                          const label = m === 'FREE_ALLOWANCE'
                            ? (allowedMethods.includes('FREE_ALLOWANCE') ? 'Free Allowance' : 'Force Free Allowance')
                            : PAYMENT_METHOD_LABELS[m]
                          return <SelectItem key={m} value={m}>{label}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                    {!methodsNotReady && allowedMethods.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">No standard payment method resolved for this plate — you can still record it as a free allowance below.</p>
                    )}
                    {payMethod === 'FREE_ALLOWANCE' ? (
                      allowedMethods.includes('FREE_ALLOWANCE') ? (
                        <p className="mt-1 text-xs text-emerald-600">Uses this vehicle&apos;s existing free charging allowance.</p>
                      ) : (
                        <p className="mt-1 text-xs text-emerald-600">
                          No allowance on this vehicle — creates &amp; consumes an individual one (sized to this session) and registers the customer as the vehicle owner. The amount is kept but recorded as covered. Add a reason above.
                        </p>
                      )
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Only methods allowed for this plate are shown. Proof above is optional.</p>
                    )}
                  </div>
                  {payMethod === 'MOMO' && (
                    <div>
                      <Label htmlFor="payPhone">Customer phone (for the MoMo request)</Label>
                      <Input id="payPhone" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="e.g. 0781234567" />
                    </div>
                  )}
                </>
              )}

              {payTarget === 'UNPAID' && (
                <>
                  <p className="text-xs text-gray-500">Voids the session&apos;s completed transactions and marks it unpaid. Any EBM is refunded unless skipped.</p>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={skipEbmUnpaid} onChange={(e) => setSkipEbmUnpaid(e.target.checked)} />
                    Skip EBM refund — keep the existing EBM
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto gap-2 text-gray-600"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Force-sync this session to Airtable now"
          >
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Sync to Airtable
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave}>
            {saveMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AdminSessionEditDialog
