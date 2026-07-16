'use client';

/** Set / add / collect debt for one vehicle (KAB-174). Clearing is a
 *  ConfirmDialog on the calling page — no form input needed. */
import React from 'react';
import { FormModal, TextField } from '@/components/console/fleet/shared';
import { fmtNumber } from '@/lib/console/dashboard';
import { useSetDebt, useAddDebt, useCollectDebt } from '@/lib/console/fleet';

export type DebtAction = 'set' | 'add' | 'collect';

const TITLES: Record<DebtAction, string> = {
  set: 'Set debt balance',
  add: 'Add debt',
  collect: 'Collect debt',
};

export function DebtActionModal({
  action,
  vehicleId,
  vehicleLabel,
  debtBalance,
  onClose,
}: Readonly<{
  action: DebtAction;
  vehicleId: string;
  vehicleLabel: string;
  debtBalance: number;
  onClose: () => void;
}>) {
  const setDebt = useSetDebt();
  const addDebt = useAddDebt();
  const collectDebt = useCollectDebt();
  const pending = setDebt.isPending || addDebt.isPending || collectDebt.isPending;

  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const amountValue = Number(amount);
  const amountValid = amount.trim() !== '' && !Number.isNaN(amountValue) && amountValue >= 0;
  const canSubmit = action === 'collect' ? phone.trim().length >= 10 : amountValid;

  const submit = () => {
    const opts = { onSuccess: () => onClose() };
    if (action === 'set') setDebt.mutate({ vehicleId, debtAmount: amountValue, note: note.trim() || undefined }, opts);
    else if (action === 'add') addDebt.mutate({ vehicleId, additionalDebt: amountValue, note: note.trim() || undefined }, opts);
    else collectDebt.mutate({ vehicleId, phone: phone.trim() }, opts);
  };

  return (
    <FormModal
      title={TITLES[action]}
      sub={`${vehicleLabel} — current balance ${fmtNumber(debtBalance)} RWF`}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={pending}
      submitLabel={TITLES[action]}
      width={420}
    >
      {action === 'collect' ? (
        <TextField
          id="d-phone"
          label="MoMo phone to charge"
          value={phone}
          onChange={setPhone}
          placeholder="+2507…"
          autoFocus
        />
      ) : (
        <>
          <TextField
            id="d-amount"
            label={action === 'set' ? 'New balance (RWF)' : 'Amount to add (RWF)'}
            value={amount}
            onChange={setAmount}
            type="number"
            autoFocus
          />
          <TextField id="d-note" label="Note" value={note} onChange={setNote} placeholder="Optional" />
        </>
      )}
    </FormModal>
  );
}
