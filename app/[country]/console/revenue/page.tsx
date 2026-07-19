'use client';

/** Console Revenue & Billing (FE-7 / KAB-112) over the OrgDailyStat rollups
 *  (SAAS-14): KPI strip, revenue trend, payment mix, per-station breakdown, and
 *  an EBM-compliance summary. Range selector drives every query. */
import React, { useMemo, useState } from 'react';
import { Badge, Btn, Card, CountUp, PageHead, Stat, TableCard } from '@/components/console/ui';
import { AreaChart } from '@/components/console/charts';
import { RangeControl } from '@/components/console/shell/RangeControl';
import { useOrgs } from '@/lib/console/orgs';
import {
  fmtCompact,
  fmtDayLabel,
  fmtNumber,
  useOrgDailyRevenue,
  type DailyRevenueRow,
} from '@/lib/console/dashboard';
import {
  paymentMethodLabel,
  useOrgPaymentMix,
  useOrgRevenueByStation,
  type PaymentMixRow,
  type RevenueByStationRow,
} from '@/lib/console/revenue';

const RANGES = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
] as const;

const MIX_COLORS = ['#0B4F42', '#12b76a', '#0ba5ec', '#f79009', '#98a2b3'];

interface RangeTotals {
  gross: number;
  kwh: number;
  sessions: number;
  paid: number;
  ebmIssued: number;
  ebmFailed: number;
  ebmMissing: number;
}

function sumDaily(daily: DailyRevenueRow[]): RangeTotals {
  return daily.reduce<RangeTotals>(
    (a, r) => ({
      gross: a.gross + r.grossRwf,
      kwh: a.kwh + r.kwh,
      sessions: a.sessions + r.sessionCount,
      paid: a.paid + r.paidCount,
      ebmIssued: a.ebmIssued + r.ebmIssued,
      ebmFailed: a.ebmFailed + r.ebmFailed,
      ebmMissing: a.ebmMissing + r.ebmMissing,
    }),
    { gross: 0, kwh: 0, sessions: 0, paid: 0, ebmIssued: 0, ebmFailed: 0, ebmMissing: 0 },
  );
}

function KpiStrip({ totals }: Readonly<{ totals: RangeTotals }>) {
  const paidRate = totals.sessions > 0 ? (totals.paid / totals.sessions) * 100 : null;
  const paidBelowTarget = paidRate !== null && paidRate < 90;
  return (
    <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Gross revenue" value={<><CountUp value={totals.gross} format={fmtCompact} /> <small>RWF</small></>} />
      <Stat label="Energy" value={<><CountUp value={totals.kwh} format={fmtNumber} /> <small>kWh</small></>} />
      <Stat label="Sessions" value={<CountUp value={totals.sessions} />} sub={`${totals.paid} paid`} />
      <Stat
        label="Paid rate"
        value={paidRate === null ? '—' : <>{paidRate.toFixed(0)}<small>%</small></>}
        delta={paidBelowTarget ? 'below target' : undefined}
        deltaKind={paidBelowTarget ? 'err' : 'ok'}
      />
    </div>
  );
}

