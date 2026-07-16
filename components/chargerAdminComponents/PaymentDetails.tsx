'use client';

import React, { useEffect, useCallback } from 'react';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { Control, FieldValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';

// Type definitions
interface ChargerFormData {
  isFreeCharging?: boolean;
  standardChargingPrice?: number | null;
  momoCode?: number | null;
  // Add other form fields as needed
}

interface PaymentDetailsProps {
  form: {
    control: Control<FieldValues>;
    setValue: UseFormSetValue<FieldValues>;
    watch: UseFormWatch<FieldValues>;
  };
  isLoading?: boolean;
  error?: Error | null;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  disabled?: boolean;
}

/**
 * PaymentDetails component for charger payment configuration
 * Handles free charging toggle, pricing, and mobile money setup
 */
export const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  form,
  isLoading = false,
  error = null,
  currency = 'RWF',
  minPrice = 1,
  maxPrice = 10000,
  disabled = false
}) => {
  const isFreeCharging = form.watch('isFreeCharging');

  /**
   * Handles clearing payment fields when free charging is enabled
   */
  const handleFreeChargingToggle = useCallback(() => {
    if (isFreeCharging) {
      form.setValue('standardChargingPrice', null);
      form.setValue('momoCode', null);
      
      toast.success("Payment fields cleared - free charging enabled");
    }
  }, [isFreeCharging, form]);

  /**
   * Effect to handle free charging state changes
   */
  useEffect(() => {
    handleFreeChargingToggle();
  }, [handleFreeChargingToggle]);

  /**
   * Validates and formats price input
   */
  const handlePriceChange = useCallback((value: string, onChange: (value: number | null) => void) => {
    if (!value) {
      onChange(null);
      return;
    }

    const numericValue = Number(value);
    
    if (isNaN(numericValue)) {
      toast.error("Please enter a valid price");
      return;
    }

    if (numericValue < minPrice) {
      toast.error(`Price must be at least ${minPrice} ${currency}`);
      return;
    }

    if (numericValue > maxPrice) {
      toast.error(`Price cannot exceed ${maxPrice} ${currency}`);
      return;
    }

    onChange(numericValue);
  }, [minPrice, maxPrice, currency]);

  /**
   * Validates and formats MoMo code input
   */
  const handleMomoCodeChange = useCallback((value: string, onChange: (value: number | null) => void) => {
    if (!value) {
      onChange(null);
      return;
    }

    const numericValue = parseInt(value, 10);
    
    if (isNaN(numericValue)) {
      toast.error("Please enter a valid MoMo code");
      return;
    }

    if (numericValue < 1000 || numericValue > 99999) {
      toast.error("MoMo code must be between 1000 and 99999");
      return;
    }

    onChange(numericValue);
  }, []);

  // Loading state
  if (isLoading) {
    return <PaymentDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load payment details. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div 
          className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center"
          aria-hidden="true"
        >
          <Wallet className="w-4 h-4 text-yellow-600" />
        </div>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Free Charging Toggle */}
        <FormField
          control={form.control}
          name="isFreeCharging"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel htmlFor="free-charging-toggle">
                  Free Charging
                </FormLabel>
                <FormDescription>
                  Enable if this charger offers free charging to users
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  id="free-charging-toggle"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  aria-describedby="free-charging-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Fields - Only shown when not free charging */}
        {!isFreeCharging && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Charging Price */}
            <FormField
              control={form.control}
              name="standardChargingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="charging-price">
                    Standard Charging Price ({currency})
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      id="charging-price"
                      type="number"
                      min={minPrice}
                      max={maxPrice}
                      step="1"
                      placeholder={`Enter price in ${currency}`}
                      value={field.value || ''}
                      onChange={(e) => handlePriceChange(e.target.value, field.onChange)}
                      disabled={disabled}
                      aria-describedby="charging-price-error"
                    />
                  </FormControl>
                  <FormDescription>
                    Price range: {minPrice} - {maxPrice} {currency}
                  </FormDescription>
                  <FormMessage id="charging-price-error" />
                </FormItem>
              )}
            />

            {/* MoMo Code */}
            <FormField
              control={form.control}
              name="momoCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="momo-code">
                    MoMo Code
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      id="momo-code"
                      type="number"
                      min="1000"
                      max="99999"
                      placeholder="Enter 4-5 digit MoMo code"
                      value={field.value || ''}
                      onChange={(e) => handleMomoCodeChange(e.target.value, field.onChange)}
                      disabled={disabled}
                      aria-describedby="momo-code-error"
                    />
                  </FormControl>
                  <FormDescription>
                    Mobile Money payment code (1000-99999)
                  </FormDescription>
                  <FormMessage id="momo-code-error" />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Free Charging Info */}
        {isFreeCharging && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              This charger is configured for free charging. Users will not be charged for using this station.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Requirements Info */}
        {!isFreeCharging && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Both charging price and MoMo code are required for paid charging stations. 
              Users will be charged the standard rate via mobile money.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton component for PaymentDetails
 */
const PaymentDetailsSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Free charging toggle skeleton */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      
      {/* Payment fields skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default PaymentDetails;