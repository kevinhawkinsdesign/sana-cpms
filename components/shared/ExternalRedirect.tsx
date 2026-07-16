'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ExternalRedirectProps {
  to: string;
  delay?: number;
}

export default function ExternalRedirect({ to, delay = 1000 }: ExternalRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = to;
    }, delay);

    return () => clearTimeout(timer);
  }, [to, delay]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h2>
        <p className="text-gray-600 mb-4">
          You are being redirected to an external form.
        </p>
        <p className="text-sm text-gray-500">
          If you are not redirected automatically,{' '}
          <a 
            href={to} 
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
} 