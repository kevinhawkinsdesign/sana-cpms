'use client';

/** Placeholder for console routes whose screens are still in flight. Keeps the
 *  sidebar links navigable (no 404s) and tells the operator which slice ships
 *  next. Replace each route's page.tsx as its FE-n lands. */
import React from 'react';
import { Card, Icon, PageHead, type IconName } from '@/components/console/ui';

export function ComingSoon({
  title,
  sub,
  icon,
  ticket,
}: Readonly<{ title: string; sub?: string; icon: IconName; ticket?: string }>) {
  return (
    <div style={{ padding: 24 }}>
      <PageHead title={title} sub={sub} />
      <Card>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 'var(--r-lg)',
              background: 'var(--sunken)',
              border: '1px solid var(--border)',
              color: 'var(--text3)',
            }}
          >
            <Icon name={icon} size={22} />
          </span>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title} is on the way</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 360 }}>
            This screen is being built{ticket ? ` (${ticket})` : ''}. The data and actions land here
            in an upcoming release.
          </div>
        </div>
      </Card>
    </div>
  );
}
