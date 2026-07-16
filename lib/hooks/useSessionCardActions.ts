'use client'

import { useState, useCallback } from 'react'
import type { Session } from '@/lib/api/chargingSessions'
import type { CustomerInfoFormValues } from '@/components/shared/CustomerInfoDialog'

/**
 * Shared state & handlers for ActiveSessionCard action callbacks.
 * Used by both the operator dashboard and the sessions page to
 * avoid duplicating transfer / end-remote / customer-info state logic.
 */
export function useSessionCardActions() {
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferSession, setTransferSession] = useState<Session | null>(null)
  const [endRemoteSession, setEndRemoteSession] = useState<Session | null>(null)
  const [customerInfoSession, setCustomerInfoSession] = useState<Session | null>(null)
  const [customerFormValues, setCustomerFormValues] = useState<CustomerInfoFormValues>({
    name: '',
    phone: '',
    licensePlateNumber: '',
  })

  const openTransferDialog = useCallback((session: Session) => {
    setTransferSession(session)
    setShowTransferDialog(true)
  }, [])

  const closeTransferDialog = useCallback(() => {
    setShowTransferDialog(false)
    setTransferSession(null)
  }, [])

  const openEndRemoteDialog = useCallback((session: Session) => {
    setEndRemoteSession(session)
  }, [])

  const closeEndRemoteDialog = useCallback(() => {
    setEndRemoteSession(null)
  }, [])

  const openCustomerInfoDialog = useCallback((session: Session) => {
    setCustomerInfoSession(session)
    setCustomerFormValues({
      name: session.customerName ?? '',
      phone: session.customerPhone ?? '',
      licensePlateNumber: session.vehicle?.licensePlates?.[0]?.licencePlateNumber ?? '',
    })
  }, [])

  const closeCustomerInfoDialog = useCallback(() => {
    setCustomerInfoSession(null)
  }, [])

  return {
    // Transfer
    transferSession,
    showTransferDialog,
    openTransferDialog,
    closeTransferDialog,
    // End remote
    endRemoteSession,
    openEndRemoteDialog,
    closeEndRemoteDialog,
    // Customer info
    customerInfoSession,
    customerFormValues,
    openCustomerInfoDialog,
    closeCustomerInfoDialog,
  }
}
