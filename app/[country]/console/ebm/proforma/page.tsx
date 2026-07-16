'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Receipt, Loader2, Download, Calculator } from 'lucide-react';

import { Btn, Card, PageHead } from '@/components/console/ui';
import { ebmItemsApi, EbmItem } from '@/lib/api/ebmItems';
import { standaloneProformaApi, StandaloneProformaInput } from '@/lib/api/standaloneProforma';

interface FormState {
  customerName: string;
  customerTin: string;
  customerPhone: string;
  ebmItemId: string;
  energyKwh: string;
  ratePerKwh: string;
  purchaseCode: string;
  discountRate: string;
  email: string;
  phone: string;
}

const INITIAL_FORM: FormState = {
  customerName: '',
  customerTin: '',
  customerPhone: '',
  ebmItemId: '',
  energyKwh: '',
  ratePerKwh: '',
  purchaseCode: '',
  discountRate: '',
  email: '',
  phone: '',
};

function formatCurrency(amount: number): string {
  return `RWF ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const inputCls =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90';

const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400';

export default function StandaloneProformaPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [ebmItems, setEbmItems] = useState<EbmItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = ebmItems.find((item) => item.id === form.ebmItemId) ?? null;

  // Derived calculations
  const energyKwh = parseFloat(form.energyKwh) || 0;
  const ratePerKwh = parseFloat(form.ratePerKwh) || 0;
  const discountRate = parseFloat(form.discountRate) || 0;
  const taxRate = selectedItem ? Number(selectedItem.taxRate) : 18;

  const subtotal = energyKwh * ratePerKwh;
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / (100 + taxRate);
  const total = subtotal - discountAmount;

  // Load EBM items on mount
  useEffect(() => {
    let cancelled = false;
    setItemsLoading(true);
    ebmItemsApi
      .getAllItems()
      .then((items) => {
        if (!cancelled) {
          setEbmItems(items.filter((item) => item.isActive));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load EBM items');
        }
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-fill rate from selected item
  const handleItemChange = useCallback(
    (itemId: string) => {
      const item = ebmItems.find((i) => i.id === itemId);
      setForm((prev) => ({
        ...prev,
        ebmItemId: itemId,
        ratePerKwh: item ? String(Number(item.unitPrice)) : prev.ratePerKwh,
      }));
    },
    [ebmItems]
  );

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.ebmItemId) {
      toast.error('Please select an EBM item');
      return;
    }
    if (!energyKwh || energyKwh <= 0) {
      toast.error('kWh amount must be greater than 0');
      return;
    }
    if (!ratePerKwh || ratePerKwh <= 0) {
      toast.error('Rate per kWh must be greater than 0');
      return;
    }
    if (form.customerTin && form.customerTin.replace(/\D/g, '').length !== 9) {
      toast.error('Customer TIN must be 9 digits');
      return;
    }

    const payload: StandaloneProformaInput = {
      customerName: form.customerName.trim(),
      energyKwh,
      ratePerKwh,
      ebmItemId: form.ebmItemId,
    };

    if (form.customerTin.trim()) payload.customerTin = form.customerTin.trim();
    if (form.customerPhone.trim()) payload.customerPhone = form.customerPhone.trim();
    if (form.purchaseCode.trim()) payload.purchaseCode = form.purchaseCode.trim();
    if (discountRate > 0) payload.discountRate = discountRate;
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();

    setIsSubmitting(true);
    try {
      const blob = await standaloneProformaApi.create(payload);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proforma-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Proforma generated and downloaded successfully');
      setForm(INITIAL_FORM);
    } catch {
      toast.error('Failed to generate proforma. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHead
        title={
          <>
            <Receipt className="h-6 w-6" />
            Standalone Proforma EBM
          </>
        }
        sub="Generate a standalone EBM proforma invoice for a customer without a linked charging session."
      />

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <Card title="Invoice Details">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Fill in the customer and energy details to generate the proforma.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Customer Name */}
            <div>
              <label htmlFor="customerName" className={labelCls}>
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                id="customerName"
                className={inputCls}
                placeholder="e.g. Kigali Transport Ltd"
                value={form.customerName}
                onChange={(e) => handleFieldChange('customerName', e.target.value)}
                required
              />
            </div>

            {/* Customer TIN */}
            <div>
              <label htmlFor="customerTin" className={labelCls}>
                Customer TIN (optional)
              </label>
              <input
                id="customerTin"
                className={inputCls}
                placeholder="9-digit TIN number"
                value={form.customerTin}
                onChange={(e) => handleFieldChange('customerTin', e.target.value)}
                maxLength={9}
              />
              {form.customerTin && form.customerTin.replace(/\D/g, '').length !== 9 && (
                <span className="mt-1 block text-xs text-red-500">TIN must be exactly 9 digits</span>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label htmlFor="customerPhone" className={labelCls}>
                Customer Phone (optional)
              </label>
              <input
                id="customerPhone"
                className={inputCls}
                type="tel"
                placeholder="+250 7XX XXX XXX"
                value={form.customerPhone}
                onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
              />
            </div>

            {/* EBM Item */}
            <div>
              <label htmlFor="ebmItemId" className={labelCls}>
                EBM Item <span className="text-red-500">*</span>
              </label>
              <select
                id="ebmItemId"
                className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-transparent bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
                value={form.ebmItemId}
                onChange={(e) => handleItemChange(e.target.value)}
                disabled={itemsLoading}
              >
                <option value="">
                  {itemsLoading ? 'Loading items...' : 'Select an EBM item'}
                </option>
                {ebmItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} ({item.itemCode})
                  </option>
                ))}
              </select>
            </div>

            {/* kWh Amount */}
            <div>
              <label htmlFor="energyKwh" className={labelCls}>
                kWh Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="energyKwh"
                className={inputCls}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 50"
                value={form.energyKwh}
                onChange={(e) => handleFieldChange('energyKwh', e.target.value)}
                required
              />
            </div>

            {/* Rate per kWh */}
            <div>
              <label htmlFor="ratePerKwh" className={labelCls}>
                Rate per kWh (RWF) <span className="text-red-500">*</span>
              </label>
              <input
                id="ratePerKwh"
                className={inputCls}
                type="number"
                min="0"
                step="0.01"
                placeholder="Auto-filled from selected item"
                value={form.ratePerKwh}
                onChange={(e) => handleFieldChange('ratePerKwh', e.target.value)}
                required
              />
              {selectedItem && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Default from item: RWF {Number(selectedItem.unitPrice).toLocaleString()}
                </p>
              )}
            </div>

            {/* Purchase Code - shown when TIN is provided */}
            {form.customerTin.trim() && (
              <div>
                <label htmlFor="purchaseCode" className={labelCls}>
                  Purchase Code (optional)
                </label>
                <input
                  id="purchaseCode"
                  className={inputCls}
                  placeholder="Purchase code for business customer"
                  value={form.purchaseCode}
                  onChange={(e) => handleFieldChange('purchaseCode', e.target.value)}
                />
              </div>
            )}

            {/* Discount % */}
            <div>
              <label htmlFor="discountRate" className={labelCls}>
                Discount % (optional)
              </label>
              <input
                id="discountRate"
                className={inputCls}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 5"
                value={form.discountRate}
                onChange={(e) => handleFieldChange('discountRate', e.target.value)}
              />
            </div>

            {/* Distribution Email */}
            <div>
              <label htmlFor="email" className={labelCls}>
                Distribution Email (optional)
              </label>
              <input
                id="email"
                className={inputCls}
                type="email"
                placeholder="customer@example.com"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>

            {/* Distribution Phone */}
            <div>
              <label htmlFor="phone" className={labelCls}>
                Distribution Phone (optional)
              </label>
              <input
                id="phone"
                className={inputCls}
                type="tel"
                placeholder="+250 7XX XXX XXX"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </div>

            {/* Submit */}
            <Btn
              variant="primary"
              type="submit"
              size="md"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                'Generating...'
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate Proforma
                </>
              )}
            </Btn>
          </form>
        </Card>

        {/* Right: Auto-calculated Preview */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Preview
            </span>
          }
        >
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Calculated totals update automatically as you fill the form.
          </p>
          <div className="space-y-6">
            {/* Selected item info */}
            {selectedItem ? (
              <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-black">
                <p className="font-medium text-gray-800 dark:text-white/90">{selectedItem.itemName}</p>
                <p className="text-gray-500 dark:text-gray-400">
                  Code: <span className="font-mono">{selectedItem.itemCode}</span>
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Tax type:{' '}
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {selectedItem.taxTypeCode} ({selectedItem.taxRate}%)
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Select an EBM item to see tax details
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  kWh ({energyKwh.toLocaleString()} x RWF {ratePerKwh.toLocaleString()})
                </span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Discount ({discountRate}%)
                  </span>
                  <span className="font-medium text-red-500">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Tax ({taxRate}% VAT, included)
                </span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                <span className="font-semibold text-gray-800 dark:text-white/90">Total</span>
                <span className="text-xl font-bold text-gray-800 dark:text-white/90">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Zero state */}
            {subtotal === 0 && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Enter kWh amount and rate to see totals
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
