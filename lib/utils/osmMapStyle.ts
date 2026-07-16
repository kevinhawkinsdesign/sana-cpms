import type { StyleSpecification } from 'maplibre-gl';

/**
 * Minimal MapLibre style pointing at the real OpenStreetMap raster tile
 * servers — no API key/account needed, unlike the Mapbox Studio style this
 * replaces. OSM's tile usage policy requires attribution (below) and a
 * reasonable request volume, both fine for this demo.
 * https://operations.osmfoundation.org/policies/tiles/
 */
export const osmRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/** Public OSRM demo routing server — no API key, driving directions only. */
export const OSRM_DIRECTIONS_URL = 'https://router.project-osrm.org/route/v1/driving';
