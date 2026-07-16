"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Car, Settings, Map, Users, Battery, Zap, ArrowRight, Play, Info,
  Ruler, ShoppingCart
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCountry } from '@/lib/providers/country-provider';
import api from '@/lib/api/api';
import { openTestDriveForm, openPriceRequestForm } from '@/lib/utils/airtable';

interface VehicleSpecProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

const VehicleSpec: React.FC<VehicleSpecProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3 py-2">
    <div className="p-1.5 bg-primary/10 rounded-md">
      <Icon className="w-3 h-3 text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

interface ColorSelectorProps {
  colors: Array<{ name: string; imageUrl: string }>;
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ colors, selectedColor, onColorChange }) => {
  // Helper function to get color value from color name
  const getColorValue = (colorName: string) => {
    const colorMap: { [key: string]: string } = {
      'red': '#ef4444',
      'white': '#ffffff',
      'black': '#000000',
      'gray': '#6b7280',
      'grey': '#6b7280',
      'blue': '#3b82f6',
      'green': '#10b981',
      'yellow': '#f59e0b',
      'silver': '#94a3b8',
      'orange': '#f97316',
      'pink': '#ec4899',
      'vanilla': '#fef3c7'
    };
    return colorMap[colorName.toLowerCase()] || '#6b7280';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Choose Your Color</h3>
        <p className="text-muted-foreground">Select a color to see how your vehicle looks</p>
      </div>
      <div className="flex gap-3">
        {colors.map((color) => (
          <motion.button
            key={color.color}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onColorChange(color.color)}
            className={`relative cursor-pointer transition-all duration-150 ${
              selectedColor === color.color 
                ? 'ring-4 ring-primary ring-offset-2 shadow-lg' 
                : 'hover:shadow-md'
            }`}
            title={color.color}
          >
            <motion.div 
              className="w-12 h-12 rounded-full border-2 border-automotive-border shadow-md"
              style={{ backgroundColor: getColorValue(color.color) }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.1 }}
            />
            {selectedColor === color.color && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg"
              >
                <motion.div 
                  className="w-1.5 h-1.5 bg-primary-foreground rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.1 }}
                />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

  const fetchVehicleInfo = async (shopId: string) => {
    const response = await api().get(`/api/client/shop-vehicles/${shopId}`);
    if (response.data.status === 'success') {
      return response.data.data.vehicles[0]; // Get first vehicle from the shop
    } else {
      throw new Error(response.data.message || 'Failed to fetch vehicle');
    }
  };

const VehicleShowcase: React.FC = () => {
  const params = useParams();
  const shopId = params?.shopId as string;
  const { countryCode } = useCountry();
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: vehicleData, isLoading, error } = useQuery({
    queryKey: ["vehicle", shopId],
    queryFn: () => fetchVehicleInfo(shopId),
    enabled: !!shopId,
  });

  useEffect(() => {
    if (vehicleData && vehicleData.availableColors && vehicleData.availableColors.length > 0) {
      setSelectedColor(vehicleData.availableColors[0].color);
    }
  }, [vehicleData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !vehicleData) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Failed to load vehicle data</p>
      </div>
    );
  }

  const selectedColorData = vehicleData.availableColors.find(
    (color: any) => color.color === selectedColor
  );
  const displayImage = selectedColorData?.imageUrl || vehicleData.mainImage;

  return (
    <div className="min-h-screen bg-gradient-hero">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 px-4 py-2">
              {vehicleData.classification}
            </Badge>
            <h1 className="text-2xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
              {vehicleData.year} {vehicleData.make} {vehicleData.model}
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {vehicleData.model}
              </span>
            </h1>
            
          </motion.div>

          {/* Main Vehicle Display */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Vehicle Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-automotive-surface shadow-luxury mb-6">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedColor}
                    src={displayImage}
                    alt={`${vehicleData.year} ${vehicleData.make} ${vehicleData.model} in ${selectedColor}`}
                    className="w-full h-full object-contain"
                    initial={{ opacity: 0, y: -200 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 200 }}
                    transition={{ 
                      duration: 0.15, 
                      ease: "easeOut"
                    }}
                  />
                </AnimatePresence>
                {/* Floating Info Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="absolute top-6 left-6"
                >
                
                </motion.div>
              
              </div>
            </motion.div>

            {/* Vehicle Details */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-8"
            >
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button variant="default" size="lg" className="w-full text-base py-3 bg-black hover:bg-gray-800 text-white" onClick={() => {
                  const vehicleName = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
                  const additionalInfo = {
                    'Vehicle Make': vehicleData.make,
                    'Vehicle Model': vehicleData.model,
                    'Vehicle Year': vehicleData.year.toString(),
                    'Vehicle Range': `${vehicleData.range} km`,
                    'Vehicle Classification': vehicleData.classification || 'Unknown'
                  };
                  openTestDriveForm(vehicleName, vehicleData.country, additionalInfo);
                }}>
                  Test Drive
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                {/* <Button variant="outline" size="lg" className="w-full text-base py-3 border-2" onClick={() => {
                  const vehicleName = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
                  const additionalInfo = {
                    'Vehicle Make': vehicleData.make,
                    'Vehicle Model': vehicleData.model,
                    'Vehicle Year': vehicleData.year.toString(),
                    'Vehicle Range': `${vehicleData.range} km`,
                    'Vehicle Classification': vehicleData.classification || 'Unknown'
                  };
                  openPriceRequestForm(vehicleName, vehicleData.country, additionalInfo);
                }}>
                  Request Price
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button> */}
              </div>
             
              <div className="mb-8">
                <ColorSelector
                  colors={vehicleData.availableColors}
                  selectedColor={selectedColor}
                  onColorChange={setSelectedColor}
                />
              </div>

              <div className="mb-6 max-w-2xl mx-auto">
                <p className="text-base text-muted-foreground text-center">
                  {vehicleData.details}
                </p>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Technical Specifications</h3>
                <p className="text-base text-muted-foreground">Engineered for performance, designed for the future</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <VehicleSpec icon={Calendar} label="Year" value={vehicleData.year} />
                  <VehicleSpec icon={Car} label="Make" value={vehicleData.make} />
                  <VehicleSpec icon={Settings} label="Model" value={vehicleData.model} />
                  <VehicleSpec icon={Map} label="Range" value={`${vehicleData.range} KM`} />
                  <VehicleSpec icon={Users} label="Seats" value={vehicleData.seats} />
                  <VehicleSpec icon={Battery} label="Battery" value={`${vehicleData.batteryCapacity} kWh`} />
                  <VehicleSpec icon={Car} label="Doors" value={vehicleData.doors} />
                  <VehicleSpec icon={Ruler} label="Storage" value={vehicleData.storageCapacity} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Additional Images Gallery */}
      {vehicleData.additionalImages && vehicleData.additionalImages.length > 0 && (
        <section className="py-10 bg-automotive-surface mt-8">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-lg font-bold text-foreground mb-2 ">
                Gallery
              </h2>
              <p className="text-base text-muted-foreground">
                Explore every angle of perfection
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {vehicleData.additionalImages.map((image: string, index: number) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="aspect-[4/3] rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-luxury cursor-pointer"
                >
                  <img
                    src={image}
                    alt={`${vehicleData.make} ${vehicleData.model} - View ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default VehicleShowcase;