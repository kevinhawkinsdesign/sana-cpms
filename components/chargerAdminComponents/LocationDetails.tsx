'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { Control, FieldValues } from 'react-hook-form';

// Environment variable with fallback
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Type definitions
interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationDetailsProps {
  form: {
    control: Control<FieldValues>;
    setValue: (name: string, value: any) => void;
    watch: (name: string) => any;
  };
  isLoading?: boolean;
  error?: Error | null;
}

interface MapPickerProps {
  defaultLocation?: Coordinates;
  onLocationSelect: (lat: number, lng: number) => void;
  isLoading?: boolean;
}

// Default location (Kigali, Rwanda)
const DEFAULT_LOCATION: Coordinates = { lat: -1.9441, lng: 30.0619 };

// Google Maps options
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  disableDefaultUI: false,
};

/**
 * MapPicker component for interactive location selection
 */
const MapPicker: React.FC<MapPickerProps> = ({
  defaultLocation = DEFAULT_LOCATION,
  onLocationSelect,
  isLoading = false
}) => {
  const [location, setLocation] = useState<Coordinates>(defaultLocation);

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && !isLoading) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const newLocation = { lat, lng };
      setLocation(newLocation);
      onLocationSelect(lat, lng);
    }
  }, [onLocationSelect, isLoading]);

  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: '400px',
  }), []);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Updating location...</span>
          </div>
        </div>
      )}
      <GoogleMap
        center={location}
        zoom={15}
        onClick={handleMapClick}
        options={MAP_OPTIONS}
        mapContainerStyle={mapContainerStyle}
        mapContainerClassName="w-full h-[400px] rounded-lg border"
      >
        <Marker 
          position={location}
          title="Selected location"
        />
      </GoogleMap>
    </div>
  );
};

/**
 * LocationDetails component for charger location configuration
 * Handles address input, coordinates, and interactive map selection
 */
export const LocationDetails: React.FC<LocationDetailsProps> = ({ 
  form, 
  isLoading = false,
  error = null 
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  /**
   * Handles reverse geocoding to get address from coordinates
   */
  const handleLocationSelect = useCallback(async (lat: number, lng: number) => {
    if (!GOOGLE_MAPS_API_KEY) {
      toast.error("Google Maps API key is not configured");
      return;
    }

    setIsGeocoding(true);
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
        form.setValue('address', data.results[0].formatted_address);
        
        // Generate Google Maps link
        const googleMapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        form.setValue('googleMaplink', googleMapLink);
        
        toast.success("Location updated successfully");
      } else {
        throw new Error(data.error_message || 'Unable to get address for this location');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      toast.error("Failed to get address for the selected location");
    } finally {
      setIsGeocoding(false);
    }
  }, [form]);

  /**
   * Gets user's current location using browser geolocation API
   */
  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location services");
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSelect(
          position.coords.latitude,
          position.coords.longitude
        );
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Failed to get your current location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        toast.error(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [handleLocationSelect]);

  // Loading state
  if (isLoading) {
    return <LocationDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Location Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load location details. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Google Maps load error
  if (loadError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load Google Maps. Please check your internet connection and API key configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div 
          className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"
          aria-hidden="true"
        >
          <MapPin className="w-4 h-4 text-green-600" />
        </div>
        <CardTitle>Location Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map Toggle and Interactive Map */}
        <div className="space-y-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => setIsMapOpen(!isMapOpen)}
            className="w-full"
            disabled={!isLoaded}
          >
            <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
            {isMapOpen ? 'Hide Map' : 'Pick Location on Map'}
          </Button>

          {isMapOpen && (
            <div className="space-y-4">
              {!isLoaded ? (
                <Skeleton className="w-full h-[400px] rounded-lg" />
              ) : (
                <>
                  <MapPicker
                    onLocationSelect={handleLocationSelect}
                    defaultLocation={{
                      lat: form.watch('latitude') || DEFAULT_LOCATION.lat,
                      lng: form.watch('longitude') || DEFAULT_LOCATION.lng,
                    }}
                    isLoading={isGeocoding}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCurrentLocation}
                    disabled={isGettingLocation || isGeocoding}
                    className="w-full sm:w-auto"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Latitude */}
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="latitude">Latitude</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., -1.9441"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                    aria-describedby="latitude-error"
                  />
                </FormControl>
                <FormMessage id="latitude-error" />
              </FormItem>
            )}
          />

          {/* Longitude */}
          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="longitude">Longitude</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 30.0619"
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                    aria-describedby="longitude-error"
                  />
                </FormControl>
                <FormMessage id="longitude-error" />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="address">Address</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    id="address"
                    placeholder="Enter full address"
                    aria-describedby="address-error"
                  />
                </FormControl>
                <FormMessage id="address-error" />
              </FormItem>
            )}
          />

          {/* Google Map Link */}
          <FormField
            control={form.control}
            name="googleMaplink"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="google-map-link">Google Map Link</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    id="google-map-link"
                    type="url"
                    placeholder="https://www.google.com/maps?q=..."
                    aria-describedby="google-map-link-error"
                  />
                </FormControl>
                <FormMessage id="google-map-link-error" />
              </FormItem>
            )}
          />

          {/* Charger Code */}
          <FormField
            control={form.control}
            name="chargerCode"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel htmlFor="charger-code">
                  Charger Unique Code
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Groups related guns under same charger for unified display
                  </span>
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    id="charger-code"
                    placeholder="Enter unique charger identifier"
                    aria-describedby="charger-code-error"
                  />
                </FormControl>
                <FormMessage id="charger-code-error" />
              </FormItem>
            )}
          />

          {/* Public Location Toggle */}
          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="md:col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel htmlFor="is-public">Public Location</FormLabel>
                  <FormDescription>
                    Make this charging station visible to the public
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id="is-public"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="is-public-description"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton component for LocationDetails
 */
const LocationDetailsSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="md:col-span-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="md:col-span-2 h-16 rounded-lg border p-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default LocationDetails;