'use client';

/** Console Shift detail (FE-9 / KAB-114): one operator shift report — summary
 *  KPIs + payment reconciliation buckets. The detail payload is large and
 *  varied; we read the fields we render defensively. */
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Btn, Card, PageHead, Stat } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { fmtNumber } from '@/lib/console/dashboard';
import { fmtDuration, operatorName, useOrgShiftDetail } from '@/lib/console/shifts';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const BUCKETS: Array<{ key: 'momo' | 'momoCode' | 'invoice' | 'free'; label: string; colorClass: string }> = [
  { key: 'momo', label: 'MoMo', colorClass: 'bg-blue-500' },
  { key: 'momoCode', label: 'MoMo code', colorClass: 'bg-[#22c55e]' },
  { key: 'invoice', label: 'Invoice', colorClass: 'bg-sky-500' },
  { key: 'free', label: 'Free', colorClass: 'bg-gray-400' },
];

export default function ConsoleShiftDetailPage() {
  const params = useParams<{ country: string; shiftId: string }>();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const shiftId = params.shiftId ?? null;

  const { data, isPending, isError, refetch } = useOrgShiftDetail(orgId, shiftId);
  const base = `/${params.country}/console`;

  if (isPending) {
    return (
      <div className="space-y-4 p-6">
        <PageHead title="Shift" crumb={<>People &amp; Shifts</>} back />
        <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="kc-skeleton h-[90px]" />
          ))}
          <span className="kc-skeleton col-span-full h-[200px]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 p-6">
        <PageHead
          title="Shift not found"
          crumb={
            <Link href={`${base}/shifts`} className="text-gray-400">
              People &amp; Shifts
            </Link>
          }
          back
        />
        <Card className="p-7 text-center text-sm text-gray-400">
          We couldn&apos;t load this shift.
          <div className="mt-2.5">
            <Btn size="sm" onClick={() => refetch()}>
              Retry
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  const r = data.detail.report;
  const live = !r.checkOutTime;
  const payments = r.payments;
  const collected = r.moneyCollectedRwf ?? 0;

  return (
    <div className="space-y-4 p-6">
      <PageHead
        title={
          <span className="inline-flex items-center gap-2.5">
            {operatorName(r.operator ?? null)}
            {live ? (
              <Badge kind="charge" dot pulse>
                on shift
              </Badge>
            ) : r.isFlagged ? (
              <Badge kind="err">flagged</Badge>
            ) : r.isApproved ? (
              <Badge kind="ok">approved</Badge>
            ) : (
              <Badge kind="neutral">pending</Badge>
            )}
          </span>
        }
        crumb={
          <Link href={`${base}/shifts`} className="text-gray-400">
            People &amp; Shifts
          </Link>
        }
        back
        sub={`${r.operatorShift?.charger?.name ?? 'Unknown charger'} · ${fmtDate(r.checkInTime)}`}
      />

      <div className="kc-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Duration" value={fmtDuration(r.shiftDurationMinutes ?? null)} />
        <Stat label="Sessions" value={r.chargingSessionCount ?? '—'} />
        <Stat label="Energy sold" value={<>{r.kwhSold != null ? fmtNumber(r.kwhSold) : '—'} <small>kWh</small></>} />
        <Stat label="Collected" value={<>{fmtNumber(collected)} <small>RWF</small></>} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title="Payment reconciliation">
          {payments ? (
            <div className="flex flex-col gap-2.5">
              {BUCKETS.map((b) => {
                const amt = payments[b.key] ?? 0;
                const pct = collected > 0 ? (amt / collected) * 100 : 0;
                return (
                  <div key={b.key}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span>{b.label}</span>
                      <span className="mono text-gray-500 dark:text-gray-400">
                        {fmtNumber(amt)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-full rounded-full ${b.colorClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No payment breakdown for this shift.</div>
          )}
        </Card>

        <Card title="Shift">
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Check-in" value={fmtDate(r.checkInTime)} />
            <Row label="Check-out" value={live ? 'In progress' : fmtDate(r.checkOutTime)} />
            <Row label="Meter total" value={r.meterTotalKwh != null ? `${fmtNumber(r.meterTotalKwh)} kWh` : '—'} />
            {r.comments ? <Row label="Comments" value={r.comments} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{value}</span>
    </div>
  );
}
