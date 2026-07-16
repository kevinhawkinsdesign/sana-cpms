'use client';

import { useEffect } from 'react';
import { loadPolyfills } from '@/lib/polyfills-client';

export function Polyfills() {
  useEffect(() => {
    loadPolyfills().catch(console.error);
  }, []);

  return null;
}