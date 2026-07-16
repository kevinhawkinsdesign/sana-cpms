import { Route, RouteCtx } from '../matcher';
import { ok, notFound, fail } from '../respond';
import { db, sessionWithRelations, genId, now, paginate } from '../db';
import { tokenUser } from './auth';

function filterSessions(ctx: RouteCtx, base = db.sessions) {
  let list = base;
  const q = ctx.query;
  const search = q.get('search')?.toLowerCase();
  const status = q.get('status');
  const sessionId = q.get('sessionId');
  const startDate = q.get('startDate');
  const endDate = q.get('endDate');
  if (sessionId) list = list.filter((s) => s.sessionId === sessionId);
  if (status) list = list.filter((s) => s.sessionStatus === status);
  if (startDate) list = list.filter((s) => s.startTime && s.startTime >= startDate);
  if (endDate) list = list.filter((s) => s.startTime && s.startTime <= endDate);
  if (search) {
    list = list.filter((s) =>
      [s.sessionId, s.customerName, s.customerPhone, s.carModelMake]
        .filter(Boolean)
        .some((f: string) => f.toLowerCase().includes(search)),
    );
  }
  return list;
}

function paginatedSessions(ctx: RouteCtx, base = db.sessions) {
  const page = Number(ctx.query.get('page') || 1);
  const limit = Number(ctx.query.get('limit') || 10);
  const filtered = filterSessions(ctx, base)
    .slice()
    .sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
  const { items, pagination } = paginate(filtered, page, limit);
  return { sessions: items.map(sessionWithRelations), pagination };
}

function findSession(id: string) {
  return db.sessions.find((s) => s.sessionId === id || s.id === id);
}

