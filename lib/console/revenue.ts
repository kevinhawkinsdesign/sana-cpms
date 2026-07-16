'use client';

/** Console Revenue data layer (FE-7 / KAB-112) over the OrgDailyStat rollups
 *  (SAAS-14 / #433):
 *    GET /api/orgs/:id/revenue/daily        — per-day series (reused from FE-3)
 *    GET /api/orgs/:id/revenue/by-station   — totals per charger
 *    GET /api/orgs/:id/revenue/payment-mix  — amount/count by payment method
 *  All accept ?from&to (Kigali day keys); default window = last 30 days.
 *  Axios wrapper: payload at res.data.data. */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/api';

/** Kigali (UTC+2) date key N days back — backend buckets by Kigali calendar. */
function kigaliFrom(days: number): string {
  const KIGALI_OFFSET_MS = 2 * 3_600_000;
  return new Date(Date.now() + KIGALI_OFFSET_MS - (days - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export interface RevenueByStationRow {
  chargerId: string;
  chargerName: string | null;
  grossRwf: number;
  kwh: number;
  sessionCount: number;
  paidCount: number;
  ebmIssued: number;
  ebmFailed: number;
  ebmMissing: number;
}

export interface PaymentMixRow {
  method: string;
  amountRwf: number;
  count: number;
}

export function useOrgRevenueByStation(orgId: string | null | undefined, days: number) {
  return useQuery<{ byStation: RevenueByStationRow[] }>({
    queryKey: ['console', 'revenue-by-station', orgId, days],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/revenue/by-station`, {
        params: { from: kigaliFrom(days) },
      });
      return res.data.data as { byStation: RevenueByStationRow[] };
    },
    staleTime: 60_000,
  });
}

export function useOrgPaymentMix(orgId: string | null | undefined, days: number) {
  return useQuery<{ paymentMix: PaymentMixRow[] }>({
    queryKey: ['console', 'payment-mix', orgId, days],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api(false, false).get(`/api/orgs/${orgId}/revenue/payment-mix`, {
        params: { from: kigaliFrom(days) },
      });
      return res.data.data as { paymentMix: PaymentMixRow[] };
    },
    staleTime: 60_000,
  });
}

/** Human label for a payment-method key (MOMO / KABISA / CASH / …). */
export function paymentMethodLabel(method: string): string {
  return method
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
