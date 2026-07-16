'use client';

import React from 'react';
import { UseFormReturn, SubmitHandler, Controller } from 'react-hook-form';
import {
  Car,
  Package,
  CreditCard,
  User,
  Loader2,
  ShoppingCart,
  ArrowLeft,
  Palette,
  Sparkles,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AddOn, Discount, PriceInfo, VehicleFormData } from '@/types/oderVehicle';
import { IShopVehicle } from '@/types/shop';
import constants from '@/lib/constants';
import { useCurrencyConversion } from '@/lib/hooks/useCurrencyConversion';

interface VehicleFormProps {
  form: UseFormReturn<VehicleFormData>;
  vehicleInfo: IShopVehicle;
  addOns: AddOn[];
  discounts: Discount[];
  price: PriceInfo & { convertedPrice?: number; } | null;
  isOrdering: boolean;
  mainClassification: string | null;
  onAddOnToggle: (addOnId: string) => void;
  onNavigateBack: () => void;
  onSubmit: SubmitHandler<VehicleFormData>;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  form,
  vehicleInfo,
  addOns,
  discounts,
  price,
  isOrdering,
  onAddOnToggle,
  onNavigateBack,
  onSubmit,
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const { convertCurrencySync } = useCurrencyConversion();

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 pb-24">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="text-center flex-1">
            <h1 className="font-bold text-lg text-slate-900">
              {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
            </h1>
            <p className="text-sm text-slate-500">{vehicleInfo.trim}</p>
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Form Block */}
      <form onSubmit={handleSubmit(onSubmit)} className="relative max-w-3xl mx-auto px-4">

        {/* Scrollable content section */}
        <div className="space-y-6 pb-36">
          {/* 1. Vehicle Details */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex gap-2 items-center">
                <Car className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold">Vehicle Details</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Make', value: vehicleInfo.make },
                  { label: 'Model', value: vehicleInfo.model },
                  { label: 'Year', value: vehicleInfo.year },
                  { label: 'Trim', value: vehicleInfo.trim },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-2 bg-slate-50 rounded-md">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="font-medium text-sm">{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-sm block mb-2">Color</Label>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select color">
                            {field.value && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-200"
                                  style={{
                                    backgroundColor: field.value.startsWith('#') ? field.value : field.value.toLowerCase(),
                                    border: field.value.toLowerCase() === 'white' ? '1px solid #e5e7eb' : 'none'
                                  }}
                                />
                                {field.value}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleInfo.availableColors.map(color => {
                            // New API format: color object with color, imageUrl, and isActive
                            const colorName = color.color;
                            const colorValue = color.color;
                            
                            return (
                              <SelectItem key={colorName} value={colorName}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full border border-gray-200"
                                    style={{
                                      backgroundColor: colorValue.startsWith('#') ? colorValue : colorValue.toLowerCase(),
                                      border: colorValue.toLowerCase() === 'white' ? '1px solid #e5e7eb' : 'none'
                                    }}
                                  />
                                  {colorName}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      
                    </div>
                  )}
                />
                {errors.color && (
                  <p className="text-xs text-red-500 mt-1">{errors.color.message}</p>
                )}
              </div>

            </CardContent>
          </Card>

          {/* 2. Add-Ons */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex gap-2 items-center">
                <Package className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold">Add-Ons</h2>
              </div>

              {addOns.map(addOn => (
                <div
                  key={addOn.id}
                  className={`p-3 rounded-md border flex items-start gap-3 cursor-pointer ${addOn.isSelected ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  onClick={() => onAddOnToggle(addOn.id)}
                >
                  <Checkbox checked={addOn.isSelected} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{addOn.name}</span>
                      <Badge>${addOn.cost.toLocaleString()}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{addOn.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. Payment */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex gap-2 items-center">
                <CreditCard className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold">Payment</h2>
              </div>

              <div>
                <Label>Upfront: {form.watch('upfrontPercent')}%</Label>
                <Controller
                  name="upfrontPercent"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      value={[field.value]}
                      onValueChange={(v) => field.onChange(v[0])}
                      step={20}
                      max={100}
                      className="mt-2"
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Country</Label>
                  <Controller
                    name="saleCountry"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {constants.salesCountry.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {constants.salesCurrency.map(currency => (
                            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {price && (
                <div className="bg-slate-100 rounded-md p-4 space-y-3">
                  <h3 className="font-semibold text-sm mb-3">Price Summary</h3>
                  {addOns.filter(a => a.isSelected).map(a => {
                    // Convert add-on cost to selected currency
                    const vehicleCurrency = vehicleInfo.country === 'KE' ? 'KES' : 'RWF';
                    const convertedCost = convertCurrencySync(a.cost, vehicleCurrency, price.currency);
                    return (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">{a.name}</span>
                        <span className="font-medium">+{formatPrice(Math.round(convertedCost), price.currency)}</span>
                      </div>
                    );
                  })}
                  {discounts.filter(d => d.cost > 0).map(d => (
                    <div key={d.id} className="flex justify-between text-sm text-green-600">
                      <span>{d.name}</span>
                      <span className="font-medium">-{formatPrice(d.cost, price.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="font-bold text-base">Total</span>
                    <PriceDisplay
                      price={price}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Customer Information */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex gap-2 items-center">
                <User className="w-4 h-4 text-orange-500" />
                <h2 className="font-semibold">Your Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name & Last Name */}
                <div>
                  <Label>First Name</Label>
                  <Input {...register('firstName')} className="h-10" />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <Label>Last Name</Label>
                  <Input {...register('lastName')} className="h-10" />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Company */}
                <div className="md:col-span-2">
                  <Label>Company (optional)</Label>
                  <Input {...register('company')} className="h-10" />
                </div>

                {/* Phone */}
                <div className="md:col-span-2">
                  <Label>Phone</Label>
                  <Input {...register('phoneNumber')} className="h-10" />
                  {errors.phoneNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <Label>Email</Label>
                  <Input {...register('emailAddress')} className="h-10" />
                  {errors.emailAddress && (
                    <p className="text-xs text-red-500 mt-1">{errors.emailAddress.message}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="md:col-span-2">
                  <Label>Payment Method</Label>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Financing">Financing</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMethod && (
                    <p className="text-xs text-red-500 mt-1">{errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Buttons Aligned with the Form */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {price && (
              <div className="text-sm text-slate-600 mb-2 text-center md:text-left">
                Total: <span className="text-sm font-semibold text-slate-900">
                  {formatPrice(price.price, price.currency)} {price.currency}
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateBack}
                className="h-11 sm:h-10 order-2 sm:order-1"
                disabled={isOrdering}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isOrdering}
                className="bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-10 px-6 order-1 sm:order-2 flex-1"
              >
                {isOrdering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Place Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

const PriceDisplay: React.FC<{
  price: PriceInfo & { convertedPrice?: number; } | null;
}> = ({ price }) => {
  if (!price) return null;

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <span className="font-bold text-gray-900">
      {formatPrice(price.price, price.currency)} {price.currency}
    </span>
  );
};