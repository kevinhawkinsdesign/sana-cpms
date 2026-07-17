import seedData from './seed/data.json';

export type AnyObj = Record<string, any>;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => new Date().toISOString();

// Seed is cloned once per server process into a mutable in-memory store, so
// creates/edits made during a demo session persist until the dev server (or
// serverless instance) restarts.
const seed = clone(seedData) as {
  countries: AnyObj[];
  organizations: AnyObj[];
  chargers: AnyObj[];
  guns: AnyObj[];
  pedestals: AnyObj[];
  vehicles: AnyObj[];
  operators: AnyObj[];
  customers: AnyObj[];
  sessions: AnyObj[];
  shopVehicles: AnyObj[];
  shopOrders: AnyObj[];
};

const orgIds = seed.organizations.map((o) => o.id);

// ---------------- Demo login personas ----------------
// Any credentials succeed at login; the email/phone typed in decides which
// seeded persona comes back so the demo can show every role without a real
// user directory. See lib/mock/auth.ts for the resolution logic.
const demoAdmin: AnyObj = {
  id: 'user_demo_admin',
  firstName: 'Amara',
  lastName: 'Kagabo',
  email: 'admin@demo.kabisa.rw',
  phone: '0788000001',
  role: 'ADMIN',
  userType: 'KABISA_OWNER',
  imageUrl: null,
  isVerified: true,
  isActive: true,
  organizationId: null,
  organizations: seed.organizations.map((o) => ({ id: o.id, name: o.name })),
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: now(),
};

const demoOrgAdmin: AnyObj = {
  id: 'user_demo_org_admin',
  firstName: 'Diane',
  lastName: 'Uwase',
  email: 'owner@demo.kabisa.rw',
  phone: '0788000002',
  role: 'ORGANIZATION_ADMIN',
  userType: 'KABISA_OWNER',
  imageUrl: null,
  isVerified: true,
  isActive: true,
  organizationId: 'org_kabisa_evp',
  organizations: [{ id: 'org_kabisa_evp', name: 'Kabisa EVP Network' }],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: now(),
};

// Real seeded operator/customer we alias as the "operator" / "customer" demo
// personas, so their login shows genuine session history instead of an
// empty new account.
const demoOperatorAliasId = 'user-op_92086de9b5'; // Eliane Umutesiwase (EVP Kacyiru)
const demoCustomerAliasId = 'user-cust_b6ed9f6dff'; // GreenRide Africa

export const users: AnyObj[] = [demoAdmin, demoOrgAdmin, ...seed.operators, ...seed.customers];

// ---------------- Synthetic businesses (fleet customers) ----------------
const businesses: AnyObj[] = [
  { id: 'business_greenride', name: 'GreenRide Africa', tin: '104567890', createdAt: '2025-02-01T00:00:00Z', updatedAt: now() },
  { id: 'business_vw_mobility', name: 'Volkswagen Mobility Solutions Rwanda Ltd', tin: '104778812', createdAt: '2025-03-15T00:00:00Z', updatedAt: now() },
  { id: 'business_solid_africa', name: 'Solid Africa', tin: '104991233', createdAt: '2025-05-10T00:00:00Z', updatedAt: now() },
];

const businessUsers: AnyObj[] = [
  { id: 'bu_1', userId: demoCustomerAliasId, businessId: 'business_greenride', role: 'OWNER', createdAt: '2025-02-01T00:00:00Z' },
];

const businessVehicles: AnyObj[] = seed.vehicles.slice(0, 6).map((v, i) => ({
  id: genId('bveh'),
  businessId: businesses[i % businesses.length].id,
  kabisaId: v.kabisaId,
  licensePlates: v.licensePlates.map((p: AnyObj) => p.licencePlateNumber),
  make: v.make,
  model: v.model,
  year: 2024,
  color: 'White',
  vin: v.vin,
  chargingStatus: 'AVAILABLE',
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
}));

const businessContracts: AnyObj[] = businesses.map((b) => ({
  id: genId('contract'),
  businessId: b.id,
  contractName: `${b.name} Standard Rate`,
  invoicingDateOfTheMonth: 1,
  pricingTiers: [{ id: genId('tier'), minKwh: 0, maxKwh: null, ratePerKwh: 550 }],
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
}));

