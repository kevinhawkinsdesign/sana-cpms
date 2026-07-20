'use client';

/** Settings → General (index). Org name + console URL. Each Settings/Admin
 *  section owns its own PageHead; the shared shell (layout.tsx) only adds the
 *  sub-nav chrome around it. */
import React from 'react';
import { Btn, Card, PageHead } from '@/components/console/ui';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useOrgProfile } from '@/lib/console/settings';
import { GeneralSection } from './sections/GeneralSection';

export default function SettingsGeneralPage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_org_settings');
  const profile = useOrgProfile(orgId);

  let body: React.ReactNode;
  if (!profile.data && !profile.isError) {
    body = <span className="kc-skeleton block h-[260px] max-w-xl rounded-xl" />;
  } else if (profile.isError || !profile.data || !orgId) {
    body = (
      <Card style={{ maxWidth: 560, padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Couldn&apos;t load organization settings.
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" onClick={() => profile.refetch()}>Retry</Btn>
        </div>
      </Card>
    );
  } else {
    body = <GeneralSection org={profile.data} orgId={orgId} canManage={canManage} />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHead title="General" sub="Organization name and console URL" />
      {body}
    </div>
  );
}
