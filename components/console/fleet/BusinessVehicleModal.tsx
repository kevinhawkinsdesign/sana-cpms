'use client';

/** Add (or assign, if the plate already exists) a vehicle to a business, or edit
 *  an existing one (KAB-174) — POST / PUT /api/admin/businesses/:id/vehicles. */
import React from 'react';
import { FormModal, TextField } from '@/components/console/fleet/shared';
import { useAddBusinessVehicle, useUpdateBusinessVehicle } from '@/lib/console/fleet';

export type EditableBusinessVehicle = {
  id: string;
  make: string;
  model: string;
  vin?: string;
  batteryCapacity?: number;
  // Upstream types this as ReactNode; it is a plate string in practice.
  vehicleLicensePlates?: { licencePlateNumber?: React.ReactNode }[];
};

export function BusinessVehicleModal({
  businessId,
  businessName,
  vehicle,
  onClose,
}: Readonly<{
  businessId: string;
  businessName: string;
  vehicle?: EditableBusinessVehicle;
  onClose: () => void;
}>) {
  const add = useAddBusinessVehicle();
  const update = useUpdateBusinessVehicle();
  const isEdit = vehicle != null;

  const initialPlate = vehicle?.vehicleLicensePlates?.[0]?.licencePlateNumber;
  const [licensePlate, setLicensePlate] = React.useState(typeof initialPlate === 'string' ? initialPlate : '');
  const [make, setMake] = React.useState(vehicle?.make ?? '');
  const [model, setModel] = React.useState(vehicle?.model ?? '');
  const [vin, setVin] = React.useState(vehicle?.vin ?? '');
  const [battery, setBattery] = React.useState(vehicle?.batteryCapacity != null ? String(vehicle.batteryCapacity) : '');

  const batteryValue = battery.trim() === '' ? undefined : Number(battery);
  const batteryInvalid = batteryValue != null && (Number.isNaN(batteryValue) || batteryValue <= 0);
  const canSubmit = licensePlate.trim().length > 0 && make.trim().length > 0 && model.trim().length > 0 && !batteryInvalid;

  const submit = () => {
    const opts = { onSuccess: () => onClose() };
    if (isEdit) {
      update.mutate(
        {
          businessId,
          vehicleId: vehicle.id,
          data: {
            licensePlate: licensePlate.trim(),
            make: make.trim(),
            model: model.trim(),
            vin: vin.trim() || null,
            batteryCapacity: batteryValue ?? null,
          },
        },
        opts,
      );
    } else {
      add.mutate(
        {
          businessId,
          data: {
            licensePlate: licensePlate.trim(),
            make: make.trim(),
            model: model.trim(),
            vin: vin.trim() || undefined,
            batteryCapacity: batteryValue,
          },
        },
        opts,
      );
    }
  };

  return (
    <FormModal
      title={isEdit ? 'Edit vehicle' : 'Add vehicle'}
      sub={businessName}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={add.isPending || update.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Add vehicle'}
    >
      <TextField id="bv-plate" label="License plate" value={licensePlate} onChange={setLicensePlate} placeholder="RAD 123 A" autoFocus />
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="bv-make" label="Make" value={make} onChange={setMake} flex />
        <TextField id="bv-model" label="Model" value={model} onChange={setModel} flex />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="bv-vin" label="VIN" value={vin} onChange={setVin} placeholder="Optional" flex />
        <TextField id="bv-battery" label="Battery (kWh)" value={battery} onChange={setBattery} type="number" placeholder="Optional" flex />
      </div>
      {batteryInvalid && <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Battery capacity must be a positive number.</p>}
    </FormModal>
  );
}
