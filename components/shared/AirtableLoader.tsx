'use client';

import React, { useEffect } from 'react';
import IframeLoader from './IframeLoader';

interface AirtableLoaderProps {
  formUrl: string;
  height?: string | number;
  className?: string;
}

const AirtableLoader: React.FC<AirtableLoaderProps> = ({
  formUrl,
  height = '300px',
  className = '',
}) => {
  useEffect(() => {
    // Load Airtable embed script
    const script = document.createElement('script');
    script.src = 'https://static.airtable.com/js/embed/embed_snippet_v1.js';
    script.async = true;
    document.body.appendChild(script);

    // Clean up function
    return () => {
      const existingScript = document.querySelector(
        'script[src="https://static.airtable.com/js/embed/embed_snippet_v1.js"]'
      );
      if (existingScript && document.body.contains(existingScript)) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className={`airtable-embed airtable-dynamic-height ${className}`}>
      <IframeLoader
        src={formUrl}
        height={height}
        title="Airtable form"
      />
    </div>
  );
};

export default AirtableLoader;