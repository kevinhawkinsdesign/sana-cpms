'use client';

/** Console Session detail (FE-4 / KAB-109): drill-down for one session over
 *  GET /api/orgs/:id/sessions/:sessionId. Laid out to the Kabisa Console design:
 *  6-KPI header, a 2-column body with Session performance (2×2 telemetry grid) +
 *  Session timeline + Payment activity on the left, and Driver & vehicle /
 *  Station & connector / Receipt & invoicing / Faults & exceptions on the right.
 *  Action buttons (retry payment / generate receipt) are deferred — rendered
 *  disabled. Telemetry degrades gracefully. */
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Btn, Card, Icon, PageHead, SummaryStrip } from '@/components/console/ui';
import { DualTelemetryChart, TelemetryChart } from '@/components/console/charts';
import { useSessionActions } from '@/components/console/sessions/sessionActions';
import { useOrgs } from '@/lib/console/orgs';
import { fmtElapsed, fmtNumber } from '@/lib/console/dashboard';
import {
  fitDomain,
  isLiveStatus,
  metricPoints,
  sessionStatusBadge,
  useOrgSessionDetail,
  type MetricPoint,
  type MomoRequestLog,
  type OrgSessionDetail,
  type PaymentStatusHistory,
  type SessionDetailTransaction,
  type SessionEbm,
  type SessionFault,
} from '@/lib/console/sessions';

function fmtFull(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtClock(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Session duration: end−start, or elapsed-so-far for a live session. */
function duration(start: string, end: string | null): string {
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((to - new Date(start).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/** Series colours, matching the design's transaction charts. Concrete hex —
 *  CSS vars don't resolve inside ApexCharts' computed gradients (they render
 *  grey/black), so each series gets a literal colour. */
const TELEMETRY_COLORS = {
  power: '#7a5af8', // purple
  energy: '#12b76a', // green
  soc: '#f59e0b', // amber
  voltage: '#ffd400', // solar
  current: '#f04438', // red
} as const;

function MetricCard({
  title,
  label,
  points,
  color,
  unit,
  format,
  yMin,
  yMax,
  live,
}: Readonly<{
  title: string;
  label: string;
  points: MetricPoint[];
  color: string;
  unit: string;
  format: (v: number) => string;
  yMin?: number;
  yMax?: number;
  live: boolean;
}>) {
  return (
    <Card title={title}>
      {points.length > 1 ? (
        <TelemetryChart
          points={points}
          color={color}
          yLabel={label}
          unit={unit}
          format={format}
          yMin={yMin}
          yMax={yMax}
          live={live}
        />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text3)' }}>
          No data for this session.
        </div>
      )}
    </Card>
  );
}

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ color: 'var(--text)', textAlign: 'right', minWidth: 0 }}>{children}</span>
    </div>
  );
}

const TXN_KIND: Record<string, 'ok' | 'err' | 'warn' | 'info' | 'neutral'> = {
  COMPLETED: 'ok',
  SUCCESS: 'ok',
  SUCCESSFUL: 'ok',
  FAILED: 'err',
  PENDING: 'info',
  CANCELLED: 'neutral',
};

