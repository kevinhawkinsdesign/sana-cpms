import api from './api'

// ===== APPROVAL INTERFACES =====

export const APPROVAL_REASON_PRESETS = [
  { value: 'VALUES_MATCH', label: 'Values match records' },
  { value: 'MANUALLY_VERIFIED', label: 'Manually verified on-site' },
  { value: 'METER_RECONCILED', label: 'Meter reconciled' },
  { value: 'SUPERVISOR_REVIEW', label: 'Supervisor review' },
  { value: 'OTHER', label: 'Other (see note)' },
] as const

export type ApprovalReasonPreset = typeof APPROVAL_REASON_PRESETS[number]['value']

export const FLAG_REASON_PRESETS = [
  { value: 'METER_MISMATCH', label: 'Meter mismatch' },
  { value: 'MISSING_PHOTOS', label: 'Missing photos' },
  { value: 'CASH_DISCREPANCY', label: 'Cash discrepancy' },
  { value: 'LATE_OR_ABSENT', label: 'Late or absent' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious activity' },
  { value: 'OTHER', label: 'Other (see note)' },
] as const

export type FlagReasonPreset = typeof FLAG_REASON_PRESETS[number]['value']

export interface ApprovalActor {
  id: string
  firstName: string
  lastName: string
  email?: string | null
}

export type ShiftReportApprovalAction = 'APPROVED' | 'UNAPPROVED' | 'FLAGGED' | 'UNFLAGGED'

export interface ShiftReportApprovalEvent {
  id: string
  reportId: string
  action: ShiftReportApprovalAction
  reason: string
  reasonPreset: string | null
  actorId: string
  actor?: ApprovalActor
  createdAt: string
  // True when the row was emitted as a cascade inside another admin
  // action (UNFLAGGED on approve, UNAPPROVED on flag) — the backend
  // computes this from a canonical constant so the frontend never has
  // to re-match free-text reason strings.
  isAutoEvent?: boolean
}

// ===== SHIFT MANAGEMENT INTERFACES =====

export interface OperatorShift {
  [x: string]: any
  id: string
  operatorId: string
  dayOfWeek: number
  startTime?: string
  endTime?: string
  chargerId?: string
  isLastShift?: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  charger?: {
    id: string
    name: string
    latitude: number
    longitude: number
    address?: string
    haveMeterReading?: boolean
    hasTwoMeters?: boolean
  }
}

export interface ShiftReport {
  id: string
  operatorId: string
  operatorShiftId: string
  checkInTime: string
  checkOutTime: string | null
  comments?: string | null
  
  // Check-in specific fields
  checkInLatitude?: string
  checkInLongitude?: string
  checkInSelfieImage?: string
  checkInLocationAccuracy?: number
  checkInDifferenceInTime?: number | null
  checkInDifferenceInDistance?: number
  checkInMeterReading?: number
  checkInMeterReadingImageUrl?: string
  checkInMeterReading2?: number
  checkInMeterReadingImageUrl2?: string

  // Check-out specific fields
  checkOutLatitude?: string
  checkOutLongitude?: string
  checkOutSelfieImage?: string
  checkOutLocationAccuracy?: number
  checkOutDifferenceInTime?: number | null
  checkOutDifferenceInDistance?: number
  checkOutMeterReading?: number
  checkOutMeterReadingImageUrl?: string
  checkOutMeterReading2?: number
  checkOutMeterReadingImageUrl2?: string
  
  // Legacy fields (for backward compatibility)
  operatorLatitude?: string | null
  operatorLongitude?: string | null
  imageUrl?: string | null
  meterReading?: number | null
  meterReadingImageUrl?: string | null
  
  // Metadata
  type?: 'regular' | 'swap'
  swapId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  
  // Aggregates added by admin list endpoint
  kwhSold?: number
  moneyCollectedRwf?: number
  // Backend-computed meter total: sum of both meters' (check-out − check-in)
  // deltas. Null when no meter reading exists. Shown as-is (a reversed/typo
  // reading surfaces as an odd number rather than being hidden).
  meterTotalKwh?: number | null
  // 4-bucket per-row payment breakdown emitted by the admin list endpoint.
  payments?: PaymentBreakdown

  // Shift metrics persisted on check-out
  chargingSessionEnergyRecorded?: number | null
  utilityMeterEnergyRecorded?: number | null
  chargingSessionCount?: number | null
  shiftDurationMinutes?: number | null
  transferredOutKwh?: number | null
  transferredInNetKwh?: number | null

  // Relations
  operator?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    imageUrl?: string | null
  }
  operatorShift?: OperatorShift & {
    charger?: {
      id: string
      name: string
      latitude: number
      longitude: number
      address?: string
      haveMeterReading?: boolean
      hasTwoMeters?: boolean
    }
  }

  // Admin review (approval + flag, mutually exclusive)
  isApproved?: boolean
  approvedAt?: string | null
  approvalReason?: string | null
  approvedById?: string | null
  approvedBy?: ApprovalActor | null
  isFlagged?: boolean
  flaggedAt?: string | null
  flagReason?: string | null
  flaggedById?: string | null
  flaggedBy?: ApprovalActor | null

  // Derived from approval audit trail. True when the shift is currently
  // approved AND was flagged at some point before the most recent approval.
  // The column-level flag fields (isFlagged/flagReason/...) are cleared when
  // approval auto-unflags, so this signal — plus lastFlagEvent below — is
  // the only way to surface "previously flagged, now resolved" rows.
  wasFlaggedThenApproved?: boolean
  lastFlagEvent?: {
    reason: string
    reasonPreset: string | null
    createdAt: string
    actor: ApprovalActor | null
  } | null
  lastApprovalEvent?: {
    reason: string
    reasonPreset: string | null
    createdAt: string
    actor: ApprovalActor | null
  } | null
}

