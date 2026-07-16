import { SearchResult, DEFAULT_SCORING_WEIGHTS } from './searchTypes';
import { calculateTextScore, calculateDistance } from './resultBlender';
import { ChargerGeoJsonFeature } from '@/types/charger';

/**
 * Search local chargers with enhanced text matching
 */
export async function searchChargers(
  query: string,
  chargers: ChargerGeoJsonFeature[],
  userLocation?: [number, number]
): Promise<SearchResult[]> {
  if (!query.trim() || !chargers.length) return [];

  const normalizedQuery = query.toLowerCase().trim();

  // Score and filter chargers
  const scoredChargers = chargers
    .map(feature => {
      const props = feature.properties;

      // Calculate text relevance score using granular field weights
      const textScore = calculateTextScore(
        query,
        props.name,
        props.address,
        props.kabisaId,
        DEFAULT_SCORING_WEIGHTS
      );

      // Skip if no text match
      if (textScore === 0) return null;

      // Calculate distance if user location available
      const coords = feature.geometry.coordinates;
      const distance = userLocation
        ? calculateDistance(userLocation, coords)
        : undefined;

      return {
        id: feature.id,
        name: props.name || 'Charging Station',
        address: props.address || 'Location not specified',
        type: 'charger' as const,
        coordinates: coords,
        distance,
        textScore,
        source: 'chargers' as const,

        // Charger-specific data
        power: props.power,
        status: props.status,
        operationalStatus: props.operationalStatus,
        isKabisa: props.isKabisa,
        availability: props.availability,
        featureId: feature.id
      } as SearchResult;
    })
    .filter((result): result is SearchResult => result !== null);

  return scoredChargers;
}

/**
 * Get charger by ID from feature list
 */
export function getChargerById(
  chargerId: string,
  chargers: ChargerGeoJsonFeature[]
): ChargerGeoJsonFeature | null {
  return chargers.find(c => c.id === chargerId) || null;
}
