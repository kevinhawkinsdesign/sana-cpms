'use client';

/** Charger (pedestal) selector for a site's detail page. A "Charger" in our model
 *  is a SITE with multiple pedestals — each pedestal is one CitrineOS station and
 *  the real addressable charger. These pills let you drill into one pedestal so
 *  errors / live power / config / commands scope to it. Hidden when a site has a
 *  single charger. */
import React from 'react';
import type { ChargerState } from '@/lib/console/stations';

type Pedestal = ChargerState['stations'][number];

/** A small status dot per pedestal, derived from its current connectors. */
function pedestalDotColor(p: Pedestal): string {
  const conns = p.connectors ?? [];
  const faulted = conns.some((c) => c.errorCode && c.errorCode !== 'NoError');
  if (faulted) return 'var(--err, #e0533d)';
  if (conns.some((c) => c.status === 'Charging')) return 'var(--charge, #2f73ff)';
  if (conns.some((c) => c.status && c.status !== 'Unavailable')) return 'var(--ok, #23a35a)';
  return 'var(--text3, #98a2b3)';
}

export function ChargerPills({
  pedestals,
  selectedStationId,
  onSelect,
}: Readonly<{
  pedestals: Pedestal[];
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
}>) {
  if (pedestals.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Charger</span>
      {pedestals.map((p) => {
        const active = p.stationId === selectedStationId;
        return (
          <button
            key={p.stationId}
            type="button"
            onClick={() => onSelect(p.stationId)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
              active
                ? 'border-[#08294f] bg-[#08294f] text-white'
                : 'border-[#e6ebf2] bg-white text-gray-600 hover:border-[#c7d2e0] dark:border-[#2A2A2A] dark:bg-transparent dark:text-gray-300'
            }`}
          >
            <span className="h-[6px] w-[6px] rounded-full" style={{ background: active ? '#fff' : pedestalDotColor(p) }} />
            <span className="max-w-[160px] truncate">{p.pedestalName ?? p.stationId}</span>
          </button>
        );
      })}
    </div>
  );
}
