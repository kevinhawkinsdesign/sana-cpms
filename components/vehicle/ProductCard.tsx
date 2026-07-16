'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Battery,
  ArrowRightCircle,
  Users,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { IShopVehicle } from "@/types/shop";
import { motion, AnimatePresence } from "framer-motion";
import { useCountry } from "@/lib/providers/country-provider";
import { useClarity } from "@/lib/hooks/useClarity";
import { openTestDriveForm, openPriceRequestForm } from "@/lib/utils/airtable";

const VoyageCard: React.FC<{ vehicle: IShopVehicle }> = ({ vehicle }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { countryCode } = useCountry();
  const { trackEvent } = useClarity();

  // Create array of color images, filtering out colors without imageUrl
  const colorImages = vehicle.availableColors
    .filter(color => color.imageUrl && color.imageUrl.trim() !== '' && color.isActive)
    .map(color => color.imageUrl);
  
  // Use orderImage if available, otherwise fall back to mainImage
  const displayImage = vehicle.orderImage || vehicle.mainImage;
  const detailsUrl = `/${countryCode}/shop/${vehicle.shopId}`;
  const testDriveUrl = `/${countryCode}/testdrive?car=${encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model}`)}`;

  // Determine which images to cycle through - always start with the display image
  const cycleImages = colorImages.length > 0 ? [displayImage, ...colorImages] : [displayImage];
  const totalImages = cycleImages.length;

  const changeImage = (newIndex: number) => {
    setCurrentImageIndex(newIndex);
    
    // Track image navigation
    trackEvent('vehicle_image_changed', {
      vehicle_id: vehicle.id,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      image_index: newIndex,
      total_images: totalImages,
      image_type: colorImages.length > 0 ? 'color' : 'main'
    });
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    changeImage(currentImageIndex === totalImages - 1 ? 0 : currentImageIndex + 1);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    changeImage(currentImageIndex === 0 ? totalImages - 1 : currentImageIndex - 1);
  };

  const handleVehicleClick = () => {
    // Track vehicle card click
    trackEvent('vehicle_card_clicked', {
      vehicle_id: vehicle.id,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_price: vehicle.price,
      vehicle_classification: vehicle.classification,
      vehicle_range: vehicle.range,
      country: countryCode,
      action: 'view_details'
    });
  };

  const handleTestDriveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track test drive button click
    trackEvent('vehicle_test_drive_button_clicked', {
      vehicle_id: vehicle.id,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_price: vehicle.price,
      vehicle_classification: vehicle.classification,
      country: countryCode,
      action: 'start_test_drive'
    });
    
    // Open Airtable form with prepopulated vehicle name and additional info
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const additionalInfo = {
      'Vehicle Make': vehicle.make,
      'Vehicle Model': vehicle.model,
      'Vehicle Year': vehicle.year.toString(),
      'Vehicle Price': `${vehicle.price.toLocaleString()} ${vehicle.currency || (vehicle.country === 'KE' ? 'KES' : 'RWF')}`,
      'Vehicle Range': `${vehicle.range} km`,
      'Vehicle Classification': vehicle.classification || 'Unknown',
      'Vehicle ID': vehicle.id
    };
    openTestDriveForm(vehicleName, vehicle.country, additionalInfo);
  };

  // const handlePriceRequestClick = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   
  //   // Track price request button click
  //   trackEvent('vehicle_price_request_button_clicked', {
  //     vehicle_id: vehicle.id,
  //     vehicle_make: vehicle.make,
  //     vehicle_model: vehicle.model,
  //     vehicle_year: vehicle.year,
  //     vehicle_classification: vehicle.classification,
  //     country: countryCode,
  //     action: 'request_price'
  //   });
  //   
  //   // Open Airtable form with prepopulated vehicle name and additional info
  //   const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  //   const additionalInfo = {
  //     'Vehicle Make': vehicle.make,
  //     'Vehicle Model': vehicle.model,
  //     'Vehicle Year': vehicle.year.toString(),
  //     'Vehicle Range': `${vehicle.range} km`,
  //     'Vehicle Classification': vehicle.classification || 'Unknown',
  //     'Vehicle ID': vehicle.id
  //   };
  //   openPriceRequestForm(vehicleName, vehicle.country, additionalInfo);
  // };
  
  const colorMap: { [key: string]: string } = {
    green: "bg-green-500", blue: "bg-blue-500", orange: "bg-orange-500",
    white: "bg-white", black: "bg-black", yellow: "bg-yellow-500",
    gray: "bg-gray-500", grey: "bg-gray-500", pink: "bg-pink-500",
    vanilla: "bg-yellow-200",
  };

  const getColorDisplay = (color: any, index: number) => {
    // Handle new API format: color object with color, imageUrl, and isActive
    const colorValue = color.color.toLowerCase();
    return (
      <div key={`${color.color}-${index}`} className="w-5 h-5 rounded-full border-2 border-white/50 shadow-sm overflow-hidden" title={color.color}>
        {color.imageUrl ? (
          <img 
            src={color.imageUrl} 
            alt={color.color}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${colorMap[colorValue] || "bg-gray-500"}`} />
        )}
      </div>
    );
  };

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/50 shadow-md"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative z-10 p-2">
          <motion.div
            className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100/70"
          >
            <AnimatePresence mode="wait">
              <motion.div key={currentImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                <Image src={cycleImages[currentImageIndex]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-contain" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-slate-800"><Sparkles className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs font-medium">{vehicle.classification}</span></div>
            {totalImages > 1 && <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full z-10 border border-white/10">{currentImageIndex + 1}/{totalImages}</div>}
            <Link href={detailsUrl} className="absolute inset-0 z-10" aria-label={`View details for ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClick={handleVehicleClick}>
              <AnimatePresence>
                {isHovered && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center"><motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full p-3"><ArrowRightCircle className="w-7 h-7 text-white" /></motion.div></motion.div>}
              </AnimatePresence>
            </Link>
            {totalImages > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/60 backdrop-blur-md hover:bg-white/80 text-slate-700 p-1.5 rounded-full border border-white/30 transition-all duration-200 z-20 shadow-sm opacity-0 group-hover:opacity-100" aria-label="Previous image">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/60 backdrop-blur-md hover:bg-white/80 text-slate-700 p-1.5 rounded-full border border-white/30 transition-all duration-200 z-20 shadow-sm opacity-0 group-hover:opacity-100" aria-label="Next image">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>

          <div className="p-2 pt-4">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
            <p className="text-sm text-slate-600 mb-3">{vehicle.trim || ""}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-white/30"><Battery className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-slate-700">{vehicle.range} km range</span></div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-white/30"><Users className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-slate-700">{vehicle.seats} seats</span></div>
            </div>
            <div className="flex items-end justify-end mb-4">
              <div className="flex items-center gap-1.5">{Array.isArray(vehicle.availableColors) && vehicle.availableColors.slice(0, 3).map((color, index) => getColorDisplay(color, index))}{Array.isArray(vehicle.availableColors) && vehicle.availableColors.length > 3 && <div className="w-5 h-5 rounded-full bg-slate-200/80 border-2 border-white/50 flex items-center justify-center" title={`${vehicle.availableColors.length - 3} more colors`}><span className="text-xs text-slate-600 font-bold">+{vehicle.availableColors.length - 3}</span></div>}</div>
            </div>
            <div className="flex space-x-2">
              <Link href={detailsUrl} className="flex-1">
                <div className="cursor-pointer w-full bg-white/60 backdrop-blur-sm text-slate-800 border border-white/40 py-2.5 px-3 rounded-xl font-semibold text-sm hover:bg-white/80 transition-all duration-200 flex items-center justify-center shadow-sm">
                  <Eye className="mr-2 w-4 h-4" />Details
                </div>
              </Link>
              <div className="flex-1">
                <div className="cursor-pointer w-full bg-[#4561DE] text-white py-2.5 px-3 rounded-xl font-semibold text-sm hover:bg-[#3046a6] transition-all duration-200 flex items-center justify-center shadow-sm" onClick={handleTestDriveClick}>
                  <ShoppingCart className="mr-2 w-4 h-4" />Test Drive
                </div>
              </div>
            </div>
            {/* <div className="mt-2">
              <div className="cursor-pointer w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center shadow-sm" onClick={handlePriceRequestClick}>
                <Sparkles className="mr-2 w-4 h-4" />Request Price
              </div>
            </div> */}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VoyageCard;