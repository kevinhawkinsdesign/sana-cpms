'use client';

import React from 'react';

/** Shared console modal: a fixed dimmed overlay + a centered card. Clicking the
 *  backdrop closes it, unless `closeDisabled` (e.g. while a save is in flight —
 *  closing mid-mutation would leave it running and invite a concurrent action).
 *  `children` is the card body (header / scroll area / footer). */
export function ModalShell({
  onClose,
  closeDisabled = false,
  width = 560,
  children,
}: Readonly<{
  onClose: () => void;
  closeDisabled?: boolean;
  width?: number;
  children: React.ReactNode;
}>) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={() => { if (!closeDisabled) onClose(); }}
        disabled={closeDisabled}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: closeDisabled ? 'default' : 'pointer' }}
      />
      <div
        className="kc-fadeup"
        style={{
          position: 'relative', width, maxWidth: 'calc(100vw - 32px)', maxHeight: '84vh',
          display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
