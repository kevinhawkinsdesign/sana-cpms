import React from 'react';

interface PageMeta {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
  author?: string;
  keywords?: string[];
  noIndex?: boolean;
  noFollow?: boolean;
  canonical?: string;
  alternateLanguages?: { hreflang: string; href: string }[];
  structuredData?: Record<string, any>;
}

interface SiteConfig {
  baseUrl: string;
  siteName: string;
  defaultImage: string;
  twitterHandle: string;
  facebookAppId?: string;
  themeColor: string;
  backgroundColor: string;
  locale: string;
  author: string;
  organization: {
    name: string;
    logo: string;
    url: string;
    contactPoint?: {
      telephone: string;
      contactType: string;
    };
    sameAs?: string[];
  };
}

const siteConfig: SiteConfig = {
  baseUrl: "https://gokabisa.com",
  siteName: "Kabisa",
  defaultImage: "https://gokabisa.com/kabisa_blue.png", // Matches your original
  twitterHandle: "@gokabisa", // Update with actual Twitter handle
  facebookAppId: undefined, // Add if you have a Facebook App ID
  themeColor: "#1a73e8", // Kabisa brand color
  backgroundColor: "#ffffff",
  locale: "en_US",
  author: "Kabisa Team",
  organization: {
    name: "Kabisa",
    logo: "https://gokabisa.com/kabisa_blue.png", // Using same image for structured data
    url: "https://gokabisa.com",
    contactPoint: {
      telephone: "+250-XXX-XXX-XXX", // Update with actual phone
      contactType: "Customer service"
    },
    sameAs: [
      // Add your actual social media URLs
      "https://www.facebook.com/gokabisa",
      "https://twitter.com/gokabisa",
      "https://www.linkedin.com/company/kabisa",
      "https://www.instagram.com/gokabisa"
    ]
  }
};

