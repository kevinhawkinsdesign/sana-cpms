export type ResultType = 'charger' | 'location';

export interface SearchResult {
  id: string;
  name: string;
  address?: string;
  type: ResultType;
  coordinates: [number, number]; // [lng, lat]
  distance?: number; // in km
  textScore?: number; // 0-1
  score?: number; // combined final score
  source: 'mapbox' | 'chargers';

  // Charger-specific
  power?: number;
  status?: string;
  operationalStatus?: string;
  isKabisa?: boolean;
  availability?: {
    available: number;
    total: number;
  };

  // Mapbox-specific
  feature_type?: string;

  // For chargers, reference to full feature
  featureId?: string;
}

export interface TextMatchScores {
  nameScore: number;
  addressScore: number;
  idScore: number;
}

export interface ScoringWeights {
  // Text match field weights (should sum to 1.0)
  nameMatch: number;
  addressMatch: number;
  idMatch: number;

  // Overall category weights
  textRelevance: number;
  proximity: number;
  resultType: number;

  // Intent-based boosts
  intentBoost: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  // Field-level text weights
  nameMatch: 0.6,
  addressMatch: 0.3,
  idMatch: 0.1,

  // Category weights
  textRelevance: 0.4,
  proximity: 0.5,
  resultType: 0.1,

  // Intent boost
  intentBoost: 0.2
};

export interface SearchConfig {
  maxResults: number;
  maxChargers: number; // Max chargers to include
  maxLocations: number; // Max locations to include
  maxDistance: number; // km
  debounceMs: number;
  intentKeywords: string[];
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  maxResults: 10,
  maxChargers: 3,
  maxLocations: 7,
  maxDistance: 100,
  debounceMs: 250,
  intentKeywords: ['charger', 'charging', 'station', 'kabisa', 'ev', 'electric']
};
