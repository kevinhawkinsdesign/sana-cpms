import api from './api';

export interface PaymentMethod {
  id: string;
  paymentMethodType: 'MOMO' | 'CARD' | 'BALANCE' | 'CONTRACT' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'KABISA';
  userId?: string;
  businessId?: string;
  isDefault: boolean;
  paymentProviderName?: string;
  balance: number;
  currency: string;
  momoNumber?: string;
  flutterwaveCardToken?: string;
  businessPaymentContractId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardBINInfo {
  cardType: string;
  cardBrand: string;
  bankName: string;
  country: string;
  isValid: boolean;
}

// Get user payment methods
export const getUserPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const response = await api().get('/api/user/payment-methods');
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to get payment methods');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to get payment methods');
    }
    
    return response.data.data?.paymentMethods || [];
  } catch (error) {
    console.error('Error fetching user payment methods:', error);
    return [];
  }
};

// Add payment method (MOMO, CONTRACT)
export const addPaymentMethod = async (paymentData: {
  paymentMethodType: 'MOMO' | 'CARD' | 'CONTRACT';
  isDefault?: boolean;
  momoNumber?: string;
  businessPaymentContractId?: string;
}) => {
  try {
    const response = await api().post('/api/user/payment-methods', paymentData);
    
    // According to backend documentation, successful creation returns 201
    if (response.status !== 201) {
      throw new Error(response.data?.message || 'Failed to add payment method');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to add payment method');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw error;
  }
};

// Add card payment method
export const addCardPaymentMethod = async (cardData: {
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  isDefault?: boolean;
}) => {
  try {
    const response = await api().post('/api/user/payment-methods/card', cardData);
    
    // According to backend documentation, successful creation returns 201
    if (response.status !== 201) {
      throw new Error(response.data?.message || 'Failed to add card payment method');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to add card payment method');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding card payment method:', error);
    throw error;
  }
};

// Get card BIN information
export const getCardBINInfo = async (cardNumber: string): Promise<CardBINInfo> => {
  try {
    const response = await api().get(`/api/user/payment-methods/card/bin/${cardNumber}`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to get card BIN information');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to get card BIN information');
    }
    
    return response.data.data?.binInfo;
  } catch (error) {
    console.error('Error getting card BIN info:', error);
    throw error;
  }
};

// Update payment method
export const updatePaymentMethod = async (paymentMethodId: string, updateData: {
  isDefault?: boolean;
  momoNumber?: string;
  paymentProviderName?: string;
}) => {
  try {
    const response = await api().put(`/api/user/payment-methods/${paymentMethodId}`, updateData);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to update payment method');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to update payment method');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (paymentMethodId: string) => {
  try {
    const response = await api().post(`/api/user/payment-methods/${paymentMethodId}/set-default`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to set default payment method');
    }
    
    // Check if the response has the expected structure
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to set default payment method');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error setting default payment method:', error);
    throw error;
  }
};

// Delete payment method (if supported by backend)
export const deletePaymentMethod = async (paymentMethodId: string) => {
  try {
    const response = await api().delete(`/api/user/payment-methods/${paymentMethodId}`);
    
    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to delete payment method');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    throw error;
  }
};
