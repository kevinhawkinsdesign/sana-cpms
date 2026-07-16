/**
 * KAB-173: the users directory's status filter. getAllUsers returns only
 * isActive accounts, so blocked users MUST come from the separate blocked
 * list — the regression this guards is "block a user → they vanish and
 * Unblock is unreachable".
 * KAB-177: Active is server-filtered; the Blocked/All views still filter
 * client-side via filterUsers (org matched by id, mirroring the server param).
 */
import { entityOptions, usersForStatus, filterUsers, type User } from '../platformAdmin';

const active = [{ id: 'a1', isActive: true }, { id: 'a2', isActive: true }] as User[];
const blocked = [{ id: 'b1', isActive: false }] as User[];

describe('usersForStatus (KAB-173)', () => {
  it('defaults to the active directory', () => {
    expect(usersForStatus('Active', active, blocked).map((u) => u.id)).toEqual(['a1', 'a2']);
  });

  it('Blocked shows ONLY the blocked list — the fix for unreachable Unblock', () => {
    expect(usersForStatus('Blocked', active, blocked).map((u) => u.id)).toEqual(['b1']);
  });

  it('All merges both sets', () => {
    expect(usersForStatus('All', active, blocked).map((u) => u.id)).toEqual(['a1', 'a2', 'b1']);
  });

  it('tolerates either list still loading', () => {
    expect(usersForStatus('All', undefined, blocked).map((u) => u.id)).toEqual(['b1']);
    expect(usersForStatus('Blocked', active, undefined)).toEqual([]);
  });
});

describe('filterUsers (Blocked/All client filter — KAB-177)', () => {
  const users = [
    { id: 'u1', firstName: 'Ann', role: 'CUSTOMER', organizations: [{ id: 'org-a', name: 'Acme' }] },
    { id: 'u2', firstName: 'Bob', role: 'OPERATOR', organizations: [{ id: 'org-b', name: 'Beta' }] },
    { id: 'u3', firstName: 'Cyd', role: 'CUSTOMER', organizations: [] },
  ] as unknown as User[];

  it('filters by role', () => {
    expect(filterUsers(users, '', 'OPERATOR', '').map((u) => u.id)).toEqual(['u2']);
  });

  it('filters organization by id (not name)', () => {
    expect(filterUsers(users, '', '', 'org-a').map((u) => u.id)).toEqual(['u1']);
    expect(filterUsers(users, '', '', 'missing')).toEqual([]);
  });

  it('search matches name and org name', () => {
    expect(filterUsers(users, 'beta', '', '').map((u) => u.id)).toEqual(['u2']);
    expect(filterUsers(users, 'cyd', '', '').map((u) => u.id)).toEqual(['u3']);
  });

  it('combines role + org + search (AND)', () => {
    expect(filterUsers(users, 'ann', 'CUSTOMER', 'org-a').map((u) => u.id)).toEqual(['u1']);
    expect(filterUsers(users, 'ann', 'OPERATOR', '')).toEqual([]);
  });
});

describe('entityOptions (id-backed name selects)', () => {
  const items = [
    { id: 'aaaaaaaa-1111', name: 'KABISA' },
    { id: 'bbbbbbbb-2222', name: 'EVP' },
  ];

  it('maps labels back to ids and the none label to null', () => {
    const sel = entityOptions(items, 'None');
    expect(sel.labels).toEqual(['None', 'KABISA', 'EVP']);
    expect(sel.idFor('EVP')).toBe('bbbbbbbb-2222');
    expect(sel.idFor('None')).toBeNull();
    expect(sel.labelFor('KABISA')).toBe('KABISA');
    expect(sel.labelFor(null)).toBe('None');
  });

  it('disambiguates duplicate names with an id suffix so idFor never picks the wrong entity', () => {
    const dupes = [
      { id: 'aaaaaaaa-1111', name: 'Acme' },
      { id: 'bbbbbbbb-2222', name: 'Acme' },
    ];
    const sel = entityOptions(dupes, 'None');
    expect(sel.labels).toEqual(['None', 'Acme (aaaaaaaa)', 'Acme (bbbbbbbb)']);
    expect(sel.idFor('Acme (bbbbbbbb)')).toBe('bbbbbbbb-2222');
    expect(sel.idFor('Acme')).toBeNull();
  });

  it('labelForId resolves the exact entity even with duplicate names (edit prefill)', () => {
    const dupes = [
      { id: 'aaaaaaaa-1111', name: 'Acme' },
      { id: 'bbbbbbbb-2222', name: 'Acme' },
    ];
    const sel = entityOptions(dupes, 'None');
    expect(sel.labelForId('bbbbbbbb-2222')).toBe('Acme (bbbbbbbb)');
    expect(sel.labelForId(null)).toBe('None');
    // Before the list loads (empty map) any id resolves to the none label —
    // the form re-syncs via effect once the data arrives.
    expect(entityOptions([], 'None').labelForId('aaaaaaaa-1111')).toBe('None');
  });
});
