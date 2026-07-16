'use client'

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formatPrice = (value: string) => {
  // Remove all non-digit characters
  const numberValue = value.replace(/[^\d]/g, '');
  
  // Convert to number and format with commas
  if (numberValue) {
    const number = parseInt(numberValue, 10);
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  }
  
  return '';
};

interface PriceFieldProps {
  form: any; // Consider using a more specific type based on your form library
  name?: string;
  currency?: string; // Add currency prop
}

const PriceField = ({ form, name = "price", currency = "RWF" }: PriceFieldProps) => {
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: number | '') => void) => {
    // Get the raw value
    const rawValue = e.target.value;
    
    // Remove all non-digit characters
    const numberValue = rawValue.replace(/[^\d]/g, '');
    
    // Convert to number or empty string
    const finalValue = numberValue ? parseInt(numberValue, 10) : '';
    
    // Update the form with the numeric value
    onChange(finalValue);
  };

  // Format price with dynamic currency
  const formatPrice = (value: string) => {
    const numberValue = value.replace(/[^\d]/g, '');
    if (numberValue) {
      const number = parseInt(numberValue, 10);
      return new Intl.NumberFormat(currency === 'KESH' ? 'en-KE' : 'en-RW', {
        style: 'currency',
        currency: currency === 'KESH' ? 'KES' : 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(number);
    }
    return '';
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Price</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ? formatPrice(field.value.toString()) : ''}
              onChange={(e) => handlePriceChange(e, field.onChange)}
              onBlur={(e) => {
                field.onBlur();
                if (field.value) {
                  const formatted = formatPrice(field.value.toString());
                  e.target.value = formatted;
                }
              }}
              placeholder={currency === 'KESH' ? 'KES 0' : 'RWF 0'}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default PriceField;