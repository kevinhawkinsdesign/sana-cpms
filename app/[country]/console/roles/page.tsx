'use client';

/** Legacy route. Roles & Permissions moved into the consolidated Settings area
 *  (Settings → Roles & Permissions). Redirect /console/roles →
 *  /console/settings/roles so old links/bookmarks keep working. */
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConsoleRolesRedirect() {
  const params = useParams<{ country: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${params.country}/console/settings/roles`);
  }, [params.country, router]);
  return <div style={{ padding: 24, fontSize: 13, color: 'var(--text3)' }}>Redirecting to Settings → Roles…</div>;
}
