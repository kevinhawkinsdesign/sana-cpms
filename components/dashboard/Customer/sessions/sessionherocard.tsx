import React from 'react';
import { Zap } from 'lucide-react';

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

interface SessionHeroCardProps {
  session: Session;
}

export const SessionHeroCard: React.FC<SessionHeroCardProps> = ({ session }) => {
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  return (
    <button 
      className="relative h-[190px] w-full rounded-2xl overflow-hidden group cursor-pointer 
                 text-left focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
      aria-label={`View session at ${session.stationName}`}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={session.imageUrl || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&h=250&fit=crop'}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-semibold text-base mb-2 line-clamp-2">
          {session.stationName}
        </h3>
        
        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" aria-hidden="true" />
            <span>{session.energy} kWh</span>
          </div>
          <span className="text-white/60" aria-hidden="true">•</span>
          <div className="flex items-center gap-1">
            <span>{formatCurrency(session.cost, session.currency)}</span>
          </div>
        </div>
      </div>

      {/* Status badge - improved contrast */}
      {session.status === 'failed' && (
        <div className="absolute top-3 right-3 bg-red-600 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          Failed
        </div>
      )}
    </button>
  );
};