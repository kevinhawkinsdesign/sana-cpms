import { NextRequest } from 'next/server';
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

export function issueTokens(user: AnyObj) {
  const payload = { uid: user.id, role: user.role, iat: Date.now() };
  const accessToken = `demo_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  const refreshToken = `demo_refresh_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return { accessToken, refreshToken, expiresIn: 3600 };
}

export function userFromToken(token?: string | null): AnyObj | undefined {
  if (!token) return undefined;
  const raw = token.replace(/^demo_(refresh_)?/, '');
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
    return findUser(payload.uid);
  } catch {
    return undefined;
  }
}

export function currentUser(request: NextRequest): AnyObj {
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
