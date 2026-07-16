import api from './api'

// ===== SESSION TRANSFER INTERFACES =====

export interface ChargingSession {
  id: string
  sessionStatus: 'STARTED' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PAID' | 'EBM_ISSUED' | 'REFUNDED'
  isActive: boolean
  startSoc: number
  currentSoc: number
  chargedKwh: number | null
  source?: 'MANUAL' | 'REMOTE'
  startTime: string
  operatorId: string
  previousOperatorId?: string
  transferredDate?: string
  transferredKwh?: number
  transferredKwhImage?: string
  isPaid?: boolean
  paymentMethodName?: string
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD'
  canOperatorEndRemoteSession?: boolean
  vehicle: {
    id: string
    make: string
    model: string
    kabisaId: string
    licensePlates: Array<{
      id: string
      licencePlateNumber: string
      isActive: boolean
    }>
  }
  charger: {
    id: string
    name: string
    address: string
  }
  gun: {
    id: string
    gunNumber: string
  }
  pedestal?: {
    id: string
    name?: string
  }
  operator?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export interface Operator {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  role?: string
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
  session: ChargingSession
  previousOperator: {
    id: string
    firstName: string
    lastName: string
  }
  newOperator: {
    id: string
    firstName: string
    lastName: string
  }
}

// ===== API FUNCTIONS =====

// Transfer active charging session
export const transferSession = async (data: TransferSessionData): Promise<TransferSessionResponse> => {
  const response = await api().post('/api/operator-shift/transfer-session', data)

  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }

  return response.data.data
}

// Get current operator's active sessions
export const getActiveSessions = async (): Promise<{ sessions: ChargingSession[] }> => {
  const response = await api().get('/api/charging-sessions/operator/active-sessions')

  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }

  return response.data.data
}

// Get available operators for transfer
export const getAvailableOperators = async (): Promise<{ operators: Operator[] }> => {
  const response = await api().get('/api/operator-shift/operators')

  if (response.data.status === 'error') {
    const error = new Error(response.data.message) as any
    error.errorCode = response.data.errorCode
    error.status = response.data.status
    error.data = response.data.data
    throw error
  }

  return response.data.data
}

// ===== UTILITY FUNCTIONS =====

// Format session duration
export const formatSessionDuration = (startTime: string): string => {
  const start = new Date(startTime)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Get session status color
export const getSessionStatusColor = (status: string): string => {
  switch (status) {
    case 'STARTED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Get session status icon
export const getSessionStatusIcon = (status: string): string => {
  switch (status) {
    case 'STARTED':
      return 'Play'
    case 'PAUSED':
      return 'Pause'
    case 'COMPLETED':
      return 'CheckCircle'
    case 'CANCELLED':
      return 'XCircle'
    default:
      return 'Circle'
  }
}
