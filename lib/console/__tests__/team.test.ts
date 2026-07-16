import { inviteExpiryLabel, roleLabel } from '@/lib/console/team';

describe('inviteExpiryLabel (KAB-134)', () => {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 60_000).toISOString();

  it('renders a multi-day relative expiry', () => {
    expect(inviteExpiryLabel(inDays(5))).toBe('expires in 5 days');
  });

  it('uses the singular for exactly one day', () => {
    expect(inviteExpiryLabel(inDays(1))).toBe('expires in 1 day');
  });

  it('says "expires today" within the last 24h', () => {
    expect(inviteExpiryLabel(new Date(Date.now() + 3 * 3_600_000).toISOString())).toBe('expires today');
  });

  it('says "expired" once past the expiry', () => {
    expect(inviteExpiryLabel(new Date(Date.now() - 60_000).toISOString())).toBe('expired');
  });

  it('handles missing / invalid dates', () => {
    expect(inviteExpiryLabel(null)).toBe('—');
    expect(inviteExpiryLabel('not-a-date')).toBe('—');
  });
});

describe('roleLabel', () => {
  it('maps known roles to their display labels', () => {
    expect(roleLabel('ORG_OWNER')).toBe('Owner');
    expect(roleLabel('FINANCE')).toBe('Finance');
  });
});
