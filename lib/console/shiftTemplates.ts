'use client';

/** Console recurring shift templates (KAB) over the org-scoped API:
 *    GET    /api/orgs/:id/shift-templates
 *    POST   /api/orgs/:id/shift-templates
 *    PUT    /api/orgs/:id/shift-templates/:templateId
 *    DELETE /api/orgs/:id/shift-templates/:templateId
 *  Payload at res.data.data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/api';

export interface ShiftTemplate {
  id: string;
  operatorId: string;
  operatorName?: string;
  chargerId: string | null;
  chargerName: string | null;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ShiftTemplateInput {
  operatorId: string;
  chargerId?: string | null;
  daysOfWeek: number[];
  startTime?: string | null;
  endTime?: string | null;
  startDate: string;
  endDate?: string | null;
}

export function useOrgShiftTemplates(orgId: string | null | undefined) {
  return useQuery<{ templates: ShiftTemplate[] }>({
    queryKey: ['console', 'shift-templates', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/shift-templates`);
      return res.data.data as { templates: ShiftTemplate[] };
    },
    staleTime: 30_000,
  });
}

function useInvalidateTemplates(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['console', 'shift-templates', orgId] });
    // Generated shifts change the calendar feed too.
    qc.invalidateQueries({ queryKey: ['console', 'shift-calendar', orgId] });
  };
}

export function useCreateShiftTemplate(orgId: string | null | undefined) {
  const invalidate = useInvalidateTemplates(orgId);
  return useMutation({
    mutationFn: async (input: ShiftTemplateInput) => {
      const res = await api(false, false).post(`/api/orgs/${orgId}/shift-templates`, input);
      return res.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteShiftTemplate(orgId: string | null | undefined) {
  const invalidate = useInvalidateTemplates(orgId);
  return useMutation({
    mutationFn: async (templateId: string) => {
      await api(false, false).delete(`/api/orgs/${orgId}/shift-templates/${templateId}`);
    },
    onSuccess: invalidate,
  });
}

/** ISO weekday (1=Mon … 7=Sun) labels for pickers + display. */
export const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

export const formatDays = (days: number[]): string =>
  WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(', ');
