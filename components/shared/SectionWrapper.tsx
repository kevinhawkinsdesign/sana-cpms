'use client'

import { useEffect, useRef } from 'react'

interface SectionWrapperProps {
  children: React.ReactNode
  name: string
  className?: string
}

export default function SectionWrapper({ children, name, className = '' }: SectionWrapperProps) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentRef = sectionRef.current
    if (!currentRef || typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Unobserve after first view to prevent multiple triggers
            observer.unobserve(currentRef)
          }
        })
      },
      {
        threshold: 0.5, // Trigger when 50% of the section is visible
        rootMargin: '0px',
      }
    )

    observer.observe(currentRef)

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [name])

  return (
    <section ref={sectionRef} className={className}>
      {children}
    </section>
  )
}
