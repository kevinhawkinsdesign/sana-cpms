'use client';

/** Full-size image viewer + the clickable-thumbnail wrapper used everywhere
 *  the console shows a content image (org logos, catalog images, …). */
import React from 'react';
import { createPortal } from 'react-dom';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';

/** Mid-gray checkerboard so transparent images stay visible on both themes. */
export const checkerStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(127,127,127,.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(127,127,127,.16) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(127,127,127,.16) 75%), linear-gradient(-45deg, transparent 75%, rgba(127,127,127,.16) 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
};

export function ImageLightbox({
  src,
  title,
  onClose,
}: Readonly<{ src: string; title: string; onClose: () => void }>) {
  // Portal into .kc-root, NOT document.body — the console theme variables
  // (--surface/--border/…) are scoped to .kc-root[data-kc-theme], so a
  // body-level portal renders an unstyled transparent card. A portal is still
  // needed: an ancestor modal's kc-fadeup keeps a transform (fill-mode both)
  // that would trap a nested fixed overlay.
  return createPortal(
    <ModalShell onClose={onClose} width={720}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 650 }}>{title}</span>
        <Btn size="xs" variant="ghost" icon="x" onClick={onClose}>Close</Btn>
      </div>
      {/* Fixed-size stage regardless of the image's dimensions. */}
      <div style={{ margin: 16, height: 'min(60vh, 460px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', ...checkerStyle }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are not in next.config remotePatterns */}
        <img src={src} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    </ModalShell>,
    document.querySelector('.kc-root') ?? document.body,
  );
}

/** A displayed image that opens the full-size lightbox on click. Renders a
 *  button, so kc-row-clickable rows (rowNav) ignore the click. */
export function ClickableImage({
  src,
  title,
  className,
}: Readonly<{ src: string; title: string; className?: string }>) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        title="View full size"
        onClick={() => setOpen(true)}
        style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', flexShrink: 0, lineHeight: 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are not in next.config remotePatterns */}
        <img src={src} alt={title} className={className} />
      </button>
      {open && <ImageLightbox src={src} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
