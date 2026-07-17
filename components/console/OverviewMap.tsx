'use client';

/** Overview → live map. Every station in the active org plus the fleet
 *  vehicles that have actually charged there, so it's real usage rather than
 *  an arbitrary sample (see lib/console/dashboard.ts's useOrgMap / the mock
 *  /api/orgs/:orgId/map handler for how vehicle positions are approximated —
 *  there's no GPS feed, just a stable scatter near their last charger). */
import React, { useMemo, useState } from 'react';
import { Map, Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { osmRasterStyle } from '@/lib/utils/osmMapStyle';
import { Badge, Icon } from '@/components/console/ui';
import type { MapStation, MapVehicle } from '@/lib/console/dashboard';

const KIGALI_CENTER: [number, number] = [30.0619, -1.9441];

export function OverviewMap({
  stations,
  vehicles,
}: Readonly<{ stations: MapStation[]; vehicles: MapVehicle[] }>) {
  const [selected, setSelected] = useState<
    | { kind: 'station'; item: MapStation }
    | { kind: 'vehicle'; item: MapVehicle }
    | null
  >(null);

  const center = useMemo<[number, number]>(() => {
    if (stations.length === 0) return KIGALI_CENTER;
    const lat = stations.reduce((s, x) => s + x.latitude, 0) / stations.length;
    const lng = stations.reduce((s, x) => s + x.longitude, 0) / stations.length;
    return [lng, lat];
  }, [stations]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-xl">
      <Map
        initialViewState={{ longitude: center[0], latitude: center[1], zoom: 12 }}
        mapStyle={osmRasterStyle}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {stations.map((s) => (
          <Marker
            key={s.id}
            longitude={s.longitude}
            latitude={s.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected({ kind: 'station', item: s });
            }}
          >
            <div
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md"
              style={{ background: s.online ? '#1f7a45' : '#c0392b' }}
              title={s.name ?? 'Station'}
            >
              <Icon name="station" size={14} style={{ color: 'white' }} />
            </div>
          </Marker>
        ))}

        {vehicles.map((v) => (
          <Marker
            key={v.id}
            longitude={v.longitude}
            latitude={v.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected({ kind: 'vehicle', item: v });
            }}
          >
            <div
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow"
              style={{ background: v.charging ? '#e0a800' : '#4561de' }}
              title={`${v.make ?? ''} ${v.model ?? ''}`.trim() || 'Vehicle'}
            >
              <Icon name="car" size={11} style={{ color: 'white' }} />
            </div>
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.item.longitude}
            latitude={selected.item.latitude}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => setSelected(null)}
            offset={selected.kind === 'station' ? 28 : 12}
          >
            {selected.kind === 'station' ? (
              <div className="min-w-[160px] p-1 text-sm">
                <div className="font-semibold text-gray-900">{selected.item.name ?? 'Station'}</div>
                {selected.item.address && <div className="mt-0.5 text-xs text-gray-500">{selected.item.address}</div>}
                <div className="mt-1.5">
                  <Badge kind={selected.item.online ? 'ok' : 'err'} dot>{selected.item.online ? 'Online' : 'Offline'}</Badge>
                </div>
              </div>
            ) : (
              <div className="min-w-[160px] p-1 text-sm">
                <div className="font-semibold text-gray-900">{`${selected.item.make ?? ''} ${selected.item.model ?? ''}`.trim() || 'Vehicle'}</div>
                {selected.item.plate && <div className="mt-0.5 font-mono text-xs text-gray-500">{selected.item.plate}</div>}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge kind={selected.item.charging ? 'charge' : 'neutral'} dot pulse={selected.item.charging}>
                    {selected.item.charging ? 'Charging' : 'Idle'}
                  </Badge>
                  {selected.item.lastChargerName && (
                    <span className="text-xs text-gray-400">near {selected.item.lastChargerName}</span>
                  )}
                </div>
              </div>
            )}
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute bottom-2 left-2 flex gap-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm dark:bg-black/70 dark:text-gray-300">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#1f7a45' }} /> Station online</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#c0392b' }} /> Station offline</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#e0a800' }} /> Vehicle charging</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#4561de' }} /> Vehicle idle</span>
      </div>
    </div>
  );
}
