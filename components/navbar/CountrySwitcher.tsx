"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe} from "lucide-react";
import { cn } from "@/lib/utils";
import { FaChevronDown } from "react-icons/fa6";
import { useRouter, usePathname } from "next/navigation";
import { useCountry } from "@/lib/providers/country-provider";

interface CountrySwitcherProps {
  className?: string; // Allow custom styling from parent
}

export function CountrySwitcher({ className }: CountrySwitcherProps) {
  const { countryCode, countryName } = useCountry();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (newCountry: 'rw' | 'ke') => {
    const pathWithoutCountry = pathname.replace(/^\/[^\/]+/, '') || '/';
    const query = typeof window !== "undefined" ? window.location.search : '';
    const hash = typeof window !== "undefined" ? window.location.hash : '';
  
    const fullPath = `/${newCountry}${pathWithoutCountry}${query}${hash}`;
    router.push(fullPath);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[#FFD60A] bg-transparent md:bg-[#002451] hover:bg-[#FFD60A]/10 transition-colors focus:outline-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Switch country"
      >
        <div className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">{countryName}</span>
        </div>
        <FaChevronDown className={cn("w-4 h-4 ml-2 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-50 border border-gray-200"
          >
            <button
              onClick={() => handleSelect('rw')}
              className={cn(
                'block w-full text-left px-4 py-2 text-sm rounded-t-lg',
                countryCode === 'rw' 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              🇷🇼 Rwanda
            </button>
            <button
              onClick={() => handleSelect('ke')}
              className={cn(
                'block w-full text-left px-4 py-2 text-sm rounded-b-lg',
                countryCode === 'ke'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              🇰🇪 Kenya
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}