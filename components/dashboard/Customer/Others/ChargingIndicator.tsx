'use client';

import { Battery } from 'lucide-react';

const ChargingIndicator = () => {
  return (
    <div className="flex items-center gap-2 relative">
      <Battery className="h-6 w-6 text-yellow-500" />
      <div className="absolute left-[11px] top-[8px] w-[10px] h-[8px] overflow-hidden">
        <div className="w-[10px] h-[8px] bg-yellow-500 animate-pulse" />
      </div>
      
      {/* Charging dots animation */}
      <div className="flex items-center gap-1">
        <div className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce" style={{ 
          animationDelay: '0ms',
          animationDuration: '1s'
        }} />
        <div className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce" style={{ 
          animationDelay: '200ms',
          animationDuration: '1s'
        }} />
        <div className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce" style={{ 
          animationDelay: '400ms',
          animationDuration: '1s'
        }} />
      </div>
    </div>
  );
};

export default ChargingIndicator;