'use client';

/** Create / edit a marketplace shop vehicle (KAB-175) —
 *  /api/admin/shop/vehicles. The create API requires the full catalog record. */
import React from 'react';
import { Select } from '@/components/console/ui';
import { ImageField } from '@/components/console/ImageField';
import { inputStyle } from '@/components/console/form';
import { Field, FormModal, TextField } from '@/components/console/fleet/shared';
import {
  useCreateShopVehicle,
  useUpdateShopVehicle,
  type IShopVehicle,
  type ShopVehicleCreateData,
} from '@/lib/console/fleet';

const CATEGORIES = ['PASSENGER', 'COMMERCIAL'] as const;
const CLASSIFICATIONS = ['SEDAN', 'COMPACT_SUV', 'SUV', 'PICKUP', 'VAN', 'LIGHT_DUTY_TRUCK', 'TRUCK', 'REFRIGERATED', 'BUS'] as const;
const KABISA_PRODUCTS = ['CORE', 'NON_CORE', 'OTHERS', 'ALTERNATIVE'] as const;
const CURRENCIES = ['USD', 'RWF', 'EUR'] as const;

const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));
const isPos = (n: number | undefined): boolean => n != null && !Number.isNaN(n) && n > 0;

export function ShopVehicleFormModal({
  mode,
  vehicle,
  defaultShopId,
  onClose,
}: Readonly<{
  mode: 'create' | 'edit';
  vehicle?: IShopVehicle | null;
  /** Prefill for create — the shop id shared by the existing catalog. */
  defaultShopId?: string;
  onClose: () => void;
}>) {
  const create = useCreateShopVehicle();
  const update = useUpdateShopVehicle();
  const pending = create.isPending || update.isPending;

  const [shopId, setShopId] = React.useState(vehicle?.shopId ?? defaultShopId ?? '');
  const [make, setMake] = React.useState(vehicle?.make ?? '');
  const [model, setModel] = React.useState(vehicle?.model ?? '');
  const [year, setYear] = React.useState(vehicle?.year != null ? String(vehicle.year) : '');
  const [category, setCategory] = React.useState<string>(vehicle?.category ?? CATEGORIES[0]);
  const [classification, setClassification] = React.useState<string>(vehicle?.classification ?? CLASSIFICATIONS[0]);
  const [kabisaProduct, setKabisaProduct] = React.useState<string>(vehicle?.kabisaProduct ?? KABISA_PRODUCTS[0]);
  const [range, setRange] = React.useState(vehicle?.range != null ? String(vehicle.range) : '');
  const [price, setPrice] = React.useState(vehicle?.price != null ? String(vehicle.price) : '');
  const [currency, setCurrency] = React.useState(vehicle?.currency ?? 'USD');
  const [doors, setDoors] = React.useState(vehicle?.doors != null ? String(vehicle.doors) : '');
  const [seats, setSeats] = React.useState(vehicle?.seats != null ? String(vehicle.seats) : '');
  const [storage, setStorage] = React.useState(vehicle?.storageCapacity != null ? String(vehicle.storageCapacity) : '');
  const [battery, setBattery] = React.useState(vehicle?.batteryCapacity != null ? String(vehicle.batteryCapacity) : '');
  const [details, setDetails] = React.useState(vehicle?.details ?? '');
  const [mainImage, setMainImage] = React.useState(vehicle?.mainImage ?? '');

  const canSubmit =
    shopId.trim().length > 0 &&
    make.trim().length > 0 &&
    model.trim().length > 0 &&
    isPos(num(year)) &&
    isPos(num(range)) &&
    isPos(num(price)) &&
    isPos(num(doors)) &&
    isPos(num(seats)) &&
    isPos(num(storage)) &&
    isPos(num(battery)) &&
    details.trim().length > 0 &&
    // The create API requires an image; on edit the field may be empty
    // (older records, or after Remove) and must not block other changes.
    (mode === 'edit' || mainImage.trim().length > 0);

  const submit = () => {
    const data: ShopVehicleCreateData = {
      shopId: shopId.trim(),
      make: make.trim(),
      model: model.trim(),
      year: num(year) as number,
      category: category as ShopVehicleCreateData['category'],
      classification: classification as ShopVehicleCreateData['classification'],
      kabisaProduct: kabisaProduct as ShopVehicleCreateData['kabisaProduct'],
      range: num(range) as number,
      price: num(price) as number,
      currency,
      doors: num(doors) as number,
      seats: num(seats) as number,
      storageCapacity: num(storage) as number,
      batteryCapacity: num(battery) as number,
      details: details.trim(),
      mainImage: mainImage.trim(),
      // The create API requires both arrays; colors are curated later from the dashboard.
      trim: vehicle?.trim ?? [],
      availableColors: (vehicle?.availableColors ?? []).map((c) => ({ color: c.color, imageUrl: c.imageUrl })),
    };
    if (mode === 'create') {
      create.mutate(data, { onSuccess: () => onClose() });
    } else if (vehicle) {
      const updateData: Partial<ShopVehicleCreateData> = { ...data };
      delete updateData.shopId;
      // The update schema validates mainImage as a URL when present — an
      // empty value must be omitted, not sent as ''.
      if (!updateData.mainImage) delete updateData.mainImage;
      update.mutate({ id: vehicle.id, data: updateData }, { onSuccess: () => onClose() });
    }
  };

  return (
    <FormModal
      title={mode === 'create' ? 'New shop vehicle' : 'Edit shop vehicle'}
      sub="Marketplace catalog record — all fields feed the customer shop."
      onClose={onClose}
      onSubmit={submit}
      canSubmit={canSubmit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Create vehicle' : 'Save changes'}
      width={560}
    >
      {mode === 'create' && (
        <TextField id="s-shop" label="Shop ID" value={shopId} onChange={setShopId} placeholder="Shop this model belongs to" />
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="s-make" label="Make" value={make} onChange={setMake} autoFocus flex />
        <TextField id="s-model" label="Model" value={model} onChange={setModel} flex />
        <TextField id="s-year" label="Year" value={year} onChange={setYear} type="number" flex />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Category" flex>
          <Select options={[...CATEGORIES]} value={category} onChange={setCategory} style={{ width: '100%' }} />
        </Field>
        <Field label="Classification" flex>
          <Select options={[...CLASSIFICATIONS]} value={classification} onChange={setClassification} style={{ width: '100%' }} />
        </Field>
        <Field label="Kabisa product" flex>
          <Select options={[...KABISA_PRODUCTS]} value={kabisaProduct} onChange={setKabisaProduct} style={{ width: '100%' }} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="s-range" label="Range (km)" value={range} onChange={setRange} type="number" flex />
        <TextField id="s-price" label="Price" value={price} onChange={setPrice} type="number" flex />
        <Field label="Currency" flex>
          <Select options={[...CURRENCIES]} value={currency} onChange={setCurrency} style={{ width: '100%' }} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TextField id="s-doors" label="Doors" value={doors} onChange={setDoors} type="number" flex />
        <TextField id="s-seats" label="Seats" value={seats} onChange={setSeats} type="number" flex />
        <TextField id="s-storage" label="Storage (L)" value={storage} onChange={setStorage} type="number" flex />
        <TextField id="s-battery" label="Battery (kWh)" value={battery} onChange={setBattery} type="number" flex />
      </div>
      <ImageField label="Main image" value={mainImage} onChange={setMainImage} uploadContext="shop-image" entityId={vehicle?.id} />
      <Field id="s-details" label="Details">
        <textarea
          id="s-details"
          style={{ ...inputStyle, height: 72, resize: 'vertical' }}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Customer-facing description"
        />
      </Field>
    </FormModal>
  );
}
