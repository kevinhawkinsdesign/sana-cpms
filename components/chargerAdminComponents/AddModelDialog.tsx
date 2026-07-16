'use client';

import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Building2, Plus } from 'lucide-react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api } from '@/lib/api/api';

// Type definitions
interface Manufacturer {
  id: string;
  manufacturer: string;
}

interface AddModelDialogProps {
  onSuccess: () => void;
  onCancel?: () => void;
  initialManufacturerId?: string;
}

interface AddManufacturerData {
  manufacturer: string;
}

interface AddModelData {
  model: string;
  manufacturerId: string;
}

type DialogStep = 'manufacturer' | 'model';

/**
 * AddModelDialog component for adding new charger manufacturers and models
 * Supports two-step process: select/add manufacturer, then add model
 */
export const AddModelDialog: React.FC<AddModelDialogProps> = ({ 
  onSuccess, 
  onCancel,
  initialManufacturerId 
}) => {
  const [step, setStep] = useState<DialogStep>(
    initialManufacturerId ? 'model' : 'manufacturer'
  );
  const [manufacturerId, setManufacturerId] = useState(initialManufacturerId || '');
  const [manufacturerName, setManufacturerName] = useState('');
  const [modelName, setModelName] = useState('');
  
  const queryClient = useQueryClient();

  // Query existing manufacturers
  const { 
    data: manufacturers = [], 
    isLoading: isLoadingManufacturers,
    error: manufacturersError 
  } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async (): Promise<Manufacturer[]> => {
      const response = await api().get('/api/charger-reference/manufacturers');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Add manufacturer mutation
  const manufacturerMutation = useMutation({
    mutationFn: async (data: AddManufacturerData) => {
      const response = await api().post('/api/charger-reference/manufacturers', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      queryClient.invalidateQueries({ queryKey: ['charger-form-data'] });
      
      toast.success('Manufacturer added successfully');
      setManufacturerId(data.id);
      setManufacturerName('');
      setStep('model');
    },
    onError: (error: any) => {
      console.error('Error adding manufacturer:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to add manufacturer'
      );
    }
  });

  // Add model mutation
  const modelMutation = useMutation({
    mutationFn: async (data: AddModelData) => {
      const response = await api().post('/api/charger-reference/models', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['charger-form-data'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      
      toast.success(`Model "${data.model}" added successfully`);
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error adding model:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to add model'
      );
    }
  });

  /**
   * Handles manufacturer selection or creation
   */
  const handleManufacturerSubmit = useCallback(() => {
    if (manufacturerId) {
      // Using existing manufacturer
      setStep('model');
    } else if (manufacturerName.trim()) {
      // Creating new manufacturer
      manufacturerMutation.mutate({ manufacturer: manufacturerName.trim() });
    } else {
      toast.error('Please select a manufacturer or enter a new one');
    }
  }, [manufacturerId, manufacturerName, manufacturerMutation]);

  /**
   * Handles model creation
   */
  const handleModelSubmit = useCallback(() => {
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }

    if (!manufacturerId) {
      toast.error('Manufacturer selection is required');
      return;
    }

    modelMutation.mutate({
      model: modelName.trim(),
      manufacturerId
    });
  }, [modelName, manufacturerId, modelMutation]);

  /**
   * Handles going back to manufacturer step
   */
  const handleBackToManufacturer = useCallback(() => {
    setStep('manufacturer');
    setModelName('');
  }, []);

  /**
   * Handles manufacturer selection change
   */
  const handleManufacturerChange = useCallback((value: string) => {
    setManufacturerId(value);
    setManufacturerName('');
  }, []);

  /**
   * Handles new manufacturer name input
   */
  const handleManufacturerNameChange = useCallback((value: string) => {
    setManufacturerName(value);
    setManufacturerId('');
  }, []);

  /**
   * Gets the selected manufacturer name for display
   */
  const selectedManufacturerName = manufacturers.find(m => m.id === manufacturerId)?.manufacturer;

  const isLoading = manufacturerMutation.isPending || modelMutation.isPending;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {step === 'manufacturer' ? (
            <>
              <Building2 className="h-5 w-5" />
              Select or Add Manufacturer
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Add New Model
            </>
          )}
        </DialogTitle>
        <DialogDescription>
          {step === 'manufacturer' 
            ? 'Choose an existing manufacturer or create a new one'
            : `Add a new model for ${selectedManufacturerName}`
          }
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Manufacturer Step */}
        {step === 'manufacturer' && (
          <>
            {/* Loading State */}
            {isLoadingManufacturers && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading manufacturers...</span>
              </div>
            )}

            {/* Error State */}
            {manufacturersError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load manufacturers. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Manufacturer Selection */}
            {!isLoadingManufacturers && !manufacturersError && (
              <>
                <div className="space-y-3">
                  <Label htmlFor="manufacturer-select">Select Existing Manufacturer</Label>
                  <Select
                    value={manufacturerId}
                    onValueChange={handleManufacturerChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="manufacturer-select">
                      <SelectValue placeholder="Choose a manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.length === 0 ? (
                        <SelectItem value="" disabled>
                          No manufacturers available
                        </SelectItem>
                      ) : (
                        manufacturers.map((manufacturer) => (
                          <SelectItem key={manufacturer.id} value={manufacturer.id}>
                            {manufacturer.manufacturer}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="new-manufacturer">Add New Manufacturer</Label>
                  <Input
                    id="new-manufacturer"
                    placeholder="Enter manufacturer name"
                    value={manufacturerName}
                    onChange={(e) => handleManufacturerNameChange(e.target.value)}
                    disabled={isLoading}
                    maxLength={100}
                  />
                  {manufacturerName && (
                    <p className="text-xs text-muted-foreground">
                      This will create a new manufacturer: "{manufacturerName}"
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleManufacturerSubmit}
                disabled={isLoading || (!manufacturerId && !manufacturerName.trim())}
                className="flex-1"
              >
                {manufacturerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </>
        )}

        {/* Model Step */}
        {step === 'model' && (
          <>
            {/* Selected Manufacturer Info */}
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                Adding model for: <strong>{selectedManufacturerName}</strong>
              </AlertDescription>
            </Alert>

            {/* Model Input */}
            <div className="space-y-3">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                placeholder="Enter model name (e.g., Model S, i3, Leaf)"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isLoading}
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleBackToManufacturer}
                disabled={isLoading}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleModelSubmit}
                disabled={isLoading || !modelName.trim()}
                className="flex-1"
              >
                {modelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Model...
                  </>
                ) : (
                  'Add Model'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );
};

export default AddModelDialog;