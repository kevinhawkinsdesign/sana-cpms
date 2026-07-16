// components/home/HomeClient.tsx
'use client'

import React, { useEffect, useState, memo, Suspense } from 'react'
import { useInView } from 'react-intersection-observer'
import dynamic from 'next/dynamic'
import HomepageSkeleton from '@/components/skeletons/HomepageSkeleton'
import SectionWrapper from '@/components/shared/SectionWrapper'
import { useClarity } from '@/lib/hooks/useClarity'

// SSR + Suspense for hero (makes your LCP that headline + "KABISA" text)
const HeroSection = dynamic(
  () => import('@/components/home/HeroSection'),
  { ssr: true }
)

interface SectionConfig {
  key: string
  loader: () => Promise<{ default: React.ComponentType<any> }>
  name: string
  className: string
  type: string
}

const sectionsConfig: SectionConfig[] = [
  // {
  //   key: 'cars',
  //   loader: () => import('@/components/home/CarShowcase'),
  //   name: 'Car Showcase',
  //   className: 'bg-white',
  //   type: 'cars',
  // },
  {
    key: 'cars',
    loader: () => import('@/components/home/feature'),
    name: 'Car Showcase',
    className: 'bg-white',
    type: 'cars',
  },
  {
    key: 'charging',
    loader: () => import('@/components/home/EVCharging'),
    name: 'Charging Services',
    className: 'bg-gray-50',
    type: 'charging',
  },
  {
    key: 'maintenance',
    loader: () => import('@/components/home/MaintenanceSection'),
    name: 'Maintenance Section',
    className: 'bg-white',
    type: 'maintenance',
  },
  {
    key: 'ecosystem',
    loader: () => import('@/components/home/Ecosystem'),
    name: 'Ecosystem Section',
    className: 'bg-gray-50',
    type: 'ecosystem',
  },
  {
    key: 'testimonials',
    loader: () => import('@/components/home/TestimonialsSection'),
    name: 'Testimonials Section',
    className: 'bg-white',
    type: 'testimonials',
  },
  {
    key: 'articles',
    loader: () => import('@/components/blog/Article'),
    name: 'Recent Articles',
    className: 'bg-white',
    type: 'articles',
  },
]

function LazySection({ config }: { config: SectionConfig }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  })
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null)
  const { trackEvent } = useClarity()

  useEffect(() => {
    if (inView && !Component) {
      config.loader().then((mod) => setComponent(() => mod.default))
      
      // Track section engagement
      trackEvent('homepage_section_viewed', {
        section: config.key,
        section_name: config.name,
        section_type: config.type
      })
    }
  }, [inView, Component, config, trackEvent])

  return (
    <div ref={ref}>
      <SectionWrapper name={config.name} className={config.className}>
        {Component ? (
          <Component />
        ) : (
          // @ts-ignore
          <HomepageSkeleton type={config.type} />
        )}
      </SectionWrapper>
    </div>
  )
}

function HomeClient() {
  const { trackEvent } = useClarity()
  
  useEffect(() => {
    // Priority-preload the Hero chunk
          // @ts-ignore
    if (HeroSection.preload) HeroSection.preload()
    performance.mark('home-client-mounted')
    
    // Track homepage view
    trackEvent('homepage_viewed', {
      page: 'homepage',
      sections_count: sectionsConfig.length
    })
  }, [trackEvent])

  return (
    <main>
      <Suspense
        fallback={
          <div
            className="h-screen bg-gray-900 animate-pulse"
            aria-label="Loading hero…"
          />
        }
      >
        <HeroSection />
      </Suspense>

      {sectionsConfig.map((config) => (
        <LazySection key={config.key} config={config} />
      ))}
    </main>
  )
}

export default memo(HomeClient)
