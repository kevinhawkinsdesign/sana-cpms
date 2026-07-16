'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

interface FleetHeaderProps {
  businessName?: string;
  onAddVehicle: () => void;
  onBack: () => void;
}

export default function FleetHeader({ 
  businessName, 
  onAddVehicle, 
  onBack 
}: FleetHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business vehicles and track fleet performance
          </p>
          {businessName && (
            <p className="text-sm text-muted-foreground mt-1">
              Managing: {businessName}
            </p>
          )}
        </div>
      </div>
      
      <Button 
        onClick={onAddVehicle}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Vehicle
      </Button>
    </div>
  );
}
