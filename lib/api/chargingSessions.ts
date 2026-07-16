import api from './api'

export interface StartSessionData {
  vehicleIdentifier: string
  operatorShiftReportId: string
  startSoc: number
  imageUrl?: string
  carModelMake?: string
  customerName: string
  gunId?: string
}

export interface AvailableGun {
  id: string
  kabisaId: string
  name?: string
  gunNumber?: string
  chargingStatus: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE'
}

export interface AvailableGunsPedestal {
  id: string
  name?: string
  onlineStatus: 'OFFLINE' | 'ONLINE'
  guns: AvailableGun[]
}

export interface AvailableGunsResponse {
  charger: { id: string; name: string }
  /** true when at least one pedestal on this charger is ONLINE (managed by Citrine) */
  hasOnlinePedestals: boolean
  pedestals: AvailableGunsPedestal[]
}

export interface EndSessionData {
  vehicleIdentifier: string
  endSoc: number
  chargedKwh: number
  chargerScreen: string
  // EBM operator popup fields
  skipEbm?: boolean
  ebmCustomerName?: string
  ebmTin?: string
  purchaseCode?: string
  ebmCustomerPhone?: string
  ebmDistributionPhone?: string
  tinValidated?: boolean
}

// Customer info update payload for operator/remote sessions (at least one field required)
export interface UpdateSessionCustomerInfoData {
  customerName?: string | null
  customerPhone?: string | null
  /** License plate: vehicle is found or created and linked to the session when provided */
  licensePlateNumber?: string | null
  /** Cloudflare image URL of the vehicle photo captured by the operator */
  vehicleImageUrl?: string | null
  /** Selected car model/make string (e.g. "Tesla Model 3") */
  carModelMake?: string | null
  /** Odometer reading (required for OX Ntuma) */
  odometerReading?: number
  /** Cloudflare image URL of the odometer photo */
  odometerReadingImage?: string | null
}

export interface SessionTransaction {
  id: string
  transactionId?: string | null
  transactionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string
  transactionType?: string
  amount?: number | null
  currency?: string
  transactionDate?: string
  externalTransactionReference?: string | null
  momoExternalId?: string | null
  paymentMethod?: {
    paymentMethodType?: string | null
    momoNumber?: string | null
  } | null
}

export interface SessionEbm {
  id: string
  cisInvoiceNumber?: number | null
  receiptNumber?: number | null
  salesTypeCode?: string | null
  receiptTypeCode?: string | null
  paymentMethodCode?: string | null
  paymentMethodName?: string | null
  phoneForEbm?: string | null
  vsdcReceiptPublicationDate?: string | null
}

