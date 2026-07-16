import { motion } from 'framer-motion';
import { ArrowLeft, Navigation, Battery, Zap, ChevronDown } from 'lucide-react';
import { SearchResult } from '@/lib/search/searchTypes';

interface MobileChargerPreviewProps {
  result: SearchResult;
  onBack: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}

export function MobileChargerPreview({
  result,
  onBack,
  onViewDetails,
  onClose
}: MobileChargerPreviewProps) {
  const formatDistance = (km?: number) => {
    if (!km) return null;
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-50 text-gray-600';
    const normalized = status.toLowerCase();
    if (normalized === 'operational') return 'bg-green-50 text-green-600';
    if (normalized === 'maintenance') return 'bg-yellow-50 text-yellow-600';
    return 'bg-red-50 text-red-600';
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 z-50
                 bg-white rounded-t-3xl shadow-2xl"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, info) => {
        // Close if dragged down more than 100px
        if (info.offset.y > 100) {
          onClose();
        }
      }}
    >
      {/* Drag Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <button
          onClick={onClose}
          className="w-12 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
          aria-label="Close preview"
        />
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Back to search"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Battery className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-lg truncate">{result.name}</h3>
          </div>
          {result.address && (
            <p className="text-sm text-gray-500 truncate">{result.address}</p>
          )}
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Power */}
          {result.power && (
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">Power</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {result.power}kW
              </div>
            </div>
          )}

          {/* Distance */}
          {result.distance !== undefined && (
            <div className="bg-green-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Navigation className="w-4 h-4" />
                <span className="text-xs font-medium">Distance</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatDistance(result.distance)}
              </div>
            </div>
          )}

          {/* Availability */}
          {result.availability && (
            <div className={`rounded-xl p-3 ${
              result.availability.available > 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`flex items-center gap-2 mb-1 ${
                result.availability.available > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <Battery className="w-4 h-4" />
                <span className="text-xs font-medium">Available</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {result.availability.available}/{result.availability.total}
              </div>
            </div>
          )}

          {/* Status */}
          {result.operationalStatus && (
            <div className={`rounded-xl p-3 ${getStatusColor(result.operationalStatus)}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">Status</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 capitalize">
                {result.operationalStatus}
              </div>
            </div>
          )}
        </div>

        {/* Kabisa Badge */}
        {result.isKabisa && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-sm font-semibold text-blue-900">
                Kabisa Charging Station
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="px-4 pb-safe pb-6">
        <button
          onClick={onViewDetails}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl
                     font-semibold flex items-center justify-center gap-2
                     hover:bg-blue-700 active:bg-blue-800 transition-colors
                     shadow-lg shadow-blue-600/20"
        >
          View Full Details
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
