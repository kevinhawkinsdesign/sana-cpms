'use client';

/** Shared URL-state + search wiring for console list pages (search query and
 *  page live in the URL; extra filters via `extraDefaults`). Keeps the
 *  search/pagination handlers in one place so list pages don't repeat them.
 *  Generic over the extra filter keys so `get('status')` etc. stay typed. */
import React from 'react';
import { useUrlState } from '@/lib/console/useUrlState';

export function useConsoleListState<E extends Record<string, string> = Record<string, never>>(
  extraDefaults?: E,
) {
  const { get, set, setMany } = useUrlState({ page: '1', q: '', ...extraDefaults } as { page: string; q: string } & E);
  const page = Math.max(1, Number(get('page')) || 1);
  const search = get('q');
  const [searchInput, setSearchInput] = React.useState(search);

  // Keep the input in sync when `q` changes outside typing (browser back/forward,
  // deep link). Typing doesn't change `q` until submit, so it isn't clobbered.
  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  return {
    get,
    set,
    setMany,
    page,
    search,
    searchInput,
    setSearchInput,
    submitSearch: () => setMany({ q: searchInput.trim(), page: '1' }),
    gotoPage: (p: number) => set('page', String(p)),
  };
}

/** Client-side pagination that clamps the page into range — an out-of-bounds
 *  `?page=` (e.g. after filtering shrinks the list) shows the last page, not an
 *  empty state. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    totalPages,
    page: current,
    pageItems: items.slice((current - 1) * pageSize, current * pageSize),
  };
}