// 4-bucket payment breakdown — matches backend buildPaymentsResponse().
export interface PaymentBreakdown {
  momo: number
  momoCode: number
  invoice: number
  free: number
  momoPct: number
  momoCodePct: number
  invoicePct: number
  freePct: number
  total: number
  // CARD/BALANCE/KABISA/null payments that shouldn't occur on public
  // chargers but did. Surfaced for visibility, excluded from totals.
  unexpected: number
  unexpectedCount: number
}

// Detail aggregate (admin shift report drawer)
export type ChargingSessionStatus =
  | 'STARTED'
  | 'COMPLETED'
  | 'PAID'
  | 'EBM_ISSUED'
  | 'CANCELLED'

export type SessionPaymentMethodType =
  | 'MOMO'
  | 'MOMO_CODE'
  | 'INVOICE'
  | 'FREE'
  | 'KABISA'
  | string

export interface SessionPhoto {
  url: string
  label: string
}

export interface ShiftReportSession {
  index: number
  id: string
  sessionId: string
  status: ChargingSessionStatus
  startTime: string
  endTime: string | null
  durationMinutes: number | null
  customerName: string | null
  plate: string | null
  carModelMake: string | null
  chargedKwh: number
  totalAmount: number
  ratePerKwh: number | null
  paymentMethodType: SessionPaymentMethodType | null
  transferredKwh: number | null
  previousOperator: { firstName: string; lastName: string } | null
  gun: { gunNumber: string | null; kabisaId: string } | null
  photos: {
    chargerScreen: SessionPhoto | null
    odometerReading: SessionPhoto | null
    transferredKwh: SessionPhoto | null
    carImage: SessionPhoto | null
  }
}

export interface ShiftReportDetail {
  report: ShiftReport & {
    approvedBy?: ApprovalActor | null
    flaggedBy?: ApprovalActor | null
    approvalEvents?: ShiftReportApprovalEvent[]
  }
  kpis: {
    kwhSold: number
    moneyCollectedRwf: number
    transactions: number
    checkInLatenessMinutes: number | null
    checkOutLatenessMinutes: number | null
  }
  meter: {
    // `sold` is the raw check-out − check-in delta for the meter.
    m1: { start: number; end: number | null; sold: number | null } | null
    m2: { start: number; end: number | null; sold: number | null } | null
    total: number | null
  }
  payments: PaymentBreakdown
  hourly: Array<{ hour: number; kwh: number; rwf: number }>
  timeline: Array<{
    time: string
    label: string
    meta: string
    tone: 'ok' | 'late' | 'early' | 'neutral' | 'highlight'
  }>
  photos: {
    checkIn: Array<{ url: string; label: string }>
    checkOut: Array<{ url: string; label: string }>
  }
  // Absent on API deployments that predate per-session detail.
  sessions?: ShiftReportSession[]
  notes: string | null
}

export interface CreateShiftData {
  dayOfWeek: number
  startTime?: string
  endTime?: string
  chargerId?: string
}

