/**
 * Utility functions for EBM (Electronic Billing Machine) eligibility
 */

export interface SessionForEBM {
  sessionStatus: string
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
}

/**
 * Determines if a session is eligible for EBM generation/distribution
 * 
 * @param session - The session object to check
 * @returns true if the session is eligible for EBM, false otherwise
 * 
 * Eligibility criteria:
 * - Session status must be 'PAID', 'EBM_ISSUED', or 'REFUNDED'
 * - Payment method must be 'MOMO' (MOMO_CODE_PAYMENT cannot receive an EBM)
 */
export function isEligibleForEbm(session: SessionForEBM): boolean {
  // Check session status
  const isPaid =
    session.sessionStatus === 'PAID' ||
    session.sessionStatus === 'EBM_ISSUED' ||
    session.sessionStatus === 'REFUNDED'

  // Check payment method — MOMO only. MOMO code payments are operator-confirmed
  // to a shared till with no verifiable per-customer reference, so they cannot
  // receive an EBM.
  const isMomoPayment = session.paymentMethodEnum === 'MOMO'

  return isPaid && isMomoPayment
}

/**
 * Gets a human-readable reason why a session is not eligible for EBM
 * 
 * @param session - The session object to check
 * @returns A string explaining why the session is not eligible, or null if it is eligible
 */
export function getEbmEligibilityReason(session: SessionForEBM): string | null {
  if (isEligibleForEbm(session)) {
    return null
  }
  
  if (
    session.sessionStatus !== 'PAID' &&
    session.sessionStatus !== 'EBM_ISSUED' &&
    session.sessionStatus !== 'REFUNDED'
  ) {
    return `Session status "${session.sessionStatus}" is not eligible for EBM. Only PAID, EBM_ISSUED, or REFUNDED sessions can generate EBMs.`
  }
  
  if (session.paymentMethodEnum !== 'MOMO') {
    return `Payment method "${session.paymentMethodEnum || 'Unknown'}" is not eligible for EBM. Only MOMO payments can generate EBMs.`
  }
  
  return 'Session is not eligible for EBM generation.'
}
