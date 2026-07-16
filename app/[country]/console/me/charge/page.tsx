'use client';

/** Console operator charge flow (operator self-service): Start / End a charging
 *  session. Reuses the dashboard ChargingSessionForm (plate scan, kWh, payment +
 *  EBM dialogs) but threads basePath="/console/me" so its post-action redirects
 *  stay inside the console. Tab state lives in the URL (?op=). */
import React, { Suspense } from 'react';
import { PageHead, Tabs } from '@/components/console/ui';
import { useUrlState } from '@/lib/console/useUrlState';
import ChargingSessionForm from '@/components/dashboard/sessions/ChargingSessionForm';

const CONSOLE_OPERATOR_BASE = '/console/me';

const TABS = [
  { id: 'start', label: 'Start session' },
  { id: 'end', label: 'End session' },
];

function ConsoleChargeBody() {
  const { get, set } = useUrlState({ op: 'start' });
  const op = get('op');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHead title="Charge" sub="Start or end a charging session" />

      <div className="mx-auto w-full max-w-xl">
        <Tabs tabs={TABS} value={op} onChange={(id) => set('op', id)} />
        <div className="mt-4 sm:mt-6">
          <ChargingSessionForm basePath={CONSOLE_OPERATOR_BASE} />
        </div>
      </div>
    </div>
  );
}

export default function ConsoleChargePage() {
  return (
    <Suspense fallback={null}>
      <ConsoleChargeBody />
    </Suspense>
  );
}