export interface Session {
  id: string
  sessionId: string
  // MANUAL = started from Kabisa UI, REMOTE = created by Citrine
  source?: 'MANUAL' | 'REMOTE'
  vehicleId: string
  gunId: string
  chargerId: string
  operatorId: string
  startSoc: number
  endSoc: number | null
  chargedKwh: number | null
  startTime: string
  endTime: string | null
  sessionStatus: 'STARTED' | 'PAUSED' | 'COMPLETED' | 'PAID' | 'EBM_ISSUED' | 'CANCELLED' | 'REFUNDED'
  totalAmount: number | null
  imageUrl: string | null
  carModelMake: string | null
  customerPhone?: string | null
  ebmTin?: string | null
  description?: string | null
  commonSessionTag?: string | null
  customerName: string | null
  // Becomes true once operator updates customer info via customer-info endpoint
  customerInfoAdded?: boolean
  // Backend flags stale remote sessions that can be manually ended by the operator
  canOperatorEndRemoteSession?: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  isPaid?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
  discountRate?: number
  discountAmount?: number
  supplyAmount?: number
  hasDiscount?: boolean
  // Surfaced by the shared `transformSessionsWithPaymentMethod` backend helper;
  // present on admin list, operator list, and per-session lookups.
  transactions?: SessionTransaction[]
  ebms?: SessionEbm[]
  operator?: {
    id?: string
    firstName?: string
    lastName?: string
    email?: string
  }
  vehicle?: {
    id: string
    kabisaId: string
    model: string
    make: string
    vin: string
    imageUrl: string | null
    batteryCapacity: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    licensePlates?: Array<{
      id: string
      licencePlateNumber: string
      isActive: boolean
      createdAt: string
      updatedAt: string
    }>
  }
  gun?: {
    id: string
    kabisaId: string
    chargerId: string
    name: string
    gunNumber?: string
    chargingStatus: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'
    currentSessionId: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  pedestal?: {
    id: string
    name?: string
    onlineStatus?: 'OFFLINE' | 'ONLINE'
  }
  charger?: {
    id: string
    kabisaId: string
    meterId: string
    gunNumber: string
    latitude: number
    longitude: number
    name: string
    address: string
    power: number
    momoCode: string
    imageUrl: string | null
    operationalStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE'
    generateEbm?: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

export interface UserProfile {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    role: string
    userType: 'KABISA_OWNER' | 'KABISA_MEMBER' | 'GUEST'
    imageUrl: string | null
    isVerified: boolean
    lastLoginAt: string
    createdAt: string
    updatedAt: string
  }
  vehicles: Array<{
    id: string
    kabisaId: string
    model: string
    make: string
    vin: string
    imageUrl: string | null
    batteryCapacity: number
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
  paymentMethods: Array<{
    id: string
    paymentMethodType: string
    isDefault: boolean
    balance: number
    currency: string
    momoNumber: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
  freeChargingAllowances: Array<{
    id: string
    vehicleId: string
    remainingCount: number
    isUnlimited: boolean
    validFrom: string
    validUntil: string | null
    freeKwhLimit?: number | null
    periodType?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM' | null
    customDays?: number | null
    remainingFreeKwhThisPeriod?: number | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
  statistics: {
    totalSessions: number
    totalSpent: number
    totalKwh: number
  }
}

export interface SessionHistoryResponse {
  sessions: Session[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface OperatorChargingSessionTotals {
  started: number
  completed: number
  paused: number
  cancelled: number
}

export interface StartSessionResponse {
  session: Session
  vehicle: {
    id: string
    kabisaId: string
    licensePlate: string
    model: string
    make: string
    vin: string
    imageUrl: string | null
    batteryCapacity: number
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  charger: {
    id: string
    kabisaId: string
    meterId: string
    gunNumber: string
    latitude: number
    longitude: number
    name: string
    address: string
    power: number
    momoCode: string
    imageUrl: string | null
    operationalStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE'
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  gun: {
    id: string
    kabisaId: string
    chargerId: string
    name: string
    chargingStatus: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'
    currentSessionId: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  userType: 'INDIVIDUAL' | 'BUSINESS' | 'OPERATOR' | 'GUEST'
  ratePerKwh: number
  currency: string
  shouldPay?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: string
  isInvoicedCustomer?: boolean
  freeAllowance?: {
    id: string
    freeKwhLimit: number
    periodType: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'
    customDays: number | null
    remainingFreeKwhThisPeriod: number
  } | null
}

export interface EndSessionPaymentInfo {
  isPaid: boolean
  paymentMethod?: 'MOMO' | 'CARD' | 'FREE_ALLOWANCE' | 'MOMO_CODE_PAYMENT' | 'CONTRACT'
  amount: number
  currency: string
  ratePerKwh?: number
  requiresValidation?: boolean
  shouldPay?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: string
  sessionId?: string
  validationType?: 'MOMO' | 'CARD'
  validationDetails?: {
    momoNumber?: string
    transactionId?: string
  }
}

export interface EndSessionResponse {
  // Legacy single-session shape
  session?: Session
  paymentInfo?: EndSessionPaymentInfo

  // New split-session shape
  freeSession?: Session
  paidSession?: Session
  freePaymentInfo?: EndSessionPaymentInfo
  paidPaymentInfo?: EndSessionPaymentInfo

  isInvoicedCustomer?: boolean
  shouldPay?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: string
  userType?: string
  ratePerKwh?: number
  // EBM info from backend
  ebmInfo?: {
    willGenerateEbm: boolean
    customerName: string | null
    customerPhone: string | null
    distributionPhone: string | null
  }
  // Additional flags for newer backend responses
  willGenerateEbm?: boolean
  isEbmEligible?: boolean
}

// TIN Validation types
export interface ValidateTinRequest {
  customerTin: string
}

export interface ValidateTinResponse {
  success: boolean
  data: {
    isValid: boolean | null // null means VSDC unavailable
    tin: string
    customerName?: string | null
    /** Business record from VSDC /customers/selectCustomer. Present only when
     *  isValid === true. Use this to show the company info (name + location)
     *  on the EBM popup instead of echoing the operator-typed name. */
    business?: {
      name: string | null
      statusCode: string | null
      province: string | null
      district: string | null
      sector: string | null
      location: string | null
    }
    reason?: string
  }
}

// Get available guns from offline pedestals for a charger
export const getAvailableGuns = async (chargerId: string): Promise<AvailableGunsResponse> => {
  const response = await api(false, true).get(`/api/chargers/${chargerId}/available-guns`)
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  return response.data.data
}

// Start a new charging session
export const startChargingSession = async (data: StartSessionData): Promise<StartSessionResponse> => {
  const response = await api(true, true).post('/api/charging-sessions/start', data)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

export const getOperatorChargingSessionTotals = async (): Promise<OperatorChargingSessionTotals> => {
  const response = await api().get('/api/operator-shift/charging-sessions/totals')

  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'Failed to fetch operator charging session totals')
  }

  const totals = response.data.data?.totals ?? {}

  return {
    started: typeof totals.started === 'number' ? totals.started : 0,
    completed: typeof totals.completed === 'number' ? totals.completed : 0,
    paused: typeof totals.paused === 'number' ? totals.paused : 0,
    cancelled: typeof totals.cancelled === 'number' ? totals.cancelled : 0,
  }
}

// Operator session alerts (unpaid counts, needs-info count)
export interface OperatorSessionAlerts {
  unpaidTotal: number
  unpaidToday: number
  needsInfoTotal: number
  needsInfoToday: number
}

export const getOperatorSessionAlerts = async (): Promise<OperatorSessionAlerts> => {
  const response = await api().get('/api/operator-shift/charging-sessions/alerts')

  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'Failed to fetch session alerts')
  }

  const alerts = response.data.data?.alerts ?? {}
  return {
    unpaidTotal: typeof alerts.unpaidTotal === 'number' ? alerts.unpaidTotal : 0,
    unpaidToday: typeof alerts.unpaidToday === 'number' ? alerts.unpaidToday : 0,
    needsInfoTotal: typeof alerts.needsInfoTotal === 'number' ? alerts.needsInfoTotal : 0,
    needsInfoToday: typeof alerts.needsInfoToday === 'number' ? alerts.needsInfoToday : 0,
  }
}

// End an active charging session
export const endChargingSession = async (data: EndSessionData): Promise<EndSessionResponse> => {


  const response = await api(false, true).post('/api/charging-sessions/end', data)



  if (response.data.status === 'error') {
    console.error('❌ API Error:', response.data)
    throw new Error(`${response.data.message} (Code: ${response.data.errorCode || 'N/A'})`)
  }

  return response.data.data
}

// End a stale remote session (tells Citrine to stop the transaction)
export const endRemoteSession = async (sessionId: string): Promise<{ status: string; message: string }> => {
  const response = await api().post(`/api/charging-sessions/${sessionId}/end-remote`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data
}

// Validate TIN via VSDC
export const validateTin = async (tin: string): Promise<ValidateTinResponse> => {
  const response = await api(false, false).post('/api/ebm/validate-tin', { customerTin: tin })

  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'TIN validation failed')
  }

  return response.data
}

// Get user profile with statistics
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await api().get('/api/user/profile')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get active charging sessions
export const getActiveSessions = async (): Promise<Session[]> => {
  const response = await api().get('/api/charging-sessions/active')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data.sessions
}

// Get session history with pagination and filters
export const getSessionHistory = async (params?: {
  page?: number
  limit?: number
  sessionStatus?: string
  startDate?: string
  endDate?: string
}): Promise<SessionHistoryResponse> => {
  const queryParams = new URLSearchParams()
  
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.sessionStatus) queryParams.append('sessionStatus', params.sessionStatus)
  if (params?.startDate) queryParams.append('startDate', params.startDate)
  if (params?.endDate) queryParams.append('endDate', params.endDate)
  
  const url = `/api/charging-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await api().get(url)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get session by ID
export const getSessionById = async (sessionId: string): Promise<Session> => {
  const response = await api().get(`/api/charging-sessions/${sessionId}`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data.session
}

// Get operator sessions (legacy unpaginated list for current operator).
export const getOperatorSessions = async (since?: string): Promise<Session[]> => {
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  const response = await api().get(`/api/charging-sessions/operator/sessions${query}`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data.sessions
}

// Paginated operator sessions with optional server-side search + status filter.
// Use this when the UI needs pagination or backend-driven search/status.
export const getOperatorSessionsPaginated = async (params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  /** Exact-match filter on the human-readable sessionId. Used by share-link
   *  auto-open so we never pick a false positive from the free-text `search`. */
  sessionId?: string
}): Promise<SessionHistoryResponse> => {
  const queryParams = new URLSearchParams()
  queryParams.append('page', (params.page ?? 1).toString())
  queryParams.append('limit', (params.limit ?? 10).toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.status) queryParams.append('status', params.status)
  if (params.sessionId) queryParams.append('sessionId', params.sessionId)

  const response = await api().get(`/api/charging-sessions/operator/sessions?${queryParams.toString()}`)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  const data = response.data.data
  if (data?.pagination) return data as SessionHistoryResponse
  // Fallback in case backend returns legacy shape
  return {
    sessions: data.sessions || [],
    pagination: {
      page: 1,
      limit: (data.sessions || []).length,
      total: (data.sessions || []).length,
      totalPages: 1,
    },
  }
}

// Get operator active sessions (sessions with status STARTED)
export const getOperatorActiveSessions = async (): Promise<Session[]> => {
  try {
    // First try without any limits to get ALL active sessions
    let response = await api().get('/api/charging-sessions/operator/active-sessions')
    
    // If the response has pagination and we need more sessions, fetch them
    if (response.data.data?.pagination && response.data.data.pagination.total > response.data.data.sessions.length) {
      console.log('📄 Pagination detected, fetching all pages...', {
        current: response.data.data.sessions.length,
        total: response.data.data.pagination.total
      })
      
      // Fetch all pages if needed
      const allSessions = [...response.data.data.sessions]
      const totalPages = Math.ceil(response.data.data.pagination.total / (response.data.data.pagination.limit || 10))
      
      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageResponse = await api().get(`/api/charging-sessions/operator/active-sessions?page=${page}&limit=100`)
          if (pageResponse.data.status === 'success' && pageResponse.data.data?.sessions) {
            allSessions.push(...pageResponse.data.data.sessions)
          }
        } catch (pageError) {
          console.warn(`Failed to fetch page ${page}:`, pageError)
          break
        }
      }
      
      console.log('✅ All Active Sessions Fetched:', {
        totalSessions: allSessions.length,
        sessions: allSessions
      })
      
      return allSessions
    }
    
    // Debug logging to see what we're getting
    console.log('🔍 Active Sessions API Response:', {
      status: response.data.status,
      data: response.data.data,
      sessionsCount: response.data.data?.sessions?.length || 0,
      sessions: response.data.data?.sessions
    })
    
    return response.data.data.sessions || []
    
  } catch (error) {
    console.error('❌ Error fetching active sessions:', error)
    throw error
  }
}

// Get operator latest sessions (5 most recent sessions)
export const getOperatorLatestSessions = async (): Promise<Session[]> => {
  const response = await api().get('/api/charging-sessions/operator/latest-sessions')
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data.sessions
}

// Update customer info on a charging session (name, phone, description, tag)
export const updateSessionCustomerInfo = async (
  sessionId: string,
  data: UpdateSessionCustomerInfoData
): Promise<Session> => {
  const response = await api().patch(`/api/charging-sessions/${sessionId}/customer-info`, data)

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data.session
}

// Get admin all sessions (all sessions in system with pagination)
export const getAdminAllSessions = async (params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
  /** Exact-match sessionId for share-link auto-open. */
  sessionId?: string
  startDate?: string
  endDate?: string
}): Promise<SessionHistoryResponse> => {
  const queryParams = new URLSearchParams()

  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.search) queryParams.append('search', params.search)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.sessionId) queryParams.append('sessionId', params.sessionId)
  if (params?.startDate) queryParams.append('startDate', params.startDate)
  if (params?.endDate) queryParams.append('endDate', params.endDate)

  const url = `/api/charging-sessions/admin/all-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await api().get(url)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// Get admin active sessions (all active sessions in system)
export const getAdminActiveSessions = async (params?: {
  page?: number
  limit?: number
}): Promise<SessionHistoryResponse> => {
  const queryParams = new URLSearchParams()
  
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const url = `/api/charging-sessions/admin/active-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const response = await api().get(url)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// ===== PAYMENT PROCESSING APIs =====

export interface PayWithMomoRequest {
  phone: string
}

export interface PayWithMomoResponse {
  status: 'success' | 'error'
  message: string
  data: {
    transaction: {
      id: string
      transactionId: string
      amount: number
      currency: string
      transactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
      externalTransactionReference: string
    }
    isPaid: boolean
    paymentMethod: 'MOMO'
    requiresValidation: boolean
    validationType: 'MOMO'
    validationDetails: {
      momoNumber: string
      transactionId: string
    }
    /** EBM rollout flag from the charger. Drives whether the EBM popup opens
     *  after successful payment. Absent on legacy responses → treated as false. */
    chargerGenerateEbm?: boolean
  }
}

export interface MomoPaymentStatusResponse {
  status: 'success' | 'error'
  message: string
  data: {
    transaction: {
      transactionStatus: 'COMPLETED' | 'PENDING' | 'FAILED'
    }
    isPaid: boolean
    validationDetails: {
      momoStatus: 'SUCCESSFUL' | 'PENDING' | 'FAILED'
      reason?: string
    }
    ebmPdf?: ArrayBuffer
    /** EBM rollout flag from the charger. Drives whether the EBM popup opens
     *  after successful payment. Absent on legacy responses → treated as false. */
    chargerGenerateEbm?: boolean
  }
}

// Pay with MOMO
export const payWithMomo = async (sessionId: string, phone: string): Promise<PayWithMomoResponse> => {
  const response = await api().post(`/api/charging-sessions/${sessionId}/pay-momo`, { phone })
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// Pay with MOMO Code (operator verified)
export const payWithMomoCode = async (sessionId: string): Promise<PayWithMomoResponse> => {
  const response = await api().post(`/api/charging-sessions/${sessionId}/pay-momo-code`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// Check MOMO payment status
export const checkMomoPaymentStatus = async (transactionId: string): Promise<MomoPaymentStatusResponse> => {
  const response = await api().get(`/api/charging-sessions/momo-payment-status/${transactionId}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data
}

// ===== EBM GENERATE API =====

export interface GenerateEbmRequest {
  sessionId: string
  ebmTin?: string
  purchaseCode?: string
  customerPhone?: string
  customerName?: string
  distributionPhone?: string
}

export interface GenerateEbmResponse {
  status: 'completed' | 'queued' | 'error'
  message: string
  receiptNumber?: string
  queuePosition?: number
  errorCode?: string
  errorMessage?: string
  isRetryable?: boolean
}

// Generate EBM synchronously - returns VSDC result or error for operator display
export const generateEbm = async (data: GenerateEbmRequest): Promise<GenerateEbmResponse> => {
  try {
    const response = await api().post('/api/ebm/generate', data)
    return {
      status: response.data.data?.status || 'completed',
      message: response.data.message || 'EBM generated successfully',
      receiptNumber: response.data.data?.receiptNumber,
    }
  } catch (error: any) {
    // 422 = VSDC validation error (wrong purchase code, invalid TIN, etc.)
    // 503 = VSDC offline
    const status = error.response?.status
    if (status === 422 || status === 503) {
      const errData = error.response.data?.data || error.response.data
      return {
        status: 'error',
        message: error.response.data?.message || 'EBM generation failed',
        errorCode: errData?.errorCode || (status === 503 ? 'VSDC_OFFLINE' : 'VSDC_ERROR'),
        errorMessage: errData?.errorMessage || error.response.data?.message,
        isRetryable: errData?.isRetryable ?? true
      }
    }
    throw error
  }
}

// ===== EBM DOWNLOAD API =====

// Download EBM with automatic corruption detection and regeneration fallback
export const downloadEBM = async (sessionId: string, isTraining: boolean = false): Promise<Blob> => {
  try {
    // First attempt - normal download
    return await downloadEBMAttempt(sessionId, false, isTraining);
  } catch (error: any) {
    if (error.message.includes('corrupted') || error.message.includes('incomplete') || error.message.includes('too small') || error.message.includes('Invalid PDF header')) {
      
      // Second attempt - force regeneration
      try {
        return await downloadEBMAttempt(sessionId, true, isTraining);
      } catch (regenerationError: any) {
        console.error('❌ EBM regeneration failed:', regenerationError);
        throw new Error('EBM receipt is corrupted and cannot be regenerated. Please contact support.');
      }
    }
    throw error;
  }
};

const downloadEBMAttempt = async (sessionId: string, forceRegenerate = false, isTraining = false): Promise<Blob> => {
  const params = new URLSearchParams();
  if (forceRegenerate) {
    params.append('regenerate', 'true');
    params.append('t', Date.now().toString());
  }
  if (isTraining) {
    params.append('isTraining', 'true');
  }
  
  const queryString = params.toString();
  const url = `/api/ebm/session/${sessionId}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await api(false, false).get(url, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    // The new API returns the PDF directly as a blob
    if (response.data instanceof Blob) {
      // Handle 202/503 status codes for queued/processing EBMs FIRST
      // Check status before content type to catch all 202/503 responses
      if (response.status === 202 || response.status === 503) {
        // Try to extract message from JSON if available
        if (response.data.type === 'application/json') {
          try {
            const text = await response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(errorData?.message || 'Your receipt is being prepared. Please check back in a few moments.');
          } catch (parseError) {
            // If JSON parsing fails, use default message
            throw new Error('Your receipt is being prepared. Please check back in a few moments.');
          }
        }
        // Non-JSON 202/503 response
        throw new Error('Your receipt is being prepared. Please check back in a few moments.');
      }

      // Check if the blob is actually JSON (error response)
      // Backend returns JSON for errors even when blob is requested
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        const errorMessage = errorData?.message || errorData?.error || 'Failed to generate EBM';
        throw new Error(errorMessage);
      }

      // Validate the PDF blob
      if (response.data.size < 100) {
        throw new Error(`EBM data is too small (${response.data.size} bytes). The EBM may not be ready yet or there was an issue generating it.`);
      }

      return response.data;
    } else {
      throw new Error('Invalid response format from EBM API');
    }
  } catch (error: any) {
    // Handle 202/503 status codes for queued EBMs
    if (error.response?.status === 202 || error.response?.status === 503) {
      // Try to extract the message from the response
      if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData?.message || 'Your receipt is being prepared. Please check back in a few moments.');
        } catch (parseError) {
          throw new Error('Your receipt is being prepared. Please check back in a few moments.');
        }
      }
      throw new Error('Your receipt is being prepared. Please check back in a few moments.');
    }

    // If the error has a response with a blob, try to extract the JSON error message
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text();
        const errorData = JSON.parse(text);
        const errorMessage = errorData?.message || errorData?.error || error.message;
        throw new Error(errorMessage);
      } catch (parseError) {
        // If parsing fails, use the original error
        throw error;
      }
    }

    // Re-throw the error as-is
    throw error;
  }
};

// ===== EBM REFUND DOWNLOAD API =====

export interface EBMRefundRequest {
  sessionId: string
  refundReasonCode?: string
  isTraining?: boolean
  customerTin?: string // Optional TIN override for refund
  purchaseCode?: string // Required by RRA when customerTin is provided (6 digits)
}

// Download EBM Refund PDF
export const downloadEBMRefund = async (
  sessionId: string,
  refundReasonCode: string = 'OTHER_REASON',
  isTraining: boolean = false,
  customerTin?: string,
  purchaseCode?: string
): Promise<Blob> => {
  try {
    const response = await api().post(
      '/api/ebm/refund',
      {
        sessionId,
        refundReasonCode,
        isTraining,
        ...(customerTin && { customerTin }),
        ...(purchaseCode && { purchaseCode })
      },
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      }
    )

    // Validate the PDF blob
    if (response.data instanceof Blob) {
      // Check if the blob is actually JSON (error response)
      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        const errorMessage = errorData?.message || errorData?.error || 'Failed to generate EBM refund'
        throw new Error(errorMessage)
      }

      // Validate the PDF blob size
      if (response.data.size < 100) {
        throw new Error(`EBM refund data is too small (${response.data.size} bytes). The refund EBM may not be ready yet or there was an issue generating it.`)
      }

      return response.data
    }

    throw new Error('Invalid response format from EBM refund API')
  } catch (error: any) {
    console.error('EBM refund download error:', error)

    // Handle specific error cases
    if (error.response?.status === 400) {
      throw new Error('Invalid session ID or missing required fields')
    } else if (error.response?.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    } else if (error.response?.status === 403) {
      throw new Error('Forbidden - Admin access required')
    } else if (error.response?.status === 404) {
      throw new Error('Session or original EBM not found')
    } else if (error.response?.status === 500) {
      throw new Error('Failed to generate EBM refund. Please try again later.')
    }

    // If the error has a response with a blob, try to extract the JSON error message
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text()
        const errorData = JSON.parse(text)
        const errorMessage = errorData?.message || errorData?.error || error.message
        throw new Error(errorMessage)
      } catch (parseError) {
        // If parsing fails, use the original error
        throw error
      }
    }

    // Re-throw the error as-is
    throw error
  }
}

// ===== PROFORMA INVOICE API =====

// Download Proforma Invoice PDF
export const downloadProformaInvoice = async (sessionId: string): Promise<Blob> => {
  try {
    const response = await api(false, false).get(`/api/ebm/proforma/${sessionId}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    })

    // Validate the PDF blob
    if (response.data instanceof Blob) {
      // Check if the blob is actually JSON (error response)
      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        const errorMessage = errorData?.message || errorData?.error || 'Failed to generate Proforma invoice'
        throw new Error(errorMessage)
      }

      // Validate the PDF blob size
      if (response.data.size < 100) {
        throw new Error(`Proforma invoice data is too small (${response.data.size} bytes). The invoice may not be ready yet or there was an issue generating it.`)
      }

      return response.data
    }

    throw new Error('Invalid response format from Proforma invoice API')
  } catch (error: any) {
    console.error('Proforma invoice download error:', error)

    // Handle specific error cases
    if (error.response?.status === 400) {
      throw new Error('Invalid session ID')
    } else if (error.response?.status === 404) {
      throw new Error('Charging session not found')
    } else if (error.response?.status === 500) {
      throw new Error('Failed to generate Proforma invoice. Please try again later.')
    }

    // If the error has a response with a blob, try to extract the JSON error message
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text()
        const errorData = JSON.parse(text)
        const errorMessage = errorData?.message || errorData?.error || error.message
        throw new Error(errorMessage)
      } catch (parseError) {
        // If parsing fails, use the original error
        throw error
      }
    }

    // Re-throw the error as-is
    throw error
  }
}

