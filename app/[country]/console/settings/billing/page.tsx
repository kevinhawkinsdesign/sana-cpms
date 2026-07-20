'use client';

/** Settings → Billing & Plan. Plan, members, parent org, platform fee, payout
 *  status (read-only). */
import React from 'react';
import { Btn, Card, PageHead } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import { useOrgProfile } from '@/lib/console/settings';
import { BillingSection } from '../sections/BillingSection';

export default function SettingsBillingPage() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const isPlatformAdmin = !!orgsData?.isPlatformAdmin;
  const profile = useOrgProfile(orgId);

  let body: React.ReactNode;
  if (!profile.data && !profile.isError) {
    body = <span className="kc-skeleton block h-[240px] max-w-xl rounded-xl" />;
  } else if (profile.isError || !profile.data || !orgId) {
    body = (
      <Card style={{ maxWidth: 560, padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Couldn&apos;t load billing details.
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" onClick={() => profile.refetch()}>Retry</Btn>
        </div>
      </Card>
    );
  } else {
    body = <BillingSection org={profile.data} isPlatformAdmin={isPlatformAdmin} />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHead title="Billing & Plan" sub="Plan, fees, and payout status" />
      {body}
    </div>
  );
}
