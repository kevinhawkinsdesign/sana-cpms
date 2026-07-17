'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';

// Static export has no middleware to do this redirect server-side, and
// without a page here at all `next build --output export` wouldn't emit an
// index.html for the site root. next/navigation's router already accounts
// for the configured basePath, so this resolves correctly under GitHub
// Pages' /sana-cpms/ subpath too.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const CONSOLE_PATH = '/rw/console';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading, loginWithPassword } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace(CONSOLE_PATH);
      return;
    }

    // Demo convenience: the whole point of landing here is to see the
    // console, so skip the login form and sign straight in as the
    // full-access admin persona — this is a public demo with mocked auth
    // (any credentials work), not a real security boundary. See
    // lib/mock/auth.ts.
    if (attempted.current) return;
    attempted.current = true;
    localStorage.setItem('returnUrl', CONSOLE_PATH);
    loginWithPassword('admin@demo.kabisa.rw', 'demo').then((ok) => {
      if (!ok) router.replace('/rw');
    });
  }, [isLoading, user, router, loginWithPassword]);

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${BASE_PATH}${CONSOLE_PATH}`} />
    </>
  );
}
