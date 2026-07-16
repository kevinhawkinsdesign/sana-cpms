import { Route } from '../matcher';
import { ok, notFound } from '../respond';
import { db, genId, now, paginate, findUser } from '../db';
import { tokenUser } from './auth';

function adminUserView(u: any) {
  const { id, firstName, lastName, email, phone, role, userType, imageUrl, isVerified, isActive, isTrainee, autofillEnabled, organizationId, organizations, createdAt, updatedAt, cashierId } = u;
  return { id, firstName, lastName, email, phone, role, userType, imageUrl, isVerified, isActive: isActive ?? true, isTrainee, autofillEnabled, operatorAirtableId: cashierId, organizationId, organizations, createdAt, updatedAt };
}

export const userRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/api/user/profile',
    handler: (ctx) => {
      const user = tokenUser(ctx);
      const vehicles = user.role === 'CUSTOMER' ? db.vehicles.slice(0, 2) : [];
      const mySessions = db.sessions.filter((s) => s.customerId === user.id);
      return ok({
        user: {
          id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
          phone: user.phone, role: user.role, userType: user.userType, imageUrl: user.imageUrl,
          isVerified: user.isVerified, lastLoginAt: now(), createdAt: user.createdAt, updatedAt: user.updatedAt,
        },
        vehicles,
        paymentMethods: [
          { id: 'pm_demo_momo', paymentMethodType: 'MOMO', isDefault: true, balance: 0, currency: 'RWF', momoNumber: user.phone, isActive: true, createdAt: now(), updatedAt: now() },
        ],
        freeChargingAllowances: [],
        statistics: {
          totalSessions: mySessions.length,
          totalSpent: mySessions.reduce((s, x) => s + (x.totalAmount || 0), 0),
          totalKwh: mySessions.reduce((s, x) => s + (x.chargedKwh || 0), 0),
        },
      });
    },
  },
  { method: 'GET', pattern: '/api/user/payment-methods', handler: (ctx) => ok({ paymentMethods: [{ id: 'pm_demo_momo', paymentMethodType: 'MOMO', isDefault: true, balance: 0, currency: 'RWF', momoNumber: tokenUser(ctx).phone, isActive: true, createdAt: now(), updatedAt: now() }] }) },
  { method: 'POST', pattern: '/api/user/payment-methods', handler: (ctx) => ok({ paymentMethod: { id: genId('pm'), isDefault: false, isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body } }, 'Payment method added') },
  { method: 'POST', pattern: '/api/user/payment-methods/card', handler: (ctx) => ok({ paymentMethod: { id: genId('pm'), paymentMethodType: 'CARD', isDefault: false, isActive: true, createdAt: now(), updatedAt: now(), ...ctx.body } }, 'Card added') },
  { method: 'GET', pattern: '/api/user/payment-methods/card/bin/:cardNumber', handler: (ctx) => ok({ bank: 'Bank of Kigali', cardType: 'VISA', country: 'RW' }) },
  { method: 'POST', pattern: '/api/user/payment-methods/:paymentMethodId/set-default', handler: () => ok({}, 'Default payment method set') },
  { method: 'PUT', pattern: '/api/user/payment-methods/:paymentMethodId', handler: (ctx) => ok({ paymentMethod: { id: ctx.params.paymentMethodId, ...ctx.body } }, 'Payment method updated') },
  { method: 'DELETE', pattern: '/api/user/payment-methods/:paymentMethodId', handler: () => ok({}, 'Payment method removed') },
  { method: 'GET', pattern: '/api/vehicles/user/vehicles', handler: (ctx) => ok(db.vehicles.slice(0, 3)) },
  {
    method: 'POST',
    pattern: '/api/user/vehicles',
    handler: (ctx) => {
      const vehicle = { id: genId('vehicle'), kabisaId: genId('KB').toUpperCase().slice(0, 8), isActive: true, createdAt: now(), updatedAt: now(), licensePlates: [], ...ctx.body };
      db.vehicles.push(vehicle);
      return ok({ vehicle }, 'Vehicle added');
    },
  },
  { method: 'PUT', pattern: '/api/user/vehicles/:vehicleId', handler: (ctx) => {
    const vehicle = db.vehicles.find((v) => v.id === ctx.params.vehicleId);
    if (!vehicle) return notFound('Vehicle not found');
    Object.assign(vehicle, ctx.body, { updatedAt: now() });
    return ok({ vehicle }, 'Vehicle updated');
  } },
  { method: 'DELETE', pattern: '/api/user/vehicles/:vehicleId', handler: (ctx) => {
    const idx = db.vehicles.findIndex((v) => v.id === ctx.params.vehicleId);
    if (idx === -1) return notFound('Vehicle not found');
    db.vehicles.splice(idx, 1);
    return ok({}, 'Vehicle removed');
  } },

  // ---------------- Admin: users ----------------
  { method: 'GET', pattern: '/api/admin/users/blocked', handler: () => ok({ users: db.users.filter((u) => !u.isActive).map(adminUserView) }) },
  {
    method: 'GET',
    pattern: '/api/admin/users',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.toLowerCase();
      const role = ctx.query.get('role');
      const organizationId = ctx.query.get('organizationId');
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      let list = db.users;
      if (role) list = list.filter((u) => u.role === role);
      if (organizationId) list = list.filter((u) => u.organizationId === organizationId);
      if (search) list = list.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search));
      const { items, pagination } = paginate(list, page, limit);
      return ok({ users: items.map(adminUserView), pagination });
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/users',
    handler: (ctx) => {
      const user = { id: genId('user'), isVerified: false, isActive: true, userType: 'GUEST', createdAt: now(), updatedAt: now(), ...ctx.body };
      db.users.push(user);
      return ok({ user: adminUserView(user) }, 'User created');
    },
  },
  { method: 'POST', pattern: '/api/admin/users/:userId/block', handler: (ctx) => { const u = findUser(ctx.params.userId); if (u) u.isActive = false; return ok({}, 'User blocked'); } },
  { method: 'POST', pattern: '/api/admin/users/:userId/unblock', handler: (ctx) => { const u = findUser(ctx.params.userId); if (u) u.isActive = true; return ok({}, 'User unblocked'); } },
  { method: 'POST', pattern: '/api/admin/users/:userId/verify', handler: (ctx) => { const u = findUser(ctx.params.userId); if (u) u.isVerified = true; return ok({}, 'User verified'); } },
  {
    method: 'POST',
    pattern: '/api/admin/users/:userId/organizations',
    handler: (ctx) => {
      const u = findUser(ctx.params.userId);
      if (!u) return notFound('User not found');
      const org = db.organizations.find((o) => o.id === ctx.body?.orgId);
      u.organizationId = ctx.body?.orgId;
      u.organizations = [...(u.organizations || []), org ? { id: org.id, name: org.name } : { id: ctx.body?.orgId, name: 'Organization' }];
      return ok({ user: adminUserView(u) }, 'Organization added');
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/admin/users/:userId/organizations/:orgId',
    handler: (ctx) => {
      const u = findUser(ctx.params.userId);
      if (!u) return notFound('User not found');
      return ok({ user: adminUserView(u) }, 'Membership updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/users/:userId/organizations/:orgId',
    handler: (ctx) => {
      const u = findUser(ctx.params.userId);
      if (!u) return notFound('User not found');
      u.organizations = (u.organizations || []).filter((o: any) => o.id !== ctx.params.orgId);
      if (u.organizationId === ctx.params.orgId) u.organizationId = null;
      return ok({ user: adminUserView(u) }, 'Organization removed');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/users/:userId',
    handler: (ctx) => {
      const u = findUser(ctx.params.userId);
      if (!u) return notFound('User not found');
      return ok({ user: adminUserView(u) });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/users/:userId',
    handler: (ctx) => {
      const u = findUser(ctx.params.userId);
      if (!u) return notFound('User not found');
      Object.assign(u, ctx.body, { updatedAt: now() });
      return ok({ user: adminUserView(u) }, 'User updated');
    },
  },

  // ---------------- Admin: operators ----------------
  {
    method: 'GET',
    pattern: '/api/admin/operators',
    handler: () => ok({ operators: db.users.filter((u) => u.role === 'OPERATOR').map((o) => ({ id: o.id, firstName: o.firstName, lastName: o.lastName, email: o.email, phone: o.phone, cashierId: o.cashierId, isTrainee: !!o.isTrainee, autofillEnabled: !!o.autofillEnabled, isVerified: o.isVerified, createdAt: o.createdAt })) }),
  },
  { method: 'PATCH', pattern: '/api/admin/operators/:operatorId/autofill', handler: (ctx) => { const u = findUser(ctx.params.operatorId); if (u) u.autofillEnabled = ctx.body?.autofillEnabled; return ok({}, 'Autofill setting updated'); } },
  { method: 'PATCH', pattern: '/api/admin/operators/:operatorId/trainee', handler: (ctx) => { const u = findUser(ctx.params.operatorId); if (u) u.isTrainee = ctx.body?.isTrainee; return ok({}, 'Trainee status updated'); } },
  { method: 'GET', pattern: '/api/operator-shift/operators', handler: () => ok({ operators: db.users.filter((u) => u.role === 'OPERATOR') }) },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/operator/latest-sessions',
    handler: () => ok({ sessions: db.sessions.slice(0, 5) }),
  },
];
