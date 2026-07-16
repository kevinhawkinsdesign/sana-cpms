'use client';

import { useState } from 'react';
import { useAuth } from "@/lib/auth/authContext";
import { useUserDashboardVehicles } from "@/lib/api/hooks/useUserDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Car, 
  Plus, 
  Grid3X3,
  List,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import VehicleCard from "@/components/vehicle/VehicleCard";
import { UserVehicle, addVehicleToUser } from "@/lib/api/vehicles";
import { useQueryClient } from '@tanstack/react-query';

interface VehicleFormData {
  licensePlate: string;
  model: string;
  make: string;
  vin: string;
  imageUrl: string;
  batteryCapacity: number;
}

export default function CustomerVehiclesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: vehiclesData, isLoading: loadingVehicles, error: hookError } = useUserDashboardVehicles();
  
  console.log('CustomerVehiclesPage - User:', user);
  console.log('CustomerVehiclesPage - Vehicles data:', vehiclesData);
  console.log('CustomerVehiclesPage - Loading:', loadingVehicles);
  console.log('CustomerVehiclesPage - Error:', hookError);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<VehicleFormData>({
    licensePlate: '',
    model: '',
    make: '',
    vin: '',
    imageUrl: '',
    batteryCapacity: 0
  });

  // Ensure vehiclesData is always an array
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : [];

  // Use all vehicles without filtering
  const filteredVehicles = vehicles;

  const validateLicensePlate = (plate: string): boolean => {
    const licensePlateRegex = /^[A-Z]{3}\d{3}[A-Z]$/;
    return licensePlateRegex.test(plate);
  };

  const validateVIN = (vin: string): boolean => {
    return vin.length === 0 || vin.length === 17;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);

    // Validate form
    if (!formData.licensePlate.trim()) {
      setFormError('License plate is required');
      setIsSubmitting(false);
      return;
    }

    if (!validateLicensePlate(formData.licensePlate)) {
      setFormError('License plate must be in format: ABC123D');
      setIsSubmitting(false);
      return;
    }

    if (formData.vin && !validateVIN(formData.vin)) {
      setFormError('VIN must be exactly 17 characters');
      setIsSubmitting(false);
      return;
    }

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      setFormError('Please enter a valid image URL');
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare data for API (only send non-empty fields)
      const apiData: any = {
        licensePlate: formData.licensePlate.trim()
      };

      if (formData.model.trim()) apiData.model = formData.model.trim();
      if (formData.make.trim()) apiData.make = formData.make.trim();
      if (formData.vin.trim()) apiData.vin = formData.vin.trim();
      if (formData.imageUrl.trim()) apiData.imageUrl = formData.imageUrl.trim();
      if (formData.batteryCapacity > 0) apiData.batteryCapacity = formData.batteryCapacity;

      console.log('Submitting vehicle data:', apiData);
      const response = await addVehicleToUser(apiData);
      console.log('Vehicle added successfully:', response);
      
      setSuccess('Vehicle added successfully!');
      
      // Reset form
      setFormData({
        licensePlate: '',
        model: '',
        make: '',
        vin: '',
        imageUrl: '',
        batteryCapacity: 0
      });
      
      setIsAddDialogOpen(false);
      
      // Invalidate and refetch vehicles
      queryClient.invalidateQueries({ queryKey: ['userDashboardVehicles'] });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      setFormError(error.message || 'Failed to add vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVehicleDeleted = () => {
    // Invalidate and refetch vehicles
    queryClient.invalidateQueries({ queryKey: ['userDashboardVehicles'] });
  };

  const getStatusCounts = () => {
    const counts = {
      all: vehicles.length,
      AVAILABLE: 0,
      CHARGING: 0
    };

    vehicles.forEach((vehicle: UserVehicle) => {
      if (vehicle.chargingStatus === 'AVAILABLE' || vehicle.chargingStatus === 'CHARGING') {
      counts[vehicle.chargingStatus as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (hookError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your registered vehicles and their charging preferences.
          </p>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Vehicles</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your vehicles. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your registered vehicles and their charging preferences.
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
        </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Add New Vehicle
              </DialogTitle>
              <DialogDescription>
                Add a new vehicle to your account. License plate is required.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddVehicle} className="space-y-4">
              {/* License Plate - Required */}
              <div className="space-y-2">
                <Label htmlFor="licensePlate" className="flex items-center gap-2">
                  License Plate <span className="text-destructive">*</span>
                  <span className="text-sm text-muted-foreground font-normal">(Format: ABC123D)</span>
                </Label>
                <Input
                  id="licensePlate"
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    licensePlate: e.target.value.toUpperCase() 
                  }))}
                  placeholder="ABC123D"
                  className="font-mono"
                  required
                  maxLength={7}
                />
                {formData.licensePlate && !validateLicensePlate(formData.licensePlate) && (
                  <p className="text-sm text-destructive">License plate must be in format: ABC123D</p>
                )}
              </div>

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
                    placeholder="Model S"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* VIN and Battery Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vin" className="flex items-center gap-2">
                    VIN <span className="text-sm text-muted-foreground font-normal">(17 characters)</span>
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
                    <p className="text-sm text-destructive">VIN must be exactly 17 characters</p>
                  )}
                </div>
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
                    placeholder="75"
                    min="0"
                    step="0.1"
                  />
                </div>
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
                  <p className="text-sm text-destructive">Please enter a valid URL</p>
                )}
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setFormData({
                      licensePlate: '',
                      model: '',
                      make: '',
                      vin: '',
                      imageUrl: '',
                      batteryCapacity: 0
                    });
                    setFormError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.licensePlate.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Vehicle...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold">{statusCounts.all}</p>
              </div>
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{statusCounts.AVAILABLE}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Charging</p>
                <p className="text-2xl font-bold">{statusCounts.CHARGING}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
            </div>

            {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
                onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
                onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
          </Button>
            </div>
          </div>

      {/* Loading State */}
      {loadingVehicles ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your vehicles...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">
              {filteredVehicles.length} of {vehicles.length} vehicles
            </p>
          </div>

          {/* Vehicles Grid/List */}
          {filteredVehicles.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {vehicles.length === 0 ? 'No vehicles yet' : 'No vehicles found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {vehicles.length === 0 
                      ? 'Get started by adding your first vehicle to your account.'
                      : 'Try adjusting your search or filter criteria.'
                    }
                  </p>
                  {vehicles.length === 0 && (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Vehicle
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredVehicles.map((vehicle: UserVehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  variant={viewMode === 'list' ? 'compact' : 'default'}
                  onDelete={handleVehicleDeleted}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}