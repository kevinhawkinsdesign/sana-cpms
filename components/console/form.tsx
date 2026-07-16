'use client';

/** Shared console form primitives — labelled fields, key/value rows and the
 *  token-styled input surfaces used by Settings and Account sections. */
import React from 'react';

export function Field({
  label,
  children,
  hint,
}: Readonly<{ label: string; children: React.ReactNode; hint?: string }>) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text2)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint ? <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

export function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{children}</span>
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-0)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'inherit',
};

export const readonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--sunken)',
  color: 'var(--text2)',
};

/** Empty-state used by sections that are filled in by a later ticket. */
export function SectionPlaceholder({ title, note }: Readonly<{ title: string; note: string }>) {
  return (
    <div
      style={{
        padding: 28,
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text3)',
        border: '1px dashed var(--border)',
        borderRadius: 12,
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{title}</div>
      {note}
    </div>
  );
}
