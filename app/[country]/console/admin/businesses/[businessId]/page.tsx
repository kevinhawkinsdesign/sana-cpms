'use client';

/** Platform · Business detail (KAB-162 + KAB-174): one B2B business across
 *  orgs, from /api/admin/businesses/:id — profile, members and fleet, with the
 *  write actions: edit / deactivate, contract add-update, vehicle add /
 *  unassign / deactivate. Platform-admin only. */
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Btn, Card, PageHead, SummaryStrip } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { BusinessFormModal } from '@/components/console/fleet/BusinessFormModal';
import { ContractModal } from '@/components/console/fleet/ContractModal';
import { BusinessVehicleModal, type EditableBusinessVehicle } from '@/components/console/fleet/BusinessVehicleModal';
import { BusinessVehicleAllowancesModal } from '@/components/console/fleet/BusinessVehicleAllowancesModal';
import { BusinessVehiclePaymentsModal } from '@/components/console/fleet/BusinessVehiclePaymentsModal';
import { BulkAddVehiclesModal } from '@/components/dashboard/admin/business/BulkAddVehiclesModal';
import { fmtNumber } from '@/lib/console/dashboard';
import {
  useBusiness,
  useDeactivateBusiness,
  useUnassignBusinessVehicle,
  useDeactivateBusinessVehicle,
  type Business,
} from '@/lib/console/fleet';

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{children}</span>
    </div>
  );
}

function memberName(m: { firstName: string; lastName: string; email: string }): string {
  return [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
}

function vehicleCount(b: Business): number {
  return b._count?.vehicleOwnerships ?? b.vehicleOwnerships?.length ?? 0;
}

function invoiceBadgeKind(status: string): 'ok' | 'warn' | 'err' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'PAID') return 'ok';
  if (s === 'OVERDUE') return 'err';
  if (s === 'PENDING' || s === 'UNPAID' || s === 'SENT') return 'warn';
  return 'neutral';
}

type BusinessModal =
  | { kind: 'edit' }
  | { kind: 'deactivate' }
  | { kind: 'contract' }
  | { kind: 'add-vehicle' }
  | { kind: 'bulk-add' }
  | { kind: 'edit-vehicle'; vehicle: EditableBusinessVehicle; label: string }
  | { kind: 'payments'; vehicleId: string; label: string }
  | { kind: 'unassign-vehicle'; vehicleId: string; label: string }
  | { kind: 'deactivate-vehicle'; vehicleId: string; label: string }
  | { kind: 'free-charging'; vehicleId: string; label: string };

