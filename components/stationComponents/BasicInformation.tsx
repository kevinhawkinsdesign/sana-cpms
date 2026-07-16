'use client'

import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/shared/SharedComponents';
import { StationFormData } from '@/lib/schemas/stationSchema';

interface BasicInformationProps {
  register: UseFormRegister<StationFormData>;
  errors: FieldErrors<StationFormData>;
}

export const BasicInformation: React.FC<BasicInformationProps> = ({
  register,
  errors
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
      <div className="space-y-6">
        <Input
          label="Station Name"
          name="name"
          register={register}
          error={errors.name}
          required
          placeholder="Enter station name"
        />

        <Input
          label="Address"
          name="address"
          register={register}
          error={errors.address}
          required
          placeholder="Enter station address"
        />
      </div>
    </div>
  );
};