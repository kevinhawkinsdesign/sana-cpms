import { SearchResult } from '@/lib/search/searchTypes';
import { Battery, MapPin, Navigation, Zap } from 'lucide-react';

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

export default function SearchResultItem({
  result,
  isSelected,
  onClick
}: SearchResultItemProps) {
  const formatDistance = (km?: number) => {
    if (!km) return null;
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  };

  const Icon = result.type === 'charger' ? Battery : MapPin;
  const isCharger = result.type === 'charger';

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50
        transition-colors cursor-pointer border-b border-gray-100 last:border-0
        text-left focus:outline-none focus:bg-blue-50
        ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''}
      `}
      role="option"
      aria-selected={isSelected}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5
        ${isCharger ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
      `}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="font-medium text-gray-900 truncate">
          {result.name}
        </div>

        {/* Address */}
        {result.address && (
          <div className="text-sm text-gray-500 truncate mt-0.5">
            {result.address}
          </div>
        )}

        {/* Charger-specific info */}
        {isCharger && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Power */}
            {result.power && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600
                               bg-gray-100 px-2 py-0.5 rounded">
                <Zap className="w-3 h-3" />
                {result.power}kW
              </span>
            )}

            {/* Availability */}
            {result.availability && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                result.availability.available > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {result.availability.available}/{result.availability.total} available
              </span>
            )}

            {/* Kabisa badge */}
            {result.isKabisa && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                Kabisa
              </span>
            )}
          </div>
        )}
      </div>

      {/* Distance Badge */}
      {result.distance !== undefined && (
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-600
                        bg-gray-100 px-2 py-1 rounded-full self-start mt-0.5">
          <Navigation className="w-3 h-3" />
          <span className="font-medium">{formatDistance(result.distance)}</span>
        </div>
      )}
    </button>
  );
}
