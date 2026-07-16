/**
 * Design Tokens for Kabisa Charge Map
 * Centralized design system for consistent styling across the application
 */

export const designTokens = {
  // Spacing scale (Tailwind-inspired)
  spacing: {
    xs: '0.5rem',    // 8px - p-2
    sm: '0.75rem',   // 12px - p-3
    md: '1rem',      // 16px - p-4
    lg: '1.5rem',    // 24px - p-6
    xl: '2rem',      // 32px - p-8
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem',  // 6px - rounded-md
    md: '0.5rem',    // 8px - rounded-lg
    lg: '0.75rem',   // 12px - rounded-xl
    xl: '1rem',      // 16px - rounded-2xl
    full: '9999px',  // rounded-full
  },

  // Colors - Organized by purpose
  colors: {
    // Brand colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },

    // Status colors
    status: {
      operational: {
        bg: '#FFF6C2',
        text: '#806900',
        border: '#FFED80',
        indicator: '#FFD400',
      },
      underRepair: {
        bg: '#fef3c7',
        text: '#92400e',
        border: '#fde68a',
        indicator: '#f59e0b',
      },
      closed: {
        bg: '#fee2e2',
        text: '#991b1b',
        border: '#fecaca',
        indicator: '#ef4444',
      },
      beingInstalled: {
        bg: '#dbeafe',
        text: '#1e40af',
        border: '#bfdbfe',
        indicator: '#3b82f6',
      },
      planned: {
        bg: '#f3f4f6',
        text: '#374151',
        border: '#e5e7eb',
        indicator: '#9ca3af',
      },
    },

    // Charger type colors
    charger: {
      kabisaAC: '#f2c200',     // Yellow for Kabisa AC
      kabisaDC: '#ff7a00',     // Orange for Kabisa DC
      competitorAC: '#a0aec0', // Gray for Competitor AC
      competitorDC: '#fb6a6a', // Red for Competitor DC
    },

    // Section colors
    section: {
      charging: {
        bg: '#eff6ff',
        text: '#1e40af',
        icon: '#2563eb',
      },
      payment: {
        bg: '#eff6ff',
        text: '#1e40af',
        icon: '#2563eb',
      },
      location: {
        bg: '#f3e8ff',
        text: '#6b21a8',
        icon: '#7c3aed',
      },
      advanced: {
        bg: '#FFFBE6',
        text: '#4D3F00',
        icon: '#E6BE00',
      },
    },

    // UI colors
    background: {
      light: '#ffffff',
      gray: '#f9fafb',
      dark: '#111827',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
    },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Typography
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
  },

  // Z-index scale
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Breakpoints
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },

  // Map-specific constants
  map: {
    clusterRadius: 50,
    clusterMaxZoom: 14,
    htmlMarkerZoomThreshold: 14,
    initialZoom: 5.5,
    detailZoom: 14,
    initialCenter: {
      latitude: 0.5,
      longitude: 32.5,
    },
  },

  // Mobile search UI tokens
  mobileSearch: {
    pill: {
      height: '48px',
      minWidth: '280px',
      borderRadius: '24px',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      hoverShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
    },
    preview: {
      borderRadius: '24px 24px 0 0',
      maxHeight: '40vh',
      backdropBlur: '12px',
      dragThreshold: '100px',
    },
    expanded: {
      maxHeight: 'calc(100vh - 80px)',
      borderRadius: '0',
    },
    transitions: {
      slideUp: {
        type: 'spring' as const,
        damping: 25,
        stiffness: 300,
      },
      fadeIn: {
        duration: 0.2,
      },
      pillExpand: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 300,
      },
    },
  },
} as const;

// Helper functions for common style combinations
export const getStatusStyles = (status: string) => {
  const normalizedStatus = status?.toLowerCase().replace(/_/g, '');

  switch (normalizedStatus) {
    case 'operational':
      return designTokens.colors.status.operational;
    case 'underrepair':
      return designTokens.colors.status.underRepair;
    case 'closed':
    case 'cancelled':
      return designTokens.colors.status.closed;
    case 'beinginstalled':
      return designTokens.colors.status.beingInstalled;
    case 'plannedforfuturedate':
      return designTokens.colors.status.planned;
    default:
      return designTokens.colors.status.planned;
  }
};

export const getSectionStyles = (section: 'charging' | 'payment' | 'location' | 'advanced') => {
  return designTokens.colors.section[section];
};

// Accessibility helpers
export const a11y = {
  minTouchTarget: '44px',
  focusRing: 'ring-2 ring-blue-500 ring-offset-2',
  srOnly: 'sr-only',
} as const;
