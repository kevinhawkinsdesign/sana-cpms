'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Cloud, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ebmItemsApi, type EbmItem, type CreateEbmItemData } from '@/lib/api/ebmItems';
import { ItemClassCombobox } from './ItemClassCombobox';

interface EbmItemFormProps {
  item?: EbmItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  itemCode: string;
  itemClassCode: string;
  itemName: string;
  taxTypeCode: string;
  taxRate: number;
  unitPrice: number;
  quantityUnitCode: string;
  packageUnitCode: string;
  itemTypeCode: string;
  originCountryCode: string;
  insuranceApplicable: boolean;
  groupPriceLevel1: number | null;
  groupPriceLevel2: number | null;
  groupPriceLevel3: number | null;
  barcode: string;
  standardItemName: string;
  additionalInfo: string;
  isDefault: boolean;
  autoRegisterVsdc: boolean;
}

export function EbmItemForm({ item, onSuccess, onCancel }: EbmItemFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const [autoRegisterVsdc, setAutoRegisterVsdc] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      itemCode: '',
      itemClassCode: '2517500200', // Default: EV Charging Station
      itemName: '',
      taxTypeCode: 'B',
      taxRate: 18,
      unitPrice: 350,
      quantityUnitCode: 'KWT',
      packageUnitCode: 'NT',
      itemTypeCode: '3', // Service
      originCountryCode: 'RW',
      insuranceApplicable: false,
      groupPriceLevel1: null,
      groupPriceLevel2: null,
      groupPriceLevel3: null,
      barcode: '',
      standardItemName: '',
      additionalInfo: '',
      isDefault: false,
      autoRegisterVsdc: false,
    },
  });

  const taxTypeCode = watch('taxTypeCode');

  // Update tax rate when tax type changes
  useEffect(() => {
    const taxRates: Record<string, number> = {
      A: 0,
      B: 18,
      C: 0,
      D: 0,
    };
    setValue('taxRate', taxRates[taxTypeCode] || 0);
  }, [taxTypeCode, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (item) {
      reset({
        itemCode: item.itemCode,
        itemClassCode: item.itemClassCode,
        itemName: item.itemName,
        taxTypeCode: item.taxTypeCode,
        taxRate: item.taxRate,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
        quantityUnitCode: item.quantityUnitCode,
        packageUnitCode: item.packageUnitCode,
        itemTypeCode: item.itemTypeCode,
        originCountryCode: item.originCountryCode,
        insuranceApplicable: item.insuranceApplicable,
        groupPriceLevel1: item.groupPriceLevel1 ? Number(item.groupPriceLevel1) : null,
        groupPriceLevel2: item.groupPriceLevel2 ? Number(item.groupPriceLevel2) : null,
        groupPriceLevel3: item.groupPriceLevel3 ? Number(item.groupPriceLevel3) : null,
        barcode: item.barcode || '',
        standardItemName: item.standardItemName || '',
        additionalInfo: item.additionalInfo || '',
        isDefault: item.isDefault,
        autoRegisterVsdc: false,
      });
    }
  }, [item, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEbmItemData) =>
      autoRegisterVsdc
        ? ebmItemsApi.createItemWithVsdc(data)
        : ebmItemsApi.createItem(data),
    onSuccess: (result) => {
      if ('vsdcRegistration' in result && result.vsdcRegistration) {
        if (result.vsdcRegistration.success) {
          toast.success('Item created and registered with VSDC successfully');
        } else {
          toast.warning(`Item created but VSDC registration failed: ${result.vsdcRegistration.error}`);
        }
      } else {
        toast.success('Item created successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
      reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateEbmItemData) => ebmItemsApi.updateItem(item!.id, data),
    onSuccess: () => {
      toast.success('Item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update item');
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: CreateEbmItemData = {
      ...(data.itemCode && { itemCode: data.itemCode }),
      itemClassCode: data.itemClassCode,
      itemName: data.itemName,
      taxTypeCode: data.taxTypeCode,
      taxRate: data.taxRate,
      unitPrice: data.unitPrice,
      quantityUnitCode: data.quantityUnitCode,
      packageUnitCode: data.packageUnitCode,
      itemTypeCode: data.itemTypeCode,
      originCountryCode: data.originCountryCode,
      insuranceApplicable: data.insuranceApplicable,
      ...(data.groupPriceLevel1 && { groupPriceLevel1: data.groupPriceLevel1 }),
      ...(data.groupPriceLevel2 && { groupPriceLevel2: data.groupPriceLevel2 }),
      ...(data.groupPriceLevel3 && { groupPriceLevel3: data.groupPriceLevel3 }),
      ...(data.barcode && { barcode: data.barcode }),
      ...(data.standardItemName && { standardItemName: data.standardItemName }),
      ...(data.additionalInfo && { additionalInfo: data.additionalInfo }),
      isDefault: data.isDefault,
      autoRegisterVsdc: autoRegisterVsdc,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit EBM Item' : 'Create New EBM Item'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update item details. Note: Item code cannot be changed for VSDC-registered items.'
            : 'Create a new item for EBM generation. Leave item code empty to auto-generate.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Classification (UNSPSC) *</Label>
              <ItemClassCombobox
                value={watch('itemClassCode')}
                onChange={(code, taxTyCd) => {
                  setValue('itemClassCode', code, { shouldValidate: true });
                  if (taxTyCd) {
                    setValue('taxTypeCode', taxTyCd);
                  }
                }}
                disabled={isPending}
              />
              <input type="hidden" {...register('itemClassCode', { required: 'Required' })} />
              {errors.itemClassCode && (
                <p className="text-xs text-destructive">{errors.itemClassCode.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemCode">
                  Item Code
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Leave empty to auto-generate VSDC-compliant code</p>
                        <p className="text-xs">Format: RW3NTKWT0000001</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="itemCode"
                  placeholder="Auto-generated if empty"
                  {...register('itemCode')}
                  disabled={isEditing && item?.vsdcRegistered}
                />
                {isEditing && item?.vsdcRegistered && (
                  <p className="text-xs text-muted-foreground">
                    Cannot change code for VSDC-registered items
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name *</Label>
                <Input
                  id="itemName"
                  placeholder="e.g., EV Charging Service"
                  {...register('itemName', { required: 'Required', maxLength: 200 })}
                />
                {errors.itemName && (
                  <p className="text-xs text-destructive">{errors.itemName.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tax & Pricing */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tax Type *</Label>
              <Select
                value={watch('taxTypeCode')}
                onValueChange={(value) => setValue('taxTypeCode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - 0% (Zero Rate)</SelectItem>
                  <SelectItem value="B">B - 18% (Standard)</SelectItem>
                  <SelectItem value="C">C - Exempt</SelectItem>
                  <SelectItem value="D">D - Zero Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                {...register('taxRate', { valueAsNumber: true })}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Default Unit Price (RWF) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                {...register('unitPrice', { required: 'Required', valueAsNumber: true, min: 0 })}
              />
              {errors.unitPrice && (
                <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          {/* Unit Codes */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select
                value={watch('itemTypeCode')}
                onValueChange={(value) => setValue('itemTypeCode', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Raw Material</SelectItem>
                  <SelectItem value="2">2 - Finished Product</SelectItem>
                  <SelectItem value="3">3 - Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageUnitCode">Package Unit (2 chars)</Label>
              <Input
                id="packageUnitCode"
                maxLength={2}
                {...register('packageUnitCode')}
                placeholder="NT"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantityUnitCode">Quantity Unit (2-3 chars)</Label>
              <Input
                id="quantityUnitCode"
                maxLength={3}
                {...register('quantityUnitCode')}
                placeholder="KWT"
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <details className="group border rounded-lg">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-muted/50">
                Group Pricing Tiers (Optional)
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="groupPriceLevel1">Level 1 - Kabisa Owner</Label>
                    <Input
                      id="groupPriceLevel1"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 350"
                      {...register('groupPriceLevel1', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupPriceLevel2">Level 2 - Kabisa Member</Label>
                    <Input
                      id="groupPriceLevel2"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 400"
                      {...register('groupPriceLevel2', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupPriceLevel3">Level 3 - Guest</Label>
                    <Input
                      id="groupPriceLevel3"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 450"
                      {...register('groupPriceLevel3', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            </details>

            <details className="group border rounded-lg">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-muted/50">
                Optional VSDC Fields
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode (max 20 chars)</Label>
                    <Input
                      id="barcode"
                      maxLength={20}
                      {...register('barcode')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originCountryCode">Origin Country Code</Label>
                    <Input
                      id="originCountryCode"
                      maxLength={5}
                      {...register('originCountryCode')}
                      placeholder="RW"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standardItemName">Standard Item Name</Label>
                    <Input
                      id="standardItemName"
                      maxLength={200}
                      {...register('standardItemName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Info (max 7 chars)</Label>
                    <Input
                      id="additionalInfo"
                      maxLength={7}
                      {...register('additionalInfo')}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="insuranceApplicable"
                      checked={watch('insuranceApplicable')}
                      onCheckedChange={(checked) => setValue('insuranceApplicable', checked)}
                    />
                    <Label htmlFor="insuranceApplicable">Insurance Applicable</Label>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Set as Default Item</Label>
                <p className="text-xs text-muted-foreground">
                  This item will be used for all new EBM generation
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={watch('isDefault')}
                onCheckedChange={(checked) => setValue('isDefault', checked)}
              />
            </div>

            {!isEditing && (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="autoRegisterVsdc" className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Auto-register with VSDC
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically register this item with RRA's VSDC after creation
                  </p>
                </div>
                <Switch
                  id="autoRegisterVsdc"
                  checked={autoRegisterVsdc}
                  onCheckedChange={setAutoRegisterVsdc}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Item
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Item
                    </>
                  )}
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