export interface UpdateShiftData {
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  chargerId?: string
}

export interface CheckInData {
  operatorShiftId: string
  operatorLatitude?: string
  operatorLongitude?: string
  imageUrl?: string
  checkInMeterReading?: number
  checkInMeterReadingImageUrl?: string
  checkInMeterReading2?: number
  checkInMeterReadingImageUrl2?: string
}

export interface CheckOutData {
  operatorLatitude?: string
  operatorLongitude?: string
  imageUrl?: string
  checkOutMeterReading?: number
  checkOutMeterReadingImageUrl?: string
  checkOutMeterReading2?: number
  checkOutMeterReadingImageUrl2?: string
  comments?: string
}

export interface UpdateShiftReportData {
  comments?: string
  operatorLatitude?: string
  operatorLongitude?: string
  imageUrl?: string
  meterReading?: number
  meterReadingImageUrl?: string
}

// ===== INSPECTION INTERFACES =====

export interface ChargerInspection {
  id: string
  chargerId: string
  operatorId: string
  operatorShiftReportId?: string
  imageUrl: string | null
  comments: string | null
  isChargerTurnedOn: boolean
  isAdapterClean: boolean
  isThereNoDamage: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  charger?: {
    id: string
    kabisaId: string
    name: string
    address: string
  }
  operatorShiftReport?: ShiftReport
}

export interface CreateInspectionData {
  chargerId?: string
  operatorShiftReportId?: string
  imageUrl?: string
  comments?: string
  isChargerTurnedOn: boolean
  isAdapterClean: boolean
  isThereNoDamage: boolean
}

export interface UpdateInspectionData {
  imageUrl?: string
  comments?: string
  isChargerTurnedOn?: boolean
  isAdapterClean?: boolean
  isThereNoDamage?: boolean
}

// ===== API RESPONSE INTERFACES =====

export interface ShiftsResponse {
  shifts: OperatorShift[]
}

export interface ShiftReportsResponse {
  reports: ShiftReport[]
}

export type ShiftReportSortField =
  | 'startTime'
  | 'endTime'
  | 'site'
  | 'operator'
  | 'duration'
  | 'sessions'
  | 'kwhSold'
  | 'kwhMeter'
  | 'discrepancy'
  | 'revenue'

