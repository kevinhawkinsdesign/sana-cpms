'use client';

/** Manage a business fleet vehicle's free-charging allowances (dashboard parity):
 *  list existing, add, edit, deactivate (keep the record) and delete. */
import React from 'react';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { AllowanceModal, type EditableAllowance } from '@/components/console/fleet/AllowanceModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useUpdateBusinessAllowance, useDeleteBusinessAllowance } from '@/lib/console/fleet';
import type { FreeChargingAllowance } from '@/lib/api/adminBusiness';

function toData(a: FreeChargingAllowance) {
  const specific = a.allowedChargerIds ?? (a.chargerAllowances ?? []).map((c) => c.chargerId);
  return {
    isUnlimited: a.isUnlimited,
    remainingCount: a.isUnlimited ? undefined : a.remainingCount,
    freeKwhLimit: a.freeKwhLimit ?? undefined,
    periodType: a.periodType ?? undefined,
    customDays: a.customDays ?? undefined,
    // null = all chargers; an empty array would read as "no chargers".
    chargers: specific.length ? specific : null,
    validFrom: a.validFrom,
    validUntil: a.validUntil ?? undefined,
  };
}

export function BusinessVehicleAllowancesModal({
  businessId,
  vehicleId,
  vehicleLabel,
  allowances,
  onClose,
}: Readonly<{
  businessId: string;
  vehicleId: string;
  vehicleLabel: string;
  allowances: FreeChargingAllowance[];
  onClose: () => void;
}>) {
  const update = useUpdateBusinessAllowance();
  const del = useDeleteBusinessAllowance();
  const [sub, setSub] = React.useState<{ allowance?: FreeChargingAllowance } | null>(null);

  return (
    <>
      <ModalShell onClose={onClose} width={560}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text1)' }}>Free-charging allowances</h3>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>{vehicleLabel}</p>
          </div>
          <Btn size="xs" variant="ghost" icon="plus" onClick={() => setSub({})}>Add</Btn>
        </div>
        <div className="overflow-y-auto">
          {allowances.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text3)' }}>No allowances.</div>
          ) : (
            <table className="kc-table">
              <thead><tr><th>Allowance</th><th>Valid</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {allowances.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.isUnlimited ? 'Unlimited sessions' : `${fmtNumber(a.remainingCount ?? 0)} session(s)`}
                      {a.freeKwhLimit != null && <span style={{ color: 'var(--text3)' }}> · {fmtNumber(a.freeKwhLimit)} kWh{a.periodType ? `/${a.periodType.toLowerCase()}` : ''}</span>}
                    </td>
                    <td style={{ color: 'var(--text3)' }}>
                      {new Date(a.validFrom).toLocaleDateString()}{a.validUntil ? ` – ${new Date(a.validUntil).toLocaleDateString()}` : ' –'}
                    </td>
                    <td style={{ color: 'var(--text3)' }}>{a.isActive === false ? 'Inactive' : 'Active'}</td>
                    <td>
                      <span className="flex justify-end gap-1.5">
                        <Btn size="xs" variant="ghost" onClick={() => setSub({ allowance: a })}>Edit</Btn>
                        {a.isActive !== false && (
                          <Btn
                            size="xs"
                            variant="ghost"
                            disabled={update.isPending}
                            onClick={() => update.mutate({ businessId, vehicleId, allowanceId: a.id, data: { ...toData(a), isActive: false } })}
                          >
                            Deactivate
                          </Btn>
                        )}
                        <Btn size="xs" variant="ghost" disabled={del.isPending} onClick={() => del.mutate({ businessId, vehicleId, allowanceId: a.id })}>Remove</Btn>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </ModalShell>

      {sub && (
        <AllowanceModal
          businessId={businessId}
          vehicleId={vehicleId}
          vehicleLabel={vehicleLabel}
          allowance={sub.allowance as EditableAllowance | undefined}
          onClose={() => setSub(null)}
        />
      )}
    </>
  );
}
