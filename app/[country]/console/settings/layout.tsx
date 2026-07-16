'use client';

/** Consolidated Settings shell (KAB-128). One Settings area with a grouped
 *  left sub-nav — Organization (General · Billing) · Access (Team · Roles) ·
 *  Finance (Tax & EBM) — over nested routes (/settings, /settings/team, …).
 *  Each section is gated by its own permission: the sub-nav only lists sections
 *  the member can reach, and a direct hit on a section they can't manage falls
 *  back to AccessDenied. The bare /settings index redirects to the first section
 *  the member can access (General for owners/admins). */
import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { PageHead } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { cn } from '@/lib/utils';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS } from '@/components/console/shell/nav';

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const params = useParams<{ country: string }>();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { data, isPending, isPlaceholderData } = useOrgs();

  // Only act on permissions once they're really resolved. useOrgs seeds a
  // placeholder (permissions: null) so `isPending` is false during the initial
  // /auth/orgs fetch; treating that window as "loaded" would deny every section
  // and flash AccessDenied on a cold load. `isPlaceholderData` marks it.
  const permsReady = !!data && !isPending && !isPlaceholderData;

  const settingsBase = `/${params.country}/console/settings`;
  const rest = pathname.startsWith(settingsBase) ? pathname.slice(settingsBase.length) : '';
  const segment = rest.replace(/^\//, '').split('/')[0] ?? '';
  const active = SETTINGS_SECTIONS.find((s) => s.segment === segment) ?? SETTINGS_SECTIONS[0];

  const allowed = useMemo(
    () => SETTINGS_SECTIONS.filter((s) => hasPerm(data, s.perm)),
    [data],
  );
  const activeAllowed = allowed.some((s) => s.id === active.id);
  const href = (seg: string) => `${settingsBase}${seg ? `/${seg}` : ''}`;

  // Bare /settings (or a section the member can't reach) → first allowed section.
  useEffect(() => {
    if (!permsReady) return;
    if (!activeAllowed && allowed.length > 0) router.replace(href(allowed[0].segment));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsReady, activeAllowed, allowed.length]);

  const subnav = (
    <nav aria-label="Settings sections" className="flex shrink-0 flex-col gap-5 lg:w-56">
      {SETTINGS_GROUPS.map((group) => {
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
                      ? 'bg-[#08294f]/10 text-[#08294f] dark:bg-[#08294f]/[0.12] dark:text-[#4561de]'
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
  // genuine AccessDenied when the member can reach no settings section at all.
  let content: React.ReactNode;
  if (!permsReady) content = <span className="kc-skeleton block h-[280px] max-w-xl rounded-xl" />;
  else if (activeAllowed) content = children;
  else if (allowed.length > 0) content = <span className="kc-skeleton block h-[280px] max-w-xl rounded-xl" />;
  else content = <AccessDenied />;

  return (
    <div className="p-6">
      <PageHead title="Settings" sub="Manage your organization, team, access and billing" />
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:gap-8">
        {subnav}
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    </div>
  );
}
