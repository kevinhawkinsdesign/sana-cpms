// src/components/auth/AuthForm.tsx
'use client';

import { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { Eye, EyeOff, Mail, Phone, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

type AuthMethod = 'password' | 'email' | 'phone' | null;
type AuthMode = 'login' | 'signup';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { get: getSearchParam } = useSearchParamsWrapper();
  const { login, register, isLoading } = useAuth();
  const router = useLocalizedRouter();

  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const redirectPath = getSearchParam('callbackUrl') || '/dashboard';
  const isLogin = mode === 'login';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleAuth = async () => {
    toast.info('Google OAuth integration coming soon');
  };

  // --- Form Submission Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && authMethod === 'password') {
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        // Add other validation from your original code if needed
    }

    let success = false;
    const commonData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
    };

    try {
      if (authMethod === 'password') {
        success = isLogin
          ? await login.withPassword(formData.email, formData.password)
          : await register.withPassword({ authMethod: 'PASSWORD', email: formData.email, password: formData.password, ...commonData });
      } else if (authMethod === 'email') {
        success = isLogin
          ? await login.withEmailCode(formData.email)
          : await register.withEmailCode({ authMethod: 'EMAIL_CODE', email: formData.email, ...commonData });
        if (success) setIsCodeSent(true);
      } else if (authMethod === 'phone') {
        success = isLogin
          ? await login.withPhoneCode(formData.phone)
          : await register.withPhoneCode({ authMethod: 'PHONE_CODE', phone: formData.phone, ...commonData });
        if (success) setIsCodeSent(true);
      }
      
      if (success && authMethod === 'password') {
        router.push(redirectPath);
      }
    } catch (error) {
       // Error is already handled by authContext, but you can add more here
    }
  };

  const handleCodeVerification = async () => {
    let success = false;
    if (authMethod === 'email') {
      success = isLogin
        ? await login.verifyCode(code, 'EMAIL_CODE', formData.email)
        : await register.verifyCode(code, 'EMAIL_CODE', formData.email);
    } else if (authMethod === 'phone') {
        success = isLogin
        ? await login.verifyCode(code, 'PHONE_CODE', undefined, formData.phone)
        : await register.verifyCode(code, 'PHONE_CODE', undefined, formData.phone);
    }
    if (success) router.push(redirectPath);
  };
  
  const goBack = () => {
    setIsCodeSent(false);
    setAuthMethod(null);
    setCode('');
  }

  // --- Render Functions ---

  const renderInitialSelection = () => (
    <>
        <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">{isLogin ? "Welcome Back" : "Create an Account"}</h1>
            <p className="text-balance text-muted-foreground">
                {isLogin ? "Sign in to continue to your dashboard" : "Enter your details below to get started"}
            </p>
        </div>
        <div className="grid gap-4">
            <Button variant="outline" onClick={() => setAuthMethod('password')}>
                <Lock className="mr-2 h-4 w-4" /> Continue with Password
            </Button>
            <Button variant="outline" onClick={() => setAuthMethod('email')}>
                <Mail className="mr-2 h-4 w-4" /> Continue with Email
            </Button>
            <Button variant="outline" onClick={() => setAuthMethod('phone')}>
                <Phone className="mr-2 h-4 w-4" /> Continue with Phone
            </Button>
            <div className="relative my-2">
                <Separator />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-background text-sm text-muted-foreground">OR</div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleAuth}>
                <FaGoogle className="mr-2 h-4 w-4" /> Continue with Google
            </Button>
        </div>
    </>
  );
  
  const renderFormFields = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-4">
                <Input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required disabled={isLoading} />
                <Input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required disabled={isLoading} />
            </div>
        )}
        {authMethod === 'password' && (
            <>
                <Input name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />
                <div className="relative">
                    <Input name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={handleChange} required disabled={isLoading} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
            </>
        )}
        {mode === 'signup' && authMethod === 'password' && (
            <div className="relative">
                <Input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        )}

        {authMethod === 'email' && <Input name="email" type="email" placeholder="name@example.com" value={formData.email} onChange={handleChange} required disabled={isLoading} />}
        {authMethod === 'phone' && <Input name="phone" type="tel" placeholder="Your phone number" value={formData.phone} onChange={handleChange} required disabled={isLoading} />}
        
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Processing...' : (authMethod === 'password' ? (isLogin ? 'Sign In' : 'Create Account') : 'Send Code')}
        </Button>
        
        {isLogin && authMethod === 'password' && (
            <div className="text-center text-sm">
                <LocalizedLink href="/auth/forgot-password" className="underline">
                    Forgot your password?
                </LocalizedLink>
            </div>
        )}
    </form>
  );

  const renderCodeVerification = () => (
    <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Check your {authMethod}</h2>
        <p className="text-muted-foreground">
            We've sent a 6-digit code to {authMethod === 'email' ? formData.email : formData.phone}.
        </p>
        <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                </InputOTPGroup>
            </InputOTP>
        </div>
        <Button onClick={handleCodeVerification} className="w-full" disabled={isLoading || code.length !== 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Code
        </Button>
        <p className="text-sm text-muted-foreground">
            Didn't get a code? <Button variant="link" className="p-0 h-auto" disabled={isLoading}>Resend</Button>
        </p>
    </div>
  );
  
  return (
    <div className="w-full space-y-6">
        {authMethod && (
            <Button variant="ghost" onClick={goBack} className="absolute top-8 left-8">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        )}
        
        {!authMethod 
            ? renderInitialSelection()
            : isCodeSent
                ? renderCodeVerification()
                : (
                    <>
                        <div className="grid gap-2 text-center">
                            <h1 className="text-3xl font-bold">{isLogin ? "Sign In" : "Sign Up"} with {authMethod?.charAt(0).toUpperCase() + authMethod?.slice(1)}</h1>
                            <p className="text-balance text-muted-foreground">
                                Enter your information to {isLogin ? 'access your account' : 'create an account'}.
                            </p>
                        </div>
                        {renderFormFields()}
                    </>
                )
        }
        
        <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <LocalizedLink href={isLogin ? '/auth/signup' : '/auth/login'} className="underline">
                {isLogin ? 'Sign up' : 'Sign in'}
            </LocalizedLink>
        </div>
    </div>
  );
}