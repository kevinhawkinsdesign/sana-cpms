'use client'; 

import React, { useState, useEffect } from 'react';
import AirtableLoader from '@/components/shared/AirtableLoader';
import { useCountry } from '@/lib/providers/country-provider';
import { getTranslation, getLocale, type Locale } from '@/lib/utils/translations';

const ContactClient: React.FC = () => {
  const { countryCode } = useCountry();
  const countryName = countryCode === 'rw' ? 'Rwanda' : 'Kenya';
  const [locale, setLocale] = useState<Locale>('en');
  
  useEffect(() => {
    setLocale(getLocale());
  }, []);
  
  // Get location with country-specific details
  const getLocationText = () => {
    if (countryCode === 'rw') {
      // Rwanda: show full address with street
      return '1 Kn 77 St, Kabisa EV House, Kigali, Rwanda';
    }
    // Kenya and others: show just building name with city/country
    return 'Kabisa EV House, Nairobi, Kenya';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-12">
      <div className="w-full max-w-6xl">
        {/* Main White Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Top Bar - Minimalist */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="h-2 w-16 bg-green-400 rounded-full"></div>
            <div className="flex gap-2">
              <div className="h-1 w-6 bg-gray-300 rounded"></div>
              <div className="h-1 w-6 bg-gray-300 rounded"></div>
              <div className="h-1 w-6 bg-gray-300 rounded"></div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-8 lg:p-12">
            {/* Left Side - "Let's chat" Section */}
            <div className="flex flex-col justify-center">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                {getTranslation(locale, 'letsChat')}
              </h1>
              <div className="space-y-3 mb-8">
                <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                <div className="h-1 bg-gray-300 rounded w-1/2"></div>
              </div>
              
              {/* Contact Info Cards */}
              <div className="space-y-4 mt-8">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">{getTranslation(locale, 'email')}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">{getTranslation(locale, 'phone')}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">{getLocationText()}</span>
                </div>
              </div>
            </div>

            {/* Right Side - Form Section */}
            <div className="flex flex-col justify-center">
              <div className="bg-white rounded-2xl p-6 lg:p-8">
                <AirtableLoader
                  formUrl={`https://airtable.com/embed/appcxJlWp5SUD3aUU/pagyPoM3W9Ps4WozT/form?prefill_Campaign=Contact+Form&prefill_Country=${countryName}&prefill_Reason+for+contact=General+Inquiry&prefill_Channel=Website&hide_Campaign=true&hide_Country=true&hide_Reason+for+contact=true&hide_Channel=true`}
                  height="700px"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactClient;