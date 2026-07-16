'use client';

import React, { useState } from "react";
import Image from "next/image";
import {
    Battery,
    Share2,
    Navigation,
    Clock,
    MapPin,
    Zap,
    CreditCard,
    Phone,
    AlertCircle,
    Wifi,
    ArrowLeft
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Separator } from "@radix-ui/react-dropdown-menu";

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

interface ChargerDetailProps {
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
    isOpen: boolean;
    onClose: () => void;
}

const ChargerDetailPanel: React.FC<ChargerDetailProps> = ({
    charger,
    isOpen,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    // This hook is no longer needed with this design, but kept for structure
    // useEffect(() => { if (isOpen) {} }, [isOpen]);

    if (!isOpen) return null;
    
    // Normalize commonly reused values
    const power = charger.power;
    const guns = charger.guns ?? [];
    const showGunAvailabilitySummary = (
        typeof charger.availableGuns === "number" &&
        typeof charger.totalGuns === "number"
    );
    const availableActiveGuns = guns.filter(gun => gun.isActive && gun.chargingStatus === 'AVAILABLE').length;
    const inUseActiveGuns = guns.filter(gun => gun.isActive && gun.chargingStatus === 'IN_USE').length;
    const maintenanceGuns = guns.filter(gun => gun.isActive && gun.chargingStatus === 'UNDER_MAINTENANCE').length;
    const inactiveGuns = guns.filter(gun => !gun.isActive).length;

    const chargeLocation = charger.latitude && charger.longitude 
        ? `https://www.google.com/maps?daddr=${charger.latitude},${charger.longitude}`
        : '#';

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
            className={`inline-block w-2 h-2 rounded-full mr-2 ${status?.toLowerCase() === "operational" ? "bg-green-500"
                : status?.toLowerCase() === "under_repair" ? "bg-yellow-500"
                : status?.toLowerCase() === "closed" ? "bg-red-500"
                : status?.toLowerCase() === "cancelled" ? "bg-red-500"
                : status?.toLowerCase() === "being_installed" ? "bg-blue-500"
                : status?.toLowerCase() === "planned_for_future_date" ? "bg-gray-500"
                : "bg-gray-500"
            }`}
        />
    );

    const formatDuration = (seconds: number | undefined | null) => {
        if (seconds == null) return "Unknown";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours} hr ${minutes} min`;
        if (minutes < 1) return "< 1 min";
        return `${minutes} min`;
    };

    const handleShare = async () => {
        const shareUrl = charger.googleMapLink || chargeLocation;
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
        window.open(charger.googleMapLink || chargeLocation, "_blank");
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
    };

    // Flags to determine if sections should be rendered at all
    const hasChargingDetails = Boolean(
        charger.connector ||
        charger.internet ||
        power != null ||
        guns.length > 0 ||
        showGunAvailabilitySummary
    );
    const hasPaymentDetails = charger.momoCode != null;

    return (
        <div className="w-full h-full bg-gray-50 dark:bg-gray-50">
            {/* Header */}
            <div className="relative w-full h-48 md:h-56 bg-blue-500 overflow-hidden">
                {charger.imageUrl ? (
                    <Image src={charger.imageUrl || '/images/charger-placeholder.jpg'} alt={charger.name || 'Charger'} layout="fill" objectFit="cover" className="absolute inset-0" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-400" />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10">
                    <motion.button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" whileTap={{ scale: 0.9 }}>
                        <ArrowLeft className="text-white" size={20} />
                    </motion.button>
                    {charger.operationalStatus && (
                        <Badge className={`${getStatusBadgeColor(charger.operationalStatus)} px-2 py-1 shadow-md`}>
                            {charger.operationalStatus}
                        </Badge>
                    )}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="absolute bottom-0 left-0 w-full p-6 text-white">
                    <h2 className="text-xl md:text-2xl font-bold mb-1">{charger.name || 'Unknown Charger'}</h2>
                    <div className="flex items-center text-sm opacity-80">
                        <MapPin className="mr-2" size={16} />
                        <span className="truncate">{charger.address || "Location unavailable"}</span>
                    </div>
                </motion.div>
            </div>

            {/* Content */}
            <motion.div className="p-4 md:p-6 space-y-3 overflow-y-auto h-[calc(100vh-184px)] md:h-[calc(100vh-200px)] pb-24" variants={containerVariants} initial="hidden" animate="visible">
                
                {/* Travel Time Card - Renders only if duration exists */}
                {charger.navigationDuration != null && (
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-md bg-blue-50 dark:bg-blue-50">
                            <div className="p-4 flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-100 rounded-full flex-shrink-0">
                                    <Clock className="text-blue-600 dark:text-blue-600" size={18} />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-500">Travel Time</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-900">
                                        {formatDuration(charger.navigationDuration)}
                                    </div>
                                </div>
                                {charger.distance != null && (
                                    <div className="ml-auto text-right">
                                        <div className="text-sm text-gray-500 dark:text-gray-500">Distance</div>
                                        <div className="font-medium text-gray-900 dark:text-gray-900">
                                            {charger.distance < 1 ? `${Math.round(charger.distance * 1000)}m` : `${charger.distance.toFixed(1)}km`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Quick Actions */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 md:gap-4">
                    <button onClick={handleNavigate} className="flex items-center justify-center space-x-2 p-3 rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors">
                        <Navigation size={18} />
                        <span className="font-medium text-sm md:text-base">Navigate</span>
                    </button>
                    <button onClick={handleShare} className="flex items-center justify-center space-x-2 p-3 rounded-md bg-gray-100 dark:bg-gray-100 text-gray-700 dark:text-gray-700 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-200 transition-colors">
                        <Share2 size={18} />
                        <span className="font-medium text-sm md:text-base">{copied ? "Copied!" : "Share"}</span>
                    </button>
                </motion.div>

                {/* Charging Information Card - Renders only if it has details */}
                {hasChargingDetails && (
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-md bg-white dark:bg-white">
                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-50 border-b dark:border-gray-200 rounded-t-md flex items-center">
                                <Battery className="text-blue-600 dark:text-blue-600 mr-2" size={20} />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Charging Details</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {charger.connector && (
                                        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                            <Battery className="text-blue-500 dark:text-blue-500" size={18} />
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">Connector Type</div>
                                                <div className="font-medium text-gray-900 dark:text-gray-900">{charger.connector}</div>
                                            </div>
                                        </div>
                                    )}
                                    {power != null && (
                                        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                            <Zap className="text-blue-500 dark:text-blue-500" size={18} />
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">Power Output</div>
                                                <div className="font-medium text-gray-900 dark:text-gray-900">{power} kW</div>
                                            </div>
                                        </div>
                                    )}
                                    {charger.internet && (
                                        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                            <Wifi className="text-blue-500 dark:text-blue-500" size={18} />
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">Internet</div>
                                                <div className="font-medium text-gray-900 dark:text-gray-900">{charger.internet}</div>
                                            </div>
                                        </div>
                                    )}
                                    {(showGunAvailabilitySummary || guns.length > 0) && (
                                        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-50 p-3 rounded-md border dark:border-gray-200">
                                            <AlertCircle className="text-blue-500 dark:text-blue-500" size={18} />
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">Gun Availability</div>
                                                <div className="font-medium text-gray-900 dark:text-gray-900">
                                                    {showGunAvailabilitySummary ? (
                                                        `${charger.availableGuns} of ${charger.totalGuns} available`
                                                    ) : guns.length > 0 ? (
                                                        <>
                                                            {availableActiveGuns} Available, {inUseActiveGuns} In Use
                                                            {maintenanceGuns > 0 && `, ${maintenanceGuns} Under Maintenance`}
                                                            {inactiveGuns > 0 && `, ${inactiveGuns} Inactive`}
                                                        </>
                                                    ) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Payment Information Card - Renders only if it has details */}
                {hasPaymentDetails && (
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-md bg-white dark:bg-white">
                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-50 border-b dark:border-gray-200 rounded-t-md flex items-center">
                                <CreditCard className="text-blue-600 dark:text-blue-600 mr-2" size={20} />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Payment Details</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {charger.momoCode && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-50 rounded-md border dark:border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-100 rounded-full">
                                                <Phone className="text-blue-600 dark:text-blue-600" size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500 dark:text-gray-500">MoMo Payment Code</div>
                                                <div className="font-medium text-gray-900 dark:text-gray-900">
                                                    {charger.momoCode}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Location Information */}
                <motion.div variants={itemVariants}>
                    <Card className="border-0 shadow-md mb-6 bg-white dark:bg-white">
                        <div className="px-4 py-3 bg-purple-50 dark:bg-purple-50 border-b dark:border-gray-200 rounded-t-md flex items-center">
                            <MapPin className="text-purple-600 dark:text-purple-600 mr-2" size={20} />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900">Location Details</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-100 rounded-full flex-shrink-0">
                                    <MapPin className="text-purple-600 dark:text-purple-600" size={18} />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-500">Address</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-900">{charger.address || "Location unavailable"}</div>
                                </div>
                            </div>
                            <Separator className="my-2 dark:bg-gray-200" />
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-100 rounded-full flex-shrink-0">
                                    <Navigation className="text-purple-600 dark:text-purple-600" size={18} />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-500">Coordinates</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-900">
                                        {charger.latitude?.toFixed(6) || 'N/A'}, {charger.longitude?.toFixed(6) || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            {charger.googleMapLink && (
                                <motion.a href={charger.googleMapLink} target="_blank" rel="noopener noreferrer" className="block text-center py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md shadow-md hover:shadow-lg transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    Open in Google Maps
                                </motion.a>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ChargerDetailPanel;
