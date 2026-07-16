// Your shop page file (e.g., app/shop/page.tsx or VehiclesList.tsx)

'use client';

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";
import CompactDealerInfo from "@/components/vehicle/dealer";
import PurchaseSidebar from "@/components/vehicle/PurchaseSidebar";
import VoyageCard from "@/components/vehicle/ProductCard";
import VoyageSkeletonCard from "@/components/vehicle/VoyageSkeletonCard";
import { IShopVehicle } from "@/types/shop";
import api from "@/lib/api/api";
import VehicleSortingBanner from "@/components/vehicle/VehicleSortingBanner";
import { useSearchParams, useRouter } from "next/navigation";
import { useCountry } from "@/lib/providers/country-provider";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import { useClarity } from "@/lib/hooks/useClarity";

const VehiclesContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortedVehicles, setSortedVehicles] = useState<IShopVehicle[]>([]);
  const { trackEvent } = useClarity();

  const searchParams = useSearchParams();
  const router = useLocalizedRouter();
  const classification = searchParams.get('classification');
  const { countryCode } = useCountry();

  const { data: allVehicles, isLoading, isError } = useQuery({
    // Add countryCode to the queryKey for better cache invalidation.
    queryKey: ["vehicles", countryCode], 
    queryFn: async () => {
      const response = await api(false).get("/api/client/shop-vehicles");
      if (response.data.status === 'success') {
        return response.data.data.vehicles || [];
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicles');
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Track shop page view
  useEffect(() => {
    trackEvent('shop_page_viewed', {
      country: countryCode,
      classification: classification || 'all',
      vehicle_count: allVehicles?.length || 0,
      filtered_count: sortedVehicles.length
    });
  }, [countryCode, classification, allVehicles, sortedVehicles, trackEvent]);

  const filterAndSortVehicles = (sortType = 'default') => {
    if (!allVehicles) return;

    let filtered = allVehicles;

    // 1. Filter by Country first (using country codes as stored in DB)
    // Handles both uppercase and lowercase country codes
    const code = countryCode?.toLowerCase();
    const countryCodeForFilter = code === 'rw' ? 'RW' : code === 'ke' ? 'KE' : '';
    // DEBUG LOGS

    filtered = filtered.filter((v: IShopVehicle) => v.country === countryCodeForFilter);

    // 2. Filter by classification if it exists
    if (classification) {
      filtered = filtered.filter((v: IShopVehicle) => v.classification?.toUpperCase() === classification.toUpperCase());
    }

    // 3. Apply sorting
    switch (sortType) {
      case "price-high": filtered.sort((a: IShopVehicle, b: IShopVehicle) => b.price - a.price); break;
      case "price-low": filtered.sort((a: IShopVehicle, b: IShopVehicle) => a.price - b.price); break;
      case "range-high": filtered.sort((a: IShopVehicle, b: IShopVehicle) => b.range - a.range); break;
      case "range-low": filtered.sort((a: IShopVehicle, b: IShopVehicle) => a.range - b.range); break;
      default: break; // Keep the default order from the API
    }
    
    // Track sorting/filtering
    trackEvent('shop_vehicles_filtered', {
      sort_type: sortType,
      classification: classification || 'all',
      country: countryCode,
      total_vehicles: allVehicles.length,
      filtered_vehicles: filtered.length
    });
    
    setSortedVehicles(filtered);
  };

  // Track sidebar interactions
  const handleSidebarToggle = (isOpen: boolean) => {
    trackEvent('shop_sidebar_toggled', {
      action: isOpen ? 'opened' : 'closed',
      country: countryCode,
      classification: classification || 'all'
    });
    setIsSidebarOpen(isOpen);
  };

  // This effect now correctly re-runs whenever the master list or filters change.
  useEffect(() => {
    if (allVehicles) {
      filterAndSortVehicles();
    }
  }, [allVehicles, classification, countryCode]);
  
  const SidebarContent = () => (
    <div className="relative h-screen overflow-y-auto pt-24 pb-10 no-scrollbar">
      <div className="space-y-6 p-4">
        <CompactDealerInfo />
        <PurchaseSidebar />
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, index) => <VoyageSkeletonCard key={index} />);
    }
    if (isError) {
      return (
        <div className="col-span-full text-center py-8">
          <div className="max-w-xs mx-auto bg-white/50 backdrop-blur-lg rounded-2xl shadow-md p-6 border border-white/30">
            <X className="w-10 h-10 mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Error Loading Vehicles</h3>
            <p className="text-slate-600 text-sm">Please try refreshing the page.</p>
          </div>
        </div>
      );
    }
    // Show loading skeleton if we don't have data yet
    if (!allVehicles || allVehicles.length === 0) {
      return Array.from({ length: 6 }).map((_, index) => <VoyageSkeletonCard key={index} />);
    }
    return sortedVehicles.map((vehicle) => (
      <motion.div key={vehicle.id} layout transition={{ duration: 0.5, type: 'spring' }}>
        <VoyageCard vehicle={vehicle} />
      </motion.div>
    ));
  };
  
  return (
    <>
      <Head>
        <title>Kabisa - {classification ? classification.replace(/_/g, ' ') : 'All Vehicles'}</title>
        <meta name="description" content="Discover the latest electric vehicles at Kabisa. Find your perfect car today!" />
      </Head>

      <div className="relative min-h-screen bg-white overflow-x-hidden">
        <div className="lg:hidden fixed top-24 left-4 z-50">
          <motion.button
            onClick={() => handleSidebarToggle(!isSidebarOpen)}
            className="flex items-center justify-center bg-white/60 backdrop-blur-md w-12 h-12 rounded-2xl shadow-lg text-slate-800 border border-white/30"
            whileTap={{ scale: 0.95 }} aria-label="Toggle filters menu"
          >
            <AnimatePresence mode="wait">
              <motion.span key={isSidebarOpen ? 'close' : 'open'} initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="hidden lg:block fixed left-0 top-0 h-screen w-72 z-30">
          <SidebarContent />
        </div>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 h-screen w-72 bg-white/30 backdrop-blur-xl shadow-2xl z-30"
            >
              <SidebarContent />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main className="transition-transform duration-500 ease-in-out" style={{ transform: isSidebarOpen ? 'translateX(288px)' : 'translateX(0)', marginLeft: '0' }} >
             <div className="lg:ml-72">
                 <div className="p-4 lg:p-6">
                     <VehicleSortingBanner onSort={filterAndSortVehicles} />
                     <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-6">
                         {renderContent()}
                     </motion.div>
                 </div>
             </div>
        </main>
      </div>
    </>
  );
};

const VehiclesList = () => (
  <Suspense fallback={<VehiclesLoading />}>
    <VehiclesContent />
  </Suspense>
);

const VehiclesLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-100 to-violet-100 flex items-center justify-center">
    <div className="text-center text-slate-500">
        <svg className="mx-auto h-12 w-12 animate-spin text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 font-semibold">Loading Vehicles...</p>
    </div>
  </div>
);

export default VehiclesList;