'use client';

import { useState } from 'react';
import { Receipt, AlertCircle, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Btn, Card, PageHead, TableCard } from '@/components/console/ui';
import { cn } from '@/lib/utils';
import { DateRangeFilterRow, CustomerTinPurchaseFields } from '@/components/dashboard/admin/ebm/EbmSharedFields';
import {
  listSessionsMissingEbm,
  bulkGenerateEbm,
  backfillEbmIssuedStatus,
  type SessionMissingEbm,
  type BulkGenerateResultItem,
  type PaymentMethodType,
} from '@/lib/api/adminMissingEbm';
import { generateEbm } from '@/lib/api/chargingSessions';

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: 'MOMO', label: 'MOMO' },
  { value: 'MOMO_CODE_PAYMENT', label: 'MOMO Code' },
  { value: 'CARD', label: 'Card' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'FREE_ALLOWANCE', label: 'Free allowance' },
  { value: 'BALANCE', label: 'Balance' },
  { value: 'KABISA', label: 'Kabisa' },
];

const formatRwf = (amount: number | null) =>
  amount == null ? '-' : `${Math.round(amount).toLocaleString()} RWF`;

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function MissingEbmPage() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  // MOMO_CODE_PAYMENT is intentionally unselected by default — those sessions
  // cannot receive an EBM. It remains selectable for visibility only.
  const [paymentMethods, setPaymentMethods] = useState<Set<PaymentMethodType>>(
    new Set<PaymentMethodType>(['MOMO'])
  );
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionMissingEbm[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Map<string, BulkGenerateResultItem> | null>(null);
  const [editTarget, setEditTarget] = useState<SessionMissingEbm | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    if (!window.confirm('Flip every PAID session that already has a normal EBM to EBM_ISSUED?\n\nSafe + idempotent — fixes stuck rows from before the status-flip logic landed.')) {
      return;
    }
    setBackfilling(true);
    try {
      const data = await backfillEbmIssuedStatus();
      if (data.updated === 0) {
        toast.info('Nothing to backfill — all EBM sessions already flipped.');
      } else {
        toast.success(`Backfilled ${data.updated} session${data.updated === 1 ? '' : 's'} → EBM_ISSUED`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  const handleSearch = async () => {
    if (!from || !to) {
      toast.error('Please choose both From and To dates');
      return;
    }
    if (new Date(from) > new Date(to)) {
      toast.error('"From" must not be after "To"');
      return;
    }
    setLoading(true);
    setSessions(null);
    setSelectedIds(new Set());
    setResults(null);
    try {
      // Cover the full "to" day up to 23:59:59
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      const types = Array.from(paymentMethods);
      if (types.length === 0) {
        toast.error('Select at least one payment method');
        return;
      }
      const data = await listSessionsMissingEbm(fromIso, toIso, types);
      setSessions(data.sessions);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (sessionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!sessions) return;
    if (selectedIds.size === sessions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sessions.map((s) => s.sessionId)));
  };

  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setGenerating(true);
    try {
      const data = await bulkGenerateEbm(ids);
      const map = new Map<string, BulkGenerateResultItem>();
      data.results.forEach((r) => map.set(r.sessionId, r));
      setResults(map);
      if (data.failed === 0) {
        toast.success(`Generated ${data.successful} EBM(s)`);
      } else {
        toast.warning(`Generated ${data.successful}, ${data.failed} failed — see rows for details`);
      }
      // Drop successes from the working list so remaining list = still-missing
      setSessions((prev) => prev?.filter((s) => map.get(s.sessionId)?.status !== 'success') ?? null);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Bulk generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Single-row generate outcome → fold into the results map + drop from the
  // working list on success so the UI converges with the bulk flow.
  const applySingleResult = (sessionId: string, outcome: BulkGenerateResultItem) => {
    setResults((prev) => {
      const next = new Map(prev ?? []);
      next.set(sessionId, outcome);
      return next;
    });
    if (outcome.status === 'success') {
      setSessions((prev) => prev?.filter((s) => s.sessionId !== sessionId) ?? null);
    }
  };

  const allSelected = !!sessions?.length && selectedIds.size === sessions.length;

  return (
    <div className="space-y-6">
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-500" />
            Sessions Missing EBM
          </span>
        }
        sub="Find paid sessions in a date range that don't have an EBM receipt yet, and generate EBMs in bulk. No TIN or purchase code. Customer phone is auto-filled from the paying transaction: MOMO uses the payer's MOMO number, MOMO Code uses no phone."
        actions={
          <Btn
            variant="default"
            size="sm"
            icon="wrench"
            onClick={handleBackfill}
            disabled={backfilling}
            loading={backfilling}
          >
            {backfilling ? 'Backfilling...' : 'Backfill EBM status'}
          </Btn>
        }
      />

      <Card title="Filters">
        <div className="space-y-4">
          <DateRangeFilterRow
            from={from}
            to={to}
            loading={loading}
            onFromChange={setFrom}
            onToChange={setTo}
            onSearch={handleSearch}
            buttonLabel="Find sessions"
          />
          <div className="space-y-1.5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Payment methods
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHOD_OPTIONS.map(({ value, label }) => {
                const active = paymentMethods.has(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPaymentMethods((prev) => {
                        const next = new Set(prev);
                        if (next.has(value)) next.delete(value);
                        else next.add(value);
                        return next;
                      });
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-[#08294f] border-[#08294f] text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-[#1A1A1A] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {sessions && (
        <TableCard
          title={`${sessions.length} session${sessions.length === 1 ? '' : 's'} missing EBM`}
          totalLabel={selectedIds.size > 0 ? `${selectedIds.size} selected` : undefined}
          action={
            <Btn
              variant="primary"
              size="sm"
              onClick={handleBulkGenerate}
              disabled={generating || selectedIds.size === 0}
              loading={generating}
            >
              {generating ? 'Generating...' : (
                <>
                  <Receipt className="h-4 w-4" />
                  Generate EBMs ({selectedIds.size})
                </>
              )}
            </Btn>
          }
        >
          {sessions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No paid sessions in this range are missing EBM. Nothing to do.
            </div>
          ) : (
            <table className="kc-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10"
                    />
                  </th>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Charger</th>
                  <th>Customer</th>
                  <th className="text-right">kWh</th>
                  <th className="text-right">Amount</th>
                  <th>Payment</th>
                  <th>Result</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const result = results?.get(s.sessionId);
                  return (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.sessionId)}
                          onChange={() => toggleRow(s.sessionId)}
                          disabled={generating || result?.status === 'success'}
                          aria-label={`Select ${s.sessionId}`}
                          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/10"
                        />
                      </td>
                      <td className="text-sm">{formatDate(s.createdAt)}</td>
                      <td className="font-mono text-xs">{s.sessionId}</td>
                      <td className="text-sm">{s.charger?.name || '-'}</td>
                      <td className="text-sm">
                        <div>{s.customerName || <span className="text-gray-400">—</span>}</div>
                        {s.customerPhone && (
                          <div className="text-xs text-gray-400">{s.customerPhone}</div>
                        )}
                      </td>
                      <td className="text-sm text-right">
                        {s.chargedKwh != null ? s.chargedKwh.toFixed(2) : '-'}
                      </td>
                      <td className="text-sm text-right">{formatRwf(s.totalAmount)}</td>
                      <td className="text-xs">{s.ebmPaymentMethodName || '-'}</td>
                      <td className="text-xs">
                        {result ? (
                          result.status === 'success' ? (
                            <Badge kind="ok">
                              <CheckCircle className="h-3 w-3" />
                              Generated
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700" title={result.message}>
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[200px]">{result.message}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Btn
                          variant="ghost"
                          size="xs"
                          onClick={() => setEditTarget(s)}
                          disabled={generating || result?.status === 'success'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TableCard>
      )}

      {editTarget && (
        <EditAndGenerateModal
          session={editTarget}
          onClose={() => setEditTarget(null)}
          onResult={applySingleResult}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Single-row edit + generate modal
// ──────────────────────────────────────────────────────────────────────────

interface EditAndGenerateModalProps {
  session: SessionMissingEbm;
  onClose: () => void;
  onResult: (sessionId: string, outcome: BulkGenerateResultItem) => void;
}

function EditAndGenerateModal({ session, onClose, onResult }: EditAndGenerateModalProps) {
  const [customerName, setCustomerName] = useState(session.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(session.customerPhone ?? '');
  const [ebmTin, setEbmTin] = useState('');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields when session identity changes
  const [seededId, setSeededId] = useState<string | null>(session.id);
  if (session.id !== seededId) {
    setCustomerName(session.customerName ?? '');
    setCustomerPhone(session.customerPhone ?? '');
    setEbmTin('');
    setPurchaseCode('');
    setSeededId(session.id);
  }

  const hasTin = ebmTin.trim().length > 0;
  const tinLooksValid = !hasTin || /^\d{9}$/.test(ebmTin.trim());
  const purchaseOk = !hasTin || /^\d{6}$/.test(purchaseCode.trim());
  const canSubmit = !submitting && tinLooksValid && purchaseOk;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        sessionId: session.id, // backend generate endpoint wants the Prisma id
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        ebmTin: ebmTin.trim() || undefined,
        purchaseCode: purchaseCode.trim() || undefined,
      };
      const res = await generateEbm(payload);
      if (res.status === 'completed') {
        toast.success('EBM generated successfully');
        onResult(session.sessionId, {
          sessionId: session.sessionId,
          status: 'success',
          message: res.message,
        });
        onClose();
      } else {
        const msg = res.errorMessage || res.message || 'EBM generation failed';
        toast.error(msg);
        onResult(session.sessionId, {
          sessionId: session.sessionId,
          status: 'error',
          message: msg,
          errorCode: res.errorCode,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'EBM generation failed';
      toast.error(msg);
      onResult(session.sessionId, {
        sessionId: session.sessionId,
        status: 'error',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[16vh]">
      <button
        type="button"
        aria-label="Close"
        onClick={() => { if (!submitting) onClose(); }}
        className="absolute inset-0 cursor-default border-none bg-black/50"
      />
      <div className="kc-fadeup relative w-[500px] max-w-[calc(100vw-32px)] rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white/90">
          <Receipt className="h-5 w-5 text-brand-500" />
          Generate EBM
        </h3>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-[#2A2A2A] dark:bg-white/5 dark:text-gray-300">
            <div className="font-mono break-all">{session.sessionId}</div>
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              {session.chargedKwh?.toFixed(2) ?? '0'} kWh · {formatRwf(session.totalAmount)}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="cname" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Customer name <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="cname"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={submitting}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 focus:outline-none dark:border-gray-700 dark:bg-transparent dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <CustomerTinPurchaseFields
              customerPhone={customerPhone}
              ebmTin={ebmTin}
              purchaseCode={purchaseCode}
              submitting={submitting}
              onCustomerPhoneChange={setCustomerPhone}
              onTinChange={setEbmTin}
              onPurchaseCodeChange={setPurchaseCode}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Btn size="sm" onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
          >
            {submitting ? 'Generating...' : (
              <>
                <Receipt className="h-4 w-4" />
                Generate EBM
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}
