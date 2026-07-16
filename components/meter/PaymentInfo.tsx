'use client'

import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Wallet } from "lucide-react";
import { Select } from "@/components/shared/SharedComponents";
import { meterSchema, PaymentPlan } from "@/lib/schemas/meterSchema";
import { z } from "zod";

// Create the type from the schema
type MeterFormData = z.infer<typeof meterSchema>;

// Define MeterTariff enum if not exported from schema
enum MeterTariff {
  EV_TARIFF = 'EV_TARIFF',
  STANDARD_TARIFF = 'STANDARD_TARIFF'
}

interface PaymentInfoProps {
  register: UseFormRegister<MeterFormData>;
  errors: FieldErrors<MeterFormData>;
}

export const PaymentInfo: React.FC<PaymentInfoProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Wallet className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">Payment Settings</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Payment Plan"
          name="paymentPlan"
          register={register}
          error={errors.paymentPlan}
          required
          options={Object.entries(PaymentPlan).map(([key, value]) => ({
            value,
            label: key
              .split("_")
              .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
              .join(" "),
          }))}
        />
        <Select
          label="Meter Tariff"
          name="meterTariff"
          register={register}
          error={errors.meterTariff}
          required
          options={Object.entries(MeterTariff).map(([key, value]) => ({
            value,
            label: key
              .split("_")
              .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
              .join(" "),
          }))}
        />
      </div>
    </div>
  );
};