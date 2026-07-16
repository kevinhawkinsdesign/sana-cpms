'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Car, 
  Plus, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2
} from "lucide-react";
import { createBusinessVehicle } from '@/lib/api/vehicles';

interface BusinessVehicleFormData {
  model: string;
  make: string;
  vin: string;
  imageUrl: string;
  batteryCapacity: number;
}

interface BusinessVehicleFormProps {
  businessId: string;
  onSuccess?: (vehicle: any) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

const BusinessVehicleForm: React.FC<BusinessVehicleFormProps> = ({ 
  businessId,
  onSuccess, 
  onCancel, 
  isOpen = false 
}) => {
  const [formData, setFormData] = useState<BusinessVehicleFormData>({
    model: '',
    make: '',
    vin: '',
    imageUrl: '',
    batteryCapacity: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateVIN = (vin: string): boolean => {
    return vin.length === 0 || vin.length === 17;
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (formData.vin && !validateVIN(formData.vin)) {
      errors.push('VIN must be exactly 17 characters');
    }

    if (formData.batteryCapacity < 0) {
      errors.push('Battery capacity cannot be negative');
    }

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      errors.push('Please enter a valid image URL');
    }

    return { isValid: errors.length === 0, errors };
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      setIsLoading(false);
      return;
    }

    try {
      // Prepare data for API (only send non-empty fields)
      const apiData: any = {};

      if (formData.model.trim()) apiData.model = formData.model.trim();
      if (formData.make.trim()) apiData.make = formData.make.trim();
      if (formData.vin.trim()) apiData.vin = formData.vin.trim();
      if (formData.imageUrl.trim()) apiData.imageUrl = formData.imageUrl.trim();
      if (formData.batteryCapacity > 0) apiData.batteryCapacity = formData.batteryCapacity;

      const response = await createBusinessVehicle(businessId, apiData);
      
      setSuccess('Business vehicle added successfully!');
      
      // Reset form
      setFormData({
        model: '',
        make: '',
        vin: '',
        imageUrl: '',
        batteryCapacity: 0
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess(response.data.vehicle);
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        if (onCancel) onCancel();
      }, 3000);
      
    } catch (error: any) {
      console.error('Error creating business vehicle:', error);
      setError(error.message || 'Failed to create business vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      model: '',
      make: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: 0
    });
    setError(null);
    setSuccess(null);
    if (onCancel) onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Add Business Vehicle
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Make and Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                  placeholder="Tesla"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Model 3"
                  maxLength={100}
                />
              </div>
            </div>

            {/* VIN */}
            <div className="space-y-2">
              <Label htmlFor="vin" className="flex items-center gap-2">
                VIN <span className="text-sm text-gray-500 font-normal">(17 characters, optional)</span>
              </Label>
              <Input
                id="vin"
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  vin: e.target.value.toUpperCase() 
                }))}
                placeholder="12345678901234567"
                className="font-mono"
                maxLength={17}
                minLength={17}
              />
              {formData.vin && !validateVIN(formData.vin) && (
                <p className="text-sm text-red-600">VIN must be exactly 17 characters</p>
              )}
            </div>

            {/* Battery Capacity */}
            <div className="space-y-2">
              <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
              <Input
                id="batteryCapacity"
                type="number"
                value={formData.batteryCapacity || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  batteryCapacity: Number(e.target.value) || 0 
                }))}
                placeholder="60"
                min="0"
                step="0.1"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Vehicle Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://example.com/vehicle-image.jpg"
              />
              {formData.imageUrl && !isValidUrl(formData.imageUrl) && (
                <p className="text-sm text-red-600">Please enter a valid URL</p>
              )}
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Car className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Vehicle...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Business Vehicle
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessVehicleForm;
