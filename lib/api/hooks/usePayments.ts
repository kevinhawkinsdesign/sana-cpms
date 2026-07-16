import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import { toast } from 'sonner'

// Types
export interface UserBalance {
  id: string
  userId: string
  balance: number
  currency: string
  lastTopUpDate: string
  createdAt: string
  updatedAt: string
  airtableId: string | null
  syncedAt: string | null
  isSynced: boolean
  syncError: string | null
}

export interface PaymentMethod {
  id: string
  paymentMethodType: 'MOMO' | 'CARD' | 'BALANCE' | 'CONTRACT' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'KABISA'
  userId?: string
  businessId?: string
  isDefault: boolean
  paymentProviderName?: string
  balance: number
  currency: string
  momoNumber?: string
  flutterwaveCardToken?: string
  businessPaymentContractId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PaymentMethodInput {
  paymentMethodType: 'MOMO' | 'CARD' | 'CONTRACT'
  isDefault?: boolean
  momoNumber?: string
  businessPaymentContractId?: string
}

interface CardPaymentMethodInput {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  isDefault?: boolean
}

interface FreeChargingEntitlement {
  id: string
  userId: string
  validUntil: string
  reason: string
}

interface FreeChargingEntitlementInput {
  validUntil: string
  reason: string
}

interface BalanceTransaction {
  id: string
  amount: number
  currency: string
  description: string
  timestamp: string
}

// Hooks
export function useUserBalance(userId: string) {
  return useQuery({
    queryKey: ['userBalance', userId],
    queryFn: async () => {
      const response = await api().get(`/api/payments/balance/${userId}`)
      return response.data
    },
    enabled: !!userId
  })
}

export function useUpdateUserBalance() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string, data: { amount: number, currency?: string, description: string } }) => {
      const response = await api().put(`/api/payments/balance/${userId}`, data)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userBalance', variables.userId] })
      toast.success('Balance updated successfully')
    },
    onError: () => {
      toast.error('Failed to update balance')
    },
  })
}

export function useCustomerBalance() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { amount: number, currency?: string, description: string }) => {
      const response = await api().put('/api/payments/balance/me', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardBalance'] })
      toast.success('Balance updated successfully')
    }
  })
}

// Updated to use new backend API
export function useAddPaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: PaymentMethodInput) => {
      const response = await api().post('/api/user/payment-methods', data)
      
      if (response.status !== 201) {
        throw new Error(response.data?.message || 'Failed to add payment method')
      }
      
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to add payment method')
      }
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardPaymentMethods'] })
      toast.success('Payment method added successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add payment method')
    },
  })
}

// Updated to use new backend API for card payments
export function useAddCardPaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CardPaymentMethodInput) => {
      const response = await api().post('/api/user/payment-methods/card', data)
      
      if (response.status !== 201) {
        throw new Error(response.data?.message || 'Failed to add card payment method')
      }
      
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to add card payment method')
      }
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardPaymentMethods'] })
      toast.success('Card payment method added successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add card payment method')
    },
  })
}

// Updated to use new backend API
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: {
      isDefault?: boolean
      momoNumber?: string
      paymentProviderName?: string
    }}) => {
      const response = await api().put(`/api/user/payment-methods/${id}`, data)
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Failed to update payment method')
      }
      
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to update payment method')
      }
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardPaymentMethods'] })
      toast.success('Payment method updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment method')
    },
  })
}

// Updated to use new backend API
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await api().post(`/api/user/payment-methods/${paymentMethodId}/set-default`)
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Failed to set default payment method')
      }
      
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to set default payment method')
      }
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardPaymentMethods'] })
      toast.success('Default payment method updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set default payment method')
    },
  })
}

// Updated to use new backend API
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api().delete(`/api/user/payment-methods/${id}`)
      
      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Failed to delete payment method')
      }
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDashboardPaymentMethods'] })
      toast.success('Payment method deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete payment method')
    },
  })
}

export function useEntitlements(userId: string) {
  return useQuery({
    queryKey: ['entitlements', userId],
    queryFn: async () => {
      const response = await api().get(`/api/payments/entitlements/${userId}`)
      return response.data
    },
    enabled: !!userId
  })
}

export function useAddEntitlement() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string, data: {
      remaining_count?: number,
      is_unlimited?: boolean,
      description: string,
      expiryDate?: string
    }}) => {
      const response = await api().post(`/api/payments/entitlements/${userId}`, data)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entitlements', variables.userId] })
      toast.success('Entitlement added successfully')
    },
    onError: () => {
      toast.error('Failed to add entitlement')
    },
  })
}

export function useUpdateEntitlement() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: {
      remaining_count?: number,
      is_unlimited?: boolean,
      description?: string,
      expiryDate?: string,
      isActive?: boolean
    }}) => {
      const response = await api().put(`/api/payments/entitlements/${id}`, data)
      return response.data
    }
  })
}

export function useTransactions(userId: string, page: number, limit: number) {
  return useQuery({
    queryKey: ['transactions', userId, page, limit],
    queryFn: async () => {
      const response = await api().get(`/api/payments/transactions/${userId}`, {
        params: { page, limit }
      })
      return response.data
    },
    enabled: !!userId
  })
} 