// ===== UTILITY FUNCTIONS =====

// Helper function to save PDF blob as file
export const downloadAndSavePDF = async (blob: Blob, filename: string): Promise<void> => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  window.URL.revokeObjectURL(url)
}

// Auto-download EBM after successful payment
export const autoDownloadEBM = async (sessionId: string): Promise<void> => {
  try {
    // Wait for backend EBM processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Download EBM
    const pdfBlob = await downloadEBM(sessionId)
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `EBM_Receipt_${sessionId.slice(0, 8)}_${timestamp}.pdf`
    
    // Save file
    await downloadAndSavePDF(pdfBlob, filename)
    
  } catch (error: any) {
    console.error('Auto-download EBM failed:', error)
    
    if (error.message.includes('Session must be paid')) {
      throw new Error('EBM will be available after payment processing')
    } else {
      throw new Error('Failed to auto-download EBM')
    }
  }
}

// ===== EBM DISTRIBUTION API =====

export interface EBMDistributionRequest {
  sessionId: string
  email?: string
  phone?: string
}

export interface EBMDistributionResponse {
  success: boolean
  message: string
  data: {
    sessionId: string
    ebmUrl: string
    emailSent: boolean
    smsSent: boolean
  }
}

// Distribute EBM via email or SMS
export const distributeEBM = async (request: EBMDistributionRequest): Promise<EBMDistributionResponse> => {
  const response = await api(false, false).post('/api/ebm/distribute', request)

  if (response.data.status === 'error') {
    throw new Error(response.data.message || 'Failed to distribute EBM')
  }

  return response.data
}

