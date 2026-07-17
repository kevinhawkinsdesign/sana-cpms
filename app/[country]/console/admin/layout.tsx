'use client';

/** /console/admin/* is shared by two unrelated sidebar groups: Fleet
 *  (vehicles, shop-vehicles, shop-orders, vehicles-with-debt, businesses —
 *  untouched, always full-bleed) and the merged Platform Admin hub
 *  (organizations, countries, users, audit-logs, citrine — wrapped in the
 *  sub-nav shell). This layout is a file-system-level ancestor of both, so it
 *  inspects the current leaf segment and only adds the shell chrome for the
 *  latter — Fleet pages pass through completely unchanged. */
import { usePathname } from 'next/navigation';
import { SectionShell } from '@/components/console/SectionShell';
import { PLATFORM_ADMIN_SECTIONS, PLATFORM_ADMIN_GROUPS, PLATFORM_ADMIN_SEGMENTS } from '@/components/console/shell/nav';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? '';
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';

  if (!PLATFORM_ADMIN_SEGMENTS.has(segment)) return <>{children}</>;

  return (
    <SectionShell slug="/admin" sections={PLATFORM_ADMIN_SECTIONS} groups={PLATFORM_ADMIN_GROUPS}>
      {children}
    </SectionShell>
  );
}
