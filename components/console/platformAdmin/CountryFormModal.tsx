'use client';

/** Create / edit a country (KAB-163) — name, ISO code, currency and the fiscal
 *  receipt system + payment provider. Writes via lib/console/platformAdmin. */
import React from 'react';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { inputStyle } from '@/components/console/form';
import { useSaveCountry, type Country } from '@/lib/console/platformAdmin';

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};

export function CountryFormModal({
  mode,
  country,
  onClose,
}: Readonly<{ mode: 'create' | 'edit'; country?: Country | null; onClose: () => void }>) {
  const save = useSaveCountry();
  const [name, setName] = React.useState(country?.name ?? '');
  const [code, setCode] = React.useState(country?.code ?? '');
  const [currency, setCurrency] = React.useState(country?.currency ?? 'RWF');
  const [receiptMethod, setReceiptMethod] = React.useState(country?.receiptMethod ?? '');
  const [paymentMethod, setPaymentMethod] = React.useState(country?.paymentMethod ?? '');

  const canSave = name.trim().length > 0 && code.trim().length === 2 && !save.isPending;

  const submit = () => {
    if (!canSave) return;
    const data = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      currency: currency.trim() || undefined,
      receiptMethod: receiptMethod.trim() || null,
      paymentMethod: paymentMethod.trim() || null,
    };
    save.mutate({ id: country?.id, data }, { onSuccess: () => onClose() });
  };

  return (
    <ModalShell onClose={onClose} closeDisabled={save.isPending} width={480}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{mode === 'create' ? 'Add country' : 'Edit country'}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
          Sets the fiscal-receipt system and payment provider used for this country.
        </div>
      </div>

      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="c-name">Name</label>
          <input id="c-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rwanda" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="c-code">ISO code</label>
            <input id="c-code" style={inputStyle} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={2} placeholder="RW" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="c-currency">Currency</label>
            <input id="c-currency" style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="RWF" />
          </div>
        </div>
        <div>
          <label style={labelStyle} htmlFor="c-receipt">Fiscal receipt system</label>
          <input id="c-receipt" style={inputStyle} value={receiptMethod} onChange={(e) => setReceiptMethod(e.target.value)} placeholder="e.g. EBM_RRA, KRA_TIMS" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="c-payment">Payment provider</label>
          <input id="c-payment" style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="e.g. MTN_MOMO, PAYSTACK, M_PESA" />
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={save.isPending}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={submit} disabled={!canSave}>
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create country' : 'Save changes'}
        </Btn>
      </div>
    </ModalShell>
  );
}
