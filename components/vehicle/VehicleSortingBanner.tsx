"use client";

import React, { useState } from "react";
import { ChevronDown, Battery, DollarSign, Filter, Tags, RefreshCw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSearchParams } from 'next/navigation';
import { ShopVehicleClassification } from "@/types/shop";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";

interface VehicleSortingBannerProps { onSort: (sortType: string) => void; }

const VehicleSortingBanner: React.FC<VehicleSortingBannerProps> = ({ onSort }) => {
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const currentClassification = searchParams.get("classification") || "";
  const [activeSort, setActiveSort] = useState("default");

  const handleSort = (sortType: string) => {
    setActiveSort(sortType);
    onSort(sortType);
  };

  const handleClassificationChange = (classification: string) => {
    const params = new URLSearchParams(searchParams);
    if (classification) {
      params.set('classification', classification);
    } else {
      params.delete('classification');
    }
    router.push(`/shop?${params.toString()}`);
  };
  
  const clearFilters = () => {
    setActiveSort("default");
    onSort("all");
    router.push("/shop");
  }

  const sortOptions = [
    { id: "price-low", label: "Price: Low to High" },
    { id: "price-high", label: "Price: High to Low" },
    { id: "range-high", label: "Range: Longest First" },
    { id: "range-low", label: "Range: Shortest First" },
  ];

  const classificationOptions = [
    { id: "", label: "All Classifications" },
    ...Object.values(ShopVehicleClassification).map(c => ({
      id: c,
      label: c.replace(/_/g, ' ')
    }))
  ];

  const getActiveLabel = (options: {id: string, label: string}[], activeId: string) => {
    return options.find(opt => opt.id === activeId)?.label || options[0].label;
  }

  return (
    <div className="w-full bg-white/40 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/50 p-4 mt-20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Filter className="w-5 h-5" />
          <span>Sort & Filter</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Classification Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-white/50 hover:bg-white/70 border border-white/30 text-sm font-medium text-slate-700 transition-colors shadow-sm">
                <Tags className="w-4 h-4 text-purple-600" />
                <span className="truncate">{getActiveLabel(classificationOptions, currentClassification)}</span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/80 backdrop-blur-xl rounded-2xl border-white/40 shadow-xl min-w-[200px]">
              {classificationOptions.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => handleClassificationChange(item.id)} className="text-sm font-medium text-slate-700 hover:!bg-white/50 rounded-lg m-1">
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sorting Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-white/50 hover:bg-white/70 border border-white/30 text-sm font-medium text-slate-700 transition-colors shadow-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <Battery className="w-4 h-4 text-blue-600 -ml-2" />
                <span className="truncate">{getActiveLabel(sortOptions, activeSort)}</span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/80 backdrop-blur-xl rounded-2xl border-white/40 shadow-xl min-w-[200px]">
              {sortOptions.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => handleSort(item.id)} className="text-sm font-medium text-slate-700 hover:!bg-white/50 rounded-lg m-1">
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {(activeSort !== "default" || currentClassification) && (
            <button onClick={clearFilters} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/50 hover:bg-white/70 border border-white/30 text-slate-700 transition-colors shadow-sm" aria-label="Clear filters">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default VehicleSortingBanner;
