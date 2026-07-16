'use client';

/** Settings → General (index). Org name + console URL. The Settings shell
 *  (layout.tsx) owns the page header and the section sub-nav; this page just
 *  renders the General section. */
import React from 'react';
import { Btn, Card } from '@/components/console/ui';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useOrgProfile } from '@/lib/console/settings';
import { GeneralSection } from './sections/GeneralSection';

export default function SettingsGeneralPage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_org_settings');
  const profile = useOrgProfile(orgId);

  if (!profile.data && !profile.isError) {
    return <span className="kc-skeleton block h-[260px] max-w-xl rounded-xl" />;
  }
  if (profile.isError || !profile.data || !orgId) {
    return (
      <Card style={{ maxWidth: 560, padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Couldn&apos;t load organization settings.
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" onClick={() => profile.refetch()}>Retry</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <GeneralSection org={profile.data} orgId={orgId} canManage={canManage} />
    </div>
  );
}
