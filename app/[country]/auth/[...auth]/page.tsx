'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { AuthRedirect } from '@/components/shared/AuthRedirect';
import { SearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import { useParams } from 'next/navigation';

export default function AuthenticationPage() {
  const params = useParams();
  const page = params.auth?.[0] || 'login';

  const mode = page === 'signup' ? 'signup' : 'login';

  return (
    <SearchParamsWrapper>
      <AuthRedirect>
        <AuthForm mode={mode} />
      </AuthRedirect>
    </SearchParamsWrapper>
  );
} 