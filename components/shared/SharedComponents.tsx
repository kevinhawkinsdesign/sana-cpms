
import React, { ComponentPropsWithoutRef } from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';

interface CustomInputProps {
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
}

type InputProps = CustomInputProps & Omit<ComponentPropsWithoutRef<'input'>, keyof CustomInputProps | 'className'>;

export const Input: React.FC<InputProps> = ({
  label,
  register,
  error,
  required = false,
  name,
  ...restProps
}) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      id={name}
      {...register(name!, { required })}
      {...restProps}
      className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border ${error ? 'border-red-500' : 'border-gray-300'
        } placeholder-gray-400`}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
  </div>
);

interface SelectProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  register: UseFormRegister<any>;
  error?: FieldError;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ name, label, options, required = false, register, error, disabled }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      id={name}
      disabled={disabled}
      {...register(name, { required })}
      className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border ${error ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
  </div>
);
interface FormButtonProps {
  label: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
  rotateIcon?: boolean;
}

export const FormButton: React.FC<FormButtonProps> = ({ label, type = 'button', onClick, disabled = false, icon: Icon, rotateIcon = false }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
  >
    {label}
    {Icon && <Icon className={`ml-2 h-5 w-5 ${rotateIcon || disabled ? 'animate-spin' : ''}`} />}
  </button>
);

export const DatePickerInput = React.forwardRef<HTMLInputElement, any>(
  ({ onChange, onClick, value, label, error, icon: Icon, required = true }, ref) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={ref}
          type="text"
          onChange={onChange}
          onClick={onClick}
          value={value}
          className={`w-full p-2 pl-10 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);


export const createZodSchema = (shape: Record<string, z.ZodTypeAny>) => {
  return z.object(shape);
};


export const formatErrorMessage = (error: FieldError | undefined): string => {
  return error ? error.message || 'This field is required' : '';
};


export const createFieldProps = (name: string, label: string, register: UseFormRegister<any>, error: FieldError | undefined, required: boolean = false) => ({
  name,
  label,
  register,
  error,
  required,
});
