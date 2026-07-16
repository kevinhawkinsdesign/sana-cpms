'use client';

/** Shared form scaffolding for the fleet modals (KAB-174). */
import React from 'react';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { inputStyle } from '@/components/console/form';

export const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};

export function Field({
  id,
  label,
  children,
  flex,
}: Readonly<{ id?: string; label: string; children: React.ReactNode; flex?: boolean }>) {
  return (
    <div style={flex ? { flex: 1 } : undefined}>
      {id ? <label style={fieldLabelStyle} htmlFor={id}>{label}</label> : <span style={fieldLabelStyle}>{label}</span>}
      {children}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  flex,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  flex?: boolean;
}>) {
  return (
    <Field id={id} label={label} flex={flex}>
      <input id={id} type={type} style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    </Field>
  );
}

/** Header + scrollable body + Cancel/Submit footer — the shape every fleet
 *  modal shares. */
export function FormModal({
  title,
  sub,
  onClose,
  onSubmit,
  canSubmit,
  pending,
  submitLabel,
  children,
  width = 480,
}: Readonly<{
  title: string;
  sub?: string;
  onClose: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  pending: boolean;
  submitLabel: string;
  children: React.ReactNode;
  width?: number;
}>) {
  return (
    <ModalShell onClose={onClose} closeDisabled={pending} width={width}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={pending}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={onSubmit} disabled={!canSubmit || pending}>
          {pending ? 'Saving…' : submitLabel}
        </Btn>
      </div>
    </ModalShell>
  );
}
