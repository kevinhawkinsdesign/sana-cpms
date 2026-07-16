'use client';

/**
 * URL-backed page state for console screens (KAB-139). Console pages keep their
 * view state — filters, tab, search, pagination, calendar view + date, selected
 * operator — in the query string so views are deep-linkable + shareable and the
 * browser back/forward + refresh preserve state.
 *
 * Usage:
 *   const { get, set, setMany } = useUrlState({ tab: 'all', page: '1' });
 *   const tab = get('tab');             // reads URL, falling back to the default
 *   set('tab', 'active');               // writes ?tab=active (resetting nothing)
 *   setMany({ tab: 'active', page: '1' }); // batch update (e.g. reset page on filter change)
 *
 * Values equal to their default are dropped from the URL to keep it clean.
 */
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type UrlDefaults = Record<string, string>;

export function useUrlState<D extends UrlDefaults>(defaults: D) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: keyof D & string): string => searchParams.get(key) ?? defaults[key],
    [searchParams, defaults],
  );

  const commit = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setMany = useCallback(
    // Keyed by string (not `keyof D`) so a computed-key object from `set` needs
    // no type assertion; unknown keys are harmless (defaults[key] is undefined).
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        // Drop params that are null/empty or equal to their default value.
        if (value == null || value === '' || value === defaults[key]) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      commit(next);
    },
    [searchParams, defaults, commit],
  );

  const set = useCallback(
    (key: keyof D & string, value: string | null) => setMany({ [key]: value }),
    [setMany],
  );

  return { get, set, setMany };
}
