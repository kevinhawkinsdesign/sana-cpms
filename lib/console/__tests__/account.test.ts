import { fmtSessionTime } from '@/lib/console/account';

describe('fmtSessionTime', () => {
  it('renders an absolute date-time for a valid ISO string', () => {
    const out = fmtSessionTime('2026-06-25T10:07:00Z');
    expect(out).not.toBe('—');
    // Year is locale-stable even when the exact day/time shifts with the runner's TZ.
    expect(out).toContain('2026');
  });

  it('handles missing / invalid timestamps', () => {
    expect(fmtSessionTime(null)).toBe('—');
    expect(fmtSessionTime(undefined)).toBe('—');
    expect(fmtSessionTime('not-a-date')).toBe('—');
  });
});
