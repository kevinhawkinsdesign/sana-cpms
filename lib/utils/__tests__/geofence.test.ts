import { matchChargerFromList, shiftChargerCoords, type Charger } from '@/lib/utils/geofence';

const list: Charger[] = [
  { id: 'c1', kabisaId: 'KAB-1', name: 'Kigali Hub', latitude: -1.95, longitude: 30.06 },
  { id: 'c2', kabisaId: 'KAB-2', name: 'Musanze', latitude: '-1.50', longitude: '29.63' },
  { id: 'c3', name: 'No Coords' },
];

describe('matchChargerFromList', () => {
  it('matches by embedded kabisaId and reads coords', () => {
    const { matched, coords } = matchChargerFromList({ charger: { kabisaId: 'KAB-1' } }, list);
    expect(matched?.id).toBe('c1');
    expect(coords).toEqual({ lat: -1.95, lng: 30.06 });
  });

  it('falls back to embedded id', () => {
    const { matched } = matchChargerFromList({ charger: { id: 'c2' } }, list);
    expect(matched?.id).toBe('c2');
  });

  it('coerces string coordinates', () => {
    const { coords } = matchChargerFromList({ charger: { id: 'c2' } }, list);
    expect(coords).toEqual({ lat: -1.5, lng: 29.63 });
  });

  it('falls back to shift.chargerId then name', () => {
    expect(matchChargerFromList({ chargerId: 'c1' }, list).matched?.id).toBe('c1');
    expect(matchChargerFromList({ charger: { name: 'Musanze' } }, list).matched?.id).toBe('c2');
  });

  it('returns null match when nothing fits', () => {
    expect(matchChargerFromList({ charger: { kabisaId: 'NOPE' } }, list)).toEqual({ matched: null, coords: null });
  });

  it('matches but yields null coords when the charger has none', () => {
    const { matched, coords } = matchChargerFromList({ charger: { id: 'c3' } }, list);
    expect(matched?.id).toBe('c3');
    expect(coords).toBeNull();
  });

  it('handles a missing shift', () => {
    expect(matchChargerFromList(undefined, list)).toEqual({ matched: null, coords: null });
  });

  it('does not throw on a numeric kabisaId / name (coerces before trim)', () => {
    const numericList: Charger[] = [{ id: 'c9', kabisaId: 1 as unknown as string, name: 42 as unknown as string }];
    expect(() => matchChargerFromList({ charger: { kabisaId: 1 } }, numericList)).not.toThrow();
    expect(matchChargerFromList({ charger: { kabisaId: 1 } }, numericList).matched?.id).toBe('c9');
    expect(matchChargerFromList({ charger: { name: 42 } }, numericList).matched?.id).toBe('c9');
  });
});

describe('shiftChargerCoords', () => {
  it('reads embedded numeric and string coordinates', () => {
    expect(shiftChargerCoords({ charger: { latitude: -1.95, longitude: 30.06 } })).toEqual({ lat: -1.95, lng: 30.06 });
    expect(shiftChargerCoords({ charger: { latitude: '-1.5', longitude: '29.63' } })).toEqual({ lat: -1.5, lng: 29.63 });
  });

  it('returns null without a charger or coordinates', () => {
    expect(shiftChargerCoords(undefined)).toBeNull();
    expect(shiftChargerCoords({ charger: {} })).toBeNull();
  });
});
