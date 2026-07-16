'use client';

import React from 'react';
import { Battery, Plus } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Control, FieldValues } from 'react-hook-form';

// Type definitions
interface Manufacturer {
  id: string;
  manufacturer: string;
}

interface Model {
  id: string;
  model: string;
  manufacturer: Manufacturer;
}

interface ChargerType {
  id: string;
  type: string;
}

interface FormOptions {
  models: Model[];
  types: ChargerType[];
}

interface BasicDetailsProps {
  form: {
    control: Control<FieldValues>;
  };
  options: FormOptions;
  onAddModel: () => void;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * BasicDetails component for charger configuration form
 * Handles charger name, model selection, and type selection
 */
export const BasicDetails: React.FC<BasicDetailsProps> = ({
  form,
  options,
  onAddModel,
  isLoading = false,
  error = null
}) => {
  // Loading state
  if (isLoading) {
    return <BasicDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Basic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load form options. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div 
          className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"
          aria-hidden="true"
        >
          <Battery className="w-4 h-4 text-blue-600" />
        </div>
        <CardTitle>Basic Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Charger Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="charger-name">Charger Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    id="charger-name"
                    placeholder="Enter charger name"
                    aria-describedby="charger-name-error"
                  />
                </FormControl>
                <FormMessage id="charger-name-error" />
              </FormItem>
            )}
          />

          {/* Model Selection with Add Button */}
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel htmlFor="model-select">Model</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger 
                        id="model-select"
                        aria-describedby="model-error"
                      >
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.models.length === 0 ? (
                        <SelectItem value="" disabled>
                          No models available
                        </SelectItem>
                      ) : (
                        options.models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.manufacturer.manufacturer} {model.model}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage id="model-error" />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mt-8"
              onClick={onAddModel}
              aria-label="Add new model"
              title="Add new model"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Charger Type Field */}
          <FormField
            control={form.control}
            name="typeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="type-select">Charger Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger 
                      id="type-select"
                      aria-describedby="type-error"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.types.length === 0 ? (
                      <SelectItem value="" disabled>
                        No types available
                      </SelectItem>
                    ) : (
                      options.types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.type}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage id="type-error" />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton component for BasicDetails
 */
const BasicDetailsSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-10 mt-6" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default BasicDetails;