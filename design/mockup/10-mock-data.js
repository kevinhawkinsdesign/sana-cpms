// Kabisa Console — mock data layer
(() => {
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);

const ORGS = [
  { id: 'kabisa', name: 'Kabisa (internal)', plan: 'Internal', role: 'Kabisa Admin', initials: 'K' },
  { id: 'volcanoes', name: 'Volcanoes Mobility Ltd', plan: 'Growth', role: 'Owner', initials: 'VM' },
  { id: 'akagera', name: 'Akagera Logistics', plan: 'Starter', role: 'Owner', initials: 'AL' },
  { id: 'cityride', name: 'CityRide Kigali', plan: 'Growth', role: 'Finance', initials: 'CR' },
];

const STATIONS = [
  { id: 'st-001', name: 'Kigali Heights', area: 'Kacyiru, Kigali', lat: -1.9536, lng: 30.0927, chargers: 4, status: 'operational', uptime30: 99.4, energy24: 612, revenue24: 263200, faults: 0 },
  { id: 'st-002', name: 'Norrsken House', area: 'Nyarugenge, Kigali', lat: -1.9486, lng: 30.0588, chargers: 3, status: 'operational', uptime30: 98.1, energy24: 418, revenue24: 179700, faults: 1 },
  { id: 'st-003', name: 'Special Economic Zone', area: 'Gasabo, Kigali', lat: -1.9214, lng: 30.1532, chargers: 6, status: 'operational', uptime30: 99.9, energy24: 1240, revenue24: 533100, faults: 0 },
  { id: 'st-004', name: 'Remera Depot', area: 'Remera, Kigali', lat: -1.9568, lng: 30.1147, chargers: 5, status: 'degraded', uptime30: 92.6, energy24: 388, revenue24: 166900, faults: 2 },
  { id: 'st-005', name: 'Musanze Hub', area: 'Musanze, Northern', lat: -1.4995, lng: 29.6335, chargers: 2, status: 'operational', uptime30: 97.8, energy24: 154, revenue24: 66200, faults: 0 },
  { id: 'st-006', name: 'Huye Station', area: 'Huye, Southern', lat: -2.6033, lng: 29.7434, chargers: 2, status: 'maintenance', uptime30: 71.2, energy24: 0, revenue24: 0, faults: 1 },
  { id: 'st-007', name: 'Rubavu Waterfront', area: 'Rubavu, Western', lat: -1.6747, lng: 29.2566, chargers: 2, status: 'operational', uptime30: 96.3, energy24: 121, revenue24: 52000, faults: 0 },
  { id: 'st-008', name: 'Amahoro Stadium', area: 'Remera, Kigali', lat: -1.9529, lng: 30.1086, chargers: 3, status: 'installing', uptime30: null, energy24: 0, revenue24: 0, faults: 0 },
];

// Connector statuses follow OCPP: Available / Charging / Preparing / Faulted / Unavailable / Offline
const CHARGERS = [
  { id: 'KBS-0114', station: 'st-001', model: 'Kabisa DC 120', power: 120, type: 'DC', fw: '2.4.1', status: 'online', connectors: [ { id: 1, std: 'CCS2', status: 'Charging', kw: 84.2 }, { id: 2, std: 'CCS2', status: 'Available' } ] },
  { id: 'KBS-0115', station: 'st-001', model: 'Kabisa DC 60', power: 60, type: 'DC', fw: '2.4.1', status: 'online', connectors: [ { id: 1, std: 'CCS2', status: 'Available' }, { id: 2, std: 'CHAdeMO', status: 'Available' } ] },
  { id: 'KBS-0116', station: 'st-001', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.3', status: 'online', connectors: [ { id: 1, std: 'Type 2', status: 'Charging', kw: 11.0 } ] },
  { id: 'KBS-0117', station: 'st-001', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.3', status: 'online', connectors: [ { id: 1, std: 'Type 2', status: 'Available' } ] },
  { id: 'KBS-0090', station: 'st-002', model: 'Kabisa DC 60', power: 60, type: 'DC', fw: '2.4.1', status: 'online', connectors: [ { id: 1, std: 'CCS2', status: 'Charging', kw: 47.5 }, { id: 2, std: 'CCS2', status: 'Preparing' } ] },
  { id: 'KBS-0091', station: 'st-002', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.1', status: 'fault', connectors: [ { id: 1, std: 'Type 2', status: 'Faulted', error: 'GroundFailure' } ] },
  { id: 'KBS-0092', station: 'st-002', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.3', status: 'online', connectors: [ { id: 1, std: 'Type 2', status: 'Available' } ] },
  { id: 'KBS-0201', station: 'st-003', model: 'Kabisa DC 120', power: 120, type: 'DC', fw: '2.4.1', status: 'online', connectors: [ { id: 1, std: 'CCS2', status: 'Charging', kw: 118.0 }, { id: 2, std: 'CCS2', status: 'Charging', kw: 64.3 } ] },
  { id: 'KBS-0202', station: 'st-003', model: 'Kabisa DC 120', power: 120, type: 'DC', fw: '2.4.1', status: 'online', connectors: [ { id: 1, std: 'CCS2', status: 'Available' }, { id: 2, std: 'CCS2', status: 'Charging', kw: 92.1 } ] },
  { id: 'KBS-0140', station: 'st-004', model: 'Kabisa DC 60', power: 60, type: 'DC', fw: '2.3.0', status: 'fault', connectors: [ { id: 1, std: 'CCS2', status: 'Faulted', error: 'OverCurrentFailure' }, { id: 2, std: 'CHAdeMO', status: 'Unavailable' } ] },
  { id: 'KBS-0141', station: 'st-004', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.3', status: 'offline', connectors: [ { id: 1, std: 'Type 2', status: 'Offline' } ] },
  { id: 'KBS-0142', station: 'st-004', model: 'Kabisa AC 22', power: 22, type: 'AC', fw: '1.9.3', status: 'online', connectors: [ { id: 1, std: 'Type 2', status: 'Charging', kw: 7.2 } ] },
];

const VEHICLES = ['RAE 412 C · BYD Dolphin', 'RAD 887 B · Nissan Leaf', 'RAF 003 A · BYD Atto 3', 'RAC 559 D · Tesla Model 3', 'RAE 901 E · Hyundai Kona', 'RAB 224 F · BYD Seagull', 'RAF 778 G · VW ID.4', 'RAD 130 H · Toyota bZ4X'];
const DRIVERS = ['J. Mugisha', 'A. Uwase', 'E. Niyonzima', 'C. Ingabire', 'P. Habimana', 'S. Mukamana', 'D. Nshuti', 'F. Umutoni'];

function mkSessions(n) {
  const out = [];
  const now = new Date('2026-06-11T14:32:00');
  let t = now.getTime();
  for (let i = 0; i < n; i++) {
    const live = i < 5;
    const dc = rnd() > 0.45;
    const kwh = live ? +(5 + rnd() * 30).toFixed(1) : +(8 + rnd() * (dc ? 55 : 28)).toFixed(1);
    const rate = dc ? 430 : 295;
    const stIdx = Math.floor(rnd() * 5);
    const st = STATIONS[stIdx];
    const mins = live ? Math.round(8 + rnd() * 40) : Math.round(kwh / (dc ? 0.9 : 0.25));
    if (!live) t -= (20 + rnd() * 200) * 60000;
    const start = new Date(live ? now.getTime() - mins * 60000 : t);
    out.push({
      id: 'TXN-' + String(48210 - i).padStart(5, '0'),
      live, station: st.name, stationId: st.id,
      charger: CHARGERS.filter(c => c.station === st.id)[0]?.id || 'KBS-0114',
      connector: dc ? 'CCS2' : 'Type 2', dc,
      vehicle: VEHICLES[Math.floor(rnd() * VEHICLES.length)],
      driver: DRIVERS[Math.floor(rnd() * DRIVERS.length)],
      start, mins, kwh, rate,
      amount: Math.round(kwh * rate),
      peakKw: +(dc ? 40 + rnd() * 80 : 7 + rnd() * 15).toFixed(1),
      payment: ['MoMo', 'Card', 'Contract', 'MoMo', 'Wallet'][Math.floor(rnd() * 5)],
      ebm: live ? 'pending' : (rnd() > 0.07 ? 'issued' : (rnd() > 0.5 ? 'failed' : 'missing')),
      soc0: Math.round(8 + rnd() * 40), soc1: live ? null : Math.round(60 + rnd() * 38),
    });
  }
  return out;
}
const SESSIONS = mkSessions(46);

// 30-day revenue/energy series
const days = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date('2026-06-11'); d.setDate(d.getDate() - i);
  const wk = d.getDay() === 0 || d.getDay() === 6 ? 0.72 : 1;
  const base = 2100000 + i * -12000 + Math.sin(i / 3.2) * 260000;
  const rev = Math.max(700000, Math.round(base * wk * (0.88 + rnd() * 0.24)));
  days.push({ date: d, revenue: rev, energy: Math.round(rev / 410), sessions: Math.round(rev / 16200) });
}

// 24h utilization curve (% of connectors busy), hourly
const UTIL_24H = [4,2,2,3,5,9,18,31,42,47,44,52,58,49,46,51,57,66,71,62,44,28,16,8];

const FAULTS = [
  { id: 'F-2291', time: '13:42', charger: 'KBS-0140', station: 'Remera Depot', code: 'OverCurrentFailure', vendor: 'EVB-403', sev: 'critical', state: 'open', msg: 'Output current exceeded limit on connector 1; contactor opened.' },
  { id: 'F-2290', time: '11:18', charger: 'KBS-0091', station: 'Norrsken House', code: 'GroundFailure', vendor: 'EVB-119', sev: 'critical', state: 'open', msg: 'Ground fault detected during precharge. Connector locked out.' },
  { id: 'F-2289', time: '09:51', charger: 'KBS-0141', station: 'Remera Depot', code: 'CommunicationError', vendor: 'NET-7', sev: 'warning', state: 'open', msg: 'Heartbeat missed ×12 — charger marked offline.' },
  { id: 'F-2284', time: 'Yesterday', charger: 'KBS-0090', station: 'Norrsken House', code: 'ConnectorLockFailure', vendor: 'EVB-201', sev: 'warning', state: 'resolved', msg: 'Connector lock retry succeeded after remote reset.' },
  { id: 'F-2280', time: 'Jun 9', charger: 'KBS-0202', station: 'Special Economic Zone', code: 'PowerMeterFailure', vendor: 'MTR-55', sev: 'warning', state: 'resolved', msg: 'Meter readings stale; recovered after firmware reboot.' },
];

const TARIFFS = [
  { id: 'tf-dc-std', name: 'DC Fast — Standard', applies: 'All DC chargers', currency: 'RWF', perKwh: 430, perMin: 0, idleFee: 50, status: 'active', updated: 'May 28, 2026', tou: [ { from: 0, to: 6, mult: 0.85 }, { from: 6, to: 17, mult: 1.0 }, { from: 17, to: 21, mult: 1.15 }, { from: 21, to: 24, mult: 0.9 } ] },
  { id: 'tf-ac-std', name: 'AC — Standard', applies: 'All AC chargers', currency: 'RWF', perKwh: 295, perMin: 0, idleFee: 30, status: 'active', updated: 'May 28, 2026', tou: [ { from: 0, to: 17, mult: 1.0 }, { from: 17, to: 21, mult: 1.1 }, { from: 21, to: 24, mult: 1.0 } ] },
  { id: 'tf-fleet', name: 'Fleet Contract — CityRide', applies: '3 stations · contract', currency: 'RWF', perKwh: 372, perMin: 0, idleFee: 0, status: 'active', updated: 'Apr 12, 2026', tou: [ { from: 0, to: 24, mult: 1.0 } ] },
  { id: 'tf-night', name: 'Depot Night Rate', applies: 'Remera Depot · 22:00–05:00', currency: 'RWF', perKwh: 248, perMin: 0, idleFee: 0, status: 'draft', updated: 'Jun 8, 2026', tou: [ { from: 0, to: 5, mult: 1.0 }, { from: 22, to: 24, mult: 1.0 } ] },
];

const PAYOUTS = [
  { id: 'PO-1182', period: 'Jun 1 – Jun 7', gross: 14820400, fees: 296408, vat: 2262264, net: 12261728, status: 'paid', date: 'Jun 9, 2026' },
  { id: 'PO-1175', period: 'May 25 – May 31', gross: 15211800, fees: 304236, vat: 2322003, net: 12585561, status: 'paid', date: 'Jun 2, 2026' },
  { id: 'PO-1168', period: 'May 18 – May 24', gross: 13904600, fees: 278092, vat: 2122414, net: 11504094, status: 'paid', date: 'May 26, 2026' },
  { id: 'PO-1190', period: 'Jun 8 – Jun 14', gross: 8412300, fees: 168246, vat: 1284095, net: 6959959, status: 'accruing', date: '—' },
];

const TEAM = [
  { id: 'u1', name: 'Aline Uwase', email: 'aline@volcanoesmobility.rw', role: 'Owner', last: 'now', status: 'active' },
  { id: 'u2', name: 'Eric Niyonzima', email: 'eric@volcanoesmobility.rw', role: 'Admin', last: '2h ago', status: 'active' },
  { id: 'u3', name: 'Chantal Ingabire', email: 'chantal@volcanoesmobility.rw', role: 'Finance', last: '1d ago', status: 'active' },
  { id: 'u4', name: 'Patrick Habimana', email: 'patrick@volcanoesmobility.rw', role: 'Operator', last: '4h ago', status: 'active' },
  { id: 'u5', name: 'Sandrine Mukamana', email: 'sandrine@volcanoesmobility.rw', role: 'Operator', last: '20m ago', status: 'active' },
  { id: 'u6', name: 'Didier Nshuti', email: 'didier@volcanoesmobility.rw', role: 'Operator', last: '—', status: 'invited' },
];

const OPERATORS = ['P. Habimana', 'S. Mukamana', 'D. Nshuti', 'F. Umutoni', 'J. Bizimana'];
const SHIFT_DAYS = ['Mon 8', 'Tue 9', 'Wed 10', 'Thu 11', 'Fri 12', 'Sat 13', 'Sun 14'];
// grid[operator][day] = { type: 'AM'|'PM'|null, station }
const SHIFTS = OPERATORS.map((op, oi) => SHIFT_DAYS.map((d, di) => {
  const r = (oi * 7 + di) % 5;
  if ((oi === 2 && di > 4) || (oi === 4 && di < 2)) return null;
  const type = r < 2 ? 'AM' : r < 4 ? 'PM' : null;
  return type ? { type, station: STATIONS[(oi + di) % 5].name } : null;
}));

const SWAPS = [
  { id: 'sw-44', from: 'S. Mukamana', to: 'F. Umutoni', day: 'Thu 11 · PM', station: 'Kigali Heights', state: 'pending' },
  { id: 'sw-43', from: 'P. Habimana', to: 'D. Nshuti', day: 'Sat 13 · AM', station: 'Special Economic Zone', state: 'pending' },
];

const EBM_SUMMARY = { issued: 1841, failed: 7, missing: 4, pendingSync: 2, lastSync: '14:20', vsdc: 'connected' };
const EBM_ROWS = SESSIONS.filter(s => !s.live).slice(0, 18).map((s, i) => ({
  receipt: s.ebm === 'issued' ? 'EBM-' + (99120 - i) : '—',
  session: s.id, station: s.station, amount: s.amount, vat: Math.round(s.amount * 0.18 / 1.18),
  time: s.start, status: s.ebm,
  reason: s.ebm === 'failed' ? ['VSDC timeout', 'Invalid item code', 'VSDC timeout'][i % 3] : s.ebm === 'missing' ? 'Session closed offline' : null,
}));

window.KC_DATA = { ORGS, STATIONS, CHARGERS, SESSIONS, DAYS: days, UTIL_24H, FAULTS, TARIFFS, PAYOUTS, TEAM, OPERATORS, SHIFT_DAYS, SHIFTS, SWAPS, EBM_SUMMARY, EBM_ROWS };

// formatters
window.fmtRWF = n => 'RWF ' + Math.round(n).toLocaleString('en-US');
window.fmtRWFc = n => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n));
window.fmtKwh = n => n.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kWh';
window.fmtTime = d => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
window.fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
})();
