import { NextRequest, NextResponse } from 'next/server';

// Using a completely free API that doesn't require API keys
const FREE_EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest';

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base_code: string;
  time_last_update_utc: string;
}

interface ConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

interface ConversionResponse {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: string;
}

// Cache exchange rates for 1 hour to avoid excessive API calls
const rateCache = new Map<string, { rates: Record<string, number>; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  const cacheKey = `rates_${baseCurrency}`;
  const cached = rateCache.get(cacheKey);
  
  // Return cached rates if they're still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates;
  }

  try {
    const response = await fetch(`${FREE_EXCHANGE_API_URL}/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    // Cache the rates
    rateCache.set(cacheKey, {
      rates: data.rates,
      timestamp: Date.now()
    });

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Fallback to cached rates if available, even if expired
    if (cached) {
      
      return cached.rates;
    }
    
    // Final fallback to approximate rates (you should update these regularly)
    const fallbackRates: Record<string, number> = {
      USD: 1,
      KES: 129.08, // Updated to current rate
      RWF: 1448.56, // Updated to current rate
      EUR: 0.87,
      GBP: 0.75,
    };
    
    return fallbackRates;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversionRequest = await request.json();
    const { amount, fromCurrency, toCurrency } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: 'Both fromCurrency and toCurrency are required.' },
        { status: 400 }
      );
    }

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      const response: ConversionResponse = {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Fetch exchange rates
    const rates = await fetchExchangeRates('USD');
    
    // Check if both currencies are available
    if (!rates[fromCurrency] || !rates[toCurrency]) {
      return NextResponse.json(
        { error: `Unsupported currency pair: ${fromCurrency} to ${toCurrency}` },
        { status: 400 }
      );
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount / rates[fromCurrency];
    const convertedAmount = usdAmount * rates[toCurrency];
    const exchangeRate = rates[toCurrency] / rates[fromCurrency];

    const response: ConversionResponse = {
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      fromCurrency,
      toCurrency,
      exchangeRate: Math.round(exchangeRate * 100000) / 100000, // Round to 5 decimal places
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert currency. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('base') || 'USD';
    
    const rates = await fetchExchangeRates(baseCurrency);
    
    return NextResponse.json({
      base: baseCurrency,
      rates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates.' },
      { status: 500 }
    );
  }
} 