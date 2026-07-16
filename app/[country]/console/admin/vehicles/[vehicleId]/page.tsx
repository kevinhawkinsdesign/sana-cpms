'use client';

/** Platform · Vehicle detail (KAB-162 + KAB-174): one individual vehicle
 *  across orgs, from /api/admin/individuals/:id, with the fleet write actions:
 *  edit / (de)activate, debt set-add-collect-clear-history, payment methods
 *  and free-charging allowances. Platform-admin only. */
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Btn, Card, PageHead, SummaryStrip } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { VehicleFormModal } from '@/components/console/fleet/VehicleFormModal';
import { DebtActionModal, type DebtAction } from '@/components/console/fleet/DebtActionModal';
import { DebtLogsModal } from '@/components/console/fleet/DebtLogsModal';
import { PaymentMethodModal } from '@/components/console/fleet/PaymentMethodModal';
import { AllowanceModal } from '@/components/console/fleet/AllowanceModal';
import { fmtNumber } from '@/lib/console/dashboard';
import {
  useIndividualVehicle,
  useSetIndividualVehicleActive,
  useClearDebt,
  useRemovePaymentMethod,
  useDeleteAllowance,
  useUpdateAllowance,
  type IndividualVehicle,
} from '@/lib/console/fleet';
import type { FreeChargingAllowance } from '@/lib/api/adminIndividual';

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{children}</span>
    </div>
  );
}

function plates(v: IndividualVehicle): string[] {
  return (v.licensePlates ?? v.vehicleLicensePlates ?? []).map((p) => p.licencePlateNumber);
}

