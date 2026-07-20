'use client';

/** ⌘K command palette (FE-2 / KAB-107). cmdk inside a hand-rolled fixed
 *  overlay (not Command.Dialog — its portal renders at <body>, outside
 *  .kc-root, and would lose the console theme vars). Commands: perm-filtered
 *  nav + org switching. */
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Icon } from '@/components/console/ui';
import { hasPerm, useOrgs, useSwitchOrg } from '@/lib/console/orgs';
import { SETTINGS_SECTIONS, visibleNavGroups } from './nav';

export function CommandPalette({
  open,
  onClose,
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const router = useRouter();
  const params = useParams<{ country: string }>();
  const { data, isPending, isPlaceholderData } = useOrgs();
  const switchOrg = useSwitchOrg();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const base = `/${params.country}/console`;
  const has = (p: string) => hasPerm(data, p);
  // useOrgs seeds placeholderData (role/permissions null) so isPending is false
  // immediately; computing nav from it would show an empty "Go to" section
  // until real perms arrive. Only build nav once perms are truly resolved.
  const permsResolved = !!data && !isPending && !isPlaceholderData;
  // Top nav honours role + anyPerm gating via visibleNavGroups (includes the
  // operator "My Work" group for operators).
  const topNav = permsResolved
    ? visibleNavGroups(data).flatMap((g) => g.items).map((item) => ({ id: item.id, label: item.label, icon: item.icon, path: item.path }))
    : [];
  // Deep-links into the Settings & Admin sections (Team, Roles, Tax,
  // Organizations…) so ⌘K still surfaces them now that they're sub-sections
  // rather than top-level pages. requirePlatformAdmin sections (the folded-in
  // Admin hub) are excluded for anyone but a platform admin, even if their
  // perm string happens to overlap with a regular Settings section.
  const settingsNav = permsResolved
    ? SETTINGS_SECTIONS
        .filter((s) => s.segment && (!s.requirePlatformAdmin || data?.isPlatformAdmin) && has(s.perm))
        .map((s) => ({
          id: `settings-${s.id}`,
          label: `Settings · ${s.label}`,
          icon: s.icon ?? 'settings',
          path: `/settings${s.segment ? `/${s.segment}` : ''}`,
        }))
    : [];
  const navItems = [...topNav, ...settingsNav];
  const otherOrgs = (data?.orgs ?? []).filter((o) => o.id !== data?.activeOrgId);

  return (
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="fixed inset-0 border-none bg-black/50 p-0 cursor-default"
      />

      {/* Command container */}
      <Command
        label="Command palette"
        className="relative mx-auto mt-[20vh] w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-black"
      >
        {/* Search input row */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 dark:border-gray-800">
          <Icon name="search" size={14} style={{ color: '#9ca3af' }} />
          <Command.Input
            autoFocus
            placeholder="Go to page or switch organization…"
            className="h-12 flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90"
          />
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 dark:bg-gray-700">
            esc
          </span>
        </div>

        {/* Results list */}
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="py-3.5 px-3 text-center text-sm text-gray-400">
            No results.
          </Command.Empty>
          <Command.Group
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
          >
            {navItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`go ${item.label}`}
                onSelect={() => {
                  router.push(`${base}${item.path}`);
                  onClose();
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 aria-selected:bg-gray-100 dark:text-gray-300 dark:aria-selected:bg-white/5"
              >
                <Icon name={item.icon} size={14} style={{ color: '#9ca3af' }} />
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
          {otherOrgs.length > 0 && (
            <Command.Group
              heading="Switch organization"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
            >
              {otherOrgs.map((o) => (
                <Command.Item
                  key={o.id}
                  value={`switch ${o.name}`}
                  disabled={switchOrg.isPending}
                  onSelect={() => {
                    switchOrg.mutate(o.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 aria-selected:bg-gray-100 dark:text-gray-300 dark:aria-selected:bg-white/5"
                >
                  <Icon name="building" size={14} style={{ color: '#9ca3af' }} />
                  {o.name}
                  <span className="ml-auto text-[11px] text-gray-400">{o.plan}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
