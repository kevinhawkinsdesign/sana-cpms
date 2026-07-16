'use client';

/** Add / update a business payment contract with multi-tier volume pricing
 *  (dashboard parity). The API takes the same payload for add and update. */
import React from 'react';
import { Btn } from '@/components/console/ui';
import { Field, FormModal, TextField } from '@/components/console/fleet/shared';
import { inputStyle } from '@/components/console/form';
import { useSaveBusinessContract, type Business, type PricingTier } from '@/lib/console/fleet';

interface TierRow {
  id: number;
  minKwh: string;
  maxKwh: string;
  ratePerKwh: string;
}

let tierSeq = 0;
const nextTierId = () => ++tierSeq;
const newTier = (minKwh = '0'): TierRow => ({ id: nextTierId(), minKwh, maxKwh: '', ratePerKwh: '' });

export function ContractModal({
  business,
  onClose,
}: Readonly<{ business: Business; onClose: () => void }>) {
  const save = useSaveBusinessContract();
  const contractMethod = (business.paymentMethods ?? []).find((m) => m.businessPaymentContract);
  // Prefer the nested contract (detail shape carries the pricing tiers) so
  // `existing` and the tiers below come from the same source.
  const existing = contractMethod?.businessPaymentContract ?? business.businessPaymentContract ?? null;
  const existingTiers = (contractMethod?.businessPaymentContract?.businessPaymentContractPricingDiscounts ?? [])
    .filter((t) => t.isActive)
    .sort((a, b) => a.order - b.order);

  const [contractName, setContractName] = React.useState(existing?.contractName ?? '');
  const [invoiceDay, setInvoiceDay] = React.useState(existing ? String(existing.invoicingDateOfTheMonth) : '1');
  const [tiers, setTiers] = React.useState<TierRow[]>(
    existingTiers.length
      ? existingTiers.map((t) => ({ id: nextTierId(), minKwh: String(t.minKwh), maxKwh: t.maxKwh != null ? String(t.maxKwh) : '', ratePerKwh: String(t.ratePerKwh) }))
      : [newTier()],
  );

  const dayValue = Number(invoiceDay);
  const dayValid = Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 28;

  const setTier = (id: number, patch: Partial<TierRow>) =>
    setTiers((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addTier = () => setTiers((rows) => [...rows, newTier('')]);
  const removeTier = (id: number) => setTiers((rows) => rows.filter((r) => r.id !== id));

  const tiersValid = tiers.every((t) => {
    const min = Number(t.minKwh);
    const rate = Number(t.ratePerKwh);
    const maxOk = t.maxKwh.trim() === '' || (!Number.isNaN(Number(t.maxKwh)) && Number(t.maxKwh) > min);
    return t.minKwh.trim() !== '' && !Number.isNaN(min) && min >= 0 && t.ratePerKwh.trim() !== '' && !Number.isNaN(rate) && rate > 0 && maxOk;
  });
  const canSubmit = contractName.trim().length > 0 && dayValid && tiers.length > 0 && tiersValid;

  const submit = () => {
    const defaultPricingTiers: PricingTier[] = tiers.map((t) => ({
      minKwh: Number(t.minKwh),
      maxKwh: t.maxKwh.trim() === '' ? undefined : Number(t.maxKwh),
      ratePerKwh: Number(t.ratePerKwh),
    }));
    save.mutate(
      {
        businessId: business.id,
        exists: !!existing,
        data: { contractName: contractName.trim(), invoicingDateOfTheMonth: dayValue, defaultPricingTiers },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <FormModal
      title={existing ? 'Update contract' : 'Add contract'}
      sub={business.name}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={save.isPending}
      submitLabel={existing ? 'Update contract' : 'Add contract'}
      width={520}
    >
      <TextField id="c-name" label="Contract name" value={contractName} onChange={setContractName} autoFocus />
      <TextField id="c-day" label="Invoicing day (1–28)" value={invoiceDay} onChange={setInvoiceDay} type="number" />
      {!dayValid && invoiceDay.trim() !== '' && (
        <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Invoicing day must be between 1 and 28.</p>
      )}

      <Field label="Volume pricing tiers (RWF / kWh)">
        <div className="space-y-2">
          {tiers.map((t) => (
            <div key={t.id} className="flex items-end gap-2">
              <div className="flex-1">
                <span className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Min kWh</span>
                <input style={inputStyle} type="number" value={t.minKwh} onChange={(e) => setTier(t.id, { minKwh: e.target.value })} placeholder="0" />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Max kWh</span>
                <input style={inputStyle} type="number" value={t.maxKwh} onChange={(e) => setTier(t.id, { maxKwh: e.target.value })} placeholder="∞" />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Rate</span>
                <input style={inputStyle} type="number" value={t.ratePerKwh} onChange={(e) => setTier(t.id, { ratePerKwh: e.target.value })} placeholder="e.g. 500" />
              </div>
              <Btn size="xs" variant="ghost" disabled={tiers.length === 1} onClick={() => removeTier(t.id)}>✕</Btn>
            </div>
          ))}
          <Btn size="xs" variant="ghost" icon="plus" onClick={addTier}>Add tier</Btn>
        </div>
      </Field>
      {!tiersValid && (
        <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Each tier needs a min kWh and a positive rate; max (if set) must exceed min.</p>
      )}
    </FormModal>
  );
}
