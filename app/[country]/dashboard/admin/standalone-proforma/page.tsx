'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Receipt, Loader2, Download, Calculator } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const taxAmount = taxableAmount * taxRate / (100 + taxRate);
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
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Standalone Proforma EBM
        </h1>
        <p className="text-muted-foreground">
          Generate a standalone EBM proforma invoice for a customer without a linked charging
          session.
        </p>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>
              Fill in the customer and energy details to generate the proforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Customer Name */}
              <div className="space-y-1.5">
                <Label htmlFor="customerName">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  placeholder="e.g. Kigali Transport Ltd"
                  value={form.customerName}
                  onChange={(e) => handleFieldChange('customerName', e.target.value)}
                  required
                />
              </div>

              {/* Customer TIN */}
              <div className="space-y-1.5">
                <Label htmlFor="customerTin">Customer TIN (optional)</Label>
                <Input
                  id="customerTin"
                  placeholder="9-digit TIN number"
                  value={form.customerTin}
                  onChange={(e) => handleFieldChange('customerTin', e.target.value)}
                  maxLength={9}
                />
                {form.customerTin && form.customerTin.replace(/\D/g, '').length !== 9 && (
                  <p className="text-xs text-destructive">TIN must be exactly 9 digits</p>
                )}
              </div>

              {/* Customer Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">Customer Phone (optional)</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  value={form.customerPhone}
                  onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                />
              </div>

              {/* EBM Item */}
              <div className="space-y-1.5">
                <Label htmlFor="ebmItemId">
                  EBM Item <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.ebmItemId}
                  onValueChange={handleItemChange}
                  disabled={itemsLoading}
                >
                  <SelectTrigger id="ebmItemId" className="w-full">
                    <SelectValue
                      placeholder={itemsLoading ? 'Loading items...' : 'Select an EBM item'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {ebmItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.itemName} ({item.itemCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* kWh Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="energyKwh">
                  kWh Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="energyKwh"
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
              <div className="space-y-1.5">
                <Label htmlFor="ratePerKwh">
                  Rate per kWh (RWF) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ratePerKwh"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Auto-filled from selected item"
                  value={form.ratePerKwh}
                  onChange={(e) => handleFieldChange('ratePerKwh', e.target.value)}
                  required
                />
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    Default from item: RWF {Number(selectedItem.unitPrice).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Purchase Code - shown when TIN is provided */}
              {form.customerTin.trim() && (
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseCode">Purchase Code (optional)</Label>
                  <Input
                    id="purchaseCode"
                    placeholder="Purchase code for business customer"
                    value={form.purchaseCode}
                    onChange={(e) => handleFieldChange('purchaseCode', e.target.value)}
                  />
                </div>
              )}

              {/* Discount % */}
              <div className="space-y-1.5">
                <Label htmlFor="discountRate">Discount % (optional)</Label>
                <Input
                  id="discountRate"
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
              <div className="space-y-1.5">
                <Label htmlFor="email">Distribution Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>

              {/* Distribution Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Distribution Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Generate Proforma
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Auto-calculated Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Preview
            </CardTitle>
            <CardDescription>
              Calculated totals update automatically as you fill the form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected item info */}
            {selectedItem ? (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1 text-sm">
                <p className="font-medium">{selectedItem.itemName}</p>
                <p className="text-muted-foreground">
                  Code: <span className="font-mono">{selectedItem.itemCode}</span>
                </p>
                <p className="text-muted-foreground">
                  Tax type:{' '}
                  <span className="font-medium text-foreground">
                    {selectedItem.taxTypeCode} ({selectedItem.taxRate}%)
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Select an EBM item to see tax details
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  kWh ({energyKwh.toLocaleString()} x RWF {ratePerKwh.toLocaleString()})
                </span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount ({discountRate}%)
                  </span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({taxRate}% VAT, included)
                </span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Zero state */}
            {subtotal === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Enter kWh amount and rate to see totals
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
