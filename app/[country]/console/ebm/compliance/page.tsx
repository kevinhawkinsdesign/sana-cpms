'use client';

/** Console Compliance (FE-8 / KAB-111): EBM fiscal-receipt health from the
 *  OrgDailyStat rollups (issued / failed / missing per day + per charger).
 *  Phase 1 has no per-receipt EBM list endpoint, so this is an overview:
 *  compliance rate, issue/fail/miss trend, and the chargers with the most
 *  unfiled receipts. Per-receipt drill-down + retry land with a future
 *  org EBM endpoint. */
import React, { useMemo, useState } from 'react';
import { Badge, Btn, Card, CountUp, PageHead, Stat, TableCard } from '@/components/console/ui';
import { Bars } from '@/components/console/charts';
import { RangeControl } from '@/components/console/shell/RangeControl';
import { useOrgs } from '@/lib/console/orgs';
import { fmtDayLabel, fmtNumber, useOrgDailyRevenue, type DailyRevenueRow } from '@/lib/console/dashboard';
import { useOrgRevenueByStation, type RevenueByStationRow } from '@/lib/console/revenue';

const RANGES = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
] as const;

interface EbmTotals {
  issued: number;
  failed: number;
  missing: number;
}

function sumEbm(daily: DailyRevenueRow[]): EbmTotals {
  return daily.reduce<EbmTotals>(
    (a, r) => ({
      issued: a.issued + r.ebmIssued,
      failed: a.failed + r.ebmFailed,
      missing: a.missing + r.ebmMissing,
    }),
    { issued: 0, failed: 0, missing: 0 },
  );
}

function ProblemChargers({
  rows,
  isPending,
  isError,
}: Readonly<{ rows: RevenueByStationRow[]; isPending: boolean; isError: boolean }>) {
  const problems = rows
    .map((r) => ({ ...r, unfiled: r.ebmFailed + r.ebmMissing }))
    .filter((r) => r.unfiled > 0)
    .sort((a, b) => b.unfiled - a.unfiled);

  let body: React.ReactNode;
  if (isError) {
    body = (
      <div className="p-6 text-center text-sm text-gray-400">
        Couldn&apos;t load per-charger compliance.
      </div>
    );
  } else if (isPending) {
    body = (
      <div className="flex flex-col gap-2 p-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="kc-skeleton h-8 rounded-md" />
        ))}
      </div>
    );
  } else if (problems.length === 0) {
    body = (
      <div className="p-6 text-center text-sm text-gray-400">
        Every charger is fully filed in this range. 🎉
      </div>
    );
  } else {
    body = (
      <table className="kc-table">
        <thead>
          <tr>
            <th>Charger</th>
            <th className="num">Issued</th>
            <th className="num">Failed</th>
            <th className="num">Missing</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((s) => (
            <tr key={s.chargerId}>
              <td>{s.chargerName ?? s.chargerId}</td>
              <td className="num mono">{s.ebmIssued}</td>
              <td className="num mono">
                {s.ebmFailed > 0 ? <span className="text-error-500">{s.ebmFailed}</span> : '0'}
              </td>
              <td className="num mono">
                {s.ebmMissing > 0 ? <span className="text-warning-500">{s.ebmMissing}</span> : '0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <TableCard title="Chargers with unfiled receipts" totalLabel={rows.length ? `${rows.length} chargers` : undefined}>
      {body}
    </TableCard>
  );
}

export default function ConsoleCompliancePage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('30d');
  const days = RANGES.find((r) => r.id === range)?.days ?? 30;

  const revenue = useOrgDailyRevenue(orgId, days);
  const byStation = useOrgRevenueByStation(orgId, days);

  const daily = useMemo(() => revenue.data?.daily ?? [], [revenue.data]);
  const totals = useMemo(() => sumEbm(daily), [daily]);
  const expected = totals.issued + totals.failed + totals.missing;
  const hasData = expected > 0;
  const complianceRate = hasData ? (totals.issued / expected) * 100 : null;
  const belowTarget = complianceRate !== null && complianceRate < 98;
  const complianceDelta = belowTarget ? 'below 98% target' : 'on target';

  // unfiled-per-day bars (failed + missing) — where compliance slipped
  const unfiledSeries = useMemo(() => daily.map((r) => r.ebmFailed + r.ebmMissing), [daily]);
  const unfiledLabels = useMemo(() => {
    const step = Math.ceil(Math.max(1, daily.length) / 8);
    return daily.map((r, i) =>
      i === 0 || i === daily.length - 1 || i % step === 0 ? fmtDayLabel(r.date) : null,
    );
  }, [daily]);
  const peakIdx = useMemo(
    () => unfiledSeries.reduce((best, v, i) => (v > unfiledSeries[best] ? i : best), 0),
    [unfiledSeries],
  );

  // isLoading, not isPending — a disabled query (orgId still null) stays
  // pending forever and would trap the page in a permanent skeleton.
  const loadingFirst = revenue.isLoading && daily.length === 0;

  return (
    <div className="space-y-4 p-6">
      <PageHead
        title="Compliance"
        sub="EBM fiscal receipts and tax compliance"
        actions={<RangeControl ranges={RANGES} value={range} onChange={(id) => setRange(id as typeof range)} />}
      />

      {loadingFirst && (
        <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="kc-skeleton h-[90px]" />
          ))}
          <span className="kc-skeleton col-span-full h-[220px]" />
        </div>
      )}

      {!loadingFirst && revenue.isError && (
        <Card className="p-7 text-center text-sm text-gray-400">
          Couldn&apos;t load compliance data.
          <div className="mt-2.5">
            <Btn size="sm" onClick={() => revenue.refetch()}>
              Retry
            </Btn>
          </div>
        </Card>
      )}

      {!loadingFirst && !revenue.isError && (
        <>
          <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Compliance rate"
              value={complianceRate === null ? '—' : <>{complianceRate.toFixed(1)}<small>%</small></>}
              delta={hasData ? complianceDelta : undefined}
              deltaKind={belowTarget ? 'err' : 'ok'}
            />
            <Stat label="Receipts issued" value={<CountUp value={totals.issued} />} />
            <Stat label="Failed" value={<CountUp value={totals.failed} />} sub={totals.failed ? 'needs retry' : 'none'} />
            <Stat label="Missing" value={<CountUp value={totals.missing} />} sub={totals.missing ? 'not generated' : 'none'} />
          </div>

          <Card
            title="Unfiled receipts per day"
            action={
              expected > 0 ? (
                <Badge kind={belowTarget ? 'err' : 'ok'}>
                  {fmtNumber(totals.failed + totals.missing)} of {fmtNumber(expected)}
                </Badge>
              ) : undefined
            }
          >
            {unfiledSeries.some((v) => v > 0) ? (
              <Bars data={unfiledSeries} labels={unfiledLabels} highlight={peakIdx} format={(v) => String(Math.round(v))} />
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                No failed or missing receipts in this range — fully compliant.
              </div>
            )}
          </Card>

          <ProblemChargers rows={byStation.data?.byStation ?? []} isPending={byStation.isPending} isError={byStation.isError} />
        </>
      )}
    </div>
  );
}
