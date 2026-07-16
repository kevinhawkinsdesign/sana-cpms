'use client';

/** Settings → Tax & EBM. TIN, default tax rate and EBM config. TaxSection
 *  loads its own data; the Settings shell owns the header + sub-nav. */
import React from 'react';
import { TaxSection } from '../sections/TaxSection';

export default function SettingsTaxPage() {
  return (
    <div className="max-w-xl">
      <TaxSection />
    </div>
  );
}
