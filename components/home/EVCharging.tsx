'use client'

import { Zap, Battery, Plug } from 'lucide-react'
import dynamic from 'next/dynamic'
import { LocalizedLink } from '../shared/LocalizedLink'

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

// Dynamically import the map component to prevent SSR issues
const HomepageMap = dynamic(() => import('@/components/charger/homepagemap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
      <p className="text-gray-400">Loading map...</p>
    </div>
  )
})

const chargerTypes = [
  {
    id: 2,
    name: "GBT",
    image: "/images/content/gbt.png",
    power: "Up to 350kW DC",
    description: "Standard DC charging for Chinese EVs",
    chargingTime: "20-30 mins (20-80%)",
    bgColor: "bg-green-50",
    type: "DC",
    count: 2,
  },
  {
    id: 1,
    name: "CCS2 (Combined Charging System)",
    image: "/images/content/ccs2.png",
    power: "Up to 150kW DC",
    description: "Fast DC charging for most European & American EVs",
    chargingTime: "20-30 mins (20-80%)",
    bgColor: "bg-blue-50",
    type: "DC",
    count: 1,
  },
  {
    id: 4,
    name: "Type 2 (Mennekes)",
    image: "/images/content/type2.png",
    power: "Up to 22kW AC",
    description: "Standard AC charging for European EVs",
    chargingTime: "3-6 hours (10-100%)",
    bgColor: "bg-orange-50",
    type: "AC",
    count: 15,
  },
]

export default function ChargingServices() {
  const totalDC = chargerTypes.reduce(
    (sum, charger) => (charger.type === "DC" ? sum + charger.count : sum),
    0
  );

  const totalAC = chargerTypes.reduce(
    (sum, charger) => (charger.type === "AC" ? sum + charger.count : sum),
    0
  );

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Map Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[500px] lg:h-[800px]">
            <div className="p-6 border-b">
              <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900">
                Rwanda's Largest Charging Network
              </h3>
            </div>
            <div className="relative h-[calc(100%-84px)] bg-gray-100">
              <HomepageMap useDark={true} />
            </div>
          </div>

          {/* Charger Info Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-auto lg:h-[800px]">
            {/* Header Section (will not scroll) */}
            <div className="p-6 border-b shrink-0">
              <div className="flex justify-around gap-8 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-lg text-gray-800">DC Fast</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{totalDC}</p>
                  <p className="text-sm text-gray-600">Charging Points</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Plug className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-lg text-gray-800">AC</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{totalAC}</p>
                  <p className="text-sm text-gray-600">Charging Points</p>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Available Connector Types
              </h3>
            </div>

            {/* Content Section with sticky footer for button */}
            <div className="relative flex-1 flex flex-col p-6 space-y-4">
              <div className="overflow-y-auto flex-1">
                {chargerTypes.map((charger) => (
                  <div
                    key={charger.id}
                    className={`${charger.bgColor} rounded-xl p-4 transition-all hover:shadow-md border border-transparent hover:border-gray-200`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                        <img
                          src={cloudflareUrl(charger.image, 96, 85)}
                          alt={charger.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-base font-bold text-gray-800 pr-2">{charger.name}</h4>
                          <span className="px-2 py-1 bg-white/60 rounded-full text-xs font-medium text-gray-700 whitespace-nowrap">
                            {charger.count} Points
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {charger.description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <p className="text-xs">{charger.power}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Battery className="w-4 h-4 text-green-500" />
                            <p className="text-xs">{charger.chargingTime}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-100 rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-1">Pro Tip</h4>
                  <p className="text-xs text-gray-600">
                    Check your vehicle's manual or charging port to identify the
                    compatible connector type. AC charging times may vary based
                    on your vehicle's onboard charger capacity.
                  </p>
                </div>
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 flex justify-center z-10">
                <LocalizedLink href="/charge" passHref>
                  <button className="bg-emerald-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors inline-flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                    See Charging Stations
                  </button>
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}