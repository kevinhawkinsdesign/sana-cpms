'use client';

/** Console Team data layer (FE-10 / KAB-115) over SAAS-TEAM:
 *    GET    /api/orgs/:id/members
 *    POST   /api/orgs/:id/members/invite        { email, role }
 *    PATCH  /api/orgs/:id/members/:userId        { role }
 *    DELETE /api/orgs/:id/members/:userId
 *    GET    /api/orgs/:id/invitations
 *    DELETE /api/orgs/:id/invitations/:invId
 *  Axios wrapper: payload at res.data.data; mutations invalidate the lists. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api/api';
import type { BadgeKind } from '@/components/console/ui';
import type { AuthTokens, User as AuthUser } from '@/lib/auth/authContext';

export type OrgRole = 'ORG_OWNER' | 'ORG_ADMIN' | 'FINANCE' | 'OPERATOR' | 'VIEWER';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED';

export interface OrgMember {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: OrgRole;
  status: MemberStatus;
  joinedAt: string;
  lastActive: string | null;
  /** True when the member has a per-member permission override (access reduced
   *  or customized away from their role default). Optional: populated by the
   *  members API; the UI shows a "custom access" hint when present. */
  hasCustomAccess?: boolean;
}

/** Surface the backend's message (guard/permission text) on a failed mutation.
 *  api(false, false) rejects with an Error whose message is the server message. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

export const ROLE_OPTIONS: Array<{ value: OrgRole; label: string }> = [
  { value: 'ORG_OWNER', label: 'Owner' },
  { value: 'ORG_ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function roleLabel(role: OrgRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

/** Relative expiry label for a pending invite: "expires in 5 days" / "expires
 *  today" / "expired" (KAB-134). */
export function inviteExpiryLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'expires today';
  return `expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function roleBadgeKind(role: OrgRole): BadgeKind {
  switch (role) {
    case 'ORG_OWNER':
      return 'charge';
    case 'ORG_ADMIN':
      return 'info';
    case 'FINANCE':
      return 'ok';
    default:
      return 'neutral';
  }
}

export function useOrgMembers(orgId: string | null | undefined) {
  return useQuery<{ members: OrgMember[] }>({
    queryKey: ['console', 'members', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/members`);
      return res.data.data as { members: OrgMember[] };
    },
    staleTime: 30_000,
  });
}

export function useOrgInvitations(orgId: string | null | undefined) {
  return useQuery<{ invitations: OrgInvitation[] }>({
    queryKey: ['console', 'invitations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/invitations`);
      return res.data.data as { invitations: OrgInvitation[] };
    },
    staleTime: 30_000,
  });
}

/** Shared invalidation for any team mutation. */
function useTeamInvalidate(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['console', 'members', orgId] });
    qc.invalidateQueries({ queryKey: ['console', 'invitations', orgId] });
  };
}

export function useInviteMember(orgId: string | null | undefined) {
  const invalidate = useTeamInvalidate(orgId);
  return useMutation({
    mutationFn: async (vars: { email: string; role: OrgRole }) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/members/invite`, vars);
      return res.data.data;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast.success(`Invitation sent to ${vars.email}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't send the invitation"), { duration: Infinity }),
  });
}

export function useUpdateMemberRole(orgId: string | null | undefined) {
  const invalidate = useTeamInvalidate(orgId);
  return useMutation({
    mutationFn: async (vars: { userId: string; role: OrgRole }) => {
      await api(false, false).patch(`/api/orgs/${orgId}/members/${vars.userId}`, { role: vars.role });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Role updated');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't update the role"), { duration: Infinity }),
  });
}

export function useRemoveMember(orgId: string | null | undefined) {
  const invalidate = useTeamInvalidate(orgId);
  return useMutation({
    mutationFn: async (userId: string) => {
      await api(false, false).delete(`/api/orgs/${orgId}/members/${userId}`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Member removed');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't remove the member"), { duration: Infinity }),
  });
}

export function useRevokeInvitation(orgId: string | null | undefined) {
  const invalidate = useTeamInvalidate(orgId);
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api(false, false).delete(`/api/orgs/${orgId}/invitations/${invitationId}`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Invitation revoked');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't revoke the invitation"), { duration: Infinity }),
  });
}

export function useResendInvitation(orgId: string | null | undefined) {
  const invalidate = useTeamInvalidate(orgId);
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api(false, false).post(`/api/orgs/${orgId}/invitations/${invitationId}/resend`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Invitation resent');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't resend the invitation"), { duration: Infinity }),
  });
}

/** POST /api/auth/invitations/accept — token-based accept (caller must be
 *  logged in; their email must match the invite). Returns the joined org id. */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api(false, false).post('/api/auth/invitations/accept', { token });
      return res.data.data as { orgId: string };
    },
  });
}

// ---- KAB-132/133: public invitation preview + signup-with-token ----

export type InvitationPreviewStatus = 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | 'INVALID';

export interface InvitationPreview {
  status: InvitationPreviewStatus;
  /** org/role/email/expiresAt are only populated for a PENDING invite. */
  orgName: string | null;
  role: OrgRole | null;
  email: string | null;
  expiresAt: string | null;
  /** True when a user already exists for the invite email (login vs signup). */
  hasAccount: boolean;
}

