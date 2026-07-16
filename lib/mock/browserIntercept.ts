'use client';

/**
 * sana-cpms has no backend service at all in this deployment (static export
 * on GitHub Pages — no server can run `app/api/**` route handlers). Every
 * "API call" the frontend makes has to be answered entirely in the browser
 * instead, from the same lib/mock/router.ts used when a real Next.js server
 * route handles it.
 *
 * Two interception points are needed because the app calls out in two ways:
 *  - `lib/api/api.ts`'s axios instance (used by nearly everything) — given a
 *    custom `adapter`, see `mockAxiosAdapter` below.
 *  - A handful of call sites use the raw `fetch()` API directly
 *    (authContext.tsx, OperatorShiftDashboard.tsx, geofence.ts,
 *    useCitrineEventStream.ts) — caught by patching `window.fetch`.
 *
 * Only same-origin `/api/*` paths are intercepted; anything else (Strapi CMS,
 * OSM tiles/Nominatim/OSRM, the free currency API, Sentry, etc.) passes
 * through to a real network request unchanged.
 */
import type { AxiosAdapter, AxiosResponse } from 'axios';
import { dispatch } from './router';

// GitHub Pages serves this as a project site (github.io/<repo>/), so every
// path is prefixed with the basePath. Strip it before matching against the
// router's un-prefixed patterns (e.g. '/api/chargers').
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function stripBasePath(pathname: string): string {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    const rest = pathname.slice(BASE_PATH.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

function isMockableApiPath(pathname: string): boolean {
  return stripBasePath(pathname).startsWith('/api/');
}

async function dispatchMock(url: URL, method: string, headers: HeadersInit | undefined, body: BodyInit | null | undefined) {
  const innerPath = stripBasePath(url.pathname);
  const innerUrl = new URL(innerPath + url.search, url.origin);
  const request = new Request(innerUrl.toString(), { method, headers, body });
  return dispatch(request, method.toUpperCase());
}

let fetchInstalled = false;

/** Patch window.fetch once, at app boot (see instrumentation-client.ts). */
export function installMockFetch() {
  if (fetchInstalled || typeof window === 'undefined') return;
  fetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : undefined;
    const rawUrl = request ? request.url : String(input);
    const url = new URL(rawUrl, window.location.origin);

    if (url.origin === window.location.origin && isMockableApiPath(url.pathname)) {
      const method = (init?.method || request?.method || 'GET').toUpperCase();
      const headers = init?.headers ?? request?.headers;
      let body: BodyInit | null | undefined = init?.body ?? undefined;
      if (body === undefined && request && method !== 'GET' && method !== 'HEAD') {
        body = await request.clone().text();
      }
      return dispatchMock(url, method, headers, body);
    }

    return originalFetch(input as any, init);
  };
}

/** Custom axios adapter used by lib/api/api.ts — bypasses HTTP entirely for
 *  `/api/*` calls (straight in-memory function call), and falls through to a
 *  real fetch for anything else the api() instance might be pointed at. */
export const mockAxiosAdapter: AxiosAdapter = async (config) => {
  const base = config.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = config.url || '';
  const fullUrl = /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const url = new URL(fullUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
  const method = (config.method || 'get').toUpperCase();

  const isMocked = typeof window !== 'undefined' && url.origin === window.location.origin && isMockableApiPath(url.pathname);

  if (config.params) {
    Object.entries(config.params as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const headers: Record<string, string> = {};
  if (config.headers) {
    Object.entries(config.headers as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v === 'string') headers[k] = v;
    });
  }

  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody
    ? (typeof config.data === 'string' || config.data instanceof FormData ? config.data : JSON.stringify(config.data ?? {}))
    : undefined;
  if (hasBody && typeof config.data !== 'string' && !(config.data instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  if (isMocked) {
    response = await dispatchMock(url, method, headers, body);
  } else {
    response = await fetch(url.toString(), { method, headers, body });
  }

  const data = config.responseType === 'blob' ? await response.blob() : await response.json().catch(() => null);

  const axiosResponse: AxiosResponse = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config,
    request: {},
  };
  return axiosResponse;
};
