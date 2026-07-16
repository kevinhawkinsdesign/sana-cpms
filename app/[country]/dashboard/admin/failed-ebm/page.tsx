'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Receipt, AlertCircle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-7 w-7 text-red-600" />
          Failed EBMs
        </h2>
        <p className="text-muted-foreground mt-1">
          EBMs that VSDC rejected. Edit customer info, TIN, purchase code, or sales type and retry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangeFilterRow
            from={from}
            to={to}
            loading={loading}
            onFromChange={setFrom}
            onToChange={setTo}
            onSearch={handleSearch}
            buttonLabel="Find failed EBMs"
          />
        </CardContent>
      </Card>

      {ebms && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {ebms.length} failed EBM{ebms.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ebms.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No failed EBMs in this range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Charger</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Sales Type</TableHead>
                      <TableHead>VSDC Error</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ebms.map((e) => {
                      const s = e.session;
                      const tin = s?.ebmTin;
                      const errMsg = e.vsdcErrorMessage || e.errorMessage || '-';
                      const errCode = e.vsdcErrorCode || e.errorCode;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{formatDate(e.createdAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{s?.sessionId || '-'}</TableCell>
                          <TableCell className="text-sm">{s?.charger?.name || '-'}</TableCell>
                          <TableCell className="text-sm">
                            <div>{s?.customerName || <span className="text-muted-foreground">—</span>}</div>
                            {s?.customerPhone && (
                              <div className="text-xs text-muted-foreground">{s.customerPhone}</div>
                            )}
                            {tin && (
                              <div className="text-xs text-muted-foreground">TIN: {tin}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right">{formatNum(s?.chargedKwh ?? null)}</TableCell>
                          <TableCell className="text-sm text-right">{formatRwf(s?.totalAmount ?? null)}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{salesTypeLabel(e.salesTypeCode)}</Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[260px]">
                            <div className="flex items-start gap-1 text-red-700">
                              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                {errCode && <div className="font-mono text-[10px] text-red-600">{errCode}</div>}
                                <div className="truncate" title={errMsg}>{errMsg}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-center">{e.retryCount}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditTarget(e)}
                              title="Edit fields and retry"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <EditAndRetryDialog
        ebm={editTarget}
        onClose={() => setEditTarget(null)}
        onRetried={handleRetried}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Edit + retry dialog
// ────────────────────────────────────────────────────────────────────────────

interface EditAndRetryDialogProps {
  ebm: FailedEbm | null;
  onClose: () => void;
  onRetried: (ebmId: string, outcome: 'success' | 'error') => void;
}

function EditAndRetryDialog({ ebm, onClose, onRetried }: EditAndRetryDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [ebmTin, setEbmTin] = useState('');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [salesType, setSalesType] = useState<'NORMAL' | 'TRAINING'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);

  // Reset fields when the target EBM identity changes
  const [seededId, setSeededId] = useState<string | null>(null);
  if (ebm && ebm.id !== seededId) {
    setCustomerName(ebm.session?.customerName ?? '');
    setCustomerPhone(ebm.session?.customerPhone ?? '');
    setEbmTin(ebm.session?.ebmTin ?? '');
    setPurchaseCode(ebm.session?.purchaseCode ?? '');
    setSalesType(ebm.salesTypeCode === 'T' ? 'TRAINING' : 'NORMAL');
    setSeededId(ebm.id);
  }
  if (!ebm && seededId !== null) setSeededId(null);

  const hasTin = ebmTin.trim().length > 0;
  const tinOk = !hasTin || /^\d{9}$/.test(ebmTin.trim());
  const purchaseOk = !hasTin || /^\d{6}$/.test(purchaseCode.trim());
  const canSubmit = !!ebm && !submitting && tinOk && purchaseOk;

  const handleSubmit = async () => {
    if (!ebm) return;
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
    <Dialog open={!!ebm} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Retry Failed EBM
          </DialogTitle>
        </DialogHeader>
        {ebm && (
          <div className="space-y-4">
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 space-y-1">
              <div className="font-mono break-all">{ebm.session?.sessionId || ebm.id}</div>
              <div className="text-muted-foreground">
                {formatNum(ebm.session?.chargedKwh ?? null)} kWh · {formatRwf(ebm.session?.totalAmount ?? null)}
              </div>
              {(ebm.vsdcErrorMessage || ebm.errorMessage) && (
                <div className="flex items-start gap-1 text-red-700 pt-1 border-t border-gray-200 mt-1">
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
                <Label>Sales type</Label>
                <div className="flex gap-2">
                  {(['NORMAL', 'TRAINING'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSalesType(v)}
                      disabled={submitting}
                      className={
                        'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ' +
                        (salesType === v
                          ? 'bg-[#0E159A] border-[#0E159A] text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                      }
                    >
                      {v === 'NORMAL' ? 'Normal Sale' : 'Training Sale'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cname">Customer name</Label>
                <Input
                  id="cname"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={submitting}
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
        )}
        <DialogFooter className="mt-2 sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#0E159A] hover:bg-[#0B1178] text-white"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying…</>
            ) : (
              <><CheckCircle className="h-4 w-4 mr-2" />Retry EBM</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
