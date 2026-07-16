'use client';

/**
 * Tags & local-auth data layer (Kabisa Tags & Operations plan).
 * Wired to the backend Tags API (GET /api/orgs/:orgId/tags …). Tag recent
 * authorizations come from CitrineOS later (Phase C) — empty for now.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { useOrgs } from '@/lib/console/orgs';
import type { BadgeKind } from '@/components/console/ui';

export type TagStatus = 'active' | 'blocked';

/** OCPP IdToken types CitrineOS accepts (the "tag type"). Immutable after create. */
export const TAG_TYPES = [
  'ISO14443',
  'ISO15693',
  'KeyCode',
  'Local',
  'MacAddress',
  'eMAID',
  'Central',
  'NoAuthorization',
  'Other',
] as const;
export type TagType = (typeof TAG_TYPES)[number];

/**
 * Real-time-auth mode (CitrineOS AuthorizationWhitelistEnum). Managed tags verify
 * with the backend per charge:
 *  - 'Never'          → always verify; deny if the backend is unreachable (fail-closed)
 *  - 'AllowedOffline' → verify, but allow during a backend outage (fail-open)
 *  - 'Allowed'        → trust the cached status; never call the backend
 */
export type RtaMode = 'Never' | 'AllowedOffline' | 'Allowed';

export interface ConsoleTag {
  id: string; // tag uuid (used for navigation)
  idToken: string; // the OCPP RFID / ID token value (displayed as "Tag ID")
  label: string | null;
  status: TagStatus;
  assignee: { id: string; name: string; kind: 'operator' | 'member'; email: string | null } | null;
  scope: 'all' | string[]; // 'all' = every station; else scoped charger names
  scopeChargerIds?: string[];
  parentIdToken: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  // CitrineOS Authorization fields (Citrine is the source of truth).
  idTokenType: TagType | null;
  realTimeAuth: RtaMode | null;
  realTimeAuthTimeout: number | null;
  chargingPriority: number | null;
  concurrentTransaction: boolean | null;
  language1: string | null;
  language2: string | null;
}

export interface TagAuthorization {
  time: string;
  station: string;
  connector: number;
  result: 'Accepted' | 'Blocked' | 'Rejected';
}

export function tagScopeLabel(scope: ConsoleTag['scope']): string {
  if (scope === 'all') return 'All sites';
  if (scope.length === 0) return 'Unassigned';
  if (scope.length === 1) return scope[0];
  return `${scope.length} sites`;
}

export function tagStatusBadge(status: TagStatus): { kind: BadgeKind; label: string } {
  return status === 'blocked'
    ? { kind: 'err', label: 'blocked' }
    : { kind: 'ok', label: 'active' };
}

/** All tags for the active org. */
export function useOrgTags(): { tags: ConsoleTag[]; isPending: boolean } {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const q = useQuery({
    queryKey: ['console', 'tags', orgId],
    enabled: !!orgId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/tags`, { signal });
      return (res.data.data.tags ?? []) as ConsoleTag[];
    },
    staleTime: 30_000,
  });
  return { tags: q.data ?? [], isPending: q.isPending };
}

/** One tag + its recent authorizations. */
export function useTag(tagId: string): { tag: ConsoleTag | null; authorizations: TagAuthorization[]; isPending: boolean } {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const q = useQuery({
    queryKey: ['console', 'tag', orgId, tagId],
    enabled: !!orgId && !!tagId,
    queryFn: async ({ signal }) => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/tags/${encodeURIComponent(tagId)}`, { signal });
      return res.data.data as { tag: ConsoleTag; authorizations: TagAuthorization[] };
    },
    staleTime: 30_000,
  });
  return { tag: q.data?.tag ?? null, authorizations: q.data?.authorizations ?? [], isPending: q.isPending };
}

/** Tags held by one operator (for the operator-detail "Tags & access" card). */
export function useOperatorTags(operatorUserId: string | null | undefined): ConsoleTag[] {
  const { tags } = useOrgTags();
  if (!operatorUserId) return [];
  return tags.filter((t) => t.assignee?.id === operatorUserId);
}

/* ---------- writes (create / update / delete) ----------
 * Mirror the backend Tags API (orgTagValidation): POST/PATCH/DELETE
 * /api/orgs/:orgId/tags. A create or status/scope change syncs the token to
 * CitrineOS server-side (Authorization upsert), so the charger's local-auth
 * list reflects it — the registry is the source of truth. */

export interface TagWritePayload {
  /** Required on create; the token is immutable afterwards (omit on update). */
  idToken?: string;
  label?: string | null;
  status?: TagStatus;
  assigneeUserId?: string | null;
  /** true = every station; false = the chargerIds below. */
  scopeAll?: boolean;
  /** Charger UUIDs the tag is scoped to (when scopeAll is false). */
  chargerIds?: string[];
  parentIdToken?: string | null;
  /** ISO date (YYYY-MM-DD) or null for no expiry. */
  expiresAt?: string | null;
  /** OCPP token type — set on create, immutable on edit (part of Citrine's upsert key). */
  idTokenType?: TagType | null;
  /** Real-time-auth mode; defaults to 'Never' server-side when omitted. */
  realTimeAuth?: RtaMode;
  /** Seconds the charger reuses the last live decision (debounce). */
  realTimeAuthTimeout?: number | null;
  chargingPriority?: number | null;
  concurrentTransaction?: boolean | null;
  language1?: string | null;
  language2?: string | null;
}

/** Invalidate the tags list + the operator "Tags & access" cards after a write. */
function useInvalidateTags(orgId: string | null) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['console', 'tags', orgId] });
  };
}

function tagWriteError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export function useCreateTag() {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const invalidate = useInvalidateTags(orgId);
  return useMutation({
    mutationFn: async (payload: TagWritePayload) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/tags`, payload);
      return res.data.data.tag as ConsoleTag;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTag(tagId: string) {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TagWritePayload) => {
      const res = await api(false, false).patch(
        `/api/orgs/${orgId}/tags/${encodeURIComponent(tagId)}`,
        payload,
      );
      return res.data.data.tag as ConsoleTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console', 'tags', orgId] });
      qc.invalidateQueries({ queryKey: ['console', 'tag', orgId, tagId] });
    },
  });
}

export function useDeleteTag() {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const invalidate = useInvalidateTags(orgId);
  return useMutation({
    mutationFn: async (tagId: string) => {
      await api(false, false).delete(`/api/orgs/${orgId}/tags/${encodeURIComponent(tagId)}`);
      return tagId;
    },
    onSuccess: invalidate,
  });
}

export { tagWriteError };
