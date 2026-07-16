import React from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import { Check, X } from 'lucide-react';

interface YesNoCheckboxProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
}

const YesNoCheckbox: React.FC<YesNoCheckboxProps> = ({
  name,
  label,
  register,
  error,
  required = false,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-4">
        <label className="relative flex items-center gap-2 cursor-pointer group">
          <input
            type="radio"
            value="Yes"
            {...register(name)}
            className="sr-only peer"
          />
          <div className="w-16 h-10 flex items-center justify-center rounded-lg border-2 peer-checked:border-green-500 peer-checked:bg-green-50 border-gray-200 transition-all duration-200 group-hover:border-green-200">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <span className="text-sm font-medium text-gray-700">Yes</span>
        </label>

        <label className="relative flex items-center gap-2 cursor-pointer group">
          <input
            type="radio"
            value="No"
            {...register(name)}
            className="sr-only peer"
          />
          <div className="w-16 h-10 flex items-center justify-center rounded-lg border-2 peer-checked:border-red-500 peer-checked:bg-red-50 border-gray-200 transition-all duration-200 group-hover:border-red-200">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <span className="text-sm font-medium text-gray-700">No</span>
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
    </div>
  );
};

export default YesNoCheckbox;