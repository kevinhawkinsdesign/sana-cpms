'use client';

/** Console platform-admin data layer (KAB-163). Cross-org organization admin
 *  via the new /api/admin/platform/organizations endpoints (KAB-161), plus the
 *  global users directory. Only rendered inside the platform scope. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api/api';
import {
  getAdminUsers,
  getBlockedUsers,
  getUserDetails,
  createUserAdmin,
  updateUser,
  type GetAllUsersParams,
  type UsersPagination,
  verifyUser,
  blockUser,
  unblockUser,
  addUserOrganization,
  changeUserOrganization,
  removeUserOrganization,
  type User,
  type UserCreateData,
  type UserUpdateData,
  type OrgMembershipRole,
  type OrgMembershipStatus,
} from '@/lib/api/admin';
import { getAllCountries, createCountry, updateCountry, deleteCountry } from '@/lib/api/countries';
import { apiErrorMessage } from '@/lib/console/team';
import type { Country, CreateCountryData, UpdateCountryData } from '@/types/country';

export type { User, UserCreateData, UserUpdateData, Country, CreateCountryData, UpdateCountryData, OrgMembershipRole, OrgMembershipStatus };

/** Unwrap the backend `{ status, message, data }` envelope. The api client only
 *  rejects on HTTP >= 400, so a 200 carrying `status: 'error'` would otherwise be
 *  treated as valid data — throw here so React Query surfaces the error. */
export function unwrapEnvelope<T>(res: { data: { status?: string; message?: string; data?: T } }): T {
  if (res.data?.status === 'error') throw new Error(res.data.message || 'Request failed');
  return res.data.data as T;
}

export interface PlatformOrg {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  plan: string;
  status: string;
  parentOrgId: string | null;
  isParentOrganization: boolean;
  platformFeePercent: number | null;
  tin: string | null;
  citrineTenantId: number | null;
  createdAt: string;
  country: { id: string; name: string; code: string } | null;
  _count: { users: number; chargers: number };
}

export interface PlatformOrgDetail extends PlatformOrg {
  parentOrg: { id: string; name: string } | null;
  _count: { users: number; chargers: number; chargingSessions: number; subOrgs: number };
}

export interface PlatformOrgsPage {
  organizations: PlatformOrg[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface OrgListParams {
  page: number;
  search?: string;
  status?: string;
  plan?: string;
  limit?: number;
  parentOrgId?: string;
}

const ORG_BASE = '/api/admin/platform/organizations';

export function usePlatformOrgs(params: OrgListParams) {
  return useQuery({
    queryKey: ['console', 'platform', 'orgs', params],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(params.page) });
      if (params.search) q.set('search', params.search);
      if (params.status) q.set('status', params.status);
      if (params.plan) q.set('plan', params.plan);
      if (params.limit) q.set('limit', String(params.limit));
      if (params.parentOrgId) q.set('parentOrgId', params.parentOrgId);
      const res = await api().get(`${ORG_BASE}?${q.toString()}`);
      return unwrapEnvelope<PlatformOrgsPage>(res);
    },
    staleTime: 30_000,
  });
}

/** Every organization across all pages — for pickers that must offer all orgs.
 *  The list API caps `limit` at 100 (KAB-179 Sentry: a single-page fetch would
 *  hide orgs beyond 100), so page 1 is fetched then the rest concurrently. */
export function useAllPlatformOrgs() {
  return useQuery({
    queryKey: ['console', 'platform', 'orgs', 'all'],
    queryFn: async () => {
      const fetchPage = async (page: number) =>
        unwrapEnvelope<PlatformOrgsPage>(await api().get(`${ORG_BASE}?page=${page}&limit=100`));
      const first = await fetchPage(1);
      const totalPages = first.pagination?.totalPages ?? 1;
      if (totalPages <= 1) return first.organizations;
      // allSettled, not all: a page can 404 if orgs are deleted mid-fetch —
      // degrade to the pages we got rather than failing the whole picker.
      const rest = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
      );
      return [
        ...first.organizations,
        ...rest.flatMap((r) => (r.status === 'fulfilled' ? r.value.organizations : [])),
      ];
    },
    staleTime: 30_000,
  });
}

