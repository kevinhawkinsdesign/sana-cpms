import * as Sentry from "@sentry/nextjs";

/**
 * Set user context in Sentry for error tracking and tracing.
 * Call this after successful authentication.
 */
export const setSentryUser = (user: {
  id: string | number;
  email?: string;
  username?: string;
  role?: string;
}) => {
  Sentry.setUser({
    id: String(user.id),
    email: user.email,
    username: user.username,
    role: user.role,
  });
};

/**
 * Clear user context from Sentry.
 * Call this on logout.
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add or clear custom context to Sentry for better debugging.
 */
export const setSentryContext = (
  key: string,
  data: Record<string, unknown> | null,
) => {
  Sentry.setContext(key, data);
};
