'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const LoanInfo: React.FC = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const businessRequirements = [
    'Company profile & Management Information',
    'Full RDB registration certificate',
    'National ID and Passports of Directors',
    'Bank statements (12 months)',
    'Tax clearance certificate',
    'Loan application letter',
    'Pro-forma invoice',
  ];

  const individualRequirements = [
    'Employment contract',
    'National ID or passport',
    'Bank statements (3 months)',
    'Loan application letter',
    'Pro-forma invoice',
  ];

  const partners = [
    { src: '/images/partner1.webp', alt: 'NCBA' },
    { src: '/images/IM.webp', alt: 'I&M' },
    { src: '/images/BBOX.webp', alt: 'Bboxx' },
  ];

  return (
    <div>
      {/* Loan Terms Section */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
          Typical Vehicle Loan Terms in Rwanda
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Loan Period</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              3-60
            </p>
            <p className="text-sm sm:text-base text-gray-600">months</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Interest Rate
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              18%
            </p>
            <p className="text-sm sm:text-base text-gray-600">
              starting rate for business
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Down Payment</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              30%
            </p>
            <p className="text-sm sm:text-base text-gray-600">
              minimum required
            </p>
          </div>
        </div>
      </div>

      {/* Requirements Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Business Requirements
          </h2>
          <ul className="space-y-3">
            {businessRequirements.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3" />
                <span className="text-sm sm:text-base text-gray-700">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Individual Requirements
          </h2>
          <ul className="space-y-3">
            {individualRequirements.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3" />
                <span className="text-sm sm:text-base text-gray-700">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Partners Section */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
          Our Financial Partners
        </h2>
        <div className="relative overflow-hidden">
          <div className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-between items-center gap-8 sm:gap-4">
            {partners.map((partner, index) => (
              <div key={index} className="w-full sm:w-1/3 px-4">
                <div className="relative h-16 sm:h-20">
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain filter hover:brightness-90 transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6 space-x-2 sm:hidden">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => setScrollPosition(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  scrollPosition === index ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanInfo;