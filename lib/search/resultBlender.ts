import {
  SearchResult,
  TextMatchScores,
  ScoringWeights,
  SearchConfig,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_SEARCH_CONFIG
} from './searchTypes';

/**
 * Enhanced result blending with score-based sorting (no forced interleaving)
 */
export function blendResults(
  mapboxResults: SearchResult[],
  chargerResults: SearchResult[],
  userLocation?: [number, number],
  query?: string,
  config: SearchConfig = DEFAULT_SEARCH_CONFIG,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): SearchResult[] {
  // Detect search intent
  const hasIntent = detectIntent(query || '', config.intentKeywords);

  // Score Mapbox results
  const scoredMapbox = mapboxResults.map(result => ({
    ...result,
    score: calculateEnhancedScore(result, userLocation, hasIntent, weights, config)
  })).sort((a, b) => b.score - a.score);

  // Score charger results
  const scoredChargers = chargerResults.map(result => ({
    ...result,
    score: calculateEnhancedScore(result, userLocation, hasIntent, weights, config)
  })).sort((a, b) => b.score - a.score);

  // Take top N from each category
  const topMapbox = scoredMapbox.slice(0, config.maxLocations);
  const topChargers = scoredChargers.slice(0, config.maxChargers);

  // Combine and sort by score
  const combined = [...topMapbox, ...topChargers]
    .sort((a, b) => b.score - a.score);

  // Limit total results
  return combined.slice(0, config.maxResults);
}

/**
 * Detect if user is explicitly searching for chargers/stations
 */
function detectIntent(query: string, keywords: string[]): boolean {
  const normalized = query.toLowerCase().trim();
  return keywords.some(keyword => normalized.includes(keyword));
}

/**
 * Enhanced scoring with granular text matching and intent detection
 */
function calculateEnhancedScore(
  result: SearchResult,
  userLocation?: [number, number],
  hasIntent: boolean,
  weights: ScoringWeights,
  config: SearchConfig
): number {
  let score = 0;

  // 1. TEXT RELEVANCE (40%)
  if (result.textScore !== undefined) {
    score += result.textScore * weights.textRelevance;
  }

  // 2. PROXIMITY (50%)
  if (result.distance !== undefined) {
    const proximityScore = calculateProximityScore(result.distance, config.maxDistance);
    score += proximityScore * weights.proximity;
  }

  // 3. RESULT TYPE (10%)
  if (result.type === 'charger') {
    score += 0.15 * weights.resultType;

    // Extra boost for operational chargers
    if (result.operationalStatus?.toLowerCase() === 'operational') {
      score += 0.05 * weights.resultType;
    }

    // Small boost for Kabisa chargers (not overwhelming)
    if (result.isKabisa) {
      score += 0.05 * weights.resultType;
    }
  }

  // 4. INTENT-BASED BOOST
  if (hasIntent && result.type === 'charger') {
    score += weights.intentBoost;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Calculate granular text match score with field-level weights
 */
export function calculateTextScore(
  query: string,
  name?: string,
  address?: string,
  id?: string,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  const normalizedQuery = normalizeText(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (!tokens.length) return 0;

  const scores: TextMatchScores = {
    nameScore: name ? getFieldScore(tokens, normalizeText(name)) : 0,
    addressScore: address ? getFieldScore(tokens, normalizeText(address)) : 0,
    idScore: id ? getFieldScore(tokens, normalizeText(id)) : 0
  };

  // Weighted combination
  const combinedScore =
    scores.nameScore * weights.nameMatch +
    scores.addressScore * weights.addressMatch +
    scores.idScore * weights.idMatch;

  // Normalize to 0-1 range
  return Math.min(combinedScore / 3, 1.0);
}

/**
 * Get best match score for a field
 */
function getFieldScore(tokens: string[], targetField: string): number {
  return tokens.reduce((best, token) => {
    const score = getTokenScore(token, targetField);
    return Math.max(best, score);
  }, 0);
}

/**
 * Score individual token against target
 */
function getTokenScore(token: string, target: string): number {
  if (!token || !target) return 0;

  // Exact match at start (highest priority)
  if (target.startsWith(token)) return 3;

  // Exact word match
  const words = target.split(' ');
  if (words.some(word => word === token)) return 2.5;

  // Word starts with token
  if (words.some(word => word.startsWith(token))) return 2;

  // Contains anywhere
  if (target.includes(token)) return 1;

  return 0;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate proximity score with distance decay
 */
function calculateProximityScore(distanceKm: number, maxDistance: number): number {
  if (distanceKm === 0) return 1.0;
  if (distanceKm >= maxDistance) return 0;

  // Exponential decay - closer locations get much higher scores
  const ratio = distanceKm / maxDistance;
  return Math.pow(1 - ratio, 1.5);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  from: [number, number],
  to: [number, number]
): number {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const toRad = (deg: number) => deg * (Math.PI / 180);
