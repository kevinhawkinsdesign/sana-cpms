import { Route } from '../matcher';
import { ok, notFound } from '../respond';
import { db, chargerPublic, genId, now } from '../db';

function listChargers() {
  return ok({ chargers: db.chargers.map(chargerPublic) });
}

function chargersGeoJson() {
  const features = db.chargers.map((c) => {
    const guns = db.guns.filter((g) => g.chargerId === c.id);
    const available = guns.filter((g) => g.chargingStatus === 'AVAILABLE').length;
    return {
      type: 'Feature' as const,
      id: c.id,
      geometry: { type: 'Point' as const, coordinates: [c.longitude, c.latitude] as [number, number] },
      properties: {
        id: c.id, kabisaId: c.kabisaId, name: c.name, power: c.power,
        category: (c.type || '').toLowerCase().includes('dc') ? 'dc' as const : 'ac' as const,
        owner: c.ownerName, isKabisa: true, status: available > 0 ? 'Available' : 'In Use',
        operationalStatus: c.operationalStatus, gunsCount: guns.length,
        gunStatuses: guns.map((g) => g.chargingStatus),
        availability: { available, total: guns.length },
        address: c.address, meterId: c.meterId, imageUrl: c.imageUrl, haveMeterReading: !!c.haveMeterReading,
        liveUpdatedAt: now(), searchText: `${c.name} ${c.address}`.toLowerCase(),
      },
    };
  });
  return ok({ geojson: { type: 'FeatureCollection', features } });
}

export const chargerRoutes: Route[] = [
  { method: 'GET', pattern: '/api/chargers', handler: listChargers },
  { method: 'GET', pattern: '/api/client/chargers', handler: listChargers },
  { method: 'GET', pattern: '/api/client/chargers-geojson', handler: chargersGeoJson },
  {
    method: 'POST',
    pattern: '/api/chargers',
    handler: (ctx) => {
      const charger = {
        id: genId('charger'),
        kabisaId: (ctx.body?.kabisaId || genId('KB')).toUpperCase().slice(0, 8),
        operationalStatus: 'OPERATIONAL',
        isActive: true,
        createdAt: now(),
        updatedAt: now(),
        ...ctx.body,
      };
      db.chargers.push(charger);
      return ok({ charger: chargerPublic(charger) }, 'Charger created');
    },
  },
  { method: 'GET', pattern: '/api/chargers/meters/all', handler: () => ok({ meters: db.chargers.map((c) => ({ id: c.meterId, kabisaId: c.kabisaId, meterName: `${c.name} Meter`, isActive: true })) }) },
  {
    method: 'POST',
    pattern: '/api/chargers/meters',
    handler: (ctx) => {
      const meter = { id: genId('meter'), kabisaId: genId('MT').toUpperCase().slice(0, 8), isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body };
      return ok({ meter }, 'Meter created');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/chargers/guns/:gunId',
    handler: (ctx) => {
      const idx = db.guns.findIndex((g) => g.id === ctx.params.gunId);
      if (idx === -1) return notFound('Gun not found');
      db.guns.splice(idx, 1);
      return ok({}, 'Gun deleted');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/chargers/guns/:gunId/status',
    handler: (ctx) => {
      const gun = db.guns.find((g) => g.id === ctx.params.gunId);
      if (!gun) return notFound('Gun not found');
      Object.assign(gun, ctx.body, { updatedAt: now() });
      return ok({ gun }, 'Gun status updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/chargers/pedestals/:pedestalId',
    handler: (ctx) => {
      const idx = db.pedestals.findIndex((p) => p.id === ctx.params.pedestalId);
      if (idx === -1) return notFound('Pedestal not found');
      db.pedestals.splice(idx, 1);
      return ok({}, 'Pedestal deleted');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/chargers/pedestals/:pedestalId',
    handler: (ctx) => {
      const pedestal = db.pedestals.find((p) => p.id === ctx.params.pedestalId);
      if (!pedestal) return notFound('Pedestal not found');
      Object.assign(pedestal, ctx.body, { updatedAt: now() });
      return ok({ pedestal }, 'Pedestal updated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/chargers/:chargerId/available-guns',
    handler: (ctx) => {
      const guns = db.guns.filter((g) => g.chargerId === ctx.params.chargerId && g.chargingStatus === 'AVAILABLE');
      const pedestals = db.pedestals.filter((p) => p.chargerId === ctx.params.chargerId).map((p) => ({ ...p, guns: guns.filter((g) => g.pedestalId === p.id) }));
      return ok({ pedestals, guns });
    },
  },
  {
    method: 'GET',
    pattern: '/api/chargers/:chargerId/meter',
    handler: (ctx) => {
      const charger = db.chargers.find((c) => c.id === ctx.params.chargerId);
      if (!charger) return notFound('Charger not found');
      return ok({ id: charger.meterId, kabisaId: charger.kabisaId, meterName: `${charger.name} Meter`, isActive: true });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/chargers/:chargerId/meter',
    handler: (ctx) => {
      const charger = db.chargers.find((c) => c.id === ctx.params.chargerId);
      if (!charger) return notFound('Charger not found');
      charger.meterId = ctx.body?.meterId || charger.meterId;
      return ok({}, 'Meter updated');
    },
  },
  {
    method: 'POST',
    pattern: '/api/chargers/:chargerId/guns',
    handler: (ctx) => {
      const gun = {
        id: genId('gun'), kabisaId: genId('GN').toUpperCase().slice(0, 8), chargerId: ctx.params.chargerId,
        chargingStatus: 'AVAILABLE', isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body,
      };
      db.guns.push(gun);
      return ok({ gun }, 'Gun added');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/chargers/:chargerId/guns/:gunId',
    handler: (ctx) => {
      const gun = db.guns.find((g) => g.id === ctx.params.gunId);
      if (!gun) return notFound('Gun not found');
      Object.assign(gun, ctx.body, { updatedAt: now() });
      return ok({ gun }, 'Gun updated');
    },
  },
  {
    method: 'POST',
    pattern: '/api/chargers/:chargerId/pedestals',
    handler: (ctx) => {
      const pedestal = {
        id: genId('pedestal'), chargerId: ctx.params.chargerId, onlineStatus: 'ONLINE',
        isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body,
      };
      db.pedestals.push(pedestal);
      return ok({ pedestal }, 'Pedestal added');
    },
  },
  {
    method: 'GET',
    pattern: '/api/chargers/:chargerId',
    handler: (ctx) => {
      const charger = db.chargers.find((c) => c.id === ctx.params.chargerId || c.kabisaId === ctx.params.chargerId);
      if (!charger) return notFound('Charger not found');
      const pub = chargerPublic(charger);
      return ok({ charger: pub, pedestals: pub.pedestals, guns: pub.guns });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/chargers/:chargerId',
    handler: (ctx) => {
      const charger = db.chargers.find((c) => c.id === ctx.params.chargerId);
      if (!charger) return notFound('Charger not found');
      Object.assign(charger, ctx.body, { updatedAt: now() });
      return ok({ charger: chargerPublic(charger) }, 'Charger updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/chargers/:chargerId',
    handler: (ctx) => {
      const idx = db.chargers.findIndex((c) => c.id === ctx.params.chargerId);
      if (idx === -1) return notFound('Charger not found');
      db.chargers.splice(idx, 1);
      return ok({}, 'Charger deleted');
    },
  },
];
