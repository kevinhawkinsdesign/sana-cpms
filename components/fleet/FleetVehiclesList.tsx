'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Plus, Loader2, AlertCircle } from "lucide-react";
import VehicleCard from "@/components/vehicle/VehicleCard";

interface FleetVehicle {
  id: string;
  kabisaId: string;
  model?: string;
  make?: string;
  vin?: string;
  imageUrl?: string;
  batteryCapacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isKabisaOwner: boolean;
  chargingStatus: 'AVAILABLE' | 'CHARGING' | 'OFFLINE';
  vehicleLicensePlates: Array<{
    id: string;
    licencePlateNumber: string;
    isActive: boolean;
  }>;
  vehicleInsurances: Array<any>;
  assignedDriver?: {
    id: string;
    name: string;
    email: string;
  };
  totalSessions?: number;
  totalKwh?: number;
  totalSpent?: number;
  lastCharged?: string;
  location?: string;
}

interface FleetVehiclesListProps {
  vehicles: FleetVehicle[];
  filteredVehicles: FleetVehicle[];
  isLoading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';
  onDeleteVehicle: (vehicleId: string) => void;
  onAddVehicle: () => void;
}

export default function FleetVehiclesList({
  vehicles,
  filteredVehicles,
  isLoading,
  error,
  viewMode,
  onDeleteVehicle,
  onAddVehicle
}: FleetVehiclesListProps) {
  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading fleet vehicles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Fleet</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          {filteredVehicles.length} of {vehicles.length} vehicles
        </p>
      </div>

      {/* Fleet Vehicles */}
      {filteredVehicles.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {vehicles.length === 0 ? 'No fleet vehicles yet' : 'No vehicles found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {vehicles.length === 0 
                  ? 'Get started by adding your first vehicle to the fleet.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {vehicles.length === 0 && (
                <Button 
                  onClick={onAddVehicle}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Fleet Vehicle
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
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              variant={viewMode === 'list' ? 'compact' : 'default'}
              onDelete={() => onDeleteVehicle(vehicle.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
