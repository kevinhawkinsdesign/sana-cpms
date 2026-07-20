'use client';

/** Settings → Tax & EBM. TIN, default tax rate and EBM config. TaxSection
 *  loads its own data. */
import React from 'react';
import { PageHead } from '@/components/console/ui';
import { TaxSection } from '../sections/TaxSection';

export default function SettingsTaxPage() {
  return (
    <div className="max-w-xl space-y-4">
      <PageHead title="Tax & EBM" sub="TIN, default tax rate, and EBM configuration" />
      <TaxSection />
    </div>
  );
}
