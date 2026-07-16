// components/home/MaintenanceSection.tsx
'use client'

import { LocalizedLink } from '../shared/LocalizedLink'

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string =>
  `https://gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

const styles = `
  .stat-container, .partner-container {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    min-height: 140px;
    width: 100%;
  }

  .partner-container {
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .stat-value {
    color: #34D399;
    font-size: 2.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #D1D5DB;
    font-size: 0.875rem;
  }

  .partner-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      rgba(52, 211, 153, 0.1),
      rgba(52, 211, 153, 0.05)
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .partner-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    border-color: rgba(52, 211, 153, 0.4);
  }

  .partner-container:hover::before {
    opacity: 1;
  }

  .gikondo-logo {
    height: 90px;
    width: auto;
    filter: brightness(0) invert(1);
    object-fit: contain;
    transition: transform 0.3s ease;
  }

  .safe-logo {
    height: 75px;
    width: auto;
    object-fit: contain;
    transition: transform 0.3s ease;
    margin-left: 50px
  }

  .partner-container:hover .gikondo-logo,
  .partner-container:hover .safe-logo {
    transform: scale(1.05);
  }

  .stats-grid, .partners-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    margin-bottom: 2rem;
    width: 100%;
  }
`

const StatsSection = () => (
  <div className="stats-grid">
    <div className="stat-container">
      <div className="stat-value">24/7</div>
      <div className="stat-label">Emergency Support</div>
    </div>
    <div className="stat-container">
      <div className="stat-value">15+</div>
      <div className="stat-label">Expert Technicians</div>
    </div>
  </div>
)

const PartnersSection = () => (
  <div>
    <h3 className="text-white text-lg mb-4">Our Trusted Partners</h3>
    <div className="partners-grid">
      <div className="partner-container">
        <img
          src={cloudflareUrl("/images/content/Gikondo.png", 180, 85)}
          alt="Gikondo Auto Clinic"
          className="gikondo-logo"
          loading="lazy"
        />
      </div>
      <div className="partner-container">
        <img
         src={cloudflareUrl("/images/content/safe.png", 150, 85)}
          alt="Safe Auto Garage"
          className="safe-logo"
          loading="lazy"
        />
      </div>
    </div>
  </div>
)

export default function MaintenanceSection() {
  return (
    <>
      <style>{styles}</style>
      <div className="relative min-h-screen bg-black flex">
        <div className="relative w-full lg:w-1/2 min-h-screen">
          <div className="relative h-full py-20 px-8 md:px-16">
            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
              <div className="space-y-8">
                {/* Title and description section */}
                <div className="space-y-6">
                  <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                    Premium EV Maintenance
                    <span className="block text-emerald-400">& Support</span>
                  </h1>
                  <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                    Keep your electric vehicle in perfect condition with Kabisa's
                    expert maintenance services. Our certified technicians provide
                    comprehensive care, from routine check-ups to advanced
                    diagnostics and repairs.
                  </p>
                  <p className="text-white">
                    30% more affordable repairs compared
                  </p>
                </div>

                <StatsSection />
                <PartnersSection />

                <div>
                  <LocalizedLink href="/maintenance">
                    <button className="px-8 py-4 bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors rounded-lg">
                      Book Maintenance
                    </button>
                  </LocalizedLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side image */}
        <div className="hidden lg:block relative w-1/2 min-h-screen">
          <div className="relative h-full">
            <div className="absolute inset-0 z-10">
              <img
                src={cloudflareUrl("/images/testimage.webp", 1920, 85)}
                alt="Maintenance Garage"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}