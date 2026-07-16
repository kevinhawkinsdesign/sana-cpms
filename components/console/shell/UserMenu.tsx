'use client';

/** Top-bar user menu (FE-2 / KAB-107): theme + density toggles, logout.
 *  Rendered in-tree (no Portal) — see OrgSwitcher for why. */
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Avatar, Icon } from '@/components/console/ui';
import { useKcTheme } from '@/components/console/ThemeProvider';
import { useAuth } from '@/lib/auth/authContext';

function ToggleRow({
  label,
  value,
  onToggle,
}: Readonly<{ label: string; value: string; onToggle: () => void }>) {
  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        e.preventDefault(); // keep the menu open while toggling
        onToggle();
      }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5"
    >
      <span className="flex-1 text-gray-700 dark:text-gray-300">{label}</span>
      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-px text-[11px] capitalize text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        {value}
      </span>
    </DropdownMenu.Item>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme, density, setDensity } = useKcTheme();
  const router = useRouter();
  const params = useParams<{ country: string }>();

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Account';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex cursor-pointer border-none bg-transparent p-0"
        >
          <Avatar name={name} size={28} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={6}
        className="z-[60] w-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-black"
      >
        {/* User info header */}
        <div className="border-b border-gray-100 px-3 py-2 mb-2 dark:border-gray-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{name}</div>
          {user?.email && (
            <div className="truncate text-xs text-gray-400">
              {user.email}
            </div>
          )}
        </div>
        <DropdownMenu.Item
          onSelect={() => router.push(`/${params.country}/console/account`)}
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <Icon name="user" size={14} /> Account
        </DropdownMenu.Item>
        <ToggleRow
          label="Theme"
          value={theme}
          onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
        <ToggleRow
          label="Density"
          value={density}
          onToggle={() => setDensity(density === 'normal' ? 'compact' : 'normal')}
        />
        <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
          <DropdownMenu.Item
            onSelect={() => {
              logout()
                .then(() => router.push(`/${params.country}`))
                .catch(() => router.push(`/${params.country}`));
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 outline-none cursor-pointer hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Icon name="logout" size={14} /> Log out
          </DropdownMenu.Item>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
