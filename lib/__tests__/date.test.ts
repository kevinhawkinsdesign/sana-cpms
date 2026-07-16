/** KAB-180: localDateToISO must preserve the selected local day (no UTC
 *  off-by-one). Timezone-independent — we read back with local getters. */
import { localDateToISO } from '../date';

describe('localDateToISO', () => {
  it('keeps the selected local calendar day', () => {
    const d = new Date(localDateToISO('2026-03-15'));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 15]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('endOfDay lands on the inclusive end of that local day', () => {
    const d = new Date(localDateToISO('2026-03-15', true));
    expect(d.getDate()).toBe(15);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([23, 59, 59]);
  });
});
