'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '../ui/carousel';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import api from "@/lib/api/api";
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useCountry } from '@/lib/providers/country-provider';
import { openTestDriveForm, openPriceRequestForm } from '@/lib/utils/airtable';

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => {
  // If it's already an external URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // If it's a local path, transform it with Cloudflare
  return `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;
};


const Feature = () => {
  const [apiInstance, setApiInstance] = useState<any>(null);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiCarousel, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const router = useLocalizedRouter();
  const { countryCode } = useCountry();

  useEffect(() => {
    setIsLoading(true);
    api().get("/api/client/shop-vehicles").then((res: any) => {
      console.log('API Response:', res.data);
      if (res.data.status === 'success') {
        console.log('Vehicles data:', res.data.data.vehicles);
        setAllVehicles(res.data.data.vehicles || []);
      }
    }).catch((error: any) => {
      console.error('Error fetching vehicles:', error);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Filter vehicles by country and create specific order for Rwanda, flexible for Kenya
  const getFilteredAndOrderedVehicles = () => {
    console.log('All vehicles:', allVehicles);
    console.log('Country code:', countryCode);
    
    const filteredVehicles = allVehicles.filter(v => v.country === countryCode.toUpperCase());
    console.log('Filtered vehicles for country:', filteredVehicles);
    
    // For now, let's just show the first 4 vehicles for the country to ensure it works
    let vehiclesToShow = filteredVehicles.slice(0, 4);
    
    // If no vehicles found for the specific country, show any available vehicles
    if (vehiclesToShow.length === 0) {
      console.log('No vehicles found for country, showing any available vehicles');
      vehiclesToShow = allVehicles.slice(0, 4);
    }
    
    console.log('Vehicles to show:', vehiclesToShow);
    
    return vehiclesToShow;
    
    // TODO: Re-implement specific ordering once basic display is working
    // if (countryCode.toUpperCase() === 'RW') {
    //   // For Rwanda: Use actual vehicle IDs from the API data
    //   const specificVehicleIds = [
    //     '7f204dfd-8494-4ac5-8f41-86947c3df5c3', // Geely Galaxy E5
    //     '2fe85771-7501-4193-8ded-756c7ab614cd', // BYD Song Plus
    //     '47b71098-0d20-48a7-816a-5a51e9c370ae', // BYD Yuan Up
    //     'ef8f05ab-7a83-436c-be69-406b82829900', // Farizon X7E (pickup/truck)
    //     '8c2c145b-08ee-41d3-a9ff-34775b450b62', // Farizon V6E
    //   ];
    //   
    //   // Get vehicles in specific order, filtering out any that don't exist
    //   const orderedVehicles = specificVehicleIds
    //     .map(id => filteredVehicles.find(v => v.id === id))
    //     .filter(Boolean); // Remove any undefined vehicles
    //   
    //   console.log('Ordered vehicles for RW:', orderedVehicles);
    //   
    //   // If no vehicles found with specific IDs, fall back to showing any available vehicles
    //   if (orderedVehicles.length === 0) {
    //     console.log('No vehicles found with specific IDs, falling back to any available vehicles');
    //     return filteredVehicles.slice(0, 4);
    //   }
    //   
    //   return orderedVehicles;
    // } else {
    //   // For other countries (like Kenya): Display any available vehicles
    //   // Take up to 4 vehicles, prioritizing SUVs first, then others
    //   const suvs = filteredVehicles.filter(v => v.classification === 'SUV');
    //   const others = filteredVehicles.filter(v => v.classification !== 'SUV');
    //   
    //   const orderedVehicles = [
    //     ...suvs.slice(0, 2),
    //     ...others.slice(0, 2)
    //   ].slice(0, 4); // Ensure max 4 vehicles
    //   
    //   console.log('Ordered vehicles for other countries:', orderedVehicles);
    //   return orderedVehicles;
    // }
  };

  const filteredVehicles = getFilteredAndOrderedVehicles();
  console.log('Final filtered vehicles to display:', filteredVehicles);

  useEffect(() => {
    if (!apiCarousel) return;
    setCurrent(apiCarousel?.selectedScrollSnap() ?? 0);
    const onSelect = (api: CarouselApi) => {
      setCurrent(api?.selectedScrollSnap() ?? 0);
    };
    apiCarousel?.on("select", onSelect);
    return () => {
      apiCarousel?.off("select", onSelect);
    };
  }, [apiCarousel]);

  return (
    <div className="w-full bg-white py-12 md:py-16">
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          // CHANGE 1: Align to the start to show the next card
          align: "start",
          loop: false,
          dragFree: true,
        }}
        plugins={[
          WheelGesturesPlugin({
            forceWheelAxis: "x",
          }),
        ]}
      >
        <CarouselContent className="-ml-4 px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <CarouselItem className="pl-4 basis-11/12 md:basis-5/6 lg:basis-2/3">
              <div className="relative h-[450px] md:h-[500px] lg:h-[550px] flex items-center justify-center bg-gray-100 rounded-2xl">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Loading vehicles...</p>
                </div>
              </div>
            </CarouselItem>
          ) : filteredVehicles.length > 0 ? filteredVehicles.map((vehicle, index) => {
            console.log(`Rendering vehicle ${index}:`, vehicle);
            return (
            <CarouselItem
              key={vehicle.id}
              // CHANGE 2: Adjust basis on small screens to be less than full width
              className="pl-4 basis-11/12 md:basis-5/6 lg:basis-2/3"
            >
              <div
                className="relative h-[450px] md:h-[500px] lg:h-[550px] transition-all duration-500 ease-in-out"
                style={{
                  filter: `grayscale(${current === index ? 0 : 1})`,
                }}
              >
                <div
                  className="relative h-full w-full rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => {
                    router.push(`/shop/${vehicle.shopId || vehicle.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      router.push(`/shop/${vehicle.shopId || vehicle.id}`);
                    }
                  }}
                >
                  <img
                    src={cloudflareUrl(vehicle.mainImage || "/placeholder.png", 1200, 85)}
                    alt={vehicle.make + ' ' + vehicle.model}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute top-6 left-6 bg-black/50 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium">
                    {vehicle.classification || vehicle.category || 'Vehicle'}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">{vehicle.make} {vehicle.model}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base mb-6 text-gray-200">
                      {vehicle.range && <p>Range: {vehicle.range} km</p>}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="bg-[#4561DE] hover:bg-[#3046a6] text-white text-sm font-semibold rounded-md px-6 py-2 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        }}
                      >
                        Test Drive
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 border-white/50 hover:border-white/70 text-white text-sm font-semibold rounded-md px-6 py-2 h-auto transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
                          const additionalInfo = {
                            'Vehicle Make': vehicle.make,
                            'Vehicle Model': vehicle.model,
                            'Vehicle Year': vehicle.year.toString(),
                            'Vehicle Range': `${vehicle.range} km`,
                            'Vehicle Classification': vehicle.classification || 'Unknown',
                            'Vehicle ID': vehicle.id
                          };
                          openPriceRequestForm(vehicleName, vehicle.country, additionalInfo);
                        }}
                      >
                        Request Price
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
            );
          }) : (
            <CarouselItem className="pl-4 basis-11/12 md:basis-5/6 lg:basis-2/3">
              <div className="relative h-[450px] md:h-[500px] lg:h-[550px] flex items-center justify-center bg-gray-100 rounded-2xl">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">No vehicles available</p>
                  <p className="text-sm">Check back later for new arrivals</p>
                </div>
              </div>
            </CarouselItem>
          )}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default Feature;