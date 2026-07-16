import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Edit, 
  Trash2, 
  Zap, 
  Calendar,
  Battery,
  Image as ImageIcon
} from "lucide-react";
import { UserVehicle, BusinessVehicle } from "@/lib/api/vehicles";

interface VehicleCardProps {
  vehicle: UserVehicle | BusinessVehicle;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  variant?: 'default' | 'compact';
}

const VehicleCard: React.FC<VehicleCardProps> = ({ 
  vehicle, 
  onEdit, 
  onDelete, 
  showActions = true,
  variant = 'default'
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>;
      case 'CHARGING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Charging</Badge>;
      case 'OFFLINE':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const primaryLicensePlate = vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber || 'No Plate';

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">
                  {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-xs text-gray-500">{primaryLicensePlate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(vehicle.chargingStatus)}
              {showActions && (onEdit || onDelete) && (
                <div className="flex gap-1">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="sm" onClick={onDelete}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            {vehicle.make} {vehicle.model}
          </CardTitle>
          {getStatusBadge(vehicle.chargingStatus)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vehicle Image or Placeholder */}
        <div className="relative">
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center ${vehicle.imageUrl ? 'hidden' : ''}`}>
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No image available</p>
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-600">Kabisa ID:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {vehicle.kabisaId}
              </span>
            </div>
            
            {primaryLicensePlate !== 'No Plate' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-600">License Plate:</span>
                <span className="font-semibold">{primaryLicensePlate}</span>
              </div>
            )}
            
            {vehicle.vin && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-600">VIN:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {vehicle.vin}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {vehicle.batteryCapacity && (
              <div className="flex items-center gap-2 text-sm">
                <Battery className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-600">Battery:</span>
                <span>{vehicle.batteryCapacity} kWh</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-600">Added:</span>
              <span>{formatDate(vehicle.createdAt)}</span>
            </div>
            
            {vehicle.isKabisaOwner && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-gray-600">Kabisa Owned</span>
                <Badge variant="outline" className="text-xs">Yes</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Multiple License Plates */}
        {vehicle.vehicleLicensePlates && vehicle.vehicleLicensePlates.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-600 mb-2">All License Plates:</p>
            <div className="flex flex-wrap gap-2">
              {vehicle.vehicleLicensePlates.map((plate, index) => (
                <Badge key={plate.id} variant="outline" className="text-xs">
                  {plate.licencePlateNumber}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex gap-2 pt-4 border-t">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEdit}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleCard;
