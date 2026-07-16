'use client';

/** Console Account data layer (personal profile + login sessions).
 *  Profile view/edit reuse AuthContext.updateUser (PUT /api/user/profile);
 *  this module owns the login-session surface:
 *    GET    /api/auth/sessions            → active sessions (+ isCurrentDevice)
 *    DELETE /api/auth/sessions/:sessionId → revoke one device
 *  Axios wrapper: payload at res.data.data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api/api';

export interface UserSession {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Set on the session whose access token made the request — the device the
   *  user is on right now, which the UI must not let them revoke. */
  isCurrentDevice?: boolean;
}

const SESSIONS_KEY = ['console', 'account', 'sessions'] as const;

export function useSessions() {
  return useQuery<UserSession[]>({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const res = await api(false, false).get('/api/auth/sessions');
      return (res.data.data.sessions ?? []) as UserSession[];
    },
    staleTime: 30_000,
  });
}

export function useTerminateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api(false, false).delete(`/api/auth/sessions/${sessionId}`);
    },
    onSuccess: () => toast.success('Signed out of that device'),
    onError: (e) =>
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't sign out that device"),
    // Reconcile with the server on both paths — a failed delete may still have
    // landed (or some of a batch did), so always refetch the list.
    onSettled: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

/** Bulk revoke a set of sessions at once. There's no batch endpoint, so fan
 *  out DELETE over the passed ids (the caller only ever passes non-current
 *  devices — the current session can't be revoked here). */
export function useTerminateSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      // allSettled (not all) so every delete finishes before we settle — with
      // Promise.all a partial failure rejects while siblings are still in
      // flight, racing the onSettled refetch ahead of the server. Re-throw on
      // any failure so onError still reports it.
      const results = await Promise.allSettled(
        sessionIds.map((id) => api(false, false).delete(`/api/auth/sessions/${id}`)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`Couldn't sign out ${failed} of ${sessionIds.length} device${sessionIds.length === 1 ? '' : 's'}`);
      }
    },
    onSuccess: (_data, sessionIds) =>
      toast.success(`Signed out of ${sessionIds.length} device${sessionIds.length === 1 ? '' : 's'}`),
    onError: (e) =>
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't sign out those devices"),
    // Every delete has settled by now, so the refetch reflects final server
    // state. Runs on both paths since a partial failure still removed some.
    onSettled: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}

/** Absolute date-time for a session timestamp: "Jun 25, 2026, 10:07". */
export function fmtSessionTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    // hourCycle 'h23' (not hour12:false) so midnight renders 00:00, not 24:00
    // — the hour12:false + 2-digit combo yields "24:00" in some ICU builds.
    hourCycle: 'h23',
  });
}