// ---------------- KabisaIds (derived) ----------------
const kabisaIds: AnyObj[] = [
  ...seed.chargers.map((c) => ({ id: genId('kid'), kabisaId: c.kabisaId, kabisaIdType: 'CHARGER', status: 'ACTIVE', entityId: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt })),
  ...seed.vehicles.map((v) => ({ id: genId('kid'), kabisaId: v.kabisaId, kabisaIdType: 'VEHICLE', status: 'ACTIVE', entityId: v.id, createdAt: v.createdAt, updatedAt: v.updatedAt })),
];

// ---------------- Incidents (synthetic) ----------------
// Hand-authored so the demo tells a coherent story across real seeded
// chargers/guns: a couple of genuinely time-sensitive open faults, some
// already being worked, and a resolved history for trend context.
const chargerByName = new Map(seed.chargers.map((c) => [c.name, c] as const));
const gunsByCharger = (chargerName: string) => seed.guns.filter((g) => g.chargerId === chargerByName.get(chargerName)?.id);
const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

interface IncidentSeed {
  chargerName: string; gunNumber: string; errorCode: string; severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'resolved'; openedMinAgo: number; ackedMinAgo?: number; resolvedMinAgo?: number; by?: string;
}
const INCIDENT_SEEDS: IncidentSeed[] = [
  { chargerName: 'EVP Kibagabaga', gunNumber: '2', errorCode: 'PowerMeterFailure', severity: 'critical', status: 'open', openedMinAgo: 4 },
  { chargerName: 'SP Kanombe', gunNumber: '1', errorCode: 'CommunicationFailure', severity: 'critical', status: 'open', openedMinAgo: 12 },
  { chargerName: 'EVP Kacyiru', gunNumber: '2', errorCode: 'GroundFailure', severity: 'critical', status: 'open', openedMinAgo: 47 },
  { chargerName: 'EVP Nyamirambo', gunNumber: '2', errorCode: 'ConnectorLockFailure', severity: 'warning', status: 'open', openedMinAgo: 25 },
  { chargerName: 'People Kacyiru', gunNumber: '1', errorCode: 'WeakSignal', severity: 'info', status: 'open', openedMinAgo: 55 },
  { chargerName: 'SP Musanze', gunNumber: '2', errorCode: 'PowerMeterFailure', severity: 'critical', status: 'acknowledged', openedMinAgo: 110, ackedMinAgo: 80, by: 'Aline Rurangirwa' },
  { chargerName: 'IZI Nyarutarama', gunNumber: '1', errorCode: 'HighTemperature', severity: 'warning', status: 'acknowledged', openedMinAgo: 180, ackedMinAgo: 160, by: 'Bikorima Bosco' },
  { chargerName: 'EVP Kibagabaga', gunNumber: '1', errorCode: 'OverCurrentFailure', severity: 'critical', status: 'resolved', openedMinAgo: 2940, ackedMinAgo: 2920, resolvedMinAgo: 2895, by: 'Alliah Uwimbabazi' },
  { chargerName: 'EVP Kacyiru', gunNumber: '1', errorCode: 'EVCommunicationError', severity: 'warning', status: 'resolved', openedMinAgo: 7300, ackedMinAgo: 7280, resolvedMinAgo: 7250, by: 'Celine Cyiza' },
  { chargerName: 'SP Kanombe', gunNumber: '2', errorCode: 'GroundFailure', severity: 'critical', status: 'resolved', openedMinAgo: 1500, ackedMinAgo: 1480, resolvedMinAgo: 1440, by: 'BIGIRIMANA swaleh' },
  { chargerName: 'EVP Nyamirambo', gunNumber: '1', errorCode: 'HighTemperature', severity: 'warning', status: 'resolved', openedMinAgo: 4200, ackedMinAgo: 4180, resolvedMinAgo: 4140, by: 'Bamurange Faith' },
  { chargerName: 'IZI Nyarutarama', gunNumber: '2', errorCode: 'CommunicationFailure', severity: 'info', status: 'resolved', openedMinAgo: 8600, ackedMinAgo: 8580, resolvedMinAgo: 8550, by: 'Aline Rurangirwa' },
  { chargerName: 'People Kacyiru', gunNumber: '2', errorCode: 'WeakSignal', severity: 'info', status: 'resolved', openedMinAgo: 5760, ackedMinAgo: 5740, resolvedMinAgo: 5700, by: 'Celine Cyiza' },
  { chargerName: 'SP Musanze', gunNumber: '1', errorCode: 'ConnectorLockFailure', severity: 'warning', status: 'resolved', openedMinAgo: 10080, ackedMinAgo: 10060, resolvedMinAgo: 10020, by: 'Bikorima Bosco' },
];
const incidents: AnyObj[] = INCIDENT_SEEDS.map((s, i) => {
  const charger = chargerByName.get(s.chargerName);
  const gun = gunsByCharger(s.chargerName).find((g) => g.gunNumber === s.gunNumber);
  return {
    id: `incident_${i + 1}`,
    chargerId: charger?.id ?? null,
    chargerName: s.chargerName,
    pedestalId: charger?.pedestalId ?? null,
    gunId: gun?.id ?? null,
    connectorId: Number(s.gunNumber),
    errorCode: s.errorCode,
    severity: s.severity,
    status: s.status,
    openedAt: minsAgo(s.openedMinAgo),
    acknowledgedAt: s.ackedMinAgo !== undefined ? minsAgo(s.ackedMinAgo) : null,
    acknowledgedBy: s.status !== 'open' ? s.by ?? null : null,
    resolvedAt: s.resolvedMinAgo !== undefined ? minsAgo(s.resolvedMinAgo) : null,
    resolvedBy: s.status === 'resolved' ? s.by ?? null : null,
  };
});