// Get EBM PDF by session ID (for viewing in browser)
export const getEBMPDF = async (sessionId: string): Promise<Blob> => {
  try {
    const response = await api(false, false).get(`/api/ebm/session/${sessionId}`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    })

    // Handle 202 (Accepted) - EBM is being prepared
    if (response.status === 202) {
      // Try to extract JSON message from blob
      if (response.data instanceof Blob && response.data.type === 'application/json') {
        try {
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData?.message || 'Your receipt is being prepared. Please check back in a few moments.');
        } catch (parseError) {
          throw new Error('Your receipt is being prepared. Please check back in a few moments.');
        }
      }
      throw new Error('Your receipt is being prepared. Please check back in a few moments.');
    }

    // Validate that response is actually a PDF, not JSON
    if (response.data instanceof Blob) {
      // If blob is JSON, it's an error response that slipped through
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData?.message || 'Failed to load EBM receipt');
      }

      // Validate minimum PDF size
      if (response.data.size < 100) {
        throw new Error('EBM receipt is too small. It may not be ready yet.');
      }

      // Validate it's actually a PDF by checking blob type
      if (response.data.type && !response.data.type.includes('pdf') && !response.data.type.includes('octet-stream')) {
        throw new Error(`Unexpected content type: ${response.data.type}. Expected PDF.`);
      }
    }

    return response.data
  } catch (error: any) {
    // Handle 202/503 status codes from error responses
    if (error.response?.status === 202 || error.response?.status === 503) {
      if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData?.message || 'Your receipt is being prepared. Please check back in a few moments.');
        } catch (parseError) {
          throw new Error('Your receipt is being prepared. Please check back in a few moments.');
        }
      }
      throw new Error('Your receipt is being prepared. Please check back in a few moments.');
    }

    // Re-throw for other errors
    throw error;
  }
}

