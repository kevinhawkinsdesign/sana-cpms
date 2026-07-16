'use client'

import React from 'react'
import {
  Wallet,
  FileText,
  Smartphone,
  CreditCard as CardIcon,
  CreditCard,
} from 'lucide-react'
import type { FreeChargingFormValues } from './FreeChargingAllowanceForm'
import { localDateToISO } from '@/lib/date'

// ─── Formatting helpers ───────────────────────────────────────────────────────

export const formatAdminCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency }).format(amount)

/** Short date without time, e.g. "Jan 1, 2025" — used in modal/table contexts */
export const formatShortDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

/** Long date with time, e.g. "January 1, 2025 at 10:00 AM" — used in detail-page contexts */
export const formatLongDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// ─── Payment-method display helpers ──────────────────────────────────────────

export const getPaymentMethodIcon = (type: string): React.ReactElement => {
  switch (type) {
    case 'KABISA':
      return <Wallet className="h-4 w-4 text-blue-600" />
    case 'CONTRACT':
      return <FileText className="h-4 w-4 text-green-600" />
    case 'INVOICE':
      return <FileText className="h-4 w-4 text-green-600" />
    case 'MOMO':
      return <Smartphone className="h-4 w-4 text-purple-600" />
    case 'CARD':
      return <CardIcon className="h-4 w-4 text-gray-600" />
    default:
      return <CreditCard className="h-4 w-4 text-gray-500" />
  }
}

export const getPaymentMethodBadgeVariant = (
  type: string
): 'default' | 'secondary' | 'outline' => {
  switch (type) {
    case 'KABISA':
      return 'default'
    case 'CONTRACT':
    case 'INVOICE':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ─── Allowance form ↔ payload converters ─────────────────────────────────────

export interface AllowancePayload {
  validFrom: string
  validUntil?: string
  chargers?: string[] | null
  isUnlimited?: boolean
  remainingCount?: number
  freeKwhLimit?: number
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'
  customDays?: number
}

interface AllowanceForForm {
  isUnlimited: boolean
  remainingCount: number | null
  validFrom: string
  validUntil: string | null
  chargerAllowances?: { chargerId: string; isActive: boolean }[]
  allowedChargerIds?: string[] | null
  freeKwhLimit?: number | null
  periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null
  customDays?: number | null
}

/** Convert form values to the API payload shape. */
export const buildAllowancePayload = (data: FreeChargingFormValues): AllowancePayload => {
  const base: AllowancePayload = {
    // Parse as a local date so the selected day isn't shifted back one for
    // users behind UTC; "valid until" is inclusive of the whole day (KAB-180).
    validFrom: localDateToISO(data.validFrom),
    validUntil: data.validUntil ? localDateToISO(data.validUntil, true) : undefined,
    chargers: data.chargerSelectionType === 'all' ? null : data.chargers,
  }

  if (data.mode === 'kwh') {
    return {
      ...base,
      isUnlimited: true,
      freeKwhLimit: data.freeKwhLimit,
      periodType: data.periodType,
      customDays: data.periodType === 'CUSTOM' ? data.customDays : undefined,
    }
  }

  return {
    ...base,
    isUnlimited: data.isUnlimited,
    remainingCount: data.isUnlimited ? undefined : data.remainingCount,
    freeKwhLimit: undefined,
    periodType: undefined,
    customDays: undefined,
  }
}

/** Convert an existing allowance record into default form values for editing. */
export const buildAllowanceFormData = (allowance: AllowanceForForm): FreeChargingFormValues => {
  const chargerIds =
    allowance.allowedChargerIds ??
    (allowance.chargerAllowances?.filter(ca => ca.isActive).map(ca => ca.chargerId) ?? [])

  const isKwhMode = !!allowance.freeKwhLimit && !!allowance.periodType
  const hasNoChargers =
    (!allowance.chargerAllowances || allowance.chargerAllowances.length === 0) &&
    (!chargerIds || chargerIds.length === 0)

  return {
    mode: isKwhMode ? 'kwh' : 'sessions',
    remainingCount: allowance.remainingCount ?? undefined,
    isUnlimited: allowance.isUnlimited,
    freeKwhLimit: allowance.freeKwhLimit ?? undefined,
    periodType: allowance.periodType ?? undefined,
    customDays: allowance.customDays ?? undefined,
    validFrom: allowance.validFrom.split('T')[0],
    validUntil: allowance.validUntil ? allowance.validUntil.split('T')[0] : undefined,
    chargerSelectionType: hasNoChargers ? 'all' : 'specific',
    chargers: chargerIds,
  }
}

/**
 * Returns an onSubmit handler for the free charging allowance form.
 * Shared between IndividualVehicleManagementModal and VehicleManagementModal.
 */
export function createHandleAllowance(
  editingAllowance: { id: string } | null,
  updateMutate: (args: { allowanceId: string; data: AllowancePayload }) => void,
  addMutate: (data: AllowancePayload) => void
) {
  return (data: FreeChargingFormValues) => {
    const payload = buildAllowancePayload(data)
    if (editingAllowance) {
      updateMutate({ allowanceId: editingAllowance.id, data: payload })
    } else {
      addMutate(payload)
    }
  }
}
