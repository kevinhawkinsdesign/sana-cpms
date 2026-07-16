'use client';

import React, { useState, useEffect } from "react";
import { Map, Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { osmRasterStyle } from '@/lib/utils/osmMapStyle';
import {
    Battery,
    X,
    ChevronRight,
    ChevronLeft,
    ExternalLink,
    WifiHigh,
} from "lucide-react";
import { useFetchChargers } from "@/lib/hooks/useFetchChargers";
import Loading from "@/components/shared/AnotherLoading";
import { useMobileNav } from '@/lib/providers/mobile-nav-provider';
import { LocalizedLink } from "../shared/LocalizedLink";
import { useClarity } from '@/lib/hooks/useClarity';

const VALID_KABISA_IDS = [
  "NT308DRK", "DHXS3BZX", "0Z7V3NSC", "AJV03AE0", "BFP89X5Y",
  "LAFW90L6", "KWBY6MEE", "N0RN54ZA", "0K0M0UWT", "NLZ37KVP",
  "NE0V8BUG", "RK6050TS", "BMCK905G", "0G4K7989", "YKK232GP",
  "N0AE7YMH", "DR2BXBN2", "WTZ916EY", "SYP52PR0", "60U26HV0",
  "30DM704C", "00N90EGN","TSEH78R0"
];
const acChargerIcon = "/Charger AC Yellow.svg";
const dcChargerIcon = "/Charger DC Orange.svg";
const competitorAcIcon = "/Competitor AC.svg";
const competitorDcIcon = "/Competitor DC.svg";

const getChargerIcon = (charger: any): { url: string; size: string } => {
  const isKabisaCharger = VALID_KABISA_IDS.includes(charger["Kabisa ID"]);
  
  // Handle both "Type" and "type" fields, and also check "connector" field
  const chargerType = (charger.Type || charger.type || charger.connector || '').toUpperCase();
  
  // More robust DC detection: matches 'DC', 'DC-', 'DC Fast', 'DCFC', 'DC Charger', 'CCS2', 'GBT', etc.
  const isDC = chargerType.includes('DC') || 
                chargerType.includes('CCS') || 
                chargerType.includes('GBT') ||
                chargerType.includes('CHAdeMO') ||
                chargerType.includes('FAST');
  
  let iconPath = '';
  if (isKabisaCharger) {
    iconPath = isDC ? dcChargerIcon : acChargerIcon;
  } else {
    iconPath = isDC ? competitorDcIcon : competitorAcIcon;
  }
  
  return {
    url: iconPath,
    size: '24px'
  };
};

const ChargermapMinimal: React.FC<{ useDark?: boolean }> = ({ useDark = true }) => {
  const { trackEvent } = useClarity();
  const [viewport, setViewport] = useState({
    latitude: 0.5,
    longitude: 32.5,
    zoom: 5.5,
  });

  const { chargers, isLoading, error } = useFetchChargers();
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobileNavOpen } = useMobileNav();

  // Track homepage map interactions
  const handleChargerClick = (charger: any) => {
    trackEvent('homepage_charger_clicked', {
      charger_id: charger['Kabisa ID'] || 'unknown',
      charger_name: charger.Name || 'unknown',
      charger_type: charger.Type || charger.type || charger.connector || 'unknown',
      is_kabisa_charger: VALID_KABISA_IDS.includes(charger['Kabisa ID']),
      location: `${charger.Latitude},${charger.Longitude}`,
      map_zoom: viewport.zoom
    });
  };

  const handleMapViewportChange = (newViewport: any) => {
    setViewport(newViewport);
    
    // Track map navigation on homepage
    trackEvent('homepage_map_viewport_changed', {
      latitude: newViewport.latitude,
      longitude: newViewport.longitude,
      zoom: newViewport.zoom
    });
  };

  // Track homepage map load
  useEffect(() => {
    if (chargers && chargers.length > 0) {
      trackEvent('homepage_map_loaded', {
        total_chargers: chargers.length,
        kabisa_chargers: chargers.filter(c => VALID_KABISA_IDS.includes(c['Kabisa ID'])).length,
        competitor_chargers: chargers.filter(c => !VALID_KABISA_IDS.includes(c['Kabisa ID'])).length
      });
    }
  }, [chargers, trackEvent]);

    const processedChargers = chargers
        .filter(charger => charger.Latitude != null && charger.Longitude != null)
        .map(charger => ({
            ...charger,
            "Power (kW)": charger["Power (kW)"] || 0,
            Type: charger.Type || "Unknown",
            Address: charger.Address || "N/A",
            image: charger.image || null,
        }));

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "available":
                return "bg-green-500";
            case "in use":
                return "bg-yellow-500";
            case "offline":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    const getOperationalIcon = (status: string) => {
        return status?.toLowerCase() === "operational" ? (
            <WifiHigh className="text-green-500" size={16} aria-hidden="true" />
        ) : (
            <WifiHigh className="text-red-500" size={16} aria-hidden="true" />
        );
    };

    if (isLoading) return <Loading text="Loading chargers..." />;
    if (error) return <div className="p-4 text-red-500">Error loading chargers: {error}</div>;

    return (
        <div className="flex flex-col absolute inset-0">
            <div className="relative flex-1 min-h-0">
                {/* Map Container */}
                <div className="absolute inset-0">
                    <Map
                        initialViewState={viewport}
                        onMove={evt => handleMapViewportChange(evt.viewState)}
                        style={{ width: '100%', height: '100%' }}
                        mapStyle={osmRasterStyle}
                    >
                        <NavigationControl position="top-right" />
                        
                        {processedChargers.map((charger) => {
                            const { url, size } = getChargerIcon(charger);
                            return (
                                <Marker
                                    key={charger["Kabisa ID"]}
                                    longitude={charger.Longitude}
                                    latitude={charger.Latitude}
                                    anchor="center"
                                >
                                    <button
                                        onClick={() => {
                                            setSelectedCharger(charger);
                                            handleChargerClick(charger);
                                        }}
                                        aria-label={`Select charger at ${charger.Name}`}
                                        style={{
                                            backgroundImage: `url('${url}')`,
                                            backgroundSize: 'contain',
                                            backgroundPosition: 'center',
                                            backgroundRepeat: 'no-repeat',
                                            width: size,
                                            height: size,
                                            border: 'none',
                                            padding: 0,
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                </Marker>
                            );
                        })}
                    </Map>

                    {/* Sidebar Toggle Button */}
                    {!isSidebarOpen && !isMobileNavOpen && (
                        <div className="absolute top-1/2 transform -translate-y-1/2 z-40">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className=" p-2  shadow-md hover:bg-gray-100 transition-colors"
                                aria-label={isSidebarOpen ? "Close stations list" : "Open stations list"}
                            >
                                {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                            </button>
                        </div>
                    )}

                    {/* Left Sidebar */}
                    <div
                        className={`absolute left-0 top-0 h-full bg-white shadow-lg z-30
                            transition-transform duration-300 ease-in-out w-[300px]
                            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                    >
                        <div className="p-3 bg-gray-50 border-b">
                            <h2 className="text-lg font-bold text-gray-800">Charging Stations</h2>
                            <p className="text-sm text-gray-600">
                                {processedChargers.length} stations available
                            </p>
                        </div>

                        <div className="overflow-y-auto h-[calc(100%-56px)]">
                            {processedChargers.map((charger) => (
                                <div
                                    key={charger["Kabisa ID"]}
                                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                                        selectedCharger?.["Kabisa ID"] === charger["Kabisa ID"]
                                            ? "bg-blue-50"
                                            : ""
                                    }`}
                                    onClick={() => {
                                        setSelectedCharger(charger);
                                        setViewport(prev => ({
                                            ...prev,
                                            latitude: charger.Latitude,
                                            longitude: charger.Longitude,
                                            zoom: 12
                                        }));
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">
                                                {charger.Name || "N/A"}
                                            </h3>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${getStatusColor(
                                                        charger["Charging Status"]
                                                    )}`}
                                                />
                                                <span className="text-xs text-gray-600">
                                                    {charger["Charging Status"] || "Unknown"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1" aria-hidden="true">
                                            {getOperationalIcon(charger["Operational Status"])}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-600">
                                        <div className="flex items-center space-x-1">
                                            <Battery size={14} aria-hidden="true" />
                                            <span>{charger.Connector || "Unknown"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Small Info Panel on Top-Right */}
                    {selectedCharger && (
                        <div
                            className={`absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-40 w-72`}
                        >
                            <button
                                onClick={() => setSelectedCharger(null)}
                                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                                aria-label="Close charger information"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-lg font-bold mb-1">{selectedCharger.Name}</h2>
                            <p className="text-sm text-gray-600">{selectedCharger.Address}</p>
                            <LocalizedLink
                                href="/charge"
                                className="inline-flex items-center mt-2 text-emerald-500 hover:text-emerald-700 font-semibold text-sm"
                                aria-label={`View ${selectedCharger.Name} on map`}
                            >
                                View on Map <ExternalLink size={16} className="ml-1" aria-hidden="true" />
                            </LocalizedLink>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChargermapMinimal;