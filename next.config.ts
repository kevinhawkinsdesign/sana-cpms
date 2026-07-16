// next.config.ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Allowed image hostnames for Next.js Image optimization
const imageHostnames = [
  "gokabisa.com",
  "next.gokabisa.com",
  "www.sixt.com.au",
  "api.gokabisa.com",
  "new-api.gokabisa.com",
  "imagedelivery.net",
  "assets.gokabisa.com",
  "ui-avatars.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "customer-4swtfagaktt9cs7q.cloudflarestream.com",
  "carnewschina.com",
  "images.unsplash.com",
  "res.cloudinary.com",
  "guangcaiauto.com",
  "localhost",
  "cms.k8s.gokabisa.com", // Strapi CMS (K8s)
  "cms-assets.gokabisa.com", // Strapi media via Cloudflare R2
] as const;

// Demo mode: this repo has no separate backend, so the frontend calls its own
// Next.js API routes (lib/mock/**) instead of the real gokabisa.com API. This
// resolves to the app's own origin whether it's running locally or deployed.
const selfOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // HTTPS hostnames
      ...imageHostnames.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "**",
      })),
      // Local Strapi development server
      {
        protocol: "http" as const,
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || selfOrigin,
    NEXT_PUBLIC_GA_ID: "G-8BMMWECM3D",
    CLARITY_ID: process.env.CLARITY_ID || "rdtw7rgryb",
    NEXT_PUBLIC_SHOW_EBM_POPUP:
      process.env.NEXT_PUBLIC_SHOW_EBM_POPUP || "false",
  },
  experimental: {
    // optimizeCss: true, // Disabled due to build errors with entryCSSFiles
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  redirects: async () => [
    {
      source: "/scan",
      destination: "/dashboard/scan",
      permanent: true,
    },
    {
      source: "/aftersalesrequest",
      destination: "/maintenance",
      permanent: true,
    },
    {
      source: "/fleet",
      destination: "/shop",
      permanent: true,
    },
    {
      source: "/pro",
      destination: "/shop",
      permanent: true,
    },
    {
      source: "/kabisa-sessions",
      destination: "https://airtable.com/appwFmocJeB0pklLN/pag8lohbGveTjks9C/form",
      permanent: true,
    },
    {
      source: "/evp-sessions",
      destination: "https://airtable.com/appwFmocJeB0pklLN/pagFepIIfvNM6Awjc/form",
      permanent: true,
    },
    // Airtable Form Redirects
    {
      source: "/embassy",
      destination: "https://airtable.com/appwFmocJeB0pklLN/shrQ2Gc5qWgqIfAYK",
      permanent: true,
    },
    {
      source: "/vin-form",
      destination: "https://airtable.com/apppxOaP7MUCQP035/paggfJYbRfxs9fT5d/form",
      permanent: true,
    },
    {
      source: "/export-form",
      destination: "https://airtable.com/apppxOaP7MUCQP035/pagfgzQuXeU0zs8Fo/form",
      permanent: true,
    },
    {
      source: "/zipline-dashboard",
      destination: "https://airtable.com/appwFmocJeB0pklLN/shrGbWseman0a8US4",
      permanent: true,
    },
    {
      source: "/feedback",
      destination: "https://airtable.com/appXpIapfoCVnPaZJ/pagCxydQr0a7w05sr/form",
      permanent: true,
    },
    {
      source: "/feedback-kinyarwanda",
      destination: "https://airtable.com/appXpIapfoCVnPaZJ/pagpM5UPIjGtmGL3S/form",
      permanent: true,
    },
    // Brochure Redirects
    {
      source: "/commercial-vehicle",
      destination: "/commercial-vehicles",
      permanent: true,
    },
    {
      source: "/passenger-vehicle",
      destination: "/passenger-vehicles",
      permanent: true,
    },
    {
      source: "/charger-brochure",
      destination: "/Kabisa%2BEV%2Bcharger%2BBrochure.pdf",
      permanent: true,
    },
    {
      source: "/vehicle-brochure",
      destination: "/kabisa-vehicle-brochure.pdf",
      permanent: true,
    },
    {
      source: "/ke/vehicle-brochure",
      destination: "/Kenya%20Kabisa%20Vehicle%20Brochure%202026.pdf",
      permanent: true,
    },
    // Support redirect to contact page
    {
      source: "/support",
      destination: "/rw/contact",
      permanent: true,
    },
  ],
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  

  org: "kabisa-electric",
  project: "kabisa-next-nt",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
