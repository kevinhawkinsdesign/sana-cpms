// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const integrations: Parameters<typeof Sentry.init>[0]['integrations'] = [];

if (typeof Sentry.replayIntegration === "function") {
  integrations.push(Sentry.replayIntegration());
}

Sentry.init({
  dsn: "https://09aa563ccff5922548e03c0ddfb8fc2a@o4509094340984832.ingest.us.sentry.io/4509764277764096",

  // Disable Sentry in development
  enabled: process.env.NODE_ENV !== "development",

  // Add optional integrations for additional features when available
  integrations,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  // Low rate prevents performance issues while still capturing some data
  tracesSampleRate: 0.05,

  // Disable logs - too noisy and causes performance issues
  enableLogs: false,

  // Configure distributed tracing - propagate trace to backend
  tracePropagationTargets: [
    "localhost:9090",
    "new-api.gokabisa.com",
    /^https:\/\/new-api\.gokabisa\.com/,
  ],

  // Environment configuration
  environment: process.env.NODE_ENV || "development",

  // Release tracking - matches backend release format
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || `frontend@${process.env.npm_package_version || "unknown"}`,

  // Define how likely Replay events are sampled.
  // Don't record all sessions - too expensive
  replaysSessionSampleRate: 0,

  // Capture replays only when errors occur - efficient and useful for debugging
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
