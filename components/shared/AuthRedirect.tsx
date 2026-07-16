'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { KabisaLoader } from '@/components/shared/KabisaLoader';

interface AuthRedirectProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AuthRedirect({ children, redirectTo = '/dashboard' }: AuthRedirectProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useLocalizedRouter();
  const { get: getSearchParam } = useSearchParamsWrapper();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const callbackUrl = getSearchParam('callbackUrl') || redirectTo;
      router.push(callbackUrl);
    }
  }, [isAuthenticated, isLoading, router, redirectTo, getSearchParam]);

  if (isLoading) {
    return <KabisaLoader />;
  }

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
} 