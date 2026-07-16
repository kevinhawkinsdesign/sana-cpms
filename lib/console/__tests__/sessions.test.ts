import { fitDomain, metricPoints, type PowerCurvePoint } from '@/lib/console/sessions';

const pt = (t: string, over: Partial<PowerCurvePoint> = {}): PowerCurvePoint => ({
  t,
  powerKw: null,
  energyKwh: null,
  soc: null,
  voltageV: null,
  currentA: null,
  ...over,
});

describe('metricPoints (KAB-118)', () => {
  it('extracts the picked metric vs. elapsed seconds and skips null samples', () => {
    const points = [
      pt('2026-06-12T09:00:00Z', { voltageV: 610 }),
      pt('2026-06-12T09:01:00Z', { voltageV: null }), // no voltage reading here
      pt('2026-06-12T09:02:30Z', { voltageV: 612 }),
    ];
    // null sample dropped; elapsed measured from the first *present* sample
    expect(metricPoints(points, (p) => p.voltageV)).toEqual([
      { elapsedSec: 0, t: '2026-06-12T09:00:00Z', value: 610 },
      { elapsedSec: 150, t: '2026-06-12T09:02:30Z', value: 612 },
    ]);
  });

  it('returns an empty array when the metric is never reported', () => {
    const points = [pt('2026-06-12T09:00:00Z', { powerKw: 10 })];
    expect(metricPoints(points, (p) => p.currentA)).toEqual([]);
  });

  it('starts elapsed time at the first point that has the metric', () => {
    const points = [
      pt('2026-06-12T09:00:00Z', { soc: null }), // skipped — no soc yet
      pt('2026-06-12T09:05:00Z', { soc: 30 }),
      pt('2026-06-12T09:10:00Z', { soc: 45 }),
    ];
    const out = metricPoints(points, (p) => p.soc);
    expect(out[0].elapsedSec).toBe(0);
    expect(out[1].elapsedSec).toBe(300);
  });
});

describe('fitDomain (KAB-118)', () => {
  it('returns undefined for empty data (chart keeps its 0-baseline default)', () => {
    expect(fitDomain([])).toBeUndefined();
  });

  it('pads a normal range so the line is not squashed against the edges', () => {
    const d = fitDomain([605, 615], 0.05);
    expect(d).toEqual({ yMin: 605 - 0.5, yMax: 615 + 0.5 });
  });

  it('widens a flat series by ±1 to avoid a zero-height domain', () => {
    expect(fitDomain([7, 7])).toEqual({ yMin: 6, yMax: 8 });
  });

  it('never returns a negative floor for a non-negative series (energy at 0)', () => {
    // energy/power starting at 0 must not render a negative Y-axis
    expect(fitDomain([0, 8, 16])).toEqual({ yMin: 0, yMax: 16.8 });
    expect(fitDomain([0, 0])).toEqual({ yMin: 0, yMax: 1 });
  });

  it('keeps a high-baseline series zoomed (does not clamp to 0)', () => {
    const d = fitDomain([10524, 10541]);
    // the whole point of fitDomain — a far-from-zero signal stays zoomed in
    expect(d!.yMin).toBeGreaterThan(10000);
  });
});
