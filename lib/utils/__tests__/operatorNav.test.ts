import { sessionHomeHref, sessionsListHref } from '@/lib/utils/operatorNav';

describe('operatorNav redirect targets', () => {
  it('defaults to the dashboard base', () => {
    expect(sessionHomeHref()).toBe('/dashboard');
    expect(sessionsListHref()).toBe('/dashboard/charge/sessions');
  });

  it('keeps the dashboard sessions list for the dashboard base', () => {
    expect(sessionHomeHref('/dashboard')).toBe('/dashboard');
    expect(sessionsListHref('/dashboard')).toBe('/dashboard/charge/sessions');
  });

  it('routes the console operator base back to its own surface', () => {
    expect(sessionHomeHref('/console/me')).toBe('/console/me');
    expect(sessionsListHref('/console/me')).toBe('/console/me');
  });
});
