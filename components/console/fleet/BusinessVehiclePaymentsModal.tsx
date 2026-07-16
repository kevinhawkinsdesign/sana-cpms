'use client';

/** Manage a business fleet vehicle's payment methods (dashboard parity): list
 *  the current methods, add a Kabisa balance (with currency), and remove one. */
import React from 'react';
import { Btn, Select } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { Field } from '@/components/console/fleet/shared';
import { inputStyle } from '@/components/console/form';
import { fmtNumber } from '@/lib/console/dashboard';
import {
  useBusinessVehiclePaymentMethods,
  useAddBusinessKabisaPayment,
  useRemoveBusinessPayment,
} from '@/lib/console/fleet';

const CURRENCIES = ['RWF', 'USD', 'EUR'];

export function BusinessVehiclePaymentsModal({
  businessId,
  vehicleId,
  vehicleLabel,
  onClose,
}: Readonly<{ businessId: string; vehicleId: string; vehicleLabel: string; onClose: () => void }>) {
  const { data, isPending, isError } = useBusinessVehiclePaymentMethods(businessId, vehicleId);
  const addKabisa = useAddBusinessKabisaPayment();
  const remove = useRemoveBusinessPayment();

  const [balance, setBalance] = React.useState('0');
  const [currency, setCurrency] = React.useState(CURRENCIES[0]);
  const [isDefault, setIsDefault] = React.useState('Yes');

  const balanceValue = Number(balance);
  const balanceValid = balance.trim() !== '' && !Number.isNaN(balanceValue) && balanceValue >= 0;

  const methods = data?.paymentMethods ?? [];

  const addSubmit = () => {
    if (!balanceValid) return;
    addKabisa.mutate(
      { businessId, vehicleId, data: { isDefault: isDefault === 'Yes', balance: balanceValue, currency } },
      { onSuccess: () => setBalance('0') },
    );
  };

  return (
    <ModalShell onClose={onClose} width={520}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text1)' }}>Payment methods</h3>
        <p className="text-xs" style={{ color: 'var(--text3)' }}>{vehicleLabel}</p>
      </div>

      <div className="overflow-y-auto">
        {isPending && <p className="p-5 text-sm" style={{ color: 'var(--text3)' }}>Loading…</p>}
        {isError && <p className="p-5 text-sm text-[#c0392b]">Couldn&apos;t load payment methods.</p>}
        {!isPending && !isError && methods.length === 0 && (
          <p className="p-5 text-sm" style={{ color: 'var(--text3)' }}>No payment methods.</p>
        )}
        {methods.length > 0 && (
          <table className="kc-table">
            <thead><tr><th>Type</th><th>Balance</th><th>Default</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium" style={{ color: 'var(--text1)' }}>{m.paymentMethodType}</td>
                  <td style={{ color: 'var(--text3)' }}>{m.balance != null ? `${fmtNumber(m.balance)} ${m.currency}` : '—'}</td>
                  <td style={{ color: 'var(--text3)' }}>{m.isDefault ? 'Yes' : 'No'}</td>
                  <td>
                    <span className="flex justify-end">
                      <Btn size="xs" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate({ businessId, vehicleId, paymentMethodId: m.id })}>Remove</Btn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Add Kabisa balance</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <span className="mb-1 block text-[10px] uppercase tracking-wide" style={{ color: 'var(--text3)' }}>Balance</span>
            <input style={inputStyle} type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <Field label="Currency" flex>
            <Select options={CURRENCIES} value={currency} onChange={setCurrency} style={{ width: '100%' }} />
          </Field>
          <Field label="Default" flex>
            <Select options={['Yes', 'No']} value={isDefault} onChange={setIsDefault} style={{ width: '100%' }} />
          </Field>
        </div>
        <div className="flex justify-between">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" disabled={!balanceValid || addKabisa.isPending} onClick={addSubmit}>Add Kabisa</Btn>
        </div>
      </div>
    </ModalShell>
  );
}
