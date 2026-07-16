'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Car, Plus, Loader2, X } from "lucide-react";

interface BusinessVehicleFormData {
  model: string;
  make: string;
  vin: string;
  imageUrl: string;
  batteryCapacity: number;
}

interface AddVehicleFormProps {
  onSubmit: (data: BusinessVehicleFormData) => Promise<void>;
  isSubmitting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddVehicleForm({ 
  onSubmit, 
  isSubmitting, 
  isOpen, 
  onOpenChange 
}: AddVehicleFormProps) {
  const [formData, setFormData] = useState<BusinessVehicleFormData>({
    model: '',
    make: '',
    vin: '',
    imageUrl: '',
    batteryCapacity: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    
    // Reset form on successful submission
    setFormData({
      model: '',
      make: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: 0
    });
  };

  const handleCancel = () => {
    setFormData({
      model: '',
      make: '',
      vin: '',
      imageUrl: '',
      batteryCapacity: 0
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Car className="h-5 w-5 text-blue-600" />
            Add New Vehicle to Fleet
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="make" className="text-sm font-medium">Make</Label>
              <Input
                id="make"
                type="text"
                value={formData.make}
                onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                placeholder="Tesla"
                maxLength={100}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium">Model</Label>
              <Input
                id="model"
                type="text"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Model 3"
                maxLength={100}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vin" className="text-sm font-medium">
                VIN <span className="text-gray-500 font-normal">(17 characters, optional)</span>
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
                className="font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                maxLength={17}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batteryCapacity" className="text-sm font-medium">Battery Capacity (kWh)</Label>
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
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-sm font-medium">Vehicle Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://example.com/vehicle-image.jpg"
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="border-gray-300 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Vehicle...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle to Fleet
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
