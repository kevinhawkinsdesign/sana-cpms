/**
 * Post-action redirect targets for the operator charging flow, shared by the
 * legacy dashboard (`/dashboard`) and the console operator surface
 * (`/console/me`). The session forms thread a single `basePath`; these helpers
 * map it to the right destinations so the components stay base-agnostic.
 */
export const DASHBOARD_BASE = '/dashboard'

/** Where to land after starting a session (the operator home). */
export function sessionHomeHref(basePath: string = DASHBOARD_BASE): string {
  return basePath
}

/** Where to land after ending a session — the dashboard has a dedicated
 *  sessions list; the console shows recent sessions on its overview. */
export function sessionsListHref(basePath: string = DASHBOARD_BASE): string {
  return basePath === DASHBOARD_BASE ? `${DASHBOARD_BASE}/charge/sessions` : basePath
}
