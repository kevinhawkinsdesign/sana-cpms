'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Session } from '@/lib/api/chargingSessions';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { getVehicleLicensePlateNumber } from '@/lib/utils/vehicleUtils';
import { getStatusDisplayLabel, getStatusDisplayColor } from '@/lib/utils/formatters';
import { useOperatorWs } from '@/lib/hooks/useOperatorWs';
import CustomerInfoDialog, { type CustomerInfoFormValues } from '@/components/shared/CustomerInfoDialog';
import {
  computeRatePerKwh,
  CustomerCard,
  EbmsCard,
  EnergyCard,
  NotesCard,
  PaymentCard,
  ResourcesCard,
  SessionDetailsHeader,
  SessionHeroMetrics,
  TimingCard,
  TransactionsCard,
  useShareUrl,
} from '@/components/dashboard/sessions/SessionDetailsParts';

interface SessionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  // Background refresh hook — parent should refetch session data here instead
  // of relying on a full page reload after Customer/Vehicle info save.
  onCustomerInfoSaved?: () => void | Promise<void>;
}

const normalizeStatus = (status: string) => {
  switch (status) {
    case 'completed':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'failed':
    case 'CANCELLED':
      return 'CANCELLED';
    case 'in_progress':
    case 'STARTED':
      return 'STARTED';
    case 'paused':
    case 'PAUSED':
      return 'PAUSED';
    default:
      return status;
  }
};

export function SessionDetailsModal({
  open,
  onClose,
  session,
  onCustomerInfoSaved,
}: SessionDetailsModalProps) {
  const router = useLocalizedRouter();

  // Live telemetry values — seeded from props, updated by WS while modal is open
  const [liveKwh, setLiveKwh] = useState<number | null>(null);
  const [liveSoc, setLiveSoc] = useState<number | null>(null);
  const [liveStartSoc, setLiveStartSoc] = useState<number | null>(null);
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);

  const { shareUrl, handleCopy } = useShareUrl(session?.sessionId || session?.id || '');

  useEffect(() => {
    setLiveKwh(session?.chargedKwh ?? null);
    setLiveSoc(session?.endSoc ?? null);
    setLiveStartSoc(session?.startSoc ?? null);
  }, [session?.id, session?.chargedKwh, session?.endSoc, session?.startSoc]);

  // WebSocket telemetry for the open session. Only the matching sessionId updates.
  useOperatorWs({
    onSessionTelemetry: ({ sessionId, chargedKwh, currentSoc, startSoc }) => {
      if (!session || sessionId !== session.id) return;
      if (chargedKwh != null) setLiveKwh(chargedKwh);
      if (currentSoc != null) setLiveSoc(currentSoc);
      if (startSoc != null) setLiveStartSoc(startSoc);
    },
  });

  if (!session) return null;

  const handleEndSession = () => {
    onClose();
    router.push(
      `/dashboard/charge/session?op=end&vehicleIdentifier=${getVehicleLicensePlateNumber(session.vehicle)}`,
    );
  };

  // Rate (RWF/kWh) uses live telemetry on the operator side, so it reflects
  // the in-flight energy reading rather than the persisted value.
  const ratePerKwh = computeRatePerKwh(session, liveKwh);

  const customerInfoInitial: CustomerInfoFormValues = {
    name: session.customerName ?? '',
    phone: session.customerPhone ?? '',
    licensePlateNumber: session.vehicle?.licensePlates?.[0]?.licencePlateNumber ?? '',
  };

  const operatorName =
    session.operator?.firstName && session.operator?.lastName
      ? `${session.operator.firstName} ${session.operator.lastName}`
      : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl p-4 sm:p-6">
          <SessionDetailsHeader
            sessionId={session.sessionId || session.id}
            statusLabel={getStatusDisplayLabel(session.sessionStatus)}
            statusBadgeClass={getStatusDisplayColor(session.sessionStatus)}
            statusBadgeOutline
            source={session.source}
            shareUrl={shareUrl}
            onShare={handleCopy}
            titleSize="lg"
          />

          <SessionHeroMetrics
            chargedKwh={liveKwh}
            totalAmount={session.totalAmount}
            ratePerKwh={ratePerKwh}
            isPaid={session.isPaid}
            paymentMethodName={session.paymentMethodName}
          />

          <div className="space-y-5">
            <CustomerCard
              session={session}
              onAddCustomerInfo={() => setCustomerInfoOpen(true)}
            />
            <ResourcesCard
              session={session}
              operatorName={operatorName}
              operatorEmail={session.operator?.email}
              onAddVehicleInfo={() => setCustomerInfoOpen(true)}
            />
            <TimingCard session={session} />
            <EnergyCard
              session={session}
              liveKwh={liveKwh}
              liveStartSoc={liveStartSoc}
              liveEndSoc={liveSoc}
            />
            <PaymentCard session={session} />
            <TransactionsCard transactions={session.transactions} />
            <EbmsCard ebms={session.ebms} />
            <NotesCard
              description={session.description}
              commonSessionTag={session.commonSessionTag}
            />
          </div>

          {/* Actions footer — modal-specific, not shared. */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            {normalizeStatus(session.sessionStatus) === 'STARTED' && session.source !== 'REMOTE' && (
              <Button onClick={handleEndSession} className="flex-1 bg-red-600 hover:bg-red-700">
                End Session
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reuse the same dialog used by the sessions table for adding
          missing customer/vehicle info on a session. */}
      <CustomerInfoDialog
        sessionId={session.id}
        session={session}
        initialValues={customerInfoInitial}
        open={customerInfoOpen}
        onOpenChange={setCustomerInfoOpen}
        onSaved={async () => {
          await onCustomerInfoSaved?.();
        }}
      />
    </>
  );
}
