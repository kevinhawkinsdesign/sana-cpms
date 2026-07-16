'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import ImageUpload from '@/components/ui/image-upload'
import { MeterReadingField } from './MeterReadingField'
import {
  checkOutOperator,
  getNextOperatorShiftStartReport,
  type CheckOutData,
  type NextShiftStartReport,
  type ShiftReport,
} from '@/lib/api/shiftsAndInspections'
import { getOperatorChargingSessionTotals } from '@/lib/api/chargingSessions'
import {
  parseMeterReadingValue,
  sanitizeMeterReadingInput,
  stripMeterReadingFormatting,
} from '@/lib/utils/formatters'
import { type Coords, formatKm } from '@/lib/utils/geo'
import { useMeterReading } from '@/lib/hooks/useMeterReading'

export interface ShiftCheckOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Active shift report (must include operatorShift.charger). */
  activeShiftReport: ShiftReport | null
  /** OperatorShift id for next-operator lookup. */
  operatorShiftId?: string | null
  /** Whether the shift is the last of the week — drives next-operator check. */
  isLastShift?: boolean
  /** Pre-verified geofence distance (meters). */
  distance?: number | null
  /** Pre-verified operator location. */
  here?: Coords | null
  /** Called after a successful check-out. */
  onCompleted?: () => void
  /** Portal target — pass the console `.kc-root` so the dialog inherits the
   *  console theme (dark/light). Defaults to <body> (dashboard, light-only). */
  container?: HTMLElement | null
}

/**
 * Shared shift check-out dialog.
 *
 * Encapsulates the full check-out form, including:
 *   - inline charging-sessions guard (no toast spam),
 *   - inline next-operator handoff guard,
 *   - meter 2 required gating for two-meter chargers,
 *   - meter-locked / meter-empty banners from the next operator,
 *   - submit-button disabled state until all required fields are present.
 *
 * Caller is responsible for the geofence pre-check and for passing the
 * already-fetched `here` + `distance`.
 */
