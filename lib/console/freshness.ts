'use client';

/** Console data-freshness policy.
 *
 *  The console talks to the backend through a Node→Hasura relay, so every read
 *  is comparatively expensive. To keep pages fast we default to SNAPSHOT: a
 *  query fetches once on mount and is then "as of load" — no background polling
 *  — mirroring the CitrineOS operator UI, whose pages fetch once (staleTime
 *  Infinity) and never poll. Only views where staleness is genuinely actionable
 *  (a live charging power curve, connector status while the operator watches it,
 *  a single in-progress session) opt into LIVE polling, and that polling pauses
 *  automatically when the tab/window is hidden.
 *
 *  Pass `{ live: true }` (optionally `intervalMs`) to a console hook to opt a
 *  specific mount into live polling — typically gated on the active tab, e.g.
 *  `useChargerState(orgId, id, { live: tab === 'connectors' })`. */

export const SNAPSHOT_STALE_MS = 5 * 60_000;

export interface LiveOption {
  /** Poll on an interval. Default false = snapshot (fetch once, no polling). */
  live?: boolean;
  /** Poll cadence in ms when `live`. Defaults to the hook's own cadence. */
  intervalMs?: number;
}

/** Translate a freshness option into the react-query polling fields. Snapshot
 *  by default; when `live`, poll on the interval but only while visible
 *  (`refetchIntervalInBackground: false`, react-query's default, set explicitly
 *  so the intent is legible). */
export function freshness(opts: LiveOption | undefined, defaultIntervalMs: number) {
  const live = opts?.live ?? false;
  const intervalMs = opts?.intervalMs ?? defaultIntervalMs;
  return {
    refetchInterval: (live ? intervalMs : false) as number | false,
    refetchIntervalInBackground: false,
    // While live, keep data fresh for ~one poll cycle; while snapshot, hold it
    // long enough that tab-switching back doesn't refire the relay.
    staleTime: live ? Math.min(intervalMs, 30_000) : SNAPSHOT_STALE_MS,
  };
}
