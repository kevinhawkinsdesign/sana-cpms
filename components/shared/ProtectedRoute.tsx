'use client';

import { Suspense, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { usePathname } from 'next/navigation';
import { KabisaLoader } from '@/components/shared/KabisaLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

// useSearchParams() (via useSearchParamsWrapper) bails a static-export page
// out of prerendering unless an ancestor Suspense boundary catches it —
// ProtectedRoute is always the outermost wrapper on the pages that use it,
// so it provides one itself here.
export function ProtectedRoute(props: ProtectedRouteProps) {
  return (
    <Suspense fallback={<KabisaLoader />}>
      <ProtectedRouteInner {...props} />
    </Suspense>
  );
}

function ProtectedRouteInner({ children, redirectTo = '/auth/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useLocalizedRouter();
  const { get: getSearchParam } = useSearchParamsWrapper();
  const pathname = usePathname();

  // Check if current path is an invitation page that should be accessible to unauthenticated users
  const isInvitationPage = pathname.includes('/dashboard/customer/business/invitation') && 
                          getSearchParam('invitation');

  useEffect(() => {
    // Don't redirect if it's an invitation page - let the invitation page handle auth flow
    if (!isLoading && !isAuthenticated && !isInvitationPage) {
      // Preserve the full URL the user was trying to reach — including
      // query params and hash — so deep links like
      // `?limit=100&sessionId=...` survive the auth round trip.
      const callbackUrl =
        getSearchParam('callbackUrl') ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, router, redirectTo, getSearchParam, isInvitationPage]);

  if (isLoading) {
    return <KabisaLoader />;
  }

  // Allow unauthenticated access to invitation pages
  if (!isAuthenticated && isInvitationPage) {
    return <>{children}</>;
  }

  // For all other routes, require authentication
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
} 