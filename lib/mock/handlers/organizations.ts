import { Route } from '../matcher';
import { ok, notFound } from '../respond';
import { db, genId, now } from '../db';

function orgDetail(o: any) {
  const users = db.users.filter((u) => u.organizationId === o.id);
  const chargers = db.chargers.filter((c) => c.organizationId === o.id);
  const country = db.countries.find((c) => c.id === o.countryId);
  return {
    ...o,
    country: country || null,
    users: users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, role: u.role })),
    chargers: chargers.map((c) => ({ id: c.id, kabisaId: c.kabisaId, name: c.name, address: c.address, operationalStatus: c.operationalStatus, power: c.power })),
    _count: { users: users.length, chargers: chargers.length },
  };
}

export const organizationRoutes: Route[] = [
  { method: 'GET', pattern: '/api/admin/organizations', handler: () => ok(db.organizations.map(orgDetail)) },
  {
    method: 'POST',
    pattern: '/api/admin/organizations',
    handler: (ctx) => {
      const org = { id: genId('org'), isActive: true, createdAt: now(), updatedAt: now(), _count: { users: 0, chargers: 0 }, ...ctx.body };
      db.organizations.push(org);
      return ok(orgDetail(org), 'Organization created');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/organizations/:orgId/available-chargers',
    handler: (ctx) => ok(db.chargers.filter((c) => c.organizationId !== ctx.params.orgId).map((c) => ({ id: c.id, kabisaId: c.kabisaId, name: c.name, address: c.address, operationalStatus: c.operationalStatus, power: c.power, organizationId: c.organizationId }))),
  },
  {
    method: 'GET',
    pattern: '/api/admin/organizations/:orgId/available-users',
    handler: (ctx) => ok(db.users.filter((u) => u.organizationId !== ctx.params.orgId).map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, role: u.role, organizationId: u.organizationId }))),
  },
  {
    method: 'POST',
    pattern: '/api/admin/organizations/:orgId/chargers',
    handler: (ctx) => {
      const ids: string[] = ctx.body?.chargerIds || [];
      let count = 0;
      for (const id of ids) {
        const c = db.chargers.find((ch) => ch.id === id);
        if (c) { c.organizationId = ctx.params.orgId; count++; }
      }
      return ok({ count }, 'Chargers assigned');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/organizations/:orgId/chargers/:chargerId',
    handler: (ctx) => {
      const c = db.chargers.find((ch) => ch.id === ctx.params.chargerId);
      if (c) c.organizationId = null;
      return ok({}, 'Charger removed from organization');
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/organizations/:orgId/users',
    handler: (ctx) => {
      const ids: string[] = ctx.body?.userIds || [];
      let count = 0;
      for (const id of ids) {
        const u = db.users.find((usr) => usr.id === id);
        if (u) { u.organizationId = ctx.params.orgId; count++; }
      }
      return ok({ count }, 'Users assigned');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/organizations/:orgId/users/:userId',
    handler: (ctx) => {
      const u = db.users.find((usr) => usr.id === ctx.params.userId);
      if (u) u.organizationId = null;
      return ok({}, 'User removed from organization');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/organizations/:orgId',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.orgId);
      if (!org) return notFound('Organization not found');
      return ok(orgDetail(org));
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/organizations/:orgId',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.orgId);
      if (!org) return notFound('Organization not found');
      Object.assign(org, ctx.body, { updatedAt: now() });
      return ok(orgDetail(org), 'Organization updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/organizations/:orgId',
    handler: (ctx) => {
      const idx = db.organizations.findIndex((o) => o.id === ctx.params.orgId);
      if (idx === -1) return notFound('Organization not found');
      db.organizations.splice(idx, 1);
      return ok({}, 'Organization deleted');
    },
  },

  // ---------------- Countries ----------------
  { method: 'GET', pattern: '/api/admin/countries', handler: () => ok(db.countries) },
  {
    method: 'POST',
    pattern: '/api/admin/countries',
    handler: (ctx) => {
      const country = { id: genId('country'), isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body };
      db.countries.push(country);
      return ok(country, 'Country created');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/countries/:id',
    handler: (ctx) => {
      const country = db.countries.find((c) => c.id === ctx.params.id);
      if (!country) return notFound('Country not found');
      return ok(country);
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/countries/:id',
    handler: (ctx) => {
      const country = db.countries.find((c) => c.id === ctx.params.id);
      if (!country) return notFound('Country not found');
      Object.assign(country, ctx.body, { updatedAt: now() });
      return ok(country, 'Country updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/countries/:id',
    handler: (ctx) => {
      const idx = db.countries.findIndex((c) => c.id === ctx.params.id);
      if (idx === -1) return notFound('Country not found');
      db.countries.splice(idx, 1);
      return ok({}, 'Country deleted');
    },
  },
];
