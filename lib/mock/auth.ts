import { db, demoPersonaIds, findUser, AnyObj } from './db';

/**
 * Fake auth for the demo: no password/OTP is ever actually checked. Any
 * credentials succeed; the persona returned is picked from what was typed so
 * the demo can show every role without a real user directory. Tokens are
 * plain base64 JSON (not signed) — fine for a demo, never do this for real auth.
 */
export function resolvePersona(identifier?: string | null): AnyObj {
  const key = (identifier || '').toLowerCase();
  if (key.includes('org') || key.includes('owner')) return findUser(demoPersonaIds.orgAdmin)!;
  if (key.includes('operator') || key.includes('staff')) return findUser(demoPersonaIds.operator)!;
  if (key.includes('customer') || key.includes('fleet') || key.includes('driver')) return findUser(demoPersonaIds.customer)!;
  if (key.includes('admin')) return findUser(demoPersonaIds.admin)!;
  // Default: admin gives the richest demo (full console access).
  return findUser(demoPersonaIds.admin)!;
}

// Universal (Node + browser) base64url JSON encode/decode — `Buffer` doesn't
// exist in the browser bundle the static-export build ships, so this uses
// only Web-standard btoa/atob + TextEncoder/TextDecoder, which both runtimes
// support natively.
function encodeBase64Url(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(str: string): any {
  const binary = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function issueTokens(user: AnyObj) {
  const payload = { uid: user.id, role: user.role, iat: Date.now() };
  const accessToken = `demo_${encodeBase64Url(payload)}`;
  const refreshToken = `demo_refresh_${encodeBase64Url(payload)}`;
  return { accessToken, refreshToken, expiresIn: 3600 };
}

export function userFromToken(token?: string | null): AnyObj | undefined {
  if (!token) return undefined;
  const raw = token.replace(/^demo_(refresh_)?/, '');
  try {
    const payload = decodeBase64Url(raw);
    return findUser(payload.uid);
  } catch {
    return undefined;
  }
}

export function currentUser(request: Request): AnyObj {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return userFromToken(token) || findUser(demoPersonaIds.admin)!;
}

export function publicUser(u: AnyObj) {
  const { id, firstName, lastName, email, phone, role, userType, imageUrl, isVerified, autofillEnabled, organizationId, organization, createdAt, updatedAt } = u;
  return {
    id, firstName, lastName, email, phone, role, userType, imageUrl,
    isVerified, autofillEnabled, organizationId, organization,
    lastLoginAt: new Date().toISOString(), createdAt, updatedAt,
  };
}

export function isPlatformAdmin(u: AnyObj) {
  return u.role === 'ADMIN';
}