// ---------------- Feedback: reviews & reports (synthetic) ----------------
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function ratingForSeed(seed: string): number {
  const r = hashStr(seed) % 100;
  if (r < 52) return 5;
  if (r < 78) return 4;
  if (r < 91) return 3;
  if (r < 97) return 2;
  return 1;
}
const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Fast, reliable charging every time — my go-to station.',
    'Spotless site, worked first try, app total matched the price exactly.',
    'Charged from 20% to 90% faster than I expected. Great spot.',
    'Staff on site were quick to help when I had a payment question.',
  ],
  4: [
    'Good charger, just a short wait during peak hours.',
    'Worked well — would love more shade over the bays.',
    'Reliable so far, the app’s live session tracking is handy.',
  ],
  3: [
    'Charging was fine but the app took a while to start the session.',
    'One of the two guns was out of service when I arrived.',
    'Average experience — power dipped for a minute mid-session.',
  ],
  2: [
    'Card reader didn’t work, had to switch to mobile money.',
    'Charger ran noticeably slower than the listed rating during my visit.',
  ],
  1: [
    'Gun was completely unresponsive — had to drive to another station.',
    'Session didn’t end automatically and I was billed for extra time.',
  ],
};
const reviewableSessions = seed.sessions.filter(
  (s, i) => i % 71 === 5 && ['PAID', 'COMPLETED', 'EBM_ISSUED'].includes(s.sessionStatus),
);
const reviews: AnyObj[] = reviewableSessions.map((s) => {
  const rating = ratingForSeed(s.id);
  const pool = REVIEW_COMMENTS[rating];
  const comment = pool[hashStr(s.id + 'comment') % pool.length];
  const charger = seed.chargers.find((c) => c.id === s.chargerId);
  return {
    id: genId('review'),
    sessionId: s.id,
    chargerId: s.chargerId,
    chargerName: charger?.name ?? 'Unknown station',
    customerId: s.customerId,
    customerName: s.customerName || 'Anonymous driver',
    rating,
    comment,
    createdAt: s.endTime || s.startTime,
  };
});

