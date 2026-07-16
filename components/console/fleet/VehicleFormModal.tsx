'use client';

/** Create / edit an individual vehicle (KAB-174) via /api/admin/individuals.
 *  Edit touches vehicle fields only — owner details are set at registration. */
import React from 'react';
import { FormModal, TextField } from '@/components/console/fleet/shared';
import {
  useCreateIndividualVehicle,
  useUpdateIndividualVehicle,
  type IndividualVehicle,
} from '@/lib/console/fleet';

export function VehicleFormModal({
  mode,
  vehicle,
  onClose,
}: Readonly<{ mode: 'create' | 'edit'; vehicle?: IndividualVehicle | null; onClose: () => void }>) {
  const create = useCreateIndividualVehicle();
  const update = useUpdateIndividualVehicle();
  const pending = create.isPending || update.isPending;

  const currentPlate = (vehicle?.licensePlates ?? vehicle?.vehicleLicensePlates ?? [])[0]?.licencePlateNumber ?? '';
  const [licensePlate, setLicensePlate] = React.useState(currentPlate);
  const [make, setMake] = React.useState(vehicle?.make ?? '');
  const [model, setModel] = React.useState(vehicle?.model ?? '');
  const [vin, setVin] = React.useState(vehicle?.vin ?? '');
  const [battery, setBattery] = React.useState(vehicle?.batteryCapacity != null ? String(vehicle.batteryCapacity) : '');
  const [ownerName, setOwnerName] = React.useState('');
  const [ownerPhone, setOwnerPhone] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');

  const batteryValue = battery.trim() === '' ? undefined : Number(battery);
  const batteryInvalid = batteryValue != null && (Number.isNaN(batteryValue) || batteryValue <= 0);
  const baseValid = licensePlate.trim().length > 0 && make.trim().length > 0 && model.trim().length > 0 && !batteryInvalid;
  const canSubmit = mode === 'create' ? baseValid && ownerName.trim().length > 0 : baseValid;

  const submit = () => {
    const vehicleFields = {
      licensePlate: licensePlate.trim(),
      make: make.trim(),
      model: model.trim(),
      vin: vin.trim() || undefined,
      batteryCapacity: batteryValue,
    };
    if (mode === 'create') {
      create.mutate(
        {
          ...vehicleFields,
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim() || undefined,
          ownerEmail: ownerEmail.trim() || undefined,
        },
        { onSuccess: () => onClose() },
      );
    } else if (vehicle) {
      update.mutate({ id: vehicle.id, data: vehicleFields }, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormModal
      title={mode === 'create' ? 'New vehicle' : 'Edit vehicle'}
      sub={mode === 'create' ? 'Pre-registers an individual vehicle and its owner.' : undefined}
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Create vehicle' : 'Save changes'}
    >
      <TextField id="v-plate" label="License plate" value={licensePlate} onChange={setLicensePlate} placeholder="RAD 123 A" autoFocus />
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="v-make" label="Make" value={make} onChange={setMake} placeholder="e.g. Spiro" flex />
        <TextField id="v-model" label="Model" value={model} onChange={setModel} placeholder="e.g. CUX" flex />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="v-vin" label="VIN" value={vin} onChange={setVin} placeholder="Optional" flex />
        <TextField id="v-battery" label="Battery (kWh)" value={battery} onChange={setBattery} type="number" placeholder="Optional" flex />
      </div>
      {mode === 'create' && (
        <>
          <TextField id="v-owner" label="Owner name" value={ownerName} onChange={setOwnerName} />
          <div style={{ display: 'flex', gap: 12 }}>
            <TextField id="v-owner-phone" label="Owner phone" value={ownerPhone} onChange={setOwnerPhone} placeholder="+2507…" flex />
            <TextField id="v-owner-email" label="Owner email" value={ownerEmail} onChange={setOwnerEmail} type="email" placeholder="Optional" flex />
          </div>
        </>
      )}
      {batteryInvalid && <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Battery capacity must be a positive number.</p>}
    </FormModal>
  );
}
