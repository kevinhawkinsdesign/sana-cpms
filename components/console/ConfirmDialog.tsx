'use client';

/** Shared destructive-confirm modal for the console. A dimmed backdrop over a
 *  small centered card with Cancel + a danger confirm button. Extracted from
 *  Team management so other surfaces (e.g. revoking a login session) reuse the
 *  same dialog instead of re-implementing it. */
import React from 'react';
import { Btn, type IconName } from '@/components/console/ui';

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  pending,
  confirmVariant = 'danger',
  confirmIcon = 'x',
}: Readonly<{
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  /** Non-destructive confirms (e.g. adding) can override the danger styling. */
  confirmVariant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  confirmIcon?: IconName;
}>) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '18vh' }}>
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'default' }}
      />
      <div
        className="kc-fadeup"
        style={{
          position: 'relative', width: 420, maxWidth: 'calc(100vw - 32px)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', padding: 20,
          // Reset inherited white-space: mounted in-tree, the dialog can land
          // inside a nowrap context (e.g. a .kc-table cell) and its text would
          // overflow the card instead of wrapping.
          whiteSpace: 'normal', overflowWrap: 'anywhere',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 20 }}>{body}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn size="sm" onClick={onCancel} type="button">
            Cancel
          </Btn>
          <Btn size="sm" variant={confirmVariant} onClick={onConfirm} loading={pending} icon={confirmIcon}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
