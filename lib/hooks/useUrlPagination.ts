'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface UseUrlPaginationOptions {
  /** Query-param name for the page index. Defaults to `page`. */
  pageParam?: string
  /** Query-param name for the page size. Defaults to `limit`. */
  limitParam?: string
  /** Page number that should not appear in the URL. Defaults to 1 (clean URLs on the first page). */
  defaultPage?: number
  /** Page size that should not appear in the URL. Defaults to 10. */
  defaultLimit?: number
  /** Cap honored when reading `?limit=` from the URL — prevents abusive deep links. */
  maxLimit?: number
}

const clampInt = (value: number, min: number, max: number) =>
  Math.min(Math.max(Math.round(value), min), max)

const parsePositiveInt = (raw: string | null | undefined): number | null => {
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Read a query param from `useSearchParams`, falling back to `window.location`.
 *
 * Why the fallback: in Next.js App Router, `useSearchParams()` can return null
 * (or an empty object) during the very first render before hydration completes.
 * Without the fallback a deep link like `?page=30` reads as page 1 on the first
 * paint, the query fires for page 1, and the user lands on the wrong page even
 * though the URL still says `?page=30`.
 */
const readParam = (
  searchParams: ReturnType<typeof useSearchParams>,
  key: string,
): string | null => {
  const fromHook = searchParams?.get(key) ?? null
  if (fromHook !== null) return fromHook
  if (typeof window === 'undefined') return null
  try {
    return new URLSearchParams(window.location.search).get(key)
  } catch {
    return null
  }
}

/**
 * Drive a paginated table from the URL so refreshes and shareable links keep
 * the user on the same page (and at the same page size).
 *
 * - Reads `?page=` and `?limit=` lazily; falls back to the configured defaults.
 * - `setPage(n)` / `setLimit(n)` use `router.replace`, preserving every other
 *   query param. Each strips its own param entirely when navigating back to
 *   the default value so the URL stays clean.
 */
export function useUrlPagination({
  pageParam = 'page',
  limitParam = 'limit',
  defaultPage = 1,
  defaultLimit = 10,
  maxLimit = 200,
}: UseUrlPaginationOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Seed lazily from `window.location` so the first render of a deep-linked
  // `?page=30` URL doesn't fall back to the default before hydration completes.
  const readPage = useCallback(
    () => parsePositiveInt(readParam(searchParams, pageParam)) ?? defaultPage,
    [searchParams, pageParam, defaultPage],
  )
  const readLimit = useCallback(() => {
    const parsed = parsePositiveInt(readParam(searchParams, limitParam))
    return parsed ? clampInt(parsed, 1, maxLimit) : defaultLimit
  }, [searchParams, limitParam, defaultLimit, maxLimit])

  const [currentPage, setCurrentPageState] = useState<number>(readPage)
  const [currentLimit, setCurrentLimitState] = useState<number>(readLimit)

  // Keep local state in sync with later URL changes (e.g. back/forward, or
  // another component pushing a new URL).
  useEffect(() => {
    const nextPage = readPage()
    if (nextPage !== currentPage) setCurrentPageState(nextPage)
    const nextLimit = readLimit()
    if (nextLimit !== currentLimit) setCurrentLimitState(nextLimit)
  }, [readPage, readLimit, currentPage, currentLimit])

  const writeParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      // Compose from the *current* URL search string, not from the hook's
      // possibly-stale snapshot, so we never lose other params during a write.
      const base =
        typeof window !== 'undefined'
          ? window.location.search.replace(/^\?/, '')
          : searchParams.toString()
      const params = new URLSearchParams(base)
      mutator(params)
      const qs = params.toString()
      // `scroll: false` keeps the page anchored. Without it, every page /
      // limit change (or sibling param flip) would jump to the top.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setPage = useCallback(
    (next: number) => {
      writeParams((params) => {
        if (next === defaultPage || next < 1) params.delete(pageParam)
        else params.set(pageParam, String(next))
      })
    },
    [writeParams, pageParam, defaultPage],
  )

  const setLimit = useCallback(
    (next: number) => {
      writeParams((params) => {
        if (next === defaultLimit || next < 1) params.delete(limitParam)
        else params.set(limitParam, String(clampInt(next, 1, maxLimit)))
        // Changing page size invalidates the current page index — reset it so
        // the user doesn't land on a phantom page after picking a larger size.
        params.delete(pageParam)
      })
    },
    [writeParams, limitParam, pageParam, defaultLimit, maxLimit],
  )

  /**
   * Convenience for inputs that change filters (search, status) — reset the
   * page back to the default so the user doesn't end up on an out-of-range page.
   */
  const resetPage = useCallback(() => setPage(defaultPage), [setPage, defaultPage])

  return { currentPage, currentLimit, setPage, setLimit, resetPage }
}
