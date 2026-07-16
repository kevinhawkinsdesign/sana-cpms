'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import { BusinessVehicle, getBusinessVehicles, deleteBusinessVehicle, createBusinessVehicle } from "@/lib/api/vehicles";
import { getUserBusinesses } from "@/lib/api/business";
import { useAuth } from "@/lib/auth/authContext";

// Import the new components
import FleetHeader from "@/components/fleet/FleetHeader";
import AddVehicleForm from "@/components/fleet/AddVehicleForm";
import FleetStats from "@/components/fleet/FleetStats";
import FleetFilters from "@/components/fleet/FleetFilters";
import FleetVehiclesList from "@/components/fleet/FleetVehiclesList";
import BusinessSelector from "@/components/fleet/BusinessSelector";
import NoBusinessState from "@/components/fleet/NoBusinessState";
import LoadingState from "@/components/fleet/LoadingState";

// Types
interface FleetVehicle extends BusinessVehicle {
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

interface BusinessVehicleFormData {
  model: string;
  make: string;
  vin: string;
  imageUrl: string;
  batteryCapacity: number;
}

export default function FleetManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);

  // Get user's businesses
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      if (!user) return;
      
      setIsLoadingBusinesses(true);
      try {
        const businesses = await getUserBusinesses();
        setUserBusinesses(businesses);
        
        // Set the first business as default if available
        if (businesses.length > 0) {
          setBusinessId(businesses[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching user businesses:', err);
        setError('Failed to load your businesses. Please try again.');
      } finally {
        setIsLoadingBusinesses(false);
      }
    };

    fetchUserBusinesses();
  }, [user]);

  // Fetch business vehicles
  useEffect(() => {
    const fetchBusinessVehicles = async () => {
      if (!businessId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const vehicles = await getBusinessVehicles(businessId);
        setFleetVehicles(vehicles as FleetVehicle[]);
      } catch (err: any) {
        console.error('Error fetching business vehicles:', err);
        setError(err.message || 'Failed to load fleet vehicles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessVehicles();
  }, [businessId]);

  const handleAddVehicle = async (formData: BusinessVehicleFormData) => {
    if (!businessId) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for API (only send non-empty fields)
      const apiData: any = {};

      if (formData.model.trim()) apiData.model = formData.model.trim();
      if (formData.make.trim()) apiData.make = formData.make.trim();
      if (formData.vin.trim()) apiData.vin = formData.vin.trim();
      if (formData.imageUrl.trim()) apiData.imageUrl = formData.imageUrl.trim();
      if (formData.batteryCapacity > 0) apiData.batteryCapacity = formData.batteryCapacity;

      const response = await createBusinessVehicle(businessId, apiData);
      
      // Add the new vehicle to the list
      setFleetVehicles(prev => [...prev, response.data.vehicle as FleetVehicle]);
      
      setSuccess('Vehicle added successfully!');
      setShowAddForm(false);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error creating business vehicle:', error);
      setError(error.message || 'Failed to create business vehicle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!businessId) return;
    
    try {
      await deleteBusinessVehicle(businessId, vehicleId);
      setFleetVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle. Please try again.');
    }
  };

  // Filter vehicles based on search and status
  const filteredVehicles = fleetVehicles.filter((vehicle) => {
    const matchesSearch = searchTerm === '' || 
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicleLicensePlates?.some(plate => 
        plate.licencePlateNumber.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      vehicle.kabisaId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || vehicle.chargingStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const fleetStats = {
    totalVehicles: fleetVehicles.length,
    availableVehicles: fleetVehicles.filter(v => v.chargingStatus === 'AVAILABLE').length,
    totalSessions: fleetVehicles.reduce((sum, v) => sum + (v.totalSessions || 0), 0),
    totalSpent: fleetVehicles.reduce((sum, v) => sum + (v.totalSpent || 0), 0),
    totalKwh: fleetVehicles.reduce((sum, v) => sum + (v.totalKwh || 0), 0)
  };

  // Show loading state while fetching businesses
  if (isLoadingBusinesses) {
    return <LoadingState onBack={() => router.back()} />;
  }

  // Show error if no businesses found
  if (userBusinesses.length === 0) {
    return (
      <NoBusinessState 
        onBack={() => router.back()} 
        onCreateBusiness={() => router.push('/dashboard/customer/business/create')} 
      />
    );
  }

  // Show business selection if multiple businesses
  if (userBusinesses.length > 1 && !businessId) {
    return (
      <BusinessSelector 
        businesses={userBusinesses}
        onSelectBusiness={setBusinessId}
        onBack={() => router.back()}
      />
    );
  }

  const selectedBusiness = userBusinesses.find(b => b.id === businessId);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <FleetHeader
        businessName={selectedBusiness?.name}
        onAddVehicle={() => setShowAddForm(true)}
        onBack={() => router.back()}
      />

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 font-medium">{error}</span>
        </div>
      )}

      {/* Add Vehicle Form */}
      <AddVehicleForm
        onSubmit={handleAddVehicle}
        isSubmitting={isSubmitting}
        isOpen={showAddForm}
        onOpenChange={setShowAddForm}
      />

      {/* Fleet Stats */}
      <FleetStats
        totalVehicles={fleetStats.totalVehicles}
        availableVehicles={fleetStats.availableVehicles}
        totalSessions={fleetStats.totalSessions}
        totalSpent={fleetStats.totalSpent}
        totalKwh={fleetStats.totalKwh}
      />

      {/* Search and Filters */}
      {/* <FleetFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      /> */}

      {/* Fleet Vehicles List */}
      <FleetVehiclesList
        vehicles={fleetVehicles}
        filteredVehicles={filteredVehicles}
        isLoading={isLoading}
        error={error}
        viewMode={viewMode}
        onDeleteVehicle={handleDeleteVehicle}
        onAddVehicle={() => setShowAddForm(true)}
      />
    </div>
  );
}
