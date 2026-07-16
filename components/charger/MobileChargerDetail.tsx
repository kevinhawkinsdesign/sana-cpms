'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Battery,
  Share2,
  Navigation,
  Clock,
  MapPin,
  Zap,
  CreditCard,
  Phone,
  AlertCircle,
  Wifi
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@radix-ui/react-dropdown-menu';

interface Gun {
  id: string;
  kabisaId: string;
  name?: string;
  chargingStatus: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE';
  currentSessionId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MobileChargerDetailProps {
  charger: {
    id: string;
    kabisaId?: string;
    meterId?: string;
    gunNumber?: string;
    latitude?: number;
    longitude?: number;
    googleMapLink?: string;
    name?: string;
    ownerName?: string;
    operationalStatus?: 'OPERATIONAL' | 'UNDER_REPAIR' | 'CLOSED' | 'CANCELLED' | 'BEING_INSTALLED' | 'PLANNED_FOR_FUTURE_DATE' | string;
    address?: string;
    internet?: string;
    type?: string;
    cableAttached?: string;
    connector?: string;
    manufacturerName?: string;
    modelName?: string;
    power?: number;
    country?: string;
    momoCode?: string;
    imageUrl?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    guns?: Gun[];
    navigationDuration?: number | null;
    distance?: number;
    // Additional fields from API
    availableGuns?: number;
    totalGuns?: number;
  };
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
}

const MobileChargerDetail: React.FC<MobileChargerDetailProps> = ({
  charger,
  isExpanded,
  onClose,
  onToggleExpand
}) => {
  const power = charger.power;
  const [copied, setCopied] = useState(false);

  const formatDuration = (seconds: number | undefined | null) => {
    if (seconds === undefined || seconds === null) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} hr ${minutes} min`;
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "operational": return "bg-green-100 dark:bg-green-100 text-green-800 dark:text-green-800 border-green-200 dark:border-green-200";
      case "under_repair": return "bg-yellow-100 dark:bg-yellow-100 text-yellow-800 dark:text-yellow-800 border-yellow-200 dark:border-yellow-200";
      case "closed": return "bg-red-100 dark:bg-red-100 text-red-800 dark:text-red-800 border-red-200 dark:border-red-200";
      case "cancelled": return "bg-red-100 dark:bg-red-100 text-red-800 dark:text-red-800 border-red-200 dark:border-red-200";
      case "being_installed": return "bg-blue-100 dark:bg-blue-100 text-blue-800 dark:text-blue-800 border-blue-200 dark:border-blue-200";
      case "planned_for_future_date": return "bg-gray-100 dark:bg-gray-100 text-gray-800 dark:text-gray-800 border-gray-200 dark:border-gray-200";
      default: return "bg-gray-100 dark:bg-gray-100 text-gray-800 dark:text-gray-800 border-gray-200 dark:border-gray-200";
    }
  };

  const getStatusIndicator = (status: string) => (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-2 ${
        status?.toLowerCase() === "operational" ? "bg-green-500"
        : status?.toLowerCase() === "under_repair" ? "bg-yellow-500"
        : status?.toLowerCase() === "closed" ? "bg-red-500"
        : status?.toLowerCase() === "cancelled" ? "bg-red-500"
        : status?.toLowerCase() === "being_installed" ? "bg-blue-500"
        : status?.toLowerCase() === "planned_for_future_date" ? "bg-gray-500"
        : "bg-gray-500"
      }`}
    />
  );

  const handleShare = async () => {
    const shareUrl = charger.googleMapLink || (charger.latitude && charger.longitude ? `https://www.google.com/maps?q=${charger.latitude},${charger.longitude}` : '#');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${charger.name} - EV Charger Location`,
          text: `Check out this EV charging station at ${charger.name}`,
          url: shareUrl,
        });
      } catch (err) { console.error("Error sharing:", err); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNavigate = () => {
    const navigateUrl = charger.googleMapLink || (charger.latitude && charger.longitude ? `https://www.google.com/maps?daddr=${charger.latitude},${charger.longitude}` : '#');
    window.open(navigateUrl, "_blank");
  };

  const collapsedHeight = 'calc(100% - 420px)';
  const expandedHeight = '5vh';

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: isExpanded ? expandedHeight : collapsedHeight }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 40, stiffness: 400 }}
      className="fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-50 z-50 rounded-t-2xl shadow-2xl flex flex-col"
      style={{
        maxHeight: '95vh',
      }}
    >
      <motion.div
        className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-50/80 backdrop-blur-sm pb-2 rounded-t-2xl flex-shrink-0"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(e, { offset, velocity }) => {
          // Swipe down to close
          if (offset.y > 100 || (offset.y > 50 && velocity.y > 500)) {
            onClose();
          }
          // Swipe up to expand if collapsed
          else if (!isExpanded && (offset.y < -50 || velocity.y < -500)) {
            onToggleExpand();
          }
        }}
        style={{ touchAction: 'none' }}
      >
        <div
          className="w-full text-center py-3 cursor-grab active:cursor-grabbing"
          onClick={onToggleExpand}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto"></div>
        </div>
        
        <div className="flex justify-between items-center px-4 pb-3">
          <Badge className={`${getStatusBadgeColor(charger.operationalStatus)} px-2 py-1`}>
            {charger.operationalStatus}
          </Badge>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-200 text-gray-900 dark:text-gray-900">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-4 pb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-900">{charger.name || 'Unknown Charger'}</h2>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-600 mt-1">
            <MapPin size={14} className="mr-1.5" />
            <span className="truncate">{charger.address || "Location unavailable"}</span>
          </div>
        </div>
        
        {charger.navigationDuration != null && (
          <div className="flex items-center justify-between bg-blue-50/70 dark:bg-blue-50/70 mx-4 px-4 py-2 mt-1 rounded-lg">
            <div className="flex items-center">
              <Clock className="text-blue-600 dark:text-blue-600 mr-2" size={18} />
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-600">Travel Time</span>
                <p className="font-medium text-blue-700 dark:text-blue-700">{formatDuration(charger.navigationDuration)}</p>
              </div>
            </div>
            {(charger.distance !== undefined && charger.distance !== null) && (
              <div className="text-right">
                <span className="text-xs text-gray-600 dark:text-gray-600">Distance</span>
                <p className="font-medium text-blue-700 dark:text-blue-700">
                  {charger.distance < 1 ? `${Math.round(charger.distance * 1000)}m` : `${charger.distance?.toFixed(1)}km`}
                </p>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          <button onClick={handleNavigate} className="flex items-center justify-center space-x-2 p-3 rounded-md bg-blue-600 text-white shadow-sm">
            <Navigation size={18} />
            <span className="font-medium">Navigate</span>
          </button>
          <button onClick={handleShare} className="flex items-center justify-center space-x-2 p-3 rounded-md bg-gray-200 dark:bg-gray-200 text-gray-700 dark:text-gray-700 shadow-sm">
            <Share2 size={18} />
            <span className="font-medium">{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>
        
        <div className="border-b dark:border-gray-200 mx-4 mt-4"></div>
      </motion.div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
        <div className="px-4 pb-20 space-y-4 pt-4">

        {/* Charger Status Card */}
        <div className="bg-white dark:bg-white p-4 rounded-md shadow-sm border dark:border-gray-200">
          <h4 className="text-xs text-gray-500 dark:text-gray-500 mb-2">Operational Status</h4>
          <div className="flex items-center">
            {getStatusIndicator(charger.operationalStatus)}
            <span className={`text-base font-medium ${charger.operationalStatus?.toLowerCase() === "operational" ? "text-green-500 dark:text-green-500" : "text-gray-500 dark:text-gray-500"}`}>
              {charger.operationalStatus || "Unknown"}
            </span>
          </div>
        </div>

        {/* --- MODIFIED SECTION: CHARGING DETAILS --- */}
        {/* The entire card will only render if at least one of its details exists. */}
        {(power != null || charger.guns.length > 0) && (
            <Card className="border-0 shadow-md bg-white dark:bg-white">
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-50 border-b dark:border-gray-200 rounded-t-md flex items-center">
                    <Battery className="text-blue-600 dark:text-blue-600 mr-2" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Charging Details</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Each item is now rendered conditionally */}
                        {power != null && (
                            <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                <Zap className="text-blue-500 dark:text-blue-500" size={18} />
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">Power</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-900">{power} kW</div>
                                </div>
                            </div>
                        )}
                        {charger.guns.length > 0 && (
                            <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                <AlertCircle className="text-blue-500 dark:text-blue-500" size={18} />
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">Charging Guns</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-900">
                                        {charger.guns.filter(gun => gun.chargingStatus === 'AVAILABLE' && gun.isActive).length} Available, 
                                        {charger.guns.filter(gun => gun.chargingStatus === 'IN_USE' && gun.isActive).length} In Use
                                        {charger.guns.filter(gun => gun.chargingStatus === 'UNDER_MAINTENANCE' && gun.isActive).length > 0 && 
                                            `, ${charger.guns.filter(gun => gun.chargingStatus === 'UNDER_MAINTENANCE' && gun.isActive).length} Under Maintenance`
                                        }
                                        {charger.guns.filter(gun => !gun.isActive).length > 0 && 
                                            `, ${charger.guns.filter(gun => !gun.isActive).length} Inactive`
                                        }
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        )}
        {/* --- END MODIFIED SECTION --- */}



        <Card className="border-0 shadow-md bg-white dark:bg-white">
          <div className="px-4 py-3 bg-purple-50 dark:bg-purple-50 border-b dark:border-gray-200 rounded-t-md flex items-center">
            <MapPin className="text-purple-600 dark:text-purple-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Location Details</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-100 rounded-full flex-shrink-0"><MapPin className="text-purple-600 dark:text-purple-600" size={18} /></div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-500">Address</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{charger.address || "Location unavailable"}</div>
              </div>
            </div>
            <Separator className="my-2 dark:bg-gray-200" />
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-100 rounded-full flex-shrink-0"><Navigation className="text-purple-600 dark:text-purple-600" size={18} /></div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-500">Coordinates</div>
                <div className="font-medium text-gray-900 dark:text-gray-900">{charger.latitude?.toFixed(6) || 'N/A'}, {charger.longitude?.toFixed(6) || 'N/A'}</div>
              </div>
            </div>
            {charger.googleMapLink && (
              <a href={charger.googleMapLink} target="_blank" rel="noopener noreferrer" className="block text-center py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md shadow-md">
                Open in Google Maps
              </a>
            )}
          </div>
        </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileChargerDetail;