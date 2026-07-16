'use client';

/** Console theme/density state (FE-1). Defers first render until client-side
 *  so the saved theme is applied immediately — no dark→light flash on refresh. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type KcTheme = 'light' | 'dark';
type KcDensity = 'normal' | 'compact';

interface KcThemeCtx {
  theme: KcTheme;
  density: KcDensity;
  setTheme: (t: KcTheme) => void;
  setDensity: (d: KcDensity) => void;
  /** The `.kc-root` element — portal target for dialogs so Radix renders them
   *  inside the themed (and `.dark`) scope instead of at <body>. */
  rootEl: HTMLElement | null;
}

const Ctx = createContext<KcThemeCtx | null>(null);

export function useKcTheme(): KcThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKcTheme must be used inside <ConsoleThemeProvider>');
  return ctx;
}

export function ConsoleThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<KcTheme>('light');
  const [density, setDensity] = useState<KcDensity>('normal');
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  // Read localStorage on mount — only renders once this fires.
  useEffect(() => {
    try {
      const t = localStorage.getItem('kc-theme');
      const d = localStorage.getItem('kc-density');
      if (t === 'light' || t === 'dark') setTheme(t);
      if (d === 'compact' || d === 'normal') setDensity(d);
    } catch { /* private browsing */ }
    setMounted(true);
  }, []);

  const persistTheme = useCallback((t: KcTheme) => {
    setTheme(t);
    localStorage.setItem('kc-theme', t);
  }, []);
  const persistDensity = useCallback((d: KcDensity) => {
    setDensity(d);
    localStorage.setItem('kc-density', d);
  }, []);

  const ctxValue = useMemo<KcThemeCtx>(
    () => ({ theme, density, setTheme: persistTheme, setDensity: persistDensity, rootEl }),
    [theme, density, persistTheme, persistDensity, rootEl],
  );

  // Don't render until we've read the saved theme — prevents SSR dark flash.
  if (!mounted) {
    return <div style={{ minHeight: '100vh', visibility: 'hidden' }} />;
  }

  return (
    <Ctx.Provider value={ctxValue}>
      <div
        ref={setRootEl}
        className={`kc-root ${theme === 'dark' ? 'dark' : ''}`}
        data-kc-theme={theme}
        data-kc-density={density}
        style={{ minHeight: '100vh' }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}
