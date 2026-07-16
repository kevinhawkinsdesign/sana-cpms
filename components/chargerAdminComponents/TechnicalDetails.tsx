'use client';

import React, { useCallback } from 'react';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { Control, FieldValues } from 'react-hook-form';

// Type definitions
interface InternetOption {
  id: string;
  internet: string;
}

interface ConnectorOption {
  id: string;
  connector: string;
}

interface CableAttachmentOption {
  id: string;
  cableAttached: string;
}

interface TechnicalOptions {
  internets: InternetOption[];
  connectors: ConnectorOption[];
  cableAttachments: CableAttachmentOption[];
}

interface TechnicalDetailsProps {
  form: {
    control: Control<FieldValues>;
    setValue?: (name: string, value: any) => void;
    watch?: (name: string) => any;
  };
  options: TechnicalOptions;
  isLoading?: boolean;
  error?: Error | null;
  disabled?: boolean;
  minPower?: number;
  maxPower?: number;
  powerUnit?: string;
}

/**
 * TechnicalDetails component for charger technical specifications
 * Handles internet connection, connector type, cable attachment, and power settings
 */
export const TechnicalDetails: React.FC<TechnicalDetailsProps> = ({
  form,
  options,
  isLoading = false,
  error = null,
  disabled = false,
  minPower = 0.1,
  maxPower = 350,
  powerUnit = 'kW'
}) => {

  /**
   * Validates and formats power input
   */
  const handlePowerChange = useCallback((value: string, onChange: (value: number | '') => void) => {
    if (!value) {
      onChange('');
      return;
    }

    const numericValue = Number(value);
    
    if (isNaN(numericValue)) {
      toast.error("Please enter a valid power value");
      return;
    }

    if (numericValue < minPower) {
      toast.error(`Power must be at least ${minPower} ${powerUnit}`);
      return;
    }

    if (numericValue > maxPower) {
      toast.error(`Power cannot exceed ${maxPower} ${powerUnit}`);
      return;
    }

    onChange(numericValue);
  }, [minPower, maxPower, powerUnit]);

  // Loading state
  if (isLoading) {
    return <TechnicalDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load technical specifications. Please try again.
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
          <Zap className="w-4 h-4 text-yellow-600" />
        </div>
        <CardTitle>Technical Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Internet Connection */}
          <FormField
            control={form.control}
            name="internetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="internet-select">
                  Internet Connection
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger 
                      id="internet-select"
                      aria-describedby="internet-error"
                    >
                      <SelectValue placeholder="Select internet type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.internets.length === 0 ? (
                      <SelectItem value="" disabled>
                        No internet options available
                      </SelectItem>
                    ) : (
                      options.internets.map((internet) => (
                        <SelectItem key={internet.id} value={internet.id}>
                          {internet.internet}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the type of internet connection for this charger
                </FormDescription>
                <FormMessage id="internet-error" />
              </FormItem>
            )}
          />

          {/* Connector Type */}
          <FormField
            control={form.control}
            name="connectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="connector-select">
                  Connector Type
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger 
                      id="connector-select"
                      aria-describedby="connector-error"
                    >
                      <SelectValue placeholder="Select connector type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.connectors.length === 0 ? (
                      <SelectItem value="" disabled>
                        No connector options available
                      </SelectItem>
                    ) : (
                      options.connectors.map((connector) => (
                        <SelectItem key={connector.id} value={connector.id}>
                          {connector.connector}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the charging connector standard (e.g., CCS, CHAdeMO, Type 2)
                </FormDescription>
                <FormMessage id="connector-error" />
              </FormItem>
            )}
          />

          {/* Cable Attachment */}
          <FormField
            control={form.control}
            name="cableAttachedId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cable-select">
                  Cable Attachment
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger 
                      id="cable-select"
                      aria-describedby="cable-error"
                    >
                      <SelectValue placeholder="Select cable attachment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.cableAttachments.length === 0 ? (
                      <SelectItem value="" disabled>
                        No cable options available
                      </SelectItem>
                    ) : (
                      options.cableAttachments.map((cable) => (
                        <SelectItem key={cable.id} value={cable.id}>
                          {cable.cableAttached}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Specify whether cables are tethered or if users bring their own
                </FormDescription>
                <FormMessage id="cable-error" />
              </FormItem>
            )}
          />

          {/* Power Rating */}
          <FormField
            control={form.control}
            name="power"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="power-input">
                  Power ({powerUnit})
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    id="power-input"
                    type="number"
                    min={minPower}
                    max={maxPower}
                    step="0.1"
                    placeholder={`Enter power in ${powerUnit}`}
                    value={field.value || ''}
                    onChange={(e) => handlePowerChange(e.target.value, field.onChange)}
                    disabled={disabled}
                    aria-describedby="power-error power-description"
                  />
                </FormControl>
                <FormDescription id="power-description">
                  Maximum charging power ({minPower} - {maxPower} {powerUnit})
                </FormDescription>
                <FormMessage id="power-error" />
              </FormItem>
            )}
          />
        </div>

        {/* Missing Options Warnings */}
        <div className="mt-6 space-y-4">
          {options.internets.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No internet connection options are available. Please add internet options in the system settings.
              </AlertDescription>
            </Alert>
          )}

          {options.connectors.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No connector types are available. Please add connector options in the system settings.
              </AlertDescription>
            </Alert>
          )}

          {options.cableAttachments.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No cable attachment options are available. Please add cable options in the system settings.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Technical Info */}
        <Alert className="mt-6">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Technical Requirements:</strong> All specifications must be accurate for proper charger operation and compatibility with vehicles.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton component for TechnicalDetails
 */
const TechnicalDetailsSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default TechnicalDetails;