export interface AdminShiftReportsParams {
  dateStart?: Date | string
  dateEnd?: Date | string
  operatorId?: string
  status?: 'all' | 'active' | 'completed'
  lateness?: 'all' | 'onTime' | 'late' | 'early'
  review?: 'all' | 'approved' | 'flagged' | 'pending' | 'flaggedThenApproved'
  search?: string
  sortBy?: ShiftReportSortField
  sortDir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AdminShiftReportsResponse {
  reports: ShiftReport[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    hasMore: boolean
  }
  totals: {
    count: number
    activeCount: number
    kwhSum: number
    rwfSum: number | null
  }
}

export interface InspectionsResponse {
  inspections: ChargerInspection[]
}

// ===== SHIFT MANAGEMENT APIs =====

// Create operator shift (Admin only)
export const createOperatorShift = async (data: CreateShiftData): Promise<{ shift: OperatorShift }> => {
  const response = await api().post('/api/operator', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Update operator shift (Admin only)
export const updateOperatorShift = async (id: string, data: UpdateShiftData): Promise<{ shift: OperatorShift }> => {
  const response = await api().put(`/api/operator/${id}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get operator shifts
export const getOperatorShifts = async (): Promise<ShiftsResponse> => {
  const response = await api().get('/api/operator-shift/my')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// ===== SHIFT CHECK-IN/CHECK-OUT APIs =====

// Operator check-in
export const checkInOperator = async (data: CheckInData): Promise<{ report: ShiftReport }> => {
  const response = await api().post('/api/operator-shift/shift-reports/check-in', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Operator check-out
export const checkOutOperator = async (reportId: string, data: CheckOutData): Promise<{ report: ShiftReport }> => {
  const response = await api().put(`/api/operator-shift/shift-reports/${reportId}/check-out`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Update shift report (Admin only)
export const updateShiftReport = async (reportId: string, data: UpdateShiftReportData): Promise<{ report: ShiftReport }> => {
  const response = await api().put(`/api/operator-shift/shift-reports/${reportId}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get shift reports (operator's own reports)
export const getShiftReports = async (): Promise<ShiftReportsResponse> => {
  const response = await api().get('/api/operator-shift/shift-reports/my')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Next operator shift start report interface
export interface NextShiftStartReport {
  id: string
  checkInTime: string
  checkInConfirmationCode?: string | null
  checkInMeterReading?: number | null
  checkInMeterReadingImageUrl?: string | null
  checkInMeterReading2?: number | null
  checkInMeterReadingImageUrl2?: string | null
  checkInLatitude?: string | null
  checkInLongitude?: string | null
  checkInSelfieImage?: string | null
  checkInDifferenceInDistance?: number | null
  operator: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
  }
  shift: {
    id: string
    dayOfWeek: number
    startTime?: string | null
    endTime?: string | null
    isLastShift: boolean
  }
}

export interface NextShiftStartReportResponse {
  nextShiftStartReport: NextShiftStartReport | null
  nextOperator?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
    email?: string
  } | null
  // Backend returns nextShift=null when there is no upcoming shift at all
  // (i.e. the current shift is truly the last of the day). Distinguishes
  // that authoritative state from "next operator scheduled but not yet
  // checked in", which is what an absent nextShiftStartReport means.
  nextShift?: {
    id: string
    dayOfWeek?: number
    startTime?: string
    endTime?: string
    isLastShift?: boolean
  } | null
}

// Get next operator shift start report
export const getNextOperatorShiftStartReport = async (shiftId: string): Promise<NextShiftStartReportResponse> => {
  const response = await api().get(`/api/operator-shift/next-shift-start-report?shiftId=${shiftId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get all shift reports (admin only). Server-side filter/sort/paginate.
export const getAllShiftReports = async (
  params: AdminShiftReportsParams = {}
): Promise<AdminShiftReportsResponse> => {
  const search = new URLSearchParams()
  if (params.dateStart) {
    const v = params.dateStart instanceof Date ? params.dateStart.toISOString() : params.dateStart
    search.set('dateStart', v)
  }
  if (params.dateEnd) {
    const v = params.dateEnd instanceof Date ? params.dateEnd.toISOString() : params.dateEnd
    search.set('dateEnd', v)
  }
  if (params.operatorId && params.operatorId !== 'all') search.set('operatorId', params.operatorId)
  if (params.status && params.status !== 'all') search.set('status', params.status)
  if (params.lateness && params.lateness !== 'all') search.set('lateness', params.lateness)
  if (params.review && params.review !== 'all') search.set('review', params.review)
  if (params.search && params.search.trim()) search.set('search', params.search.trim())
  if (params.sortBy) search.set('sortBy', params.sortBy)
  if (params.sortDir) search.set('sortDir', params.sortDir)
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))

  const qs = search.toString()
  const url = '/api/operator-shift/shift-reports' + (qs ? `?${qs}` : '')
  const response = await api().get(url)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Get full shift report detail with aggregated metrics (admin only)
export const getShiftReportDetail = async (id: string): Promise<{ detail: ShiftReportDetail }> => {
  const response = await api().get(`/api/operator-shift/shift-reports/${id}/detail`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

export interface SetShiftReportApprovalData {
  approved: boolean
  reasonPreset: ApprovalReasonPreset
  reason: string
}

export interface SetShiftReportReviewResponse {
  report: {
    id: string
    isApproved: boolean
    approvedAt: string | null
    approvedById: string | null
    approvalReason: string | null
    approvedBy: ApprovalActor | null
    isFlagged: boolean
    flaggedAt: string | null
    flaggedById: string | null
    flagReason: string | null
    flaggedBy: ApprovalActor | null
  }
}

// Approve / revoke approval on a shift report (admin only)
export const setShiftReportApproval = async (
  id: string,
  data: SetShiftReportApprovalData
): Promise<SetShiftReportReviewResponse> => {
  const response = await api().post(`/api/operator-shift/shift-reports/${id}/approval`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

export interface SetShiftReportFlagData {
  flagged: boolean
  reasonPreset: FlagReasonPreset
  reason: string
}

// Flag / clear flag on a shift report (admin only). Flagging an approved
// shift auto-revokes the approval server-side.
export const setShiftReportFlag = async (
  id: string,
  data: SetShiftReportFlagData
): Promise<SetShiftReportReviewResponse> => {
  const response = await api().post(`/api/operator-shift/shift-reports/${id}/flag`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Audit log of approve/unapprove actions on a shift report
export const getShiftReportApprovalHistory = async (
  id: string
): Promise<{ events: ShiftReportApprovalEvent[] }> => {
  const response = await api().get(`/api/operator-shift/shift-reports/${id}/approval-history`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// ===== INSPECTION APIs =====

// Create charger inspection
export const createChargerInspection = async (data: CreateInspectionData): Promise<{ inspection: ChargerInspection }> => {
  const response = await api().post('/api/operator-shift/charger-inspections', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Update charger inspection
export const updateChargerInspection = async (id: string, data: UpdateInspectionData): Promise<{ report: ChargerInspection }> => {
  const response = await api().put(`/api/operator-shift/charger-inspections/${id}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get charger inspections
export const getChargerInspections = async (): Promise<InspectionsResponse> => {
  const response = await api().get('/api/operator-shift/charger-inspections')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// ===== SHIFT SWAP INTERFACES =====
// COMMENTED OUT - SHIFT SWAP FUNCTIONALITY DISABLED

/*
export interface Operator {
  id: string
  name: string
}

export interface ShiftSwap {
  id: string
  operatorId: string
  targetOperatorId: string
  operatorShiftId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  reason: string | null
  swapDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approvedAt: string | null
  approvedBy: string | null
  rejectionReason: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  operator?: {
    id: string
    firstName: string
    lastName: string
    name: string
    phone?: string
    email?: string
  }
  targetOperator?: {
    id: string
    firstName: string
    lastName: string
    name: string
  }
  operatorShift?: {
    id: string
    chargerId: string
    charger?: {
      id: string
      name: string
      address: string
    }
  }
}
*/

/*
export interface CreateShiftSwapData {
  operatorShiftId: string
  targetOperatorId: string
  reason?: string
  swapDate: string
}

export interface UpdateShiftSwapData {
  startTime?: string
  endTime?: string
  reason?: string
  swapDate?: string
}

export interface ApproveShiftSwapData {
  swapId: string
  approved: boolean
  rejectionReason?: string
}

export interface TransferSessionData {
  sessionId: string
  newOperatorId: string
}

export interface ShiftWithSwap {
  id: string
  type: 'regular' | 'swap'
  dayOfWeek: number
  startTime: string
  endTime: string
  chargerId?: string
  charger?: {
    id: string
    name: string
    address: string
  }
  reason?: string
  swapDate?: string
  isActive: boolean
  createdAt: string
}
*/

// ===== SHIFT SWAP APIs =====
// COMMENTED OUT - SHIFT SWAP FUNCTIONALITY DISABLED

/*
// Get available operators for shift swap
export const getAvailableOperators = async (): Promise<{ operators: Operator[] }> => {
  const response = await api().get('/api/operator-shift/operators')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Create shift swap request
export const createShiftSwap = async (data: CreateShiftSwapData): Promise<{ swap: ShiftSwap }> => {
  const response = await api().post('/api/operator-shift/swaps', data)
  
  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }
  
  return response.data.data
}
*/

/*
// Get shift swaps (incoming requests)
export const getShiftSwaps = async (): Promise<ShiftSwap[]> => {
  const response = await api().get('/api/operator-shift/swaps')
  
  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }
  
  return response.data.data
}
*/

/*
// Get pending shift swaps
export const getPendingShiftSwaps = async (): Promise<ShiftSwap[]> => {
  const response = await api().get('/api/operator-shift/swaps/pending')

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Get all swap requests (both sent and received) with categorization
export const getAllSwapRequests = async (): Promise<{
  sent: ShiftSwap[],
  received: ShiftSwap[],
  all: ShiftSwap[]
}> => {
  const response = await api().get('/api/operator-shift/swaps/all')

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Get swap requests sent by current operator
export const getSentSwapRequests = async (): Promise<ShiftSwap[]> => {
  const response = await api().get('/api/operator-shift/swaps/sent')

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Get swap requests received by current operator
export const getReceivedSwapRequests = async (): Promise<ShiftSwap[]> => {
  const response = await api().get('/api/operator-shift/swaps/received')

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data
}

// Approve/reject shift swap
export const approveShiftSwap = async (data: ApproveShiftSwapData): Promise<{ swap: ShiftSwap }> => {
  const response = await api().post('/api/operator-shift/swaps/approve', data)
  
  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }
  
  return response.data.data
}

// Get shift swap by ID
export const getShiftSwapById = async (swapId: string): Promise<{ swap: ShiftSwap }> => {
  const response = await api().get(`/api/operator-shift/swaps/${swapId}`)
  
  if (response.data.status === 'error') {
    // Create an error object that preserves all backend error details
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }
  
  // Handle the API response structure: { status: "success", data: { ... } }
  // Return in the expected format: { swap: ShiftSwap }
  return { swap: response.data.data }
}

// Update shift swap
export const updateShiftSwap = async (swapId: string, data: UpdateShiftSwapData): Promise<{ swap: ShiftSwap }> => {
  const response = await api().put(`/api/operator-shift/swaps/${swapId}`, data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Delete shift swap
export const deleteShiftSwap = async (swapId: string): Promise<void> => {
  const response = await api().delete(`/api/operator-shift/swaps/${swapId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
}

// Get shifts with swaps for a specific date
export const getShiftsWithSwaps = async (date?: string): Promise<ShiftWithSwap[]> => {
  const url = date ? `/api/operator-shift/with-swaps?date=${date}` : '/api/operator-shift/with-swaps'
  const response = await api().get(url)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Transfer charging session
export const transferChargingSession = async (data: TransferSessionData): Promise<{
  session: any
  previousOperator: Operator
  newOperator: Operator
}> => {
  const response = await api().post('/api/operator-shift/transfer-session', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}
*/

// ===== UTILITY FUNCTIONS =====

// Calculate inspection score (3-point system)
export const calculateInspectionScore = (inspection: ChargerInspection): number => {
  const checks = [
    inspection.isChargerTurnedOn,
    inspection.isAdapterClean,
    inspection.isThereNoDamage
  ]
  
  const passedChecks = checks.filter(check => check).length
  return Math.round((passedChecks / checks.length) * 100)
}

// Get day name from day number
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

// Calculate shift duration
export const calculateShiftDuration = (checkInTime: string, checkOutTime: string | null): string | null => {
  if (!checkOutTime) return null
  
  const duration = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${hours}h ${minutes}m`
}

// Filter reports by date range
export const filterReportsByDateRange = (reports: ShiftReport[], startDate: Date, endDate: Date): ShiftReport[] => {
  return reports.filter(report => {
    const reportDate = new Date(report.checkInTime)
    return reportDate >= startDate && reportDate <= endDate
  })
}

// Format time from 24-hour to 12-hour format
export const formatTimeTo12Hour = (time24: string | undefined | null): string => {
  if (!time24 || time24 === 'undefined' || time24 === 'null') {
    return 'Time not set'
  }
  
  const [hours, minutes] = time24.split(':')
  if (!hours || !minutes) {
    return 'Invalid time'
  }
  
  const hour = parseInt(hours, 10)
  if (isNaN(hour)) {
    return 'Invalid time'
  }
  
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Get status color for shift swap
/*
export const getShiftSwapStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Calculate next valid dates for a specific day of the week
export const getNextValidDatesForDayOfWeek = (dayOfWeek: number, monthsAhead: number = 3): string[] => {
  const validDates: string[] = []
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Calculate the end date (3 months from tomorrow by default)
  const endDate = new Date(tomorrow)
  endDate.setMonth(endDate.getMonth() + monthsAhead)

  // Start from tomorrow and find all dates matching the dayOfWeek
  const currentDate = new Date(tomorrow)

  while (currentDate <= endDate) {
    if (currentDate.getDay() === dayOfWeek) {
      validDates.push(currentDate.toISOString().split('T')[0])
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return validDates
}

// Get the next valid date for a specific day of the week
export const getNextValidDateForDayOfWeek = (dayOfWeek: number): string => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find the next occurrence of the specified day of week
  let daysToAdd = (dayOfWeek + 7 - tomorrow.getDay()) % 7
  if (daysToAdd === 0) {
    daysToAdd = 7 // If tomorrow is the same day, get next week's occurrence
  }

  const nextValidDate = new Date(tomorrow)
  nextValidDate.setDate(nextValidDate.getDate() + daysToAdd)

  return nextValidDate.toISOString().split('T')[0]
}

// Check if a date string matches a specific day of the week
export const doesDateMatchDayOfWeek = (dateString: string, dayOfWeek: number): boolean => {
  const date = new Date(dateString + 'T00:00:00')
  return date.getDay() === dayOfWeek
}
*/ 