interface ReportSeed {
  chargerName: string; category: string; severity: 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved'; description: string; reporterName: string; reporterType: 'customer' | 'operator';
  createdMinAgo: number; resolvedMinAgo?: number;
}
const REPORT_SEEDS: ReportSeed[] = [
  { chargerName: 'EVP Kibagabaga', category: 'Safety concern', severity: 'high', status: 'open', description: 'Exposed cable insulation on Gun 2 — flagged before use.', reporterName: 'Jean Bosco N.', reporterType: 'customer', createdMinAgo: 18 },
  { chargerName: 'SP Kanombe', category: 'Card reader', severity: 'medium', status: 'open', description: 'Card reader rejects all cards, only mobile money works.', reporterName: 'MTN Rwanda (fleet)', reporterType: 'customer', createdMinAgo: 90 },
  { chargerName: 'EVP Nyamirambo', category: 'Plug damage', severity: 'high', status: 'investigating', description: 'CCS2 connector latch feels loose, doesn’t click fully.', reporterName: 'Aline Rurangirwa', reporterType: 'operator', createdMinAgo: 420 },
  { chargerName: 'IZI Nyarutarama', category: 'Slow charging', severity: 'low', status: 'investigating', description: 'Consistently charging at ~40kW instead of the rated 60kW.', reporterName: 'GreenRide Africa', reporterType: 'customer', createdMinAgo: 1200 },
  { chargerName: 'People Kacyiru', category: 'App/billing', severity: 'medium', status: 'open', description: 'Charged twice for the same session — needs a refund.', reporterName: 'Diane U.', reporterType: 'customer', createdMinAgo: 260 },
  { chargerName: 'SP Musanze', category: 'Other', severity: 'low', status: 'resolved', description: 'Requested better lighting for evening charging.', reporterName: 'Bikorima Bosco', reporterType: 'operator', createdMinAgo: 8640, resolvedMinAgo: 8000 },
  { chargerName: 'EVP Kacyiru', category: 'Plug damage', severity: 'medium', status: 'resolved', description: 'Gun 1 handle cracked, replaced under warranty.', reporterName: 'Solid Africa', reporterType: 'customer', createdMinAgo: 12000, resolvedMinAgo: 11500 },
  { chargerName: 'EVP Kibagabaga', category: 'Card reader', severity: 'low', status: 'resolved', description: 'Card reader firmware updated after intermittent failures.', reporterName: 'Celine Cyiza', reporterType: 'operator', createdMinAgo: 15840, resolvedMinAgo: 15700 },
];
const reports: AnyObj[] = REPORT_SEEDS.map((r, i) => {
  const charger = chargerByName.get(r.chargerName);
  return {
    id: `report_${i + 1}`,
    chargerId: charger?.id ?? null,
    chargerName: r.chargerName,
    category: r.category,
    severity: r.severity,
    status: r.status,
    description: r.description,
    reporterName: r.reporterName,
    reporterType: r.reporterType,
    createdAt: minsAgo(r.createdMinAgo),
    resolvedAt: r.resolvedMinAgo !== undefined ? minsAgo(r.resolvedMinAgo) : null,
  };
});

