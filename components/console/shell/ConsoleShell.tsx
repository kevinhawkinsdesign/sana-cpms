'use client';

/** Console shell wrapper (FE-2 / KAB-107): top bar + collapsible sidebar + main region.
 *  Owns the Command-K palette, sidebar collapse (desktop), mobile drawer,
 *  and global shortcuts (Cmd+K search, Cmd+B sidebar toggle, Esc close drawer). */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { RouteGuard } from './RouteGuard';

/* ---- Sidebar collapse context (desktop) ---- */
interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function ConsoleShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  /* Mobile drawer state */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  /* Desktop collapsible state (persisted in localStorage) */
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('kc-sidebar-collapsed') === '1'; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('kc-sidebar-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Cmd/Ctrl+K — toggle command palette */
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      /* Cmd/Ctrl+B — toggle sidebar collapse (desktop) */
      if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
      /* Escape — close mobile drawer */
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div className="flex h-screen overflow-hidden bg-[#f8f9fb] dark:bg-black">
        {/* Backdrop — visible only on mobile when drawer is open (CSS handles display) */}
        <div
          className={cn(
            'kc-sidebar-backdrop',
            sidebarOpen && 'kc-show',
          )}
          onClick={closeSidebar}
          aria-hidden="true"
        />
        <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <TopBar
            onOpenPalette={() => setPaletteOpen(true)}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
          <main id="kc-main" className="mx-auto w-full max-w-[1536px] p-5 md:p-8">
            <RouteGuard>{children}</RouteGuard>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onClose={closePalette} />
      </div>
    </SidebarContext.Provider>
  );
}
