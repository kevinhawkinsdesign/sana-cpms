// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://09aa563ccff5922548e03c0ddfb8fc2a@o4509094340984832.ingest.us.sentry.io/4509764277764096",

  // Disable Sentry in development
  enabled: process.env.NODE_ENV !== "development",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  // Low rate prevents performance issues while still capturing some data
  tracesSampleRate: 0.05,

  // Disable logs - too noisy and causes performance issues
  enableLogs: false,

  // Environment configuration
  environment: process.env.NODE_ENV || "development",

  // Release tracking - matches backend release format
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `frontend@${process.env.npm_package_version || "unknown"}`,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
