import api from './api'

export interface SessionMissingEbm {
  id: string
  sessionId: string
  customerName: string | null
  customerPhone: string | null
  chargedKwh: number | null
  totalAmount: number | null
  startTime: string | null
  endTime: string | null
  createdAt: string
  ebmPaymentMethodName: string | null
  charger: { name: string } | null
  operator: { firstName: string | null; lastName: string | null } | null
}

export interface ListSessionsMissingEbmResponse {
  count: number
  sessions: SessionMissingEbm[]
}

export interface BulkGenerateResultItem {
  sessionId: string
  status: 'success' | 'error'
  message: string
  errorCode?: string
}

export interface BulkGenerateEbmResponse {
  results: BulkGenerateResultItem[]
  successful: number
  failed: number
  total: number
}

export type PaymentMethodType = 'MOMO' | 'MOMO_CODE_PAYMENT' | 'CARD' | 'BALANCE' | 'CONTRACT' | 'FREE_ALLOWANCE' | 'KABISA'

export const listSessionsMissingEbm = async (
  from: string,
  to: string,
  paymentMethodTypes?: PaymentMethodType[]
): Promise<ListSessionsMissingEbmResponse> => {
  const response = await api().get('/api/admin/missing-ebm/sessions', {
    params: { from, to, paymentMethodTypes },
    paramsSerializer: { indexes: null }, // emit ?paymentMethodTypes=MOMO&paymentMethodTypes=...
  })
  return response.data.data
}

export const bulkGenerateEbm = async (sessionIds: string[]): Promise<BulkGenerateEbmResponse> => {
  const response = await api().post('/api/admin/missing-ebm/bulk-generate', { sessionIds })
  return response.data.data
}

export interface BackfillStatusResponse {
  updated: number
}

// Flip PAID → EBM_ISSUED on sessions that already have a COMPLETED normal EBM.
// Fixes rows created before the status-flip logic landed.
export const backfillEbmIssuedStatus = async (): Promise<BackfillStatusResponse> => {
  const response = await api().post('/api/admin/missing-ebm/backfill-status')
  return response.data.data
}

// ────────────────────────────────────────────────────────────────────────────
// Failed EBMs
// ────────────────────────────────────────────────────────────────────────────

export interface FailedEbmSession {
  id: string
  sessionId: string
  customerName: string | null
  customerPhone: string | null
  ebmTin: string | null
  purchaseCode: string | null
  chargedKwh: number | null
  totalAmount: number | null
  ratePerKwh: number | null
  sessionStatus: string | null
  startTime: string | null
  endTime: string | null
  createdAt: string
  ebmPaymentMethodName: string | null
  charger: { name: string; generateEbm: boolean } | null
}

export interface FailedEbm {
  id: string
  sessionId: string | null
  status: string
  errorCode: string | null
  errorMessage: string | null
  vsdcErrorCode: string | null
  vsdcErrorMessage: string | null
  retryCount: number
  salesTypeCode: string | null
  receiptTypeCode: string | null
  paymentMethodCode: string | null
  paymentMethodName: string | null
  cisInvoiceNumber: number | null
  unitPrice: string | number | null
  energyKwh: string | number | null
  totalAmountAfterDiscount: string | number | null
  createdAt: string
  updatedAt: string
  lastAttemptedAt: string | null
  session: FailedEbmSession | null
}

export interface ListFailedEbmsResponse {
  count: number
  ebms: FailedEbm[]
}

export const listFailedEbms = async (from: string, to: string): Promise<ListFailedEbmsResponse> => {
  const response = await api().get('/api/admin/missing-ebm/failed', {
    params: { from, to },
  })
  return response.data.data
}

export interface RetryFailedEbmPayload {
  customerName?: string | null
  customerPhone?: string | null
  ebmTin?: string | null
  purchaseCode?: string | null
  salesType?: 'NORMAL' | 'TRAINING'
}

export interface RetryFailedEbmResponse {
  ebmId: string
  sessionId: string
  result: { status: string; message?: string; errorCode?: string; errorMessage?: string }
}

export const retryFailedEbm = async (
  ebmId: string,
  payload: RetryFailedEbmPayload
): Promise<{ status: 'success' | 'error'; message: string; data: RetryFailedEbmResponse }> => {
  const response = await api().post(`/api/admin/missing-ebm/failed/${ebmId}/retry`, payload)
  return response.data
}
