import { Route, RouteCtx } from '../matcher';
import { ok, notFound } from '../respond';
import { db, sessionWithRelations, genId, now, paginate, allShiftReports, AnyObj } from '../db';
import {
  ALL_PERMISSIONS, PERMISSION_META, PERMISSION_GROUPS, ROLE_META, ROLE_PERMISSIONS,
  rolePermissions, type OrgRoleKey,
} from '../roles';

const KIGALI_OFFSET_MS = 2 * 3_600_000;

/** Bucket a seeded user's raw role (or a previously-PATCHed org-role) into one
 *  of the 5 org roles the Team/Roles UI understands. */
function memberOrgRole(u: AnyObj | undefined): OrgRoleKey {
  if (!u) return 'VIEWER';
  if (u.role === 'ORGANIZATION_ADMIN' || u.role === 'ADMIN' || u.role === 'ORG_ADMIN') return 'ORG_ADMIN';
  if (u.role === 'ORG_OWNER' || u.role === 'FINANCE' || u.role === 'VIEWER' || u.role === 'OPERATOR') return u.role;
  return 'VIEWER';
}

/** Per-member permission overrides (KAB-126 "Manage access"), keyed
 *  `${orgId}:${userId}`. In-memory only — resets on reload, same as the rest
 *  of the mock store. `undefined` = no override, follow the role default. */
const memberPermissionOverrides = new Map<string, string[]>();
function overrideKey(orgId: string, userId: string): string {
  return `${orgId}:${userId}`;
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(new Date(iso).getTime() + KIGALI_OFFSET_MS).toISOString().slice(0, 10);
}

function orgChargerIds(orgId: string) {
  return db.chargers.filter((c) => c.organizationId === orgId).map((c) => c.id);
}

function orgSessions(orgId: string) {
  const chargerIds = new Set(orgChargerIds(orgId));
  return db.sessions.filter((s) => chargerIds.has(s.chargerId));
}

function orgIncidents(orgId: string) {
  const chargerIds = new Set(orgChargerIds(orgId));
  return db.incidents.filter((i) => chargerIds.has(i.chargerId));
}

function orgReviews(orgId: string) {
  const chargerIds = new Set(orgChargerIds(orgId));
  return db.reviews.filter((r) => chargerIds.has(r.chargerId));
}

function orgReports(orgId: string) {
  const chargerIds = new Set(orgChargerIds(orgId));
  return db.reports.filter((r) => chargerIds.has(r.chargerId));
}

/** Org-scoped view of the shared shift-report derivation (see db.ts's
 *  allShiftReports — also used by the shift-detail page's
 *  generateStaticParams, so every ID this handler can return is guaranteed
 *  pre-rendered in the static export). */
function orgShiftReports(orgId: string) {
  return allShiftReports().filter((r) => r.operatorShift.charger?.organizationId === orgId);
}

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** DecoratedFault-shaped view of an incident, for the faults feed the
 *  Station-detail page and Overview's fault widgets already consume. */
function incidentToFault(i: AnyObj) {
  return {
    id: i.id, stationId: i.chargerId, chargerId: i.chargerId, chargerName: i.chargerName,
    pedestalId: i.pedestalId, pedestalName: i.chargerName ? `${i.chargerName} Pedestal` : null,
    evseId: i.connectorId, connectorId: i.connectorId,
    connectorStatus: i.status === 'resolved' ? 'Available' : 'Faulted',
    errorCode: i.errorCode, vendorErrorCode: null, vendorId: null, info: null,
    reportedAt: i.openedAt, receivedAt: i.openedAt, effectiveAt: i.openedAt, timestampSkewed: false,
  };
}

function isPaidStatus(status: string) {
  return status === 'PAID' || status === 'EBM_ISSUED';
}