const getPageMeta = (pathname: string): PageMeta => {
  const baseName = siteConfig.siteName;
  const baseUrl = siteConfig.baseUrl;

  const routes: Record<string, PageMeta> = {
    "/": {
      title: `${baseName} - Leading EV Ecosystem in Africa`,
      description: "Explore Kabisa's full EV ecosystem: EV sales, importing, charging stations, and maintenance. Join us in driving sustainable transportation forward in Rwanda and Africa.",
      type: "website",
      keywords: ["electric vehicles", "EV ecosystem", "Rwanda", "Africa", "sustainable transport", "charging stations"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.organization.name,
        url: siteConfig.organization.url,
        logo: siteConfig.organization.logo,
        contactPoint: siteConfig.organization.contactPoint,
        sameAs: siteConfig.organization.sameAs
      }
    },
    "/shop": {
      title: `${baseName} - EV Shop | Electric Vehicles for Sale`,
      description: "Browse and purchase electric vehicles from our curated selection. Find the perfect EV for your needs with detailed specifications and competitive pricing.",
      type: "website",
      keywords: ["EV shop", "electric vehicles for sale", "buy electric car", "EV dealer"],
    },
    "/shop/vehicle": {
      title: `${baseName} - Vehicle Details | Electric Vehicle Specifications`,
      description: "Detailed information about our electric vehicles including specifications, features, pricing, and availability. Make an informed EV purchase decision.",
      type: "product",
      keywords: ["EV specifications", "electric vehicle details", "EV features", "vehicle information"],
    },
    "/shopping": {
      title: `${baseName} - Vehicle Listings | Browse Electric Vehicles`,
      description: "Explore our complete collection of electric vehicles available for purchase. Compare models, prices, and features to find your ideal EV.",
      type: "website",
      keywords: ["EV listings", "electric vehicle catalog", "compare EVs", "vehicle browse"],
    },
    "/maintenance": {
      title: `${baseName} - EV Maintenance Services | Professional Electric Vehicle Care`,
      description: "Professional maintenance services for your electric vehicle. Expert technicians, genuine parts, and comprehensive care to keep your EV running efficiently.",
      type: "service",
      keywords: ["EV maintenance", "electric vehicle service", "EV repair", "vehicle care"],
    },
    "/charge": {
      title: `${baseName} - EV Charging Solutions | Find Charging Stations`,
      description: "Find charging stations and manage your charging sessions. Access our comprehensive network of fast and reliable EV charging infrastructure.",
      type: "website",
      keywords: ["EV charging", "charging stations", "electric vehicle charging", "charging network"],
    },
    "/charge/howto": {
      title: `${baseName} - How to Charge Your EV | Comprehensive Charging Guide`,
      description: "Learn how to charge your electric vehicle with our comprehensive guide. Step-by-step instructions for safe and efficient EV charging.",
      type: "article",
      keywords: ["how to charge EV", "EV charging guide", "electric vehicle charging tutorial"],
    },
    "/how-to-charge": {
      title: `${baseName} - EV Charging Tutorial | Safe Charging Practices`,
      description: "Step-by-step tutorial on charging your electric vehicle safely and efficiently. Master the art of EV charging with expert tips.",
      type: "article",
      keywords: ["EV charging tutorial", "safe charging", "charging best practices"],
    },
    "/charge/survey": {
      title: `${baseName} - Charging Experience Survey | Share Your Feedback`,
      description: "Share your feedback about your charging experience. Help us improve our EV charging network and services.",
      type: "website",
      keywords: ["charging feedback", "EV survey", "customer experience"],
      noIndex: true, // Survey pages typically shouldn't be indexed
    },

    // Account Pages
    "/auth/login": {
      title: `${baseName} - Login | Access Your Account`,
      description: "Access your Kabisa account to manage your EV services, view charging history, and track maintenance schedules.",
      type: "website",
      noIndex: true, // Auth pages shouldn't be indexed
    },
    "/auth/signup": {
      title: `${baseName} - Create Account | Join Kabisa`,
      description: "Join Kabisa and access our electric vehicle services. Create your account to get started with sustainable transportation.",
      type: "website",
      noIndex: true,
    },
    "/auth/forgot-password": {
      title: `${baseName} - Password Recovery | Reset Your Password`,
      description: "Reset your Kabisa account password securely. Regain access to your EV services and account.",
      type: "website",
      noIndex: true,
    },
    "/auth/reset-password": {
      title: `${baseName} - Reset Password | Create New Password`,
      description: "Create a new password for your Kabisa account. Secure access to your EV services.",
      type: "website",
      noIndex: true,
    },

    // Vehicle Related
    "/shop/order": {
      title: `${baseName} - Order Vehicle | Purchase Your Electric Vehicle`,
      description: "Place an order for your new electric vehicle. Complete your EV purchase with our streamlined ordering process.",
      type: "website",
      keywords: ["order EV", "buy electric vehicle", "EV purchase"],
    },
    "/test-drive": {
      title: `${baseName} - Schedule Test Drive | Experience Electric Driving`,
      description: "Schedule a test drive for your preferred electric vehicle. Experience the future of sustainable transportation firsthand.",
      type: "service",
      keywords: ["EV test drive", "electric vehicle trial", "test driving"],
    },
    "/calculator": {
      title: `${baseName} - EV Savings Calculator | Calculate Electric Vehicle Benefits`,
      description: "Calculate your potential savings by switching to an electric vehicle. Discover the financial benefits of going electric.",
      type: "webapp",
      keywords: ["EV savings", "electric vehicle calculator", "cost comparison", "EV benefits"],
    },

    // Info Pages
    "/contact": {
      title: `${baseName} - Contact Us | Get in Touch`,
      description: "Get in touch with our team for support and inquiries. We're here to help with all your electric vehicle needs.",
      type: "website",
      keywords: ["contact Kabisa", "EV support", "customer service"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        mainEntity: {
          "@type": "Organization",
          name: siteConfig.organization.name,
          contactPoint: siteConfig.organization.contactPoint
        }
      }
    },
    "/news": {
      title: `${baseName} - News & Updates | Electric Vehicle Industry News`,
      description: "Latest news and updates about electric vehicles and sustainable transportation. Stay informed about the EV revolution.",
      type: "website",
      keywords: ["EV news", "electric vehicle updates", "sustainable transport news"],
    },
    "/financing": {
      title: `${baseName} - EV Financing Options | Electric Vehicle Loans`,
      description: "Explore financing solutions for your electric vehicle purchase. Flexible payment options to make EVs more accessible.",
      type: "service",
      keywords: ["EV financing", "electric vehicle loans", "EV payment plans"],
    },
    "/careers": {
      title: `${baseName} - Career Opportunities | Join the EV Revolution`,
      description: "Join our team and be part of the electric vehicle revolution. Explore career opportunities in sustainable transportation.",
      type: "website",
      keywords: ["Kabisa careers", "EV jobs", "sustainable transport careers"],
    },
    "/faq": {
      title: `${baseName} - FAQ | Electric Vehicle Questions Answered`,
      description: "Find answers to common questions about electric vehicles and our services. Comprehensive FAQ for all your EV needs.",
      type: "website",
      keywords: ["EV FAQ", "electric vehicle questions", "EV help"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "FAQPage"
      }
    },

    // Dashboard
    "/dashboard": {
      title: `${baseName} - Dashboard | Manage Your EV Operations`,
      description: "Manage your EV operations and monitor charging activities from your personalized dashboard.",
      type: "webapp",
      noIndex: true, // Private dashboard shouldn't be indexed
    },
    "/dashboard/scan": {
      title: `${baseName} - Scan Serial Number | Vehicle Management`,
      description: "Scan and manage vehicle serial numbers through your dashboard.",
      type: "webapp",
      noIndex: true,
    },
    "/dashboard/portal": {
      title: `${baseName} - Customer Portal | Account Management`,
      description: "Access your customer portal for comprehensive vehicle and account management.",
      type: "webapp",
      noIndex: true,
    },


  };

  // Dynamic routes
  if (pathname.startsWith("/dashboard/car/")) {
    return {
      title: `${baseName} - Vehicle Record | Manage Vehicle Details`,
      description: "View and manage comprehensive vehicle record details from your dashboard.",
      type: "webapp",
      noIndex: true,
    };
  }

  if (pathname.startsWith("/dashboard/charger/")) {
    return {
      title: `${baseName} - Charger Details | Monitor Charging Status`,
      description: "View and manage charger details and monitor real-time charging status.",
      type: "webapp",
      noIndex: true,
    };
  }

  // Default fallback
  return routes[pathname] || {
    title: `${baseName} - Leading Electric Vehicle Solutions`,
    description: "Leading electric vehicle solutions and services provider in Africa. Driving sustainable transportation forward.",
    type: "website",
  };
};

