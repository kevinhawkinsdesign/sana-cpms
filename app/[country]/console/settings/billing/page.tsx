'use client';

/** Settings → Billing & Plan. Plan, members, parent org, platform fee, payout
 *  status (read-only). Header + sub-nav come from the Settings shell. */
import React from 'react';
import { Btn, Card } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { useOrgProfile } from '@/lib/console/settings';
import { BillingSection } from '../sections/BillingSection';

export default function SettingsBillingPage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const isPlatformAdmin = !!orgsData?.isPlatformAdmin;
  const profile = useOrgProfile(orgId);

  if (!profile.data && !profile.isError) {
    return <span className="kc-skeleton block h-[240px] max-w-xl rounded-xl" />;
  }
  if (profile.isError || !profile.data || !orgId) {
    return (
      <Card style={{ maxWidth: 560, padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Couldn&apos;t load billing details.
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" onClick={() => profile.refetch()}>Retry</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-xl">
      <BillingSection org={profile.data} isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}
