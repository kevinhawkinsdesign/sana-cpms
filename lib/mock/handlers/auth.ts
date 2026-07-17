import { Route, RouteCtx } from '../matcher';
import { ok, fail } from '../respond';
import { resolvePersona, issueTokens, userFromToken, publicUser, isPlatformAdmin } from '../auth';
import { db, findUser, demoPersonaIds } from '../db';
import { rolePermissions } from '../roles';

function tokenUser(ctx: RouteCtx) {
  const auth = (ctx.request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return userFromToken(auth) || findUser(demoPersonaIds.admin)!;
}

function loginResponse(identifier?: string) {
  const persona = resolvePersona(identifier);
  const tokens = issueTokens(persona);
  return ok({ user: publicUser(persona), ...tokens }, 'Login successful');
}

export const authRoutes: Route[] = [
  { method: 'POST', pattern: '/api/auth/login/password', handler: (ctx) => loginResponse(ctx.body?.email) },
  {
    method: 'POST',
    pattern: '/api/auth/login/email',
    handler: (ctx) => ok({ maskedEmail: maskEmail(ctx.body?.email) }, 'Login code sent'),
  },
  {
    method: 'POST',
    pattern: '/api/auth/login/phone',
    handler: (ctx) => ok({ maskedPhone: maskPhone(ctx.body?.phone) }, 'Login code sent'),
  },
  { method: 'POST', pattern: '/api/auth/login/google', handler: () => loginResponse('customer') },
  {
    method: 'POST',
    pattern: '/api/auth/verify-code',
    handler: (ctx) => loginResponse(ctx.body?.email || ctx.body?.phone),
  },
  {
    method: 'POST',
    pattern: '/api/auth/register',
    handler: (ctx) => {
      const persona = resolvePersona(ctx.body?.email || ctx.body?.phone || 'customer');
      const tokens = issueTokens(persona);
      return ok({ user: publicUser(persona), ...tokens }, 'Registration successful');
    },
  },
  {
    method: 'POST',
    pattern: '/api/auth/verify-registration-code',
    handler: (ctx) => ok({ user: publicUser(resolvePersona(ctx.body?.email)) }, 'Account verified successfully'),
  },
  {
    method: 'POST',
    pattern: '/api/auth/refresh-token',
    handler: (ctx) => {
      const user = userFromToken(ctx.body?.refreshToken) || findUser(demoPersonaIds.admin)!;
      return ok(issueTokens(user), 'Token refreshed');
    },
  },
  { method: 'POST', pattern: '/api/auth/logout', handler: () => ok({}, 'Logged out') },
  { method: 'POST', pattern: '/api/auth/logout-all', handler: () => ok({}, 'Logged out from all devices') },
  {
    method: 'POST',
    pattern: '/api/auth/forgot-password',
    handler: (ctx) => ok({ maskedEmail: maskEmail(ctx.body?.email) }, 'Password reset code sent'),
  },
  { method: 'POST', pattern: '/api/auth/reset-password', handler: () => ok({}, 'Password reset successfully') },
  { method: 'GET', pattern: '/api/auth/me', handler: (ctx) => ok({ user: publicUser(tokenUser(ctx)) }) },
  {
    method: 'GET',
    pattern: '/api/auth/orgs',
    handler: (ctx) => {
      const user = tokenUser(ctx);
      const platformAdmin = isPlatformAdmin(user) || user.role === 'ORGANIZATION_ADMIN';
      const orgs = db.organizations.map((o) => ({
        id: o.id, name: o.name, slug: o.id.replace('org_', ''), logo: o.logo,
        plan: 'GROWTH', parentOrgId: null, role: platformAdmin ? 'ORG_ADMIN' : 'OPERATOR',
      }));
      const activeOrgId = user.organizationId || orgs[0]?.id || null;
      const activeRole = platformAdmin ? 'ORG_ADMIN' : 'OPERATOR';
      return ok({
        orgs, activeOrgId, isPlatformAdmin: platformAdmin,
        // Platform admins bypass hasPerm() entirely (see lib/console/orgs.ts),
        // so `permissions: null` there is intentional — only non-admin personas
        // (the Operator demo login) actually get gated by this list, and it
        // must use the same perm-key vocabulary nav.ts declares.
        permissions: platformAdmin ? null : rolePermissions(activeRole),
        activeOrg: activeOrgId ? { id: activeOrgId, role: activeRole } : null,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/auth/switch-org',
    handler: (ctx) => {
      const user = tokenUser(ctx);
      const org = db.organizations.find((o) => o.id === ctx.body?.orgId) || db.organizations[0];
      const tokens = issueTokens(user);
      return ok({
        organization: { id: org.id, name: org.name, slug: org.id.replace('org_', ''), role: 'ORG_ADMIN' },
        permissions: null,
        ...tokens,
      });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/user/profile',
    handler: (ctx) => {
      const user = tokenUser(ctx);
      Object.assign(user, ctx.body);
      user.updatedAt = new Date().toISOString();
      return ok({ user: publicUser(user) }, 'Profile updated successfully');
    },
  },
];

function maskEmail(email?: string) {
  if (!email || !email.includes('@')) return 'd***@example.com';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone?: string) {
  if (!phone) return '07*******01';
  return phone.slice(0, 2) + '*'.repeat(Math.max(0, phone.length - 4)) + phone.slice(-2);
}

export { tokenUser };
