import { SearchResult } from './searchTypes';
import { calculateDistance } from './resultBlender';

// Nominatim (OpenStreetMap's free geocoder) — no API key, but usage policy
// requires a descriptive request (no bulk/automated traffic, be a good
// citizen). https://operations.osmfoundation.org/policies/nominatim/
const GEOCODING_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: Record<string, string>;
}

/**
 * Search OpenStreetMap (via Nominatim) for places/locations.
 */
export async function searchMapbox(
  query: string,
  proximity?: [number, number],
  signal?: AbortSignal
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '10',
    });

    // Nominatim has no true proximity bias param; a soft viewbox (bounded=0)
    // around the user's location nudges ranking without excluding results.
    if (proximity) {
      const [lon, lat] = proximity;
      const delta = 0.5; // ~50km box
      params.append('viewbox', `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`);
      params.append('bounded', '0');
    }

    const url = `${GEOCODING_URL}?${params}`;
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, await response.text());
      return [];
    }

    const data: NominatimResult[] = await response.json();

    const results: SearchResult[] = data.map((feature) => {
      const coords: [number, number] = [parseFloat(feature.lon), parseFloat(feature.lat)];
      const distance = proximity ? calculateDistance(proximity, coords) : undefined;
      const [name, ...rest] = feature.display_name.split(', ');

      return {
        id: String(feature.place_id),
        name,
        address: rest.join(', ') || feature.display_name,
        type: 'location',
        coordinates: coords,
        distance,
        source: 'mapbox',
        feature_type: feature.type,
      };
    });

    return results;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error('Nominatim search error:', error);
    return [];
  }
}
