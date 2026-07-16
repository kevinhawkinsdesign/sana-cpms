'use client';

/** Console form image field: preview + Replace / Remove instead of a raw URL
 *  input. Uploads through the shared R2 pipeline (useR2Upload — presign or
 *  multipart, HEIC-safe) and hands the public URL to the form. */
import React from 'react';
import { toast } from 'sonner';
import { Btn, Icon } from '@/components/console/ui';
import { ImageLightbox, checkerStyle } from '@/components/console/ImageLightbox';
import { useR2Upload } from '@/lib/hooks/useR2Upload';

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};

export function ImageField({
  label,
  value,
  onChange,
  uploadContext,
  entityId,
  rounded = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** R2 key-path context, e.g. 'organization-image', 'shop-image'. */
  uploadContext: string;
  /** Entity id for the R2 key path; a stable random id is used on create flows. */
  entityId?: string;
  rounded?: boolean;
}>) {
  const { upload, isUploading, progress } = useR2Upload();
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Stable per mount, so a replace during create overwrites the same folder.
  const [fallbackId] = React.useState(() => crypto.randomUUID());
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      // Unique suffix so replacing an image never serves a stale cached copy.
      const suffix = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
      const url = await upload(file, uploadContext, entityId || fallbackId, suffix);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't upload the image", { duration: Infinity });
    }
  };

  const previewStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: rounded ? '50%' : 10,
    objectFit: 'cover',
    border: '1px solid var(--border)',
    flexShrink: 0,
    ...checkerStyle,
  };

  let body: React.ReactNode;
  if (isUploading) {
    body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="kc-skeleton" style={previewStyle} />
        <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>Uploading… {progress}%</span>
      </div>
    );
  } else if (value) {
    body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          title="View full size"
          onClick={() => setPreviewOpen(true)}
          style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', flexShrink: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are not in next.config remotePatterns */}
          <img src={value} alt={label} style={previewStyle} />
        </button>
        <Btn size="xs" variant="ghost" icon="refresh" onClick={pick}>Replace</Btn>
        <Btn size="xs" variant="ghost" icon="trash" onClick={() => onChange('')}>Remove</Btn>
      </div>
    );
  } else {
    body = (
      <button
        type="button"
        onClick={pick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '14px 12px',
          borderRadius: 10,
          border: '1px dashed var(--border)',
          background: 'transparent',
          color: 'var(--text3)',
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        <Icon name="upload" size={15} />
        Upload image
      </button>
    );
  }

  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {body}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
      {previewOpen && value && <ImageLightbox src={value} title={label} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
