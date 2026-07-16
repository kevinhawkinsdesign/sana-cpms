'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { LocalizedLink } from './LocalizedLink';

export const Breadcrumbs = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label };
  });

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <LocalizedLink
        href="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </LocalizedLink>
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.href} className="flex items-center">
          <ChevronRight className="h-4 w-4" />
          <LocalizedLink
            href={breadcrumb.href}
            className={`ml-1 hover:text-foreground transition-colors ${
              index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''
            }`}
          >
            {breadcrumb.label}
          </LocalizedLink>
        </div>
      ))}
    </nav>
  );
}; 