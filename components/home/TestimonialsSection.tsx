'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useAnimation } from 'framer-motion'
import Link from 'next/link'

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

const partnerLogos = [
  { id: 2, name: 'Solid', path: '/images/content/solid.png', url: 'https://www.solidafrica.org/' },
  { id: 3, name: 'Irembo', path: '/images/content/irembo.png', url: 'https://irembo.gov.rw/' },
  { id: 4, name: 'Heaven', path: '/images/content/heaven.png', url: 'https://theretreatrwanda.com/dining/?gad_source=1&gclid=Cj0KCQjwzYLABhD4ARIsALySuCR9nfrCBoxV1SbFPIhO1Dyz3mrfhl_fLiBLoidUL1ASN6kXftuRrJgaAtvmEALw_wcB' },
  { id: 5, name: 'Sawaa', path: '/images/content/sawaa.png', url: 'https://app.isokko.com/store/sawaciti' },
  { id: 6, name: 'Amper', path: '/images/amper.png', url: 'https://www.ampersand.solar/' },
  { id: 7, name: 'Mesh', path: '/images/mesh.png', url: 'https://www.meshpower.co.rw/' },
  { id: 8, name: 'SNV', path: '/images/content/snv.png', url: 'https://www.snv.org/' },
  { id: 9, name: 'UNICEF', path: '/images/content/unicef.png', url: 'https://www.unicef.org/rwanda/' },
  { id: 10, name: 'Winnaz', path: '/images/content/winnaz.png', url: 'https://winnazworld.com/' },
  { id: 11, name: 'Basi', path: '/images/content/basi.png', url: 'https://www.basi-go.com/rwanda' },
  { id: 12, name: 'Kivu', path: '/images/content/kivu.png', url: 'https://kivuchoice.com/' },
  { id: 13, name: 'Living', path: '/images/content/living.png', url: 'https://livinginkigali.com/' },
  { id: 14, name: 'Mass', path: '/images/content/mass.png', url: 'https://massdesigngroup.org/' },
  { id: 15, name: 'Swiss', path: '/images/content/swiss.png', url: 'https://www.eda.admin.ch/countries/rwanda/en/home/representations/swiss-cooperation-office.html/content/contacts/en/EDAVis/K/393.html' },
  { id: 16, name: 'Forensic', path: '/images/content/forensic.png', url: 'https://www.rfi.gov.rw/' },
  { id: 17, name: 'Ox', path: '/images/content/ox.png', url: 'https://www.oxdelivers.com/' },
  { id: 18, name: 'Fund', path: '/images/content/fund.png', url: 'https://greenfund.rw/' },
  { id: 19, name: 'SP', path: '/images/content/SP.png', url: 'https://www.sprwanda.com/services' },
  { id: 20, name: 'REG', path: '/images/content/REG.png', url: 'https://www.reg.rw/index.php?id=2' },
]

export default function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.1 })
  const controls = useAnimation()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isInView) {
      controls.start({ opacity: 1, y: 0 })
      const timer = setTimeout(() => {
        setIsLoaded(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isInView, controls])

  const initialLogoCount = 10
  const visibleLogos = isLoaded ? partnerLogos : partnerLogos.slice(0, initialLogoCount)

  return (
    <section
      className="mt-[-20px] sm:mt-[30px] lg:mt-[-50px] overflow-hidden"
      ref={ref}
      aria-labelledby="testimonials-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
        className="text-center mb-4 sm:mb-8"
      >
        <h3 id="testimonials-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
          Trusted Clients
        </h3>
      </motion.div>

      <div className="logo-slider relative" aria-label="Client logos carousel">
        <div className="absolute top-0 left-0 w-16 h-full bg-gradient-to-r from-white to-transparent z-10" aria-hidden="true" />
        <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-white to-transparent z-10" aria-hidden="true" />

        <div className="slide-track">
          {visibleLogos.map((partner) => {
            const isLarge = ['Mesh', 'Amper', 'Irembo', 'Ox'].includes(partner.name)
            return (
              <div key={partner.id} className="logo-item">
                <Link
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="logo-link"
                  aria-label={`Visit ${partner.name}'s website`}
                >
                  <img
                    src={cloudflareUrl(partner.path, isLarge ? 480 : 240, 85)}
                    alt={`${partner.name} logo`}
                    className={`partner-logo ${isLarge ? 'scale-150' : ''}`}
                    loading={partner.id <= initialLogoCount ? "eager" : "lazy"}
                  />
                </Link>
              </div>
            )
          })}

          {visibleLogos.slice(0, 7).map((partner) => {
            const isLarge = ['Mesh', 'Amper', 'Irembo', 'Ox'].includes(partner.name)
            return (
              <div key={`repeat-${partner.id}`} className="logo-item" aria-hidden="true">
                <Link
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="logo-link"
                  tabIndex={-1}
                >
                  <img
                    src={cloudflareUrl(partner.path, isLarge ? 480 : 240, 85)}
                    alt=""
                    className={`partner-logo ${isLarge ? 'scale-150' : ''}`}
                    loading="lazy"
                  />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .logo-slider {
          width: 100%;
          overflow: hidden;
          padding: 2rem 0;
          position: relative;
        }

        .slide-track {
          display: flex;
          animation: slide 40s linear infinite;
          will-change: transform;
        }

        .logo-item {
          flex: 0 0 auto;
          width: 240px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem;
        }

        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-240px * ${Math.min(7, partnerLogos.length)}));
          }
        }

        :global(.logo-link) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          transition: transform 0.3s ease;
        }

        :global(.logo-link:hover) {
          transform: scale(1.1);
        }

        :global(.partner-logo) {
          max-width: 100%;
          max-height: 120px;
          object-fit: contain;
        }

        @media (max-width: 640px) {
          .logo-item {
            width: 180px;
            height: 120px;
          }

          :global(.partner-logo) {
            max-height: 80px;
          }

          @keyframes slide {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-180px * ${Math.min(7, partnerLogos.length)}));
            }
          }
        }
      `}</style>
    </section>
  )
}
