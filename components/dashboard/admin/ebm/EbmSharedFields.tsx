'use client';

import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangeFilterRowProps {
  from: string;
  to: string;
  loading: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSearch: () => void;
  buttonLabel: string;
}

export function DateRangeFilterRow({
  from,
  to,
  loading,
  onFromChange,
  onToChange,
  onSearch,
  buttonLabel,
}: DateRangeFilterRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="from">From</Label>
        <Input id="from" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
      <Button onClick={onSearch} disabled={loading} className="sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading…
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
}

interface CustomerTinPurchaseFieldsProps {
  customerPhone: string;
  ebmTin: string;
  purchaseCode: string;
  submitting: boolean;
  onCustomerPhoneChange: (value: string) => void;
  onTinChange: (value: string) => void;
  onPurchaseCodeChange: (value: string) => void;
}

export function CustomerTinPurchaseFields({
  customerPhone,
  ebmTin,
  purchaseCode,
  submitting,
  onCustomerPhoneChange,
  onTinChange,
  onPurchaseCodeChange,
}: CustomerTinPurchaseFieldsProps) {
  const hasTin = ebmTin.trim().length > 0;
  const purchaseOk = !hasTin || /^\d{6}$/.test(purchaseCode.trim());

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="cphone">Customer phone</Label>
        <Input
          id="cphone"
          type="tel"
          placeholder="07XXXXXXXX"
          value={customerPhone}
          onChange={(e) => onCustomerPhoneChange(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="tin">
            TIN <span className="text-xs text-muted-foreground font-normal">(9 digits)</span>
          </Label>
          <Input
            id="tin"
            inputMode="numeric"
            maxLength={9}
            value={ebmTin}
            onChange={(e) => onTinChange(e.target.value.replace(/\D/g, ''))}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pcode">
            Purchase code <span className="text-xs text-muted-foreground font-normal">(6 digits)</span>
          </Label>
          <Input
            id="pcode"
            inputMode="numeric"
            maxLength={6}
            value={purchaseCode}
            onChange={(e) => onPurchaseCodeChange(e.target.value.replace(/\D/g, ''))}
            disabled={submitting || !hasTin}
            className={hasTin && !purchaseOk ? 'border-red-400' : ''}
          />
        </div>
      </div>
      {hasTin && !purchaseOk && (
        <p className="text-xs text-red-600">Purchase code must be exactly 6 digits when TIN is provided.</p>
      )}
    </>
  );
}
