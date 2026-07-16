'use client'

import React from 'react'
import { FieldError, UseFormRegister } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  register: UseFormRegister<any>
  error?: FieldError
  required?: boolean
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  register,
  error,
  required = false,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <input
        className={cn(
          "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50",
          error ? "border-red-500" : "border-gray-300",
          className
        )}
        {...register(props.name as string)}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}
    </div>
  )
} 