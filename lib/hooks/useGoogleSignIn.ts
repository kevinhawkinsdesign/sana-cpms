import { useEffect } from 'react';

// Declare Google types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options?: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface UseGoogleSignInOptions {
  callback: (response: unknown) => void;
  buttonId: string;
  buttonOptions?: {
    type?: string;
    theme?: string;
    size?: string;
    text?: string;
    shape?: string;
    logo_alignment?: string;
    width?: number;
  };
  autoSelect?: boolean;
  dependencies?: unknown[];
}

export function useGoogleSignIn({
  callback,
  buttonId,
  buttonOptions = {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill',
    logo_alignment: 'left',
    width: 320,
  },
  autoSelect = false,
  dependencies = [],
}: UseGoogleSignInOptions) {
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            callback,
            auto_select: autoSelect,
          });

          const element = document.getElementById(buttonId);
          if (element) {
            element.innerHTML = '';
            try {
              window.google.accounts.id.renderButton(element, buttonOptions as Record<string, unknown>);
            } catch (error) {
              // Silently handle errors - don't break the page
              console.warn('Google Sign-In button could not be rendered:', error);
            }
          }
        } catch (error) {
          // Silently handle errors - don't break the page
          console.warn('Google Sign-In could not be initialized:', error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        // Wait for Google script to load
        const checkGoogle = setInterval(() => {
          if (window.google) {
            initializeGoogleSignIn();
            clearInterval(checkGoogle);
          }
        }, 100);
      }
    }
  }, [callback, buttonId, autoSelect, buttonOptions, ...dependencies]);
}



