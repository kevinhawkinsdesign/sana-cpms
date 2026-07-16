'use client';

import React from 'react';

interface GoogleMapProps {
  src: string;
  height?: string;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  src, 
  height = '600px',
  className = ''
}) => {
  return (
    <div className={`bg-white p-2 rounded-xl shadow-sm ${className}`} style={{ height }}>
      <iframe
        src={src}
        className="w-full h-full"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default GoogleMap;