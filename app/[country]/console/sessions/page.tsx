'use client';

/** Console Sessions list (FE-4 / KAB-109): one searchable, paginated table over
 *  GET /api/orgs/:id/sessions, filtered by Status + Period dropdowns (Citrine/
 *  SteVe pattern — no per-status tabs). Rows link to the session detail
 *  drill-down. Polls every 30s so active sessions stay current. */
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import { Badge, Btn, Icon, PageHead, Select, SummaryStrip, TableCard, rowNav, useConsoleNav } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsoleConfirm, SessionPayDialog } from '@/components/console/sessions/sessionActions';
import { isForbiddenError, useOrgs } from '@/lib/console/orgs';
import { fmtElapsed, fmtNumber } from '@/lib/console/dashboard';
import {
  isLiveStatus,
  sessionMutationErrorMessage,
  sessionStatusBadge,
  useCancelSession,
  useDeleteSession,
  useRetrySessionMomo,
  useRetrySessionMomoCode,
  useMarkSessionPaid,
  useOrgSessions,
  type OrgSessionRow,
  type SessionTab,
} from '@/lib/console/sessions';

// Status is a filter (Citrine/SteVe pattern) — one table, no per-status tabs.
const STATUS_FILTER: Array<{ id: SessionTab; label: string }> = [
  { id: 'all', label: 'All statuses' },
  { id: 'active', label: 'Live' },
  { id: 'completed', label: 'Completed' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'cancelled', label: 'Cancelled' },
];

// Date-range presets (SteVe period filter). `days` is how many days back from
// today the window starts; null = all time.
const DATE_RANGES: Array<{ id: string; label: string; days: number | null }> = [
  { id: 'all', label: 'All time', days: null },
  { id: 'today', label: 'Today', days: 0 },
  { id: '7d', label: 'Last 7 days', days: 6 },
  { id: '30d', label: 'Last 30 days', days: 29 },
];

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rangeToDates(id: string): { startDate?: string; endDate?: string } {
  const r = DATE_RANGES.find((x) => x.id === id);
  if (!r || r.days === null) return {};
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - r.days);
  return { startDate: ymd(start), endDate: ymd(end) };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Session duration start→end (or elapsed for a live session). A non-live
 *  session with no endTime (e.g. cancelled) has no meaningful duration → '—'
 *  rather than an ever-growing now-minus-start. */
