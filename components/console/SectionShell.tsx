'use client';

/** Generic left sub-nav shell for a group of console pages that share a URL
 *  prefix — a reusable extraction of the pattern Settings pioneered (KAB-128):
 *  a grouped sidebar over nested routes, each section gated by its own
 *  permission, the whole subtree gated at the RouteGuard level by the single
 *  sidebar item that points at `basePath`. When `title` is omitted, no header
 *  row is rendered at all — used by merges (EBM, Platform Admin) whose
 *  individual pages already carry their own specific PageHead, so this only
 *  adds the sub-nav chrome around them instead of stacking a second header. */
import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { PageHead } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { cn } from '@/lib/utils';
import { hasPerm, useOrgs } from '@/lib/console/orgs';

export interface ShellSection {
  id: string;
  label: string;
  group: string;
  /** Path segment under basePath — '' means basePath itself. */
  segment: string;
  perm: string;
  anyPerm?: string[];
}

export function SectionShell({
  title,
  sub,
  slug,
  sections,
  groups,
  children,
}: Readonly<{
  title?: string;
  sub?: string;
  /** Path under /{country}/console, e.g. '/ebm' or '/admin'. */
  slug: string;
  sections: ShellSection[];
  groups: string[];
  children: React.ReactNode;
}>) {
  const params = useParams<{ country: string }>();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data, isPending, isPlaceholderData } = useOrgs();
  const permsReady = !!data && !isPending && !isPlaceholderData;

  const basePath = `/${params.country}/console${slug}`;
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : '';
  const segment = rest.replace(/^\//, '').split('/')[0] ?? '';
  const active = sections.find((s) => s.segment === segment) ?? sections[0];

  const checkAllowed = useMemo(
    () => (s: ShellSection) => (s.anyPerm ? s.anyPerm.some((p) => hasPerm(data, p)) : hasPerm(data, s.perm)),
    [data],
  );
  const allowed = useMemo(() => sections.filter(checkAllowed), [sections, checkAllowed]);
  const activeAllowed = allowed.some((s) => s.id === active.id);
  const href = (seg: string) => `${basePath}${seg ? `/${seg}` : ''}`;

  // Bare basePath (or a section the member can't reach) → first allowed section.
  useEffect(() => {
    if (!permsReady) return;
    if (!activeAllowed && allowed.length > 0) router.replace(href(allowed[0].segment));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsReady, activeAllowed, allowed.length]);

  const subnav = (
    <nav aria-label={`${title ?? 'Section'} navigation`} className="flex shrink-0 flex-col gap-5 lg:w-56">
      {groups.map((group) => {
        const items = allowed.filter((s) => s.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {group}
            </div>
            <div className="flex flex-col gap-0.5">
              {items.map((s) => (
                <Link
                  key={s.id}
                  href={href(s.segment)}
                  aria-current={s.id === active.id ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors',
                    s.id === active.id
                      ? 'bg-[#0B4F42]/10 text-[#0B4F42] dark:bg-[#00C2A8]/[0.12] dark:text-[#00C2A8]'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5',
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );

  // While perms resolve, show a skeleton — never AccessDenied (the placeholder
  // phase has no permissions yet). Once resolved: the section if allowed; a
  // skeleton while the redirect to the first allowed section lands; and only a
  // genuine AccessDenied when the member can reach no section at all.
  let content: React.ReactNode;
  if (!permsReady) content = <span className="kc-skeleton block h-[280px] max-w-xl rounded-xl" />;
  else if (activeAllowed) content = children;
  else if (allowed.length > 0) content = <span className="kc-skeleton block h-[280px] max-w-xl rounded-xl" />;
  else content = <AccessDenied />;

  return (
    <div className={title ? 'p-6' : ''}>
      {title && <PageHead title={title} sub={sub} />}
      <div className={cn('flex flex-col gap-6 lg:flex-row lg:gap-8', title && 'mt-5')}>
        {subnav}
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    </div>
  );
}