/** GET /api/orgs/invitations/preview?token= — public (no auth). Drives the
 *  invite accept page's login-vs-signup branch. */
export function usePreviewInvitation(token: string | null) {
  return useQuery<InvitationPreview>({
    queryKey: ['invite-preview', token],
    enabled: !!token,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api(false, false).get('/api/orgs/invitations/preview', { params: { token } });
      return res.data.data as InvitationPreview;
    },
  });
}

export interface InviteSignupResult {
  /** Full session minted by verify — adopt via applyExternalSession. */
  user: AuthUser;
  tokens: AuthTokens;
  invite?: { joined: boolean; orgId?: string; warning?: string };
}

/** Step 1 of signup-with-token: create the (email-code) account, carrying the
 *  invite token so the org auto-joins once the code is verified. */
export async function registerWithInvite(vars: {
  email: string;
  firstName?: string;
  lastName?: string;
  inviteToken: string;
}): Promise<void> {
  await api(false, false).post('/api/auth/register', { authMethod: 'EMAIL_CODE', ...vars });
}

/** Step 2: verify the emailed code. On success the user is verified, auto-joined
 *  to the invited org, and issued tokens (with the new org as the active claim). */
export async function verifyInviteSignup(vars: {
  email: string;
  code: string;
  inviteToken: string;
}): Promise<InviteSignupResult> {
  const res = await api(false, false).post('/api/auth/verify-registration-code', {
    loginMethod: 'EMAIL_CODE',
    code: vars.code,
    email: vars.email,
    inviteToken: vars.inviteToken,
  });
  const d = res.data.data;
  return {
    user: d.user as AuthUser,
    tokens: { accessToken: d.accessToken, refreshToken: d.refreshToken, expiresIn: d.expiresIn },
    invite: d.invite,
  };
}

// ---- KAB-126 roles & permissions surface (read-only) ----

export interface RoleCatalogEntry {
  role: OrgRole;
  label: string;
  description: string;
  permissions: string[];
  /** False for ORG_OWNER (fixed). */
  editable: boolean;
  /** True when this org overrode the role away from its default. */
  customized: boolean;
}

export interface PermissionCatalogEntry {
  key: string;
  label: string;
  group: string;
  /** Owner-only perms can never be granted to another role. */
  ownerOnly: boolean;
}

export interface PermissionGroupEntry {
  key: string;
  label: string;
  permissions: string[];
}

export interface RolesAndPermissions {
  roles: RoleCatalogEntry[];
  permissions: PermissionCatalogEntry[];
  groups: PermissionGroupEntry[];
}

/** GET /api/orgs/:id/roles — the fixed role catalog (read-only reference): each
 *  role's permissions + labels/groups, so the UI can explain what a role grants.
 *  Role permission sets are fixed defaults and can't be edited per org. */
export function useOrgRoles(orgId: string | null | undefined) {
  return useQuery<RolesAndPermissions>({
    queryKey: ['console', 'roles', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/roles`);
      return res.data.data as RolesAndPermissions;
    },
    staleTime: 5 * 60_000, // role definitions rarely change
  });
}

/** Map a permission key → its human label, for the role-grant explanation. */
export function permissionLabel(catalog: RolesAndPermissions | undefined, key: string): string {
  return catalog?.permissions.find((p) => p.key === key)?.label ?? key;
}

// Role permission sets are fixed defaults — there is no role-edit endpoint.
// Per-member access (below) is the only lever, and it can only reduce access.

// ---- KAB-126 per-member access override ----

export interface MemberPermissions {
  userId: string;
  role: OrgRole;
  status: string;
  permissions: string[];
  /** True when the member has a per-member override (vs following their role). */
  customized: boolean;
  /** False for ORG_OWNER. */
  editable: boolean;
}

/** GET /api/orgs/:id/members/:userId/permissions — a member's effective access. */
export function useMemberPermissions(orgId: string | null | undefined, userId: string | null | undefined) {
  return useQuery<MemberPermissions>({
    queryKey: ['console', 'member-perms', orgId, userId],
    enabled: !!orgId && !!userId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/members/${userId}/permissions`);
      return res.data.data as MemberPermissions;
    },
    staleTime: 30_000,
  });
}

/** PATCH /api/orgs/:id/members/:userId/permissions — override (or `null` to
 *  clear) a single member's access. */
export function useUpdateMemberPermissions(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; permissions: string[] | null }) => {
      const res = await api(false, false).patch(
        `/api/orgs/${orgId}/members/${vars.userId}/permissions`,
        { permissions: vars.permissions },
      );
      return res.data.data as MemberPermissions;
    },
    onSuccess: (data) => {
      qc.setQueryData(['console', 'member-perms', orgId, data.userId], data);
      qc.invalidateQueries({ queryKey: ['console', 'members', orgId] });
      // the edited member may be the caller → refresh their own perms/nav
      qc.invalidateQueries({ queryKey: ['console', 'orgs'] });
      toast.success(data.customized ? 'Member access updated' : 'Member access reset to role default');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't update member access"), { duration: Infinity }),
  });
}
