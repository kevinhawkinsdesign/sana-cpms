'use client';

/** Shared PageHead actions: a range-tab selector + optional Export stub.
 *  Used by Overview / Revenue / Compliance so the block isn't duplicated. */
import React from 'react';
import { Btn, Tabs } from '@/components/console/ui';

export interface RangeOption {
  id: string;
  label: string;
}

export function RangeControl({
  ranges,
  value,
  onChange,
  showExport = false,
}: Readonly<{
  ranges: readonly RangeOption[];
  value: string;
  onChange: (id: string) => void;
  showExport?: boolean;
}>) {
  return (
    <div className="flex items-center gap-3">
      <Tabs
        tabs={ranges.map((r) => ({ id: r.id, label: r.label }))}
        value={value}
        onChange={onChange}
        style={{ borderBottom: 'none' }}
      />
      {showExport && (
        // Export stub — enabled once the billing-export task lands
        <Btn size="sm" icon="download" disabled>
          Export
        </Btn>
      )}
    </div>
  );
}
