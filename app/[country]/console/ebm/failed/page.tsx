'use client';

import { useState } from 'react';
import { Receipt, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Btn, Card, PageHead, TableCard } from '@/components/console/ui';
import { cn } from '@/lib/utils';
import { DateRangeFilterRow, CustomerTinPurchaseFields } from '@/components/dashboard/admin/ebm/EbmSharedFields';
import {
  listFailedEbms,
  retryFailedEbm,
  type FailedEbm,
} from '@/lib/api/adminMissingEbm';

const formatRwf = (amount: number | string | null) => {
  if (amount == null) return '-';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '-';
  return `${Math.round(n).toLocaleString()} RWF`;
};

const formatNum = (v: number | string | null, dp = 2) => {
  if (v == null) return '-';
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(dp);
};

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

const salesTypeLabel = (code: string | null) => {
  if (code === 'T') return 'Training';
  if (code === 'P') return 'Proforma';
  if (code === 'N' || code == null) return 'Normal';
  return code;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FailedEbmPage() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [ebms, setEbms] = useState<FailedEbm[] | null>(null);
  const [editTarget, setEditTarget] = useState<FailedEbm | null>(null);

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
    setEbms(null);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      const data = await listFailedEbms(fromIso, toIso);
      setEbms(data.ebms);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load EBMs');
    } finally {
      setLoading(false);
    }
  };

  const handleRetried = (ebmId: string, outcome: 'success' | 'error') => {
    // Drop succeeded rows so the working list converges on still-failing EBMs.
    if (outcome === 'success') {
      setEbms((prev) => prev?.filter((e) => e.id !== ebmId) ?? null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-error-500" />
            Failed EBMs
          </span>
        }
        sub="EBMs that VSDC rejected. Edit customer info, TIN, purchase code, or sales type and retry."
      />

      <Card title="Filters">
        <DateRangeFilterRow
          from={from}
          to={to}
          loading={loading}
          onFromChange={setFrom}
          onToChange={setTo}
          onSearch={handleSearch}
          buttonLabel="Find failed EBMs"
        />
      </Card>

      {ebms && (
        <TableCard
          title={`${ebms.length} failed EBM${ebms.length === 1 ? '' : 's'}`}
        >
          {ebms.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No failed EBMs in this range.
            </div>
          ) : (
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Charger</th>
                  <th>Customer</th>
                  <th className="text-right">kWh</th>
                  <th className="text-right">Amount</th>
                  <th>Sales Type</th>
                  <th>VSDC Error</th>
                  <th>Retries</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {ebms.map((e) => {
                  const s = e.session;
                  const tin = s?.ebmTin;
                  const errMsg = e.vsdcErrorMessage || e.errorMessage || '-';
                  const errCode = e.vsdcErrorCode || e.errorCode;
                  return (
                    <tr key={e.id}>
                      <td className="text-sm">{formatDate(e.createdAt)}</td>
                      <td className="font-mono text-xs">{s?.sessionId || '-'}</td>
                      <td className="text-sm">{s?.charger?.name || '-'}</td>
                      <td className="text-sm">
                        <div>{s?.customerName || <span className="text-gray-400">—</span>}</div>
                        {s?.customerPhone && (
                          <div className="text-xs text-gray-400">{s.customerPhone}</div>
                        )}
                        {tin && (
                          <div className="text-xs text-gray-400">TIN: {tin}</div>
                        )}
                      </td>
                      <td className="text-sm text-right">{formatNum(s?.chargedKwh ?? null)}</td>
                      <td className="text-sm text-right">{formatRwf(s?.totalAmount ?? null)}</td>
                      <td className="text-xs">
                        <Badge kind="neutral">{salesTypeLabel(e.salesTypeCode)}</Badge>
                      </td>
                      <td className="text-xs max-w-[260px]">
                        <div className="flex items-start gap-1 text-red-700">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            {errCode && <div className="font-mono text-[10px] text-red-600">{errCode}</div>}
                            <div className="truncate" title={errMsg}>{errMsg}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-center">{e.retryCount}</td>
                      <td className="text-right">
                        <Btn
                          size="xs"
                          onClick={() => setEditTarget(e)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry
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
        <EditAndRetryModal
          ebm={editTarget}
          onClose={() => setEditTarget(null)}
          onRetried={handleRetried}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Edit + retry modal
// ────────────────────────────────────────────────────────────────────────────

interface EditAndRetryModalProps {
  ebm: FailedEbm;
  onClose: () => void;
  onRetried: (ebmId: string, outcome: 'success' | 'error') => void;
}

function EditAndRetryModal({ ebm, onClose, onRetried }: EditAndRetryModalProps) {
  const [customerName, setCustomerName] = useState(ebm.session?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(ebm.session?.customerPhone ?? '');
  const [ebmTin, setEbmTin] = useState(ebm.session?.ebmTin ?? '');
  const [purchaseCode, setPurchaseCode] = useState(ebm.session?.purchaseCode ?? '');
  const [salesType, setSalesType] = useState<'NORMAL' | 'TRAINING'>(ebm.salesTypeCode === 'T' ? 'TRAINING' : 'NORMAL');
  const [submitting, setSubmitting] = useState(false);

  // Reset fields when the target EBM identity changes
  const [seededId, setSeededId] = useState<string | null>(ebm.id);
  if (ebm.id !== seededId) {
    setCustomerName(ebm.session?.customerName ?? '');
    setCustomerPhone(ebm.session?.customerPhone ?? '');
    setEbmTin(ebm.session?.ebmTin ?? '');
    setPurchaseCode(ebm.session?.purchaseCode ?? '');
    setSalesType(ebm.salesTypeCode === 'T' ? 'TRAINING' : 'NORMAL');
    setSeededId(ebm.id);
  }

  const hasTin = ebmTin.trim().length > 0;
  const tinOk = !hasTin || /^\d{9}$/.test(ebmTin.trim());
  const purchaseOk = !hasTin || /^\d{6}$/.test(purchaseCode.trim());
  const canSubmit = !submitting && tinOk && purchaseOk;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // null clears, undefined leaves as-is. Send null when an originally-populated
      // field is now empty, otherwise send the trimmed value.
      const asOverride = (original: string | null | undefined, current: string) => {
        const trimmed = current.trim();
        if (trimmed) return trimmed;
        return original ? null : undefined;
      };
      const res = await retryFailedEbm(ebm.id, {
        customerName: asOverride(ebm.session?.customerName, customerName),
        customerPhone: asOverride(ebm.session?.customerPhone, customerPhone),
        ebmTin: asOverride(ebm.session?.ebmTin, ebmTin),
        purchaseCode: asOverride(ebm.session?.purchaseCode, purchaseCode),
        salesType,
      });
      if (res.status === 'success') {
        toast.success(res.message || 'EBM generated successfully');
        onRetried(ebm.id, 'success');
        onClose();
      } else {
        const msg = res.data?.result?.errorMessage || res.data?.result?.message || res.message || 'EBM retry failed';
        toast.error(msg);
        onRetried(ebm.id, 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'EBM retry failed';
      toast.error(msg);
      onRetried(ebm.id, 'error');
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
          <RefreshCw className="h-5 w-5 text-brand-500" />
          Retry Failed EBM
        </h3>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-[#2A2A2A] dark:bg-white/5 dark:text-gray-300">
            <div className="font-mono break-all">{ebm.session?.sessionId || ebm.id}</div>
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              {formatNum(ebm.session?.chargedKwh ?? null)} kWh · {formatRwf(ebm.session?.totalAmount ?? null)}
            </div>
            {(ebm.vsdcErrorMessage || ebm.errorMessage) && (
              <div className="flex items-start gap-1 pt-1 mt-1 border-t border-gray-200 text-red-700 dark:border-gray-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  {(ebm.vsdcErrorCode || ebm.errorCode) && (
                    <span className="font-mono text-[10px] mr-1">[{ebm.vsdcErrorCode || ebm.errorCode}]</span>
                  )}
                  {ebm.vsdcErrorMessage || ebm.errorMessage}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Sales type
              </label>
              <div className="flex gap-2">
                {(['NORMAL', 'TRAINING'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSalesType(v)}
                    disabled={submitting}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                      salesType === v
                        ? 'bg-[#0B4F42] border-[#0B4F42] text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-[#1A1A1A] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5'
                    )}
                  >
                    {v === 'NORMAL' ? 'Normal Sale' : 'Training Sale'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cname" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Customer name
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
            {submitting ? 'Retrying...' : (
              <>
                <CheckCircle className="h-4 w-4" />
                Retry EBM
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}
