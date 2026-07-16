import { Search, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import SearchResults from './SearchResults';
import { SearchResult } from '@/lib/search/searchTypes';
import { useCustomSearch } from './useCustomSearch';
import { ChargerGeoJsonFeature } from '@/types/charger';

interface MobileSearchExpandedProps {
  chargers: ChargerGeoJsonFeature[];
  userLocation?: [number, number];
  onResultSelect: (result: SearchResult) => void;
  onCollapse: () => void;
}

export function MobileSearchExpanded({
  chargers,
  userLocation,
  onResultSelect,
  onCollapse
}: MobileSearchExpandedProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading } = useCustomSearch({
    query,
    chargers,
    userLocation
  });

  // Auto-focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!query || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onResultSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onCollapse();
        break;
    }
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute top-0 left-0 right-0 z-50 bg-white shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button
          onClick={onCollapse}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search chargers or places..."
            className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-full
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(-1);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-200
                         rounded-full p-1 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-h-[calc(100vh-80px)] overflow-y-auto"
          >
            {results.length > 0 || isLoading ? (
              <SearchResults
                results={results}
                isLoading={isLoading}
                selectedIndex={selectedIndex}
                onSelect={onResultSelect}
                onClose={onCollapse}
              />
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-gray-500">No results found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try searching for a different location or charger
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state when no query */}
      {!query && (
        <div className="px-4 py-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Search for chargers or places</p>
          <p className="text-sm text-gray-400 mt-1">
            Try &quot;Kigali&quot;, &quot;Kabisa&quot;, or a specific location
          </p>
        </div>
      )}
    </motion.div>
  );
}
