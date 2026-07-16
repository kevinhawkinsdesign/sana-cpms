'use client';

/** Shown when the signed-in member lacks the permission a console page needs.
 *  Used by the shell route guard and by pages that hit a 403. */
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, Icon } from '@/components/console/ui';

export function AccessDenied({
  title = 'Access denied',
  message = "You don't have permission to view this page. Ask an organization owner or admin to grant you access.",
}: Readonly<{ title?: string; message?: string }>) {
  const params = useParams<{ country: string }>();
  const country = params?.country ?? 'rw';
  return (
    <div style={{ padding: 24 }}>
      <Card style={{ maxWidth: 480, margin: '48px auto', padding: 36, textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 99,
            background: 'var(--sunken)',
            color: 'var(--text2)',
            marginBottom: 14,
          }}
        >
          <Icon name="shield" size={24} />
        </span>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 650, color: 'var(--text)' }}>{title}</h2>
        <p style={{ margin: '8px 0 18px', fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>{message}</p>
        <Link
          href={`/${country}/console`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent, #08294f)',
            textDecoration: 'none',
          }}
        >
          <Icon name="arrowL" size={13} />
          Back to overview
        </Link>
      </Card>
    </div>
  );
}
