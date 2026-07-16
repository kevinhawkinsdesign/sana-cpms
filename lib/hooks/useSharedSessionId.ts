'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Manage a shareable `?sessionId=` query param on the current route.
 *
 * - `sharedSessionId` reflects the URL state (empty string when absent).
 * - `setSharedSessionId(id | null)` updates the URL via `router.replace`,
 *   preserving every other query param.
 * - `consumeSessionId(id)` is exposed so the auto-open logic can mark a
 *   sessionId as "already handled" — that prevents the close→reopen race
 *   between `setIsOpen(false)` (sync) and `router.replace(null)` (async).
 */

const readParam = (
  searchParams: ReturnType<typeof useSearchParams>,
  key: string,
): string => {
  const fromHook = searchParams?.get(key)
  if (fromHook) return fromHook
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get(key) || ''
  } catch {
    return ''
  }
}

export function useSharedSessionId(paramName: string = 'sessionId') {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Seed from window.location so a deep link like `?sessionId=...` opens the
  // popup on the very first render, before Next.js' useSearchParams hydrates.
  const readId = useCallback(
    () => readParam(searchParams, paramName),
    [searchParams, paramName],
  )
  const [sharedSessionId, setSharedSessionIdState] = useState<string>(readId)

  useEffect(() => {
    const next = readId()
    if (next !== sharedSessionId) setSharedSessionIdState(next)
  }, [readId, sharedSessionId])

  const consumedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!sharedSessionId) consumedRef.current = null
  }, [sharedSessionId])

  const setSharedSessionId = useCallback(
    (id: string | null) => {
      // Read the latest URL directly so concurrent writes from other hooks
      // (pagination, etc.) aren't clobbered by a stale snapshot.
      const base =
        typeof window !== 'undefined'
          ? window.location.search.replace(/^\?/, '')
          : searchParams.toString()
      const params = new URLSearchParams(base)
      if (id) params.set(paramName, id)
      else params.delete(paramName)
      const qs = params.toString()
      // `scroll: false` is critical: opening the popup updates this param, and
      // Next.js's default behavior would scroll to top on every replace,
      // tearing the user away from the row they just clicked.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, paramName],
  )

  // Stable identities — both read/write a ref only. Without useCallback they
  // get recreated each render, which churns the deps of consuming effects
  // (e.g. the auto-open useEffect in /charge/sessions/page.tsx).
  const hasConsumed = useCallback((id: string) => consumedRef.current === id, [])
  const markConsumed = useCallback((id: string) => {
    consumedRef.current = id
  }, [])

  return {
    sharedSessionId,
    setSharedSessionId,
    hasConsumed,
    markConsumed,
  }
}
