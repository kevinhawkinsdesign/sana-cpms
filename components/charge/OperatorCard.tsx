'use client';

import { Operator } from '@/types/index';
import { Check } from 'lucide-react';
import Image from 'next/image';

interface OperatorCardProps {
  operator: Operator;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

export const OperatorCard = ({ operator, isSelected, onSelect }: OperatorCardProps) => {
  const hasKabisaId = Boolean(operator.KabisaID);

  return (
    <div 
      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105' 
          : 'border-gray-200 hover:border-blue-300 bg-white'
      }`}
      onClick={() => onSelect(operator.ID)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(operator.ID);
        }
      }}
      aria-label={`Select operator ${operator.Name}`}
    >
      {/* Selection Checkmark */}
      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
        isSelected ? 'bg-blue-500 scale-110' : 'bg-gray-200'
      }`}>
        <Check 
          className={`h-4 w-4 text-white transition-all duration-200 ${
            isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`} 
        />
      </div>

      {/* Kabisa ID Badge */}
      {hasKabisaId && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          Already Generated
        </div>
      )}

      {/* Operator Photo */}
      <div className="flex justify-center mb-3">
        {operator.Headshot?.[0] ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
            <Image 
              src={operator.Headshot[0]} 
              alt={`${operator.Name} headshot`}
              fill
              sizes="96px"
              className="object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
                      ${operator.Name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                    </div>
                  `;
                }
              }}
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
            {operator.Name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Operator Info */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-gray-900 truncate" title={operator.Name}>
          {operator.Name || 'Unknown Operator'}
        </h3>
        <p className="text-sm text-gray-500">
          ID: {operator.ID}
        </p>
        {hasKabisaId && (
          <p className="text-sm text-green-600 font-medium">
            Kabisa ID: {operator.KabisaID}
          </p>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
          <div className="absolute inset-0 bg-blue-500 opacity-5 rounded-lg"></div>
        </div>
      )}
    </div>
  );
};