export function ShiftCheckOutDialog({
  open,
  onOpenChange,
  activeShiftReport,
  operatorShiftId,
  isLastShift,
  distance,
  here,
  onCompleted,
  container,
}: ShiftCheckOutDialogProps) {
  const queryClient = useQueryClient()

  const charger = (activeShiftReport?.operatorShift as any)?.charger
  const requiresMeterReading = charger?.haveMeterReading === true
  const hasTwoMeters = charger?.hasTwoMeters === true
  const checkInMeter2Recorded =
    activeShiftReport?.checkInMeterReading2 !== null &&
    activeShiftReport?.checkInMeterReading2 !== undefined
  const requiresMeter2 = hasTwoMeters && checkInMeter2Recorded

  // ----- form state -----
  const [checkOutImage, setCheckOutImage] = useState<string>('')
  const [checkOutComments, setCheckOutComments] = useState<string>('')
  const {
    meterReading,
    setMeterReading,
    meterImage,
    setMeterImage,
    meterReading2,
    setMeterReading2,
    meterImage2,
    setMeterImage2,
    handleMeterReadingChange,
    handleMeterReadingFocus,
    preventInvalidNumberKey,
    resetMeterReadings,
  } = useMeterReading()

  // ----- next-operator handoff state -----
  const [nextShiftReport, setNextShiftReport] = useState<NextShiftStartReport | null>(null)
  const [nextOperatorName, setNextOperatorName] = useState<string | null>(null)
  const [nextOperatorError, setNextOperatorError] = useState<string | null>(null)
  const [isLoadingNextShift, setIsLoadingNextShift] = useState(false)
  const [isMeterReadingLocked, setIsMeterReadingLocked] = useState(false)
  const [isMeterReading2Locked, setIsMeterReading2Locked] = useState(false)

  // ----- charging sessions guard -----
  const {
    data: chargingSessionTotals,
    isError: isChargingSessionTotalsError,
    error: chargingSessionTotalsError,
    refetch: refetchChargingSessionTotals,
    status: chargingSessionTotalsStatus,
    fetchStatus: chargingSessionTotalsFetchStatus,
  } = useQuery({
    queryKey: ['operatorChargingSessionTotals'],
    queryFn: getOperatorChargingSessionTotals,
    enabled: false,
    retry: 1,
    staleTime: 30 * 1000,
  })

  const isChargingSessionTotalsLoading =
    chargingSessionTotalsStatus === 'pending' ||
    chargingSessionTotalsFetchStatus === 'fetching'
  const startedSessionsCount = chargingSessionTotals?.started ?? 0
  const pausedSessionsCount = chargingSessionTotals?.paused ?? 0
  const completedSessionsCount = chargingSessionTotals?.completed ?? 0
  const hasBlockingChargingSessions =
    startedSessionsCount > 0 || pausedSessionsCount > 0 || completedSessionsCount > 0
  const checkOutBlockedByChargingSessions = isChargingSessionTotalsLoading
  const chargingSessionTotalsErrorMessage =
    chargingSessionTotalsError instanceof Error
      ? chargingSessionTotalsError.message
      : typeof chargingSessionTotalsError === 'string'
      ? chargingSessionTotalsError
      : null
  const startedLabel = startedSessionsCount === 1 ? 'session' : 'sessions'
  const pausedLabel = pausedSessionsCount === 1 ? 'session' : 'sessions'
  const completedLabel = completedSessionsCount === 1 ? 'session' : 'sessions'

  // ----- reset on open -----
  useEffect(() => {
    if (!open) return
    setCheckOutImage('')
    setCheckOutComments('')
    resetMeterReadings()
    setNextShiftReport(null)
    setNextOperatorName(null)
    setNextOperatorError(null)
    setIsMeterReadingLocked(false)
    setIsMeterReading2Locked(false)
    refetchChargingSessionTotals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ----- next-operator fetch on open -----
  useEffect(() => {
    if (!open) return
    if (!operatorShiftId) return
    // Always probe the backend rather than trusting the caller's isLastShift
    // prop, which has historically come back undefined from the API and
    // led to both bypass *and* false-block bugs. The probe response is
    // authoritative: nextShift=null means truly last shift (no block);
    // nextShiftStartReport present means handoff data we can use; neither
    // means a next operator is scheduled but has not checked in (block).

    let cancelled = false
    setIsLoadingNextShift(true)
    ;(async () => {
      try {
        const nextShiftData = await getNextOperatorShiftStartReport(operatorShiftId)
        if (cancelled) return
        if (nextShiftData.nextShiftStartReport) {
          const nextReport = nextShiftData.nextShiftStartReport
          // Lock whenever the next operator supplied a value — A must never
          // overwrite B's reading regardless of whether A recorded the same
          // meter at her own check-in. requiresMeter*/checkInMeter*Recorded
          // describe A's check-in state and are unrelated to handoff
          // ownership.
          const hasMeterReading = nextReport.checkInMeterReading != null
          if (hasMeterReading) {
            setMeterReading(nextReport.checkInMeterReading?.toString() || '')
            setMeterImage(nextReport.checkInMeterReadingImageUrl || '')
            setIsMeterReadingLocked(true)
          } else {
            setMeterReading('')
            setMeterImage('')
            setIsMeterReadingLocked(false)
          }
          // Skip meter 2 handoff entirely when the charger is single-meter.
          // The input is hidden via hasTwoMeters and prefilling here would
          // silently lock state for a field the operator never sees, leaving
          // a stale banner and unreachable validation.
          const hasMeterReading2 = hasTwoMeters && nextReport.checkInMeterReading2 != null
          if (hasMeterReading2) {
            setMeterReading2(nextReport.checkInMeterReading2?.toString() || '')
            setMeterImage2(nextReport.checkInMeterReadingImageUrl2 || '')
            setIsMeterReading2Locked(true)
          } else {
            setMeterReading2('')
            setMeterImage2('')
            setIsMeterReading2Locked(false)
          }
          setNextShiftReport(nextReport)
          setNextOperatorError(null)
          setNextOperatorName(null)
        } else if (!nextShiftData.nextShift && !nextShiftData.nextOperator) {
          // Truly last shift of the day per backend — no next shift scheduled
          // at all. Clear any handoff block so checkout proceeds normally.
          setNextShiftReport(null)
          setNextOperatorError(null)
          setNextOperatorName(null)
          setIsMeterReadingLocked(false)
          setIsMeterReading2Locked(false)
        } else {
          const nextOp = nextShiftData.nextOperator
          const opName = nextOp ? `${nextOp.firstName} ${nextOp.lastName}` : null
          setNextOperatorName(opName)
          setNextOperatorError(
            opName
              ? `Operator ${opName} has not checked in yet.`
              : 'Next operator has not checked in yet.'
          )
          setIsMeterReadingLocked(false)
          setIsMeterReading2Locked(false)
        }
      } catch (err: any) {
        if (cancelled) return
        const nextOp = (err?.response?.data?.data as any)?.nextOperator
        const opName = nextOp ? `${nextOp.firstName} ${nextOp.lastName}` : null
        setNextOperatorName(opName)
        setNextOperatorError(
          opName
            ? `Operator ${opName} has not checked in yet.`
            : 'Next operator has not checked in yet.'
        )
        setIsMeterReadingLocked(false)
        setIsMeterReading2Locked(false)
      } finally {
        if (!cancelled) setIsLoadingNextShift(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, operatorShiftId])

  // ----- mutation -----
  const checkOutMutation = useMutation({
    mutationFn: async ({ reportId, data }: { reportId: string; data: CheckOutData }) =>
      checkOutOperator(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
      queryClient.invalidateQueries({ queryKey: ['operatorShifts'] })
      queryClient.invalidateQueries({ queryKey: ['activeShift'] })
      onOpenChange(false)
      onCompleted?.()
    },
    onError: (err: any) => {
      // Surface backend message inline via the validation banner block below.
      // Avoids the previous double toast/banner UX.
      console.error('Check-out error:', err)
    },
  })

  // ----- validation -----
  const meter1Provided = !!meterReading && meterReading.trim() !== ''
  const meter1ImageProvided = !!meterImage && meterImage.trim() !== ''
  const meter2Provided = !!meterReading2 && meterReading2.trim() !== ''
  const meter2ImageProvided = !!meterImage2 && meterImage2.trim() !== ''

  // Locked state freezes the input value (prefilled from next operator's
  // check-in) but does NOT bypass image validation. The operator can still
  // remove the prefilled image via ImageUpload, and the next operator may
  // have submitted a reading without an image — in both cases we must still
  // demand a photo before allowing checkout.
  const meter1Ok = requiresMeterReading
    ? meter1Provided && meter1ImageProvided
    : !meter1Provided || meter1ImageProvided // if optional but provided, photo still required
  const meter2Ok = requiresMeter2
    ? meter2Provided && meter2ImageProvided
    : !meter2Provided || meter2ImageProvided

  // Block strictly on probe outcome — nextOperatorError is set only when the
  // backend told us a next operator is scheduled but has not yet checked
  // in. Truly-last shifts clear this error in the probe handler above, so
  // no client-side isLastShift hint is needed (and historically that hint
  // could be undefined, causing both bypass and false-block bugs).
  const nextOpBlocks = nextOperatorError !== null

  // Defense-in-depth: without operatorShiftId we cannot run the next-operator
  // handoff check, and the caller probably also lacks charger config — meaning
  // hasTwoMeters/haveMeterReading default to false and meter validations
  // silently skip. Block submission with an explicit banner instead.
  const missingShiftContext = !operatorShiftId
  // The trigger guard already runs the geofence check before opening the
  // dialog, so `here` is normally populated. Still, treat its absence as a
  // hard block: the submit handler bails on a missing `here`, and without
  // this flag the button would look enabled while doing nothing on click.
  const missingLocation = !here

  const submitDisabled =
    checkOutMutation.isPending ||
    missingShiftContext ||
    missingLocation ||
    !meter1Ok ||
    !meter2Ok ||
    isLoadingNextShift ||
    nextOpBlocks ||
    checkOutBlockedByChargingSessions ||
    hasBlockingChargingSessions ||
    // If the charging-sessions probe failed we cannot prove the shift has
    // no pending/active sessions. Treat the unknown as blocking rather than
    // letting the operator check out past unverified business logic.
    isChargingSessionTotalsError

  const submitBlockedReason = useMemo(() => {
    if (checkOutMutation.isPending) return null
    if (missingShiftContext)
      return 'Shift details missing. Close this dialog, reload the page, and try again.'
    if (missingLocation)
      return 'Location unavailable. Enable location access and reopen the check-out form.'
    if (isLoadingNextShift) return 'Verifying next-operator handoff…'
    if (isChargingSessionTotalsLoading) return 'Verifying charging sessions…'
    if (isChargingSessionTotalsError)
      return chargingSessionTotalsErrorMessage
        ? `Could not verify charging sessions: ${chargingSessionTotalsErrorMessage}`
        : 'Could not verify charging sessions. Retry before checking out.'
    if (hasBlockingChargingSessions)
      return 'Resolve pending charging sessions before checking out.'
    if (nextOpBlocks) return nextOperatorError ?? 'Next operator must check in first.'
    if (requiresMeterReading && !meter1Ok) {
      if (!meter1Provided) return 'Meter reading and photo are required.'
      if (!meter1ImageProvided)
        return isMeterReadingLocked
          ? 'Meter 1 photo was not provided by the next operator. Add a photo to continue.'
          : 'Meter 1 photo is required.'
    }
    if (!requiresMeterReading && !meter1Ok)
      return 'Meter 1 photo is required when a reading is entered.'
    if (requiresMeter2 && !meter2Ok) {
      if (!meter2Provided)
        return 'Meter 2 final reading and photo are required for this charger.'
      if (!meter2ImageProvided)
        return isMeterReading2Locked
          ? 'Meter 2 photo was not provided by the next operator. Add a photo to continue.'
          : 'Meter 2 photo is required.'
    }
    if (!requiresMeter2 && !meter2Ok)
      return 'Meter 2 photo is required when a reading is entered.'
    return null
  }, [
    checkOutMutation.isPending,
    missingShiftContext,
    missingLocation,
    isLoadingNextShift,
    isChargingSessionTotalsLoading,
    isChargingSessionTotalsError,
    chargingSessionTotalsErrorMessage,
    hasBlockingChargingSessions,
    nextOpBlocks,
    nextOperatorError,
    requiresMeterReading,
    meter1Ok,
    meter1Provided,
    meter1ImageProvided,
    requiresMeter2,
    meter2Ok,
    meter2Provided,
    meter2ImageProvided,
    isMeterReadingLocked,
    isMeterReading2Locked,
  ])

  const handleImageChange = (name: string, url: string) => {
    if (name === 'checkout-image') setCheckOutImage(url)
    else if (name === 'meter-image') setMeterImage(url)
    else if (name === 'meter-image-2') setMeterImage2(url)
  }

  const handleSubmit = async () => {
    if (!activeShiftReport) return
    if (!here) return

    const payload: CheckOutData = {
      imageUrl: checkOutImage && checkOutImage.trim() !== '' ? checkOutImage : undefined,
      checkOutMeterReading: parseMeterReadingValue(meterReading),
      checkOutMeterReadingImageUrl:
        meterImage && meterImage.trim() !== '' ? meterImage : undefined,
      checkOutMeterReading2: parseMeterReadingValue(meterReading2),
      checkOutMeterReadingImageUrl2:
        meterImage2 && meterImage2.trim() !== '' ? meterImage2 : undefined,
      comments:
        checkOutComments && checkOutComments.trim() !== ''
          ? checkOutComments
          : undefined,
      operatorLatitude: String(here.lat),
      operatorLongitude: String(here.lng),
    }

    await checkOutMutation.mutateAsync({
      reportId: activeShiftReport.id,
      data: payload,
    })
  }

  const mutationErrorMessage =
    checkOutMutation.error instanceof Error
      ? checkOutMutation.error.message
      : typeof checkOutMutation.error === 'string'
      ? checkOutMutation.error
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={container} className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">Check Out from Shift</DialogTitle>
        </DialogHeader>

        {/* Charging sessions guard — only render when blocking, loading, or errored.
            Drops the "All sessions completed — nice work!" chrome to keep dialog terse. */}
        {(isChargingSessionTotalsLoading ||
          isChargingSessionTotalsError ||
          hasBlockingChargingSessions) && (
          <div className="mt-1 mb-2">
            <Alert
              variant={hasBlockingChargingSessions ? 'destructive' : 'default'}
              className="text-xs"
            >
              <AlertTitle className="text-sm font-semibold">
                Charging sessions
              </AlertTitle>
              <AlertDescription className="space-y-1 text-xs leading-relaxed">
                {isChargingSessionTotalsLoading ? (
                  <p>Checking for pending charging sessions…</p>
                ) : isChargingSessionTotalsError ? (
                  <p>
                    Unable to verify charging sessions.{' '}
                    {chargingSessionTotalsErrorMessage ||
                      'Please try again before checking out.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {startedSessionsCount > 0 && (
                      <p>
                        <span className="font-semibold text-foreground">
                          {startedSessionsCount}
                        </span>{' '}
                        started {startedLabel} (not yet ended).
                      </p>
                    )}
                    {pausedSessionsCount > 0 && (
                      <p>
                        <span className="font-semibold text-foreground">
                          {pausedSessionsCount}
                        </span>{' '}
                        paused {pausedLabel} (not resumed).
                      </p>
                    )}
                    {completedSessionsCount > 0 && (
                      <p>
                        <span className="font-semibold text-foreground">
                          {completedSessionsCount}
                        </span>{' '}
                        completed {completedLabel} pending payment.
                      </p>
                    )}
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Resolve these sessions before checking out.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Distance pill — formatKm already includes the "km" unit. */}
        {typeof distance === 'number' && (
          <div className="text-xs rounded-md bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30 px-2 py-1 mb-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-300">✓ {formatKm(distance)}</p>
            </div>
          </div>
        )}

        {/* Next op not checked in — single source of truth.
            The previous yellow "no meter reading" banner has been removed
            because when nextOperatorError fires it duplicates the same
            "has not checked in yet" message. */}
        {nextOperatorError && (
          <div className="text-xs rounded-md bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 px-2 py-1 mb-2">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-300">{nextOperatorError}</p>
            </div>
          </div>
        )}

        {/* Meter locked from next op (handoff inherits next operator's reading) */}
        {nextShiftReport && isMeterReadingLocked && (
          <div className="text-xs rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 px-2 py-1 mb-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <p className="text-blue-800 dark:text-blue-300">
                Using {hasTwoMeters ? 'Meter 1 reading' : 'meter reading'} from next operator:{' '}
                {nextShiftReport.operator.firstName} {nextShiftReport.operator.lastName}
              </p>
            </div>
          </div>
        )}

        {/* Meter 2 locked from next op */}
        {hasTwoMeters && nextShiftReport && isMeterReading2Locked && (
          <div className="text-xs rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 px-2 py-1 mb-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <p className="text-blue-800 dark:text-blue-300">
                Using Meter 2 reading from next operator:{' '}
                {nextShiftReport.operator.firstName} {nextShiftReport.operator.lastName}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <Label className="text-xs font-medium">Check-out Photo (Optional)</Label>
            <ImageUpload
              name="checkout-image"
              label="Take a photo of yourself"
              currentImage={checkOutImage}
              onImageChange={handleImageChange}
              isRequired={false}
              classNames="w-full"
              uploadContext="shift-checkout-selfie"
              entityId={activeShiftReport?.id}
            />
          </div>

          <MeterReadingField
            label={
              hasTwoMeters
                ? `Meter 1 Final Reading${requiresMeterReading ? ' *' : ' (Optional)'}`
                : `Final Meter Reading${requiresMeterReading ? ' *' : ' (Optional)'}`
            }
            photoLabel={hasTwoMeters ? 'Meter 1 Photo' : 'Meter Photo'}
            value={meterReading}
            onChange={(v) => !isMeterReadingLocked && handleMeterReadingChange(v)}
            onFocus={handleMeterReadingFocus}
            onBlur={() => setMeterReading((prev) => stripMeterReadingFormatting(prev))}
            onKeyDown={preventInvalidNumberKey}
            placeholder="Enter final meter reading"
            imageName="meter-image"
            imageUploadLabel="Take a photo of the meter"
            currentImage={meterImage}
            onImageChange={handleImageChange}
            uploadContext="shift-checkout-meter"
            entityId={activeShiftReport?.id}
            compact
            stepNumber={hasTwoMeters ? 1 : undefined}
            referenceImage={
              (activeShiftReport as any)?.checkInMeterReadingImageUrl
                ? {
                    url: (activeShiftReport as any).checkInMeterReadingImageUrl,
                    label: 'Check-in: Meter 1',
                  }
                : null
            }
          />

          {hasTwoMeters && (
            <MeterReadingField
              label={`Meter 2 Final Reading${requiresMeter2 ? ' *' : ' (Optional)'}`}
              photoLabel="Meter 2 Photo"
              value={meterReading2}
              onChange={(v) => !isMeterReading2Locked && setMeterReading2(sanitizeMeterReadingInput(v))}
              onBlur={() => setMeterReading2((prev) => stripMeterReadingFormatting(prev))}
              onKeyDown={preventInvalidNumberKey}
              placeholder="Enter second meter reading"
              imageName="meter-image-2"
              imageUploadLabel="Take a photo of the second meter"
              currentImage={meterImage2}
              onImageChange={handleImageChange}
              uploadContext="shift-checkout-meter2"
              entityId={activeShiftReport?.id}
              compact
              stepNumber={2}
              referenceImage={
                (activeShiftReport as any)?.checkInMeterReadingImageUrl2
                  ? {
                      url: (activeShiftReport as any).checkInMeterReadingImageUrl2,
                      label: 'Check-in: Meter 2',
                    }
                  : null
              }
            />
          )}

          <div>
            <Label className="text-xs font-medium">Comments (Optional)</Label>
            <Textarea
              placeholder="Add any comments about your shift"
              value={checkOutComments}
              onChange={(e) => setCheckOutComments(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        {/* Inline blocker hint — replaces the toast spam from previous flows. */}
        {submitBlockedReason && (
          <div className="mt-3 text-xs rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 px-2 py-1.5">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 dark:text-amber-300">{submitBlockedReason}</p>
            </div>
          </div>
        )}

        {/* Surface backend error inline (no toast). */}
        {mutationErrorMessage && (
          <div className="mt-2 text-xs rounded-md bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 px-2 py-1.5">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300">{mutationErrorMessage}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-3 sm:mt-4 pt-3 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={checkOutMutation.isPending}
            className="order-2 sm:order-1 h-9 text-sm w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="order-1 sm:order-2 h-9 text-sm w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            {checkOutMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking Out…
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Check Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
