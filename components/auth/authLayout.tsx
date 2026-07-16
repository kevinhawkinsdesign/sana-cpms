// src/components/auth/AuthLayout.tsx
import Image from 'next/image';
import { withBasePath } from '@/lib/utils/assetPath';

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-6 px-4 sm:py-8 sm:px-6 lg:py-12 lg:px-8">
        <div className="mx-auto w-full max-w-sm sm:max-w-md">
          <div className="space-y-6">{children}</div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src={withBasePath("/evhouse.webp")} 
          alt="Authentication Illustration"
          width="1920"
          height="1080"
          className="h-full w-full object-cover"
          priority
        />
      </div>
    </div>
  );
};