export const generateMetaTags = (pathname: string, customMeta?: Partial<PageMeta>) => {
  const meta = { ...getPageMeta(pathname), ...customMeta };
  const pageUrl = `${siteConfig.baseUrl}${pathname}`;
  const imageUrl = meta.image || siteConfig.defaultImage;
  const canonicalUrl = meta.canonical || pageUrl;

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {meta.keywords && <meta name="keywords" content={meta.keywords.join(", ")} />}
      <meta name="author" content={meta.author || siteConfig.author} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Language and Locale */}
      <meta httpEquiv="content-language" content={meta.locale || siteConfig.locale} />
      <meta property="og:locale" content={meta.locale || siteConfig.locale} />
      
      {/* Alternate Languages */}
      {meta.alternateLanguages?.map((lang) => (
        <link key={lang.hreflang} rel="alternate" hrefLang={lang.hreflang} href={lang.href} />
      ))}
      
      {/* Viewport - Essential for mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      
      {/* Robots Meta Tags */}
      <meta 
        name="robots" 
        content={`${meta.noIndex ? 'noindex' : 'index'}, ${meta.noFollow ? 'nofollow' : 'follow'}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`} 
      />
      
      {/* Theme and App Appearance */}
      <meta name="theme-color" content={siteConfig.themeColor} />
      <meta name="msapplication-TileColor" content={siteConfig.themeColor} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteConfig.siteName} />
      
      {/* Favicons - Modern Multi-format with Dark/Light Mode Support */}
      <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="32x32" />
      <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
      <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
      
      {/* Apple Touch Icons - Single size is sufficient */}
      <link rel="apple-touch-icon" href="/apple-touch-icon.webp" sizes="180x180" />
      
      {/* Safari Pinned Tab */}
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color={siteConfig.themeColor} />
      
      {/* Web App Manifest */}
      <link rel="manifest" href="/manifest.json" />
      
      {/* Performance Optimization */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Open Graph (Facebook, LinkedIn, etc.) */}
      <meta property="og:type" content={meta.type === "webapp" ? "website" : (meta.type || "website")} />
      <meta property="og:site_name" content={meta.siteName || siteConfig.siteName} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={meta.title} />
      <meta property="og:url" content={pageUrl} />
      
      {/* Facebook Specific */}
      {siteConfig.facebookAppId && <meta property="fb:app_id" content={siteConfig.facebookAppId} />}
      
      {/* Twitter/X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteConfig.twitterHandle} />
      <meta name="twitter:creator" content={siteConfig.twitterHandle} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={meta.title} />
      
      {/* Security Headers (Content-Type only, others handled server-side) */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      
      {/* Structured Data (JSON-LD) */}
      {meta.structuredData && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.structuredData) }}
        />
      )}
    </>
  );
};

// Utility function to generate Web App Manifest content
export const generateWebAppManifest = () => {
  return {
    name: siteConfig.siteName,
    short_name: siteConfig.siteName,
    description: "Leading EV ecosystem in Africa - Sales, charging, and maintenance",
    start_url: "/",
    display: "standalone",
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/android-chrome-512x512.png", 
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    categories: ["business", "utilities", "transportation"],
    lang: "en",
    dir: "ltr"
  };
};

// Utility function to generate adaptive SVG favicon with dark/light mode support
export const generateAdaptiveFaviconSVG = () => {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .favicon-bg { fill: #ffffff; }
    .favicon-icon { fill: #1a73e8; }
    
    @media (prefers-color-scheme: dark) {
      .favicon-bg { fill: #1a1a1a; }
      .favicon-icon { fill: #4285f4; }
    }
  </style>
  <rect class="favicon-bg" width="32" height="32" rx="6"/>
  <!-- Add your actual icon path here -->
  <path class="favicon-icon" d="M8 8h16v16H8z"/>
</svg>`;
};

// Utility function for dynamic meta tag updates (for SPAs)
export const updateMetaTags = (pathname: string, customMeta?: Partial<PageMeta>) => {
  if (typeof document === 'undefined') return; // Server-side safety
  
  const meta = { ...getPageMeta(pathname), ...customMeta };
  const pageUrl = `${siteConfig.baseUrl}${pathname}`;
  
  // Update title
  document.title = meta.title;
  
  // Update meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', meta.description);
  }
  
  // Update Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  
  if (ogTitle) ogTitle.setAttribute('content', meta.title);
  if (ogDescription) ogDescription.setAttribute('content', meta.description);
  if (ogUrl) ogUrl.setAttribute('content', pageUrl);
  
  // Update canonical
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', meta.canonical || pageUrl);
  }
};

export default getPageMeta;