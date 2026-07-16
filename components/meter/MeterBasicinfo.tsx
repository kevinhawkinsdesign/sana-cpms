'use client'

import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Gauge } from "lucide-react";
import { Input } from "@/components/shared/SharedComponents";
import { meterSchema } from "@/lib/schemas/meterSchema";
import { z } from "zod";

// Create the type from the schema
type MeterFormData = z.infer<typeof meterSchema>;

interface MeterBasicInfoProps {
  register: UseFormRegister<MeterFormData>;
  errors: FieldErrors<MeterFormData>;
}

export const MeterBasicInfo: React.FC<MeterBasicInfoProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Gauge className="w-4 h-4 text-emerald-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Kabisa ID"
          name="kabisaId"
          register={register}
          error={errors.kabisaId}
          required
        />
        <Input
          label="Meter Number"
          name="meterNumber"
          register={register}
          error={errors.meterNumber}
          required
        />
        <Input
          label="Installation Date"
          name="dateInstalled"
          type="datetime-local"
          register={register}
          error={errors.dateInstalled}
          required
        />
      </div>
    </div>
  );
};