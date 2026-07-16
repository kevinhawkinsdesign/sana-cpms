// src/app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, EyeIcon, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/authContext';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useSearchParamsWrapper, SearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AuthLayout } from '@/components/auth/authLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PasswordStrengthIndicator } from '@/components/shared/PasswordStrengthIndicator';
import { withBasePath } from '@/lib/utils/assetPath';

function ForgotPasswordForm() {
  const { forgotPassword, resetPassword, isLoading, getDashboardPath } = useAuth();
  const router = useLocalizedRouter();
  const { get: getSearchParam } = useSearchParamsWrapper();
  const callbackUrl = getSearchParam('callbackUrl') || '';
  // Forward `?callbackUrl=...` onto side links / post-reset navigation so the
  // user lands on their original URL after the auth detour.
  const withCallback = (href: string) =>
    callbackUrl
      ? `${href}${href.includes('?') ? '&' : '?'}callbackUrl=${encodeURIComponent(callbackUrl)}`
      : href;

  const [email, setEmail] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Step 1: Send reset code
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSendingCode(true);
    try {
    const success = await forgotPassword(email);
    if (success) {
      setIsCodeSent(true);
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    setIsVerifyingCode(true);
    try {
      // Simulate code verification (replace with real API if needed)
      // If you have a verifyCode API, call it here
      setIsCodeVerified(true);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');
      return;
    }
    setIsResettingPassword(true);
    try {
    const success = await resetPassword(code, newPassword);
    if (success) {
      toast.success('Password reset successfully!');
        // Redirect to login page after password reset, preserving callbackUrl.
      router.push(withCallback('/auth/login'));
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleBackToLogin = () => {
    setIsCodeSent(false);
    setCode('');
    setNewPassword('');
    setIsCodeVerified(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4 shadow-lg p-3">
          <Image
            src={withBasePath("/favicon-light.svg")}
            alt="Logo"
            width={40}
            height={40}
            className="w-full h-full"
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {isCodeVerified ? 'Create new password' : isCodeSent ? 'Reset your password' : 'Forgot your password?'}
        </h2>
        <p className="text-gray-600">
          {isCodeVerified
            ? 'Set a new password for your account'
            : isCodeSent
            ? 'Enter the code sent to your email'
            : 'Enter your email address and we\'ll send you a code to reset your password'}
        </p>
      </div>

      {/* Step 1: Enter email */}
      {!isCodeSent && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSendResetCode} className="space-y-4">
              <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
                </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              disabled={isSendingCode}
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send reset code'
              )}
              </Button>
            </form>
        </div>
      )}

      {/* Step 2: Enter code */}
      {isCodeSent && !isCodeVerified && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <button
                onClick={handleBackToLogin}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
            Back to forgot password
          </button>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h3>
            <p className="text-sm text-gray-600">
              We've sent a 6-digit verification code to<br />
              <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>
          <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 text-center block">
                Enter verification code
                </label>
              <InputOTP
                  value={code}
                onChange={setCode}
                  maxLength={6}
                className="justify-center"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-12 h-12 text-lg border-gray-300"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
              disabled={isVerifyingCode || code.length !== 6}
            >
              {isVerifyingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying code...
                </>
              ) : (
                'Verify code'
              )}
            </Button>
          </form>
              </div>
      )}

      {/* Step 3: Enter new password */}
      {isCodeVerified && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={handleBackToLogin}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new password"
                  className="pr-10"
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
              <PasswordStrengthIndicator password={newPassword} />
                <p className="text-xs text-gray-500">
                  Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
                </p>
              </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-md" 
              disabled={isResettingPassword || newPassword.length < 8}
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
              </Button>
            </form>
        </div>
      )}

      {/* Sign in link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
        Remember your password?{' '}
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

export default function ForgotPasswordPage() {
  return (
    <SearchParamsWrapper>
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </SearchParamsWrapper>
  );
}