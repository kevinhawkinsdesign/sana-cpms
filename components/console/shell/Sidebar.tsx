'use client';

/** Console sidebar (FE-2 / KAB-107): collapsible 290px->80px on desktop,
 *  off-canvas drawer on mobile (<860px). Grouped nav, perm-gated via hasPerm.
 *  Toggle via button or Cmd+B. Mobile drawer via hamburger in TopBar. */
import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { isNavActive, visibleNavGroups } from './nav';
import { useSidebar } from './ConsoleShell';
import { withBasePath } from '@/lib/utils/assetPath';

export function Sidebar({
  open = false,
  onNavigate,
}: Readonly<{ open?: boolean; onNavigate?: () => void }>) {
  const params = useParams<{ country: string }>();
  const pathname = usePathname();
  const { data, isPending, isPlaceholderData } = useOrgs();
  const { collapsed, toggle } = useSidebar();

  const base = `/${params.country}/console`;
  const consolePath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  // useOrgs seeds placeholderData (role/permissions null) so isPending is false
  // immediately on a cold load. Rendering nav from it would show an incomplete
  // menu (perm/role-gated groups like "My Work" missing) that then pops in when
  // the real perms arrive. Treat the placeholder phase as loading so the
  // skeleton shows until perms resolve — no flicker.
  const permsResolved = !!data && !isPending && !isPlaceholderData;
  const groups = permsResolved ? visibleNavGroups(data) : [];

  return (
    <nav
      aria-label="Console navigation"
      className={cn(
        /* The kc-sidebar class is kept for the mobile @media drawer rules in console.css */
        'kc-sidebar',
        'fixed left-0 top-0 z-[9999] flex h-screen flex-col',
        'border-r border-white/[0.07] bg-[#0C1B18] text-[#cdd9e8]',
        'transition-[width,transform] duration-200 ease-out',
        'lg:relative',
        collapsed ? 'w-20' : 'w-[290px]',
        /* Mobile drawer: kc-sidebar--open slides in via CSS transform */
        open && 'kc-sidebar--open',
      )}
    >
      {/* Right-edge handle (desktop): hovering the divider line shows a resize
       *  cursor; clicking it expands/collapses the sidebar, same as ⌘B. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
        className="absolute right-0 top-0 z-10 hidden h-full w-1.5 cursor-col-resize transition-colors hover:bg-white/10 lg:block"
      />

      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 pt-6 pb-5">
        {!collapsed && (
          <span className="pl-1 text-lg font-bold tracking-tight text-white">
            sana<span className="text-[#00C2A8]">.</span>
          </span>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-[#90a5c0] transition-colors',
            'hover:bg-white/10 hover:text-white',
            collapsed && 'mx-auto',
          )}
        >
          <img
            src={withBasePath("/icons/sidebar-toggle.png")}
            alt=""
            className={cn(
              'h-4 w-4 transition-transform duration-200 invert',
              !collapsed && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Scrollable nav section */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3">
        {!permsResolved && (
          <div className="flex flex-col gap-2 px-0.5 py-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="kc-skeleton h-[26px] rounded-md" />
            ))}
          </div>
        )}
        {groups.map((g) => (
          <React.Fragment key={g.group ?? 'root'}>
            {g.group && g.items.length > 1 && !collapsed && (
              <div className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase leading-5 tracking-[0.15em] text-[#5e7aa0]">
                {g.group}
              </div>
            )}
            {collapsed && g.group && g.items.length > 1 && (
              <div className="mx-auto my-3 h-px w-6 bg-white/10" />
            )}
            {g.items.map((item) => {
              const on = isNavActive(item, consolePath);
              return (
                <Link
                  key={item.id}
                  href={`${base}${item.path}`}
                  aria-current={on ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center rounded-lg text-sm font-medium no-underline transition-colors',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                    on
                      ? 'bg-[#00C2A8] font-semibold !text-[#0C1B18]'
                      : 'text-[#a3b6cf] hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              );
            })}
          </React.Fragment>
        ))}

        <div className="flex-1" />

        {/* Status footer */}
        {!collapsed && (
          <div className="mx-0.5 mb-3 mt-2 border-t border-white/[0.07] pt-3">
            <div className="px-2 text-[11px] leading-relaxed text-[#90a5c0]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#23a35a]" />
                <span>All systems operational</span>
              </div>
              <div className="mt-0.5 opacity-80">CSMS v2.4 &middot; OCPP 2.0.1</div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
