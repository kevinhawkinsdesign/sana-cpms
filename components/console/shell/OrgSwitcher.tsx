'use client';

/** Top-bar org switcher (FE-2 / KAB-107). Orgs from GET /auth/orgs; selecting
 *  one calls POST /auth/switch-org (token swap + cache clear in useSwitchOrg).
 *  No Radix Portal: console tokens are scoped to .kc-root, so portaled content
 *  rendered at <body> would lose the theme. */
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/console/ui';
import { useOrgs, useSwitchOrg, type ConsoleOrg } from '@/lib/console/orgs';

function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: string): string {
  return role.toLowerCase().replaceAll('_', ' ');
}

function OrgMark({ org, size = 20 }: Readonly<{ org: ConsoleOrg; size?: number }>) {
  if (org.name.toUpperCase() === 'KABISA') {
    return (
      <img
        src="/icons/sidebar-toggle.png"
        alt=""
        className="shrink-0 dark:invert"
        style={{ width: size, height: size }}
      />
    );
  }
  // Non-Kabisa orgs: show first letter
  const initial = (org.name[0] ?? '?').toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-700 font-bold dark:bg-gray-700 dark:text-gray-300"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

export function OrgSwitcher() {
  // isPending (not isLoading) — isLoading is false during SSR where no fetch
  // runs, which would desync server and client first paint (hydration error)
  const { data, isPending } = useOrgs();
  const switchOrg = useSwitchOrg();

  if (isPending) {
    return <span className="kc-skeleton h-6 w-[120px] rounded-md" />;
  }

  const orgs = data?.orgs ?? [];
  const active = orgs.find((o) => o.id === data?.activeOrgId) ?? orgs[0];
  if (!active) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/5"
        >
          <OrgMark org={active} />
          {active.name.toUpperCase() === 'KABISA' ? (
            <img src="/icons/kabisa-wordmark.png" alt="Kabisa" className="h-3.5 w-auto dark:invert" />
          ) : (
            <span className="max-w-[140px] truncate">{active.name}</span>
          )}
          {/* plan tier — hidden on phones to keep the bar tidy */}
          <span className="kc-hide-sm rounded-full border border-gray-200 bg-gray-50 px-2 py-px text-[10px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {active.plan}
          </span>
          <Icon name="chevD" size={13} style={{ color: 'var(--text3, #9ca3af)' }} />
        </button>
      </DropdownMenu.Trigger>
      {/* In-tree (no Portal) so .kc-root theme vars apply */}
      <DropdownMenu.Content
        align="start"
        sideOffset={6}
        className="kc-fadeup z-[60] w-[280px] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-black"
      >
        <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
          Organizations
        </div>
        {orgs.map((o) => (
          <DropdownMenu.Item
            key={o.id}
            disabled={switchOrg.isPending}
            onSelect={() => {
              if (o.id !== active.id) switchOrg.mutate(o.id);
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5',
              o.id === active.id && 'bg-gray-50 dark:bg-white/5',
            )}
          >
            <OrgMark org={o} size={22} />
            <span className="min-w-0 flex-1">
              {o.name.toUpperCase() === 'KABISA' ? (
                <img src="/icons/kabisa-wordmark.png" alt="Kabisa" className="h-3 w-auto dark:invert" />
              ) : (
                <span className="block truncate font-medium text-gray-900 dark:text-white">
                  {o.name}
                </span>
              )}
              <span className="block text-[11px] text-gray-400">{roleLabel(o.role)}</span>
            </span>
            {o.id === active.id && <Icon name="check" size={14} style={{ color: '#22c55e' }} />}
          </DropdownMenu.Item>
        ))}
        <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
          {/* Org creation lands with FE-9 onboarding; stub stays disabled */}
          <DropdownMenu.Item
            disabled
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 outline-none cursor-default"
          >
            <Icon name="plus" size={14} /> Create organization
          </DropdownMenu.Item>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
