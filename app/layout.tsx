import "@/app/globals.css";
import { MobileNavProvider } from "@/lib/providers/mobile-nav-provider";
import { Providers } from "@/lib/providers";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { Polyfills } from "@/app/polyfills";
import Script from "next/script";
import { headers } from 'next/headers';
import ConditionalMailchimp from "@/components/mailchimp/ConditionalMailchimp";
import LiveChatGate from "@/components/LiveChatGate";

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Block SEO for test subdomain
  if (host === 'test.gokabisa.com') {
    return {
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      other: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    };
  }
  
  // Allow SEO for production domains
  return {
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CRITICAL: localStorage polyfill MUST run FIRST, before any other scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                if (typeof window === 'undefined') return;
                
                // IMMEDIATELY catch any localStorage SecurityErrors before they propagate
                const originalOnError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  if (error && error.name === 'SecurityError' && 
                      (msg && (msg.includes('localStorage') || msg.includes('localStorage'))) ||
                       (error.message && error.message.includes('localStorage'))) {
                    // Suppress the error - we'll handle it with our polyfill
                    return true;
                  }
                  if (originalOnError) {
                    return originalOnError.apply(this, arguments);
                  }
                  return false;
                };
                
                // Also catch errors via addEventListener (catches errors that onerror might miss)
                window.addEventListener('error', function(event) {
                  if (event.error && event.error.name === 'SecurityError' &&
                      event.error.message && event.error.message.includes('localStorage')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true); // Use capture phase to catch early
                
                // Catch unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && event.reason.name === 'SecurityError' &&
                      event.reason.message && event.reason.message.includes('localStorage')) {
                    event.preventDefault();
                    return false;
                  }
                });
                
                // Store original localStorage if it exists (with error handling)
                let originalLocalStorage;
                try {
                  originalLocalStorage = window.localStorage;
                } catch (e) {
                  // If we can't even read it, we're definitely sandboxed
                  originalLocalStorage = null;
                }
                
                // Check if we're in a sandboxed context
                let isSandboxed = false;
                try {
                  // Try to access localStorage to detect sandbox
                  if (originalLocalStorage) {
                    originalLocalStorage.getItem('__test__');
                  }
                } catch (error) {
                  if (error instanceof DOMException && error.name === 'SecurityError') {
                    isSandboxed = true;
                  }
                }
                
                // Helper function to handle SecurityError and switch to sandboxed mode
                const handleSecurityError = (error, fallbackFn) => {
                  if (error instanceof DOMException && error.name === 'SecurityError') {
                    isSandboxed = true;
                    return fallbackFn();
                  }
                  throw error;
                };
                
                // Helper to safely execute localStorage operations with fallback
                const safeExecute = (operation, fallbackFn, errorMsg) => {
                  if (isSandboxed) {
                    return fallbackFn();
                  }
                  try {
                    if (!originalLocalStorage) {
                      return fallbackFn();
                    }
                    return operation();
                  } catch (error) {
                    try {
                      return handleSecurityError(error, fallbackFn);
                    } catch (rethrown) {
                      if (errorMsg) {
                        console.warn(errorMsg, error.message);
                      }
                      return fallbackFn();
                    }
                  }
                };
                
                // Create safe localStorage wrapper
                const createSafeStorage = () => {
                  const storage = {
                    _data: {},
                    getItem: function(key) {
                      return safeExecute(
                        () => originalLocalStorage.getItem(key),
                        () => this._data[key] || null,
                        'localStorage getItem error:'
                      );
                    },
                    setItem: function(key, value) {
                      safeExecute(
                        () => { originalLocalStorage.setItem(key, String(value)); },
                        () => { this._data[key] = String(value); },
                        'localStorage setItem error:'
                      );
                    },
                    removeItem: function(key) {
                      safeExecute(
                        () => { originalLocalStorage.removeItem(key); },
                        () => { delete this._data[key]; },
                        'localStorage removeItem error:'
                      );
                    },
                    clear: function() {
                      safeExecute(
                        () => { originalLocalStorage.clear(); },
                        () => { this._data = {}; },
                        'localStorage clear error:'
                      );
                    },
                    get length() {
                      return safeExecute(
                        () => originalLocalStorage.length,
                        () => Object.keys(this._data).length
                      );
                    },
                    key: function(index) {
                      return safeExecute(
                        () => originalLocalStorage.key(index),
                        () => {
                          const keys = Object.keys(this._data);
                          return keys[index] || null;
                        }
                      );
                    }
                  };
                  
                  // Try to migrate existing data if possible
                  if (originalLocalStorage && !isSandboxed) {
                    try {
                      for (let i = 0; i < originalLocalStorage.length; i++) {
                        const key = originalLocalStorage.key(i);
                        if (key) {
                          storage._data[key] = originalLocalStorage.getItem(key);
                        }
                      }
                    } catch (e) {
                      // Ignore migration errors
                    }
                  }
                  
                  return storage;
                };
                
                const safeStorage = createSafeStorage();
                
                // Try to replace window.localStorage using a getter to intercept property access
                // This MUST use a getter to prevent SecurityError on property access
                try {
                  // Try to delete the existing property descriptor first
                  try {
                    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
                    if (descriptor && descriptor.configurable) {
                      delete window.localStorage;
                    }
                  } catch (e) {
                    // Ignore if we can't delete it - we'll try to override anyway
                  }
                  
                  // Define with a getter to intercept ALL property access
                  // The getter never throws, preventing SecurityError on property access
                  Object.defineProperty(window, 'localStorage', {
                    get: function() {
                      return safeStorage;
                    },
                    set: function() {
                      // Prevent overwriting - do nothing
                    },
                    configurable: false,
                    enumerable: true
                  });
                } catch (e) {
                  // If we can't replace it, patch the methods
                  if (originalLocalStorage) {
                    const patchMethod = (method) => {
                      try {
                        const original = originalLocalStorage[method];
                        originalLocalStorage[method] = function(...args) {
                          try {
                            return original.apply(this, args);
                          } catch (error) {
                            if (error instanceof DOMException && error.name === 'SecurityError') {
                              return safeStorage[method](...args);
                            }
                            throw error;
                          }
                        };
                      } catch (e) {
                        // Ignore patching errors
                      }
                    };
                    ['getItem', 'setItem', 'removeItem', 'clear', 'key'].forEach(patchMethod);
                  }
                }
                
                // Also patch Storage.prototype to catch any direct access
                if (typeof Storage !== 'undefined' && Storage.prototype) {
                  const patchPrototypeMethod = (method) => {
                    try {
                      const original = Storage.prototype[method];
                      Storage.prototype[method] = function(...args) {
                        try {
                          return original.apply(this, args);
                        } catch (error) {
                          if (error instanceof DOMException && error.name === 'SecurityError') {
                            return safeStorage[method](...args);
                          }
                          throw error;
                        }
                      };
                    } catch (e) {
                      // Ignore patching errors
                    }
                  };
                  ['getItem', 'setItem', 'removeItem', 'clear', 'key'].forEach(patchPrototypeMethod);
                }
              })();
            `
          }}
        />
        {/* Browser Support Detection */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `window.__esm=1`
          }}
        />
        <script
          noModule
          dangerouslySetInnerHTML={{
            __html: `window.__esm||location.replace('/unsupported')`
          }}
        />
        {/* Browser support check - moved here after localStorage polyfill */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (!document.querySelector || !window.addEventListener || !window.Promise) {
                  location.replace('/unsupported');
                }
              } catch(e) {
                location.replace('/unsupported');
              }
            `
          }}
        />
        
        {/* Google Sign-In Script */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        {/* Mailchimp Integration - Conditional Loading */}
      </head>
      <body suppressHydrationWarning>
        <noscript>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#f59e0b',
            color: '#000',
            padding: '12px',
            textAlign: 'center' as const,
            zIndex: 9999,
            fontFamily: 'system-ui, sans-serif'
          }}>
            JavaScript is required for this application. 
            <a href="/unsupported" style={{ color: '#000', textDecoration: 'underline', marginLeft: '8px' }}>
              Learn more about browser requirements
            </a>
          </div>
        </noscript>
        
        <Polyfills />
        <MobileNavProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
            <Providers>
              {children}
              <ConditionalMailchimp />
              {/* <LiveChatGate /> */}
            </Providers>
          </ThemeProvider>
        </MobileNavProvider>
      </body>
    </html>
  );
}