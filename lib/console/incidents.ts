'use client';

/** Console Incidents data layer. Surfaces open/acknowledged/resolved faults
 *  across every station & plug in the active org — the "keep the network up
 *  and jump on time-sensitive faults" view. Same fault data backs the
 *  Overview's fault widgets and the org uptime figure (lib/mock/handlers/console.ts),
 *  so acting here moves those too.
 *  Axios wrapper: payload lives at res.data.data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';
import { useAuth } from '@/lib/auth/authContext';
import { toast } from 'sonner';

export type IncidentSeverity = 'critical' | 'warning' | 'info';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

export interface Incident {
  id: string;
  chargerId: string | null;
  chargerName: string | null;
  pedestalId: string | null;
  gunId: string | null;
  connectorId: number | null;
  errorCode: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  openedAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  /** Minutes since opened (open/acknowledged) or since resolved. */
  elapsedMinutes: number;
}

export interface IncidentsResponse {
  incidents: Incident[];
  totals: { open: number; acknowledged: number; resolved: number; criticalOpen: number };
}

export interface IncidentFilters {
  status?: IncidentStatus | 'all';
  severity?: IncidentSeverity | 'all';
}

export function useOrgIncidents(orgId: string | null | undefined, filters: IncidentFilters = {}) {
  return useQuery<IncidentsResponse>({
    queryKey: ['console', 'incidents', orgId, filters.status ?? 'all', filters.severity ?? 'all'],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/incidents`, {
        params: { status: filters.status ?? 'all', severity: filters.severity ?? 'all' },
      });
      return res.data.data as IncidentsResponse;
    },
    refetchInterval: 30_000, // time-sensitive surface — keep it fresh
    staleTime: 15_000,
  });
}

function invalidateIncidentSurfaces(qc: ReturnType<typeof useQueryClient>, orgId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: ['console', 'incidents', orgId] });
  qc.invalidateQueries({ queryKey: ['console', 'fault-summary', orgId] });
  qc.invalidateQueries({ queryKey: ['console', 'dashboard', orgId] });
  qc.invalidateQueries({ queryKey: ['console', 'uptime', orgId] });
  qc.invalidateQueries({ queryKey: ['console', 'stations-inventory', orgId] });
}

/** Acknowledge / resolve / reopen an incident. `by` defaults to the current user's name. */
export function useUpdateIncidentStatus(orgId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { incidentId: string; status: IncidentStatus }) => {
      const by = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
      const res = await api(false, false).patch(`/api/orgs/${orgId}/incidents/${vars.incidentId}`, { status: vars.status, by });
      return res.data.data.incident as Incident;
    },
    onSuccess: (_data, vars) => {
      invalidateIncidentSurfaces(qc, orgId);
      const verb = vars.status === 'acknowledged' ? 'Acknowledged' : vars.status === 'resolved' ? 'Resolved' : 'Reopened';
      toast.success(`${verb} incident`);
    },
    onError: () => toast.error("Couldn't update the incident", { duration: Infinity }),
  });
}

export function incidentSeverityBadge(severity: IncidentSeverity): { kind: 'err' | 'warn' | 'info'; label: string } {
  if (severity === 'critical') return { kind: 'err', label: 'Critical' };
  if (severity === 'warning') return { kind: 'warn', label: 'Warning' };
  return { kind: 'info', label: 'Info' };
}

export function incidentStatusBadge(status: IncidentStatus): { kind: 'err' | 'warn' | 'ok'; label: string } {
  if (status === 'open') return { kind: 'err', label: 'Open' };
  if (status === 'acknowledged') return { kind: 'warn', label: 'Acknowledged' };
  return { kind: 'ok', label: 'Resolved' };
}

/** Human label for the OCPP-ish error codes seeded on incidents. */
export function errorCodeLabel(code: string): string {
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function fmtElapsedShort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