// ---------------- Shift reports (derived) ----------------
// Not separately seeded — one synthetic report per operator/day derived from
// that operator's real sessions that day. Exported (not just computed inside
// the console mock handler) so the static-export build's generateStaticParams
// for /console/shifts/:shiftId can pre-render every real shift ID that the
// Shifts list can actually link to — a page reachable client-side but never
// pre-rendered 404s under `output: 'export'`.
const KIGALI_OFFSET_MS_SHIFTS = 2 * 3_600_000;
function shiftDayKey(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(new Date(iso).getTime() + KIGALI_OFFSET_MS_SHIFTS).toISOString().slice(0, 10);
}
function isPaidSessionStatus(status: string) {
  return status === 'PAID' || status === 'EBM_ISSUED';
}
export function allShiftReports(): AnyObj[] {
  const sessionsWithOperator = seed.sessions.filter((s) => s.operatorId);
  const groups = new Map<string, AnyObj[]>();
  for (const s of sessionsWithOperator) {
    const key = `${s.operatorId}|${shiftDayKey(s.startTime)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const today = shiftDayKey(now());
  const reportsList = [...groups.entries()].map(([key, sess]) => {
    const [operatorId, day] = key.split('|');
    const operator = users.find((u) => u.id === operatorId);
    const sorted = sess.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const checkInTime = new Date(new Date(first.startTime).getTime() - 12 * 60_000).toISOString();
    const isOngoing = day === today;
    const checkOutTime = isOngoing ? null : new Date(new Date(last.endTime || last.startTime).getTime() + 8 * 60_000).toISOString();
    const kwh = Number(sess.reduce((sum, s) => sum + (s.chargedKwh || 0), 0).toFixed(2));
    const rwf = sess.filter((s) => isPaidSessionStatus(s.sessionStatus)).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const chargerCounts = new Map<string, number>();
    for (const s of sess) chargerCounts.set(s.chargerId, (chargerCounts.get(s.chargerId) || 0) + 1);
    const topChargerId = [...chargerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const charger = seed.chargers.find((c) => c.id === topChargerId);
    return {
      id: `shift_${operatorId}_${day}`,
      checkInTime, checkOutTime,
      shiftDurationMinutes: checkOutTime ? Math.round((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60_000) : null,
      chargingSessionCount: sess.length, kwhSold: kwh, moneyCollectedRwf: rwf, meterTotalKwh: kwh,
      isApproved: !isOngoing, isFlagged: false,
      operator: operator ? { id: operator.id, firstName: operator.firstName, lastName: operator.lastName, imageUrl: operator.imageUrl } : null,
      operatorShift: { charger: charger ? { id: charger.id, name: charger.name, organizationId: charger.organizationId } : null },
      _day: day, _operatorId: operatorId,
    };
  });
  return reportsList.sort((a, b) => b._day.localeCompare(a._day));
}

export const db = {
  countries: seed.countries,
  organizations: seed.organizations,
  chargers: seed.chargers,
  guns: seed.guns,
  pedestals: seed.pedestals,
  vehicles: seed.vehicles,
  users,
  sessions: seed.sessions,
  // Shop page filters by uppercase country codes ('RW'/'KE'); the seed stores lowercase.
  shopVehicles: seed.shopVehicles.map((v) => ({ ...v, country: v.country.toUpperCase() })),
  shopOrders: seed.shopOrders,
  businesses,
  businessUsers,
  businessVehicles,
  businessContracts,
  kabisaIds,
  incidents,
  reviews,
  reports,
};

export const demoPersonaIds = {
  admin: demoAdmin.id,
  orgAdmin: demoOrgAdmin.id,
  operator: demoOperatorAliasId,
  customer: demoCustomerAliasId,
};

export { genId, now };

export function paginate<T>(list: T[], page = 1, limit = 20) {
  const total = list.length;
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * limit;
  const items = list.slice(start, start + limit);
  return {
    items,
    pagination: { page: safePage, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export function findUser(id: string): AnyObj | undefined {
  return users.find((u) => u.id === id);
}

export function chargerPublic(c: AnyObj): AnyObj {
  const guns = db.guns.filter((g) => g.chargerId === c.id);
  const pedestals = db.pedestals
    .filter((p) => p.chargerId === c.id)
    .map((p) => ({ ...p, guns: db.guns.filter((g) => g.pedestalId === p.id) }));
  return { ...c, guns, pedestals };
}

export function sessionWithRelations(s: AnyObj): AnyObj {
  const vehicle = s.vehicleId ? db.vehicles.find((v) => v.id === s.vehicleId) : undefined;
  const charger = s.chargerId ? db.chargers.find((c) => c.id === s.chargerId) : undefined;
  const operator = s.operatorId ? db.users.find((u) => u.id === s.operatorId) : undefined;
  const gun = charger ? db.guns.find((g) => g.chargerId === charger.id) : undefined;
  const pedestal = charger ? db.pedestals.find((p) => p.chargerId === charger.id) : undefined;
  return {
    ...s,
    vehicle: vehicle
      ? { ...vehicle, licensePlates: vehicle.licensePlates }
      : undefined,
    charger: charger
      ? {
          id: charger.id,
          kabisaId: charger.kabisaId,
          meterId: charger.meterId,
          gunNumber: charger.gunNumber,
          latitude: charger.latitude,
          longitude: charger.longitude,
          name: charger.name,
          address: charger.address,
          power: charger.power,
          momoCode: charger.momoCode,
          imageUrl: charger.imageUrl,
          operationalStatus: charger.operationalStatus,
          generateEbm: charger.generateEbm,
          isActive: charger.isActive,
          createdAt: charger.createdAt,
          updatedAt: charger.updatedAt,
        }
      : undefined,
    operator: operator
      ? { id: operator.id, firstName: operator.firstName, lastName: operator.lastName, email: operator.email }
      : undefined,
    gun: gun
      ? { id: gun.id, kabisaId: gun.kabisaId, chargerId: gun.chargerId, name: gun.name, gunNumber: gun.gunNumber, chargingStatus: gun.chargingStatus, currentSessionId: gun.currentSessionId, isActive: gun.isActive, createdAt: gun.createdAt, updatedAt: gun.updatedAt }
      : undefined,
    pedestal: pedestal ? { id: pedestal.id, name: pedestal.name, onlineStatus: pedestal.onlineStatus } : undefined,
  };
}
