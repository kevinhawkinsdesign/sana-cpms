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

// Demo mode: this repo has no separate backend at all — every /api/* call
// the frontend makes is answered client-side (see lib/mock/browserIntercept.ts)
// rather than by a real server, so the whole app can be exported as static
// HTML/JS and hosted on GitHub Pages with no Node server behind it.
const isStaticExport = process.env.STATIC_EXPORT === "true";
// GitHub Pages serves a repo (not a user/org) site under a /<repo> subpath.
const basePath = isStaticExport ? "/sana-cpms" : "";

// Used only as a fallback when nothing intercepts an /api/* call (e.g. a
// non-static dev/Vercel run); resolves to the app's own origin either way.
const selfOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticExport ? { output: "export" as const, basePath, assetPrefix: basePath } : {}),
  images: {
    unoptimized: isStaticExport,
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
    // "" on purpose for the static export: it's served from wherever it's
    // served (GitHub Pages, a local preview, ...) and can't know that origin
    // at build time, so every call must resolve relative to whatever origin
    // it's actually loaded from at runtime instead of a value baked in now.
    // (The consuming code must use `??`, not `||`, against this — see
    // lib/api/api.ts / authContext.tsx — since "" is falsy.)
    NEXT_PUBLIC_API_URL: isStaticExport ? "" : (process.env.NEXT_PUBLIC_API_URL || selfOrigin),
    NEXT_PUBLIC_BASE_PATH: basePath,
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

  // Static export has no server to run these on, and Next.js refuses to
  // build with output:'export' if this is present at all.
  ...(isStaticExport ? {} : { redirects: async () => [
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
  ] }),
};

// Sentry's build plugin (source map upload, etc.) assumes a server deploy;
// skip wrapping entirely for the static export so it can't fail that build.
export default isStaticExport ? nextConfig : withSentryConfig(nextConfig, {
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
