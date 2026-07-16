'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { checkMomoPaymentStatus } from '@/lib/api/admin'

/**
 * Wraps the "Check MOMO Status" mutation. The caller passes an `onSettled`
 * callback (typically `invalidateSessionQueries`) so the hook stays decoupled
 * from which queries each page wants to refresh.
 *
 * Toast messaging is centralised here so the wording is identical wherever the
 * action is exposed (list page, session detail modal, standalone page).
 */
export function useMomoStatusCheck(onSettled?: () => void) {
  return useMutation({
    mutationFn: checkMomoPaymentStatus,
    onSuccess: (data) => {
      onSettled?.()
      const responseData = data.data
      const summary = responseData.summary

      if (responseData.pendingCount === 0) {
        toast.info('No pending MOMO transactions found for this session')
        return
      }

      if (summary) {
        const message = `MOMO Status Updated: ${summary.successful} successful, ${summary.failed} failed, ${summary.stillPending} pending`
        if (summary.successful > 0) toast.success(message)
        else if (summary.stillPending > 0) toast.info(message)
        else if (summary.failed > 0) toast.warning(message)
        else toast.info('Payment status checked')
      } else {
        toast.info(responseData.message || 'Payment status checked')
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to check MOMO payment status'
      toast.error(message)
    },
  })
}