function fmtSessionDuration(start: string, end: string | null, live: boolean): string {
  if (!end && !live) return '—';
  const to = end ? new Date(end).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((to - new Date(start).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

function operatorName(o: { firstName: string | null; lastName: string | null } | null): string {
  if (!o) return '—';
  return [o.firstName, o.lastName].filter(Boolean).join(' ') || '—';
}

/** EBM receipt badge for the session's first receipt. */
function ebmBadge(status: string | undefined): { kind: 'ok' | 'err' | 'warn' | 'neutral'; label: string } {
  if (!status) return { kind: 'neutral', label: '—' };
  if (status === 'ISSUED') return { kind: 'ok', label: 'issued' };
  if (status === 'FAILED') return { kind: 'err', label: 'failed' };
  return { kind: 'warn', label: status.toLowerCase() };
}

/** Best-effort payment method for the list (rows carry MoMo signals + the
 *  initiator, but not the precise paymentMethodType — that's on the detail).
 *  MoMo when a MoMo id/phone is present; Manual for an admin write-off; — else.
 *  TODO: include `paymentMethod.paymentMethodType` in the list query for exact
 *  Cash/Card/etc. labels (one-line backend select add). */
function paymentMethodLabel(row: OrgSessionRow): string {
  const t = row.transactions?.[0];
  if (!t) return '—';
  if (t.initiatedByType === 'ADMIN') return 'Manual';
  if (t.momoExternalId || t.payerPhone) return 'MoMo';
  return '—';
}

/** Which row action the user picked → drives the confirm dialog. The session
 *  the action targets travels in `target` so the dialog can name it. */
type RowAction = 'cancel' | 'delete';
const ROW_ACTION_COPY: Record<
  RowAction,
  { title: string; description: string; confirm: string; variant: 'warning' | 'info' | 'destructive'; success: string; error: string }
> = {
  cancel: {
    title: 'Cancel this session?',
    description: 'The session will be moved to CANCELLED. (Reason is set to "cancelled from console list" — use the detail page if you need to record a custom reason.)',
    confirm: 'Cancel session',
    variant: 'destructive',
    success: 'Session cancelled',
    error: 'Failed to cancel session',
  },
  delete: {
    title: 'Delete this session?',
    description: 'This permanently removes the session and its telemetry. Payment records are kept. This action cannot be undone.',
    confirm: 'Delete session',
    variant: 'destructive',
    success: 'Session deleted',
    error: 'Failed to delete session',
  },
};

/** Per-row ⋯ menu. Status-conditional items so we never show "Stop" on a
 *  completed session or "Retry payment" on a paid one. */
function SessionRowMenu({
  row,
  onAction,
  onPay,
}: Readonly<{ row: OrgSessionRow; onAction: (kind: RowAction, row: OrgSessionRow) => void; onPay: (row: OrgSessionRow) => void }>) {
  const live = isLiveStatus(row.sessionStatus);
  const completed = row.sessionStatus === 'COMPLETED' || row.sessionStatus === 'PAID' || row.sessionStatus === 'EBM_ISSUED';
  const unpaid = completed && !row.isPaid;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Row actions"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="dots" size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        className="kc-fadeup z-50 min-w-[180px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
        onClick={(e) => e.stopPropagation()}
      >
        {live ? (
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            onSelect={() => onAction('cancel', row)}
          >
            <Icon name="x" size={13} /> Cancel session
          </DropdownMenu.Item>
        ) : null}
        {unpaid ? (
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            onSelect={() => onPay(row)}
          >
            <Icon name="refresh" size={13} /> Collect payment
          </DropdownMenu.Item>
        ) : null}
        {(live || unpaid) ? (
          <DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-gray-800" />
        ) : null}
        <DropdownMenu.Item
          className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          onSelect={() => onAction('delete', row)}
        >
          <Icon name="x" size={13} /> Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default function ConsoleSessionsPage() {
  const params = useParams<{ country: string }>();
  const navigate = useConsoleNav();
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;

  const [tab, setTab] = useState<SessionTab>('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { startDate, endDate } = rangeToDates(range);
  const { data, isPending, isError, error, refetch, isFetching } = useOrgSessions(orgId, {
    page,
    status: tab,
    search: search || undefined,
    startDate,
    endDate,
  });

  // Row admin actions — single confirm dialog driven by `target`. We call the
  // mutation hooks once at the top (sessionId=null is fine — invalidation on
  // ['console','sessions',orgId] is what we care about for the list view).
  const [target, setTarget] = useState<{ kind: RowAction; row: OrgSessionRow } | null>(null);
  const [cancelRow, setCancelRow] = useState<OrgSessionRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [payRow, setPayRow] = useState<OrgSessionRow | null>(null);
  const cancel = useCancelSession(orgId, null);
  const del = useDeleteSession(orgId, null);
  const retryMomo = useRetrySessionMomo(orgId, null);
  const retryMomoCode = useRetrySessionMomoCode(orgId, null);
  const markPaid = useMarkSessionPaid(orgId, null);

  const runCancelSession = async () => {
    if (!cancelRow) return;
    const reason = cancelReason.trim() || 'Cancelled from console';
    try {
      await cancel.mutateAsync({ id: cancelRow.id, reason });
      toast.success('Session cancelled');
      setCancelRow(null);
      setCancelReason('');
    } catch (e) {
      toast.error(sessionMutationErrorMessage(e, 'Failed to cancel session'));
    }
  };

  const runRowAction = async () => {
    if (!target) return;
    const { kind, row } = target;
    const copy = ROW_ACTION_COPY[kind];
    try {
      if (kind === 'delete') await del.mutateAsync(row.id);
      toast.success(copy.success);
      setTarget(null);
    } catch (e) {
      toast.error(sessionMutationErrorMessage(e, copy.error));
    }
  };

  const pendingByKind: Record<RowAction, boolean> = {
    cancel: cancel.isPending,
    delete: del.isPending,
  };

  // Permission denied (e.g. role lost view_sessions) — show a clear message
  // rather than the generic load error.
  if (isError && isForbiddenError(error)) {
    return <AccessDenied message="You don't have permission to view sessions." />;
  }

  const base = `/${params.country}/console`;
  const totals = data?.totals;

  const statusLabel = STATUS_FILTER.find((s) => s.id === tab)?.label ?? 'All statuses';
  const rangeLabel = DATE_RANGES.find((r) => r.id === range)?.label ?? 'All time';

  return (
    <div className="space-y-4 p-6">
      <PageHead title="Sessions" sub="Charging sessions, payments, and receipts" />

      <TableCard
        title="Sessions"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => { setPage(1); setSearch(searchInput.trim()); }}
        page={data?.pagination.page}
        totalPages={data?.pagination.totalPages}
        totalItems={data?.pagination.total}
        onPageChange={setPage}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
            <Select
              options={STATUS_FILTER.map((s) => s.label)}
              value={statusLabel}
              onChange={(label) => {
                const next = STATUS_FILTER.find((s) => s.label === label)?.id ?? 'all';
                setTab(next);
                setPage(1);
              }}
              style={{ width: 150 }}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Period</span>
            <Select
              options={DATE_RANGES.map((r) => r.label)}
              value={rangeLabel}
              onChange={(label) => {
                const next = DATE_RANGES.find((r) => r.label === label)?.id ?? 'all';
                setRange(next);
                setPage(1);
              }}
              style={{ width: 150 }}
            />
          </label>
        </div>

        {(() => {
          if (isPending) return (
            <div className="flex flex-col gap-2 p-3.5">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="kc-skeleton h-9 rounded-md" />
              ))}
            </div>
          );
          if (isError) return (
            <div className="p-7 text-center text-sm text-gray-400">
              Couldn&apos;t load sessions.
              <div className="mt-2.5">
                <Btn size="sm" onClick={() => refetch()}>
                  Retry
                </Btn>
              </div>
            </div>
          );
          if (data && data.sessions.length === 0) return (
            <div className="p-7 text-center text-sm text-gray-400">
              {search ? `No sessions match "${search}".` : 'No sessions in this view yet.'}
            </div>
          );
          return (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Customer</th>
                <th>Charger</th>
                <th>Operator</th>
                <th>Started</th>
                <th className="num">Duration</th>
                <th className="num">kWh</th>
                <th className="num">Amount</th>
                <th>Payment</th>
                <th>Receipt</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data?.sessions.map((s) => {
                const st = sessionStatusBadge(s.sessionStatus);
                const href = `${base}/sessions/${encodeURIComponent(s.sessionId)}`;
                return (
                  <tr key={s.id} {...rowNav(() => navigate(href))}>
                    <td>
                      <span className="mono text-gray-800 dark:text-white/90">{s.sessionId}</span>
                    </td>
                    <td>
                      {s.customerName ?? s.licensePlate ?? '—'}
                      {s.customerPhone ? (
                        <span className="text-gray-400"> · {s.customerPhone}</span>
                      ) : null}
                    </td>
                    <td>
                      {s.charger?.name ?? '—'}
                      {s.gun?.name ? (
                        <span className="text-gray-400"> · {s.gun.name}</span>
                      ) : null}
                    </td>
                    <td className="text-gray-500 dark:text-gray-400">{operatorName(s.operator)}</td>
                    <td className="text-gray-500 dark:text-gray-400">
                      {isLiveStatus(s.sessionStatus)
                        ? `${fmtElapsed(s.startTime)} ago`
                        : fmtTime(s.startTime)}
                    </td>
                    <td className="num mono">{fmtSessionDuration(s.startTime, s.endTime, isLiveStatus(s.sessionStatus))}</td>
                    <td className="num mono">{s.chargedKwh != null ? s.chargedKwh.toFixed(1) : '—'}</td>
                    <td className="num mono">{s.totalAmount != null ? fmtNumber(s.totalAmount) : '—'}</td>
                    <td className="text-gray-500 dark:text-gray-400">{paymentMethodLabel(s)}</td>
                    <td>
                      {(() => {
                        const eb = ebmBadge(s.ebms[0]?.status);
                        return s.ebms[0] ? <Badge kind={eb.kind}>{eb.label}</Badge> : <span className="text-gray-400">—</span>;
                      })()}
                    </td>
                    <td>
                      <Badge kind={st.kind} dot={isLiveStatus(s.sessionStatus)} pulse={isLiveStatus(s.sessionStatus)}>
                        {st.label}
                      </Badge>
                      {s.sessionStatus === 'COMPLETED' && !s.isPaid ? (
                        <Badge kind="err">unpaid</Badge>
                      ) : null}
                    </td>
                    <td className="num">
                      <SessionRowMenu
                      row={s}
                      onAction={(kind, row) => {
                        if (kind === 'cancel') { setCancelRow(row); setCancelReason(''); }
                        else setTarget({ kind, row });
                      }}
                      onPay={(row) => setPayRow(row)}
                    />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          );
        })()}
      </TableCard>

      {/* Cancel dialog with reason input */}
      {cancelRow ? (
        <Dialog open={!!cancelRow} onOpenChange={(open) => { if (!open) setCancelRow(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel this session?</DialogTitle>
              <DialogDescription>
                Session {cancelRow.sessionId} will be moved to CANCELLED.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="cancel-reason" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Reason
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this session being cancelled?"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <DialogFooter>
              <Btn variant="ghost" onClick={() => setCancelRow(null)}>Back</Btn>
              <Btn variant="danger" loading={cancel.isPending} onClick={runCancelSession}>Cancel session</Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Delete confirm */}
      {target ? (
        <ConsoleConfirm
          open={!!target}
          onOpenChange={(open) => { if (!open) setTarget(null); }}
          title={ROW_ACTION_COPY[target.kind].title}
          description={`${ROW_ACTION_COPY[target.kind].description}\nSession: ${target.row.sessionId}`}
          confirmText={ROW_ACTION_COPY[target.kind].confirm}
          intent={ROW_ACTION_COPY[target.kind].variant}
          loading={pendingByKind[target.kind]}
          onConfirm={runRowAction}
        />
      ) : null}

      {payRow ? (
        <SessionPayDialog
          open={!!payRow}
          onOpenChange={(open) => { if (!open) setPayRow(null); }}
          sessionId={payRow.id}
          defaultPhone={payRow.customerPhone ?? null}
          amountLabel={payRow.totalAmount ?? null}
          sendMomo={(id, phone) => retryMomo.mutateAsync({ id, phone })}
          sendMomoCode={(id) => retryMomoCode.mutateAsync(id)}
          sendMarkPaid={(id, note) => markPaid.mutateAsync({ id, note })}
        />
      ) : null}
    </div>
  );
}
