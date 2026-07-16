import { Route } from '../matcher';
import { ok, notFound } from '../respond';
import { db, genId, now } from '../db';
import { tokenUser } from './auth';

function businessUserView(bu: any) {
  const user = db.users.find((u) => u.id === bu.userId);
  return {
    id: bu.id, userId: bu.userId, businessId: bu.businessId, role: bu.role,
    user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone } : undefined,
    createdAt: bu.createdAt,
  };
}

export const businessRoutes: Route[] = [
  // ---------------- Admin: businesses ----------------
  {
    method: 'GET',
    pattern: '/api/admin/businesses',
    handler: () => ok({ businesses: db.businesses }),
  },
  {
    method: 'POST',
    pattern: '/api/admin/businesses',
    handler: (ctx) => {
      const business = { id: genId('business'), createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businesses.push(business);
      return ok({ business }, 'Business created');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/businesses/:businessId/vehicles/unassign',
    handler: () => ok({}, 'Vehicle unassigned'),
  },
  {
    method: 'GET',
    pattern: '/api/admin/businesses/:businessId/vehicles/:vehicleId/payment-methods',
    handler: () => ok({ methods: [] }),
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/businesses/:businessId/vehicles/:vehicleId/payment-methods/:paymentMethodId',
    handler: () => ok({}, 'Payment method removed'),
  },
  {
    method: 'POST',
    pattern: '/api/admin/businesses/:businessId/vehicles/add-or-assign',
    handler: (ctx) => {
      const vehicle = { id: genId('bveh'), businessId: ctx.params.businessId, chargingStatus: 'AVAILABLE', createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businessVehicles.push(vehicle);
      return ok({ vehicle }, 'Vehicle assigned');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/businesses/:businessId/vehicles',
    handler: (ctx) => ok({ vehicles: db.businessVehicles.filter((v) => v.businessId === ctx.params.businessId) }),
  },
  {
    method: 'PUT',
    pattern: '/api/admin/businesses/:businessId/vehicles/:vehicleId',
    handler: (ctx) => {
      const v = db.businessVehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      Object.assign(v, ctx.body, { updatedAt: now() });
      return ok({ vehicle: v }, 'Vehicle updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/businesses/:businessId/vehicles/:vehicleId',
    handler: (ctx) => {
      const idx = db.businessVehicles.findIndex((x) => x.id === ctx.params.vehicleId);
      if (idx !== -1) db.businessVehicles.splice(idx, 1);
      return ok({}, 'Vehicle removed');
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/businesses/:businessId/contracts',
    handler: (ctx) => {
      const contract = { id: genId('contract'), businessId: ctx.params.businessId, pricingTiers: [], createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businessContracts.push(contract);
      return ok({ contract }, 'Contract created');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/businesses/:businessId/contracts',
    handler: (ctx) => {
      const contract = db.businessContracts.find((c) => c.businessId === ctx.params.businessId);
      if (contract) Object.assign(contract, ctx.body, { updatedAt: now() });
      return ok({ contract }, 'Contract updated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/businesses/:businessId',
    handler: (ctx) => {
      const business = db.businesses.find((b) => b.id === ctx.params.businessId);
      if (!business) return notFound('Business not found');
      return ok({ business });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/businesses/:businessId',
    handler: (ctx) => {
      const business = db.businesses.find((b) => b.id === ctx.params.businessId);
      if (!business) return notFound('Business not found');
      Object.assign(business, ctx.body, { updatedAt: now() });
      return ok({ business }, 'Business updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/businesses/:businessId',
    handler: (ctx) => {
      const idx = db.businesses.findIndex((b) => b.id === ctx.params.businessId);
      if (idx === -1) return notFound('Business not found');
      db.businesses.splice(idx, 1);
      return ok({}, 'Business deleted');
    },
  },

  // ---------------- Self-service: business (customer/fleet-owner facing) ----------------
  { method: 'GET', pattern: '/api/business/user', handler: (ctx) => {
    const user = tokenUser(ctx);
    const myBusinessIds = db.businessUsers.filter((bu) => bu.userId === user.id).map((bu) => bu.businessId);
    return ok(db.businesses.filter((b) => myBusinessIds.includes(b.id)));
  } },
  { method: 'GET', pattern: '/api/business/user/pending-invitations', handler: () => ok([]) },
  { method: 'GET', pattern: '/api/business/invitations/:invitationCode', handler: (ctx) => notFound('Invitation not found') },
  { method: 'POST', pattern: '/api/business/invitations/accept', handler: (ctx) => ok({ business: db.businesses[0], role: 'DRIVER' }, 'Invitation accepted') },
  { method: 'POST', pattern: '/api/business/invitations/decline', handler: () => ok({}, 'Invitation declined') },
  {
    method: 'POST',
    pattern: '/api/business',
    handler: (ctx) => {
      const business = { id: genId('business'), role: 'OWNER', createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businesses.push(business);
      db.businessUsers.push({ id: genId('bu'), userId: tokenUser(ctx).id, businessId: business.id, role: 'OWNER', createdAt: now() });
      return ok(business, 'Business created');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/contracts',
    handler: (ctx) => ok(db.businessContracts.filter((c) => c.businessId === ctx.params.businessId)),
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/contracts',
    handler: (ctx) => {
      const contract = { id: genId('contract'), businessId: ctx.params.businessId, pricingTiers: [], createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businessContracts.push(contract);
      return ok(contract, 'Contract created');
    },
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/contracts/:contractId/pricing',
    handler: (ctx) => {
      const contract = db.businessContracts.find((c) => c.id === ctx.params.contractId);
      const tier = { id: genId('tier'), ...ctx.body };
      if (contract) contract.pricingTiers.push(tier);
      return ok(tier, 'Pricing tier added');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/business/:businessId/contracts/:contractId/pricing/:pricingId',
    handler: (ctx) => {
      const contract = db.businessContracts.find((c) => c.id === ctx.params.contractId);
      const tier = contract?.pricingTiers.find((t: any) => t.id === ctx.params.pricingId);
      if (tier) Object.assign(tier, ctx.body);
      return ok(tier || {}, 'Pricing tier updated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/invitations',
    handler: () => ok([]),
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/invitations',
    handler: (ctx) => {
      const invitation = { id: genId('invite'), businessId: ctx.params.businessId, invitationCode: genId('code'), isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body };
      return ok(invitation, 'Invitation sent');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/business/:businessId/invitations/:invitationId',
    handler: () => ok({}, 'Invitation cancelled'),
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/users',
    handler: (ctx) => ok(db.businessUsers.filter((bu) => bu.businessId === ctx.params.businessId).map(businessUserView)),
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/users',
    handler: (ctx) => {
      const bu = { id: genId('bu'), businessId: ctx.params.businessId, createdAt: now(), ...ctx.body };
      db.businessUsers.push(bu);
      return ok(businessUserView(bu), 'User added');
    },
  },
  {
    method: 'PUT',
    pattern: '/api/business/:businessId/users/:userId',
    handler: (ctx) => {
      const bu = db.businessUsers.find((x) => x.businessId === ctx.params.businessId && x.userId === ctx.params.userId);
      if (bu) Object.assign(bu, ctx.body);
      return ok(bu ? businessUserView(bu) : {}, 'Role updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/business/:businessId/users/:userId',
    handler: (ctx) => {
      const idx = db.businessUsers.findIndex((x) => x.businessId === ctx.params.businessId && x.userId === ctx.params.userId);
      if (idx !== -1) db.businessUsers.splice(idx, 1);
      return ok({}, 'User removed');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/vehicle-assignments',
    handler: () => ok([]),
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/vehicle-assignments',
    handler: (ctx) => {
      const assignment = { id: genId('assign'), businessId: ctx.params.businessId, assignmentType: 'PERMANENT', createdAt: now(), updatedAt: now(), ...ctx.body };
      return ok(assignment, 'Vehicle assigned');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/vehicle-assignments/:assignmentId',
    handler: (ctx) => notFound('Assignment not found'),
  },
  {
    method: 'PUT',
    pattern: '/api/business/:businessId/vehicle-assignments/:assignmentId',
    handler: (ctx) => ok({ id: ctx.params.assignmentId, ...ctx.body }, 'Assignment updated'),
  },
  {
    method: 'DELETE',
    pattern: '/api/business/:businessId/vehicle-assignments/:assignmentId',
    handler: () => ok({}, 'Assignment removed'),
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/vehicles',
    handler: (ctx) => ok(db.businessVehicles.filter((v) => v.businessId === ctx.params.businessId)),
  },
  {
    method: 'POST',
    pattern: '/api/business/:businessId/vehicles',
    handler: (ctx) => {
      const vehicle = { id: genId('bveh'), businessId: ctx.params.businessId, chargingStatus: 'AVAILABLE', createdAt: now(), updatedAt: now(), ...ctx.body };
      db.businessVehicles.push(vehicle);
      return ok(vehicle, 'Vehicle added');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId/vehicles/:vehicleId',
    handler: (ctx) => {
      const v = db.businessVehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      return ok(v);
    },
  },
  {
    method: 'PUT',
    pattern: '/api/business/:businessId/vehicles/:vehicleId',
    handler: (ctx) => {
      const v = db.businessVehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      Object.assign(v, ctx.body, { updatedAt: now() });
      return ok(v, 'Vehicle updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/business/:businessId/vehicles/:vehicleId',
    handler: (ctx) => {
      const idx = db.businessVehicles.findIndex((x) => x.id === ctx.params.vehicleId);
      if (idx !== -1) db.businessVehicles.splice(idx, 1);
      return ok({}, 'Vehicle removed');
    },
  },
  {
    method: 'GET',
    pattern: '/api/business/:businessId',
    handler: (ctx) => {
      const business = db.businesses.find((b) => b.id === ctx.params.businessId);
      if (!business) return notFound('Business not found');
      return ok(business);
    },
  },
  {
    method: 'PUT',
    pattern: '/api/business/:businessId',
    handler: (ctx) => {
      const business = db.businesses.find((b) => b.id === ctx.params.businessId);
      if (!business) return notFound('Business not found');
      Object.assign(business, ctx.body, { updatedAt: now() });
      return ok(business, 'Business updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/business/:businessId',
    handler: (ctx) => {
      const idx = db.businesses.findIndex((b) => b.id === ctx.params.businessId);
      if (idx !== -1) db.businesses.splice(idx, 1);
      return ok({}, 'Business deactivated');
    },
  },
];
