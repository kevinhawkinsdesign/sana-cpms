'use client';

/** Session admin actions (FE-5 / KAB-129): toolbar + dialogs wrapping the
 *  charging-session admin endpoints (cancel, retry payment, edit, …).
 *
 *  Exposed as a hook (`useSessionActions`) so the detail page can mount the
 *  toolbar in the PageHead, render the dialog stack at its root, AND let
 *  buttons embedded in other cards (Receipt, Payment activity) call the same
 *  openers — without prop-drilling state through three layers. */
import React, { useState } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Btn, Icon, type IconName } from '@/components/console/ui';
import {
  sessionMutationErrorMessage,
  useCancelSession,
  useDeleteSession,
  usePauseSession,
  useRegenerateEbm,
  useResumeSession,
  useRetrySessionMomo,
  useRetrySessionMomoCode,
  useMarkSessionPaid,
  useUncancelSession,
  useUpdateSession,
  type OrgSessionDetail,
  type SessionEditPayload,
} from '@/lib/console/sessions';

type Session = OrgSessionDetail['session'];

/** datetime-local <input> needs `YYYY-MM-DDTHH:mm` with no timezone. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Inverse of `isoToLocalInput`. Returns null when the user cleared the field
 *  (we treat blanks as "no change"; backend Joi rejects empty strings here). */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Stringify a number for an <input type=number> while leaving null/undefined
 *  as a blank field — never "null", never "undefined" on screen. */
function num(v: number | null | undefined): string {
  return v == null ? '' : String(v);
}

/* ---------- Edit dialog ---------- */

