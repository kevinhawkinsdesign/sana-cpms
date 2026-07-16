'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOperatorWs, type PaymentConfirmedPayload, type PaymentFailedPayload } from '@/lib/hooks/useOperatorWs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Smartphone, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/authContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  payWithMomo,
  payWithMomoCode,
  checkMomoPaymentStatus,
} from '@/lib/api/chargingSessions';
import { checkMomoPaymentStatus as checkSessionMomoStatus } from '@/lib/api/admin';

interface PaymentInfo {
  isPaid: boolean;
  paymentMethod?: 'MOMO' | 'CARD' | 'FREE_ALLOWANCE' | 'MOMO_CODE_PAYMENT';
  amount: number;
  currency: string;
  ratePerKwh?: number;
  requiresValidation?: boolean;
  validationType?: 'MOMO' | 'CARD';
  validationDetails?: {
    momoNumber?: string;
    transactionId?: string;
  };
}

interface SplitEnergyInfo {
  totalKwh: number;
  freeKwh: number;
  paidKwh: number;
}

export interface PaymentSuccessContext {
  /** Backend tells us whether the charger has EBM rollout enabled, so the
   *  parent can decide whether to open the EBM popup. */
  chargerGenerateEbm?: boolean;
  /** Phone number the customer paid with (MOMO). Forwarded so the EBM popup
   *  can pre-populate its phone field without forcing the operator to retype. */
  momoPhoneNumber?: string;
  /** How the payment settled. MOMO_CODE payments cannot receive an EBM, so the
   *  parent must not open the EBM popup for them. Absent = treat as MOMO. */
  paymentMethod?: 'MOMO' | 'MOMO_CODE';
}

interface EnhancedPaymentDialogProps {
  session: any;
  paymentInfo: PaymentInfo;
  onSuccess: (ctx?: PaymentSuccessContext) => void;
  onClose: () => void;
  splitEnergyInfo?: SplitEnergyInfo | null;
}

const MOMO_CODE_FAIL_THRESHOLD = 3;
const PAYMENT_WAIT_MS = 180_000; // 3 minute safety timer
const PAYMENT_POLL_INTERVAL_MS = 5_000; // poll backend every 5s as ws backup

