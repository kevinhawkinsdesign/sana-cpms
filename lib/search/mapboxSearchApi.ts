import { SearchResult } from './searchTypes';
import { calculateDistance } from './resultBlender';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

interface GeocodingFeature {
  id: string;
  type: 'Feature';
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
  };
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface GeocodingResponse {
  type: 'FeatureCollection';
  query: string[];
  features: GeocodingFeature[];
}

/**
 * Search Mapbox for places/locations using Geocoding API v5
 */
export async function searchMapbox(
  query: string,
  proximity?: [number, number],
  signal?: AbortSignal
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    // Build URL - encode the query properly
    const encodedQuery = encodeURIComponent(query);
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: '10',
      types: 'place,locality,address,poi,neighborhood',
      language: 'en'
    });

    if (proximity) {
      params.append('proximity', `${proximity[0]},${proximity[1]}`);
    }

    const url = `${GEOCODING_URL}/${encodedQuery}.json?${params}`;
    const response = await fetch(url, { signal });

    if (!response.ok) {
      console.error('Mapbox API error:', response.status, await response.text());
      return [];
    }

    const data: GeocodingResponse = await response.json();

    // Convert features to SearchResult format
    const results: SearchResult[] = data.features.map(feature => {
      const coords = feature.geometry.coordinates as [number, number];
      const distance = proximity ? calculateDistance(proximity, coords) : undefined;

      return {
        id: feature.id,
        name: feature.text,
        address: extractAddress(feature),
        type: 'location',
        coordinates: coords,
        distance,
        source: 'mapbox',
        feature_type: feature.place_type[0]
      };
    });

    return results;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error('Mapbox search error:', error);
    return [];
  }
}

/**
 * Extract readable address from geocoding feature
 */
function extractAddress(feature: GeocodingFeature): string {
  // Use place_name but remove the first part (which is the name itself)
  const parts = feature.place_name.split(', ');
  if (parts.length > 1) {
    return parts.slice(1).join(', ');
  }

  // Fallback to context
  if (feature.context && feature.context.length > 0) {
    return feature.context.map(c => c.text).join(', ');
  }

  return feature.place_name;
}