/** Charging lifecycle from the OCPP status timeline + session bookends. */
function SessionTimeline({
  start,
  end,
  statusTimeline,
  isPaid,
  completed,
}: Readonly<{
  start: string;
  end: string | null;
  statusTimeline: SessionFault[];
  isPaid: boolean;
  completed: boolean;
}>) {
  const rows = useMemo(() => {
    const out: Array<{ at: string; label: string; meta: string; tone: 'ok' | 'pending' | 'err' }> = [];
    out.push({ at: start, label: 'Session started', meta: 'Vehicle connected to connector', tone: 'ok' });
    for (const stsn of statusTimeline) {
      const isErr = !!stsn.errorCode && stsn.errorCode !== 'NoError';
      out.push({
        at: stsn.timestamp,
        label: stsn.connectorStatus ?? stsn.errorCode ?? 'Status update',
        meta: [isErr ? stsn.errorCode : null, stsn.info].filter(Boolean).join(' · '),
        tone: isErr ? 'err' : 'ok',
      });
    }
    if (end) out.push({ at: end, label: 'Session completed', meta: 'Connector unlocked', tone: 'ok' });
    if (completed && !isPaid) {
      out.push({ at: end ?? start, label: 'Payment pending', meta: 'Payment collection not completed', tone: 'pending' });
    } else if (isPaid) {
      out.push({ at: end ?? start, label: 'Payment received', meta: 'Settled', tone: 'ok' });
    }
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [start, end, statusTimeline, isPaid, completed]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((e, i) => (
        <div key={`${e.at}-${i}`} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
          <span style={{ marginTop: 1, color: e.tone === 'err' ? 'var(--err)' : e.tone === 'pending' ? 'var(--amber)' : 'var(--ok)' }}>
            <Icon name={e.tone === 'pending' ? 'clock' : e.tone === 'err' ? 'alert' : 'check'} size={15} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 550 }}>{e.label}</span>
              <span className="mono" style={{ color: 'var(--text3)', flexShrink: 0 }}>{fmtClock(e.at)}</span>
            </div>
            {e.meta ? <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 1 }}>{e.meta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Flat payment-attempt table (Attempted · Method · Provider/Reference · Amount · Status · Response). */
function PaymentActivity({ transactions }: Readonly<{ transactions: SessionDetailTransaction[] }>) {
  const rows = useMemo(() => {
    const flat: Array<{
      at: string | null;
      method: string;
      provider: string;
      amount: number;
      currency: string;
      status: string;
      response: string;
    }> = [];
    for (const t of transactions) {
      const logResponse = (l: MomoRequestLog) =>
        [l.errorMessage, l.httpStatus ? `HTTP ${l.httpStatus}` : null].filter(Boolean).join(' · ');
      const lastLog = t.momoRequestLogs[t.momoRequestLogs.length - 1];
      const lastHist = t.statusHistory[t.statusHistory.length - 1] as PaymentStatusHistory | undefined;

      // For admin write-offs (KABISA / Mark as Paid), surface who did it
      const isAdminWriteOff = t.initiatedByType === 'ADMIN';
      const initiatorName = t.initiatedByUser
        ? [t.initiatedByUser.firstName, t.initiatedByUser.lastName].filter(Boolean).join(' ')
        : null;

      const METHOD_LABELS: Record<string, string> = {
        MOMO: 'MoMo',
        MOMO_CODE_PAYMENT: 'MoMo Code',
        CARD: 'Card',
        BALANCE: 'Balance',
        CONTRACT: 'Invoice',
        FREE_ALLOWANCE: 'Free Allowance',
        KABISA: 'Kabisa',
      };
      const rawMethod = t.paymentMethod?.paymentMethodType ?? '';

      flat.push({
        at: t.transactionDate,
        method: isAdminWriteOff ? 'Marked paid' : (METHOD_LABELS[rawMethod] ?? (rawMethod || 'Payment')),
        provider: isAdminWriteOff
          ? (initiatorName ? `by ${initiatorName}` : '—')
          : ([t.payerPhone, t.momoExternalId].filter(Boolean).join(' · ') || '—'),
        amount: t.amount,
        currency: t.currency ?? 'RWF',
        status: t.transactionStatus,
        response: isAdminWriteOff
          ? (t.transactionDescription?.replace(/^Marked paid by .+?\.\s*/, '').replace(/^Note:\s*/, '') || '—')
          : (lastLog ? logResponse(lastLog) : (lastHist?.reason ?? '—')),
      });
    }
    return flat.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
  }, [transactions]);

  if (rows.length === 0) {
    return <div style={{ fontSize: 12.5, color: 'var(--text3)', padding: 14 }}>No transactions on this session.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="kc-table">
        <thead>
          <tr>
            <th>Attempted</th>
            <th>Method</th>
            <th>Provider / Reference</th>
            <th className="num">Amount</th>
            <th>Status</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.at}-${i}`}>
              <td style={{ color: 'var(--text2)' }}>{fmtFull(r.at)}</td>
              <td>{r.method}</td>
              <td className="mono" style={{ color: 'var(--text3)', fontSize: 12 }}>{r.provider}</td>
              <td className="num mono">{fmtNumber(r.amount)} {r.currency}</td>
              <td><Badge kind={TXN_KIND[r.status] ?? 'neutral'}>{r.status}</Badge></td>
              <td style={{ color: 'var(--text3)', fontSize: 12 }}>{r.response || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '8px 14px', fontSize: 11.5, color: 'var(--text3)', textAlign: 'center' }}>
        Showing {rows.length} of {rows.length} attempt{rows.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}

/** Session performance card — the 2×2 telemetry grid, with degraded / no-data
 *  states handled by early returns (keeps the page component's complexity low). */
function SessionPerformanceCard({
  degraded,
  hasTelemetry,
  live,
  power,
  energy,
  soc,
  voltage,
  current,
}: Readonly<{
  degraded: boolean;
  hasTelemetry: boolean;
  live: boolean;
  power: MetricPoint[];
  energy: MetricPoint[];
  soc: MetricPoint[];
  voltage: MetricPoint[];
  current: MetricPoint[];
}>) {
  let body: React.ReactNode;
  if (degraded) {
    body = (
      <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Telemetry feed unavailable for this session.
      </div>
    );
  } else if (hasTelemetry) {
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <MetricCard title="Power over time" label="Power (kW)" points={power} color={TELEMETRY_COLORS.power} unit=" kW" format={(v) => v.toFixed(0)} {...fitDomain(power.map((p) => p.value))} live={live} />
        <MetricCard title="Energy over time" label="Energy (kWh)" points={energy} color={TELEMETRY_COLORS.energy} unit=" kWh" format={(v) => v.toFixed(0)} {...fitDomain(energy.map((p) => p.value))} live={live} />
        <MetricCard title="State of charge" label="SoC (%)" points={soc} color={TELEMETRY_COLORS.soc} unit="" format={(v) => `${v.toFixed(0)}%`} yMin={0} yMax={100} live={live} />
        <Card title="Voltage (V) & Current (A)">
          {voltage.length > 1 || current.length > 1 ? (
            <DualTelemetryChart
              seriesA={{ label: 'Voltage (V)', unit: ' V', color: TELEMETRY_COLORS.voltage, points: voltage }}
              seriesB={{ label: 'Current (A)', unit: ' A', color: TELEMETRY_COLORS.current, points: current }}
              live={live}
            />
          ) : (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text3)' }}>
              No voltage/current readings for this session.
            </div>
          )}
        </Card>
      </div>
    );
  } else {
    body = (
      <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        {live ? 'Waiting for the first meter readings…' : 'No meter readings recorded for this session.'}
      </div>
    );
  }
  const liveTag = live ? (
    <span
      className="kc-pulse"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
        color: 'var(--ok)', padding: '2px 9px', borderRadius: 99,
        background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--ok)', display: 'inline-block' }} />
      LIVE
    </span>
  ) : undefined;
  return <Card title="Session performance" action={liveTag}>{body}</Card>;
}

type SessionEbmDetail = SessionEbm & { errorMessage: string | null };

/** EBM status → badge kind (avoids a nested ternary at the call site). */
function ebmStatusKind(status: string): 'ok' | 'err' | 'warn' {
  if (status === 'ISSUED') return 'ok';
  if (status === 'FAILED') return 'err';
  return 'warn';
}

/** 6-KPI header strip. */
function SessionKpis({
  s,
  avgPower,
  finalSoc,
}: Readonly<{ s: OrgSessionDetail['session']; avgPower: number | null; finalSoc: number | null }>) {
  return (
    <div className="mb-4">
      <SummaryStrip
        items={[
          { label: 'Energy Delivered', value: <>{s.chargedKwh == null ? '—' : s.chargedKwh.toFixed(1)} <small>kWh</small></> },
          { label: 'Amount Due', value: <>{s.totalAmount == null ? '—' : fmtNumber(s.totalAmount)} <small>RWF</small></>, delta: s.isPaid ? 'paid' : 'pending', deltaKind: s.isPaid ? 'ok' : 'err' },
          {
            label: 'Rate',
            value: (() => {
              const derived = s.ratePerKwh ?? (s.totalAmount != null && s.chargedKwh != null && s.chargedKwh > 0 ? s.totalAmount / s.chargedKwh : null);
              return <>{derived == null ? '—' : derived.toFixed(0)} <small>RWF/kWh</small></>;
            })(),
          },
          { label: 'Duration', value: duration(s.startTime, s.endTime), delta: s.endTime ? undefined : 'in progress', deltaKind: 'info' },
          { label: 'Average Power', value: <>{avgPower == null ? '—' : avgPower.toFixed(1)} <small>kW</small></> },
          { label: 'Final SoC', value: finalSoc == null ? '—' : `${finalSoc.toFixed(0)}%` },
        ]}
      />
    </div>
  );
}

/** Receipt & invoicing card. */
function ReceiptCard({ ebm, onGenerate }: Readonly<{ ebm: SessionEbmDetail | null; onGenerate?: () => void }>) {
  if (!ebm) {
    return (
      <Card title="Receipt & invoicing">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>Receipt status</span>
            <Badge kind="neutral">No receipt</Badge>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>No receipt has been generated.</div>
          <Btn size="sm" variant="default" icon="doc" disabled={!onGenerate} onClick={onGenerate}>
            Generate receipt
          </Btn>
        </div>
      </Card>
    );
  }
  return (
    <Card title="Receipt & invoicing">
      <InfoRow label="Receipt status"><Badge kind={ebmStatusKind(ebm.status)}>{ebm.status}</Badge></InfoRow>
      <InfoRow label="Receipt #"><span className="mono">{ebm.receiptNumber ?? '—'}</span></InfoRow>
      {ebm.errorMessage ? (
        <InfoRow label="EBM error"><span style={{ color: 'var(--err)' }}>{ebm.errorMessage}</span></InfoRow>
      ) : null}
      <InfoRow label="Invoice">
        {ebm.xeroInvoiceNumber ? <span className="mono">{ebm.xeroInvoiceNumber}</span> : <Badge kind="neutral">not invoiced</Badge>}
      </InfoRow>
      <InfoRow label="Xero payment">
        {ebm.xeroPaymentId ? (
          <Badge kind="ok">reconciled{ebm.xeroPaidAt ? ` ${fmtFull(ebm.xeroPaidAt)}` : ''}</Badge>
        ) : (
          <Badge kind="neutral">not paid</Badge>
        )}
      </InfoRow>
    </Card>
  );
}

/** Faults & exceptions card. */
function FaultsExceptionsCard({ degraded, faults }: Readonly<{ degraded: boolean; faults: SessionFault[] }>) {
  let body: React.ReactNode;
  if (degraded) {
    body = <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Fault correlation unavailable (telemetry degraded).</div>;
  } else if (faults.length === 0) {
    body = (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--ok)' }}><Icon name="check" size={20} /></span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 550 }}>No faults reported during this session.</div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>The session completed without any reported issues.</div>
        </div>
      </div>
    );
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faults.map((f, i) => (
          <div key={`${f.timestamp}-${i}`} style={{ display: 'flex', gap: 9, fontSize: 12.5 }}>
            <span style={{ color: 'var(--err)', marginTop: 1 }}><Icon name="alert" size={14} /></span>
            <div>
              <div style={{ fontWeight: 550 }}>
                {f.errorCode ?? 'Fault'}
                {f.connectorStatus ? <span style={{ color: 'var(--text3)', fontWeight: 400 }}> · {f.connectorStatus}</span> : null}
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 11.5 }}>
                {fmtFull(f.timestamp)}{f.info ? ` · ${f.info}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Card title="Faults & exceptions" action={faults.length ? <Badge kind="err">{faults.length}</Badge> : null}>
      {body}
    </Card>
  );
}

/** Loaded body — split out so `useSessionActions` can derive its toolbar /
 *  dialogs from a real session object (hooks can't run conditionally above the
 *  query's early returns in the shell). */
function SessionDetailLoaded({
  data,
  orgId,
  sessionId,
  base,
}: Readonly<{ data: OrgSessionDetail; orgId: string | null; sessionId: string; base: string }>) {
  const powerCurve = data.telemetry.powerCurve ?? null;
  const originMs = useMemo(
    () => (powerCurve?.length ? new Date(powerCurve[0].t).getTime() : undefined),
    [powerCurve],
  );
  const power = useMemo(() => metricPoints(powerCurve ?? [], (p) => p.powerKw, originMs), [powerCurve, originMs]);
  const energy = useMemo(() => metricPoints(powerCurve ?? [], (p) => p.energyKwh, originMs), [powerCurve, originMs]);
  const soc = useMemo(() => metricPoints(powerCurve ?? [], (p) => p.soc, originMs), [powerCurve, originMs]);
  const voltage = useMemo(() => metricPoints(powerCurve ?? [], (p) => p.voltageV, originMs), [powerCurve, originMs]);
  const current = useMemo(() => metricPoints(powerCurve ?? [], (p) => p.currentA, originMs), [powerCurve, originMs]);

  const avgPower = useMemo(() => (power.length ? power.reduce((a, p) => a + p.value, 0) / power.length : null), [power]);
  const finalSoc = useMemo(() => soc.at(-1)?.value ?? null, [soc]);

  const s = data.session;
  const st = sessionStatusBadge(s.sessionStatus);
  const live = isLiveStatus(s.sessionStatus);
  const completed = s.sessionStatus === 'COMPLETED';
  const ebm = s.ebms[0] ?? null;
  const faults = data.telemetry.faults ?? [];
  const statusTimeline = data.telemetry.statusTimeline ?? [];
  const hasTelemetry = !data.telemetry.degraded && (powerCurve?.length ?? 0) > 1;

  const actions = useSessionActions(orgId, sessionId, s);
  // Generate-receipt CTA inside ReceiptCard mirrors the toolbar's logic so an
  // unpaid completed session can issue a receipt from the in-card button too.
  const canGenerateReceipt = (completed || s.sessionStatus === 'PAID' || s.sessionStatus === 'EBM_ISSUED') && !ebm;

  return (
    <div style={{ padding: 'clamp(12px, 4vw, 24px)' }}>
      <PageHead
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 17 }}>{s.sessionId}</span>
            <Badge kind={st.kind} dot pulse={live}>{st.label}</Badge>
            {completed && !s.isPaid ? <Badge kind="warn">unpaid</Badge> : null}
          </span>
        }
        crumb={<Link href={`${base}/sessions`} style={{ color: 'var(--text3)' }}>Sessions</Link>}
        back
        sub={
          live
            ? `Live — running ${fmtElapsed(s.startTime)}`
            : `Started ${fmtFull(s.startTime)}${s.endTime ? ` · Ended ${fmtFull(s.endTime)}` : ''} · Duration ${duration(s.startTime, s.endTime)}`
        }
        actions={actions.toolbar}
      />

      {data.telemetry.degraded ? (
        <div style={{ marginBottom: 12 }}>
          <Badge kind="warn">telemetry degraded — power curve & faults unavailable</Badge>
        </div>
      ) : null}

      {/* KPI strip — 6 across, with leading icons */}
      <SessionKpis s={s} avgPower={avgPower} finalSoc={finalSoc} />

      {/* 2-column body */}
      <div className="kc-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Session performance — 2×2 telemetry grid */}
          <SessionPerformanceCard
            degraded={data.telemetry.degraded}
            hasTelemetry={hasTelemetry}
            live={live}
            power={power}
            energy={energy}
            soc={soc}
            voltage={voltage}
            current={current}
          />

          {/* Session timeline */}
          <Card title="Session timeline">
            {data.telemetry.degraded ? (
              <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Timeline unavailable (telemetry degraded).</div>
            ) : (
              <SessionTimeline start={s.startTime} end={s.endTime} statusTimeline={statusTimeline} isPaid={s.isPaid} completed={completed} />
            )}
          </Card>

          {/* Payment activity */}
          <Card
            title="Payment activity"
            pad={false}
            action={
              completed && !s.isPaid ? (
                <Btn size="xs" variant="default" icon="refresh" onClick={actions.openRetryPayment}>
                  Retry collection
                </Btn>
              ) : null
            }
          >
            <PaymentActivity transactions={s.transactions} />
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Card title="Driver & vehicle">
            {(() => {
              const primaryTx = s.transactions.find((t) => t.transactionStatus === 'COMPLETED') ?? s.transactions[0] ?? null;
              const fallbackName = primaryTx?.payerName ?? null;
              const fallbackPhone = primaryTx?.payerPhone ?? primaryTx?.paymentMethod?.momoNumber ?? null;
              const vehicleLabel = s.vehicle && (s.vehicle.make || s.vehicle.model)
                ? [s.vehicle.make, s.vehicle.model].filter(Boolean).join(' ')
                : s.carModelMake ?? null;
              return (
                <>
                  <InfoRow label="Customer">{s.customerName ?? fallbackName ?? 'Not captured'}</InfoRow>
                  <InfoRow label="Phone">
                    {s.customerPhone ?? fallbackPhone ? (
                      <span className="mono">{s.customerPhone ?? fallbackPhone}</span>
                    ) : 'Not captured'}
                  </InfoRow>
                  {s.ebmTin ? <InfoRow label="TIN"><span className="mono">{s.ebmTin}</span></InfoRow> : null}
                  <InfoRow label="Vehicle">{vehicleLabel ?? '—'}</InfoRow>
                  <InfoRow label="Plate"><span className="mono">{s.licensePlate ?? '—'}</span></InfoRow>
                  <InfoRow label="Operator">
                    {s.operator ? [s.operator.firstName, s.operator.lastName].filter(Boolean).join(' ') || '—' : '—'}
                  </InfoRow>
                  {primaryTx?.paymentMethod?.paymentMethodType ? (
                    <InfoRow label="Payment method">{primaryTx.paymentMethod.paymentMethodType}</InfoRow>
                  ) : null}
                </>
              );
            })()}
          </Card>

          <Card title="Station & connector">
            <InfoRow label="Charger">{s.charger?.name ?? '—'}</InfoRow>
            <InfoRow label="Connector">{s.gun?.name ?? s.pedestal?.name ?? '—'}</InfoRow>
            <InfoRow label="Station ID"><span className="mono">{s.citrineStationId ?? '—'}</span></InfoRow>
          </Card>

          <ReceiptCard ebm={ebm} onGenerate={canGenerateReceipt ? actions.openRegenReceipt : undefined} />

          <FaultsExceptionsCard degraded={data.telemetry.degraded} faults={faults} />
        </div>
      </div>

      {actions.dialogs}
    </div>
  );
}

