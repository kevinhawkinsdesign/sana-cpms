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
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { osmRasterStyle, OSRM_DIRECTIONS_URL } from '@/lib/utils/osmMapStyle';
import {
  Battery,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useFetchChargersGeoJson } from "@/lib/hooks/useFetchChargers";
import { ChargerGeoJsonFeature } from "@/types/charger";
import ChargerDetailPanel from "@/components/charger/ChargerDetailPanel";
import MobileChargerDetail from "@/components/charger/MobileChargerDetail";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useMobileNav } from '@/lib/providers/mobile-nav-provider';
import { useClarity } from '@/lib/hooks/useClarity';
import { designTokens, getStatusStyles } from '@/lib/design-tokens';
import { CustomSearchBox } from '@/components/search';
import { SearchResult } from '@/lib/search/searchTypes';
import { useMobileSearchMode } from '@/components/search/useMobileSearchMode';
import { MobileSearchPill } from '@/components/search/MobileSearchPill';
import { MobileSearchExpanded } from '@/components/search/MobileSearchExpanded';
import { MobileChargerPreview } from '@/components/search/MobileChargerPreview';

// Constants
// No token needed — OpenStreetMap tiles + OSRM routing are both free and keyless.

// Icon paths
const chargerIcons = {
  kabisaAC: "/Charger AC Yellow.svg",
  kabisaDC: "/Charger DC Orange.svg",
  competitorAC: "/Competitor AC.svg",
  competitorDC: "/Competitor DC.svg",
};

// Get icon for charger based on category and owner
const getChargerIcon = (feature: ChargerGeoJsonFeature): { url: string; size: string } => {
  const { category, isKabisa } = feature.properties;

  if (isKabisa) {
    return {
      url: category === 'dc' ? chargerIcons.kabisaDC : chargerIcons.kabisaAC,
      size: '24px'
    };
  } else {
    return {
      url: category === 'dc' ? chargerIcons.competitorDC : chargerIcons.competitorAC,
      size: '24px'
    };
  }
};

// Map style
const mapStyle = {
  width: '100%',
  height: '100%',
};

const getChargerLookupKey = (feature: ChargerGeoJsonFeature) => {
  return String(
    feature.id ??
    feature.properties.kabisaId ??
    feature.properties.name ??
    `${feature.geometry.coordinates[0]}-${feature.geometry.coordinates[1]}`
  );
};

// Main component
interface ChargerMapProps {
  useDark?: boolean;
}

