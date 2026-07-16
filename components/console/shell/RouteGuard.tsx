'use client';

/** Route-level permission guard. Maps the current /console route to the
 *  permission declared in the nav config and renders <AccessDenied/> when the
 *  member lacks it — so a denied page shows a clear message instead of a broken
 *  data view. Unknown (non-nav) routes pass through; while perms resolve we
 *  render children (pages own their loading skeletons).
 *
 *  Operators who land on an admin-only page (e.g. /console/ after login) are
 *  redirected to /console/me instead of seeing an AccessDenied wall. */
import React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useOrgs } from '@/lib/console/orgs';
import { AccessDenied } from '@/components/console/AccessDenied';
import { NAV_GROUPS, isNavActive, visibleNavGroups } from './nav';

export function RouteGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const params = useParams<{ country: string }>();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data, isPending, isPlaceholderData } = useOrgs();

  const base = `/${params.country}/console`;
  const consolePath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  const match = NAV_GROUPS.flatMap((g) => g.items)
    .filter((item) => isNavActive(item, consolePath))
    .sort((a, b) => b.path.length - a.path.length)[0];

  const permsResolved = !!data && !isPending && !isPlaceholderData;
  const allowed = match && permsResolved
    ? visibleNavGroups(data).some((g) => g.items.some((item) => item.id === match.id))
    : true;
  const role = data?.activeOrg?.role;
  // Operator hitting an admin page → find their first visible page and redirect.
  // If no pages are visible (all perms revoked), fall through to AccessDenied.
  const operatorFallback = React.useMemo(() => {
    if (allowed || role !== 'OPERATOR') return null;
    const visible = visibleNavGroups(data);
    const first = visible.flatMap((g) => g.items)[0];
    return first ? `${base}${first.path}` : null;
  }, [allowed, role, data, base]);

  React.useEffect(() => {
    if (operatorFallback) {
      router.replace(operatorFallback);
    }
  }, [operatorFallback, router]);

  if (operatorFallback) return null;
  if (match && permsResolved && !allowed) return <AccessDenied />;
  return <>{children}</>;
}
