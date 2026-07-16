import { useState, useCallback } from 'react';
import api from '@/lib/api/api';

interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: string;
}

interface UseCurrencyConversionReturn {
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string) => Promise<number>;
  convertCurrencySync: (amount: number, fromCurrency: string, toCurrency: string) => number;
  isLoading: boolean;
  error: string | null;
  lastConversion: ConversionResult | null;
}

// Cache for exchange rates to avoid repeated API calls
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const useCurrencyConversion = (): UseCurrencyConversionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastConversion, setLastConversion] = useState<ConversionResult | null>(null);

  const convertCurrencySync = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Try to use cached rates first (from API calls)
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = exchangeRateCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const convertedAmount = Math.round((amount * cached.rate) * 100) / 100;
      return convertedAmount;
    }
    
    // If no cached rates, use fallback rates (these should be updated regularly)
    const fallbackRates: Record<string, number> = {
      USD: 1,
      KES: 129.08, // Updated to current rate
      RWF: 1448.56, // Updated to current rate
      EUR: 0.87,
      GBP: 0.75,
    };
    
    const fromRate = fallbackRates[fromCurrency] || 1;
    const toRate = fallbackRates[toCurrency] || 1;
    
    const usdAmount = amount / fromRate;
    return Math.round((usdAmount * toRate) * 100) / 100;
  }, []);

  const convertCurrency = useCallback(async (
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = exchangeRateCache.get(cacheKey);
    
    // Use cached rate if it's still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const convertedAmount = Math.round((amount * cached.rate) * 100) / 100;
      return convertedAmount;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api().post('/api/currency-conversion', {
        amount,
        fromCurrency,
        toCurrency,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const result: ConversionResult = response.data;
      
      // Cache the exchange rate
      exchangeRateCache.set(cacheKey, {
        rate: result.exchangeRate,
        timestamp: Date.now()
      });

      setLastConversion(result);
      return result.convertedAmount;
    } catch (err: any) {
      console.error('Currency conversion error:', err);
      setError(err.message || 'Failed to convert currency');
      
      // Fallback to synchronous conversion
      return convertCurrencySync(amount, fromCurrency, toCurrency);
    } finally {
      setIsLoading(false);
    }
  }, [convertCurrencySync]);

  return {
    convertCurrency,
    convertCurrencySync,
    isLoading,
    error,
    lastConversion,
  };
}; 