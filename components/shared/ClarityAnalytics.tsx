"use client"

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

interface ClarityAnalyticsProps {
  clarityId: string
}

export function ClarityAnalytics({ clarityId }: ClarityAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page views when the route changes
    if (typeof window !== 'undefined' && window.clarity && pathname) {
      const searchString = searchParams?.toString() || ''
      const fullPath = pathname + (searchString ? `?${searchString}` : '')
      
      // Track page view
      window.clarity('set', 'page_view', fullPath)
      
      // You can also track custom events here
      // window.clarity('event', 'page_viewed', { path: fullPath })
    }
  }, [pathname, searchParams])

  // Track user interactions and custom events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.clarity) {
      // Track form submissions
      const trackFormSubmission = (event: Event) => {
        const target = event.target as HTMLFormElement
        if (target.tagName === 'FORM') {
          window.clarity('event', 'form_submitted', {
            form_id: target.id || target.className,
            form_action: target.action
          })
        }
      }

      // Track button clicks
      const trackButtonClick = (event: Event) => {
        const target = event.target as HTMLElement
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          const button = target.tagName === 'BUTTON' ? target : target.closest('button')
          if (button) {
            window.clarity('event', 'button_clicked', {
              button_text: button.textContent?.trim(),
              button_id: button.id || button.className
            })
          }
        }
      }

      // Track link clicks
      const trackLinkClick = (event: Event) => {
        const target = event.target as HTMLElement
        if (target.tagName === 'A' || target.closest('a')) {
          const link = target.tagName === 'A' ? target : target.closest('a')
          if (link) {
            window.clarity('event', 'link_clicked', {
              link_text: link.textContent?.trim(),
              link_href: link.getAttribute('href'),
              link_id: link.id || link.className
            })
          }
        }
      }

      // Add event listeners
      document.addEventListener('submit', trackFormSubmission)
      document.addEventListener('click', trackButtonClick)
      document.addEventListener('click', trackLinkClick)

      // Cleanup event listeners
      return () => {
        document.removeEventListener('submit', trackFormSubmission)
        document.removeEventListener('click', trackButtonClick)
        document.removeEventListener('click', trackLinkClick)
      }
    }
  }, [])

  if (!clarityId) {
    console.warn('Microsoft Clarity ID not provided. Clarity analytics will not be loaded.')
    return null
  }

  return (
    <>
      <Script
        id="microsoft-clarity"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `,
        }}
      />
    </>
  )
}

// Add Clarity to the global window object for TypeScript
declare global {
  interface Window {
    clarity: (command: string, ...args: any[]) => void
  }
} 