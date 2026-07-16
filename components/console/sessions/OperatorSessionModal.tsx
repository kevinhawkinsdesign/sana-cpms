'use client';

/** Compact session detail modal for the operator console. Uses console design
 *  components (Dialog, Badge, Btn) instead of the old full-width dashboard modal.
 *  Shown when an operator clicks a row in My Sessions or Operator Dashboard. */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, Btn, type BadgeKind } from '@/components/console/ui';
import { useOperatorWs } from '@/lib/hooks/useOperatorWs';
import { getVehicleLicensePlateNumber } from '@/lib/utils/vehicleUtils';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import type { Session } from '@/lib/api/chargingSessions';

/* ---- Helpers ---- */

function InfoRow({ label, children, mono }: Readonly<{ label: string; children: React.ReactNode; mono?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[12px] sm:text-[13px]">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className={`text-right min-w-0 break-all text-slate-900 dark:text-white/90 ${mono ? 'font-mono text-[11px] sm:text-xs' : ''}`}>
        {children}
      </span>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/30">
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </div>
  );
}

function statusBadge(status: string): { kind: BadgeKind; label: string } {
  switch (status) {
    case 'STARTED': return { kind: 'charge', label: 'Charging' };
    case 'PAUSED': return { kind: 'warn', label: 'Paused' };
    case 'COMPLETED': return { kind: 'info', label: 'Completed' };
    case 'PAID': return { kind: 'ok', label: 'Paid' };
    case 'EBM_ISSUED': return { kind: 'ok', label: 'Receipt issued' };
    case 'CANCELLED': return { kind: 'neutral', label: 'Cancelled' };
    case 'REFUNDED': return { kind: 'neutral', label: 'Refunded' };
    default: return { kind: 'neutral', label: status };
  }
}

function txStatusKind(s: string): BadgeKind {
  if (s === 'COMPLETED') return 'ok';
  if (s === 'FAILED') return 'err';
  if (s === 'PENDING') return 'warn';
  return 'neutral';
}

