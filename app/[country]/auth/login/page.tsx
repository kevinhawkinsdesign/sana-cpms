'use client';

import { useState, useEffect } from 'react';
import {
  EyeIcon,
  EyeOff,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { useSearchParamsWrapper, SearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { AuthRedirect } from '@/components/shared/AuthRedirect';
import { AuthLayout } from '@/components/auth/authLayout';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { useCountry } from '@/lib/providers/country-provider';
import Image from 'next/image';

type SSOMethod = 'email' | 'phone';

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

function LoginForm() {
  const { get: getSearchParam } = useSearchParamsWrapper();
  const { login, isLoading, getDashboardPath } = useAuth();
  const router = useLocalizedRouter();
  const { countryCode } = useCountry();

  const [authMode, setAuthMode] = useState<'login' | 'sso'>('login');
  const [ssoMethod, setSsoMethod] = useState<SSOMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Cooldown state management
  const [lastCodeSentTime, setLastCodeSentTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // callbackUrl wins over the role-based dashboard so deep links survive auth.
  // Stashed into localStorage.returnUrl right before each login call below —
  // AuthContext's own post-login redirect reads it from there (and always
  // has the freshly-returned role, so it can't race a stale value like a
  // client-computed path captured before login would).
  const callbackUrl = getSearchParam('callbackUrl') || '';
  // Forward `?callbackUrl=...` onto side links (forgot password, signup, etc.)
  // so the user lands back on their original URL after the detour.
  const withCallback = (href: string) =>
    callbackUrl
      ? `${href}${href.includes('?') ? '&' : '?'}callbackUrl=${encodeURIComponent(callbackUrl)}`
      : href;

  // Cooldown timer effect
  useEffect(() => {
    if (lastCodeSentTime && cooldownRemaining > 0) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastCodeSentTime) / 1000);
        const remaining = Math.max(0, 60 - elapsed);
        setCooldownRemaining(remaining);

        if (remaining === 0) {
          clearInterval(timer);
          setLastCodeSentTime(null);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lastCodeSentTime, cooldownRemaining]);

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
          
          const element = document.getElementById('google-signin-button');
          if (element) {
            element.innerHTML = '';
            try {
              window.google.accounts.id.renderButton(element, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'pill',
                logo_alignment: 'left',
                width: 320
              });
            } catch (error) {
              // Silently handle errors - don't break the page
              console.warn('Google Sign-In button could not be rendered:', error);
            }
          }
        } catch (error) {
          // Silently handle errors - don't break the page
          console.warn('Google Sign-In could not be initialized:', error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        const checkGoogle = setInterval(() => {
          if (window.google) {
            initializeGoogleSignIn();
            clearInterval(checkGoogle);
          }
        }, 100);
      }
    }
  }, [authMode]);

  const handleGoogleSignIn = async (response: any) => {
    try {
      if (callbackUrl) localStorage.setItem('returnUrl', callbackUrl);
      const googleToken = response.credential;
      // AuthContext's own login flow already redirects (using the role it
      // just received, so it can't be stale) honoring returnUrl above.
      await login.withGoogle(googleToken);
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Apply phone number formatting
    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value, countryCode);
      setFormData({
        ...formData,
        [name]: formattedPhone,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsSigningIn(true);
    try {
      if (callbackUrl) localStorage.setItem('returnUrl', callbackUrl);
      // AuthContext's own login flow already redirects (using the role it
      // just received, so it can't be stale) honoring returnUrl above.
      await login.withPassword(formData.email, formData.password);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSSOLogin = async () => {
    if (ssoMethod === 'email' && !formData.email) {
      toast.error('Please enter your email');
      return;
    }

    if (ssoMethod === 'phone' && !formData.phone) {
      toast.error('Please enter your phone number');
      return;
    }

    // Check if cooldown is active
    if (cooldownRemaining > 0) {
      toast.error(`Please wait ${cooldownRemaining} seconds before sending another code`);
      return;
    }

    setIsSendingCode(true);
    try {
      const success = ssoMethod === 'email'
        ? await login.withEmailCode(formData.email)
        : await login.withPhoneCode(formData.phone);

      if (success) {
        setIsCodeSent(true);
        // Start cooldown timer
        const currentTime = Date.now();
        setLastCodeSentTime(currentTime);
        setCooldownRemaining(60);
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleCodeVerification = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifyingCode(true);
    try {
      if (callbackUrl) localStorage.setItem('returnUrl', callbackUrl);
      // AuthContext's own login flow already redirects (using the role it
      // just received, so it can't be stale) honoring returnUrl above.
      ssoMethod === 'email'
        ? await login.verifyCode(code, 'EMAIL_CODE', formData.email)
        : await login.verifyCode(code, 'PHONE_CODE', undefined, formData.phone);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    // Check if cooldown is active
    if (cooldownRemaining > 0) {
      toast.error(`Please wait ${cooldownRemaining} seconds before sending another code`);
      return;
    }

    const success = ssoMethod === 'email'
      ? await login.withEmailCode(formData.email)
      : await login.withPhoneCode(formData.phone);

    if (success) {
      toast.success('Code resent successfully');
      // Start cooldown timer
      const currentTime = Date.now();
      setLastCodeSentTime(currentTime);
      setCooldownRemaining(60);
    }
  };

  const handleBackToLogin = () => {
    setIsCodeSent(false);
    setCode('');
    setAuthMode('login');
  };

  if (isCodeSent) {
    return (
      <div className="relative py-3 w-full">
        <div className="relative px-4 py-6 sm:py-8 md:py-10 bg-white shadow-xl rounded-2xl sm:rounded-3xl sm:p-6 md:p-8 lg:p-10">
          <div className="w-full">
            <button
              onClick={handleBackToLogin}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </button>

            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Check your {ssoMethod === 'email' ? 'email' : 'phone'}</h3>
              <p className="text-sm text-gray-600">
                We've sent a 6-digit verification code to
              </p>
              <p className="font-semibold text-gray-900 mt-1 text-sm sm:text-base break-all">
                {ssoMethod === 'email' ? formData.email : formData.phone}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="font-semibold text-sm text-gray-600 pb-1 block text-center">
                  Enter verification code
                </label>
                <InputOTP
                  value={code}
                  onChange={setCode}
                  maxLength={6}
                  className="justify-center"
                >
                  <InputOTPGroup className="gap-1 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-2 rounded-lg touch-manipulation"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <button
                onClick={handleCodeVerification}
                disabled={isVerifyingCode || code.length !== 6}
                className="py-3 px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white w-full transition ease-in duration-200 text-center text-sm sm:text-base font-semibold shadow-md rounded-lg touch-manipulation"
              >
                {isVerifyingCode ? (
                  <>
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and sign in'
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResendCode}
                    disabled={isLoading || cooldownRemaining > 0}
                    className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {cooldownRemaining > 0 ? `Resend in ${cooldownRemaining}s` : 'Resend'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-3 w-full">
      <div className="relative px-4 py-6 sm:py-8 md:py-10 bg-white shadow-xl rounded-2xl sm:rounded-3xl sm:p-6 md:p-8 lg:p-10">
        <div className="w-full">
          <style jsx>{`
            #google-signin-button {
              display: flex;
              justify-content: center;
              width: 100%;
            }
            #google-signin-button > div {
              width: 100% !important;
            }
            #google-signin-button button {
              width: 100% !important;
              height: 48px !important;
              border-radius: 8px !important;
              border: 1px solid #d1d5db !important;
              background: white !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-weight: 600 !important;
              font-size: 14px !important;
              color: #374151 !important;
              transition: all 0.2s ease-in !important;
            }
            #google-signin-button button:hover {
              background: #f9fafb !important;
            }
          `}</style>
          {/* Logo */}
          <div className="flex items-center space-x-3 sm:space-x-5 justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl blur opacity-30"></div>
              <div className="relative bg-black rounded-2xl p-2 sm:p-3">
                <Image
                  src="/favicon-light.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-xs sm:text-sm text-gray-600">Sign in to your account</p>
            </div>
          </div>

          {authMode === 'login' ? (
            <>
              {/* Email & Password Form */}
              <form onSubmit={handlePasswordLogin}>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="font-semibold text-sm text-gray-600 pb-1 block" htmlFor="email">
                      E-mail
                    </label>
                    <input
                      className="border rounded-lg px-3 py-3 sm:py-2 mt-1 text-sm w-full focus:border-blue-500 focus:outline-none touch-manipulation"
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="font-semibold text-sm text-gray-600 pb-1 block" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        className="border rounded-lg px-3 py-3 sm:py-2 mt-1 text-sm w-full pr-10 focus:border-blue-500 focus:outline-none touch-manipulation"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-3 sm:top-2 text-gray-400 hover:text-gray-600 touch-manipulation"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right mb-4">
                  <LocalizedLink
                    href={withCallback('/auth/forgot-password')}
                    className="text-xs font-display font-semibold text-gray-500 hover:text-gray-600 cursor-pointer"
                  >
                    Forgot Password?
                  </LocalizedLink>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="py-3 px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white w-full transition ease-in duration-200 text-center text-sm sm:text-base font-semibold shadow-md rounded-lg touch-manipulation"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Log in'
                    )}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3 w-full">
                {/* Google Sign In */}
                <div id="google-signin-button" className="w-full"></div>
                
                {/* SSO Button */}
                <button
                  onClick={() => setAuthMode('sso')}
                  className="flex items-center justify-center py-3 px-4 sm:py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 w-full transition ease-in duration-200 text-center text-sm sm:text-base font-semibold shadow-sm rounded-lg touch-manipulation"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-600" />
                  <span>Sign in with Email Code</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* SSO Mode */}
              <button
                onClick={() => setAuthMode('login')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                Back to login
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Passwordless Sign In</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Get a verification code sent to you</p>
              </div>

              {/* Toggle between Email and Phone */}
              <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => setSsoMethod('email')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 px-3 sm:py-2 rounded-md transition-all text-sm font-medium touch-manipulation",
                    ssoMethod === 'email'
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setSsoMethod('phone')}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 px-3 sm:py-2 rounded-md transition-all text-sm font-medium touch-manipulation",
                    ssoMethod === 'phone'
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Phone
                </button>
              </div>

              {/* Input Field */}
              {ssoMethod === 'email' ? (
                <>
                  <label className="font-semibold text-sm text-gray-600 pb-1 block">
                    E-mail address
                  </label>
                  <input
                    className="border rounded-lg px-3 py-3 sm:py-2 mt-1 mb-5 text-sm w-full focus:border-blue-500 focus:outline-none touch-manipulation"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </>
              ) : (
                <>
                  <label className="font-semibold text-sm text-gray-600 pb-1 block">
                    Phone number
                  </label>
                  <input
                    className="border rounded-lg px-3 py-3 sm:py-2 mt-1 mb-5 text-sm w-full focus:border-blue-500 focus:outline-none touch-manipulation"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={countryCode === 'rw' ? '+250788888888' : '+254712345678'}
                    required
                  />
                </>
              )}

              <button
                onClick={handleSSOLogin}
                disabled={isSendingCode || cooldownRemaining > 0}
                className="py-3 px-4 sm:py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-full transition ease-in duration-200 text-center text-sm sm:text-base font-semibold shadow-md rounded-lg touch-manipulation"
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldownRemaining > 0 ? (
                  `Resend in ${cooldownRemaining}s`
                ) : (
                  'Send verification code'
                )}
              </button>
            </>
          )}

          {/* Sign up link */}
          <div className="flex items-center justify-between mt-6">
            <span className="w-1/5 border-b border-gray-300 md:w-1/4" />
            <LocalizedLink
              href={withCallback('/auth/signup')}
              className="text-xs text-gray-500 uppercase hover:underline"
            >
              or sign up
            </LocalizedLink>
            <span className="w-1/5 border-b border-gray-300 md:w-1/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SearchParamsWrapper>
      <AuthRedirect>
        <AuthLayout>
          <LoginForm />
        </AuthLayout>
      </AuthRedirect>
    </SearchParamsWrapper>
  );
}