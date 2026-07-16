/**
 * Charger geofence resolution for shift check-in/out — builds on the geo
 * primitives in `geo.ts` and adds the chargers-list fetch + charger-coordinate
 * matching shared by the legacy dashboard and the console operator pages.
 */
import { toast } from 'sonner'
import type { Coords } from './geo'

export { GEOFENCE_RADIUS_M, distanceMeters, formatKm, getLocationOnce } from './geo'
export type { Coords } from './geo'

export interface Charger {
  id: string
  kabisaId?: string
  name?: string
  address?: string
  latitude?: number | string | null
  longitude?: number | string | null
  [k: string]: unknown
}

/** Drop trailing slashes without a regex (avoids the ReDoS hotspot a `/\/+$/`
 *  pattern raises). */
function stripTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') end--
  return value.slice(0, end)
}

// Build an absolute chargers URL from env (never relative).
const API_BASE = stripTrailingSlashes(process.env.NEXT_PUBLIC_API_URL || '')
export const CHARGERS_URL = `${API_BASE}/api/client/chargers`
export const hasApiBase = (): boolean => !!API_BASE

export async function fetchChargersList(): Promise<Charger[]> {
  if (!API_BASE) {
    console.error('[Chargers] NEXT_PUBLIC_API_URL is not set')
    toast.error('Missing NEXT_PUBLIC_API_URL env var.')
    return []
  }

  const res = await fetch(CHARGERS_URL, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[Chargers] HTTP error', res.status, res.statusText, text)
    throw new Error(`Failed to fetch chargers: ${res.status} ${res.statusText}`)
  }

  const data = await res.json().catch((e) => {
    console.error('[Chargers] Failed to parse JSON:', e)
    throw e
  })

  // The endpoint has shipped a few envelope shapes over time; take the first
  // array we find across the known locations.
  const list = firstArray(data?.data?.chargers, data?.chargers, data?.data, data)

  if (list.length === 0) {
    toast.error('Chargers list came back empty from /api/client/chargers')
  }

  return list as Charger[]
}

/** First argument that is an array, else an empty array. */
function firstArray(...candidates: unknown[]): unknown[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

const toNumber = (v: unknown): number | undefined => {
  if (v == null) return undefined
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Prefer coordinates embedded on the shift's charger. */
export function shiftChargerCoords(shift?: any): Coords | null {
  const c: any = shift?.charger
  if (!c) return null
  const latRaw = c.latitude ?? c.Latitude ?? c?.location?.lat
  const lngRaw = c.longitude ?? c.Longitude ?? c?.location?.lng
  const lat = typeof latRaw === 'string' ? Number.parseFloat(latRaw) : latRaw
  const lng = typeof lngRaw === 'string' ? Number.parseFloat(lngRaw) : lngRaw
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

/** Resolve a shift's charger against the chargers list (kabisaId → id →
 *  shift.chargerId → name) and read its coordinates. */
export function matchChargerFromList(
  shift?: any,
  chargersList: Charger[] = []
): { matched: Charger | null; coords: Coords | null } {
  const matched = findCharger(shift, chargersList)
  if (!matched) return { matched: null, coords: null }

  const lat = toNumber(matched.latitude)
  const lng = toNumber(matched.longitude)
  const coords = lat != null && lng != null ? { lat, lng } : null
  return { matched, coords }
}

// Coerce to string before trimming — `shift` is `any`, so a numeric kabisaId /
// name from the API must not throw a TypeError on .trim().
const trimEq = (a: unknown, b: unknown) => String(a ?? '').trim() === String(b ?? '').trim()

/** First charger matching the shift, trying kabisaId → id → shift.chargerId →
 *  name in priority order. */
function findCharger(shift: any, list: Charger[]): Charger | null {
  const c = shift?.charger
  if (!shift) return null
  const byKabisaId = c?.kabisaId && list.find((x) => trimEq(x.kabisaId, c.kabisaId))
  const byId = c?.id && list.find((x) => x.id === c.id)
  const byShiftChargerId = shift.chargerId && list.find((x) => x.id === shift.chargerId)
  const byName = c?.name && list.find((x) => trimEq(x.name, c.name))
  return byKabisaId || byId || byShiftChargerId || byName || null
}