function ownerName(v: IndividualVehicle): string {
  const owner = v.owner ?? v.vehicleOwnerships?.[0]?.user;
  if (!owner) return '—';
  return [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || owner.phone || '—';
}

type VehicleModal =
  | { kind: 'edit' }
  | { kind: 'confirm-active' }
  | { kind: DebtAction }
  | { kind: 'logs' }
  | { kind: 'clear' }
  | { kind: 'pay-kabisa' }
  | { kind: 'pay-momo' }
  | { kind: 'allowance'; allowance?: FreeChargingAllowance };

// Full payload for an existing allowance, so a deactivate/edit preserves its other fields.
function allowanceToData(a: FreeChargingAllowance) {
  const specific = a.allowedChargerIds ?? (a.chargerAllowances ?? []).map((c) => c.chargerId);
  return {
    isUnlimited: a.isUnlimited,
    remainingCount: a.isUnlimited ? undefined : a.remainingCount ?? undefined,
    freeKwhLimit: a.freeKwhLimit ?? undefined,
    periodType: a.periodType ?? undefined,
    customDays: a.customDays ?? undefined,
    // null = all chargers; an empty array would read as "no chargers".
    chargers: specific.length ? specific : null,
    validFrom: a.validFrom,
    validUntil: a.validUntil ?? undefined,
  };
}

export default function ConsoleAdminVehicleDetailPage() {
  const params = useParams<{ country: string; vehicleId: string }>();
  const router = useRouter();
  const base = `/${params.country}/console`;
  const { data: v, isPending, isError, refetch } = useIndividualVehicle(params.vehicleId);
  const setActive = useSetIndividualVehicleActive();
  const clearDebt = useClearDebt();
  const removePayment = useRemovePaymentMethod();
  const deleteAllowance = useDeleteAllowance();
  const updateAllowance = useUpdateAllowance();
  const [modal, setModal] = React.useState<VehicleModal | null>(null);

  const actions = v ? (
    <div className="flex items-center gap-2">
      <Btn size="sm" variant="ghost" icon="sliders" onClick={() => setModal({ kind: 'edit' })}>Edit</Btn>
      <Btn
        size="sm"
        variant={v.isActive ? 'danger' : 'primary'}
        loading={setActive.isPending}
        onClick={() => setModal({ kind: 'confirm-active' })}
      >
        {v.isActive ? 'Deactivate' : 'Activate'}
      </Btn>
    </div>
  ) : undefined;

  const head = (
    <PageHead
      title={v ? `${v.make} ${v.model}` : 'Vehicle'}
      crumb={<>Vehicles</>}
      back
      onBack={() => router.push(`${base}/admin/vehicles`)}
      actions={actions}
    />
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        {head}
        <span className="kc-skeleton block" style={{ height: 90 }} />
        <span className="kc-skeleton block" style={{ height: 220 }} />
      </div>
    );
  }
  if (isError || !v) {
    return (
      <div className="space-y-6">
        {head}
        <Card>
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t load this vehicle.
            <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
          </div>
        </Card>
      </div>
    );
  }

  const debt = v.debtBalance ?? 0;

  return (
    <div className="space-y-6">
      {head}

      <SummaryStrip
        items={[
          { label: 'Battery', value: v.batteryCapacity ? `${fmtNumber(v.batteryCapacity)} kWh` : '—' },
          { label: 'Outstanding debt', value: `${fmtNumber(debt)} RWF`, deltaKind: debt > 0 ? 'err' : 'neutral' },
          { label: 'Plates', value: fmtNumber(plates(v).length) },
          { label: 'Free allowances', value: fmtNumber(v.freeChargingAllowances?.length ?? 0) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Vehicle" pad={false}>
          <div className="px-5 py-3">
            <InfoRow label="Kabisa ID"><span className="mono">{v.kabisaId}</span></InfoRow>
            <InfoRow label="VIN"><span className="mono">{v.vin || '—'}</span></InfoRow>
            <InfoRow label="Charging status">{v.chargingStatus || '—'}</InfoRow>
            <InfoRow label="Owner">{ownerName(v)}</InfoRow>
            <InfoRow label="Status">{v.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}</InfoRow>
          </div>
        </Card>

        <Card
          title="Plates & debt"
          pad={false}
          action={
            <span className="flex gap-1.5">
              <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'collect' })}>Collect</Btn>
              <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'add' })}>Add</Btn>
              <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'set' })}>Set</Btn>
              {debt > 0 && <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'clear' })}>Clear</Btn>}
              <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'logs' })}>History</Btn>
            </span>
          }
        >
          <div className="px-5 py-3">
            <InfoRow label="License plates">{plates(v).length ? plates(v).join(', ') : '—'}</InfoRow>
            <InfoRow label="Debt balance">
              <span className={debt > 0 ? 'text-[#c0392b] dark:text-[#f0998a]' : ''}>{fmtNumber(debt)} RWF</span>
            </InfoRow>
            <InfoRow label="Debt note">{v.debtNote || '—'}</InfoRow>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Payment methods"
          pad={false}
          action={
            <span className="flex gap-1.5">
              <Btn size="xs" variant="ghost" icon="plus" onClick={() => setModal({ kind: 'pay-kabisa' })}>Kabisa</Btn>
              <Btn size="xs" variant="ghost" icon="plus" onClick={() => setModal({ kind: 'pay-momo' })}>MoMo</Btn>
            </span>
          }
        >
          {(v.paymentMethods ?? []).filter((p) => p.isActive).length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No payment methods.</div>
          ) : (
            <table className="kc-table">
              <thead><tr><th>Type</th><th>Details</th><th>Default</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {(v.paymentMethods ?? []).filter((p) => p.isActive).map((p) => (
                  <tr key={p.id}>
                    <td className="capitalize">{p.type.toLowerCase()}</td>
                    <td className="mono text-gray-500 dark:text-gray-400">
                      {p.type === 'KABISA' ? `${fmtNumber(p.balance ?? 0)} ${p.currency ?? 'RWF'}` : p.phoneNumber ?? '—'}
                      {p.network ? ` · ${p.network}` : ''}
                    </td>
                    <td>{p.isDefault ? <Badge kind="info">default</Badge> : '—'}</td>
                    <td>
                      <span className="flex justify-end">
                        <Btn
                          size="xs"
                          variant="ghost"
                          disabled={removePayment.isPending}
                          onClick={() => removePayment.mutate({ vehicleId: v.id, paymentMethodId: p.id })}
                        >
                          Remove
                        </Btn>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title="Free-charging allowances"
          pad={false}
          action={<Btn size="xs" variant="ghost" icon="plus" onClick={() => setModal({ kind: 'allowance' })}>Add</Btn>}
        >
          {(v.freeChargingAllowances ?? []).length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No allowances.</div>
          ) : (
            <table className="kc-table">
              <thead><tr><th>Allowance</th><th>Valid</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {(v.freeChargingAllowances ?? []).map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.isUnlimited ? 'Unlimited sessions' : `${fmtNumber(a.remainingCount ?? 0)} session(s) left`}
                      {a.freeKwhLimit != null && <span className="text-[var(--text3)]"> · {fmtNumber(a.freeKwhLimit)} kWh</span>}
                    </td>
                    <td className="text-gray-500 dark:text-gray-400">
                      {new Date(a.validFrom).toLocaleDateString()}
                      {a.validUntil ? ` – ${new Date(a.validUntil).toLocaleDateString()}` : ' –'}
                    </td>
                    <td>
                      <span className="flex justify-end gap-1.5">
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'allowance', allowance: a })}>Edit</Btn>
                        {a.isActive !== false && (
                          <Btn
                            size="xs"
                            variant="ghost"
                            disabled={updateAllowance.isPending}
                            onClick={() =>
                              updateAllowance.mutate({ vehicleId: v.id, allowanceId: a.id, data: { ...allowanceToData(a), isActive: false } })
                            }
                          >
                            Deactivate
                          </Btn>
                        )}
                        <Btn
                          size="xs"
                          variant="ghost"
                          disabled={deleteAllowance.isPending}
                          onClick={() => deleteAllowance.mutate({ vehicleId: v.id, allowanceId: a.id })}
                        >
                          Remove
                        </Btn>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {modal?.kind === 'edit' && <VehicleFormModal mode="edit" vehicle={v} onClose={() => setModal(null)} />}
      {modal?.kind === 'confirm-active' && (
        <ConfirmDialog
          title={v.isActive ? 'Deactivate vehicle?' : 'Activate vehicle?'}
          body={
            v.isActive ? (
              <>Deactivating <strong>{v.make} {v.model}</strong> hides it from the fleet and blocks its charging.</>
            ) : (
              <>Reactivates <strong>{v.make} {v.model}</strong> and restores charging.</>
            )
          }
          confirmLabel={v.isActive ? 'Deactivate' : 'Activate'}
          pending={setActive.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() => setActive.mutate({ id: v.id, active: !v.isActive }, { onSettled: () => setModal(null) })}
        />
      )}
      {(modal?.kind === 'set' || modal?.kind === 'add' || modal?.kind === 'collect') && (
        <DebtActionModal
          action={modal.kind}
          vehicleId={v.id}
          vehicleLabel={`${v.make} ${v.model}`}
          debtBalance={debt}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'logs' && <DebtLogsModal vehicleId={v.id} vehicleLabel={`${v.make} ${v.model}`} onClose={() => setModal(null)} />}
      {modal?.kind === 'clear' && (
        <ConfirmDialog
          title="Clear debt?"
          body={<>Clears the full <strong>{fmtNumber(debt)} RWF</strong> balance without collecting it. Logged in the debt history.</>}
          confirmLabel="Clear debt"
          pending={clearDebt.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() => clearDebt.mutate(v.id, { onSettled: () => setModal(null) })}
        />
      )}
      {(modal?.kind === 'pay-kabisa' || modal?.kind === 'pay-momo') && (
        <PaymentMethodModal
          kind={modal.kind === 'pay-kabisa' ? 'kabisa' : 'momo'}
          vehicleId={v.id}
          vehicleLabel={`${v.make} ${v.model}`}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'allowance' && <AllowanceModal vehicleId={v.id} vehicleLabel={`${v.make} ${v.model}`} allowance={modal.allowance} onClose={() => setModal(null)} />}
    </div>
  );
}
