'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EyeOff, Eye, ShieldCheck, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/api';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (): { strength: number; text: string; color: string } => {
    if (password.length === 0) return { strength: 0, text: '', color: 'bg-gray-200' };
    if (password.length < 8) return { strength: 25, text: 'Weak', color: 'bg-red-500' };
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;

    if (strength <= 25) return { strength, text: 'Weak', color: 'bg-red-500' };
    if (strength <= 50) return { strength, text: 'Fair', color: 'bg-orange-500' };
    if (strength <= 75) return { strength, text: 'Good', color: 'bg-yellow-500' };
    return { strength, text: 'Strong', color: 'bg-green-500' };
  };

  const strengthInfo = getStrength();

  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500">Password strength:</span>
        <span className={`text-xs font-medium ${
          strengthInfo.color.replace('bg-', 'text-')
        }`}>
          {strengthInfo.text}
        </span>
      </div>
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${strengthInfo.color} transition-all duration-300`}
          style={{ width: `${strengthInfo.strength}%` }}
        />
      </div>
    </div>
  );
};

function PasswordResetContent() {
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const resetHash = searchParams?.get('id');
  const callbackUrl = searchParams?.get('callbackUrl') || '';
  // Forward `?callbackUrl=...` onto links / post-reset navigation so the user
  // lands back on their original URL after the auth detour.
  const withCallback = (href: string) =>
    callbackUrl
      ? `${href}${href.includes('?') ? '&' : '?'}callbackUrl=${encodeURIComponent(callbackUrl)}`
      : href;

  useEffect(() => {
    if (!resetHash) {
      toast.error('Invalid reset link');
      router.push(withCallback('/auth/login'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetHash, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api(true).post('/api/user/reset-password', {
        resetHash,
        newPassword: password,
      });

      setSuccess(true);
      toast.success(response.data.message || 'Password reset successful');

      setTimeout(() => {
        router.push(withCallback('/auth/login'));
      }, 3000);
    }
    catch(e: any) {}
    finally {
      setLoading(false);
    }
  };

  const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-green-100 rounded-full">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Password Reset Successful
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You&apos;ll be redirected to login in a moment...
          </p>
          <div className="animate-pulse flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
          <p className="text-gray-600 text-center mt-2">
            Create a strong password for your account
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span>Passwords don&apos;t match</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={
                loading ||
                !isValidPassword(password) ||
                password !== confirmPassword
              }
              className="w-full bg-black text-white p-4 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <LocalizedLink
              href={withCallback('/auth/login')}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 p-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </LocalizedLink>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordResetLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="animate-pulse p-3 bg-gray-200 rounded-full mb-4 w-14 h-14"></div>
          <div className="animate-pulse h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="animate-pulse h-12 bg-gray-200 rounded w-full"></div>
            <div className="animate-pulse mt-2 h-2 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div>
            <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="animate-pulse h-12 bg-gray-200 rounded w-full"></div>
          </div>
          
          <div className="pt-4">
            <div className="animate-pulse h-12 bg-gray-200 rounded w-full mb-4"></div>
            <div className="animate-pulse h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PasswordReset() {
  return (
    <Suspense fallback={<PasswordResetLoading />}>
      <PasswordResetContent />
    </Suspense>
  );
}