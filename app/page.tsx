'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Static export has no middleware to do this redirect server-side, and
// without a page here at all `next build --output export` wouldn't emit an
// index.html for the site root. next/navigation's router already accounts
// for the configured basePath, so this resolves correctly under GitHub
// Pages' /sana-cpms/ subpath too.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rw');
  }, [router]);

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${BASE_PATH}/rw`} />
    </>
  );
}
