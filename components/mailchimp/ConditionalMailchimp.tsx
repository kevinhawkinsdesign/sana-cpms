'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

const MAILCHIMP_SEEN_KEY = 'mailchimp_popup_last_seen';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

const ConditionalMailchimp = () => {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Pages where Mailchimp should NOT appear
    const excludedPaths = [
      '/dashboard',
      '/auth',
      '/login',
      '/sentry-example-page',
      '/unsupported',
      '/form'
    ];

    // Check if current path should exclude Mailchimp
    // Handles both direct paths (/dashboard) and country-prefixed paths (/rw/dashboard, /ke/dashboard)
    const shouldExclude = excludedPaths.some(path => {
      // Match either the exact path, or a country-prefixed path like /rw/path or /ke/path
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^(\/[a-z]{2})?${escapedPath}(\/|$)`);
      return regex.test(pathname);
    });

    // Check if popup was seen within last 3 days
    let lastSeen: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        lastSeen = localStorage.getItem(MAILCHIMP_SEEN_KEY);
      }
    } catch (error) {
      if (error instanceof DOMException) {
        console.warn('localStorage access denied:', error.message);
      }
    }
    const hasSeenRecently = lastSeen && (Date.now() - parseInt(lastSeen)) < THREE_DAYS_MS;

    // Only load on marketing/public pages AND if not seen recently
    setShouldLoad(!shouldExclude && !hasSeenRecently);
  }, [pathname]);

  // Setup observer to detect when popup is shown/closed
  useEffect(() => {
    if (!shouldLoad) return;

    // Wait for Mailchimp to load and then setup observer
    const setupObserver = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            // Check if the added node is the Mailchimp popup
            if (node instanceof HTMLElement) {
              // Mailchimp popup typically has id="mc-embedded-subscribe-form" or class containing "mc-modal"
              if (
                node.id?.includes('mc') ||
                node.className?.includes('mc-modal') ||
                node.className?.includes('mc_embed_signup')
              ) {
                // Mark as seen when popup appears
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem(MAILCHIMP_SEEN_KEY, Date.now().toString());
                  }
                } catch (error) {
                  if (error instanceof DOMException) {
                    console.warn('localStorage access denied:', error.message);
                  }
                }
              }
            }
          });
        });
      });

      // Observe the entire document for new nodes
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    };

    // Delay setup to allow Mailchimp script to load
    const timer = setTimeout(setupObserver, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [shouldLoad]);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Script
      id="mcjs"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(c,h,i,m,p){m=c.createElement(h),p=c.getElementsByTagName(h)[0],m.async=1,m.src=i,p.parentNode.insertBefore(m,p)}(document,"script","https://chimpstatic.com/mcjs-connected/js/users/d8e12c413dc8c987c123b962a/53709be2591fe1cd1c6fbd7db.js");
        `,
      }}
    />
  );
};

export default ConditionalMailchimp;