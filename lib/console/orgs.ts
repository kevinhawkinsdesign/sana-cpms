'use client';

/** Console org-switcher data layer (FE-2 / KAB-107).
 *  GET /auth/orgs   → memberships (+ all orgs for platform admins) + active
 *                     org permissions (backend PR #435)
 *  POST /auth/switch-org → re-mints tokens on the same session; we adopt them
 *                     via AuthContext and drop every cached query. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api/api';
import { useAuth } from '@/lib/auth/authContext';

export interface ConsoleOrg {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  plan: string;
  parentOrgId: string | null;
  role: string;
}

export interface OrgsData {
  orgs: ConsoleOrg[];
  activeOrgId: string | null;
  isPlatformAdmin: boolean;
  permissions: string[] | null;
  activeOrg: { id: string; role: string | null } | null;
}

export function useOrgs() {
  const { user } = useAuth();
  // Perf: seed activeOrgId synchronously from the auth token so org-gated
  // queries fire immediately instead of waiting a full round-trip on
  // /auth/orgs (the old waterfall). The fetched data replaces this when it
  // lands — identical activeOrgId for normal org users; platform admins have
  // no organizationId so they fall through to the fetched value (org-switching
  // stays correct). Permissions stay null until the real load, so
  // permission-gated UI just resolves a beat later.
  const placeholder: OrgsData | undefined = user?.organizationId
    ? {
        orgs: [],
        activeOrgId: user.organizationId,
        isPlatformAdmin: false,
        permissions: null,
        activeOrg: { id: user.organizationId, role: null },
      }
    : undefined;

  return useQuery<OrgsData>({
    queryKey: ['console', 'orgs'],
    queryFn: async () => {
      const res = await api(false, false).get('/api/auth/orgs');
      return res.data.data as OrgsData;
    },
    staleTime: 60_000,
    placeholderData: placeholder,
  });
}

/** Permission check helper — null permissions (not loaded / no org) = false. */
export function hasPerm(data: OrgsData | undefined, perm: string): boolean {
  if (!data) return false;
  if (data.isPlatformAdmin) return true;
  return data.permissions?.includes(perm) ?? false;
}

/** A 403 from the API client (lib/api/api.ts tags rejected errors with .status). */
export function isForbiddenError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { status?: number }).status === 403;
}

interface SwitchOrgResponse {
  organization: { id: string; name: string; slug: string | null; role: string | null };
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function useSwitchOrg() {
  const queryClient = useQueryClient();
  const { applyExternalTokens } = useAuth();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const res = await api(false, false).post('/api/auth/switch-org', { orgId });
      return res.data.data as SwitchOrgResponse;
    },
    onSuccess: (data) => {
      // New tokens carry the new org claim — adopt them in AuthContext (state
      // + localStorage together, so context-driven calls don't keep the old
      // org's token), then drop every cached query.
      applyExternalTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      });
      // resetQueries (not clear): clear() empties the cache but does not
      // refetch mounted queries in v5, so the page sat stale until reload.
      // reset drops old-org data AND refetches the active observers now.
      queryClient.resetQueries().catch(() => undefined);
      toast.success(`Switched to ${data.organization.name}`, {
        description: data.organization.role
          ? `Acting as ${data.organization.role.toLowerCase().replaceAll('_', ' ')}`
          : undefined,
      });
    },
    onError: () => {
      toast.error("Couldn't switch organization", {
        description: 'You may not be an active member of that organization.',
        duration: Infinity, // bible: errors persist until dismissed
      });
    },
  });
}
