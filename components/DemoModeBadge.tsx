'use client';

import { useState } from 'react';

/** Small, dismissible corner badge marking this as a demo build with mock
 *  data and fake auth — deliberately unobtrusive so it doesn't get in the
 *  way of showing off the real UI. */
export default function DemoModeBadge() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9998, fontFamily: 'system-ui, sans-serif' }}>
      {open && (
        <div
          style={{
            marginBottom: 8,
            background: '#111827',
            color: '#f9fafb',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12.5,
            lineHeight: 1.5,
            maxWidth: 260,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          <strong>Demo build</strong> — all data is mocked, no real backend or
          payments are involved. Any email/password logs you in; try{' '}
          <code>admin@</code>, <code>owner@</code>, <code>operator@</code>, or{' '}
          <code>customer@</code> to see a specific role.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: '#111827',
            color: '#f9fafb',
            border: 'none',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          DEMO
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            color: '#6b7280',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
            padding: 2,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
