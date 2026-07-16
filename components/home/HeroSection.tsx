'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Wrench, Zap, LucideIcon, ChevronDown } from 'lucide-react'
import { Inter } from 'next/font/google'
import { ShopVehicleClassification } from '@/types/shop'
import { LocalizedLink } from '../shared/LocalizedLink'

const inter = Inter({ subsets: ['latin'], weight: ['700'], display: 'swap' })

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

// Main vehicle categories for the hero banner - only show these 4
const vehicleCategories = [
  { classification: 'SUV', label: 'Suv' },
  { classification: 'PICKUP', label: 'Pickup' },
  { classification: 'VAN', label: 'Van' },
  { classification: 'TRUCK', label: 'Truck' }
];

// All vehicle categories for mobile dropdown
const allVehicleCategories = Object.values(ShopVehicleClassification).map(classification => ({
  classification,
  label: classification.replace(/_/g, ' ').toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}));

// The old NavButton component has been removed as it's no longer needed for the new design.

const FlipText = () => {
  const words = ["EV Dealer", "EV Garage Network", "Charging Network"]
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="inline-block min-w-[180px] md:min-w-[250px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="block text-left"
        >
          {words[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

const NavigationMenu = () => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="p-3 sm:p-4 shadow-lg bg-gray-900/60 backdrop-blur-sm relative w-full"
    >
      {/* New Mobile Navigation Dropdown */}
      <div className="xl:hidden relative">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full flex items-center justify-between text-white text-lg sm:text-xl font-semibold p-3 bg-gray-800/50 hover:bg-gray-800/70 transition-colors duration-300 rounded-md"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <span>Browse Categories</span>
          <motion.div
            animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-900/90 backdrop-blur-sm rounded-md shadow-lg overflow-hidden"
            >
              <ul className="flex flex-col p-2">
                {allVehicleCategories.map((category) => (
                  <li key={category.classification}>
                    <LocalizedLink
                      href={`/shop?classification=${category.classification}`}
                      className="block text-white text-left p-3 hover:bg-gray-700/80 rounded-md transition-colors duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.label}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden xl:flex justify-between items-center">
        {vehicleCategories.map((category) => (
          <div
            key={category.classification}
            onMouseEnter={() => setHoveredCategory(category.classification)}
            onMouseLeave={() => setHoveredCategory(null)}
            className="relative group"
          >
            <LocalizedLink
              href={`/shop?classification=${category.classification}`}
              className="block text-center bg-transparent p-2 text-white hover:bg-gray-800 transition-all border-t-2 border-transparent group-hover:border-t-2"
              style={{
                transition: "border-image 0.3s ease",
                borderImage:
                  hoveredCategory === category.classification
                    ? "linear-gradient(to right, yellow, green) 1"
                    : "none",
              }}
            >
              {category.label}
            </LocalizedLink>
          </div>
        ))}
      </div>
    </motion.nav>
  );
};

export default function HeroSection() {
  const [isVideoReady, setIsVideoReady] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [currentSlide] = useState(0)

  // --- START: NEW BUTTON LOGIC ---
  const tabs = [
    { id: 'Vehicles', label: 'Vehicles', href: '/shop', icon: Car },
    { id: 'Charging', label: 'Charging', href: '/charge', icon: Zap },
    { id: 'Maintenance', label: 'Maintenance', href: '/maintenance', icon: Wrench },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  // --- END: NEW BUTTON LOGIC ---


  // Video setup effect
  useEffect(() => {
    if (!videoContainerRef.current) return

    if (document.getElementById('hero-video-styles')) {
        if(videoContainerRef.current && videoContainerRef.current.children.length === 0) {
            const iframe = document.createElement('iframe');
            iframe.className = 'hero-video-iframe';
            iframe.src = `https://customer-4swtfagaktt9cs7q.cloudflarestream.com/905f6c09195461d6c12c3483617b216c/iframe?preload=true&loop=true&autoplay=true&muted=true&controls=false&poster=https%3A%2F%2Fcustomer-4swtfagaktt9cs7q.cloudflarestream.com%2F905f6c09195461d6c12c3483617b216c%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`;
            iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';
            iframe.allowFullscreen = true;
            videoContainerRef.current.appendChild(iframe);
        }
        return;
    }

    try {
      const iframe = document.createElement('iframe')
      iframe.src = `https://customer-4swtfagaktt9cs7q.cloudflarestream.com/905f6c09195461d6c12c3483617b216c/iframe?preload=true&loop=true&autoplay=true&muted=true&controls=false&poster=https%3A%2F%2Fcustomer-4swtfagaktt9cs7q.cloudflarestream.com%2F905f6c09195461d6c12c3483617b216c%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`
      
      iframe.className = 'hero-video-iframe'
      iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;'
      iframe.allowFullscreen = true
      
      const style = document.createElement('style')
      style.id = 'hero-video-styles'
      style.textContent = `
        .hero-video-iframe {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 56.25vw; /* 16:9 aspect ratio */
          min-height: 100vh;
          min-width: 177.77vh; /* 16:9 aspect ratio for tall screens */
          transform: translate(-50%, -50%);
          border: none;
        }
      `
      document.head.appendChild(style)
      
      videoContainerRef.current.innerHTML = ''
      videoContainerRef.current.appendChild(iframe)
      
      setTimeout(() => setIsVideoReady(true), 1000)
    } catch (error) {
      console.error('Error creating video iframe:', error)
    }

    return () => {
        const styleTag = document.getElementById('hero-video-styles');
        if (styleTag) {
            document.head.removeChild(styleTag);
        }
    }
  }, [currentSlide])

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-black/30 z-10"></div>
        
        <div 
          ref={videoContainerRef}
          className={`absolute inset-0 w-full h-full bg-black overflow-hidden transition-opacity duration-700 ${
            isVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      <div className="relative z-20 mt-20">
        <div className="absolute inset-0 flex flex-col items-center pt-16 md:pt-23">
          <div className="relative z-30 w-full max-w-6xl mx-auto pt-16 md:pt-24 px-4 md:px-8 text-white text-center">
            <NavigationMenu />
          </div>

          <motion.div
            className="max-w-8xl mx-auto pt-20 md:pt-32 text-white text-center px-4"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.5 } }}
          >
            <h1 className="text-2xl md:text-4xl font-bold mb-4">
              <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap px-2">
                <img
                  src={cloudflareUrl("/kabisaa.png", 240, 90)}
                  alt="Kabisa"
                  className="h-7 md:h-10 w-auto object-contain"
                  loading="eager"
                />
                <span className="whitespace-nowrap">is East Africa's Largest</span>
                <FlipText />
              </div>
            </h1>

            {/* --- START: REDESIGNED BUTTONS --- */}
            <motion.div
              className="flex justify-center mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}
            >
              <div className="flex items-center space-x-1 p-1 rounded-lg border border-white/20 bg-black/20 backdrop-blur-sm w-auto max-w-[90vw] sm:w-auto">
                {tabs.map((tab) => (
                  <LocalizedLink
                    key={tab.id}
                    href={tab.href}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id ? "" : "hover:bg-white/10"
                    } relative w-auto min-w-0 text-center px-2 sm:px-4 py-2 sm:py-2.5 rounded-md transition-colors text-xs sm:text-sm md:text-base font-medium`}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="active-hero-pill"
                        className="absolute inset-0 bg-zinc-800"
                        style={{ borderRadius: 6 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2 text-white">
                      <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-white">{tab.label}</span>
                    </span>
                  </LocalizedLink>
                ))}
              </div>
            </motion.div>
            {/* --- END: REDESIGNED BUTTONS --- */}

          </motion.div>
        </div>
      </div>
    </section>
  )
}