export const sessionRoutes: Route[] = [
  {
    method: 'POST',
    pattern: '/api/charging-sessions/start',
    handler: (ctx) => {
      const user = tokenUser(ctx);
      const gun = db.guns.find((g) => g.id === ctx.body?.gunId) || db.guns.find((g) => g.chargingStatus === 'AVAILABLE');
      const charger = gun ? db.chargers.find((c) => c.id === gun.chargerId) : db.chargers[0];
      const session: any = {
        id: genId('KABISA-C'), sessionId: genId('KABISA-C'), source: 'MANUAL',
        vehicleId: null, gunId: gun?.id, chargerId: charger?.id, operatorId: user.id,
        startSoc: ctx.body?.startSoc ?? 20, endSoc: null, chargedKwh: null,
        startTime: now(), endTime: null, sessionStatus: 'STARTED', totalAmount: null,
        carModelMake: ctx.body?.carModelMake || null, customerName: ctx.body?.customerName || null,
        customerInfoAdded: !!ctx.body?.customerName, isActive: true, createdAt: now(), updatedAt: now(),
        isPaid: false, transactions: [], ebms: [],
      };
      db.sessions.unshift(session);
      if (gun) gun.chargingStatus = 'IN_USE';
      return ok({
        session: sessionWithRelations(session),
        vehicle: { id: genId('vehicle'), kabisaId: 'NEW', licensePlate: ctx.body?.vehicleIdentifier || 'UNKNOWN', model: '', make: '', vin: '', imageUrl: null, batteryCapacity: 60, isActive: true, createdAt: now(), updatedAt: now() },
        charger: charger || {},
      }, 'Session started');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/end',
    handler: (ctx) => {
      const session = findSession(ctx.body?.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'COMPLETED';
      session.endTime = now();
      session.endSoc = ctx.body?.endSoc ?? session.endSoc;
      session.chargedKwh = ctx.body?.chargedKwh ?? session.chargedKwh;
      session.totalAmount = (session.chargedKwh || 0) * 600;
      session.isActive = false;
      session.updatedAt = now();
      const gun = db.guns.find((g) => g.id === session.gunId);
      if (gun) gun.chargingStatus = 'AVAILABLE';
      return ok({
        session: sessionWithRelations(session),
        paymentInfo: { isPaid: false, paymentMethod: 'MOMO', amount: session.totalAmount, currency: 'RWF', ratePerKwh: 600, shouldPay: true },
      }, 'Session ended');
    },
  },
  { method: 'GET', pattern: '/api/charging-sessions/active', handler: (ctx) => ok(db.sessions.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED').map(sessionWithRelations)) },
  { method: 'GET', pattern: '/api/charging-sessions/model-makes', handler: () => ok([...new Set(db.sessions.map((s) => s.carModelMake).filter(Boolean))].slice(0, 60)) },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/customer/:licensePlate',
    handler: (ctx) => {
      const vehicle = db.vehicles.find((v) => v.licensePlates?.some((p: any) => p.licencePlateNumber === ctx.params.licensePlate));
      if (!vehicle) return notFound('Vehicle not found');
      return ok({ vehicleInfo: { freeChargingExpiration: null, licenseNumber: ctx.params.licensePlate, make: vehicle.make, model: vehicle.model, imageUrl: vehicle.imageUrl, kabisaId: vehicle.kabisaId } });
    },
  },
  { method: 'GET', pattern: '/api/charging-sessions/debt-payment-status/:transactionId', handler: () => ok({ status: 'SUCCESS' }) },
  { method: 'POST', pattern: '/api/charging-sessions/debt-payment-retry/:transactionId', handler: () => ok({ status: 'SUCCESS' }, 'Retry initiated') },
  { method: 'GET', pattern: '/api/charging-sessions/momo-payment-status/:transactionId', handler: () => ok({ status: 'SUCCESS' }) },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/operator/active-sessions',
    handler: (ctx) => ok({ sessions: db.sessions.filter((s) => s.sessionStatus === 'STARTED').map(sessionWithRelations), pagination: { page: 1, limit: 100, total: db.sessions.filter((s) => s.sessionStatus === 'STARTED').length, totalPages: 1 } }),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/operator/latest-sessions',
    handler: () => ok({ sessions: db.sessions.slice(0, 5).map(sessionWithRelations) }),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/operator/sessions',
    handler: (ctx) => ok(paginatedSessions(ctx)),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/admin/active-sessions',
    handler: (ctx) => ok(paginatedSessions(ctx, db.sessions.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED'))),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/admin/all-sessions',
    handler: (ctx) => ok(paginatedSessions(ctx)),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/admin/archive',
    handler: (ctx) => ok({ sessions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/admin/stats',
    handler: (ctx) => {
      const list = filterSessions(ctx);
      const paidStatuses = new Set(['PAID', 'EBM_ISSUED']);
      const totalRevenue = list.filter((s) => paidStatuses.has(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalKwh = list.reduce((sum, s) => sum + (s.chargedKwh || 0), 0);
      return ok({
        stats: {
          totalSessions: list.length,
          activeSessions: list.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED').length,
          completedSessions: list.filter((s) => paidStatuses.has(s.sessionStatus)).length,
          cancelledSessions: list.filter((s) => s.sessionStatus === 'CANCELLED').length,
          refundedSessions: list.filter((s) => s.sessionStatus === 'REFUNDED').length,
          totalRevenue, totalKwh: Number(totalKwh.toFixed(2)),
          averageSessionAmount: list.length ? Math.round(totalRevenue / list.length) : 0,
        },
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/admin/archive/:archiveId/restore',
    handler: () => ok({}, 'Session restored'),
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/admin/create-session',
    handler: (ctx) => {
      const session: any = {
        id: genId('KABISA-C'), sessionId: genId('KABISA-C'), source: 'MANUAL',
        sessionStatus: 'STARTED', startTime: now(), createdAt: now(), updatedAt: now(),
        isActive: true, isPaid: false, transactions: [], ebms: [], ...ctx.body,
      };
      db.sessions.unshift(session);
      return ok({ session: sessionWithRelations(session) }, 'Session created');
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/charging-sessions/:sessionId/customer-info',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      Object.assign(session, ctx.body, { customerInfoAdded: true, updatedAt: now() });
      return ok({ session: sessionWithRelations(session) }, 'Customer info updated');
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/charging-sessions/:sessionId/ebm-info',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      Object.assign(session, ctx.body, { updatedAt: now() });
      return ok({ ebmInfo: session }, 'EBM info updated');
    },
  },
  { method: 'GET', pattern: '/api/charging-sessions/:sessionId/ebm-info', handler: (ctx) => {
    const session = findSession(ctx.params.sessionId);
    if (!session) return notFound('Session not found');
    return ok({ ebmInfo: { customerName: session.customerName, customerPhone: session.customerPhone, ebmTin: session.ebmTin, willGenerateEbm: !session.ebms?.length } });
  } },
  { method: 'GET', pattern: '/api/charging-sessions/:sessionId/history', handler: (ctx) => ok({ history: [] }) },
  { method: 'GET', pattern: '/api/charging-sessions/:sessionId/momo-payment-status', handler: () => ok({ status: 'SUCCESS' }) },
  { method: 'GET', pattern: '/api/charging-sessions/:sessionId/payment-methods', handler: () => ok({ methods: ['MOMO', 'CARD', 'MOMO_CODE_PAYMENT'] }) },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/admin-edit/preview',
    handler: (ctx) => ok({ preview: { ...ctx.body }, changes: [] }),
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/admin-end',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'COMPLETED';
      session.endTime = now();
      session.isActive = false;
      return ok({ session: sessionWithRelations(session) }, 'Session ended by admin');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/admin-force-end-remote',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'COMPLETED';
      session.endTime = now();
      session.isActive = false;
      return ok({ session: sessionWithRelations(session) }, 'Remote session force-ended');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/cancel',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'CANCELLED';
      session.cancellationReason = ctx.body?.reason || 'Cancelled by operator';
      session.isActive = false;
      return ok({ session: sessionWithRelations(session) }, 'Session cancelled');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/end-remote',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'COMPLETED';
      session.endTime = now();
      session.isActive = false;
      return ok({ session: sessionWithRelations(session) }, 'Session ended');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/pause',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'PAUSED';
      return ok({ session: sessionWithRelations(session) }, 'Session paused');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/resume',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'STARTED';
      return ok({ session: sessionWithRelations(session) }, 'Session resumed');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/uncancel',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      session.sessionStatus = 'COMPLETED';
      return ok({ session: sessionWithRelations(session) }, 'Session restored');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/pay-momo',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (session) { session.isPaid = true; session.sessionStatus = 'PAID'; }
      return ok({ status: 'PENDING', transactionId: genId('tx'), message: 'MoMo prompt sent' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/pay-momo-code',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (session) { session.isPaid = true; session.sessionStatus = 'PAID'; }
      return ok({ status: 'SUCCESS', transactionId: genId('tx') });
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/payment-status',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (session) { session.isPaid = true; session.sessionStatus = 'PAID'; }
      return ok({ session: session ? sessionWithRelations(session) : null }, 'Payment status set');
    },
  },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:sessionId/sync-airtable',
    handler: () => ok({ synced: true }, 'Synced to Airtable'),
  },
  {
    method: 'DELETE',
    pattern: '/api/charging-sessions/:sessionId',
    handler: (ctx) => {
      const idx = db.sessions.findIndex((s) => s.sessionId === ctx.params.sessionId || s.id === ctx.params.sessionId);
      if (idx === -1) return notFound('Session not found');
      db.sessions.splice(idx, 1);
      return ok({}, 'Session deleted');
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/charging-sessions/:sessionId',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      Object.assign(session, ctx.body, { updatedAt: now() });
      return ok({ session: sessionWithRelations(session) }, 'Session updated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/charging-sessions/:sessionId',
    handler: (ctx) => {
      const session = findSession(ctx.params.sessionId);
      if (!session) return notFound('Session not found');
      return ok({ session: sessionWithRelations(session) });
    },
  },
];