function ebmBadge(ebm: { receiptNumber?: number | null; salesTypeCode?: string | null }): { kind: BadgeKind; label: string } {
  if (ebm.receiptNumber) return { kind: 'ok', label: ebm.salesTypeCode === 'T' ? 'Training' : 'Issued' };
  return { kind: 'neutral', label: 'Pending' };
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-RW', { maximumFractionDigits: 0 });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDuration(start: string, end: string | null): string {
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((to - new Date(start).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins} minutes`;
}

/* ---- Component ---- */

interface OperatorSessionModalProps {
  open: boolean;
  session: Session | null;
  onClose: () => void;
  onCustomerInfoSaved?: () => void | Promise<void>;
}

export function OperatorSessionModal({ open, session, onClose }: Readonly<OperatorSessionModalProps>) {
  const router = useLocalizedRouter();
  const [liveKwh, setLiveKwh] = useState<number | null>(null);
  const [liveSoc, setLiveSoc] = useState<number | null>(null);

  useEffect(() => {
    setLiveKwh(session?.chargedKwh ?? null);
    setLiveSoc(session?.endSoc ?? null);
  }, [session?.id, session?.chargedKwh, session?.endSoc]);

  useOperatorWs({
    onSessionTelemetry: ({ sessionId, chargedKwh, currentSoc }) => {
      if (!session || sessionId !== session.id) return;
      if (chargedKwh != null) setLiveKwh(chargedKwh);
      if (currentSoc != null) setLiveSoc(currentSoc);
    },
  });

  if (!session) return null;

  const st = statusBadge(session.sessionStatus);
  const live = session.sessionStatus === 'STARTED' || session.sessionStatus === 'PAUSED';
  const kwh = liveKwh ?? session.chargedKwh;
  const rate = kwh && kwh > 0 && session.totalAmount ? Math.round(session.totalAmount / kwh) : null;
  const plate = getVehicleLicensePlateNumber(session.vehicle);
  const vehicleLabel = session.vehicle?.make || session.vehicle?.model
    ? [session.vehicle.make, session.vehicle.model].filter(Boolean).join(' ')
    : session.carModelMake ?? null;
  const operatorName = session.operator
    ? [session.operator.firstName, session.operator.lastName].filter(Boolean).join(' ') || null
    : null;
  const transactions = session.transactions ?? [];
  const ebms = session.ebms ?? [];

  const handleEndSession = () => {
    onClose();
    router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${plate}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-4 sm:p-5 max-h-[70vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap pr-6">
            <DialogTitle className="text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">{session.sessionId}</DialogTitle>
            <Badge kind={st.kind} dot={live} pulse={live}>{st.label}</Badge>
            {session.source === 'REMOTE' ? <Badge kind="info">Remote</Badge> : null}
            {!session.isPaid && session.sessionStatus === 'COMPLETED' ? <Badge kind="err">unpaid</Badge> : null}
          </div>
        </DialogHeader>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-2 py-2.5 dark:border-slate-800 dark:bg-slate-900/30">
          {[
            { label: 'Energy', value: kwh != null ? `${kwh.toFixed(1)} kWh` : '—' },
            { label: 'Amount', value: session.totalAmount != null ? `${fmtNumber(session.totalAmount)} RWF` : '—' },
            { label: 'Rate', value: rate != null ? `${fmtNumber(rate)}/kWh` : '—' },
            { label: 'SoC', value: liveSoc != null ? `${liveSoc}%` : (session.endSoc != null ? `${session.endSoc}%` : '—') },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{m.label}</div>
              <div className="mt-0.5 text-[13px] font-semibold text-slate-900 dark:text-white">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          {/* Customer */}
          <Section title="Customer">
            <InfoRow label="Name">{session.customerName ?? 'Not captured'}</InfoRow>
            <InfoRow label="Phone" mono>{session.customerPhone ?? '—'}</InfoRow>
            {session.ebmTin ? <InfoRow label="TIN" mono>{session.ebmTin}</InfoRow> : null}
          </Section>

          {/* Resources */}
          <Section title="Resources">
            <InfoRow label="Vehicle">{vehicleLabel ?? '—'}</InfoRow>
            <InfoRow label="Plate" mono>{plate || '—'}</InfoRow>
            {operatorName ? <InfoRow label="Operator">{operatorName}</InfoRow> : null}
            {session.operator?.email ? <InfoRow label="Email" mono>{session.operator.email}</InfoRow> : null}
            <InfoRow label="Charger">{session.charger?.name ?? '—'}</InfoRow>
            <InfoRow label="Gun">{session.gun?.name ?? '—'}</InfoRow>
            {session.pedestal ? <InfoRow label="Pedestal">{session.pedestal.name ?? '—'}</InfoRow> : null}
          </Section>

          {/* Timing */}
          <Section title="Timing">
            <InfoRow label="Started">{fmtTime(session.startTime)}</InfoRow>
            <InfoRow label="Ended">{session.endTime ? fmtTime(session.endTime) : (live ? 'In progress' : '—')}</InfoRow>
            <InfoRow label="Duration">{fmtDuration(session.startTime, session.endTime)}</InfoRow>
            <InfoRow label="Created">{fmtTime(session.createdAt)}</InfoRow>
          </Section>

          {/* Energy */}
          <Section title="Energy">
            <InfoRow label="Charged">{kwh != null ? `${kwh.toFixed(2)} kWh` : '—'}</InfoRow>
            <InfoRow label="Start SoC">{session.startSoc != null ? `${session.startSoc}%` : '—'}</InfoRow>
            <InfoRow label="End SoC">{liveSoc != null ? `${liveSoc}%` : (session.endSoc != null ? `${session.endSoc}%` : '—')}</InfoRow>
            {(session as any).odometerReading != null ? (
              <InfoRow label="Odometer">{(session as any).odometerReading.toLocaleString()} km</InfoRow>
            ) : null}
          </Section>

          {/* Payment */}
          <Section title="Payment">
            <InfoRow label="Status">
              {session.isPaid
                ? <span className="text-emerald-600 font-medium">Paid</span>
                : <span className="text-amber-600 font-medium">Unpaid</span>}
            </InfoRow>
            {session.paymentMethodName ? <InfoRow label="Method">{session.paymentMethodName}</InfoRow> : null}
            {session.totalAmount != null ? <InfoRow label="Amount" mono>{fmtNumber(session.totalAmount)} RWF</InfoRow> : null}
            {session.hasDiscount && session.discountRate != null ? (
              <InfoRow label="Discount">{session.discountRate}%</InfoRow>
            ) : null}
            {session.hasDiscount && session.discountAmount != null ? (
              <InfoRow label="Discount amount" mono>{fmtNumber(session.discountAmount)} RWF</InfoRow>
            ) : null}
          </Section>

          {/* Transactions */}
          {transactions.length > 0 ? (
            <Section title="Transactions">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                  <div className="min-w-0">
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {t.paymentMethod?.paymentMethodType ?? 'Payment'}
                    </span>
                    {t.momoExternalId ? (
                      <span className="ml-1.5 text-slate-400">{t.momoExternalId}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono">{t.amount != null ? `${fmtNumber(t.amount)} ${t.currency ?? 'RWF'}` : ''}</span>
                    <Badge kind={txStatusKind(t.transactionStatus)}>{t.transactionStatus}</Badge>
                  </div>
                </div>
              ))}
            </Section>
          ) : null}

          {/* Receipts / EBMs */}
          {ebms.length > 0 ? (
            <Section title="Receipts">
              {ebms.map((e) => {
                const eb = ebmBadge(e);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                    <div className="min-w-0">
                      <span className="text-slate-700 dark:text-slate-200">
                        {e.receiptNumber ? `#${e.receiptNumber}` : 'Receipt'}
                      </span>
                      {e.cisInvoiceNumber ? (
                        <span className="ml-1.5 font-mono text-slate-400">{e.cisInvoiceNumber}</span>
                      ) : null}
                    </div>
                    <Badge kind={eb.kind}>{eb.label}</Badge>
                  </div>
                );
              })}
            </Section>
          ) : null}

          {/* Notes */}
          {(session.description || session.commonSessionTag) ? (
            <Section title="Notes">
              {session.description ? <InfoRow label="Description">{session.description}</InfoRow> : null}
              {session.commonSessionTag ? <InfoRow label="Tag" mono>{session.commonSessionTag}</InfoRow> : null}
            </Section>
          ) : null}
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          {live && session.source !== 'REMOTE' ? (
            <Btn variant="danger" onClick={handleEndSession}>End Session</Btn>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
