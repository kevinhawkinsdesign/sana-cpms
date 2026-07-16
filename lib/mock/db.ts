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
