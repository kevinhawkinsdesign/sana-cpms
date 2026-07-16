// components/home/Ecosystem.tsx
'use client'

import { useEffect, useState } from 'react'

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

export default function EcosystemSection() {
  const [isMobile, setIsMobile] = useState(false)

  // Check screen size on client side only
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    
    // Initial check
    checkMobile()
    
    // Re-check on resize
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return (
    <div className="w-full bg-white mt-1">
      <style jsx>{`
        @media (max-width: 1024px) {
          .mobile-eco {
            margin-top: -130px !important;
          }
        }
      `}</style>

      <div className="w-full">
        <div className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden mt-8">
          {/* Desktop Image */}
          <div className="hidden lg:block w-full h-full">
            <img
              src={cloudflareUrl("/eco.png", 1600, 85)}
              alt="Kabisa Ecosystem Diagram"
              className="w-full h-full object-contain scale-90 -translate-y-8"
              style={{ objectPosition: "center center" }}
              loading="eager"
            />
          </div>

          {/* Mobile Image */}
          <div className="lg:hidden w-full h-full">
            <img
              src={cloudflareUrl("/mobileEco.png", 800, 85)}
              alt="Kabisa Ecosystem Diagram"
              className="w-full h-full object-contain scale-125 -translate-y-8 mobile-eco"
              style={{ objectPosition: "center center" }}
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  )
}