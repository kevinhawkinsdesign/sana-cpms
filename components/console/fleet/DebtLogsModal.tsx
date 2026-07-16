'use client';

/** Debt history for one vehicle (KAB-174) — GET /api/admin/vehicles/:id/debt/logs. */
import React from 'react';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { fmtNumber } from '@/lib/console/dashboard';
import { useVehicleDebtLogs } from '@/lib/console/fleet';

export function DebtLogsModal({
  vehicleId,
  vehicleLabel,
  onClose,
}: Readonly<{ vehicleId: string; vehicleLabel: string; onClose: () => void }>) {
  const { data: logs, isPending, isError, refetch } = useVehicleDebtLogs(vehicleId);

  let body: React.ReactNode;
  if (isPending) {
    body = <span className="kc-skeleton block" style={{ height: 120 }} />;
  } else if (isError) {
    body = (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Couldn&apos;t load the debt history.
        <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
      </div>
    );
  } else if (!logs || logs.length === 0) {
    body = <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No debt history.</div>;
  } else {
    body = (
      <table className="kc-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th className="num">Amount</th>
            <th className="num">Balance</th>
            <th>Note</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="text-gray-500 dark:text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="capitalize">{l.action.toLowerCase().replaceAll('_', ' ')}</td>
              <td className="num mono">{fmtNumber(l.amount)}</td>
              <td className="num mono">{fmtNumber(l.previousBalance)} → {fmtNumber(l.newBalance)}</td>
              <td className="text-gray-500 dark:text-gray-400">{l.note || '—'}</td>
              <td className="text-gray-500 dark:text-gray-400">{l.performedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <ModalShell onClose={onClose} width={720}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 650 }}>Debt history</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>{vehicleLabel}</div>
      </div>
      <div style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>{body}</div>
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
      </div>
    </ModalShell>
  );
}