export function EnhancedPaymentDialog({
  session,
  paymentInfo,
  onSuccess,
  onClose,
  splitEnergyInfo,
}: EnhancedPaymentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'MOMO_CODE'>('MOMO');
  // MOMO Code hidden until MOMO fails repeatedly — surfaced via inline suggestion
  const [momoFailCount, setMomoFailCount] = useState(0);
  const [inlineMessage, setInlineMessage] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [momoCodeReceiptConfirmed, setMomoCodeReceiptConfirmed] = useState(false);

  // Stash the chargerGenerateEbm flag the first pay response gives us so the
  // success callback (which fires later, after polling/ws confirm) can forward
  // it to the parent. Avoids a second fetch to learn the rollout flag.
  const chargerGenerateEbmRef = useRef<boolean | undefined>(undefined);
  // Phone number used to initiate the MOMO payment, forwarded via onSuccess ctx
  // so the downstream EBM popup can pre-populate its phone field. MOMO_CODE path
  // leaves this undefined (no per-customer phone is collected).
  const momoPaidPhoneRef = useRef<string | undefined>(undefined);

  // Keep transactionId in a ref so long-lived ws handlers see the latest value
  const transactionIdRef = useRef<string | null>(null);
  useEffect(() => { transactionIdRef.current = transactionId; }, [transactionId]);

  // Keep onSuccess in a ref so finalizePayment stays stable across parent re-renders
  // (the operator page re-renders on every telemetry tick).
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  // 2-minute safety timer fallback for when the ws doesn't deliver a terminal event
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalizePayment = useCallback((outcome: 'confirmed' | 'failed', message?: string) => {
    // Re-entrancy guard: first caller wins (ws, http fallback, safety timer).
    // Prevents double-onSuccess and prevents a late HTTP throw from overwriting
    // a confirmed state with a spurious failure toast.
    if (!transactionIdRef.current) return;
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    transactionIdRef.current = null;
    setTransactionId(null);
    if (outcome === 'confirmed') {
      setPaymentStatus('completed');
      setInlineMessage({ kind: 'success', text: 'Payment received successfully.' });
      setTimeout(() => onSuccessRef.current({
        chargerGenerateEbm: chargerGenerateEbmRef.current,
        momoPhoneNumber: momoPaidPhoneRef.current,
      }), 3000);
    } else {
      // Failure: drop the remembered phone so a later "Already paid?" check —
      // which queries the whole session and may match an older, unrelated
      // successful transaction — can't forward a stale number to the EBM popup.
      momoPaidPhoneRef.current = undefined;
      setPaymentStatus('pending');
      setMomoFailCount((c) => c + 1);
      setInlineMessage({ kind: 'error', text: message || 'Payment failed. Please try again.' });
    }
  }, []);

  // HTTP fallback: single check. Finalizes on any terminal state (paid or failed);
  // leaves pending alone so the ws or safety timer can still act.
  const runHttpFallbackCheck = useCallback(async () => {
    const txId = transactionIdRef.current;
    if (!txId) return;
    try {
      const response = await checkMomoPaymentStatus(txId);
      if (response.data.isPaid) {
        if (response.data.chargerGenerateEbm !== undefined) {
          chargerGenerateEbmRef.current = response.data.chargerGenerateEbm === true;
        }
        finalizePayment('confirmed');
      } else if ((response.data as any).validationDetails?.momoStatus === 'FAILED') {
        finalizePayment('failed', (response.data as any).validationDetails.reason || 'Payment failed. Please try again.');
      }
    } catch {
      // Ignore — safety timer will finalize if needed
    }
  }, [finalizePayment]);

  useOperatorWs({
    onPaymentConfirmed: useCallback((payload: PaymentConfirmedPayload) => {
      if (payload.transactionId !== transactionIdRef.current) return;
      if (payload.chargerGenerateEbm !== undefined) {
        chargerGenerateEbmRef.current = payload.chargerGenerateEbm === true;
      }
      finalizePayment('confirmed');
    }, [finalizePayment]),
    onPaymentFailed: useCallback((payload: PaymentFailedPayload) => {
      if (payload.transactionId !== transactionIdRef.current) return;
      finalizePayment('failed', payload.reason || 'Payment failed. Please try again.');
    }, [finalizePayment]),
    onConnected: useCallback(() => {
      // On (re)connect while waiting, catch up in case we missed the event
      if (transactionIdRef.current) runHttpFallbackCheck();
    }, [runHttpFallbackCheck]),
  });

  // Start safety timer when transactionId is set; clean up on unmount/change
  useEffect(() => {
    if (!transactionId) return;
    safetyTimerRef.current = setTimeout(() => {
      finalizePayment('failed', 'Payment validation timed out. Please try again.');
    }, PAYMENT_WAIT_MS);
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [transactionId, finalizePayment]);

  // Poll backend while awaiting confirmation — backup when ws miss/drop events.
  // finalizePayment clears transactionIdRef so poll self-terminate on success/fail.
  useEffect(() => {
    if (!transactionId) return;
    const intervalId = setInterval(() => {
      if (!transactionIdRef.current) return;
      runHttpFallbackCheck();
    }, PAYMENT_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [transactionId, runHttpFallbackCheck]);

  // Guard: parent resolves `session` via list.find() and can pass undefined when
  // the ID isn't on the current page / state is stale. Bail rather than crash.
  // Must come after hooks.
  if (!session) return null;

  const effectiveTotalKwh = splitEnergyInfo?.totalKwh ?? session.chargedKwh;
  const effectivePaidKwh = splitEnergyInfo?.paidKwh ?? session.chargedKwh;
  const effectiveFreeKwh = splitEnergyInfo?.freeKwh ?? 0;

  const handleMomoPayment = async () => {
    if (!phoneNumber) {
      setInlineMessage({ kind: 'error', text: 'Please enter your phone number.' });
      return;
    }

    setInlineMessage(null);
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const response = await payWithMomo(session.id, phoneNumber);
      // Cache rollout flag from pay response so success callback forwards it.
      chargerGenerateEbmRef.current = (response.data as any).chargerGenerateEbm === true;
      // Remember the phone we used so the downstream EBM popup can prefill it.
      momoPaidPhoneRef.current = phoneNumber;

      if (response.data.requiresValidation) {
        setTransactionId(response.data.validationDetails.transactionId);
        setInlineMessage({ kind: 'info', text: 'Check your phone to confirm the payment.' });
        // ws/http-fallback/safety-timer handle finalization
      } else if (response.data.isPaid) {
        setPaymentStatus('completed');
        setInlineMessage({ kind: 'success', text: 'Payment received successfully.' });
        setTimeout(() => onSuccess({
          chargerGenerateEbm: chargerGenerateEbmRef.current,
          momoPhoneNumber: momoPaidPhoneRef.current,
        }), 2000);
      }
    } catch (error: any) {
      console.error('MOMO payment failed:', error);
      // Init failed before we got a transactionId — drop the remembered phone
      // so a later status check can't forward it (same rationale as in finalizePayment).
      momoPaidPhoneRef.current = undefined;
      setMomoFailCount((c) => c + 1);
      setPaymentStatus('pending');
      setInlineMessage({
        kind: 'error',
        text: error?.response?.data?.message || error?.message || 'Payment failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMomoCodePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const response = await payWithMomoCode(session.id);
      chargerGenerateEbmRef.current = (response.data as any).chargerGenerateEbm === true;

      if (response.data.isPaid) {
        setPaymentStatus('completed');
        toast.success('Payment completed successfully');
        // MOMO_CODE payments cannot receive an EBM — flag so the parent skips
        // opening the (now backend-blocked) EBM popup.
        setTimeout(() => onSuccess({ chargerGenerateEbm: chargerGenerateEbmRef.current, paymentMethod: 'MOMO_CODE' }), 2000);
      }
    } catch (error: any) {
      console.error('MOMO Code payment failed:', error);
      setPaymentStatus('pending');
      toast.error(error?.response?.data?.message || error?.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    setIsCheckingStatus(true);

    try {
      const response = await checkSessionMomoStatus(session.id);

      const data = response.data;
      const summary = data.summary;
      const isPaid = data.isPaid;
      // Backend status endpoint now echoes chargerGenerateEbm — cache it.
      if ((data as any).chargerGenerateEbm !== undefined) {
        chargerGenerateEbmRef.current = (data as any).chargerGenerateEbm === true;
      }

      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory'] });
      queryClient.invalidateQueries({ queryKey: ['operatorActiveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['operatorLatestSessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

      if (data.pendingCount === 0) {
        toast.info('No pending MOMO transactions found for this session');
        return;
      }

      if (isPaid) {
        setPaymentStatus('completed');
        const successCount = summary?.successful || 0;
        toast.success(`Payment confirmed! ${successCount} transaction(s) successful`);
        setTimeout(() => onSuccess({
          chargerGenerateEbm: chargerGenerateEbmRef.current,
          momoPhoneNumber: momoPaidPhoneRef.current,
          // Forward the current flow so a MOMO_CODE "Already paid?" confirmation
          // doesn't open the (backend-blocked) EBM popup.
          paymentMethod: paymentMethod === 'MOMO_CODE' ? 'MOMO_CODE' : 'MOMO',
        }), 2000);
      } else if (summary) {
        const message = `Status checked: ${summary.successful} successful, ${summary.failed} failed, ${summary.stillPending} pending`;
        if (summary.stillPending > 0) toast.info(message);
        else if (summary.failed > 0) toast.warning(message);
        else toast.info('Payment status checked');
      } else {
        toast.info(data.message || 'Payment status checked');
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      toast.error(error.message || 'Failed to check payment status');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Payment Required</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Payment Summary */}
          <Card className="border-gray-200 dark:border-white/10 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Session</span>
                  <span className="text-xs font-mono text-gray-800 dark:text-white/90 text-right break-all">{session.sessionId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Energy charged</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{effectiveTotalKwh} kWh</span>
                </div>
                {(() => {
                  const rate = paymentInfo.ratePerKwh
                    ?? (effectivePaidKwh > 0 ? paymentInfo.amount / effectivePaidKwh : null);
                  if (rate == null || !isFinite(rate)) return null;
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Rate</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.round(rate).toLocaleString()} RWF/kWh
                      </span>
                    </div>
                  );
                })()}
                {splitEnergyInfo && effectiveFreeKwh > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Free allowance</span>
                      <span className="text-sm text-green-700 dark:text-green-300">{effectiveFreeKwh} kWh free</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">You pay for</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{effectivePaidKwh} kWh</span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-100 dark:border-white/10 pt-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-[#0E159A] dark:text-indigo-300">
                    {formatCurrency(paymentInfo.amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing status */}
          {paymentStatus === 'processing' && (
            <Card className="border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-200">
                      {paymentMethod === 'MOMO' ? 'Waiting for payment confirmation...' : 'Processing payment...'}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {paymentMethod === 'MOMO'
                        ? 'Please check your phone to confirm the payment'
                        : 'Please wait while we process your payment'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed state */}
          {paymentStatus === 'completed' && (
            <Card className="border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-200">Payment Completed!</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Payment completed successfully!</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending state — primary form on top, footer (suggestion + already paid) at bottom */}
          {paymentStatus === 'pending' && (
            <div className="space-y-5">
              {paymentMethod === 'MOMO' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Phone number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="+250788123456"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (inlineMessage?.kind === 'error') setInlineMessage(null);
                      }}
                      disabled={isProcessing}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enter your MTN Mobile Money number</p>
                  </div>

                  {inlineMessage && (
                    <div
                      className={
                        inlineMessage.kind === 'success'
                          ? 'rounded-md border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300 flex items-start gap-2'
                          : inlineMessage.kind === 'error'
                          ? 'rounded-md border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300 flex items-start gap-2'
                          : 'rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2'
                      }
                    >
                      {inlineMessage.kind === 'success' ? (
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : inlineMessage.kind === 'error' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{inlineMessage.text}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleMomoPayment}
                    disabled={isProcessing || !phoneNumber}
                    className="w-full h-11 bg-[#0E159A] hover:bg-[#0B1178] text-white font-semibold shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Smartphone className="mr-2 h-4 w-4" />
                        Pay with MOMO
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-900">
                      <strong>Hey {user?.firstName || 'Operator'}</strong>, confirm the payment has landed in your MOMO code before proceeding.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={momoCodeReceiptConfirmed}
                      onChange={(e) => setMomoCodeReceiptConfirmed(e.target.checked)}
                      disabled={isProcessing}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-[#0E159A] focus:ring-[#0E159A] cursor-pointer"
                    />
                    <span className="text-sm text-gray-800 dark:text-white/90 leading-snug">
                      I confirm the MOMO message was received on the Kabisa phone at the station.
                    </span>
                  </label>

                  <Button
                    onClick={handleMomoCodePayment}
                    disabled={isProcessing || !momoCodeReceiptConfirmed}
                    className="w-full h-11 bg-[#0E159A] hover:bg-[#0B1178] text-white font-semibold shadow-sm hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Confirm MOMO Code Payment
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Footer: suggestion + already-paid (+ back-to-momo when on MOMO_CODE) */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                {paymentMethod === 'MOMO_CODE' && (
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">MOMO Code</span>
                    </span>
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                      onClick={() => setPaymentMethod('MOMO')}
                    >
                      Back to MOMO
                    </button>
                  </div>
                )}

                {paymentMethod === 'MOMO' && momoFailCount >= MOMO_CODE_FAIL_THRESHOLD && (
                  <p className="text-xs text-amber-700">
                    MOMO keep failing?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        // Switching away from MOMO: drop the remembered phone
                        // so a MOMO_CODE confirmation can't inherit it.
                        momoPaidPhoneRef.current = undefined;
                        setPaymentMethod('MOMO_CODE');
                      }}
                      className="font-semibold underline hover:text-amber-900"
                    >
                      Try MOMO CODE
                    </button>
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCheckPaymentStatus}
                  disabled={isCheckingStatus}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline disabled:opacity-60"
                >
                  {isCheckingStatus ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Already paid?
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Failed — rare: hard client-side failure with no retry path */}
          {paymentStatus === 'failed' && (
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
