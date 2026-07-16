'use client'

import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Users } from "lucide-react";
import { Input } from "@/components/shared/SharedComponents";
import { meterSchema } from "@/lib/schemas/meterSchema";
import { z } from "zod";

// Create the type from the schema
type MeterFormData = z.infer<typeof meterSchema>;

interface ContactInfoProps {
  register: UseFormRegister<MeterFormData>;
  errors: FieldErrors<MeterFormData>;
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  register,
  errors,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">
          Contact Information
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Meter Owner"
          name="meterOwner"
          register={register}
          error={errors.meterOwner}
          required
        />
        <Input
          label="Contact Name"
          name="contactName"
          register={register}
          error={errors.contactName}
          required
        />
        <Input
          label="Contact Number"
          name="contactNumber"
          register={register}
          error={errors.contactNumber}
          required
          placeholder="e.g. 250780000000"
        />
        <Input
          label="Registration Contact"
          name="regContact"
          register={register}
          error={errors.regContact}
          required
        />
      </div>
    </div>
  );
};