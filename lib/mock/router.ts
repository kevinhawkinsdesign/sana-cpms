import { Route, matchPattern } from './matcher';
import { ok } from './respond';
import { authRoutes } from './handlers/auth';
import { chargerRoutes } from './handlers/chargers';
import { sessionRoutes } from './handlers/sessions';
import { userRoutes } from './handlers/users';
import { organizationRoutes } from './handlers/organizations';
import { businessRoutes } from './handlers/business';
import { shopRoutes } from './handlers/shop';
import { miscRoutes } from './handlers/misc';
import { consoleRoutes } from './handlers/console';

// Order matters: earlier routes win. Each handler file already orders its own
// literal-vs-:param routes correctly; domains are independent of each other
// (no two domains share a path prefix) so concatenation order across files
// doesn't matter, only within a file.
const routes: Route[] = [
  ...authRoutes,
  ...chargerRoutes,
  ...sessionRoutes,
  ...userRoutes,
  ...organizationRoutes,
  ...businessRoutes,
  ...shopRoutes,
  ...miscRoutes,
  ...consoleRoutes,
];

/** Best-effort fallback so an endpoint we didn't hand-implement never 404s
 *  and breaks a demo page — returns an empty-but-valid envelope shaped from
 *  the last path segment instead of failing the request. */
function genericFallback(method: string, pathSegs: string[], body: any) {
  const last = pathSegs[pathSegs.length - 1] || 'result';
  const key = /^[a-z0-9]+$/i.test(last) ? last : 'result';
  if (method === 'GET') {
    return ok({ [key]: [], items: [], count: 0 }, 'OK (demo placeholder)');
  }
  return ok({ ...body }, 'OK (demo placeholder)');
}

export async function dispatch(request: Request, method: string): Promise<Response> {
  const url = new URL(request.url);
  const pathSegs = url.pathname.split('/').filter(Boolean);

  let body: any = undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, pathSegs);
    if (params) {
      return route.handler({ params, query: url.searchParams, body, request });
    }
  }

  return genericFallback(method, pathSegs, body);
}