export function usePlatformOrg(id: string | null) {
  return useQuery({
    queryKey: ['console', 'platform', 'org', id],
    queryFn: async () => unwrapEnvelope<PlatformOrgDetail>(await api().get(`${ORG_BASE}/${id}`)),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSuspendOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) =>
      unwrapEnvelope(await api(false, false).patch(`${ORG_BASE}/${id}/suspend`, { suspend })),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success(vars.suspend ? 'Organization suspended' : 'Organization reactivated');
    },
    onError: () => toast.error("Couldn't update the organization", { duration: Infinity }),
  });
}

export function useSetPlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, platformFeePercent }: { id: string; platformFeePercent: number | null }) =>
      unwrapEnvelope(await api(false, false).patch(`${ORG_BASE}/${id}/platform-fee`, { platformFeePercent })),
    onSuccess: () => {
      // Invalidate the whole platform tree (detail + list) so the org list
      // doesn't show the stale fee for staleTime after an update.
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success('Platform fee updated');
    },
    onError: () => toast.error("Couldn't update the platform fee", { duration: Infinity }),
  });
}

/** Write payload for POST / PATCH /api/admin/platform/organizations (KAB-171).
 *  `null` clears a nullable field; omit a key to leave it untouched. */
export interface PlatformOrgInput {
  name?: string;
  countryId?: string | null;
  citrineTenantId?: number | null;
  logo?: string | null;
  tin?: string | null;
  plan?: string;
  parentOrgId?: string | null;
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PlatformOrgInput) =>
      unwrapEnvelope<PlatformOrg>(await api(false, false).post(ORG_BASE, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success('Organization created');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't create the organization"), { duration: Infinity }),
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlatformOrgInput }) =>
      unwrapEnvelope<PlatformOrg>(await api(false, false).patch(`${ORG_BASE}/${id}`, data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success('Organization updated');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't update the organization"), { duration: Infinity }),
  });
}

