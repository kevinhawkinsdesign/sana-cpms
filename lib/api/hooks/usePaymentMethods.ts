import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserPaymentMethods, 
  addPaymentMethod, 
  addCardPaymentMethod,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getCardBINInfo,
  type PaymentMethod,
  type CardBINInfo
} from '../paymentMethods';

// Hook to get user payment methods
export function useUserPaymentMethods() {
  return useQuery({
    queryKey: ['userPaymentMethods'],
    queryFn: getUserPaymentMethods,
  });
}

// Hook to add payment method
export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addPaymentMethod,
    onSuccess: () => {
      // Invalidate and refetch payment methods
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });
}

// Hook to add card payment method
export function useAddCardPaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addCardPaymentMethod,
    onSuccess: () => {
      // Invalidate and refetch payment methods
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });
}

// Hook to update payment method
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ paymentMethodId, updateData }: { 
      paymentMethodId: string; 
      updateData: any; 
    }) => updatePaymentMethod(paymentMethodId, updateData),
    onSuccess: () => {
      // Invalidate and refetch payment methods
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });
}

// Hook to set default payment method
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: setDefaultPaymentMethod,
    onSuccess: () => {
      // Invalidate and refetch payment methods
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });
}

// Hook to delete payment method
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      // Invalidate and refetch payment methods
      queryClient.invalidateQueries({ queryKey: ['userPaymentMethods'] });
    },
  });
}

// Hook to get card BIN information
export function useCardBINInfo(cardNumber: string) {
  return useQuery({
    queryKey: ['cardBINInfo', cardNumber],
    queryFn: () => getCardBINInfo(cardNumber),
    enabled: cardNumber.length >= 6, // Only fetch if we have at least 6 digits
  });
}
