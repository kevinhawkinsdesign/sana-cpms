import React from 'react';
import { Battery } from 'lucide-react';

interface Session {
  id: string;
  stationName: string;
  stateOfCharge: number;
  energy: number;
  cost: number;
  currency: 'RWF' | 'USD';
  imageUrl?: string;
  status: 'completed' | 'failed';
}

interface SessionRowProps {
  session: Session;
}

export const SessionRow: React.FC<SessionRowProps> = ({ session }) => {
  // Format currency with thousand separators
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    // For RWF, add thousand separators
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Determine SOC color - improved contrast
  const getSocColor = (soc: number) => {
    if (soc >= 80) return 'text-green-600';
    if (soc >= 50) return 'text-amber-500'; // Better contrast than yellow-600
    return 'text-red-600';
  };

  return (
    <button 
      className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 
                 transition-colors cursor-pointer text-left focus:outline-none 
                 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
      aria-label={`Session at ${session.stationName}, ${session.energy} kWh, ${formatCurrency(session.cost, session.currency)}`}
    >
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Yellow K icon */}
          <div className="w-10 h-10 bg-yellow-400 ring-1 ring-yellow-500/50 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <span className="font-bold text-gray-900 text-lg">K</span>
          </div>
          
          {/* Station info */}
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">
              {session.stationName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Battery className={`h-3 w-3 ${getSocColor(session.stateOfCharge)}`} aria-hidden="true" />
              <span className={`text-xs ${getSocColor(session.stateOfCharge)}`}>
                {session.stateOfCharge}% SOC
              </span>
              {session.status === 'failed' && (
                <span className="text-xs text-red-500 ml-2">• Failed</span>
              )}
            </div>
          </div>
        </div>

        {/* Middle section - Energy (hidden on mobile) */}
        <div className="hidden md:block">
          <p className="font-medium text-gray-900">
            {session.energy} <span className="text-sm text-gray-500">kWh</span>
          </p>
        </div>

        {/* Right section - Price */}
        <div className="text-right">
          <p className="font-bold text-gray-900 text-sm sm:text-base">
            {formatCurrency(session.cost, session.currency)}
          </p>
        </div>
      </div>
    </button>
  );
};