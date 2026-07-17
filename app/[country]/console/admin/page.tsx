'use client';

/** Bare /console/admin — the merged Platform Admin sidebar item links here.
 *  Unlike /console/ebm, this segment is also Fleet's shared ancestor (see
 *  layout.tsx), so there's no single "first section" page to alias; this
 *  just forwards to Organizations, the first Platform Admin sub-nav entry. */
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();
  const params = useParams<{ country: string }>();

  useEffect(() => {
    router.replace(`/${params.country}/console/admin/organizations`);
  }, [router, params.country]);

  return null;
}
