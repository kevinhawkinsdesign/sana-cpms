import { Route } from '../matcher';
import { ok, notFound, fail } from '../respond';
import { db, genId, now, paginate } from '../db';

// Uint8Array (not Buffer, which doesn't exist in the browser bundle the
// static-export build ships) — TextEncoder works identically in Node too.
const PLACEHOLDER_PDF = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 150]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n' +
    '4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
    '5 0 obj<</Length 60>>stream\nBT /F1 14 Tf 20 100 Td (Kabisa Demo Report) Tj ET\nendstream endobj\n' +
    'trailer<</Root 1 0 R>>',
);

function pdfResponse() {
  return new Response(PLACEHOLDER_PDF, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
}

// Same fallback table the real currency-conversion route used when the free
// exchange-rate API it called was unavailable — reused here so the demo
// needs no external service at all.
const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  USD: 1, KES: 129.08, RWF: 1448.56, EUR: 0.87, GBP: 0.75,
};

export const miscRoutes: Route[] = [
  {
    method: 'POST',
    pattern: '/api/currency-conversion',
    handler: (ctx) => {
      const { amount, fromCurrency, toCurrency } = ctx.body || {};
      if (!amount || amount <= 0) return fail('Invalid amount. Must be a positive number.');
      if (!fromCurrency || !toCurrency) return fail('Both fromCurrency and toCurrency are required.');
      if (fromCurrency === toCurrency) {
        return Response.json({ originalAmount: amount, convertedAmount: amount, fromCurrency, toCurrency, exchangeRate: 1, timestamp: now() });
      }
      const fromRate = FALLBACK_EXCHANGE_RATES[fromCurrency];
      const toRate = FALLBACK_EXCHANGE_RATES[toCurrency];
      if (!fromRate || !toRate) return fail(`Unsupported currency pair: ${fromCurrency} to ${toCurrency}`);
      const exchangeRate = toRate / fromRate;
      return Response.json({
        originalAmount: amount, convertedAmount: Number((amount * exchangeRate).toFixed(2)),
        fromCurrency, toCurrency, exchangeRate, timestamp: now(),
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/detect-license-plate',
    handler: (ctx) => {
      if (!ctx.body?.image) return fail('No image provided');
      // No OCR service in this demo — return a plausible plate so the
      // scanner flow still feels functional end to end.
      const sample = db.vehicles[Math.floor(Math.random() * db.vehicles.length)];
      const plate = sample?.licensePlates?.[0]?.licencePlateNumber || 'RAA000A';
      return Response.json({ success: true, licensePlate: plate, raw: [] });
    },
  },
  {
    method: 'GET',
    pattern: '/api/images/direct-upload',
    handler: () => Response.json({ error: 'Image uploads are not available in this demo.' }, { status: 501 }),
  },
  {
    method: 'GET',
    pattern: '/api/vehicles/check-license',
    handler: (ctx) => {
      const plate = ctx.query.get('plate');
      if (!plate) return fail('License plate is required', 400, 'VALIDATION_ERROR');
      const vehicle = db.vehicles.find((v) => v.licensePlates?.some((p: any) => p.licencePlateNumber === plate));
      return ok({ exists: !!vehicle, vehicle: vehicle || null });
    },
  },

  // ---------------- KabisaIds ----------------
  { method: 'GET', pattern: '/api/admin/kabisa-ids/assigned', handler: () => ok({ kabisaIds: db.kabisaIds.filter((k) => k.entityId) }) },
  { method: 'GET', pattern: '/api/admin/kabisa-ids/unassigned', handler: () => ok({ kabisaIds: db.kabisaIds.filter((k) => !k.entityId) }) },
  { method: 'GET', pattern: '/api/admin/kabisa-ids/type/:type', handler: (ctx) => ok({ kabisaIds: db.kabisaIds.filter((k) => k.kabisaIdType === ctx.params.type) }) },
  { method: 'GET', pattern: '/api/admin/kabisa-ids', handler: () => ok({ kabisaIds: db.kabisaIds }) },
  {
    method: 'POST',
    pattern: '/api/admin/kabisa-ids',
    handler: (ctx) => {
      const kid = { id: genId('kid'), status: 'ACTIVE', createdAt: now(), updatedAt: now(), ...ctx.body };
      db.kabisaIds.push(kid);
      return ok({ kabisaId: kid }, 'Kabisa ID created');
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/kabisa-ids/:id/assign',
    handler: (ctx) => {
      const kid = db.kabisaIds.find((k) => k.id === ctx.params.id);
      if (!kid) return notFound('Kabisa ID not found');
      Object.assign(kid, ctx.body);
      return ok({ kabisaId: kid }, 'Assigned');
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/kabisa-ids/:id/unassign',
    handler: (ctx) => {
      const kid = db.kabisaIds.find((k) => k.id === ctx.params.id);
      if (!kid) return notFound('Kabisa ID not found');
      kid.entityId = null;
      return ok({ kabisaId: kid }, 'Unassigned');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/kabisa-ids/:id',
    handler: (ctx) => {
      const kid = db.kabisaIds.find((k) => k.id === ctx.params.id);
      if (!kid) return notFound('Kabisa ID not found');
      return ok({ kabisaId: kid });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/kabisa-ids/:id',
    handler: (ctx) => {
      const kid = db.kabisaIds.find((k) => k.id === ctx.params.id);
      if (!kid) return notFound('Kabisa ID not found');
      Object.assign(kid, ctx.body, { updatedAt: now() });
      return ok({ kabisaId: kid }, 'Kabisa ID updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/kabisa-ids/:id',
    handler: (ctx) => {
      const idx = db.kabisaIds.findIndex((k) => k.id === ctx.params.id);
      if (idx === -1) return notFound('Kabisa ID not found');
      db.kabisaIds.splice(idx, 1);
      return ok({}, 'Kabisa ID deleted');
    },
  },

  // ---------------- Admin: individual vehicles (vehicle-ownership) ----------------
  {
    method: 'GET',
    pattern: '/api/admin/individuals',
    handler: () => ok({ vehicles: db.vehicles.map((v) => ({ ...v, owner: null })) }),
  },
  {
    method: 'POST',
    pattern: '/api/admin/individuals',
    handler: (ctx) => {
      const vehicle = { id: genId('vehicle'), kabisaId: genId('KB').toUpperCase().slice(0, 8), isActive: true, createdAt: now(), updatedAt: now(), licensePlates: [], ...ctx.body };
      db.vehicles.push(vehicle);
      return ok({ vehicle }, 'Vehicle registered');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/individuals/:vehicleId/payment-methods',
    handler: () => ok({ paymentMethods: [] }),
  },
  {
    method: 'POST',
    pattern: '/api/admin/individuals/:vehicleId/activate',
    handler: (ctx) => {
      const v = db.vehicles.find((x) => x.id === ctx.params.vehicleId);
      if (v) v.isActive = true;
      return ok({ vehicle: v }, 'Vehicle activated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/individuals/:vehicleId',
    handler: (ctx) => {
      const v = db.vehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      return ok({ vehicle: v });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/admin/individuals/:vehicleId',
    handler: (ctx) => {
      const v = db.vehicles.find((x) => x.id === ctx.params.vehicleId);
      if (!v) return notFound('Vehicle not found');
      Object.assign(v, ctx.body, { updatedAt: now() });
      return ok({ vehicle: v }, 'Vehicle updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/individuals/:vehicleId',
    handler: (ctx) => {
      const idx = db.vehicles.findIndex((x) => x.id === ctx.params.vehicleId);
      if (idx === -1) return notFound('Vehicle not found');
      db.vehicles.splice(idx, 1);
      return ok({}, 'Vehicle deleted');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/individuals/:vehicleId/payment-methods/:paymentMethodId',
    handler: () => ok({}, 'Payment method removed'),
  },
  { method: 'POST', pattern: '/api/vehicle-ownership', handler: (ctx) => ok({ ownership: { id: genId('own'), ...ctx.body, createdAt: now() } }, 'Ownership recorded') },
  { method: 'DELETE', pattern: '/api/vehicle-ownership/:vehicleKabisaId', handler: () => ok({}, 'Ownership removed') },

  // ---------------- Admin: vehicle debt ----------------
  { method: 'GET', pattern: '/api/admin/vehicles/debt/list', handler: () => ok({ vehicles: [] }) },
  { method: 'GET', pattern: '/api/admin/vehicles/:vehicleId/debt', handler: () => ok({ debt: { amount: 0, currency: 'RWF' } }) },
  { method: 'PUT', pattern: '/api/admin/vehicles/:vehicleId/debt', handler: (ctx) => ok({ debt: ctx.body }, 'Debt updated') },
  { method: 'DELETE', pattern: '/api/admin/vehicles/:vehicleId/debt', handler: () => ok({}, 'Debt cleared') },
  { method: 'GET', pattern: '/api/admin/vehicles/:vehicleId/debt/logs', handler: () => ok({ logs: [] }) },
  { method: 'POST', pattern: '/api/admin/vehicles/:vehicleId/debt/add', handler: (ctx) => ok({ debt: ctx.body }, 'Debt added') },
  { method: 'POST', pattern: '/api/admin/vehicles/:vehicleId/debt/collect', handler: () => ok({}, 'Debt collected') },

  // ---------------- Admin: missing / failed EBM ----------------
  {
    method: 'GET',
    pattern: '/api/admin/missing-ebm/sessions',
    handler: (ctx) => {
      const sessions = db.sessions
        .filter((s) => !s.ebms?.length && (s.sessionStatus === 'PAID' || s.sessionStatus === 'COMPLETED'))
        .slice(0, 50)
        .map((s) => {
          const charger = db.chargers.find((c) => c.id === s.chargerId);
          const operator = db.users.find((u) => u.id === s.operatorId);
          return {
            id: s.id, sessionId: s.sessionId, customerName: s.customerName, customerPhone: s.customerPhone,
            chargedKwh: s.chargedKwh, totalAmount: s.totalAmount, startTime: s.startTime, endTime: s.endTime,
            createdAt: s.createdAt, ebmPaymentMethodName: s.paymentMethodName,
            charger: charger ? { name: charger.name } : null,
            operator: operator ? { firstName: operator.firstName, lastName: operator.lastName } : null,
          };
        });
      return ok({ count: sessions.length, sessions });
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/missing-ebm/bulk-generate',
    handler: (ctx) => {
      const ids: string[] = ctx.body?.sessionIds || [];
      const results = ids.map((id) => ({ sessionId: id, status: 'success' as const, message: 'EBM generated' }));
      return ok({ results, successful: results.length, failed: 0, total: results.length });
    },
  },
  { method: 'POST', pattern: '/api/admin/missing-ebm/backfill-status', handler: () => ok({ updated: 0 }) },
  { method: 'GET', pattern: '/api/admin/missing-ebm/failed', handler: () => ok({ count: 0, failedEbms: [] }) },
  { method: 'POST', pattern: '/api/admin/missing-ebm/failed/:ebmId/retry', handler: () => ok({}, 'Retry queued') },

  // ---------------- EBM: general ----------------
  { method: 'POST', pattern: '/api/ebm/validate-tin', handler: (ctx) => ok({ isValid: true, tin: ctx.body?.customerTin, customerName: 'Demo Business Ltd', business: { name: 'Demo Business Ltd', statusCode: 'ACTIVE', province: 'Kigali', district: 'Gasabo', sector: 'Kacyiru', location: 'Kigali, Rwanda' } }) },
  { method: 'POST', pattern: '/api/ebm/generate', handler: (ctx) => ok({ receiptNumber: Math.floor(Math.random() * 90000) + 10000 }, 'EBM generated') },
  { method: 'POST', pattern: '/api/ebm/distribute', handler: () => ok({}, 'EBM distributed') },
  { method: 'POST', pattern: '/api/ebm/standalone-proforma', handler: (ctx) => ok({ proformaId: genId('proforma'), ...ctx.body }, 'Proforma created') },
  { method: 'GET', pattern: '/api/ebm/proforma/:sessionId', handler: () => pdfResponse() },
  { method: 'GET', pattern: '/api/ebm/session/:sessionId', handler: (ctx) => {
    const s = db.sessions.find((x) => x.sessionId === ctx.params.sessionId);
    if (!s) return notFound('Session not found');
    return ok({ session: s });
  } },
  { method: 'GET', pattern: '/api/ebm/vsdc/status', handler: () => ok({ online: true, responseTime: 120 }) },
  { method: 'POST', pattern: '/api/ebm/vsdc/initialize', handler: () => ok({ initialized: true }) },
  { method: 'GET', pattern: '/api/ebm/codes/current', handler: () => ok({ codes: [] }) },
  { method: 'POST', pattern: '/api/ebm/codes/sync', handler: () => ok({ synced: true }) },
  { method: 'POST', pattern: '/api/ebm/x-report/generate/pdf', handler: () => pdfResponse() },
  { method: 'POST', pattern: '/api/ebm/z-report/generate/pdf', handler: () => pdfResponse() },
  { method: 'GET', pattern: '/api/ebm/daily-reports/:reportId/pdf', handler: () => pdfResponse() },
  {
    method: 'POST',
    pattern: '/api/ebm/rra-notices/:noticeId/read',
    handler: () => ok({}, 'Marked as read'),
  },
  { method: 'POST', pattern: '/api/ebm/rra-notices/read-all', handler: () => ok({}, 'All marked as read') },
  {
    method: 'GET',
    pattern: '/api/ebm/rra-notices',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      const notices = [
        { id: 'notice_1', noticeNo: 'RRA-2026-0142', title: 'VAT filing reminder', content: 'REMINDER', regrNm: 'Kabisa Ltd quarterly VAT return due July 31.', detailUrl: null, rraRegDt: '20260710120000', fetchedAt: now(), isRead: false, readAt: null },
        { id: 'notice_2', noticeNo: 'RRA-2026-0139', title: 'EBM device sync required', content: 'ACTION', regrNm: 'One VSDC device requires a certificate refresh.', detailUrl: null, rraRegDt: '20260705090000', fetchedAt: now(), isRead: true, readAt: now() },
      ];
      const { items } = paginate(notices, page, limit);
      return ok({ notices: items, total: notices.length, page, limit, totalPages: 1, unreadCount: notices.filter((n) => !n.isRead).length });
    },
  },

  // ---------------- Reports (sales/plu/xz) — { success, message, data } envelope ----------------
  {
    method: 'GET',
    pattern: '/api/ebm/sales-report/data',
    handler: (ctx) => {
      const startDate = ctx.query.get('startDate') || '';
      const endDate = ctx.query.get('endDate') || '';
      const list = db.sessions.filter((s) => (!startDate || s.startTime >= startDate) && (!endDate || s.startTime <= endDate) && s.ebms?.length);
      const totalSalesAmount = list.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const transactions = list.slice(0, 200).map((s) => ({
        sessionId: s.sessionId, buyerTin: s.ebmTin, buyerPhone: s.customerPhone, buyerName: s.customerName || 'Walk-in Customer',
        invoiceNumber: String(s.ebms[0]?.cisInvoiceNumber || ''), invoiceDate: s.endTime, totalAmount: s.totalAmount || 0,
        items: 'EV Charging Service', vat: Math.round((s.totalAmount || 0) * 0.18), receiptType: 'Normal Sale',
        salesType: 'Normal Sale', salesTypeCode: 'N', paymentMethod: s.paymentMethodName || 'Mobile Money',
        distributionPhone: s.customerPhone, distributionSentAt: s.endTime, distributed: true,
      }));
      return Response.json({
        success: true, message: 'OK',
        data: {
          transactions, totalSalesAmount, totalVat: Math.round(totalSalesAmount * 0.18), totalTransactions: list.length,
          breakdownBySalesType: { normal: { count: list.length, totalSalesAmount, totalVat: Math.round(totalSalesAmount * 0.18) }, training: { count: 0, totalSalesAmount: 0, totalVat: 0 } },
          distributionSummary: { distributed: list.length, notDistributed: 0 },
          startDate, endDate,
        },
      });
    },
  },
  { method: 'GET', pattern: '/api/ebm/sales-report/pdf', handler: () => pdfResponse() },
  {
    method: 'GET',
    pattern: '/api/ebm/plu-report/data',
    handler: (ctx) => {
      const startDate = ctx.query.get('startDate') || '';
      const endDate = ctx.query.get('endDate') || '';
      const list = db.sessions.filter((s) => (!startDate || s.startTime >= startDate) && (!endDate || s.startTime <= endDate));
      return Response.json({
        success: true, message: 'OK',
        data: { items: [{ description: 'EV Charging Service (per kWh)', quantity: list.reduce((s, x) => s + (x.chargedKwh || 0), 0), unitPrice: 600, totalAmount: list.reduce((s, x) => s + (x.totalAmount || 0), 0) }], startDate, endDate },
      });
    },
  },
  { method: 'GET', pattern: '/api/ebm/plu-report/pdf', handler: () => pdfResponse() },

  // ---------------- Uploads ----------------
  { method: 'POST', pattern: '/api/uploads/presign', handler: () => ok({ url: 'https://example.com/demo-upload', key: genId('upload') }) },
  { method: 'POST', pattern: '/api/uploads/multipart/initiate', handler: () => ok({ uploadId: genId('mpu'), key: genId('upload') }) },
  { method: 'POST', pattern: '/api/uploads/multipart/presign-part', handler: () => ok({ url: 'https://example.com/demo-upload-part' }) },
  { method: 'POST', pattern: '/api/uploads/multipart/complete', handler: () => ok({ location: 'https://example.com/demo-file.jpg' }) },
  { method: 'POST', pattern: '/api/uploads/multipart/abort', handler: () => ok({}) },

  // ---------------- Citrine / VSDC telemetry ----------------
  { method: 'GET', pattern: '/api/admin/citrine/status', handler: () => ok({ online: true, latencyMs: { p50: 80, p95: 220 }, counters: { eventsToday: 1240, errorsToday: 3 } }) },
  { method: 'GET', pattern: '/api/admin/citrine/events', handler: () => ok({ events: [] }) },
  { method: 'GET', pattern: '/api/ebm/vsdc/status', handler: () => ok({ online: true }) },

  // ---------------- Session transfer / operators ----------------
  {
    method: 'POST',
    pattern: '/api/operator-shift/transfer-session',
    handler: (ctx) => {
      const session = db.sessions.find((s) => s.sessionId === ctx.body?.sessionId || s.id === ctx.body?.sessionId);
      if (!session) return notFound('Session not found');
      session.operatorId = ctx.body?.newOperatorId || ctx.body?.toOperatorId;
      return ok({ session }, 'Session transferred');
    },
  },

  // ---------------- Operator shifts (lightweight) ----------------
  { method: 'GET', pattern: '/api/operator-shift/my', handler: () => ok({ shifts: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/shift-reports/my', handler: () => ok({ reports: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/charger-inspections', handler: () => ok({ inspections: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/charging-sessions/alerts', handler: () => ok({ alerts: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/charging-sessions/totals', handler: () => ok({ started: 0, completed: 0, paused: 0, cancelled: 0 }) },
  { method: 'GET', pattern: '/api/operator-shift/swaps/pending', handler: () => ok({ swaps: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/swaps/received', handler: () => ok({ swaps: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/swaps/sent', handler: () => ok({ swaps: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/swaps/all', handler: () => ok({ swaps: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/swaps', handler: () => ok({ swaps: [] }) },
  { method: 'POST', pattern: '/api/operator-shift/swaps/approve', handler: () => ok({}, 'Swap approved') },
  { method: 'POST', pattern: '/api/operator-shift/swaps', handler: (ctx) => ok({ swap: { id: genId('swap'), ...ctx.body } }, 'Swap requested') },
  { method: 'POST', pattern: '/api/operator-shift/shift-reports/check-in', handler: (ctx) => ok({ report: { id: genId('report'), checkedInAt: now(), ...ctx.body } }, 'Checked in') },
  { method: 'POST', pattern: '/api/operator-shift/shift-reports/force-check-in', handler: (ctx) => ok({ report: { id: genId('report'), checkedInAt: now(), ...ctx.body } }, 'Force checked in') },
  { method: 'POST', pattern: '/api/operator-shift/charger-inspections', handler: (ctx) => ok({ inspection: { id: genId('inspection'), ...ctx.body } }, 'Inspection logged') },
  { method: 'POST', pattern: '/api/operator-shift', handler: (ctx) => ok({ shift: { id: genId('shift'), ...ctx.body } }, 'Shift created') },
  { method: 'GET', pattern: '/api/operator-shift/next-shift-start-report', handler: () => ok({ report: null }) },
  { method: 'GET', pattern: '/api/operator-shift/shift-reports/:id/approval-history', handler: () => ok({ history: [] }) },
  { method: 'GET', pattern: '/api/operator-shift/shift-reports/:id/detail', handler: () => notFound('Report not found') },
  { method: 'POST', pattern: '/api/operator-shift/shift-reports/:id/approval', handler: () => ok({}, 'Approved') },
  { method: 'POST', pattern: '/api/operator-shift/shift-reports/:id/flag', handler: () => ok({}, 'Flagged') },
  { method: 'PUT', pattern: '/api/operator-shift/shift-reports/:reportId/check-out', handler: () => ok({}, 'Checked out') },
  { method: 'PUT', pattern: '/api/operator-shift/shift-reports/:reportId/force-check-out', handler: () => ok({}, 'Force checked out') },
  { method: 'PUT', pattern: '/api/operator-shift/shift-reports/:reportId', handler: (ctx) => ok({ report: { id: ctx.params.reportId, ...ctx.body } }, 'Report updated') },
  { method: 'PUT', pattern: '/api/operator-shift/charger-inspections/:id', handler: (ctx) => ok({ inspection: { id: ctx.params.id, ...ctx.body } }, 'Inspection updated') },
  { method: 'GET', pattern: '/api/operator-shift/swaps/:swapId', handler: () => notFound('Swap not found') },
  { method: 'PUT', pattern: '/api/operator-shift/swaps/:swapId', handler: (ctx) => ok({ swap: { id: ctx.params.swapId, ...ctx.body } }, 'Swap updated') },
  { method: 'DELETE', pattern: '/api/operator-shift/swaps/:swapId', handler: () => ok({}, 'Swap cancelled') },
  { method: 'DELETE', pattern: '/api/operator-shift/past-shifts', handler: () => ok({}, 'Past shifts cleared') },
  { method: 'PUT', pattern: '/api/operator-shift/:shiftId', handler: (ctx) => ok({ shift: { id: ctx.params.shiftId, ...ctx.body } }, 'Shift updated') },
  { method: 'DELETE', pattern: '/api/operator-shift/:shiftId', handler: () => ok({}, 'Shift deleted') },
];
