import { motion, AnimatePresence } from 'framer-motion';
import { SearchResult } from '@/lib/search/searchTypes';
import SearchResultItem from './SearchResultItem';
import { Loader2 } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

export default function SearchResults({
  results,
  isLoading,
  selectedIndex,
  onSelect,
  onClose
}: SearchResultsProps) {
  // Group results by type for section headers
  const chargers = results.filter(r => r.type === 'charger');
  const locations = results.filter(r => r.type === 'location');
  const hasBothTypes = chargers.length > 0 && locations.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-2xl
                   border border-gray-200 z-50 max-h-96 overflow-y-auto"
        id="search-results"
        role="listbox"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm">No results found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <>
            {/* Chargers Section - only show header if both types present */}
            {chargers.length > 0 && (
              <div>
                {hasBothTypes && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500
                                  bg-gray-50 border-b border-gray-100 sticky top-0">
                    CHARGING STATIONS
                  </div>
                )}
                {chargers.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    isSelected={selectedIndex === results.indexOf(result)}
                    onClick={() => onSelect(result)}
                  />
                ))}
              </div>
            )}

            {/* Locations Section - only show header if both types present */}
            {locations.length > 0 && (
              <div>
                {hasBothTypes && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500
                                  bg-gray-50 border-b border-gray-100 sticky top-0">
                    PLACES
                  </div>
                )}
                {locations.map((result) => (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    isSelected={selectedIndex === results.indexOf(result)}
                    onClick={() => onSelect(result)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
