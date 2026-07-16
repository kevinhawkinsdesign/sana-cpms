import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchResult, DEFAULT_SEARCH_CONFIG } from '@/lib/search/searchTypes';
import { searchMapbox } from '@/lib/search/mapboxSearchApi';
import { searchChargers } from '@/lib/search/chargerSearch';
import { blendResults } from '@/lib/search/resultBlender';
import { ChargerGeoJsonFeature } from '@/types/charger';

interface UseCustomSearchProps {
  query: string;
  chargers: ChargerGeoJsonFeature[];
  userLocation?: [number, number];
}

export function useCustomSearch({ query, chargers, userLocation }: UseCustomSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      // Run searches in parallel
      const [mapboxResults, chargerResults] = await Promise.all([
        searchMapbox(searchQuery, userLocation, abortControllerRef.current.signal),
        searchChargers(searchQuery, chargers, userLocation)
      ]);

      // Blend and score results (NO INTERLEAVING - pure score-based sort)
      const blended = blendResults(
        mapboxResults,
        chargerResults,
        userLocation,
        searchQuery,
        DEFAULT_SEARCH_CONFIG
      );

      setResults(blended);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [chargers, userLocation]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, DEFAULT_SEARCH_CONFIG.debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // Only depend on query, not performSearch

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { results, isLoading };
}