export default function ConsoleAdminBusinessDetailPage() {
  const params = useParams<{ country: string; businessId: string }>();
  const router = useRouter();
  const base = `/${params.country}/console`;
  const { data: b, isPending, isError, refetch } = useBusiness(params.businessId);
  const deactivate = useDeactivateBusiness();
  const unassignVehicle = useUnassignBusinessVehicle();
  const deactivateVehicle = useDeactivateBusinessVehicle();
  const [modal, setModal] = React.useState<BusinessModal | null>(null);
  const [vehicleSearch, setVehicleSearch] = React.useState('');

  const actions = b ? (
    <div className="flex items-center gap-2">
      <Btn size="sm" variant="ghost" icon="sliders" onClick={() => setModal({ kind: 'edit' })}>Edit</Btn>
      {b.isActive && (
        <Btn size="sm" variant="danger" icon="x" onClick={() => setModal({ kind: 'deactivate' })}>Deactivate</Btn>
      )}
    </div>
  ) : undefined;

  const head = (
    <PageHead
      title={b?.name ?? 'Business'}
      crumb={<>Businesses</>}
      back
      onBack={() => router.push(`${base}/admin/businesses`)}
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
  if (isError || !b) {
    return (
      <div className="space-y-6">
        {head}
        <Card>
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t load this business.
            <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
          </div>
        </Card>
      </div>
    );
  }

  const members = b.businessUsers ?? [];
  const invoices = b.businessPaymentContractInvoices ?? [];
  const allVehicles = b.vehicleOwnerships ?? [];
  const q = vehicleSearch.trim().toLowerCase();
  const vehicles = q
    ? allVehicles.filter((o) =>
        [o.vehicle.make, o.vehicle.model, o.vehicle.kabisaId, o.vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    : allVehicles;

  return (
    <div className="space-y-6">
      {head}

      <SummaryStrip
        items={[
          { label: 'Vehicles', value: fmtNumber(vehicleCount(b)) },
          { label: 'Members', value: fmtNumber(members.length) },
          { label: 'Status', value: b.isActive ? 'Active' : 'Inactive', deltaKind: b.isActive ? 'ok' : 'neutral' },
        ]}
      />

      <Card
        title="Business"
        pad={false}
        action={
          <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'contract' })}>
            {b.businessPaymentContract ? 'Update contract' : 'Add contract'}
          </Btn>
        }
      >
        <div className="px-5 py-3">
          {b.imageUrl && (
            <InfoRow label="Logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={`${b.name} logo`} className="inline-block h-8 w-8 rounded object-cover" />
            </InfoRow>
          )}
          <InfoRow label="TIN"><span className="mono">{b.tin || '—'}</span></InfoRow>
          <InfoRow label="Status">{b.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="neutral">inactive</Badge>}</InfoRow>
          <InfoRow label="Contract">
            {b.businessPaymentContract
              ? `${b.businessPaymentContract.contractName} · invoiced on day ${b.businessPaymentContract.invoicingDateOfTheMonth}`
              : '—'}
          </InfoRow>
        </div>
      </Card>

      <Card title="Members" pad={false} action={<span className="text-xs text-[var(--text3)]">{members.length} total</span>}>
        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No members.</div>
        ) : (
          <table className="kc-table">
            <thead><tr><th>Member</th><th>Role</th><th>Contact</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-gray-800 dark:text-white/90">{memberName(m)}</td>
                  <td className="capitalize text-gray-500 dark:text-gray-400">{m.role?.toLowerCase() || '—'}</td>
                  <td className="text-gray-500 dark:text-gray-400">{m.email || m.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {invoices.length > 0 && (
        <Card title="Invoices" pad={false} action={<span className="text-xs text-[var(--text3)]">{invoices.length} total</span>}>
          <table className="kc-table">
            <thead><tr><th>Invoice</th><th>Due</th><th>Amount</th><th className="text-right">Status</th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono font-medium text-gray-800 dark:text-white/90">{inv.invoiceNumber}</td>
                  <td className="text-gray-500 dark:text-gray-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="text-gray-500 dark:text-gray-400">{fmtNumber(inv.amount)} RWF</td>
                  <td className="text-right"><Badge kind={invoiceBadgeKind(inv.status)}>{inv.status.toLowerCase()}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Fleet"
        pad={false}
        action={
          <span className="flex items-center gap-2">
            <input
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              placeholder="Search fleet…"
              className="h-7 w-40 rounded-md border px-2 text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text1)' }}
            />
            <span className="text-xs text-[var(--text3)]">{allVehicles.length} total</span>
            <Btn size="xs" variant="ghost" icon="upload" onClick={() => setModal({ kind: 'bulk-add' })}>Bulk upload</Btn>
            <Btn size="xs" variant="ghost" icon="plus" onClick={() => setModal({ kind: 'add-vehicle' })}>Add vehicle</Btn>
          </span>
        }
      >
        {vehicles.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {q ? `No vehicles match "${vehicleSearch}".` : 'No vehicles.'}
          </div>
        ) : (
          <table className="kc-table">
            <thead><tr><th>Vehicle</th><th>Kabisa ID</th><th>Plate</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {vehicles.map((o) => {
                const label = `${o.vehicle.make} ${o.vehicle.model} · ${o.vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber ?? o.vehicle.kabisaId}`;
                const fcCount = o.vehicle.freeChargingAllowances?.length ?? 0;
                return (
                  <tr key={o.id}>
                    <td className="font-medium text-gray-800 dark:text-white/90">{o.vehicle.make} {o.vehicle.model}</td>
                    <td className="mono text-gray-500 dark:text-gray-400">{o.vehicle.kabisaId}</td>
                    <td className="mono">{o.vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber ?? '—'}</td>
                    <td>
                      <span className="flex justify-end gap-1.5">
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'edit-vehicle', vehicle: o.vehicle, label })}>
                          Edit
                        </Btn>
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'payments', vehicleId: o.vehicle.id, label })}>
                          Payments
                        </Btn>
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'free-charging', vehicleId: o.vehicle.id, label })}>
                          Free charging{fcCount > 0 ? ` (${fcCount})` : ''}
                        </Btn>
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'unassign-vehicle', vehicleId: o.vehicle.id, label })}>
                          Unassign
                        </Btn>
                        <Btn size="xs" variant="ghost" onClick={() => setModal({ kind: 'deactivate-vehicle', vehicleId: o.vehicle.id, label })}>
                          Deactivate
                        </Btn>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {modal?.kind === 'edit' && <BusinessFormModal mode="edit" business={b} onClose={() => setModal(null)} />}
      {modal?.kind === 'contract' && <ContractModal business={b} onClose={() => setModal(null)} />}
      {modal?.kind === 'add-vehicle' && (
        <BusinessVehicleModal businessId={b.id} businessName={b.name} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit-vehicle' && (
        <BusinessVehicleModal businessId={b.id} businessName={b.name} vehicle={modal.vehicle} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'bulk-add' && (
        <BulkAddVehiclesModal
          isOpen
          businessId={b.id}
          businessName={b.name}
          existingLicensePlates={allVehicles
            .map((o) => o.vehicle.vehicleLicensePlates?.[0]?.licencePlateNumber)
            .filter((p): p is string => typeof p === 'string')}
          onClose={() => setModal(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
      {modal?.kind === 'payments' && (
        <BusinessVehiclePaymentsModal
          businessId={b.id}
          vehicleId={modal.vehicleId}
          vehicleLabel={modal.label}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'free-charging' && (
        <BusinessVehicleAllowancesModal
          businessId={b.id}
          vehicleId={modal.vehicleId}
          vehicleLabel={modal.label}
          allowances={allVehicles.find((o) => o.vehicle.id === modal.vehicleId)?.vehicle.freeChargingAllowances ?? []}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate business?"
          body={<>Deactivating <strong>{b.name}</strong> hides it and its contract from invoicing until reactivated by support.</>}
          confirmLabel="Deactivate"
          pending={deactivate.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() => deactivate.mutate(b.id, { onSettled: () => setModal(null) })}
        />
      )}
      {modal?.kind === 'unassign-vehicle' && (
        <ConfirmDialog
          title="Unassign vehicle?"
          body={<>Removes <strong>{modal.label}</strong> from {b.name}. The vehicle itself stays registered.</>}
          confirmLabel="Unassign"
          pending={unassignVehicle.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() =>
            unassignVehicle.mutate({ businessId: b.id, vehicleId: modal.vehicleId }, { onSettled: () => setModal(null) })
          }
        />
      )}
      {modal?.kind === 'deactivate-vehicle' && (
        <ConfirmDialog
          title="Deactivate vehicle?"
          body={<>Deactivates <strong>{modal.label}</strong> — it can no longer charge until reactivated.</>}
          confirmLabel="Deactivate"
          pending={deactivateVehicle.isPending}
          onCancel={() => setModal(null)}
          onConfirm={() =>
            deactivateVehicle.mutate({ businessId: b.id, vehicleId: modal.vehicleId }, { onSettled: () => setModal(null) })
          }
        />
      )}
    </div>
  );
}
