'use client';

/** Billing section (KAB-128): plan, members, parent org, platform fee and
 *  payout status. Migrated from the old single-page Plan & billing card. */
import React from 'react';
import { Badge, Card } from '@/components/console/ui';
import type { OrgProfile } from '@/lib/console/settings';
import { Row } from '../_ui';

export function BillingSection({
  org,
  isPlatformAdmin,
}: Readonly<{ org: OrgProfile; isPlatformAdmin: boolean }>) {
  return (
    <Card title="Plan & billing">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label="Plan">
          <Badge kind="info">{org.plan}</Badge>
        </Row>
        <Row label="Members">
          <span className="mono">{org.memberCount}</span>
        </Row>
        {org.parentOrg ? (
          <Row label="Parent organization">
            <span>{org.parentOrg.name}</span>
          </Row>
        ) : null}
        <Row label="Platform fee">
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span className="mono">{org.platformFeePercent}%</span>
            {isPlatformAdmin && org.ownFeePercent === null ? (
              <span style={{ fontSize: 11.5, color: 'var(--text3)', marginLeft: 6 }}>(inherited)</span>
            ) : null}
          </span>
        </Row>
        <Row label="Payouts">
          {org.payoutVerified ? (
            <Badge kind="ok" dot>
              verified
            </Badge>
          ) : (
            <Badge kind="warn">not set up</Badge>
          )}
        </Row>
      </div>
    </Card>
  );
}