// ===== CUSTOMER LOOKUP API =====

export interface CustomerLookupResponse {
  customerName: string | null
  customerType: 'individual' | 'business' | null
  customerInfo: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  } | null
  vehicleInfo: {
    make: string | null
    model: string | null
  } | null
  source: 'registered_vehicle' | 'previous_session' | 'not_found'
}

// Get customer information by license plate
export const getCustomerByLicensePlate = async (licensePlate: string): Promise<CustomerLookupResponse> => {
  const response = await api().get(`/api/charging-sessions/customer/${encodeURIComponent(licensePlate)}`)
  
  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

// ===== CAR MODEL/Make API =====

// Get all available car model/make options
export const getCarModelMakes = async (): Promise<string[]> => {
  try {
    const response = await api().get('/api/charging-sessions/model-makes')
    
    if (response.data.status === 'success' && response.data.data?.items) {
      return response.data.data.items
    }
    
    throw new Error('Failed to retrieve car model/make options')
  } catch (error: any) {
    console.error('Error fetching car model/makes:', error)
    throw new Error('Failed to load car model options. Please try again.')
  }
}

// ===== SESSION TRANSFER API =====

export interface Operator {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  isActive?: boolean
  isTrainee?: boolean
}

export interface TransferSessionData {
  sessionId: string
  newOperatorId: string
  transferredKwh?: number
  transferredKwhImage?: string
}

export interface TransferSessionResponse {
  success: boolean
  message: string
  data?: {
    sessionId: string
    previousOperatorId: string
    newOperatorId: string
    transferredAt: string
  }
}

// Get available operators for session transfer
export const getAvailableOperators = async (): Promise<Operator[]> => {
  try {
    const response = await api().get('/api/operator-shift/operators')
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message)
    }
    
    return response.data.data.operators || []
  } catch (error: any) {
    console.error('Error fetching available operators:', error)
    throw new Error(error.message || 'Failed to load operators. Please try again.')
  }
}


// Transfer session to another operator
export const transferSession = async (data: TransferSessionData): Promise<TransferSessionResponse> => {
  try {
    const response = await api().post('/api/operator-shift/transfer-session', data)
    
    if (response.data.status === 'success') {
      return {
        success: true,
        message: response.data.message || 'Session transferred successfully',
        data: response.data.data
      }
    }
    
    throw new Error(response.data.message || 'Failed to transfer session')
  } catch (error: any) {
    console.error('Error transferring session:', error)
    throw new Error(error.response?.data?.message || 'Failed to transfer session. Please try again.')
  }
}

// ===== Debt Payment =====

export const checkDebtPaymentStatus = async (transactionId: string) => {
  const response = await api().get(`/api/charging-sessions/debt-payment-status/${transactionId}`)
  return response.data
}

export const retryDebtPayment = async (transactionId: string, phone: string) => {
  const response = await api().post(`/api/charging-sessions/debt-payment-retry/${transactionId}`, { phone })
  return response.data
}

// ===== Current User =====

export const getCurrentUser = async () => {
  const response = await api().get('/api/auth/me')

  if (response.data.status === 'error') {
    throw new Error(response.data.message)
  }

  return response.data.data.user
}