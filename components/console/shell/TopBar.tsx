'use client';

/** Console top bar (FE-2 / KAB-107): sticky — search center, org switcher + bell + user right.
 *  Hamburger for mobile drawer. TailAdmin classes. */
import React from 'react';
import { useParams } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { OrgSwitcher } from './OrgSwitcher';
import { UserMenu } from './UserMenu';

export function TopBar({
  onOpenPalette,
  onToggleSidebar,
}: Readonly<{ onOpenPalette: () => void; onToggleSidebar?: () => void }>) {
  const params = useParams<{ country: string }>();
  const { data: orgData } = useOrgs();
  const activeOrg =
    orgData?.orgs.find((o) => o.id === orgData?.activeOrgId) ?? orgData?.orgs[0] ?? null;

  return (
    <header
      className="sticky top-0 z-[99999] flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-black lg:px-6 lg:py-4"
    >
      {/* Hamburger — phone only */}
      <button
        type="button"
        className="kc-hamburger flex items-center justify-center rounded-lg border-none bg-transparent p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label="Toggle navigation"
        onClick={onToggleSidebar}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Left spacer */}
      <div className="flex-1" />

      {/* Search trigger — centered */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Search (⌘K)"
        className={cn(
          'kc-search flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-400 cursor-pointer font-[inherit]',
          'dark:border-gray-700 dark:bg-gray-800',
          'w-full max-w-md',
        )}
      >
        <Icon name="search" size={14} />
        <span className="kc-hide-sm flex-1 text-left">Search stations, sessions...</span>
        <span className="kc-hide-sm rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-800">
          ⌘K
        </span>
      </button>

      {/* Right spacer */}
      <div className="flex-1" />

      {/* Right side: org switcher + bell + overflow + user */}
      <div className="flex items-center gap-3">
        <OrgSwitcher />

        {/* Notifications stub */}
        <button
          type="button"
          aria-label="Notifications"
          className="kc-hide-sm relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <Icon name="bell" size={16} />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#FFD400] ring-2 ring-white dark:ring-black" />
        </button>

        {/* Phone overflow menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="kc-only-sm flex items-center justify-center rounded-lg border-none bg-transparent p-1.5 text-gray-500 dark:text-gray-400"
              aria-label="More"
            >
              <Icon name="chevD" size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="kc-fadeup z-[60] min-w-[200px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-black"
          >
            {activeOrg && (
              <>
                <DropdownMenu.Label className="flex items-center gap-2 px-3 py-1.5">
                  <span className="max-w-[150px] truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                    {activeOrg.name}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-px text-[10px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    {activeOrg.plan}
                  </span>
                </DropdownMenu.Label>
                <div className="mx-0 mb-1 border-t border-gray-100 dark:border-gray-800" />
              </>
            )}
            <DropdownMenu.Item
              disabled
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-gray-400 outline-none cursor-default"
            >
              <Icon name="bell" size={15} /> Notifications
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <UserMenu />
      </div>
    </header>
  );
}
