// lib/providers/country-provider.tsx
"use client";

import { createContext, useContext, ReactNode } from 'react';

export type CountryCode = 'rw' | 'ke';

interface CountryContextType {
  countryCode: CountryCode;
  countryName: string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

interface CountryProviderProps {
  children: ReactNode;
  countryCode: CountryCode;
}

export const CountryProvider = ({ children, countryCode }: CountryProviderProps) => {
  const countryName = countryCode === 'rw' ? 'Rwanda' : 'Kenya';

  const value = { countryCode, countryName };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = (): CountryContextType => {
  const context = useContext(CountryContext);
  if (context === undefined) {
    // Only warn in development to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.warn('useCountry must be used within a CountryProvider, using fallback values');
    }
    return {
      countryCode: 'rw' as CountryCode, // Default fallback
      countryName: 'Rwanda'
    };
  }
  return context;
};