const Chargermap: React.FC<ChargerMapProps> = () => {
  // Map state
  const mapRef = useRef<MapRef>(null);
  const { trackEvent } = useClarity();
  const [viewport, setViewport] = useState({
    latitude: designTokens.map.initialCenter.latitude,
    longitude: designTokens.map.initialCenter.longitude,
    zoom: designTokens.map.initialZoom,
    bearing: 0,
    pitch: 0,
  });

  // Chargers data - using GeoJSON
  const { geojson, isLoading, error } = useFetchChargersGeoJson();
  const [selectedCharger, setSelectedCharger] = useState<ChargerGeoJsonFeature | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📊 ChargeMap state:', {
      isLoading,
      hasError: !!error,
      featuresCount: geojson.features.length,
      mapLoaded
    });
  }, [isLoading, error, geojson.features.length, mapLoaded]);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileDetailExpanded, setMobileDetailExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mobile search mode state
  const {
    mode: mobileSearchMode,
    previewCharger,
    openedFromSearch,
    showPreview,
    showDetail,
    backToSearch,
    collapse,
    startSearching
  } = useMobileSearchMode();

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger lookup ref for quick access
  const chargerLookupRef = useRef<Record<string, ChargerGeoJsonFeature>>({});

  // Navigation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<any>(null);
  const [navigationDuration, setNavigationDuration] = useState<number | null>(null);
  const [routeBounds, setRouteBounds] = useState<maplibregl.LngLatBounds | null>(null);
  const routeCalculationInProgress = useRef(false);

  // Mobile nav state
  const { isMobileNavOpen } = useMobileNav();

  // Sort chargers by distance
  const sortedFeatures = useMemo(() => {
    if (!userLocation || !geojson.features.length) return geojson.features;

    const deg2rad = (d: number) => d * Math.PI / 180;
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return [...geojson.features]
      .map(f => ({
        ...f,
        distance: getDistance(userLocation[1], userLocation[0], f.geometry.coordinates[1], f.geometry.coordinates[0])
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [geojson.features, userLocation]);

  // Build charger lookup for quick ID-based access
  useEffect(() => {
    const lookup: Record<string, ChargerGeoJsonFeature> = {};
    geojson.features.forEach(feature => {
      lookup[getChargerLookupKey(feature)] = feature;
      lookup[feature.id] = feature; // Also index by direct ID
    });
    chargerLookupRef.current = lookup;
  }, [geojson.features]);

  // Handle Android/iOS back button for mobile search navigation
  useEffect(() => {
    if (!isMobile) return;

    const handlePopState = () => {
      // Navigate through mobile search states
      if (mobileSearchMode === 'detail') {
        // detail → preview
        if (previewCharger) {
          showPreview(previewCharger, openedFromSearch);
        } else {
          backToSearch();
        }
      } else if (mobileSearchMode === 'preview') {
        // preview → searching (if opened from search) OR idle (if opened from marker)
        if (openedFromSearch) {
          backToSearch();
        } else {
          collapse();
        }
      } else if (mobileSearchMode === 'searching') {
        // searching → idle
        collapse();
      }
      // If idle, allow normal navigation
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, mobileSearchMode, previewCharger, openedFromSearch, showPreview, backToSearch, collapse]);

  // Get status indicator color helper
  const getStatusIndicator = (status: string) => {
    const styles = getStatusStyles(status);
    return <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: styles.indicator }} />;
  };

  // Fit map to route bounds
  const fitMapToRouteBounds = useCallback((bounds: maplibregl.LngLatBounds) => {
    if (!mapRef.current) return;

    const currentCenter = mapRef.current.getCenter();
    const dest = selectedCharger
      ? selectedCharger.geometry.coordinates
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
        const point = mapRef.current.project(dest as [number, number]);
        const w = mapRef.current.getContainer().offsetWidth;
        if (point.x > w - 400) {
          const offsetX = (point.x - (w - 450)) / 2;
          mapRef.current.panBy([-Math.max(offsetX, 0), 0], { duration: 500 });
        }
      }, 1000);
    }
  }, [isMobile, showDetailPanel, selectedCharger, isSidebarOpen]);

  // Map load handler
  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Get navigation route
  const getNavigationRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    if (!mapRef.current || routeCalculationInProgress.current) return null;

    routeCalculationInProgress.current = true;
    try {
      const res = await fetch(
        `${OSRM_DIRECTIONS_URL}/` +
        `${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson`
      );
      const { routes } = await res.json();

      if (routes && routes.length) {
        const route = routes[0];
        setNavigationRoute(route.geometry); // Always set route (for both mobile and desktop)
        setNavigationDuration(route.duration);

        const b = new maplibregl.LngLatBounds();
        [start, end].forEach(pt => b.extend(pt));
        route.geometry.coordinates.forEach((c: [number, number]) => b.extend(c));
        setRouteBounds(b);
        if (!isMobile) fitMapToRouteBounds(b);

        routeCalculationInProgress.current = false;
        return route;
      }
    } catch (e) {
      console.error("Error fetching route:", e);
      setNavigationRoute(null);
      setNavigationDuration(null);
      setRouteBounds(null);
    } finally {
      routeCalculationInProgress.current = false;
    }

    // Fallback to flyTo if route calculation fails
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
  const handleChargerSelect = useCallback((feature: ChargerGeoJsonFeature) => {
    setSelectedCharger(feature);

    if (isMobile) {
      // Convert feature to SearchResult for mobile preview
      const props = feature.properties;
      const coords = feature.geometry.coordinates as [number, number];

      const distance = userLocation
        ? (() => {
            const [lon1, lat1] = userLocation;
            const [lon2, lat2] = coords;
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          })()
        : undefined;

      const searchResult: SearchResult = {
        id: feature.id,
        name: props.name || 'Charging Station',
        address: props.address || 'Location not specified',
        type: 'charger',
        coordinates: coords,
        distance,
        source: 'chargers',
        power: props.power,
        status: props.status,
        operationalStatus: props.operationalStatus,
        isKabisa: props.isKabisa,
        availability: props.availability,
        featureId: feature.id
      };

      // Show preview first (Tesla-style progressive disclosure)
      showPreview(searchResult, false); // false = opened from marker click, not search

      // Fly to charger with delay and proper zoom/padding for bottom panel
      setTimeout(() => {
        const currentZoom = mapRef.current?.getZoom() || viewport.zoom;
        const targetZoom = Math.max(currentZoom, 15);

        mapRef.current?.flyTo({
          center: coords,
          zoom: targetZoom,
          padding: { bottom: 380, top: 100, left: 50, right: 50 }, // Account for bottom preview panel
          duration: 800
        });
      }, 100);

      // Fetch route in background
      if (userLocation) {
        getNavigationRoute(userLocation, coords);
      } else {
        setNavigationRoute(null);
        setNavigationDuration(null);
        setRouteBounds(null);
      }
    } else {
      // Desktop: existing behavior
      setShowDetailPanel(true);
      // Close sidebar when detail panel opens
      setIsSidebarOpen(false);

      setTimeout(() => {
        if (userLocation) {
          getNavigationRoute(userLocation, feature.geometry.coordinates);
        } else if (mapRef.current) {
          mapRef.current.flyTo({
            center: feature.geometry.coordinates,
            zoom: 14,
            padding: { right: 450, top: 0, bottom: 0, left: 0 },
            duration: 800
          });
        }
      }, 50);
    }
  }, [isMobile, userLocation, getNavigationRoute, showDetailPanel, showPreview, viewport.zoom]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    // Track search result click
    trackEvent('search_result_selected', {
      result_type: result.type,
      result_name: result.name,
      is_kabisa: result.isKabisa || false
    });

    if (isMobile) {
      // Mobile: Show preview first for chargers
      if (result.type === 'charger') {
        showPreview(result, true); // true = opened from search

        // Fly to charger with delay and proper padding for bottom panel
        setTimeout(() => {
          const currentZoom = mapRef.current?.getZoom() || viewport.zoom;
          const targetZoom = Math.max(currentZoom, 15);

          mapRef.current?.flyTo({
            center: result.coordinates,
            zoom: targetZoom,
            padding: { bottom: 380, top: 100, left: 50, right: 50 },
            duration: 800
          });
        }, 300); // Delay to create smooth glide + slide-up feeling
      } else {
        // For locations, fly to directly
        mapRef.current?.flyTo({
          center: result.coordinates,
          zoom: 14,
          duration: 800
        });
        // Calculate route if user location available
        if (userLocation) {
          getNavigationRoute(userLocation, result.coordinates);
        }
        collapse();
      }
    } else {
      // Desktop: Existing behavior
      if (result.type === 'charger') {
        // Look up the full charger feature
        const feature = chargerLookupRef.current[result.id] || chargerLookupRef.current[result.featureId || ''];
        if (feature) {
          handleChargerSelect(feature);
        }
      } else {
        // Handle location result
        mapRef.current?.flyTo({
          center: result.coordinates,
          zoom: 14,
          duration: 800
        });

        // Calculate route if user location available
        if (userLocation) {
          getNavigationRoute(userLocation, result.coordinates);
        }

        setSelectedCharger(null);
      }
    }
  }, [isMobile, handleChargerSelect, userLocation, getNavigationRoute, trackEvent, showPreview, collapse]);

  // Close detail panel - IMPROVED: Don't reset viewport
  const handleCloseDetail = () => {
    if (isMobile) {
      setMobileDetailExpanded(false);
      collapse(); // Reset mobile search mode
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
      // DON'T reset viewport - keep current view
      // Sidebar can remain closed or user can toggle it manually
    }
  };

  // Clear navigation on deselect
  useEffect(() => {
    if (!selectedCharger) {
      setNavigationRoute(null);
      setNavigationDuration(null);
      setRouteBounds(null);
    }
  }, [selectedCharger]);

  // Re-fit on panel toggle
  useEffect(() => {
    if (selectedCharger && routeBounds) {
      fitMapToRouteBounds(routeBounds);
    }
  }, [showDetailPanel, routeBounds, selectedCharger, fitMapToRouteBounds]);

  // Watch geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      pos => {
        const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(loc);
        // Recalculate route if charger is selected
        if (selectedCharger) {
          getNavigationRoute(loc, selectedCharger.geometry.coordinates);
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
  }, [selectedCharger, getNavigationRoute]);

  // Track map interactions
  const handleChargerClick = useCallback((feature: ChargerGeoJsonFeature) => {
    trackEvent('charger_marker_clicked', {
      charger_id: feature.properties.kabisaId || 'unknown',
      charger_name: feature.properties.name || 'unknown',
      charger_category: feature.properties.category,
      is_kabisa_charger: feature.properties.isKabisa,
      location: `${feature.geometry.coordinates[1]},${feature.geometry.coordinates[0]}`,
      map_zoom: viewport.zoom
    });
    handleChargerSelect(feature);
  }, [trackEvent, viewport.zoom, handleChargerSelect]);

  const lastTrackTime = useRef<number>(0);
  const handleMapViewportChange = useCallback((newViewport: any) => {
    setViewport(newViewport);
    const now = Date.now();
    if (now - lastTrackTime.current > 2000) {
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

  // Track map load
  useEffect(() => {
    if (geojson.features && geojson.features.length > 0) {
      trackEvent('charge_map_loaded', {
        total_chargers: geojson.features.length,
        kabisa_chargers: geojson.features.filter(f => f.properties.isKabisa).length,
        competitor_chargers: geojson.features.filter(f => !f.properties.isKabisa).length
      });
    }
  }, [geojson, trackEvent]);

  // Convert GeoJSON feature to legacy format for detail panels
  const convertFeatureToLegacy = (feature: ChargerGeoJsonFeature) => {
    const props = feature.properties;
    return {
      id: props.id,
      kabisaId: props.kabisaId,
      name: props.name,
      Latitude: feature.geometry.coordinates[1],
      Longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      power: props.power,
      operationalStatus: props.operationalStatus.toUpperCase(),
      address: props.address,
      imageUrl: props.imageUrl,
      guns: [], // Would need to fetch full details if needed
      ownerName: props.owner,
      availableGuns: props.availability.available,
      totalGuns: props.availability.total,
      distance: (feature as any).distance
    };
  };

  // Render
  return (
    <div>
      <div className="flex flex-col absolute inset-0 top-[80px]">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-700 font-medium">Loading charging stations...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && geojson.features.length === 0 && (
          <div className="absolute inset-0 bg-white z-50 flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-lg max-w-md">
              <h3 className="text-red-800 font-bold text-lg mb-2">Failed to load charging stations</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          {/* Desktop Search Box */}
          {!isMobile && (
            <div className="absolute left-4 top-6 md:w-96 z-50 pointer-events-auto">
              <CustomSearchBox
                chargers={geojson.features}
                onResultSelect={handleSearchResultSelect}
                userLocation={userLocation || undefined}
                placeholder="Search for chargers or places..."
              />
            </div>
          )}

          {/* Mobile Search States - Only render after hydration */}
          {mounted && isMobile && (
            <AnimatePresence mode="wait">
              {mobileSearchMode === 'idle' && (
                <MobileSearchPill
                  key="pill"
                  onExpand={startSearching}
                />
              )}

              {mobileSearchMode === 'searching' && (
                <MobileSearchExpanded
                  key="expanded"
                  chargers={geojson.features}
                  userLocation={userLocation || undefined}
                  onResultSelect={handleSearchResultSelect}
                  onCollapse={collapse}
                />
              )}

              {mobileSearchMode === 'preview' && previewCharger && (
                <MobileChargerPreview
                  key="preview"
                  result={previewCharger}
                  onBack={openedFromSearch ? backToSearch : collapse}
                  onViewDetails={() => {
                    // Convert to full charger and show detail
                    const feature = chargerLookupRef.current[previewCharger.id] || chargerLookupRef.current[previewCharger.featureId || ''];
                    if (feature) {
                      setSelectedCharger(feature);
                      showDetail();
                    }
                  }}
                  onClose={collapse}
                />
              )}
            </AnimatePresence>
          )}

          {/* Sidebar (Desktop) */}
          {!isMobile && (
            <div className={`
fixed right-0 top-[80px] h-[calc(100vh-80px)] bg-white dark:bg-white shadow-lg z-30
transition-transform duration-300 ease-in-out w-[300px]
${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
${showDetailPanel ? 'lg:translate-x-full' : ''}
`}
              role="complementary"
              aria-label="Charging stations list"
            >
              <div className="overflow-y-auto h-full">
                {sortedFeatures.map(f => {
                  const dist = (f as any).distance !== undefined && (f as any).distance !== null
                    ? (f as any).distance < 1
                      ? `${Math.round((f as any).distance * 1000)}m`
                      : `${(f as any).distance.toFixed(1)}km`
                    : '';
                  return (
                    <div
                      key={f.id}
                      className={`
p-3 border-b dark:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500
${selectedCharger?.id === f.id ? 'bg-blue-50 dark:bg-blue-50' : ''}
`}
                      onClick={() => handleChargerSelect(f)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChargerSelect(f)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select charger at ${f.properties.name}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-800">{f.properties.name || 'N/A'}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusIndicator(f.properties.operationalStatus)}
                            <span className="text-xs text-gray-600 dark:text-gray-600">{f.properties.operationalStatus || 'Unknown'}</span>
                          </div>
                        </div>
                        {dist && <span className="text-xs font-medium text-blue-600 dark:text-blue-600">{dist}</span>}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Battery size={14} aria-hidden="true" />
                          <span>{f.properties.power}kW</span>
                        </div>
                        {f.properties.availability && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-green-600 dark:text-green-600">{f.properties.availability.available} available</span>
                            <span className="text-gray-600 dark:text-gray-600">{f.properties.availability.total} total</span>
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
                  initial={{ x: '100%', y: 0, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={{ x: '100%', y: 0, opacity: 0 }}
                  transition={{ type: 'tween', duration: 0.3, ease: [0.17, 0.67, 0.83, 0.67] }}
                  className="fixed right-0 top-[80px] h-[calc(100vh-80px)] w-full md:w-[440px] bg-white shadow-2xl z-30 overflow-hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="charger-detail-title"
                >
                  <div className="h-full overflow-y-auto">
                    <ChargerDetailPanel
                      charger={{
                        ...convertFeatureToLegacy(selectedCharger),
                        navigationDuration,
                      }}
                      isOpen
                      onClose={handleCloseDetail}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Detail Panel (Mobile Bottom Sheet) - Only render after hydration */}
          {mounted && isMobile && mobileSearchMode === 'detail' && (
            <AnimatePresence>
              {selectedCharger && (
                <MobileChargerDetail
                  charger={{
                    ...convertFeatureToLegacy(selectedCharger),
                    navigationDuration,
                  }}
                  isExpanded={mobileDetailExpanded}
                  onClose={handleCloseDetail}
                  onToggleExpand={() => setMobileDetailExpanded(x => !x)}
                />
              )}
            </AnimatePresence>
          )}

          {/* Sidebar Toggle (Desktop) - FIXED ICON DIRECTION */}
          {!isMobile && !showDetailPanel && (
            <motion.button
              onClick={() => {
                setIsSidebarOpen(x => !x);
              }}
              className={`
fixed ${isSidebarOpen ? 'right-[300px]' : 'right-0'} top-1/2 transform -translate-y-1/2 z-40
bg-blue-600 dark:bg-blue-600 p-2 rounded-l-lg shadow-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label={isSidebarOpen ? 'Hide stations list' : 'Show stations list'}
              aria-expanded={isSidebarOpen}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* FIXED: Show ChevronLeft when sidebar is closed (to open it), ChevronRight when open (to close it) */}
              {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </motion.button>
          )}

          {/* Stations Button (Mobile) - REMOVED: Using new search UI instead */}

          {/* Stations List Modal (Mobile) - HIDDEN: Using new search UI instead */}
          {false && isMobile && (
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50"
                  onClick={() => setIsSidebarOpen(false)}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-stations-title"
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-4 border-b">
                      <h2 id="mobile-stations-title" className="text-lg font-bold">Charging Stations</h2>
                      <p className="text-sm text-gray-600">{sortedFeatures.length} stations</p>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
                      {sortedFeatures.map(f => {
                        const dist = (f as any).distance !== undefined && (f as any).distance !== null
                          ? (f as any).distance < 1
                            ? `${Math.round((f as any).distance * 1000)}m`
                            : `${(f as any).distance.toFixed(1)}km`
                          : '';
                        return (
                          <div
                            key={f.id}
                            className="p-4 border-b cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-blue-50"
                            onClick={() => {
                              handleChargerSelect(f);
                              setIsSidebarOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleChargerSelect(f);
                                setIsSidebarOpen(false);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Select charger at ${f.properties.name}`}
                          >
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{f.properties.name || 'N/A'}</h3>
                                <div className="flex items-center mt-1">
                                  {getStatusIndicator(f.properties.operationalStatus)}
                                  <span className="text-xs text-gray-600">{f.properties.operationalStatus || 'Unknown'}</span>
                                </div>
                              </div>
                              {dist && <span className="text-blue-600 text-sm">{dist}</span>}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 flex items-center">
                              <Battery size={12} className="mr-1" aria-hidden="true" />
                              <span>{f.properties.power}kW</span>
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

          {/* Click overlay to close search when clicking blurred map */}
          {mounted && isMobile && mobileSearchMode === 'searching' && (
            <div
              className="absolute inset-0 z-40 cursor-pointer"
              onClick={collapse}
              aria-label="Close search"
            />
          )}

          {/* The Map */}
          <div
            className={`w-full h-full transition-all duration-300 ${
              mounted && isMobile && mobileSearchMode === 'searching'
                ? 'brightness-75 blur-sm'
                : ''
            }`}
          >
            <Map
              ref={mapRef}
              {...viewport}
              style={mapStyle}
              mapStyle={osmRasterStyle}
              onMove={evt => handleMapViewportChange(evt.viewState)}
              onLoad={onMapLoad}
            >
            <NavigationControl position="bottom-right" />
            <GeolocateControl position="bottom-right" trackUserLocation showAccuracyCircle={false} />
            <FullscreenControl position="bottom-right" />
            <ScaleControl position="bottom-right" />

            {/* User location */}
            {userLocation && (
              <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
                <div
                  className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"
                  role="img"
                  aria-label="Your current location"
                />
              </Marker>
            )}

            {/* Route - NOW SHOWN ON MOBILE TOO! */}
            {mapLoaded && navigationRoute && (
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

            {/* HTML markers for all chargers (no clustering) */}
            {geojson.features.map(f => {
              const { url, size } = getChargerIcon(f);
              return (
                <Marker key={f.id} longitude={f.geometry.coordinates[0]} latitude={f.geometry.coordinates[1]} anchor="center">
                  <button
                    onClick={() => handleChargerClick(f)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChargerClick(f)}
                    aria-label={`Select charger at ${f.properties.name}`}
                    style={{
                      backgroundImage: `url('${url}')`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      width: size,
                      height: size,
                      border: 'none',
                      padding: 0,
                      backgroundColor: 'transparent',
                      cursor: 'pointer'
                    }}
                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                  />
                </Marker>
              );
            })}
          </Map>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chargermap;