function PaymentMixCard({
  rows,
  isPending,
  isError,
}: Readonly<{ rows: PaymentMixRow[]; isPending: boolean; isError: boolean }>) {
  const total = rows.reduce((a, r) => a + r.amountRwf, 0);
  let body: React.ReactNode;
  if (isError) {
    body = <div className="text-sm text-gray-400">Couldn&apos;t load payment mix.</div>;
  } else if (isPending) {
    body = <span className="kc-skeleton block h-[120px]" />;
  } else if (rows.length === 0) {
    body = <div className="text-sm text-gray-400">No payments in this range.</div>;
  } else {
    body = (
      <div className="flex flex-col gap-2.5">
        {rows.map((m, i) => {
          const pct = total > 0 ? (m.amountRwf / total) * 100 : 0;
          return (
            <div key={m.method}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300">{paymentMethodLabel(m.method)}</span>
                <span className="text-gray-400">
                  <span className="mono text-gray-800 dark:text-white/90">{fmtCompact(m.amountRwf)}</span> ·{' '}
                  {pct.toFixed(0)}% · {m.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: MIX_COLORS[i % MIX_COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return <Card title="Payment mix">{body}</Card>;
}

function ComplianceRow({
  label,
  value,
  kind,
}: Readonly<{ label: string; value: number; kind: 'ok' | 'err' | 'warn' }>) {
  const muted = value === 0 && (kind === 'err' || kind === 'warn');
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <Badge kind={muted ? 'neutral' : kind}>{fmtNumber(value)}</Badge>
    </div>
  );
}

function EbmComplianceCard({ totals }: Readonly<{ totals: RangeTotals }>) {
  return (
    <Card title="EBM compliance">
      <div className="flex flex-col gap-2">
        <ComplianceRow label="Receipts issued" value={totals.ebmIssued} kind="ok" />
        <ComplianceRow label="Failed" value={totals.ebmFailed} kind="err" />
        <ComplianceRow label="Missing" value={totals.ebmMissing} kind="warn" />
        <div className="mt-1 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
          Full receipt + Xero reconciliation lives in Compliance (FE-8).
        </div>
      </div>
    </Card>
  );
}

function ReceiptCounts({ row }: Readonly<{ row: RevenueByStationRow }>) {
  return (
    <>
      <span className="text-success-500">{row.ebmIssued}</span>
      {row.ebmFailed > 0 ? <span className="text-error-500"> · {row.ebmFailed}✕</span> : null}
      {row.ebmMissing > 0 ? <span className="text-warning-500"> · {row.ebmMissing}?</span> : null}
    </>
  );
}

function ByStationCard({
  rows,
  isPending,
  isError,
}: Readonly<{ rows: RevenueByStationRow[]; isPending: boolean; isError: boolean }>) {
  let body: React.ReactNode;
  if (isError) {
    body = (
      <div className="px-6 py-10 text-center text-sm text-gray-400">
        Couldn&apos;t load charger revenue.
      </div>
    );
  } else if (isPending) {
    body = (
      <div className="flex flex-col gap-2 p-3.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="kc-skeleton h-8 rounded-md" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="px-6 py-10 text-center text-sm text-gray-400">
        No charger revenue in this range.
      </div>
    );
  } else {
    body = (
      <table className="kc-table">
        <thead>
          <tr>
            <th>Charger</th>
            <th className="num">Revenue</th>
            <th className="num">Energy</th>
            <th className="num">Sessions</th>
            <th className="num">Receipts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.chargerId}>
              <td className="font-medium text-gray-800 dark:text-white/90">{s.chargerName ?? s.chargerId}</td>
              <td className="num mono">{fmtNumber(s.grossRwf)}</td>
              <td className="num mono">{s.kwh.toFixed(1)}</td>
              <td className="num mono">{s.sessionCount}</td>
              <td className="num">
                <ReceiptCounts row={s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <TableCard title="Revenue by charger" totalLabel={rows.length ? `${rows.length} chargers` : undefined}>
      {body}
    </TableCard>
  );
}

export default function ConsoleRevenuePage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('30d');
  const days = RANGES.find((r) => r.id === range)?.days ?? 30;

  const revenue = useOrgDailyRevenue(orgId, days);
  const byStation = useOrgRevenueByStation(orgId, days);
  const mix = useOrgPaymentMix(orgId, days);

  const daily = useMemo(() => revenue.data?.daily ?? [], [revenue.data]);
  const series = useMemo(() => daily.map((r) => r.grossRwf), [daily]);
  const labels = useMemo(() => {
    const step = Math.ceil(Math.max(1, daily.length) / 6);
    return daily.map((r, i) =>
      i === 0 || i === daily.length - 1 || i % step === 0 ? fmtDayLabel(r.date) : null,
    );
  }, [daily]);
  const totals = useMemo(() => sumDaily(daily), [daily]);
  const stations = useMemo(
    () => (byStation.data?.byStation ?? []).slice().sort((a, b) => b.grossRwf - a.grossRwf),
    [byStation.data],
  );

  const loadingFirst = revenue.isLoading && daily.length === 0;

  return (
    <div className="space-y-4">
      <PageHead
        title="Revenue & Billing"
        sub="Revenue, energy, payment mix, and EBM compliance"
        actions={
          <RangeControl ranges={RANGES} value={range} onChange={(id) => setRange(id as typeof range)} showExport />
        }
      />

      {loadingFirst && (
        <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="kc-skeleton h-[90px]" />
          ))}
          <span className="kc-skeleton col-span-full h-[260px]" />
        </div>
      )}

      {!loadingFirst && revenue.isError && (
        <Card className="px-6 py-10 text-center text-sm text-gray-400">
          Couldn&apos;t load revenue.
          <div className="mt-3">
            <Btn size="sm" onClick={() => revenue.refetch()}>Retry</Btn>
          </div>
        </Card>
      )}

      {!loadingFirst && !revenue.isError && (
        <>
          <KpiStrip totals={totals} />

          <Card
            title={`Revenue — last ${days} days`}
            action={<Badge kind="neutral">RWF {fmtCompact(totals.gross)} total</Badge>}
          >
            {series.length > 0 ? (
              <AreaChart data={series} labels={labels} format={fmtCompact} accentLast />
            ) : (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                No revenue recorded in this range.
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PaymentMixCard rows={mix.data?.paymentMix ?? []} isPending={mix.isPending} isError={mix.isError} />
            <EbmComplianceCard totals={totals} />
          </div>

          <ByStationCard rows={stations} isPending={byStation.isPending} isError={byStation.isError} />
        </>
      )}
    </div>
  );
}
