'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  GeolocateControl,
  FullscreenControl,
  ScaleControl,
  Layer,
  Source,
  MapRef
} from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Battery,
  X,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Search
} from "lucide-react";
import { useFetchChargers, getChargerGunsStats, isKabisaCharger } from "@/lib/hooks/useFetchChargers";
import ChargerDetailPanel from "@/components/charger/ChargerDetailPanel";
import MobileChargerDetail from "@/components/charger/MobileChargerDetail";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useMobileNav } from '@/lib/providers/mobile-nav-provider';
import { useClarity } from '@/lib/hooks/useClarity';

// Constants
const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';


// Icon paths (verified from public folder)
const acChargerIcon = "/Charger AC Yellow.svg";
const dcChargerIcon = "/Charger DC Orange.svg";
const competitorAcIcon = "/Competitor AC.svg";
const competitorDcIcon = "/Competitor DC.svg";

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => {
  return `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;
};

const mapStyle = {
  width: '100%',
  height: '100%',
};

// Determine charger group for coloring (used by vector layers)
function getChargerGroup(charger: any): 'kabisa-ac' | 'kabisa-dc' | 'comp-ac' | 'comp-dc' {
  const isKabisa = isKabisaCharger(charger);
  const chargerType = (charger.type || charger.connector || '').toUpperCase();
  const isDC = chargerType.includes('DC') || chargerType.includes('CCS') || chargerType.includes('GBT') || chargerType.includes('CHADEMO') || chargerType.includes('FAST') || (charger.power && charger.power > 20);
  
  
  if (isKabisa && isDC) return 'kabisa-dc';
  if (isKabisa && !isDC) return 'kabisa-ac';
  if (!isKabisa && isDC) return 'comp-dc';
  return 'comp-ac';
}

function getIconForGroup(group: 'kabisa-ac' | 'kabisa-dc' | 'comp-ac' | 'comp-dc') {
  let result;
  switch (group) {
    case 'kabisa-dc':
      result = { url: dcChargerIcon, size: '24px' };
      break;
    case 'kabisa-ac':
      result = { url: acChargerIcon, size: '24px' };
      break;
    case 'comp-dc':
      result = { url: competitorDcIcon, size: '24px' };
      break;
    default:
      result = { url: competitorAcIcon, size: '24px' };
  }
  
  return result;
}

// Main component
interface ChargerMapProps {
  useDark?: boolean;
}

const Chargermap: React.FC<ChargerMapProps> = ({ useDark = true }) => {
  // Map state
  const mapRef = useRef<MapRef>(null);
  const { trackEvent } = useClarity();
  const [viewport, setViewport] = useState({
    latitude: 0.5, // Centered to show Kenya, Rwanda, Uganda
    longitude: 32.5,
    zoom: 5.5,
    bearing: 0,
    pitch: 0,
  });

  // Chargers data
  const { chargers: fetchedChargers, isLoading, error } = useFetchChargers();
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [lcpImageUrl, setLcpImageUrl] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileDetailExpanded, setMobileDetailExpanded] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Navigation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<any>(null);
  const [navigationDuration, setNavigationDuration] = useState<number | null>(null);
  const [routeBounds, setRouteBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const routeCalculationInProgress = useRef(false);

  // Mobile nav state
  const { isMobileNavOpen } = useMobileNav();

  // Sort chargers by distance
  const chargers = useMemo(() => {
    if (!userLocation || !fetchedChargers.length) return fetchedChargers;

    const deg2rad = (d: number) => d * Math.PI / 180;
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return [...fetchedChargers]
      .map(c => ({
        ...c,
        distance: c.latitude && c.longitude ? getDistance(userLocation[1], userLocation[0], c.latitude, c.longitude) : undefined
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [fetchedChargers, userLocation]);

  // GeoJSON for map source with clustering (much faster than many HTML Markers)
  const chargerGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: chargers
      .filter(c => c.latitude && c.longitude)
      .map((c: any, index: number) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.longitude!, c.latitude!] as [number, number] },
        properties: {
          idx: index,
          group: getChargerGroup(c)
        }
      }))
  }), [chargers]);

  // Fallback: use HTML markers when zoomed in or if clustering fails to render
  const useHtmlMarkers = viewport.zoom >= 14;

  // Get status color helper
  const getStatusColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'operational': return 'bg-green-500';
      case 'under_repair': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      case 'cancelled': return 'bg-red-500';
      case 'being_installed': return 'bg-blue-500';
      case 'planned_for_future_date': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Fit map to route bounds
  const fitMapToRouteBounds = useCallback((bounds: mapboxgl.LngLatBounds) => {
    if (!mapRef.current) return;

    const currentCenter = mapRef.current.getCenter();
    const dest = selectedCharger
      ? [selectedCharger.longitude, selectedCharger.latitude] as [number, number]
      : null;
    const isRight = dest ? dest[0] > currentCenter.lng : false;
    const rightPad = !isMobile && showDetailPanel
      ? isRight ? 500 : 450
      : isMobile ? 50 : 100;

    mapRef.current.fitBounds(bounds, {
      padding: {
        top: 100,
        bottom: isMobile ? 250 : 100,
        left: isMobile ? 50 : (isSidebarOpen ? 350 : 100),
        right: rightPad
      },
      maxZoom: 14,
      duration: 800
    });

    if (!isMobile && showDetailPanel && isRight) {
      setTimeout(() => {
        if (!mapRef.current || !dest) return;
        const point = mapRef.current.project(dest);
        const w = mapRef.current.getContainer().offsetWidth;
        if (point.x > w - 400) {
          const offsetX = (point.x - (w - 450)) / 2;
          mapRef.current.panBy([-Math.max(offsetX, 0), 0], { duration: 500 });
        }
      }, 1000);
    }
  }, [isMobile, showDetailPanel, selectedCharger, isSidebarOpen]);

  // Map load handler
  const onMapLoad = useCallback((e: any) => {
    mapRef.current = e.target;
    // No automatic fitBounds to userLocation here.
    // The initial viewport (RW+UG+KE) will be respected.
    // User can click "Locate Me" to go to their position.
  }, []);

  // Get navigation route
  const getNavigationRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    if (!mapRef.current || routeCalculationInProgress.current) return null;

    routeCalculationInProgress.current = true;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxAccessToken}`
      );
      const { routes } = await res.json();

      if (routes && routes.length) {
        const route = routes[0];
        if (!isMobile) setNavigationRoute(route.geometry);
        setNavigationDuration(route.duration);

        const b = new mapboxgl.LngLatBounds();
        [start, end].forEach(pt => b.extend(pt));
        route.geometry.coordinates.forEach((c: [number, number]) => b.extend(c));
        setRouteBounds(b);
        if (!isMobile) fitMapToRouteBounds(b);

        routeCalculationInProgress.current = false;
        return route;
      }
    } catch (e) {
      console.error("Error fetching route:", e);
      setNavigationRoute(null); // Clear previous route if error
      setNavigationDuration(null); // Clear duration
      setRouteBounds(null);
    } finally {
      routeCalculationInProgress.current = false;
    }

    // Fallback to flyTo if route calculation fails or no route found
    if (mapRef.current) {
      const pad = !isMobile && showDetailPanel ? 450 : 50;
      mapRef.current.flyTo({
        center: end,
        zoom: 15,
        padding: { right: pad, top: 0, bottom: 0, left: 0 },
        duration: 800
      });
    }
    return null;
  }, [fitMapToRouteBounds, isMobile, showDetailPanel]);

  // Handle charger selection
  const handleChargerSelect = useCallback((charger: any) => {
    setSelectedCharger(charger);

    if (isMobile) {
      setMobileDetailExpanded(true);
      mapRef.current?.flyTo({
        center: [charger.Longitude, charger.Latitude],
        zoom: 15,
        duration: 800
      });

      // Crucially, request route here if userLocation is available
      if (userLocation) {
        getNavigationRoute(userLocation, [charger.Longitude, charger.Latitude]);
      } else {
        // If user location isn't available yet, clear previous navigation info
        setNavigationRoute(null);
        setNavigationDuration(null);
        setRouteBounds(null);
      }
    } else {
      setShowDetailPanel(true);

      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }

      setTimeout(() => {
        if (userLocation) {
          getNavigationRoute(userLocation, [charger.Longitude, charger.Latitude]);
        } else if (mapRef.current) {
          mapRef.current.flyTo({
            center: [charger.Longitude, charger.Latitude],
            zoom: 14,
            padding: { right: showDetailPanel ? 450 : 100, top: 0, bottom: 0, left: 0 },
            duration: 800
          });
        }
      }, 50);
    }

    setLcpImageUrl(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `${charger.Longitude},${charger.Latitude},15,0,0/600x400?access_token=${mapboxAccessToken}`
    );
  }, [isMobile, userLocation, getNavigationRoute, showDetailPanel]);

  // Close detail panel
  const handleCloseDetail = () => {
    if (isMobile) {
      setMobileDetailExpanded(false);
      setTimeout(() => {
        setSelectedCharger(null);
        setNavigationRoute(null);
        setNavigationDuration(null);
        setRouteBounds(null);
      }, 300);
    } else {
      setShowDetailPanel(false);
      setSelectedCharger(null);
      setNavigationRoute(null);
      setNavigationDuration(null);
      setRouteBounds(null);

      // Restore initial view after closing detail if desired
      setViewport({
        latitude: 0.5,
        longitude: 32.5,
        zoom: 5.5,
        bearing: 0,
        pitch: 0,
      });
    }
  };

  // Clear navigation on deselect (already existing and good)
  useEffect(() => {
    if (!selectedCharger) {
      setNavigationRoute(null);
      setNavigationDuration(null);
      setRouteBounds(null);
    }
  }, [selectedCharger]);

  // Re-fit on panel toggle (already existing and good)
  useEffect(() => {
    if (selectedCharger && routeBounds) {
      fitMapToRouteBounds(routeBounds);
    }
  }, [showDetailPanel, routeBounds, selectedCharger, fitMapToRouteBounds]);

  // LCP placeholder (already existing and good)
  useEffect(() => {
    if (chargers.length && !selectedCharger) {
      setLcpImageUrl(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
        `${viewport.longitude},${viewport.latitude},${viewport.zoom},0,0/600x400?access_token=${mapboxAccessToken}`
      );
    }
  }, [chargers, selectedCharger, viewport]);

  // Watch geolocation - MODIFIED
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      pos => {
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(loc); // Only update userLocation
        // Do NOT update viewport or flyTo here
        // If a charger is already selected, recalculate the route to it
        if (selectedCharger) {
          getNavigationRoute(loc, [selectedCharger.longitude, selectedCharger.latitude]);
        }
      },
      err => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        setUserLocation(null);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [selectedCharger, getNavigationRoute]); // Dependencies: selectedCharger and getNavigationRoute


  // Format duration helper (already existing and good)
  const formatDuration = (sec?: number) => {
    if (sec === null || sec === undefined) return "Unknown"; // Handle null/undefined explicitly
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0 && m === 0) return "< 1 min"; // For very short distances
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  };

  // Search handling (already existing and good)
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(q)}.json?access_token=${mapboxAccessToken}&types=place,address,poi&limit=5`
      );
      const { features } = await res.json();
      setSearchResults(features || []);
      setShowSearchResults(true);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    }
  }, []);

  // Search debounce (already existing and good)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => handleSearch(searchQuery), 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Handle search result selection - MODIFIED
  const handleSearchResultSelect = useCallback(async (result: any) => {
    const [lng, lat] = result.center;

    // Fly to the search result location
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 800
    });

    if (userLocation) {
      // Calculate route to the search result if user location is known
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${userLocation[0]},${userLocation[1]};${lng},${lat}?steps=true&geometries=geojson&access_token=${mapboxAccessToken}`
        );
        const { routes } = await res.json();

        if (routes && routes.length) {
          const r = routes[0];
          if (!isMobile) setNavigationRoute(r.geometry);
          setNavigationDuration(r.duration);

          const b = new mapboxgl.LngLatBounds();
          b.extend(userLocation);
          b.extend([lng, lat]);
          r.geometry.coordinates.forEach((c: [number, number]) => b.extend(c));

          setRouteBounds(b);
          if (!isMobile) fitMapToRouteBounds(b);
        } else {
          setNavigationRoute(null);
          setNavigationDuration(null);
          setRouteBounds(null);
        }
      } catch (e) {
        console.error("Error fetching route for search result:", e);
        setNavigationRoute(null);
        setNavigationDuration(null);
        setRouteBounds(null);
      }
    } else {
      // Clear navigation info if no user location
      setNavigationRoute(null);
      setNavigationDuration(null);
      setRouteBounds(null);
    }

    setShowSearchResults(false);
    setSearchQuery(result.place_name);
    setSelectedCharger(null); // Ensure no charger is selected if a general location is searched
  }, [userLocation, isMobile, fitMapToRouteBounds]);

  // Track map interactions
  const handleChargerClick = useCallback((charger: any) => {
    trackEvent('charger_marker_clicked', {
      charger_id: charger.kabisaId || 'unknown',
      charger_name: charger.name || 'unknown',
      charger_type: charger.type || charger.connector || 'unknown',
      is_kabisa_charger: isKabisaCharger(charger),
      location: `${charger.latitude},${charger.longitude}`,
      map_zoom: viewport.zoom
    });
    handleChargerSelect(charger);
  }, [trackEvent, viewport.zoom, handleChargerSelect]);

  const lastTrackTime = useRef<number>(0);
  const handleMapViewportChange = useCallback((newViewport: any) => {
    setViewport(newViewport);
    const now = Date.now();
    if (now - lastTrackTime.current > 2000) { // throttle 2s
      lastTrackTime.current = now;
      trackEvent('map_viewport_changed', {
        latitude: newViewport.latitude,
        longitude: newViewport.longitude,
        zoom: newViewport.zoom,
        bearing: newViewport.bearing,
        pitch: newViewport.pitch
      });
    }
  }, [trackEvent]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Track map load
  useEffect(() => {
    if (fetchedChargers && fetchedChargers.length > 0) {
      trackEvent('charge_map_loaded', {
        total_chargers: fetchedChargers.length,
        kabisa_chargers: fetchedChargers.filter(c => isKabisaCharger(c)).length,
        competitor_chargers: fetchedChargers.filter(c => !isKabisaCharger(c)).length
      });
    }
  }, [fetchedChargers, trackEvent]);

  // Render
  return (
    <div>
      <div className="flex flex-col absolute inset-0 top-[80px]">
        <div className="relative flex-1 min-h-0">
          {/* Search Bar (Desktop) */}
          {!isMobile && (
            <div className="absolute left-4 top-20 z-50 w-80">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a location..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-2xl bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                      setSearchResults([]);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute mt-1 w-full bg-white rounded-2xl shadow-lg border border-blue-100 max-h-60 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchResultSelect(res)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:outline-none focus:bg-blue-50"
                    >
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">{res.place_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Bar (Mobile) */}
          {isMobile && (
            <>
              {!searchOpen && !isMobileNavOpen && (
                <button
                  className="fixed left-4 top-32 z-50 bg-white p-3 rounded-full shadow-lg border border-gray-200"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Open search"
                >
                  <Search className="h-6 w-6 text-blue-600" />
                </button>
              )}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/30"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-10 w-[95vw] max-w-md bg-white rounded-xl shadow-2xl p-4 relative"
                    >
                      <div className="flex items-center mb-2">
                        <Search className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          type="text"
                          autoFocus
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search for a location..."
                          className="flex-1 pl-2 pr-8 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            setShowSearchResults(false);
                            setSearchResults([]);
                          }}
                          className="ml-2 p-1"
                          aria-label="Close search"
                        >
                          <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                          {searchResults.map((res, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                handleSearchResultSelect(res);
                                setSearchOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                            >
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm">{res.place_name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Sidebar (Desktop) */}
          {/* Removed 'Charging Stations' heading and count from sidebar */}
          {!isMobile && (
            <div className={`
fixed right-0 top-[80px] h-[calc(100vh-80px)] bg-white shadow-lg z-30 mt-5
transition-transform duration-300 ease-in-out w-[300px]
${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
${showDetailPanel ? 'lg:translate-x-full' : ''}
`}>
              {/* Removed header section */}
              <div className="overflow-y-auto h-full">
                {chargers.map(c => {
                  const dist = (c.distance !== undefined && c.distance !== null)
                    ? c.distance < 1
                      ? `${Math.round(c.distance * 1000)}m`
                      : `${c.distance.toFixed(1)}km`
                    : '';
                  const gunsStats = getChargerGunsStats(c);
                  return (
                    <div
                      key={c.kabisaId}
                      className={
                        `
p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors
${selectedCharger?.kabisaId === c.kabisaId ? 'bg-blue-50' : ''}
`}
                      onClick={() => handleChargerSelect(c)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{c.name || 'N/A'}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(c.operationalStatus)}`} />
                            <span className="text-xs text-gray-600">{c.operationalStatus || 'Unknown'}</span>
                          </div>
                        </div>
                        {dist && <span className="text-xs font-medium text-blue-600">{dist}</span>}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Battery size={14} />
                          <span>{c.power}kW</span>
                        </div>
                        {gunsStats.total > 0 && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-green-600">{gunsStats.available} available</span>
                            <span className="text-yellow-600">{gunsStats.inUse} in use</span>
                            {gunsStats.underMaintenance > 0 && (
                              <span className="text-orange-600">{gunsStats.underMaintenance} maintenance</span>
                            )}
                            {gunsStats.inactive > 0 && (
                              <span className="text-red-600">{gunsStats.inactive} inactive</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail Panel (Desktop) */}
          {!isMobile && (
            <AnimatePresence>
              {selectedCharger && showDetailPanel && (
                <motion.div
                  initial={{ x: '100%', y: 80, opacity: 0 }}
                  animate={{ x: 0, y: 80, opacity: 1 }}
                  exit={{ x: '100%', y: 80, opacity: 0 }}
                  transition={{ type: 'tween', duration: 0.3, ease: [0.17, 0.67, 0.83, 0.67] }}
                  className="fixed right-0 top-[20px] w-full md:w-[400px] bg-white shadow-2xl z-50 overflow-hidden"
                  style={{ zIndex: 105 }}
                >
                  <div className="h-full max-h-[calc(100vh-40px)] overflow-y-auto">
                    <ChargerDetailPanel
                      charger={{
                        ...selectedCharger,
                        navigationDuration, // Pass navigationDuration
                        distance: selectedCharger.distance
                      }}
                      isOpen
                      onClose={handleCloseDetail}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Detail Panel (Mobile Bottom Sheet) */}
          {isMobile && (
            <AnimatePresence>
              {selectedCharger && (
                <MobileChargerDetail
                  charger={{
                    ...selectedCharger,
                    navigationDuration, // Pass navigationDuration
                    distance: selectedCharger.distance
                  }}
                  isExpanded={mobileDetailExpanded}
                  onClose={handleCloseDetail}
                  onToggleExpand={() => setMobileDetailExpanded(x => !x)}
                />
              )}
            </AnimatePresence>
          )}

          {/* Sidebar Toggle (Desktop) */}
          {!isMobile && (
            <motion.button
              onClick={() => setIsSidebarOpen(x => !x)}
              className={`
fixed ${isSidebarOpen ? 'right-[300px]' : 'right-0'} ${showDetailPanel ? 'hidden lg:flex' : 'flex'
                } top-1/2 transform -translate-y-1/2 z-40
bg-blue-600 p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-all duration-300 text-white`}
              aria-label={isSidebarOpen ? 'Hide stations list' : 'Show stations list'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </motion.button>
          )}

          {/* Stations Button (Mobile) */}
          {isMobile && !isSidebarOpen && !isMobileNavOpen && (
            <motion.button
              onClick={() => setIsSidebarOpen(x => !x)}
              className="fixed left-4 bottom-24 z-40 bg-white p-3 rounded-full shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Battery size={20} className="text-blue-600" />
            </motion.button>
          )}

          {/* Stations List Modal (Mobile) */}
          {isMobile && (
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Removed header section */}
                    <div className="overflow-y-auto max-h-[80vh]">
                      {chargers.map(c => {
                        const dist = (c.distance !== undefined && c.distance !== null)
                          ? c.distance < 1
                            ? `${Math.round(c.distance * 1000)}m`
                            : `${c.distance.toFixed(1)}km`
                          : '';
                        return (
                          <div
                            key={c.kabisaId}
                            className="p-4 border-b cursor-pointer"
                            onClick={() => {
                              handleChargerSelect(c);
                              setIsSidebarOpen(false);
                            }}
                          >
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{c.name || 'N/A'}</h3>
                                <div className="flex items-center mt-1">
                                  <div className={`w-2 h-2 rounded-full ${getStatusColor(c.operationalStatus)}`} />
                                  <span className="text-xs text-gray-600 ml-2">{c.operationalStatus || 'Unknown'}</span>
                                </div>
                              </div>
                              {dist && <span className="text-blue-600 text-sm">{dist}</span>}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 flex items-center">
                              <Battery size={12} className="mr-1" />
                              <span>{c.power}kW</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* The Map */}
          <Map
            ref={mapRef}
            {...viewport}
            style={mapStyle}
            mapboxAccessToken={mapboxAccessToken}
            mapStyle="mapbox://styles/balinda/cm9v40aew001201r193w23tpd"
            onMove={evt => handleMapViewportChange(evt.viewState)}
            onLoad={handleMapLoad}
            interactiveLayerIds={mapLoaded ? ["clusters", "unclustered-points"] : []}
            onClick={(e) => {
              if (!mapLoaded) return;
              const map = mapRef.current as any;
              const features = e.features || [];
              const cluster = features.find((f: any) => f.layer?.id === 'clusters');
              const point = features.find((f: any) => f.layer?.id === 'unclustered-points');
              if (!map) return;
              if (cluster) {
                const clusterProps = cluster.properties || {};
                const clusterId = (clusterProps as any).cluster_id;
                const source = map.getSource('chargers');
                if (source && source.getClusterExpansionZoom) {
                  source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                    if (err) return;
                    const coords = (cluster.geometry as any).coordinates as [number, number];
                    map.easeTo({ center: coords, zoom });
                  });
                }
              } else if (point) {
                const idx = point.properties?.idx;
                if (typeof idx === 'number' && chargers[idx]) {
                  handleChargerSelect(chargers[idx]);
                }
              }
            }}
            onLoad={onMapLoad}
          >
            <NavigationControl position="bottom-right" />
            <GeolocateControl position="bottom-right" trackUserLocation showAccuracyCircle={false} />
            <FullscreenControl position="bottom-right" />
            <ScaleControl position="bottom-right" />

            {/* User location */}
            {userLocation && ( // Show user location on map regardless of mobile or desktop
              <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
                <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md" />
              </Marker>
            )}

            {/* Route */}
            {mapLoaded && navigationRoute && !isMobile && ( // Only show route for desktop for now
              <Source
                id="route"
                type="geojson"
                data={{ type: 'Feature', geometry: navigationRoute, properties: {} }}
              >
                <Layer
                  id="route-border"
                  type="line"
                  source="route"
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#000', 'line-width': 9, 'line-opacity': 0.8 }}
                />
                <Layer
                  id="route-core"
                  type="line"
                  source="route"
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                  paint={{ 'line-color': '#4285F4', 'line-width': 4, 'line-opacity': 1 }}
                />
              </Source>
            )}

            {/* Clustered charger points (default) */}
            {mapLoaded && !useHtmlMarkers && (
              <Source id="chargers" type="geojson" data={chargerGeoJson as any} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
                <Layer id="clusters" type="circle" filter={["has", "point_count"]} paint={{
                  'circle-color': [
                    'step', ['get', 'point_count'],
                    '#8bb8ff', 20, '#6792ff', 50, '#3b6cef', 100, '#1747db'
                  ],
                  'circle-radius': ['step', ['get', 'point_count'], 16, 20, 20, 50, 26, 100, 32]
                }} />
                <Layer id="cluster-count" type="symbol" filter={["has", "point_count"]} layout={{
                  'text-field': ['get', 'point_count_abbreviated'],
                  'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                  'text-size': 12
                }} paint={{ 'text-color': '#ffffff' }} />
                <Layer id="unclustered-points" type="circle" filter={["!has", "point_count"]} paint={{
                  'circle-radius': 7,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                  'circle-color': [
                    'match', ['get', 'group'],
                    'kabisa-dc', '#ff7a00',
                    'kabisa-ac', '#f2c200',
                    'comp-dc', '#fb6a6a',
                    '#a0aec0'
                  ]
                }} />
              </Source>
            )}

            {/* Fallback: HTML markers at high zoom (ensures visibility) */}
            {useHtmlMarkers && chargers
              .filter(c => c.latitude && c.longitude)
              .map(c => {
              const group = getChargerGroup(c);
              const { url, size } = getIconForGroup(group);
              return (
                <Marker key={c.kabisaId} longitude={c.longitude!} latitude={c.latitude!} anchor="center">
                  <button
                    onClick={() => handleChargerClick(c)}
                    aria-label={`Select charger at ${c.name}`}
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
        </div>
      </div>
    </div>
  );
};

export default Chargermap;