export default function ConsoleSessionDetailPage() {
  const params = useParams<{ country: string; sessionId: string }>();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const sessionId = params.sessionId ? decodeURIComponent(params.sessionId) : null;

  const { data, isPending, isError, refetch } = useOrgSessionDetail(orgId, sessionId);
  const base = `/${params.country}/console`;

  if (isPending) {
    return (
      <div style={{ padding: 'clamp(12px, 4vw, 24px)' }}>
        <PageHead title="Session" crumb={<>Sessions</>} back />
        <div className="kc-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="kc-skeleton" style={{ height: 90 }} />
          ))}
          <span className="kc-skeleton" style={{ gridColumn: '1 / -1', height: 280 }} />
        </div>
      </div>
    );
  }

  if (isError || !data || !sessionId) {
    return (
      <div style={{ padding: 'clamp(12px, 4vw, 24px)' }}>
        <PageHead
          title="Session not found"
          crumb={<Link href={`${base}/sessions`} style={{ color: 'var(--text3)' }}>Sessions</Link>}
          back
        />
        <Card style={{ padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
          We couldn&apos;t load this session.
          <div style={{ marginTop: 10 }}>
            <Btn size="sm" onClick={() => refetch()}>Retry</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return <SessionDetailLoaded data={data} orgId={orgId} sessionId={sessionId} base={base} />;
}