export const consoleRoutes: Route[] = [
  // ---------------- Overview / revenue / uptime ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/dashboard',
    handler: (ctx) => {
      const sessions = orgSessions(ctx.params.orgId);
      const today = dayKey(now());
      const todaySessions = sessions.filter((s) => dayKey(s.startTime) === today);
      const buildWeek = (offsetDays: number) => {
        const points = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - (i + offsetDays) * 86_400_000);
          const key = dayKey(d.toISOString());
          const daySessions = sessions.filter((s) => dayKey(s.startTime) === key);
          points.push({
            day: key,
            revenue: daySessions.filter((s) => isPaidStatus(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0),
            kwh: Number(daySessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)),
            sessions: daySessions.length,
          });
        }
        return points;
      };
      const thisWeek = buildWeek(0);
      const lastWeek = buildWeek(7);
      const thisWeekTotal = thisWeek.reduce((s, d) => s + d.revenue, 0);
      const lastWeekTotal = lastWeek.reduce((s, d) => s + d.revenue, 0);
      const active = sessions.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED');
      return ok({
        orgId: ctx.params.orgId, cachedAt: now(), currency: 'RWF',
        today: {
          revenue: todaySessions.filter((s) => isPaidStatus(s.sessionStatus)).reduce((s, x) => s + (x.totalAmount || 0), 0),
          kwh: Number(todaySessions.reduce((s, x) => s + (x.chargedKwh || 0), 0).toFixed(2)),
          sessions: todaySessions.length,
          completedSessions: todaySessions.filter((s) => isPaidStatus(s.sessionStatus)).length,
        },
        weekOverWeek: {
          thisWeek, lastWeek,
          revenueChangePct: lastWeekTotal > 0 ? Number((((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100).toFixed(1)) : null,
        },
        activeSessions: {
          count: active.length, totalLiveKw: active.length ? active.length * 12.5 : 0,
          sessions: active.slice(0, 10).map((s) => {
            const charger = db.chargers.find((c) => c.id === s.chargerId);
            return {
              id: s.id, sessionId: s.sessionId, chargerName: charger?.name || null, pedestalName: charger ? `${charger.name} Pedestal` : null,
              startTime: s.startTime, chargedKwh: s.chargedKwh, soc: s.endSoc ?? s.startSoc, liveKw: 12.5,
            };
          }),
        },
        faults: (() => {
          const openIncidents = orgIncidents(ctx.params.orgId).filter((i) => i.status !== 'resolved');
          return {
            open: openIncidents.length,
            items: openIncidents
              .slice()
              .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
              .slice(0, 6)
              .map((i) => ({
                stationId: i.chargerId, connectorId: i.connectorId, errorCode: i.errorCode,
                connectorStatus: 'Faulted', since: i.openedAt,
              })),
          };
        })(),
        degraded: { telemetry: false, faults: false },
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/revenue/daily',
    handler: (ctx) => {
      const sessions = orgSessions(ctx.params.orgId);
      const from = ctx.query.get('from') || dayKey(new Date(Date.now() - 29 * 86_400_000).toISOString());
      const byDay = new Map<string, any>();
      for (const s of sessions) {
        const key = dayKey(s.startTime);
        if (key < from) continue;
        if (!byDay.has(key)) byDay.set(key, { date: key, grossRwf: 0, kwh: 0, sessionCount: 0, paidCount: 0, ebmIssued: 0, ebmFailed: 0, ebmMissing: 0 });
        const row = byDay.get(key);
        row.sessionCount++;
        row.kwh += s.chargedKwh || 0;
        if (isPaidStatus(s.sessionStatus)) { row.grossRwf += s.totalAmount || 0; row.paidCount++; }
        if (s.ebms?.length) row.ebmIssued++; else if (isPaidStatus(s.sessionStatus)) row.ebmMissing++;
      }
      const daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ ...r, kwh: Number(r.kwh.toFixed(2)) }));
      return ok({ daily });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/revenue/by-station',
    handler: (ctx) => {
      const chargers = db.chargers.filter((c) => c.organizationId === ctx.params.orgId);
      const byStation = chargers.map((c) => {
        const sessions = db.sessions.filter((s) => s.chargerId === c.id);
        return {
          chargerId: c.id, chargerName: c.name,
          grossRwf: sessions.filter((s) => isPaidStatus(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          kwh: Number(sessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)),
          sessionCount: sessions.length,
          paidCount: sessions.filter((s) => isPaidStatus(s.sessionStatus)).length,
          ebmIssued: sessions.filter((s) => s.ebms?.length).length,
          ebmFailed: 0,
          ebmMissing: sessions.filter((s) => isPaidStatus(s.sessionStatus) && !s.ebms?.length).length,
        };
      });
      return ok({ byStation });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/revenue/payment-mix',
    handler: (ctx) => {
      const sessions = orgSessions(ctx.params.orgId).filter((s) => isPaidStatus(s.sessionStatus));
      const byMethod = new Map<string, { amountRwf: number; count: number }>();
      for (const s of sessions) {
        const method = s.paymentMethodEnum || 'MOMO';
        if (!byMethod.has(method)) byMethod.set(method, { amountRwf: 0, count: 0 });
        const row = byMethod.get(method)!;
        row.amountRwf += s.totalAmount || 0;
        row.count++;
      }
      return ok({ paymentMix: [...byMethod.entries()].map(([method, v]) => ({ method, ...v })) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/uptime',
    handler: (ctx) => {
      const chargers = db.chargers.filter((c) => c.organizationId === ctx.params.orgId);
      const org = db.organizations.find((o) => o.id === ctx.params.orgId);
      const incidents = orgIncidents(ctx.params.orgId);
      // A charger currently carrying an open critical incident reads as
      // offline/degraded — everything else is healthy, matching the
      // Incidents page so the two surfaces tell the same story.
      const criticalOpenChargerIds = new Set(
        incidents.filter((i) => i.status !== 'resolved' && i.severity === 'critical').map((i) => i.chargerId),
      );
      return ok({
        orgId: ctx.params.orgId, orgName: org?.name || '',
        range: { from: dayKey(new Date(Date.now() - 29 * 86_400_000).toISOString()), to: dayKey(now()) },
        current: {
          capturedAt: now(), source: 'heartbeat',
          stations: chargers.map((c) => ({ chargerId: c.id, chargerName: c.name, isOnline: !criticalOpenChargerIds.has(c.id) })),
        },
        uptime: {
          snapshotCount: chargers.length * 30, onlineCount: chargers.filter((c) => !criticalOpenChargerIds.has(c.id)).length * 29, overallPercent: 98.2,
          byCharger: chargers.map((c) => ({
            chargerId: c.id, chargerName: c.name,
            uptimePercent: criticalOpenChargerIds.has(c.id) ? 82 + Math.random() * 6 : 97 + Math.random() * 3,
          })),
        },
      });
    },
  },

  // ---------------- Live map (stations + fleet vehicles) ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/map',
    handler: (ctx) => {
      const chargers = db.chargers.filter((c) => c.organizationId === ctx.params.orgId);
      const incidents = orgIncidents(ctx.params.orgId);
      const criticalOpenChargerIds = new Set(
        incidents.filter((i) => i.status !== 'resolved' && i.severity === 'critical').map((i) => i.chargerId),
      );
      const stations = chargers
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          id: c.id, name: c.name, latitude: c.latitude, longitude: c.longitude,
          address: c.address, online: !criticalOpenChargerIds.has(c.id),
        }));

      // "Fleet" = vehicles that have actually charged at this org, so the
      // map reflects real usage rather than an arbitrary sample. Scattered a
      // short, deterministic distance from wherever they last charged —
      // stable across reloads, no separate vehicle-location tracking exists.
      const sessions = orgSessions(ctx.params.orgId);
      const lastSessionByVehicle = new Map<string, AnyObj>();
      for (const s of sessions) {
        if (!s.vehicleId) continue;
        const prev = lastSessionByVehicle.get(s.vehicleId);
        if (!prev || (s.startTime || '') > (prev.startTime || '')) lastSessionByVehicle.set(s.vehicleId, s);
      }
      const activeVehicleIds = new Set(
        sessions.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED').map((s) => s.vehicleId),
      );
      const vehicles = [...lastSessionByVehicle.entries()].slice(0, 24).map(([vehicleId, session]) => {
        const v = db.vehicles.find((x) => x.id === vehicleId);
        const charger = db.chargers.find((c) => c.id === session.chargerId);
        if (!v || !charger?.latitude || !charger?.longitude) return null;
        let h = 0;
        for (const ch of vehicleId) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
        h = Math.abs(h);
        const dLat = (((h % 200) - 100) / 100) * 0.03;
        const dLng = ((((h >> 8) % 200) - 100) / 100) * 0.03;
        return {
          id: v.id, make: v.make, model: v.model,
          plate: v.licensePlates?.[0]?.licencePlateNumber ?? null,
          latitude: charger.latitude + dLat, longitude: charger.longitude + dLng,
          charging: activeVehicleIds.has(vehicleId),
          lastChargerName: charger.name,
        };
      }).filter((v): v is NonNullable<typeof v> => v !== null);

      return ok({ stations, vehicles });
    },
  },

  // ---------------- Sessions ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/sessions',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      const status = ctx.query.get('status');
      const search = ctx.query.get('search')?.toLowerCase();
      let list = orgSessions(ctx.params.orgId);
      const all = list.length;
      const active = list.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED').length;
      const completed = list.filter((s) => isPaidStatus(s.sessionStatus)).length;
      const cancelled = list.filter((s) => s.sessionStatus === 'CANCELLED').length;
      const unpaidList = list.filter((s) => !s.isPaid);
      if (status === 'active') list = list.filter((s) => s.sessionStatus === 'STARTED' || s.sessionStatus === 'PAUSED');
      else if (status === 'completed') list = list.filter((s) => isPaidStatus(s.sessionStatus));
      else if (status === 'cancelled') list = list.filter((s) => s.sessionStatus === 'CANCELLED');
      else if (status === 'unpaid') list = unpaidList;
      if (search) list = list.filter((s) => [s.sessionId, s.customerName, s.carModelMake].filter(Boolean).some((f: string) => f.toLowerCase().includes(search)));
      list = list.slice().sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
      const { items, pagination } = paginate(list, page, limit);
      return ok({
        sessions: items.map((s) => toOrgSessionRow(s)),
        totals: {
          all, active, completed, cancelled, unpaid: unpaidList.length,
          revenue: list.filter((s) => isPaidStatus(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          kwh: Number(list.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)),
          unpaidAmount: unpaidList.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
        },
        pagination,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/sessions/:sessionId',
    handler: (ctx) => {
      const s = db.sessions.find((x) => x.sessionId === ctx.params.sessionId || x.id === ctx.params.sessionId);
      if (!s) return notFound('Session not found');
      const vehicle = db.vehicles.find((v) => v.id === s.vehicleId);
      return ok({
        session: {
          ...toOrgSessionRow(s),
          vehicle: vehicle ? { id: vehicle.id, make: vehicle.make, model: vehicle.model } : null,
          transactions: (s.transactions || []).map((t: any) => ({ ...t, payerName: s.customerName, payerPhone: s.customerPhone, initiatedByUserId: null, initiatedByType: 'CUSTOMER', initiatedByUser: null, paymentMethod: { id: genId('pm'), paymentMethodType: t.paymentMethod?.paymentMethodType || 'MOMO', momoNumber: t.paymentMethod?.momoNumber || null }, statusHistory: [], momoRequestLogs: [] })),
          ebms: (s.ebms || []).map((e: any) => ({ ...e, errorMessage: null, sessionId: s.sessionId })),
        },
        telemetry: { degraded: true, powerCurve: null, faults: null, statusTimeline: null },
      });
    },
  },

  // ---------------- Stations ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/stations',
    handler: (ctx) => {
      const chargers = db.chargers.filter((c) => c.organizationId === ctx.params.orgId);
      const today = dayKey(now());
      const stations = chargers.map((c) => {
        const guns = db.guns.filter((g) => g.chargerId === c.id);
        const sessions = db.sessions.filter((s) => s.chargerId === c.id);
        const todaySessions = sessions.filter((s) => dayKey(s.startTime) === today);
        const active = sessions.filter((s) => s.sessionStatus === 'STARTED');
        const byStatus: Record<string, number> = {};
        for (const g of guns) byStatus[g.chargingStatus] = (byStatus[g.chargingStatus] || 0) + 1;
        return {
          chargerId: c.id, chargerName: c.name, address: c.address, operationalStatus: c.operationalStatus,
          connectorCount: guns.length, connectorsByStatus: byStatus, faultedConnectors: 0,
          liveKw: active.length ? active.length * 12.5 : 0, activeSessions: active.length,
          revenueToday: todaySessions.filter((s) => isPaidStatus(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          sessionsToday: todaySessions.length,
          energyToday: Number(todaySessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)),
          online: true, lastSeen: now(),
        };
      });
      return ok({
        stations,
        totals: {
          chargers: stations.length, online: stations.length, faulted: 0,
          activeSessions: stations.reduce((s, x) => s + x.activeSessions, 0),
          revenueToday: stations.reduce((s, x) => s + x.revenueToday, 0),
        },
        degraded: false,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/faults/summary',
    handler: (ctx) => {
      const incidents = orgIncidents(ctx.params.orgId);
      const byChargerMap = new Map<string, { chargerId: string; chargerName: string; count: number; byErrorCode: Record<string, number> }>();
      const byErrorCodeMap = new Map<string, number>();
      const byDayMap = new Map<string, { date: string; count: number; byCharger: Record<string, number> }>();
      for (const i of incidents) {
        if (!byChargerMap.has(i.chargerId)) byChargerMap.set(i.chargerId, { chargerId: i.chargerId, chargerName: i.chargerName, count: 0, byErrorCode: {} });
        const row = byChargerMap.get(i.chargerId)!;
        row.count++;
        row.byErrorCode[i.errorCode] = (row.byErrorCode[i.errorCode] || 0) + 1;
        byErrorCodeMap.set(i.errorCode, (byErrorCodeMap.get(i.errorCode) || 0) + 1);
        const day = dayKey(i.openedAt);
        if (!byDayMap.has(day)) byDayMap.set(day, { date: day, count: 0, byCharger: {} });
        const drow = byDayMap.get(day)!;
        drow.count++;
        drow.byCharger[i.chargerId] = (drow.byCharger[i.chargerId] || 0) + 1;
      }
      return ok({
        byCharger: [...byChargerMap.values()].sort((a, b) => b.count - a.count),
        byErrorCode: [...byErrorCodeMap.entries()].map(([errorCode, count]) => ({ errorCode, count })).sort((a, b) => b.count - a.count),
        daily: [...byDayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
        total: incidents.length,
        truncated: false,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/faults',
    handler: (ctx) => {
      const limit = Number(ctx.query.get('limit') || 10);
      const offset = Number(ctx.query.get('offset') || 0);
      const chargerId = ctx.query.get('chargerId');
      let list = orgIncidents(ctx.params.orgId).slice().sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      if (chargerId) list = list.filter((i) => i.chargerId === chargerId);
      const page_ = list.slice(offset, offset + limit);
      return ok({ faults: page_.map(incidentToFault), total: list.length, limit, offset });
    },
  },

  // ---------------- Incidents (uptime + time-sensitive faults) ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/incidents',
    handler: (ctx) => {
      const status = ctx.query.get('status');
      const severity = ctx.query.get('severity');
      let list = orgIncidents(ctx.params.orgId);
      if (status && status !== 'all') list = list.filter((i) => i.status === status);
      if (severity && severity !== 'all') list = list.filter((i) => i.severity === severity);
      list = list.slice().sort((a, b) => {
        // Open first (most time-sensitive), then by most-recently-opened.
        const rank = (s: string) => (s === 'open' ? 0 : s === 'acknowledged' ? 1 : 2);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
      });
      const all = orgIncidents(ctx.params.orgId);
      return ok({
        incidents: list.map((i) => ({ ...i, elapsedMinutes: elapsedMinutes(i.status === 'resolved' ? i.resolvedAt : i.openedAt) })),
        totals: {
          open: all.filter((i) => i.status === 'open').length,
          acknowledged: all.filter((i) => i.status === 'acknowledged').length,
          resolved: all.filter((i) => i.status === 'resolved').length,
          criticalOpen: all.filter((i) => i.status !== 'resolved' && i.severity === 'critical').length,
        },
      });
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/orgs/:orgId/incidents/:incidentId',
    handler: (ctx) => {
      const incident = db.incidents.find((i) => i.id === ctx.params.incidentId);
      if (!incident) return notFound('Incident not found');
      const nextStatus = ctx.body?.status;
      const actor = ctx.body?.by || 'You';
      if (nextStatus === 'acknowledged') {
        incident.status = 'acknowledged';
        incident.acknowledgedAt = now();
        incident.acknowledgedBy = actor;
      } else if (nextStatus === 'resolved') {
        incident.status = 'resolved';
        if (!incident.acknowledgedAt) { incident.acknowledgedAt = now(); incident.acknowledgedBy = actor; }
        incident.resolvedAt = now();
        incident.resolvedBy = actor;
      } else if (nextStatus === 'open') {
        incident.status = 'open';
        incident.acknowledgedAt = null; incident.acknowledgedBy = null;
        incident.resolvedAt = null; incident.resolvedBy = null;
      }
      return ok({ incident: { ...incident, elapsedMinutes: elapsedMinutes(incident.status === 'resolved' ? incident.resolvedAt : incident.openedAt) } }, 'Incident updated');
    },
  },

  // ---------------- Feedback: reviews & reports ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/feedback/reviews/summary',
    handler: (ctx) => {
      const reviews = orgReviews(ctx.params.orgId);
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const r of reviews) { distribution[r.rating] = (distribution[r.rating] || 0) + 1; sum += r.rating; }
      return ok({
        count: reviews.length,
        average: reviews.length ? Number((sum / reviews.length).toFixed(2)) : null,
        distribution,
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/feedback/reviews',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      const rating = ctx.query.get('rating');
      const search = ctx.query.get('search')?.toLowerCase();
      let list = orgReviews(ctx.params.orgId).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (rating && rating !== 'all') list = list.filter((r) => String(r.rating) === rating);
      if (search) list = list.filter((r) => [r.customerName, r.chargerName, r.comment].filter(Boolean).some((f: string) => f.toLowerCase().includes(search)));
      const { items, pagination } = paginate(list, page, limit);
      return ok({ reviews: items, pagination });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/feedback/reports',
    handler: (ctx) => {
      const status = ctx.query.get('status');
      const severity = ctx.query.get('severity');
      let list = orgReports(ctx.params.orgId).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (status && status !== 'all') list = list.filter((r) => r.status === status);
      if (severity && severity !== 'all') list = list.filter((r) => r.severity === severity);
      const all = orgReports(ctx.params.orgId);
      return ok({
        reports: list,
        totals: {
          open: all.filter((r) => r.status === 'open').length,
          investigating: all.filter((r) => r.status === 'investigating').length,
          resolved: all.filter((r) => r.status === 'resolved').length,
        },
      });
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/orgs/:orgId/feedback/reports/:reportId',
    handler: (ctx) => {
      const report = db.reports.find((r) => r.id === ctx.params.reportId);
      if (!report) return notFound('Report not found');
      const nextStatus = ctx.body?.status;
      if (nextStatus === 'open' || nextStatus === 'investigating' || nextStatus === 'resolved') {
        report.status = nextStatus;
        report.resolvedAt = nextStatus === 'resolved' ? now() : null;
      }
      return ok({ report }, 'Report updated');
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/stations/:chargerId/power',
    handler: (ctx) => {
      const points = Array.from({ length: 12 }, (_, i) => ({
        t: new Date(Date.now() - (11 - i) * 5 * 60_000).toISOString(),
        powerKw: Math.round(Math.random() * 40 * 10) / 10,
        byConnector: {},
      }));
      return ok({ chargerId: ctx.params.chargerId, points });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/chargers/:chargerId/state',
    handler: (ctx) => {
      const charger = db.chargers.find((c) => c.id === ctx.params.chargerId);
      const guns = db.guns.filter((g) => g.chargerId === ctx.params.chargerId);
      const pedestal = db.pedestals.find((p) => p.chargerId === ctx.params.chargerId);
      const openIncidents = db.incidents.filter((i) => i.chargerId === ctx.params.chargerId && i.status !== 'resolved');
      const stationId = pedestal?.id ?? ctx.params.chargerId;
      const connectors = guns.map((g, idx) => ({
        stationId, connectorId: Number(g.gunNumber) || idx + 1, evseId: Number(g.gunNumber) || idx + 1,
        status: g.chargingStatus === 'AVAILABLE' ? 'Available' : g.chargingStatus === 'CHARGING' ? 'Charging' : (g.chargingStatus || 'Available'),
        errorCode: null, vendorErrorCode: null, vendorId: null, info: null, timestamp: now(),
      }));
      const latestStatusNotifications = openIncidents.map((i, idx) => ({
        id: idx, stationId, chargerId: charger?.id ?? null, chargerName: charger?.name ?? null,
        pedestalId: pedestal?.id ?? null, pedestalName: pedestal?.name ?? null,
        evseId: i.connectorId, connectorId: i.connectorId, connectorStatus: 'Faulted',
        errorCode: i.errorCode, vendorErrorCode: null, vendorId: null, info: null,
        reportedAt: i.openedAt, receivedAt: i.openedAt, effectiveAt: i.openedAt, timestampSkewed: false,
      }));
      return ok({
        chargerId: ctx.params.chargerId, chargerName: charger?.name ?? null,
        stations: [{ stationId, pedestalId: pedestal?.id ?? null, pedestalName: pedestal?.name ?? null, latestStatusNotifications, connectors }],
      });
    },
  },
  { method: 'GET', pattern: '/api/orgs/:orgId/chargers/:chargerId/configuration', handler: (ctx) => ok({ chargerId: ctx.params.chargerId, entries: [] }) },
  { method: 'GET', pattern: '/api/orgs/:orgId/chargers/:chargerId/device-state', handler: (ctx) => ok({ chargerId: ctx.params.chargerId, firmwareVersion: '1.4.2', vendor: 'Kempower', model: 'Satellite', lastHeartbeat: now() }) },
  { method: 'GET', pattern: '/api/orgs/:orgId/chargers/:chargerId/ocpp-messages', handler: () => ok({ messages: [] }) },
  { method: 'GET', pattern: '/api/orgs/:orgId/chargers/:chargerId/command-activity', handler: () => ok({ commands: [] }) },
  { method: 'POST', pattern: '/api/orgs/:orgId/chargers/:chargerId/commands', handler: (ctx) => ok({ status: 'Accepted', commandId: genId('cmd'), ...ctx.body }, 'Command sent') },

  // ---------------- Team / members / invitations ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/members',
    handler: (ctx) => ok(db.users.filter((u) => u.organizationId === ctx.params.orgId).map((u) => ({
      id: u.id, userId: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email, phone: u.phone,
      imageUrl: u.imageUrl, role: memberOrgRole(u),
      status: u.isActive ? 'ACTIVE' : 'SUSPENDED', joinedAt: u.createdAt, lastActive: now(),
    }))),
  },
  {
    method: 'POST',
    pattern: '/api/orgs/:orgId/members/invite',
    handler: (ctx) => ok({ invitation: { id: genId('invite'), email: ctx.body?.email, role: ctx.body?.role || 'VIEWER', status: 'PENDING', expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), invitedBy: 'You', createdAt: now() } }, 'Invitation sent'),
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/members/:userId/permissions',
    handler: (ctx) => {
      const u = db.users.find((x) => x.id === ctx.params.userId);
      const role = memberOrgRole(u);
      const override = memberPermissionOverrides.get(overrideKey(ctx.params.orgId, ctx.params.userId));
      return ok({
        userId: ctx.params.userId, role, status: u?.isActive ? 'ACTIVE' : 'SUSPENDED',
        permissions: override ?? rolePermissions(role),
        customized: override != null,
        editable: role !== 'ORG_OWNER',
      });
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/orgs/:orgId/members/:userId/permissions',
    handler: (ctx) => {
      const u = db.users.find((x) => x.id === ctx.params.userId);
      const role = memberOrgRole(u);
      const key = overrideKey(ctx.params.orgId, ctx.params.userId);
      const requested: string[] | null = ctx.body?.permissions ?? null;
      // Decrease-only, mirroring the UI: an override can only be a subset of
      // the role's own defaults, never grant beyond it.
      const defaults = new Set(rolePermissions(role));
      const clamped = requested === null ? null : requested.filter((p) => defaults.has(p));
      if (clamped === null) memberPermissionOverrides.delete(key);
      else memberPermissionOverrides.set(key, clamped);
      return ok({
        userId: ctx.params.userId, role, status: u?.isActive ? 'ACTIVE' : 'SUSPENDED',
        permissions: clamped ?? rolePermissions(role),
        customized: clamped != null,
        editable: role !== 'ORG_OWNER',
      });
    },
  },
  { method: 'PATCH', pattern: '/api/orgs/:orgId/members/:userId', handler: (ctx) => { const u = db.users.find((x) => x.id === ctx.params.userId); if (u && ctx.body?.role) u.role = ctx.body.role; return ok({}, 'Member updated'); } },
  { method: 'DELETE', pattern: '/api/orgs/:orgId/members/:userId', handler: (ctx) => { const u = db.users.find((x) => x.id === ctx.params.userId); if (u) u.organizationId = null; return ok({}, 'Member removed'); } },
  { method: 'GET', pattern: '/api/orgs/:orgId/invitations', handler: () => ok([]) },
  { method: 'POST', pattern: '/api/orgs/:orgId/invitations/:invitationId/resend', handler: () => ok({}, 'Invitation resent') },
  { method: 'DELETE', pattern: '/api/orgs/:orgId/invitations/:invitationId', handler: () => ok({}, 'Invitation cancelled') },
  { method: 'GET', pattern: '/api/orgs/invitations/preview', handler: (ctx) => ok({ email: 'invitee@example.com', orgName: 'Kabisa EVP Network', role: 'VIEWER', expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), valid: true }) },

  // ---------------- Operators ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/operators',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      const operators = db.users.filter((u) => u.role === 'OPERATOR' && u.organizationId === ctx.params.orgId);
      const { items, pagination } = paginate(operators, page, limit);
      return ok({
        operators: items.map((o) => {
          const sessions = db.sessions.filter((s) => s.operatorId === o.id);
          return {
            id: o.id, name: `${o.firstName} ${o.lastName}`.trim(), email: o.email, phone: o.phone, imageUrl: o.imageUrl,
            role: 'OPERATOR', isTrainee: !!o.isTrainee, status: o.isActive ? 'active' : 'inactive', joinedAt: o.createdAt,
            totalShifts: Math.max(1, Math.round(sessions.length / 15)), totalReports: Math.max(1, Math.round(sessions.length / 15)),
            totalKwh: Number(sessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)), lastReportAt: sessions[0]?.startTime || null,
          };
        }),
        pagination: { total: pagination.total, limit: pagination.limit, offset: (pagination.page - 1) * pagination.limit, page: pagination.page, hasMore: pagination.page < pagination.totalPages },
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/operators/:operatorId',
    handler: (ctx) => {
      const o = db.users.find((u) => u.id === ctx.params.operatorId);
      if (!o) return notFound('Operator not found');
      const sessions = db.sessions.filter((s) => s.operatorId === o.id);
      const shifts = orgShiftReports(ctx.params.orgId).filter((r) => r._operatorId === o.id);
      const flaggedCount = shifts.filter((s) => s.isFlagged).length;
      return ok({
        operator: {
          id: o.id, name: `${o.firstName} ${o.lastName}`.trim(), email: o.email, phone: o.phone, imageUrl: o.imageUrl,
          role: 'OPERATOR', isTrainee: !!o.isTrainee, status: o.isActive ? 'active' : 'inactive', joinedAt: o.createdAt,
        },
        stats: {
          totalReports: shifts.length,
          completedReports: shifts.filter((s) => !!s.checkOutTime).length,
          approvedReports: shifts.filter((s) => s.isApproved).length,
          flaggedReports: flaggedCount,
          totalKwh: Number(sessions.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2)),
          totalSessions: sessions.length,
          lastReportAt: shifts[0]?.checkInTime ?? null,
        },
        recentShifts: shifts.slice(0, 8).map((s) => ({
          id: s.id, shiftDate: s._day, startTime: s.checkInTime, endTime: s.checkOutTime,
          charger: s.operatorShift.charger ? { id: s.operatorShift.charger.name, name: s.operatorShift.charger.name } : null,
        })),
        recentReports: shifts.slice(0, 8).map((s) => ({
          id: s.id, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime,
          isApproved: s.isApproved, isFlagged: s.isFlagged, kwh: s.kwhSold, sessions: s.chargingSessionCount,
        })),
      });
    },
  },

  // ---------------- Shifts / templates / swaps / tags / roles ----------------
  { method: 'GET', pattern: '/api/orgs/:orgId/shifts/calendar', handler: () => ok({ events: [] }) },
  { method: 'GET', pattern: '/api/orgs/:orgId/shifts/export', handler: () => new Response('date,operator,status\n', { status: 200, headers: { 'Content-Type': 'text/csv' } }) },
  { method: 'POST', pattern: '/api/orgs/:orgId/shifts/bulk', handler: (ctx) => ok({ created: (ctx.body?.shifts || []).length }, 'Shifts created') },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/shifts',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = 20;
      const status = ctx.query.get('status');
      const search = ctx.query.get('search')?.toLowerCase();
      const operatorId = ctx.query.get('operatorId');
      let list = orgShiftReports(ctx.params.orgId);
      if (status === 'active') list = list.filter((r) => !r.checkOutTime);
      else if (status === 'completed') list = list.filter((r) => !!r.checkOutTime);
      if (operatorId) list = list.filter((r) => r.operator?.id === operatorId);
      if (search) list = list.filter((r) => `${r.operator?.firstName ?? ''} ${r.operator?.lastName ?? ''}`.toLowerCase().includes(search));
      const all = list;
      const { items, pagination } = paginate(list, page, limit);
      return ok({
        reports: items.map(({ _day, ...r }) => r),
        pagination: { total: pagination.total, limit: pagination.limit, offset: (page - 1) * limit, page: pagination.page, hasMore: page < pagination.totalPages },
        totals: {
          count: all.length,
          activeCount: all.filter((r) => !r.checkOutTime).length,
          kwhSum: Number(all.reduce((sum, r) => sum + (r.kwhSold || 0), 0).toFixed(2)),
          rwfSum: all.reduce((sum, r) => sum + (r.moneyCollectedRwf || 0), 0),
        },
      });
    },
  },
  { method: 'POST', pattern: '/api/orgs/:orgId/shifts', handler: (ctx) => ok({ shift: { id: genId('shift'), ...ctx.body } }, 'Shift created') },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/shifts/:shiftId',
    handler: (ctx) => {
      const report = orgShiftReports(ctx.params.orgId).find((r) => r.id === ctx.params.shiftId);
      if (!report) return notFound('Shift not found');
      const { _day, _operatorId, ...rest } = report;
      const payments = { momo: Math.round(rest.moneyCollectedRwf * 0.6), momoCode: Math.round(rest.moneyCollectedRwf * 0.25), invoice: Math.round(rest.moneyCollectedRwf * 0.1), free: Math.round(rest.moneyCollectedRwf * 0.05) };
      return ok({ detail: { report: { ...rest, payments } } });
    },
  },
  { method: 'PUT', pattern: '/api/orgs/:orgId/shifts/:shiftId', handler: (ctx) => ok({ shift: { id: ctx.params.shiftId, ...ctx.body } }, 'Shift updated') },
  { method: 'DELETE', pattern: '/api/orgs/:orgId/shifts/:shiftId', handler: () => ok({}, 'Shift deleted') },
  { method: 'POST', pattern: '/api/orgs/:orgId/shifts/:shiftId/approval', handler: () => ok({}, 'Shift approved') },
  { method: 'POST', pattern: '/api/orgs/:orgId/shifts/:shiftId/flag', handler: () => ok({}, 'Shift flagged') },
  { method: 'GET', pattern: '/api/orgs/:orgId/shift-templates', handler: () => ok({ templates: [] }) },
  { method: 'POST', pattern: '/api/orgs/:orgId/shift-templates', handler: (ctx) => ok({ template: { id: genId('template'), ...ctx.body } }, 'Template created') },
  { method: 'DELETE', pattern: '/api/orgs/:orgId/shift-templates/:templateId', handler: () => ok({}, 'Template deleted') },
  { method: 'GET', pattern: '/api/orgs/:orgId/swaps', handler: () => ok({ swaps: [] }) },
  { method: 'POST', pattern: '/api/orgs/:orgId/swaps', handler: (ctx) => ok({ swap: { id: genId('swap'), ...ctx.body } }, 'Swap requested') },
  { method: 'POST', pattern: '/api/orgs/:orgId/swaps/:swapId/respond', handler: () => ok({}, 'Swap response recorded') },
  { method: 'GET', pattern: '/api/orgs/:orgId/tags', handler: () => ok({ tags: [] }) },
  { method: 'POST', pattern: '/api/orgs/:orgId/tags', handler: (ctx) => ok({ tag: { id: genId('tag'), ...ctx.body } }, 'Tag created') },
  { method: 'GET', pattern: '/api/orgs/:orgId/tags/:tagId', handler: () => notFound('Tag not found') },
  { method: 'DELETE', pattern: '/api/orgs/:orgId/tags/:tagId', handler: () => ok({}, 'Tag removed') },
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId/roles',
    handler: () => ok({
      roles: (Object.keys(ROLE_META) as OrgRoleKey[]).map((role) => ({
        role, label: ROLE_META[role].label, description: ROLE_META[role].description,
        permissions: ROLE_PERMISSIONS[role], editable: role !== 'ORG_OWNER', customized: false,
      })),
      permissions: ALL_PERMISSIONS.map((key) => ({
        key, label: PERMISSION_META[key].label, group: PERMISSION_META[key].group, ownerOnly: !!PERMISSION_META[key].ownerOnly,
      })),
      groups: PERMISSION_GROUPS.map((g) => ({
        key: g.key, label: g.label, permissions: ALL_PERMISSIONS.filter((p) => PERMISSION_META[p].group === g.key),
      })),
    }),
  },

  // ---------------- Org detail ----------------
  {
    method: 'GET',
    pattern: '/api/orgs/:orgId',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.orgId);
      if (!org) return notFound('Organization not found');
      return ok(org);
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/orgs/:orgId',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.orgId);
      if (!org) return notFound('Organization not found');
      Object.assign(org, ctx.body, { updatedAt: now() });
      return ok(org, 'Organization updated');
    },
  },

  // ---------------- Platform admin: organizations & audit ----------------
  {
    method: 'GET',
    pattern: '/api/admin/platform/organizations',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const limit = Number(ctx.query.get('limit') || 20);
      const { items, pagination } = paginate(db.organizations, page, limit);
      return ok({
        organizations: items.map((o) => ({
          id: o.id, name: o.name, slug: o.id.replace('org_', ''), logo: o.logo, plan: 'GROWTH', status: 'ACTIVE',
          parentOrgId: null, isParentOrganization: false, platformFeePercent: 5, tin: null,
          citrineTenantId: o.citrineTenantId, createdAt: o.createdAt,
          country: db.countries.find((c) => c.id === o.countryId) ? { id: o.countryId, name: 'Rwanda', code: 'rw' } : null,
          _count: { users: db.users.filter((u) => u.organizationId === o.id).length, chargers: db.chargers.filter((c) => c.organizationId === o.id).length },
        })),
        pagination,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/admin/platform/organizations',
    handler: (ctx) => {
      const org = { id: genId('org'), isActive: true, createdAt: now(), updatedAt: now(), _count: { users: 0, chargers: 0 }, ...ctx.body };
      db.organizations.push(org);
      return ok(org, 'Organization created');
    },
  },
  { method: 'PATCH', pattern: '/api/admin/platform/organizations/:id/parent-flag', handler: () => ok({}, 'Updated') },
  { method: 'PATCH', pattern: '/api/admin/platform/organizations/:id/platform-fee', handler: (ctx) => ok({ platformFeePercent: ctx.body?.platformFeePercent }, 'Platform fee updated') },
  { method: 'PATCH', pattern: '/api/admin/platform/organizations/:id/suspend', handler: () => ok({}, 'Organization suspended') },
  {
    method: 'GET',
    pattern: '/api/admin/platform/organizations/:id',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.id);
      if (!org) return notFound('Organization not found');
      return ok({ ...org, parentOrg: null, _count: { users: db.users.filter((u) => u.organizationId === org.id).length, chargers: db.chargers.filter((c) => c.organizationId === org.id).length, chargingSessions: orgSessions(org.id).length, subOrgs: 0 } });
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/admin/platform/organizations/:id',
    handler: (ctx) => {
      const org = db.organizations.find((o) => o.id === ctx.params.id);
      if (!org) return notFound('Organization not found');
      Object.assign(org, ctx.body, { updatedAt: now() });
      return ok(org, 'Organization updated');
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/platform/organizations/:id',
    handler: (ctx) => {
      const idx = db.organizations.findIndex((o) => o.id === ctx.params.id);
      if (idx !== -1) db.organizations.splice(idx, 1);
      return ok({}, 'Organization deleted');
    },
  },
  {
    method: 'GET',
    pattern: '/api/admin/platform/audit-logs',
    handler: (ctx) => {
      const page = Number(ctx.query.get('page') || 1);
      const logs: any[] = [];
      return ok({ logs, pagination: { page, limit: 20, total: 0, totalPages: 1 } });
    },
  },

  // ---------------- Account: login sessions ----------------
  {
    method: 'GET',
    pattern: '/api/auth/sessions',
    handler: () => ok({
      sessions: [
        { id: genId('devsession'), deviceInfo: 'Chrome on macOS', ipAddress: '41.186.12.4', userAgent: 'Mozilla/5.0', expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), isActive: true, createdAt: now(), updatedAt: now(), isCurrentDevice: true },
      ],
    }),
  },
  { method: 'DELETE', pattern: '/api/auth/sessions/:sessionId', handler: () => ok({}, 'Signed out of that device') },

  // ---------------- Charging session extras used only by console ----------------
  { method: 'GET', pattern: '/api/charging-sessions/:id/ebm', handler: (ctx) => {
    const s = db.sessions.find((x) => x.sessionId === ctx.params.id || x.id === ctx.params.id);
    if (!s) return notFound('Session not found');
    return ok({ ebms: s.ebms || [] });
  } },
  {
    method: 'POST',
    pattern: '/api/charging-sessions/:id/mark-paid',
    handler: (ctx) => {
      const s = db.sessions.find((x) => x.sessionId === ctx.params.id || x.id === ctx.params.id);
      if (!s) return notFound('Session not found');
      s.isPaid = true;
      s.sessionStatus = 'PAID';
      return ok({ session: sessionWithRelations(s) }, 'Marked as paid');
    },
  },
];

function toOrgSessionRow(s: any) {
  const charger = db.chargers.find((c) => c.id === s.chargerId);
  const gun = db.guns.find((g) => g.chargerId === s.chargerId);
  const pedestal = db.pedestals.find((p) => p.chargerId === s.chargerId);
  const operator = db.users.find((u) => u.id === s.operatorId);
  const vehicle = db.vehicles.find((v) => v.id === s.vehicleId);
  return {
    id: s.id, sessionId: s.sessionId, sessionStatus: s.sessionStatus, startTime: s.startTime, endTime: s.endTime,
    chargedKwh: s.chargedKwh, totalAmount: s.totalAmount, ratePerKwh: s.rate ?? null, startSoc: s.startSoc, endSoc: s.endSoc,
    discountRate: s.discountRate ?? null, discountAmount: s.discountAmount ?? null, isPaid: !!s.isPaid,
    customerName: s.customerName, customerPhone: s.customerPhone, ebmTin: s.ebmTin, carModelMake: s.carModelMake,
    citrineStationId: charger?.kabisaId || null, citrineSourceId: null,
    charger: charger ? { id: charger.id, name: charger.name } : null,
    pedestal: pedestal ? { id: pedestal.id, name: pedestal.name } : null,
    gun: gun ? { id: gun.id, name: gun.name } : null,
    operator: operator ? { id: operator.id, firstName: operator.firstName, lastName: operator.lastName } : null,
    licensePlate: vehicle?.licensePlates?.[0]?.licencePlateNumber || null,
    transactions: s.transactions || [], ebms: s.ebms || [],
  };
}