export function useArchiveOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrapEnvelope(await api(false, false).delete(`${ORG_BASE}/${id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success('Organization archived');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't archive the organization"), { duration: Infinity }),
  });
}

export function useSetParentFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isParentOrganization }: { id: string; isParentOrganization: boolean }) =>
      unwrapEnvelope(await api(false, false).patch(`${ORG_BASE}/${id}/parent-flag`, { isParentOrganization })),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['console', 'platform'] });
      toast.success(vars.isParentOrganization ? 'Platform-admin access granted' : 'Platform-admin access revoked');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't update platform-admin access"), { duration: Infinity }),
  });
}

export type { UsersPagination };

/** Cross-org users directory (KAB-177). With `page` the backend paginates and
 *  returns a `pagination` block; role/organizationId filter server-side. Called
 *  with no `page` (e.g. the Blocked/All merge) it returns the full active set. */
export function usePlatformUsers(params: GetAllUsersParams = {}) {
  return useQuery({
    queryKey: ['console', 'platform', 'users', 'list', params],
    queryFn: async () => (await getAdminUsers(params)).data,
    staleTime: 30_000,
    // Keep the previous page visible while the next loads (no skeleton flash).
    placeholderData: keepPreviousData,
  });
}

/** Options for a name-based Select over {id, name} entities. Labels are the
 *  names, disambiguated with a short id suffix if names ever collide (org and
 *  country names are DB-unique today, but a silent wrong-id lookup would be a
 *  data-integrity bug, so resolution goes through this map, never by name). */
export function entityOptions(items: { id: string; name: string }[], noneLabel: string): {
  labels: string[];
  idFor: (label: string) => string | null;
  labelFor: (name: string | null | undefined) => string;
  /** Exact prefill for edit forms — resolves by id, immune to duplicate names. */
  labelForId: (id: string | null | undefined) => string;
} {
  const nameCounts = new Map<string, number>();
  for (const item of items) nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);

  const idByLabel = new Map<string, string>();
  const labelByName = new Map<string, string>();
  const labelById = new Map<string, string>();
  const labels = [noneLabel];
  for (const item of items) {
    const label = (nameCounts.get(item.name) ?? 0) > 1 ? `${item.name} (${item.id.slice(0, 8)})` : item.name;
    labels.push(label);
    idByLabel.set(label, item.id);
    labelById.set(item.id, label);
    if (!labelByName.has(item.name)) labelByName.set(item.name, label);
  }
  return {
    labels,
    idFor: (label) => idByLabel.get(label) ?? null,
    labelFor: (name) => (name ? labelByName.get(name) ?? name : noneLabel),
    labelForId: (id) => (id ? labelById.get(id) ?? noneLabel : noneLabel),
  };
}

/** Rows for the users directory's status filter. Active and blocked accounts
 *  come from different endpoints (getAllUsers filters isActive), so "All" is a
 *  client-side merge — the two sets are disjoint by construction. */
export function usersForStatus(status: string, active: User[] | undefined, blocked: User[] | undefined): User[] {
  if (status === 'Blocked') return blocked ?? [];
  if (status === 'All') return [...(active ?? []), ...(blocked ?? [])];
  return active ?? [];
}

/** Display name — full name, else email/phone, else an em dash. */
export function userName(u: User): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || '—';
}

/** Sensible default org-membership role for a user's global role, used when
 *  assigning them to an organization (the admin can override). */
export function defaultOrgRoleFor(globalRole: string | undefined): OrgMembershipRole {
  switch (globalRole) {
    case 'ADMIN':
    case 'ORGANIZATION_ADMIN':
      return 'ORG_ADMIN';
    case 'OPERATOR':
      return 'OPERATOR';
    default:
      return 'VIEWER';
  }
}

/** Client-side filter for the Blocked / All views (Active filters server-side,
 *  KAB-177). Organization is matched by id, mirroring the server's
 *  organizationId param; search spans name / contact / org names. */
export function filterUsers(users: User[], search: string, role: string, orgId: string): User[] {
  let rows = users;
  if (role) rows = rows.filter((u) => u.role === role);
  if (orgId) rows = rows.filter((u) => (u.organizations ?? []).some((o) => o.id === orgId));
  const q = search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((u) =>
      [userName(u), u.email, u.phone, ...(u.organizations ?? []).map((o) => o.name)]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }
  return rows;
}

/** Blocked users live outside getAllUsers (isActive filter) — without this list
 *  a blocked user disappears from the console and Unblock is unreachable. */
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['console', 'platform', 'users', 'blocked'],
    queryFn: async () => (await getBlockedUsers()).data.users,
    staleTime: 30_000,
  });
}

/** Extras returned by GET /api/admin/users/:id on top of the directory row.
 *  Active users only — the endpoint 404s for blocked (isActive: false) users. */
export interface UserDetail extends User {
  activeSessions?: { id: string; deviceInfo: string | null; createdAt: string }[];
  businesses?: { business: { id: string; name: string; tin: string | null } }[];
  vehicles?: { vehicle: { id: string; make: string | null; model: string | null; kabisaId: string | null } }[];
  paymentMethods?: { id: string; paymentMethodType: string; isDefault: boolean }[];
  /** Org memberships (any status) — a user can belong to several orgs. */
  memberships?: { role: string; status: string; organization: { id: string; name: string } }[];
}

export function useUserDetail(id: string | null) {
  return useQuery({
    queryKey: ['console', 'platform', 'users', 'detail', id],
    queryFn: async () => (await getUserDetails(id as string)).data.user as UserDetail,
    enabled: !!id,
    staleTime: 30_000,
  });
}

// Prefix-invalidates the directory, blocked list and open detail queries.
function useUsersInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['console', 'platform', 'users'] });
}

export function useCreateUser() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: (data: UserCreateData) => createUserAdmin(data),
    onSuccess: () => { invalidate(); toast.success('User created'); },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't create the user"), { duration: Infinity }),
  });
}

export function useUpdateUser() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateData }) => updateUser(id, data),
    onSuccess: () => { invalidate(); toast.success('User updated'); },
    onError: () => toast.error("Couldn't update the user", { duration: Infinity }),
  });
}

export function useVerifyUser() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: (id: string) => verifyUser(id),
    onSuccess: () => { invalidate(); toast.success('User verified'); },
    onError: () => toast.error("Couldn't verify the user", { duration: Infinity }),
  });
}

export function useSetUserBlocked() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => (blocked ? blockUser(id) : unblockUser(id)),
    onSuccess: (_data, vars) => { invalidate(); toast.success(vars.blocked ? 'User blocked' : 'User unblocked'); },
    onError: () => toast.error("Couldn't update the user", { duration: Infinity }),
  });
}

export function useAddUserOrg() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, orgId, role }: { id: string; orgId: string; role?: OrgMembershipRole }) =>
      addUserOrganization(id, orgId, role),
    onSuccess: () => { invalidate(); toast.success('Organization added'); },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't add the organization"), { duration: Infinity }),
  });
}

/** Assign many users to one org at once (each with its own resolved role).
 *  Idempotent per user (upsert); reports partial failure without aborting. */
export function useBulkAssignUsersOrg() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: async (vars: { orgId: string; assignments: { userId: string; role: OrgMembershipRole }[] }) => {
      const results = await Promise.allSettled(
        vars.assignments.map((a) => addUserOrganization(a.userId, vars.orgId, a.role)),
      );
      return { total: vars.assignments.length, failed: results.filter((r) => r.status === 'rejected').length };
    },
    onSuccess: ({ total, failed }) => {
      invalidate();
      if (failed === 0) toast.success(`Assigned ${total} user${total === 1 ? '' : 's'} to the organization`);
      else toast.error(`Assigned ${total - failed} of ${total} — ${failed} failed`, { duration: Infinity });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't assign the users"), { duration: Infinity }),
  });
}

export function useChangeUserOrg() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, orgId, role, status }: { id: string; orgId: string; role?: OrgMembershipRole; status?: OrgMembershipStatus }) =>
      changeUserOrganization(id, orgId, { role, status }),
    onSuccess: () => { invalidate(); toast.success('Membership updated'); },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't update the membership"), { duration: Infinity }),
  });
}

export function useRemoveUserOrg() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) => removeUserOrganization(id, orgId),
    onSuccess: () => { invalidate(); toast.success('Organization removed'); },
    onError: (e) => toast.error(apiErrorMessage(e, "Couldn't remove the organization"), { duration: Infinity }),
  });
}

// ---- Countries ----

export function useCountries() {
  return useQuery({
    queryKey: ['console', 'platform', 'countries'],
    queryFn: async () => (await getAllCountries()).data,
    staleTime: 30_000,
  });
}

export function useSaveCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CreateCountryData | UpdateCountryData }) =>
      id ? updateCountry(id, data) : createCountry(data as CreateCountryData),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['console', 'platform', 'countries'] });
      toast.success(vars.id ? 'Country updated' : 'Country created');
    },
    onError: () => toast.error("Couldn't save the country", { duration: Infinity }),
  });
}

export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCountry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'platform', 'countries'] });
      toast.success('Country deleted');
    },
    onError: () => toast.error("Couldn't delete the country", { duration: Infinity }),
  });
}

// ---- Citrine observability ----

export interface CitrineEvent {
  type?: string;
  kind?: string;
  at?: string;
  ts?: string;
  timestamp?: string;
  message?: string;
  [k: string]: unknown;
}

export function useCitrineStatus() {
  return useQuery({
    queryKey: ['console', 'platform', 'citrine', 'status'],
    queryFn: async () => unwrapEnvelope<Record<string, unknown>>(await api().get('/api/admin/citrine/status')),
    refetchInterval: 15_000,
  });
}

export function useCitrineEvents(limit = 100) {
  return useQuery({
    queryKey: ['console', 'platform', 'citrine', 'events', limit],
    queryFn: async () => unwrapEnvelope<{ limit: number; events: CitrineEvent[] }>(await api().get(`/api/admin/citrine/events?limit=${limit}`)),
    refetchInterval: 15_000,
  });
}
