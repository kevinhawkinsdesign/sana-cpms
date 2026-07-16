'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Receipt, AlertCircle, CheckCircle, Search, Pencil, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            Sessions Missing EBM
          </h2>
          <p className="text-muted-foreground mt-1">
            Find paid sessions in a date range that don&apos;t have an EBM receipt yet, and generate
            EBMs in bulk. No TIN or purchase code. Customer phone is auto-filled from the paying
            transaction: MOMO uses the payer&apos;s MOMO number, MOMO Code uses no phone.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBackfill}
          disabled={backfilling}
          title="Flip PAID → EBM_ISSUED for sessions that already have a normal EBM"
          className="shrink-0"
        >
          {backfilling ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Backfilling…</>
          ) : (
            <><Wrench className="h-4 w-4 mr-2" />Backfill EBM status</>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label>Payment methods</Label>
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
                    className={
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors ' +
                      (active
                        ? 'bg-[#0E159A] border-[#0E159A] text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {sessions && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {sessions.length} session{sessions.length === 1 ? '' : 's'} missing EBM
              </CardTitle>
              {selectedIds.size > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">{selectedIds.size} selected</p>
              )}
            </div>
            <Button
              onClick={handleBulkGenerate}
              disabled={generating || selectedIds.size === 0}
              className="bg-[#0E159A] hover:bg-[#0B1178] text-white"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Receipt className="h-4 w-4 mr-2" />Generate EBMs ({selectedIds.size})</>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No paid sessions in this range are missing EBM. Nothing to do.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Charger</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">kWh</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => {
                      const result = results?.get(s.sessionId);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(s.sessionId)}
                              onCheckedChange={() => toggleRow(s.sessionId)}
                              disabled={generating || result?.status === 'success'}
                              aria-label={`Select ${s.sessionId}`}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(s.createdAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{s.sessionId}</TableCell>
                          <TableCell className="text-sm">{s.charger?.name || '-'}</TableCell>
                          <TableCell className="text-sm">
                            <div>{s.customerName || <span className="text-muted-foreground">—</span>}</div>
                            {s.customerPhone && (
                              <div className="text-xs text-muted-foreground">{s.customerPhone}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {s.chargedKwh != null ? s.chargedKwh.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-right">{formatRwf(s.totalAmount)}</TableCell>
                          <TableCell className="text-xs">{s.ebmPaymentMethodName || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {result ? (
                              result.status === 'success' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 border">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Generated
                                </Badge>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-700" title={result.message}>
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  <span className="truncate max-w-[200px]">{result.message}</span>
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditTarget(s)}
                              disabled={generating || result?.status === 'success'}
                              title="Generate with TIN / Purchase code / Customer info"
                            >
                              <Pencil className="h-4 w-4" />
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

      <EditAndGenerateDialog
        session={editTarget}
        onClose={() => setEditTarget(null)}
        onResult={applySingleResult}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Single-row edit + generate dialog
// ──────────────────────────────────────────────────────────────────────────

interface EditAndGenerateDialogProps {
  session: SessionMissingEbm | null;
  onClose: () => void;
  onResult: (sessionId: string, outcome: BulkGenerateResultItem) => void;
}

function EditAndGenerateDialog({ session, onClose, onResult }: EditAndGenerateDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [ebmTin, setEbmTin] = useState('');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields whenever a new row opens the dialog
  useState(() => 0); // noop to keep eslint calm if we ever add more state
  // Use effect-free sync: reset when `session` identity changes
  const [seededId, setSeededId] = useState<string | null>(null);
  if (session && session.id !== seededId) {
    setCustomerName(session.customerName ?? '');
    setCustomerPhone(session.customerPhone ?? '');
    setEbmTin('');
    setPurchaseCode('');
    setSeededId(session.id);
  }
  if (!session && seededId !== null) setSeededId(null);

  const hasTin = ebmTin.trim().length > 0;
  const tinLooksValid = !hasTin || /^\d{9}$/.test(ebmTin.trim());
  const purchaseOk = !hasTin || /^\d{6}$/.test(purchaseCode.trim());
  const canSubmit = !!session && !submitting && tinLooksValid && purchaseOk;

  const handleSubmit = async () => {
    if (!session) return;
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
    <Dialog open={!!session} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Generate EBM
          </DialogTitle>
        </DialogHeader>
        {session && (
          <div className="space-y-4">
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 space-y-0.5">
              <div className="font-mono break-all">{session.sessionId}</div>
              <div className="text-muted-foreground">
                {session.chargedKwh?.toFixed(2) ?? '0'} kWh · {formatRwf(session.totalAmount)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cname">Customer name <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Receipt className="h-4 w-4 mr-2" />Generate EBM</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
