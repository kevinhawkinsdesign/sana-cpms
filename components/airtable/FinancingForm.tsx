'use client';

import React from 'react';
import AirtableLoader from '@/components/shared/AirtableLoader';

const FinancingForm: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="bg-gray-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            KABISA
          </h1>
          <div className="bg-gray-700 px-4 py-1 rounded-full">
            <span className="text-white text-sm font-medium">
              Financing
            </span>
          </div>
        </div>
        <h2 className="text-xl text-gray-200 mt-2">
          Do you qualify for financing?
        </h2>
        <p className="text-gray-300 mt-2 text-sm">
          Our EV experts will contact you to determine if you qualify for
          financing.
        </p>
      </div>

      <div className="p-8">
        <AirtableLoader
          formUrl="https://airtable.com/embed/appcxJlWp5SUD3aUU/pagS6NVCrDHzJNnfD/form"
          height="750px"
          className="w-full"
        />
        
      </div>
    </div>
  );
};

export default FinancingForm;