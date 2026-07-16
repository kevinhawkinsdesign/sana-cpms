export interface RouteCtx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
  request: Request;
}

export type RouteHandler = (ctx: RouteCtx) => Promise<Response> | Response;

export interface Route {
  method: string;
  pattern: string;
  handler: RouteHandler;
}

/**
 * Order matters: literal segments must be registered before a `:param` at the
 * same position (e.g. `/chargers/guns/:gunId` before `/chargers/:chargerId`),
 * since routes are tried in array order and the first structural match wins.
 */
export function matchPattern(pattern: string, pathSegs: string[]): Record<string, string> | null {
  const pSegs = pattern.split('/').filter(Boolean);
  if (pSegs.length !== pathSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSegs.length; i++) {
    const ps = pSegs[i];
    const us = pathSegs[i];
    if (ps.startsWith(':')) {
      params[ps.slice(1)] = decodeURIComponent(us);
    } else if (ps !== us) {
      return null;
    }
  }
  return params;
}
