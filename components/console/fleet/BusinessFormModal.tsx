'use client';

/** Create / edit a B2B business (KAB-174). Create also needs the initial
 *  payment contract (name, invoicing day, base rate) — the API requires it. */
import React from 'react';
import ImageUpload from '@/components/ui/image-upload';
import { Field, FormModal, TextField } from '@/components/console/fleet/shared';
import { useCreateBusiness, useUpdateBusiness, type Business } from '@/lib/console/fleet';

export function BusinessFormModal({
  mode,
  business,
  onClose,
}: Readonly<{ mode: 'create' | 'edit'; business?: Business | null; onClose: () => void }>) {
  const create = useCreateBusiness();
  const update = useUpdateBusiness();
  const pending = create.isPending || update.isPending;

  const [name, setName] = React.useState(business?.name ?? '');
  const [tin, setTin] = React.useState(business?.tin ?? '');
  const [imageUrl, setImageUrl] = React.useState(business?.imageUrl ?? '');
  const [contractName, setContractName] = React.useState('');
  const [invoiceDay, setInvoiceDay] = React.useState('1');
  const [rate, setRate] = React.useState('');

  const dayValue = Number(invoiceDay);
  const dayValid = Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 28;
  const rateValue = Number(rate);
  const rateValid = rate.trim() !== '' && !Number.isNaN(rateValue) && rateValue > 0;
  const baseValid = name.trim().length > 0 && tin.trim().length > 0;
  const canSubmit = mode === 'create' ? baseValid && contractName.trim().length > 0 && dayValid && rateValid : baseValid;

  const submit = () => {
    if (mode === 'create') {
      create.mutate(
        {
          name: name.trim(),
          tin: tin.trim(),
          imageUrl: imageUrl || null,
          contractName: contractName.trim(),
          invoicingDateOfTheMonth: dayValue,
          defaultPricingTiers: [{ minKwh: 0, ratePerKwh: rateValue }],
        },
        { onSuccess: () => onClose() },
      );
    } else if (business) {
      update.mutate(
        { id: business.id, data: { name: name.trim(), tin: tin.trim(), imageUrl: imageUrl || null } },
        { onSuccess: () => onClose() },
      );
    }
  };

  return (
    <FormModal
      title={mode === 'create' ? 'New business' : 'Edit business'}
      sub={mode === 'create' ? 'Pre-registers a B2B business with its payment contract.' : undefined}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Create business' : 'Save changes'}
    >
      <TextField id="b-name" label="Name" value={name} onChange={setName} autoFocus />
      <TextField id="b-tin" label="TIN" value={tin} onChange={setTin} placeholder="RRA taxpayer id" />
      <Field label="Logo">
        <ImageUpload
          name="business-logo"
          label="Logo"
          currentImage={imageUrl || null}
          onImageChange={(_, url) => setImageUrl(url || '')}
          isRequired={false}
          uploadContext="business-logo"
          entityId={business?.id}
          compact
        />
      </Field>
      {mode === 'create' && (
        <>
          <TextField id="b-contract" label="Contract name" value={contractName} onChange={setContractName} placeholder="e.g. Standard B2B" />
          <div style={{ display: 'flex', gap: 12 }}>
            <TextField id="b-day" label="Invoicing day (1–28)" value={invoiceDay} onChange={setInvoiceDay} type="number" flex />
            <TextField id="b-rate" label="Rate (RWF / kWh)" value={rate} onChange={setRate} type="number" flex />
          </div>
          {!dayValid && invoiceDay.trim() !== '' && (
            <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Invoicing day must be between 1 and 28.</p>
          )}
        </>
      )}
    </FormModal>
  );
}