function SessionEditDialog({
  open,
  onOpenChange,
  session,
  orgId,
  sessionId,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: Session;
  orgId: string | null;
  sessionId: string | null;
}>) {
  // Local form state mirrors the mutable fields in adminUpdateChargingSessionSchema.
  // Strings (not numbers) so blank fields stay distinct from 0.
  const [form, setForm] = useState({
    startTime: '',
    endTime: '',
    startSoc: '',
    endSoc: '',
    chargedKwh: '',
    ratePerKwh: '',
    discountRate: '',
    discountAmount: '',
    customerName: '',
    carModelMake: '',
  });
  const mutation = useUpdateSession(orgId, sessionId);

  // Baseline holds the *prefilled* values, including any derived/fallback ones
  // (rate from total/kWh, customerName from payerName, vehicle label from
  // carModelMake). Change-detection in handleSave diffs against the baseline,
  // not the raw session columns — otherwise a derived rate would silently
  // persist as an explicit ratePerKwh on any unrelated save.
  const baselineRef = React.useRef<{
    startTime: string;
    endTime: string;
    startSoc: number | null;
    endSoc: number | null;
    chargedKwh: number | null;
    ratePerKwh: number | null;
    discountRate: number | null;
    discountAmount: number | null;
    customerName: string;
    carModelMake: string;
  } | null>(null);

  // Reset form whenever the dialog re-opens against a (possibly changed) session.
  // Fallbacks match the detail page so the admin sees the same values they were
  // looking at: derive rate from total/kWh when ratePerKwh is null, fall back to
  // the primary transaction payer for customer name, and use carModelMake when
  // no Vehicle row is linked.
  React.useEffect(() => {
    if (!open) return;
    const veh = session.vehicle;
    const vehLabel = veh && (veh.make || veh.model)
      ? [veh.make, veh.model].filter(Boolean).join(' ')
      : (session.carModelMake ?? '');
    const derivedRate = session.ratePerKwh
      ?? (session.totalAmount != null && session.chargedKwh != null && session.chargedKwh > 0
        ? session.totalAmount / session.chargedKwh
        : null);
    const primaryTx = session.transactions.find((t) => t.transactionStatus === 'COMPLETED')
      ?? session.transactions[0]
      ?? null;
    const customerFallback = session.customerName ?? primaryTx?.payerName ?? '';
    // datetime-local inputs only carry minute precision, so the prefill
    // value is what we diff against on save — comparing back to the
    // original session ISO would always flag a "change" (millisecond
    // truncation) and silently rewrite the timestamp.
    const startTimeLocal = isoToLocalInput(session.startTime);
    const endTimeLocal = isoToLocalInput(session.endTime);
    baselineRef.current = {
      startTime: startTimeLocal,
      endTime: endTimeLocal,
      startSoc: session.startSoc,
      endSoc: session.endSoc,
      chargedKwh: session.chargedKwh,
      ratePerKwh: derivedRate,
      discountRate: session.discountRate,
      discountAmount: session.discountAmount,
      customerName: customerFallback,
      carModelMake: vehLabel,
    };
    setForm({
      startTime: startTimeLocal,
      endTime: endTimeLocal,
      startSoc: num(session.startSoc),
      endSoc: num(session.endSoc),
      chargedKwh: num(session.chargedKwh),
      ratePerKwh: num(derivedRate),
      discountRate: num(session.discountRate),
      discountAmount: num(session.discountAmount),
      customerName: customerFallback,
      carModelMake: vehLabel,
    });
  }, [open, session]);

  const handleSave = async () => {
    if (!session.id) return;
    const baseline = baselineRef.current;
    if (!baseline) return;
    const payload: SessionEditPayload = {};

    // Only include changed fields. Joi schema uses `.or(...)` so at least one
    // key must be present — empty payload would 400. Diff datetime-local
    // strings against the baseline so the millisecond truncation of the
    // input format doesn't masquerade as a user edit.
    if (form.startTime && form.startTime !== baseline.startTime) {
      const startIso = localInputToIso(form.startTime);
      if (startIso) payload.startTime = startIso;
    }
    if (form.endTime && form.endTime !== baseline.endTime) {
      const endIso = localInputToIso(form.endTime);
      if (endIso) payload.endTime = endIso;
    }

    const numField = (raw: string, baselineVal: number | null): number | undefined => {
      if (!raw.trim()) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n)) return undefined;
      return n === baselineVal ? undefined : n;
    };
    const startSoc = numField(form.startSoc, baseline.startSoc);
    if (startSoc !== undefined) payload.startSoc = startSoc;
    const endSoc = numField(form.endSoc, baseline.endSoc);
    if (endSoc !== undefined) payload.endSoc = endSoc;
    const charged = numField(form.chargedKwh, baseline.chargedKwh);
    if (charged !== undefined) payload.chargedKwh = charged;
    const rate = numField(form.ratePerKwh, baseline.ratePerKwh);
    if (rate !== undefined) payload.ratePerKwh = rate;
    const discRate = numField(form.discountRate, baseline.discountRate);
    if (discRate !== undefined) payload.discountRate = discRate;
    const discAmt = numField(form.discountAmount, baseline.discountAmount);
    if (discAmt !== undefined) payload.discountAmount = discAmt;

    const customer = form.customerName.trim();
    if (customer && customer !== baseline.customerName) payload.customerName = customer;
    const carMake = form.carModelMake.trim();
    if (carMake && carMake !== baseline.carModelMake) payload.carModelMake = carMake;

    if (Object.keys(payload).length === 0) {
      toast.error('No changes to save');
      return;
    }
    try {
      await mutation.mutateAsync({ id: session.id, payload });
      toast.success('Session updated');
      onOpenChange(false);
    } catch (e) {
      toast.error(sessionMutationErrorMessage(e, 'Failed to update session'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Adjust telemetry, timing, rate, or customer fields. Empty fields stay unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 text-sm">
          <Field label="Start time">
            <input type="datetime-local" className={INPUT_CLS} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="End time">
            <input type="datetime-local" className={INPUT_CLS} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </Field>
          <Field label="Start SoC (%)">
            <input type="number" min="0" max="100" className={INPUT_CLS} value={form.startSoc} onChange={(e) => setForm({ ...form, startSoc: e.target.value })} />
          </Field>
          <Field label="End SoC (%)">
            <input type="number" min="0" max="100" className={INPUT_CLS} value={form.endSoc} onChange={(e) => setForm({ ...form, endSoc: e.target.value })} />
          </Field>
          <Field label="Charged kWh">
            <input type="number" step="0.01" min="0" className={INPUT_CLS} value={form.chargedKwh} onChange={(e) => setForm({ ...form, chargedKwh: e.target.value })} />
          </Field>
          <Field label="Rate (RWF/kWh)">
            <input type="number" step="0.01" min="0" className={INPUT_CLS} value={form.ratePerKwh} onChange={(e) => setForm({ ...form, ratePerKwh: e.target.value })} />
          </Field>
          <Field label="Discount rate (%)">
            <input type="number" step="0.01" min="0" max="100" className={INPUT_CLS} value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: e.target.value })} />
          </Field>
          <Field label="Discount amount (RWF)">
            <input type="number" step="0.01" min="0" className={INPUT_CLS} value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
          </Field>
          <Field label="Customer name" full>
            <input type="text" className={INPUT_CLS} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </Field>
          <Field label="Vehicle (make / model)" full>
            <input type="text" className={INPUT_CLS} value={form.carModelMake} onChange={(e) => setForm({ ...form, carModelMake: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" loading={mutation.isPending} onClick={handleSave}>Save changes</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const INPUT_CLS =
  'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm focus:border-[#08294f] focus:outline-none focus:ring-2 focus:ring-[#08294f]/15 dark:border-gray-700 dark:bg-black dark:text-white/90';

function Field({ label, children, full }: Readonly<{ label: string; children: React.ReactNode; full?: boolean }>) {
  return (
    <label className={full ? 'col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Console-styled confirm dialog ----------
 * Custom Radix AlertDialog wrapper that keeps the modal card neutral (white,
 * no full-card red/orange tint like the shared ConfirmDialog) and only puts
 * intent colour on the icon + action button. Matches the rest of the console
 * design language (rounded-2xl, subtle shadow, Outfit font from globals). */

export type ConsoleConfirmIntent = 'default' | 'info' | 'warning' | 'destructive';

const INTENT_ICON: Record<ConsoleConfirmIntent, IconName> = {
  default: 'check',
  info: 'refresh',
  warning: 'alert',
  destructive: 'alert',
};

const INTENT_BADGE: Record<ConsoleConfirmIntent, string> = {
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  warning: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300',
  destructive: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

const INTENT_BTN: Record<ConsoleConfirmIntent, string> = {
  default: 'bg-[#08294f] text-white hover:bg-[#0a106e]',
  info: 'bg-[#08294f] text-white hover:bg-[#0a106e]',
  warning: 'bg-orange-600 text-white hover:bg-orange-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

function ConsoleConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  intent = 'default',
  loading,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  intent?: ConsoleConfirmIntent;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}>) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${INTENT_BADGE[intent]}`}>
              <Icon name={INTENT_ICON[intent]} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-white">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-1.5 whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                disabled={loading}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5"
              >
                {cancelText}
              </button>
            </AlertDialogPrimitive.Cancel>
            {/* Plain button (NOT AlertDialogPrimitive.Action) so the dialog
                stays mounted while the async confirm runs. The Action primitive
                auto-fires onOpenChange(false) on click, which unmounts the
                spinner before the mutation resolves. Caller closes the dialog
                explicitly after success via the onConfirm handler. */}
            <button
              type="button"
              disabled={loading}
              onClick={() => { void onConfirm(); }}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition disabled:opacity-50 ${INTENT_BTN[intent]}`}
            >
              {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : null}
              {confirmText}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { ConsoleConfirm, SessionPayDialog };

/* ---------- Cancel dialog (needs a reason) ---------- */

function SessionCancelDialog({
  open,
  onOpenChange,
  orgId,
  sessionId,
  internalId,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string | null;
  sessionId: string | null;
  internalId: string | null;
}>) {
  const [reason, setReason] = useState('');
  const mutation = useCancelSession(orgId, sessionId);

  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 3;

  const handleConfirm = async () => {
    if (!internalId || trimmed.length < 3) return;
    try {
      await mutation.mutateAsync({ id: internalId, reason: trimmed });
      toast.success('Session cancelled');
      onOpenChange(false);
    } catch (e) {
      toast.error(sessionMutationErrorMessage(e, 'Failed to cancel session'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this session?</DialogTitle>
          <DialogDescription>
            The session will be moved to CANCELLED. A reason is required and will be stored on the
            audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <textarea
            className={`${INPUT_CLS} h-24 resize-none py-2`}
            placeholder="Reason (min. 3 characters)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          {tooShort ? (
            <div className="text-xs text-red-600">Reason must be at least 3 characters.</div>
          ) : null}
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Keep session</Btn>
          <Btn
            variant="danger"
            loading={mutation.isPending}
            disabled={trimmed.length < 3}
            onClick={handleConfirm}
          >
            Cancel session
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Toolbar + the master action hook ---------- */

export interface SessionActionOpeners {
  openEdit: () => void;
  openCancel: () => void;
  openPause: () => void;
  openResume: () => void;
  openUncancel: () => void;
  openRetryPayment: () => void;
  openRegenReceipt: () => void;
  openDelete: () => void;
}

export interface SessionActions extends SessionActionOpeners {
  /** Toolbar rendered in the page head — status-conditional set of buttons. */
  toolbar: React.ReactNode;
  /** All dialog elements — mount once at the page root. */
  dialogs: React.ReactNode;
}

export function useSessionActions(
  orgId: string | null,
  sessionId: string | null,
  session: Session,
): SessionActions {
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [uncancelOpen, setUncancelOpen] = useState(false);
  const [retryPayOpen, setRetryPayOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Backend admin endpoints look up sessions by UUID (`ChargingSession.id`),
  // not the human-readable `sessionId` slug from the URL. Always pass the UUID
  // to mutation calls; keep `sessionId` only for cache invalidation keys.
  const internalId = session.id;
  const pause = usePauseSession(orgId, sessionId);
  const resume = useResumeSession(orgId, sessionId);
  const uncancel = useUncancelSession(orgId, sessionId);
  const retryMomo = useRetrySessionMomo(orgId, sessionId);
  const retryMomoCode = useRetrySessionMomoCode(orgId, sessionId);
  const markPaid = useMarkSessionPaid(orgId, sessionId);
  const regen = useRegenerateEbm(orgId, sessionId);
  const del = useDeleteSession(orgId, sessionId);

  /** Run a mutation tied to a confirm dialog: close on success, toast on error. */
  const runConfirm = async <T,>(
    fn: () => Promise<T>,
    closer: (o: boolean) => void,
    successMsg: string,
    fallbackErr: string,
  ) => {
    if (!internalId) return;
    try {
      await fn();
      toast.success(successMsg);
      closer(false);
    } catch (e) {
      toast.error(sessionMutationErrorMessage(e, fallbackErr));
    }
  };

  const status = session.sessionStatus;
  const live = status === 'STARTED' || status === 'PAUSED';
  const completed = status === 'COMPLETED' || status === 'PAID' || status === 'EBM_ISSUED';
  const cancelled = status === 'CANCELLED';
  const unpaid = completed && !session.isPaid;
  const ebm = session.ebms[0] ?? null;
  // Receipt regen makes sense once the session is past charging: COMPLETED
  // covers PAID/EBM_ISSUED already. Suppress if a receipt is already ISSUED
  // (use Edit→regen flow instead — avoids double-issuing the EBM by accident).
  const canRegenReceipt = completed && (!ebm || ebm.status !== 'ISSUED');

  const toolbar = (
    <div className="inline-flex flex-wrap items-center gap-2">
      {status === 'STARTED' ? (
        <Btn size="sm" variant="default" icon="clock" onClick={() => setPauseOpen(true)}>
          Pause
        </Btn>
      ) : null}
      {status === 'PAUSED' ? (
        <Btn size="sm" variant="default" icon="refresh" onClick={() => setResumeOpen(true)}>
          Resume
        </Btn>
      ) : null}
      {unpaid ? (
        <Btn size="sm" variant="primary" icon="refresh" onClick={() => setRetryPayOpen(true)}>
          Retry payment
        </Btn>
      ) : null}
      {canRegenReceipt ? (
        <Btn size="sm" variant="primary" icon="doc" onClick={() => setRegenOpen(true)}>
          {ebm ? 'Regenerate receipt' : 'Generate receipt'}
        </Btn>
      ) : null}
      {cancelled ? (
        <Btn size="sm" variant="primary" icon="refresh" onClick={() => setUncancelOpen(true)}>
          Uncancel
        </Btn>
      ) : (
        <Btn size="sm" variant="primary" icon="settings" onClick={() => setEditOpen(true)}>
          Edit
        </Btn>
      )}
      {live ? (
        <Btn size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
          Cancel session
        </Btn>
      ) : null}
      <Btn size="sm" variant="danger" icon="x" onClick={() => setDeleteOpen(true)}>
        Delete
      </Btn>
    </div>
  );

  const dialogs = (
    <>
      <SessionEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        session={session}
        orgId={orgId}
        sessionId={sessionId}
      />
      <SessionCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orgId={orgId}
        sessionId={sessionId}
        internalId={internalId}
      />
      <ConsoleConfirm
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="Pause this session?"
        description="The session will be paused. You can resume it later."
        confirmText="Pause"
        intent="warning"
        loading={pause.isPending}
        onConfirm={() =>
          runConfirm(
            () => pause.mutateAsync({ id: internalId }),
            setPauseOpen,
            'Session paused',
            'Failed to pause session',
          )
        }
      />
      <ConsoleConfirm
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        title="Resume this session?"
        description="Charging will continue from where it was paused."
        confirmText="Resume"
        intent="info"
        loading={resume.isPending}
        onConfirm={() =>
          runConfirm(() => resume.mutateAsync(internalId), setResumeOpen, 'Session resumed', 'Failed to resume session')
        }
      />
      <ConsoleConfirm
        open={uncancelOpen}
        onOpenChange={setUncancelOpen}
        title="Uncancel this session?"
        description="The session will revert to its prior state. Use this only if it was cancelled in error."
        confirmText="Uncancel"
        intent="info"
        loading={uncancel.isPending}
        onConfirm={() =>
          runConfirm(
            () => uncancel.mutateAsync(internalId),
            setUncancelOpen,
            'Session restored',
            'Failed to uncancel session',
          )
        }
      />
      <SessionPayDialog
        open={retryPayOpen}
        onOpenChange={setRetryPayOpen}
        sessionId={internalId}
        defaultPhone={session.customerPhone ?? null}
        amountLabel={session.totalAmount ?? null}
        sendMomo={(id, phone) => retryMomo.mutateAsync({ id, phone })}
        sendMomoCode={(id) => retryMomoCode.mutateAsync(id)}
        sendMarkPaid={(id, note) => markPaid.mutateAsync({ id, note })}
      />
      <ConsoleConfirm
        open={regenOpen}
        onOpenChange={setRegenOpen}
        title={ebm ? 'Regenerate receipt?' : 'Generate receipt?'}
        description={
          ebm
            ? 'A new EBM receipt will be issued for this session. The previous one will remain in the audit trail.'
            : 'A fresh EBM receipt will be issued for this session.'
        }
        confirmText={ebm ? 'Regenerate' : 'Generate'}
        intent="info"
        loading={regen.isPending}
        onConfirm={() =>
          runConfirm(
            () => regen.mutateAsync(internalId),
            setRegenOpen,
            'Receipt request submitted',
            'Failed to generate receipt',
          )
        }
      />
      <ConsoleConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this session?"
        description="This permanently removes the session and its telemetry. Payment records are kept. This action cannot be undone."
        confirmText="Delete session"
        intent="destructive"
        loading={del.isPending}
        onConfirm={() =>
          runConfirm(() => del.mutateAsync(internalId), setDeleteOpen, 'Session deleted', 'Failed to delete session')
        }
      />
    </>
  );

  return {
    toolbar,
    dialogs,
    openEdit: () => setEditOpen(true),
    openCancel: () => setCancelOpen(true),
    openPause: () => setPauseOpen(true),
    openResume: () => setResumeOpen(true),
    openUncancel: () => setUncancelOpen(true),
    openRetryPayment: () => setRetryPayOpen(true),
    openRegenReceipt: () => setRegenOpen(true),
    openDelete: () => setDeleteOpen(true),
  };
}

/**
 * Pay dialog for the session detail toolbar. Three paths on one surface:
 *  • MoMo prompt  — STK push via `/pay-momo`, then poll for confirmation
 *  • MoMo code    — operator-verified `/pay-momo-code`, auto-paid on response
 *  • Mark as paid — admin write-off `/mark-paid` (gated by `manage_billing`)
 *
 * Mirrors the operator's EnhancedPaymentDialog state machine:
 *   idle → processing → (polling for MoMo) → completed / failed
 */
type PayMode = 'momo' | 'momo_code' | 'mark_paid';
type PayPhase = 'idle' | 'processing' | 'polling' | 'completed' | 'failed';

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 180_000; // 3 minutes

interface SessionPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  defaultPhone: string | null;
  amountLabel: number | null;
  sendMomo: (id: string, phone: string) => Promise<any>;
  sendMomoCode: (id: string) => Promise<any>;
  sendMarkPaid: (id: string, note?: string) => Promise<any>;
}

function SessionPayDialog({
  open,
  onOpenChange,
  sessionId,
  defaultPhone,
  amountLabel,
  sendMomo,
  sendMomoCode,
  sendMarkPaid,
}: Readonly<SessionPayDialogProps>) {
  const [mode, setMode] = useState<PayMode>('momo');
  const [phase, setPhase] = useState<PayPhase>('idle');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'info' | 'success'; text: string } | null>(null);
  const [momoCodeConfirmed, setMomoCodeConfirmed] = useState(false);

  // Track the transactionId from MoMo pay response for per-transaction polling
  const txnIdRef = React.useRef<string | null>(null);
  const pollTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = React.useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    txnIdRef.current = null;
  }, []);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      cleanup();
      setMode('momo');
      setPhase('idle');
      setPhone(defaultPhone ?? '');
      setNote('');
      setMessage(null);
      setMomoCodeConfirmed(false);
    }
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultPhone intentionally
  // excluded: we only seed it on open, not on background refetch mid-flow.
  }, [open, cleanup]);

  // Prevent closing while processing/polling (user must wait or let it time out)
  const safeClose = (v: boolean) => {
    if (!v && (phase === 'processing' || phase === 'polling')) return;
    cleanup();
    onOpenChange(v);
  };

  // ---- MoMo: poll per-transaction status ----
  const startPolling = React.useCallback((transactionId: string) => {
    txnIdRef.current = transactionId;
    setPhase('polling');
    setMessage({ kind: 'info', text: 'Check the customer\'s phone — waiting for payment confirmation…' });

    const poll = async () => {
      if (!txnIdRef.current) return;
      try {
        const { checkMomoPaymentStatus } = await import('@/lib/api/chargingSessions');
        const res = await checkMomoPaymentStatus(txnIdRef.current);
        // Re-check after await: timeout may have fired while the request was
        // in-flight, clearing the ref and setting phase to 'failed'. Without
        // this guard a stale response could overwrite the timeout state.
        if (!txnIdRef.current) return;
        if (res.data?.isPaid) {
          cleanup();
          setPhase('completed');
          setMessage({ kind: 'success', text: 'Payment confirmed!' });
        } else if ((res.data as any)?.validationDetails?.momoStatus === 'FAILED') {
          cleanup();
          setPhase('failed');
          setMessage({ kind: 'error', text: (res.data as any).validationDetails.reason || 'Payment failed.' });
        }
      } catch { /* keep polling */ }
    };

    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setPhase('failed');
      setMessage({ kind: 'error', text: 'Payment timed out (3 min). You can retry or check status later.' });
    }, POLL_TIMEOUT_MS);
  }, [cleanup]);

  // ---- Submit handlers ----
  const handleMomo = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { toast.error('Customer phone is required'); return; }
    setPhase('processing');
    setMessage(null);
    try {
      const res = await sendMomo(sessionId, trimmed);
      const data = res?.data ?? res;
      if (data?.requiresValidation && data?.validationDetails?.transactionId) {
        startPolling(data.validationDetails.transactionId);
      } else if (data?.isPaid) {
        setPhase('completed');
        setMessage({ kind: 'success', text: 'Payment confirmed!' });
      } else {
        // Fallback — start session-level polling
        startPolling(data?.validationDetails?.transactionId ?? sessionId);
      }
    } catch (e: any) {
      setPhase('failed');
      setMessage({ kind: 'error', text: e?.response?.data?.message || e?.message || 'Failed to send MoMo prompt.' });
    }
  };

  const handleMomoCode = async () => {
    setPhase('processing');
    setMessage(null);
    try {
      await sendMomoCode(sessionId);
      setPhase('completed');
      setMessage({ kind: 'success', text: 'MoMo code payment confirmed — session is paid.' });
    } catch (e: any) {
      setPhase('failed');
      setMessage({ kind: 'error', text: e?.response?.data?.message || e?.message || 'MoMo code payment failed.' });
    }
  };

  const handleMarkPaid = async () => {
    setPhase('processing');
    setMessage(null);
    try {
      await sendMarkPaid(sessionId, note);
      setPhase('completed');
      setMessage({ kind: 'success', text: 'Session marked as paid.' });
    } catch (e: any) {
      setPhase('failed');
      setMessage({ kind: 'error', text: e?.response?.data?.message || e?.message || 'Failed to mark as paid.' });
    }
  };

  const submit = () => {
    if (mode === 'momo') handleMomo();
    else if (mode === 'momo_code') handleMomoCode();
    else handleMarkPaid();
  };

  const reset = () => { cleanup(); setPhase('idle'); setMessage(null); setMode('momo'); setMomoCodeConfirmed(false); };

  const tabs: Array<{ id: PayMode; label: string; icon: IconName }> = [
    { id: 'momo', label: 'MoMo', icon: 'refresh' },
    { id: 'momo_code', label: 'MoMo Code', icon: 'doc' },
    { id: 'mark_paid', label: 'Mark as Paid', icon: 'check' },
  ];

  const busy = phase === 'processing' || phase === 'polling';

  return (
    <Dialog open={open} onOpenChange={safeClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            {amountLabel != null
              ? `Outstanding: ${amountLabel.toLocaleString()} RWF. Choose how to settle this session.`
              : 'Choose how to settle this session.'}
          </DialogDescription>
        </DialogHeader>

        {/* ---- Completed ---- */}
        {phase === 'completed' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Icon name="check" size={20} />
              <div>
                <p className="font-semibold text-emerald-900">Payment completed</p>
                <p className="text-sm text-emerald-700">{message?.text}</p>
              </div>
            </div>
            <DialogFooter>
              <Btn variant="primary" onClick={() => safeClose(false)}>Close</Btn>
            </DialogFooter>
          </div>
        ) : null}

        {/* ---- Processing / Polling ---- */}
        {busy ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900">
                  {phase === 'polling' ? 'Waiting for payment confirmation…' : 'Processing…'}
                </p>
                {message ? <p className="text-sm text-blue-700">{message.text}</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ---- Failed ---- */}
        {phase === 'failed' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <Icon name="x" size={20} />
              <div>
                <p className="font-semibold text-red-900">Payment failed</p>
                <p className="text-sm text-red-700">{message?.text}</p>
              </div>
            </div>
            <DialogFooter>
              <Btn variant="ghost" onClick={() => safeClose(false)}>Close</Btn>
              <Btn variant="primary" onClick={reset}>Try again</Btn>
            </DialogFooter>
          </div>
        ) : null}

        {/* ---- Idle (form) ---- */}
        {phase === 'idle' ? (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
                {tabs.map((t) => {
                  const active = mode === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMode(t.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 transition ${
                        active
                          ? 'bg-white font-semibold text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon name={t.icon} size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {mode === 'momo' ? (
                <div className="space-y-1.5">
                  <label htmlFor="pay-momo-phone" className="text-xs font-medium text-slate-700">
                    Customer phone (MTN MoMo)
                  </label>
                  <input
                    id="pay-momo-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500">
                    An STK push will be sent to this number. They have 3 minutes to approve.
                  </p>
                </div>
              ) : null}

              {mode === 'momo_code' ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Confirm the customer has paid via the merchant MoMo code. The session
                    will be marked as paid immediately.
                  </p>
                  <label className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={momoCodeConfirmed}
                      onChange={(e) => setMomoCodeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#08294f] focus:ring-[#08294f] cursor-pointer"
                    />
                    <span className="text-sm text-slate-800 leading-snug">
                      I confirm the MoMo code payment was received.
                    </span>
                  </label>
                </div>
              ) : null}

              {mode === 'mark_paid' ? (
                <div className="space-y-2">
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    This marks the session as PAID without an actual money movement. Use only
                    for write-offs or out-of-band payments (cash, bank transfer). Requires
                    billing permissions.
                  </p>
                  <label htmlFor="pay-mark-note" className="text-xs font-medium text-slate-700">
                    Reason / reference (optional)
                  </label>
                  <textarea
                    id="pay-mark-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Paid in cash at the station"
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Btn variant="ghost" onClick={() => safeClose(false)}>Cancel</Btn>
              <Btn
                variant={mode === 'mark_paid' ? 'danger' : 'primary'}
                onClick={submit}
                disabled={mode === 'momo_code' && !momoCodeConfirmed}
              >
                {mode === 'momo'
                  ? 'Send MoMo prompt'
                  : mode === 'momo_code'
                  ? 'Confirm payment received'
                  : 'Mark as paid'}
              </Btn>
            </DialogFooter>
          </>
        ) : null}

      </DialogContent>
    </Dialog>
  );
}
