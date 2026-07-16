'use client';

import React from 'react';
import PageHeroBanner from '@/components/shared/PageHeroBanner';
import FinancingForm from '@/components/airtable/FinancingForm';
import LoanInfo from '@/components/financing/LoanInfo';

const FinancingClient: React.FC = () => {
  React.useEffect(() => {
      timestamp: new Date().toISOString()
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeroBanner
        title="Financing"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Financing" }]}
        backgroundImage="/images/finance.webp"
        height="medium"
        overlay="medium"
        align="center"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="w-full order-2 lg:order-1">
              <LoanInfo />
            </div>

            <div className="w-full order-1 lg:order-2">
              <FinancingForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancingClient;