import { stationPowerPoints, type StationPower } from '@/lib/console/stations';

const base = (over: Partial<StationPower> = {}): StationPower => ({
  chargerId: 'c1',
  chargerName: 'Charger 1',
  window: '6h',
  from: '2026-06-18T06:00:00Z',
  to: '2026-06-18T12:00:00Z',
  bucketMs: 180_000,
  connectors: ['st_1:1'],
  points: [],
  latestKw: null,
  peakKw: null,
  hasTelemetry: false,
  linked: true,
  degraded: false,
  ...over,
});

describe('stationPowerPoints (KAB-131)', () => {
  it('maps the curve to elapsed-time telemetry points from the window start', () => {
    const data = base({
      hasTelemetry: true,
      points: [
        { t: '2026-06-18T06:00:00Z', powerKw: 0, byConnector: {} },
        { t: '2026-06-18T06:03:00Z', powerKw: 22.5, byConnector: { 'st_1:1': 22.5 } },
        { t: '2026-06-18T06:06:00Z', powerKw: 41.7, byConnector: { 'st_1:1': 41.7 } },
      ],
    });
    expect(stationPowerPoints(data)).toEqual([
      { elapsedSec: 0, t: '2026-06-18T06:00:00Z', value: 0 },
      { elapsedSec: 180, t: '2026-06-18T06:03:00Z', value: 22.5 },
      { elapsedSec: 360, t: '2026-06-18T06:06:00Z', value: 41.7 },
    ]);
  });

  it('returns [] when there is no telemetry (empty-state) — even with zero-filled points', () => {
    const data = base({
      hasTelemetry: false,
      points: [{ t: '2026-06-18T06:00:00Z', powerKw: 0, byConnector: {} }],
    });
    expect(stationPowerPoints(data)).toEqual([]);
  });

  it('returns [] for undefined / degraded data', () => {
    expect(stationPowerPoints(undefined)).toEqual([]);
    expect(stationPowerPoints(base({ degraded: true, hasTelemetry: false }))).toEqual([]);
  });

  it('returns [] when the window start is an invalid date (avoids NaN axis)', () => {
    const data = base({
      hasTelemetry: true,
      from: 'not-a-date',
      points: [{ t: '2026-06-18T06:00:00Z', powerKw: 10, byConnector: {} }],
    });
    expect(stationPowerPoints(data)).toEqual([]);
  });

  it('skips points with an invalid timestamp', () => {
    const data = base({
      hasTelemetry: true,
      points: [
        { t: '2026-06-18T06:00:00Z', powerKw: 5, byConnector: {} },
        { t: 'bad', powerKw: 9, byConnector: {} },
        { t: '2026-06-18T06:03:00Z', powerKw: 7, byConnector: {} },
      ],
    });
    expect(stationPowerPoints(data)).toEqual([
      { elapsedSec: 0, t: '2026-06-18T06:00:00Z', value: 5 },
      { elapsedSec: 180, t: '2026-06-18T06:03:00Z', value: 7 },
    ]);
  });
});
