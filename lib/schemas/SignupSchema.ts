// src/utils/schemas/SignupSchema.ts
import { z } from 'zod';

export const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
  
  userInfo: z.object({
    'First Name': z.string()
      .min(2, 'First name must be at least 2 characters')
      .regex(/^[A-Za-z\s]+$/, 'First name can only contain letters'),
    
    'Last Name': z.string()
      .min(2, 'Last name must be at least 2 characters')
      .regex(/^[A-Za-z\s]+$/, 'Last name can only contain letters'),
    
    Company: z.string().optional(),
    
    Email: z.string()
      .email('Invalid email address')
      .min(1, 'Email is required'),
    
    Phone: z.string()
      .regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number'),
    
    Address: z.string().optional(),
    
    Country: z.string()
      .min(2, 'Please select a country'),
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;