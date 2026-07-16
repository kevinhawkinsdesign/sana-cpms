'use client';

/** Account area shell — the signed-in user's personal space (distinct from the
 *  org-level /settings). One header + a left sub-nav over nested routes:
 *    /account          → Profile (view + edit personal info)
 *    /account/sessions → Sessions (where you're signed in)
 *  Open to every authenticated member, so there's no permission gating here —
 *  the console shell already requires a session to reach any /console route. */
import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { PageHead } from '@/components/console/ui';
import { cn } from '@/lib/utils';

interface AccountSection {
  id: string;
  label: string;
  segment: string;
}

const ACCOUNT_SECTIONS: AccountSection[] = [
  { id: 'profile', label: 'Profile', segment: '' },
  { id: 'sessions', label: 'Sessions', segment: 'sessions' },
];

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const params = useParams<{ country: string }>();
  const pathname = usePathname() ?? '';

  const accountBase = `/${params.country}/console/account`;
  const rest = pathname.startsWith(accountBase) ? pathname.slice(accountBase.length) : '';
  const segment = rest.replace(/^\//, '').split('/')[0] ?? '';
  const active = ACCOUNT_SECTIONS.find((s) => s.segment === segment) ?? ACCOUNT_SECTIONS[0];
  const href = (seg: string) => `${accountBase}${seg ? `/${seg}` : ''}`;

  return (
    <div className="p-6">
      <PageHead title="Account" sub="Manage your personal profile and active sessions" />
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav aria-label="Account sections" className="flex shrink-0 flex-col gap-0.5 lg:w-56">
          {ACCOUNT_SECTIONS.map((s) => (
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
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
