import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Car, Calendar, BadgeCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { registerVehicle, removeVehicle } from '@/lib/api/vehicles';

interface VehicleType {
  id: string;
  kabisaId: string;
  ownerFirstName: string;
  ownerLastName: string;
  manufacturerName: string;
  modelName: string;
  year: number;
  color: string | null;
  licencePlateNumber: string;
  vin: string;
  vehicleImage: string;
  dateRegistered: string;
  companyName: string | null;
  chargingStatus: string;
  insuranceExpirationDate: string | null;
  warrantyExpirationDate: string | null;
}

interface VehiclesSectionProps {
  vehicles: VehicleType[];
}

export const VehiclesSection: React.FC<VehiclesSectionProps> = ({ vehicles: initialVehicles }) => {
  // Ensure initialVehicles is always an array
  const safeInitialVehicles = Array.isArray(initialVehicles) ? initialVehicles : [];
  const [vehicles, setVehicles] = useState(safeInitialVehicles);
  const [showDialog, setShowDialog] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Function to handle vehicle registration
  const handleRegisterVehicle = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await registerVehicle(licensePlate);
      if (!data.status) throw new Error(data.message || 'Failed to register vehicle');
      setVehicles([...vehicles, { ...data.data.vehicle, ...data.data }]);
      setShowDialog(false);
      setLicensePlate('');
    } catch (err: any) {
      setError('Vehicle registration is currently unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle vehicle removal
  const handleRemoveVehicle = async (vehicleKabisaId: string) => {
    setDeleteLoadingId(vehicleKabisaId);
    try {
      const data = await removeVehicle(vehicleKabisaId);
      if (!data.status) throw new Error(data.message || 'Failed to remove vehicle');
      setVehicles(vehicles.filter(v => v.kabisaId !== vehicleKabisaId));
    } catch (err: any) {
      alert('Vehicle removal is currently unavailable. Please try again later.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold"><BadgeCheck className="w-3 h-3" /> Available</span>;
      case 'CHARGING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">Charging</span>;
      case 'MAINTENANCE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">Maintenance</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">{status}</span>;
    }
  };

  if (!vehicles || vehicles.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Your Vehicles
          </CardTitle>
          <CardDescription>
            No vehicles registered yet
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
            <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have any registered vehicles.</p>
          <Button onClick={() => setShowDialog(true)}>Register a Vehicle</Button>
        </CardContent>
        {/* Dialog for registering vehicle */}
        {showDialog && (
          <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/60 dark:bg-gray-900/60">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4">Register a Vehicle</h2>
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Enter License Plate"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value)}
                disabled={loading}
              />
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>Cancel</Button>
                <Button onClick={handleRegisterVehicle} disabled={loading || !licensePlate}>
                  {loading ? 'Registering...' : 'Register'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.id} className="shadow-md overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                {vehicle.manufacturerName || ''} {vehicle.modelName || ''} {vehicle.year || ''}
              </span>
              {getStatusBadge(vehicle.chargingStatus)}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              License Plate: <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{vehicle.licencePlateNumber}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vehicle Image */}
              <div className="flex justify-center items-center">
                {vehicle.vehicleImage ? (
                  <img 
                    src={vehicle.vehicleImage} 
                    alt={`${vehicle.manufacturerName} ${vehicle.modelName}`}
                    className="rounded-lg shadow max-h-48 object-cover" 
                  />
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-36 w-full flex items-center justify-center">
                    <Car className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Vehicle Details */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kabisa ID</p>
                    <p className="font-medium">{vehicle.kabisaId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Owner</p>
                    <p className="font-medium">{vehicle.ownerFirstName} {vehicle.ownerLastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">VIN</p>
                    <p className="font-medium font-mono text-xs">{vehicle.vin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Color</p>
                    <p className="font-medium">{vehicle.color || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Registration Date</p>
                    <p className="font-medium">{formatDate(vehicle.dateRegistered)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Insurance Expiry</p>
                    <p className={`font-medium ${vehicle.insuranceExpirationDate && new Date(vehicle.insuranceExpirationDate) < new Date() ? 'text-red-500' : ''}`}>
                      {formatDate(vehicle.insuranceExpirationDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => handleRemoveVehicle(vehicle.kabisaId)} disabled={deleteLoadingId === vehicle.kabisaId}>
              {deleteLoadingId === vehicle.kabisaId ? 'Removing...' : 'Remove'}
            </Button>
            {/* <Button size="sm">
              Start Charging
            </Button> */}
          </CardFooter>
        </Card>
      ))}
      {/* Register Vehicle Button (when vehicles exist) */}
      <div className="flex justify-end mt-4">
        <Button onClick={() => setShowDialog(true)}>Register a Vehicle</Button>
      </div>
      {/* Dialog for registering vehicle */}
      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Register a Vehicle</h2>
            <input
              className="w-full border rounded px-3 py-2 mb-2"
              placeholder="Enter License Plate"
              value={licensePlate}
              onChange={e => setLicensePlate(e.target.value)}
              disabled={loading}
            />
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleRegisterVehicle} disabled={loading || !licensePlate}>
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};