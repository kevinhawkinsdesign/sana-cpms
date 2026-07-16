'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/lib/utils/authStorage'
import type { CitrineEvent } from '@/lib/api/admin'

type Status = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'paused'

interface UseCitrineEventStreamOptions {
  backfill?: number
  ringSize?: number
  paused?: boolean
  enabled?: boolean
  onEvent?: (event: CitrineEvent) => void
}

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

/**
 * Tail /api/admin/citrine/events/stream (SSE) with Bearer auth.
 * Uses fetch + ReadableStream instead of EventSource so we can send the
 * Authorization header (EventSource does not support custom headers).
 */
export function useCitrineEventStream({
  backfill = 20,
  ringSize = 500,
  paused = false,
  enabled = true,
  onEvent,
}: UseCitrineEventStreamOptions = {}) {
  const [events, setEvents] = useState<CitrineEvent[]>([])
  const [status, setStatus] = useState<Status>('idle')

  const abortRef = useRef<AbortController | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF_MS)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmounted = useRef(false)
  const onEventRef = useRef(onEvent)
  const pausedRef = useRef(paused)

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const pushEvent = useCallback((ev: CitrineEvent) => {
    if (pausedRef.current) return
    setEvents((prev) => {
      const next = [ev, ...prev]
      if (next.length > ringSize) next.length = ringSize
      return next
    })
    try { onEventRef.current?.(ev) } catch { /* ignore */ }
  }, [ringSize])

  const clear = useCallback(() => setEvents([]), [])

  useEffect(() => {
    isUnmounted.current = false

    if (!enabled) {
      setStatus('idle')
      return
    }

    if (paused) {
      setStatus('paused')
      return
    }

    async function connect() {
      if (isUnmounted.current) return
      const token = getAccessToken()
      if (!token) {
        scheduleReconnect()
        return
      }

      const base = (process.env.NEXT_PUBLIC_API_URL || 'https://new-api.gokabisa.com').replace(/\/$/, '')
      const url = `${base}/api/admin/citrine/events/stream?backfill=${encodeURIComponent(String(backfill))}`

      const ac = new AbortController()
      abortRef.current = ac
      setStatus((s) => (s === 'connected' ? 'reconnecting' : 'connecting'))

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: ac.signal,
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok || !res.body) {
          throw new Error(`SSE HTTP ${res.status}`)
        }

        setStatus('connected')
        backoffRef.current = INITIAL_BACKOFF_MS

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        // SSE frames are separated by a blank line (\n\n).
        // Each frame may contain multiple `data:` lines; concat with \n per spec.
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sep: number
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            if (!frame) continue

            const dataLines: string[] = []
            for (const raw of frame.split('\n')) {
              if (!raw || raw.startsWith(':')) continue // comment / keepalive
              if (raw.startsWith('data:')) dataLines.push(raw.slice(5).replace(/^ /, ''))
            }
            if (!dataLines.length) continue
            const payload = dataLines.join('\n')
            try {
              const parsed = JSON.parse(payload) as CitrineEvent
              pushEvent(parsed)
            } catch {
              // ignore malformed frame
            }
          }
        }

        // Stream closed cleanly — reconnect
        if (!isUnmounted.current) scheduleReconnect()
      } catch {
        if (ac.signal.aborted || isUnmounted.current) return
        setStatus('error')
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (isUnmounted.current) return
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
      setStatus('reconnecting')
      reconnectTimer.current = setTimeout(() => {
        if (!isUnmounted.current) connect()
      }, delay)
    }

    connect()

    return () => {
      isUnmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [enabled, paused, backfill, pushEvent])

  return { events, status, clear, setEvents }
}
