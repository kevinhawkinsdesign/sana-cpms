export const GEOFENCE_RADIUS_M = 100

export type Coords = { lat: number; lng: number }

export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const x = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function formatKm(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return '—'
  return `${(m / 1000).toFixed(2)} km`
}

export async function getLocationOnce(timeoutMs = 15000, highAccuracy = true): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported on this device/browser.'))
      return
    }
    const timer = setTimeout(() => reject(new Error('Location request timed out.')), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        clearTimeout(timer)
        reject(new Error(err?.message || 'Failed to get location.'))
      },
      { enableHighAccuracy: highAccuracy, maximumAge: 0, timeout: timeoutMs }
    )
  })
}
