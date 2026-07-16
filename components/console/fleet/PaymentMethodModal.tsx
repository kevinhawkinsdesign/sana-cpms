'use client';

/** Add a Kabisa-balance or MoMo payment method to an individual vehicle
 *  (KAB-174) — /api/admin/individuals/:id/add-{kabisa,momo}-payment-method. */
import React from 'react';
import { Select } from '@/components/console/ui';
import { Field, FormModal, TextField } from '@/components/console/fleet/shared';
import { useAddKabisaPayment, useAddMomoPayment } from '@/lib/console/fleet';

const NETWORKS = ['MTN', 'AIRTEL'];

export function PaymentMethodModal({
  kind,
  vehicleId,
  vehicleLabel,
  onClose,
}: Readonly<{ kind: 'kabisa' | 'momo'; vehicleId: string; vehicleLabel: string; onClose: () => void }>) {
  const addKabisa = useAddKabisaPayment();
  const addMomo = useAddMomoPayment();
  const pending = addKabisa.isPending || addMomo.isPending;

  const [balance, setBalance] = React.useState('0');
  const [phone, setPhone] = React.useState('');
  const [network, setNetwork] = React.useState(NETWORKS[0]);
  const [isDefault, setIsDefault] = React.useState('Yes');

  const balanceValue = Number(balance);
  const balanceValid = balance.trim() !== '' && !Number.isNaN(balanceValue) && balanceValue >= 0;
  const canSubmit = kind === 'kabisa' ? balanceValid : phone.trim().length >= 10;

  const submit = () => {
    const opts = { onSuccess: () => onClose() };
    if (kind === 'kabisa') {
      addKabisa.mutate({ vehicleId, data: { isDefault: isDefault === 'Yes', balance: balanceValue, currency: 'RWF' } }, opts);
    } else {
      addMomo.mutate({ vehicleId, data: { isDefault: isDefault === 'Yes', phoneNumber: phone.trim(), network } }, opts);
    }
  };

  return (
    <FormModal
      title={kind === 'kabisa' ? 'Add Kabisa balance' : 'Add MoMo payment'}
      sub={vehicleLabel}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={pending}
      submitLabel="Add payment method"
      width={420}
    >
      {kind === 'kabisa' ? (
        <TextField id="p-balance" label="Opening balance (RWF)" value={balance} onChange={setBalance} type="number" autoFocus />
      ) : (
        <>
          <TextField id="p-phone" label="MoMo phone" value={phone} onChange={setPhone} placeholder="+2507…" autoFocus />
          <Field label="Network">
            <Select options={NETWORKS} value={network} onChange={setNetwork} style={{ width: '100%' }} />
          </Field>
        </>
      )}
      <Field label="Set as default">
        <Select options={['Yes', 'No']} value={isDefault} onChange={setIsDefault} style={{ width: '100%' }} />
      </Field>
    </FormModal>
  );
}
