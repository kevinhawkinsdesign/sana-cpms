'use client';

import { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { EyeIcon, EyeOff, Mail, Phone, Lock, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/authContext';
import { useSearchParamsWrapper, SearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { AuthRedirect } from '@/components/shared/AuthRedirect';
import { AuthLayout } from '@/components/auth/authLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';

type AuthMethod = 'password' | 'email' | 'phone' | 'google';

// Declare Google types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function SignupForm() {
  const { get: getSearchParam } = useSearchParamsWrapper();
  const { register, login, isLoading, getDashboardPath } = useAuth();
  const router = useLocalizedRouter();

  const [activeMethod, setActiveMethod] = useState<AuthMethod>('google');
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

  // callbackUrl wins over the role-based dashboard so deep links survive auth.
  const callbackUrl = getSearchParam('callbackUrl') || '';
  const redirectPath = callbackUrl || getDashboardPath() || '/dashboard';
  // Forward `?callbackUrl=...` onto side links (back to login etc.) so the
  // user lands on their original URL after the auth detour.
  const withCallback = (href: string) =>
    callbackUrl
      ? `${href}${href.includes('?') ? '&' : '?'}callbackUrl=${encodeURIComponent(callbackUrl)}`
      : href;

  const authMethods = [
    { id: 'google', icon: FaGoogle, label: 'Google' },
    { id: 'email', icon: Mail, label: 'Email Code' },
    { id: 'phone', icon: Phone, label: 'SMS Code' },
    { id: 'password', icon: Lock, label: 'Password' },
  ];

  // Initialize Google OAuth
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            callback: handleGoogleSignIn,
            auto_select: false,
          });
        } catch (error) {
          // Silently handle errors - don't break the page
          console.warn('Google Sign-In could not be initialized:', error);
        }
      }
    };

    // Check if Google script is loaded
    if (typeof window !== 'undefined') {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        // Wait for Google script to load
        const checkGoogle = setInterval(() => {
          if (window.google) {
            initializeGoogleSignIn();
            clearInterval(checkGoogle);
          }
        }, 100);
      }
    }
  }, []);

  // Render Google button when Google tab is active
  useEffect(() => {
    if (activeMethod === 'google' && typeof window !== 'undefined' && window.google) {
      const element = document.getElementById('google-signin-button-signup');
      if (element) {
        // Clear previous button
        element.innerHTML = '';
        // Render new button
        try {
          window.google.accounts.id.renderButton(element, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (error) {
          // Silently handle errors - don't break the page
          console.warn('Google Sign-In button could not be rendered:', error);
        }
      }
    }
  }, [activeMethod]);

  const handleGoogleSignIn = async (response: any) => {
    try {
      const googleToken = response.credential;
      
      // Use login with Google (backend will handle new user registration)
      const success = await login.withGoogle(googleToken);
      if (success) {
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Google signup failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Please enter your first and last name');
      return false;
    }

    if (activeMethod === 'password') {
      if (!formData.password || !formData.confirmPassword) {
        toast.error('Please enter both password and confirm password');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return false;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        toast.error('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');
        return false;
      }
    } else if (activeMethod === 'email') {
      if (!formData.email) {
        toast.error('Please enter your email');
        return false;
      }
    } else if (activeMethod === 'phone') {
      if (!formData.phone) {
        toast.error('Please enter your phone number');
        return false;
      }
    }

    return true;
  };

  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const success = await register.withPassword({
      authMethod: 'PASSWORD',
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    if (success) {
      router.push(redirectPath);
    }
  };

  const handleEmailCodeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const success = await register.withEmailCode({
      authMethod: 'EMAIL_CODE',
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    });

    if (success) {
      setIsCodeSent(true);
    }
  };

  const handlePhoneCodeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const success = await register.withPhoneCode({
      authMethod: 'PHONE_CODE',
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
    });

    if (success) {
      setIsCodeSent(true);
    }
  };

  const handleCodeVerification = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    let success = false;
    
    if (activeMethod === 'email') {
      success = await register.verifyCode(code, 'EMAIL_CODE', formData.email);
    } else if (activeMethod === 'phone') {
      success = await register.verifyCode(code, 'PHONE_CODE', undefined, formData.phone);
    }

    if (success) {
      router.push(redirectPath);
    }
  };

  const handleGoogleSignup = async () => {
    toast.info('Google OAuth integration coming soon');
  };

  const handleResendCode = async () => {
    let success = false;
    
    if (activeMethod === 'email') {
      success = await register.withEmailCode({
        authMethod: 'EMAIL_CODE',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
    } else if (activeMethod === 'phone') {
      success = await register.withPhoneCode({
        authMethod: 'PHONE_CODE',
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });
    }

    if (success) {
      toast.success('Code resent successfully');
    }
  };

  const handleBackToSignup = () => {
    setIsCodeSent(false);
    setCode('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-3 shadow-lg p-2">
          <Image
            src="/favicon-light.svg"
            alt="Logo"
            width={32}
            height={32}
            className="w-full h-full"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
        <p className="text-sm text-gray-600">
          Choose your preferred registration method
        </p>
      </div>

      {!isCodeSent ? (
        <>
          {/* Auth Method Selector */}
          <div className="grid grid-cols-4 gap-1 mb-6">
            {authMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setActiveMethod(method.id as AuthMethod)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
                    "border-2 hover:shadow-sm",
                    activeMethod === method.id
                      ? "border-yellow-500 bg-yellow-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 mb-1",
                    activeMethod === method.id ? "text-yellow-600" : "text-gray-600"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    activeMethod === method.id ? "text-yellow-700" : "text-gray-700"
                  )}>
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Login Forms */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            {activeMethod === 'password' && (
              <form onSubmit={handlePasswordSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      className="pl-10 pr-10"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={formData.password} />
                  <p className="text-xs text-gray-500">
                    Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={formData.confirmPassword} />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            )}

            {activeMethod === 'email' && (
              <form onSubmit={handleEmailCodeSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="firstName-email" className="text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <Input
                      id="firstName-email"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="lastName-email" className="text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <Input
                      id="lastName-email"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email-code" className="text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email-code"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending code...' : 'Send verification code'}
                </Button>
              </form>
            )}

            {activeMethod === 'phone' && (
              <form onSubmit={handlePhoneCodeSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="firstName-phone" className="text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <Input
                      id="firstName-phone"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="lastName-phone" className="text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <Input
                      id="lastName-phone"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending code...' : 'Send verification code'}
                </Button>
              </form>
            )}

            {activeMethod === 'google' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Sign up quickly using your Google account
                </p>
                <div id="google-signin-button-signup" className="flex justify-center"></div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    By continuing, you agree to our terms of service and privacy policy
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Code Verification Screen */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <button
            onClick={handleBackToSignup}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to signup
          </button>

          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Check your {activeMethod === 'email' ? 'email' : 'phone'}</h3>
            <p className="text-sm text-gray-600">
              We've sent a 6-digit verification code to<br />
              <span className="font-medium text-gray-900">
                {activeMethod === 'email' ? formData.email : formData.phone}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 text-center block">
                Enter verification code
              </label>
              <InputOTP
                value={code}
                onChange={setCode}
                maxLength={6}
                className="justify-center"
              >
                <InputOTPGroup className="gap-1">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index} 
                      index={index} 
                      className="w-10 h-10 text-base border-gray-300"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleCodeVerification} 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify and sign up'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="font-medium text-yellow-600 hover:text-yellow-700 transition-colors"
                >
                  Resend
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sign up link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <LocalizedLink
            href={withCallback('/auth/login')}
            className="font-medium text-yellow-600 hover:text-yellow-700 transition-colors"
          >
            Sign in
          </LocalizedLink>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <SearchParamsWrapper>
      <AuthRedirect>
        <AuthLayout>
          <SignupForm />
        </AuthLayout>
      </AuthRedirect>
    </SearchParamsWrapper>
  );
}