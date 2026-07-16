'use client';

/** Legacy route. Team management moved into the consolidated Settings area
 *  (Settings → Team & Members). Redirect /console/team → /console/settings/team
 *  so old links/bookmarks keep working. */
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ConsoleTeamRedirect() {
  const params = useParams<{ country: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${params.country}/console/settings/team`);
  }, [params.country, router]);
  return <div style={{ padding: 24, fontSize: 13, color: 'var(--text3)' }}>Redirecting to Settings → Team…</div>;
}
