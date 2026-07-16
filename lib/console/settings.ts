'use client';

/** Console Settings data layer (FE-11 / KAB-116) over SAAS-SETTINGS:
 *    GET   /api/orgs/:id
 *    PATCH /api/orgs/:id   { name?, logo?, tin?, platformFeePercent? }
 *  Axios wrapper: payload at res.data.data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api/api';

export interface OrgProfile {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  tin: string | null;
  taxRate: number | null;
  ebmEnabled: boolean;
  ebmBhfId: string | null;
  plan: string;
  status: string;
  platformFeePercent: number;
  ownFeePercent: number | null;
  payoutVerified: boolean;
  parentOrg: { id: string; name: string } | null;
  memberCount: number;
}

export interface UpdateOrgInput {
  name?: string;
  logo?: string | null;
  tin?: string | null;
  taxRate?: number | null;
  ebmEnabled?: boolean;
  ebmBhfId?: string | null;
  platformFeePercent?: number | null;
}

export function useOrgProfile(orgId: string | null | undefined) {
  return useQuery<OrgProfile>({
    queryKey: ['console', 'org-profile', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}`);
      return res.data.data.organization as OrgProfile;
    },
    staleTime: 30_000,
  });
}

export function useUpdateOrg(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateOrgInput) => {
      const res = await api(false, false).patch(`/api/orgs/${orgId}`, input);
      return res.data.data.organization as OrgProfile;
    },
    onSuccess: (org) => {
      qc.setQueryData(['console', 'org-profile', orgId], org);
      // org name/logo show in the switcher — refresh it too
      qc.invalidateQueries({ queryKey: ['console', 'orgs'] });
      toast.success('Settings saved');
    },
    // Surface the backend's validation/guard message (e.g. "TIN must be 9 digits").
    // api(false, false) rejects with an Error whose message is the server message.
    onError: (e) =>
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't save settings", {
        duration: Infinity,
      }),
  });
}
