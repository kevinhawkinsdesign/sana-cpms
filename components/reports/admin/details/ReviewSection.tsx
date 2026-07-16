'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ShieldCheck,
  Flag,
  History,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  APPROVAL_REASON_PRESETS,
  FLAG_REASON_PRESETS,
  type ApprovalReasonPreset,
  type FlagReasonPreset,
  type ShiftReportApprovalEvent,
  type ApprovalActor,
  getShiftReportApprovalHistory,
  setShiftReportApproval,
  setShiftReportFlag,
} from '@/lib/api/shiftsAndInspections'
import { Section } from './Section'

dayjs.extend(utc)
dayjs.extend(timezone)

const KIGALI_TIMEZONE = 'Africa/Kigali'

type ReviewMode = 'approve' | 'revoke' | 'flag' | 'unflag'

interface ReviewSectionProps {
  reportId: string
  isApproved: boolean
  approvedAt: string | null
  approvalReason: string | null
  approvedBy: ApprovalActor | null
  isFlagged: boolean
  flaggedAt: string | null
  flagReason: string | null
  flaggedBy: ApprovalActor | null
  events: ShiftReportApprovalEvent[]
  isReadyForReview: boolean
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  reportId,
  isApproved,
  approvedAt,
  approvalReason,
  approvedBy,
  isFlagged,
  flaggedAt,
  flagReason,
  flaggedBy,
  events,
  isReadyForReview,
}) => {
  const [modalMode, setModalMode] = useState<ReviewMode | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['shiftReportDetail', reportId] })
    queryClient.invalidateQueries({ queryKey: ['shiftReports'] })
    queryClient.invalidateQueries({ queryKey: ['adminShiftReports'] })
    queryClient.invalidateQueries({ queryKey: ['shiftReportApprovalHistory', reportId] })
  }

  const mutation = useMutation({
    mutationFn: async (input: { mode: ReviewMode; reasonPreset: string; reason: string }) => {
      if (input.mode === 'approve' || input.mode === 'revoke') {
        return setShiftReportApproval(reportId, {
          approved: input.mode === 'approve',
          reasonPreset: input.reasonPreset as ApprovalReasonPreset,
          reason: input.reason,
        })
      }
      return setShiftReportFlag(reportId, {
        flagged: input.mode === 'flag',
        reasonPreset: input.reasonPreset as FlagReasonPreset,
        reason: input.reason,
      })
    },
    onSuccess: () => {
      invalidateAll()
      setModalMode(null)
    },
  })

  const openModal = (m: ReviewMode) => {
    mutation.reset()
    setModalMode(m)
  }
  const closeModal = () => {
    mutation.reset()
    setModalMode(null)
  }

  const currentState: 'approved' | 'flagged' | 'pending' = isApproved
    ? 'approved'
    : isFlagged
      ? 'flagged'
      : 'pending'

  // Compute the "flagged-then-approved" resolution context. The events
  // list arrives desc-ordered (latest first). For the approved card we
  // surface the prior FLAGGED + auto-UNFLAGGED pair that this approval
  // resolved — so admins see both the original concern AND the
  // resolution note inline without opening the History panel.
  //
  // The backend tags cascade-emitted rows with `isAutoEvent: true` so we
  // never restate the canonical reason string here — that constant lives
  // exclusively in the backend service (operatorService.ts) as the
  // single source of truth.
  const priorFlag = (() => {
    if (currentState !== 'approved') return null
    const latestApprovedIdx = events.findIndex((e) => e.action === 'APPROVED')
    if (latestApprovedIdx === -1) return null
    // Events are desc-ordered; the event "just before" the approval in
    // chronological time is at index latestApprovedIdx + 1.
    const prior = events[latestApprovedIdx + 1]
    if (!prior) return null
    if (prior.action !== 'UNFLAGGED') return null
    if (!prior.isAutoEvent) return null
    // Walk further back for the FLAGGED event that this resolution closed.
    const flagged = events.slice(latestApprovedIdx + 2).find((e) => e.action === 'FLAGGED')
    if (!flagged) return null
    return flagged
  })()

  return (
    <Section
      title="Admin Review"
      right={
        events.length > 0 ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setHistoryOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <History className="h-3 w-3" />
            History
            <motion.span animate={{ rotate: historyOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3 w-3" />
            </motion.span>
          </motion.button>
        ) : null
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {currentState === 'approved' && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40 p-3.5 flex flex-col gap-2.5"
          >
            {priorFlag && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 flex items-start gap-2.5"
              >
                <Flag className="h-4 w-4 text-amber-700 fill-amber-200 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-semibold text-amber-900">
                    Previously flagged
                  </div>
                  <div className="text-[10.5px] text-amber-800/80 mt-0.5">
                    {priorFlag.actor
                      ? `By ${priorFlag.actor.firstName} ${priorFlag.actor.lastName}`.trim()
                      : 'By admin'}
                    {priorFlag.createdAt &&
                      ` · ${dayjs(priorFlag.createdAt).tz(KIGALI_TIMEZONE).format('MMM DD, HH:mm')}`}
                  </div>
                  {priorFlag.reason && (
                    <div className="text-[11.5px] text-amber-900/90 mt-1.5 leading-snug">
                      “{priorFlag.reason}”
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div className="flex items-start gap-2.5">
              <motion.div
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 20, delay: 0.05 }}
                className="relative"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <motion.span
                  className="absolute inset-0 rounded-full bg-emerald-400/40"
                  animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-emerald-900">
                  {priorFlag ? 'Approved (flag resolved)' : 'Approved'}
                </div>
                <div className="text-[11.5px] text-emerald-800/80 mt-0.5">
                  {approvedBy
                    ? `By ${approvedBy.firstName} ${approvedBy.lastName}`.trim()
                    : 'By admin'}
                  {approvedAt && ` · ${dayjs(approvedAt).tz(KIGALI_TIMEZONE).format('MMM DD, HH:mm')}`}
                </div>
                {approvalReason && (
                  <div className="text-[12px] text-emerald-900/90 mt-2 leading-snug">
                    “{approvalReason}”
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[12px] border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                  onClick={() => openModal('revoke')}
                >
                  Revoke
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[12px] border-amber-200 text-amber-800 hover:bg-amber-50"
                  onClick={() => openModal('flag')}
                >
                  <Flag className="h-3 w-3 mr-1" />
                  Flag instead
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {currentState === 'flagged' && (
          <motion.div
            key="flagged"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-50/40 p-3.5 flex flex-col gap-2.5"
          >
            <div className="flex items-start gap-2.5">
              <motion.div
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 20, delay: 0.05 }}
                className="relative"
              >
                <Flag className="h-5 w-5 text-amber-700 fill-amber-200" />
                <motion.span
                  className="absolute inset-0 rounded-full bg-amber-400/50"
                  animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-amber-900">Flagged</div>
                <div className="text-[11.5px] text-amber-800/80 mt-0.5">
                  {flaggedBy
                    ? `By ${flaggedBy.firstName} ${flaggedBy.lastName}`.trim()
                    : 'By admin'}
                  {flaggedAt && ` · ${dayjs(flaggedAt).tz(KIGALI_TIMEZONE).format('MMM DD, HH:mm')}`}
                </div>
                {flagReason && (
                  <div className="text-[12px] text-amber-900/90 mt-2 leading-snug">
                    “{flagReason}”
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[12px] border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => openModal('unflag')}
                >
                  Clear flag
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  size="sm"
                  className="w-full h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openModal('approve')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve instead
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {currentState === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-700">Pending review</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isReadyForReview
                    ? 'Review the values, then approve or flag this shift.'
                    : 'Shift must be checked out before it can be reviewed.'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  disabled={!isReadyForReview}
                  onClick={() => openModal('approve')}
                  className="w-full h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isReadyForReview}
                  onClick={() => openModal('flag')}
                  className="w-full h-8 text-[12px] border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Flag className="h-3 w-3 mr-1" />
                  Flag
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            key="history"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ApprovalHistoryList reportId={reportId} initialEvents={events} />
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewDialog
        open={modalMode !== null}
        mode={modalMode}
        currentState={currentState}
        isSubmitting={mutation.isPending}
        error={mutation.error as Error | null}
        onCancel={closeModal}
        onSubmit={(payload) =>
          mutation.mutate({
            mode: modalMode!,
            reasonPreset: payload.reasonPreset,
            reason: payload.reason,
          })
        }
      />
    </Section>
  )
}

interface ReviewDialogProps {
  open: boolean
  mode: ReviewMode | null
  currentState: 'approved' | 'flagged' | 'pending'
  isSubmitting: boolean
  error: Error | null
  onCancel: () => void
  onSubmit: (payload: { reasonPreset: string; reason: string }) => void
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  mode,
  currentState,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}) => {
  const isFlagMode = mode === 'flag' || mode === 'unflag'
  const presets = isFlagMode ? FLAG_REASON_PRESETS : APPROVAL_REASON_PRESETS
  const defaultPreset = (presets[0]?.value ?? '') as string

  const [preset, setPreset] = useState<string>(defaultPreset)
  const [reason, setReason] = useState('')

  React.useEffect(() => {
    if (open) {
      setPreset(defaultPreset)
      setReason('')
    }
  }, [open, defaultPreset])

  const trimmed = reason.trim()
  const canSubmit = trimmed.length > 0 && !isSubmitting && mode !== null

  const title =
    mode === 'approve'
      ? 'Approve shift'
      : mode === 'revoke'
        ? 'Revoke approval'
        : mode === 'flag'
          ? 'Flag shift'
          : 'Clear flag'
  const cta =
    mode === 'approve'
      ? 'Approve'
      : mode === 'revoke'
        ? 'Revoke'
        : mode === 'flag'
          ? 'Flag'
          : 'Clear flag'

  const cascadeNotice =
    mode === 'flag' && currentState === 'approved'
      ? 'This will also revoke the existing approval. Both events will appear in the audit log.'
      : mode === 'approve' && currentState === 'flagged'
        ? 'This will also clear the existing flag. Both events will appear in the audit log.'
        : null

  const ctaCls =
    mode === 'approve'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : mode === 'flag'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : mode === 'revoke'
          ? 'bg-rose-600 hover:bg-rose-700 text-white'
          : 'bg-slate-700 hover:bg-slate-800 text-white'

  const placeholder =
    mode === 'approve'
      ? 'Why are you approving this shift?'
      : mode === 'revoke'
        ? 'Why are you revoking this approval?'
        : mode === 'flag'
          ? 'Why are you flagging this shift?'
          : 'Why are you clearing the flag?'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onCancel() }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="p-5 flex flex-col gap-4"
        >
          <DialogTitle className="text-[15px] font-bold text-slate-900">{title}</DialogTitle>

          {cascadeNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2"
            >
              {cascadeNotice}
            </motion.div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Reason
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {presets.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider inline-flex items-center gap-1">
              Note
              <span className="text-rose-500" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              required
              aria-required="true"
              placeholder={placeholder}
              className="rounded-md border border-slate-200 bg-white p-2.5 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400">
                {trimmed.length === 0 ? 'Required to submit' : ' '}
              </span>
              <span className="text-[10.5px] text-slate-400">{trimmed.length}/1000</span>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-2"
            >
              {error.message}
            </motion.div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <motion.div whileHover={canSubmit ? { scale: 1.03 } : undefined} whileTap={canSubmit ? { scale: 0.97 } : undefined}>
              <Button
                size="sm"
                disabled={!canSubmit}
                onClick={() => onSubmit({ reasonPreset: preset, reason: trimmed })}
                className={ctaCls}
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {cta}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

interface ApprovalHistoryListProps {
  reportId: string
  initialEvents: ShiftReportApprovalEvent[]
}

const HISTORY_ACTION_META: Record<
  ShiftReportApprovalEvent['action'],
  { dot: string; label: string }
> = {
  APPROVED: { dot: 'bg-emerald-500', label: 'Approved' },
  UNAPPROVED: { dot: 'bg-rose-500', label: 'Approval revoked' },
  FLAGGED: { dot: 'bg-amber-500', label: 'Flagged' },
  UNFLAGGED: { dot: 'bg-slate-500', label: 'Flag cleared' },
}

const ApprovalHistoryList: React.FC<ApprovalHistoryListProps> = ({ reportId, initialEvents }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['shiftReportApprovalHistory', reportId],
    queryFn: () => getShiftReportApprovalHistory(reportId),
    initialData: { events: initialEvents },
    staleTime: 10_000,
  })

  const events = data?.events ?? []

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white">
      {isLoading && events.length === 0 ? (
        <div className="p-3 text-[11.5px] text-slate-400">Loading history…</div>
      ) : events.length === 0 ? (
        <div className="p-3 text-[11.5px] text-slate-400">No review activity yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {events.map((ev, idx) => {
            const meta = HISTORY_ACTION_META[ev.action] ?? { dot: 'bg-slate-400', label: ev.action }
            return (
              <motion.li
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2, ease: 'easeOut' }}
                className="px-3 py-2 flex items-start gap-2.5"
              >
                <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800">
                    {meta.label}
                    {ev.actor && (
                      <span className="text-slate-500 font-normal">
                        {' '}· {ev.actor.firstName} {ev.actor.lastName}
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">
                    {dayjs(ev.createdAt).tz(KIGALI_TIMEZONE).format('MMM DD, YYYY HH:mm')}
                    {ev.reasonPreset && ` · ${prettyPreset(ev.reasonPreset)}`}
                  </div>
                  {ev.reason && (
                    <div className="text-[11.5px] text-slate-600 mt-1 leading-snug">
                      {ev.reason}
                    </div>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const prettyPreset = (raw: string): string => {
  const approval = APPROVAL_REASON_PRESETS.find((p) => p.value === raw)
  if (approval) return approval.label
  const flag = FLAG_REASON_PRESETS.find((p) => p.value === raw)
  return flag ? flag.label : raw
}
