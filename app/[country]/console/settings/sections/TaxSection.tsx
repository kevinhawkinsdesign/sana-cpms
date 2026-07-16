'use client';

/** Tax & EBM section (KAB-130) over the KAB-127 org tax/EBM settings API:
 *  TIN, default tax rate and EBM configuration with inline save + client
 *  validation. Read-only unless the role has `manage_org_settings`; backend
 *  validation errors surface via the data layer (toast). */
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Btn, Card } from '@/components/console/ui';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useOrgProfile, useUpdateOrg, type UpdateOrgInput } from '@/lib/console/settings';
import { Field, inputStyle, readonlyStyle } from '../_ui';

export function TaxSection() {
  const { data: orgsData } = useOrgs();
  const orgId = orgsData?.activeOrgId ?? null;
  const canManage = hasPerm(orgsData, 'manage_org_settings');

  const profile = useOrgProfile(orgId);
  const update = useUpdateOrg(orgId);
  const org = profile.data;

  const [tin, setTin] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [ebmEnabled, setEbmEnabled] = useState(false);
  const [ebmBhfId, setEbmBhfId] = useState('');

  useEffect(() => {
    if (!org) return;
    setTin(org.tin ?? '');
    setTaxRate(org.taxRate != null ? String(org.taxRate) : '');
    setEbmEnabled(org.ebmEnabled);
    setEbmBhfId(org.ebmBhfId ?? '');
  }, [org]);

  const tinError = useMemo(() => {
    const v = tin.trim();
    return v && !/^\d{9}$/.test(v) ? 'TIN must be 9 digits.' : '';
  }, [tin]);

  const taxRateError = useMemo(() => {
    const v = taxRate.trim();
    if (!v) return '';
    const n = Number(v);
    return Number.isNaN(n) || n < 0 || n > 100 ? 'Tax rate must be between 0 and 100.' : '';
  }, [taxRate]);

  if (!org) {
    return (
      <Card title="Tax & EBM">
        <span className="kc-skeleton" style={{ display: 'block', height: 200, maxWidth: 460 }} />
      </Card>
    );
  }

  const norm = {
    tin: tin.trim() || null,
    taxRate: taxRate.trim() === '' ? null : Number(taxRate),
    ebmBhfId: ebmBhfId.trim() || null,
  };
  const dirty =
    norm.tin !== (org.tin ?? null) ||
    norm.taxRate !== (org.taxRate ?? null) ||
    ebmEnabled !== org.ebmEnabled ||
    norm.ebmBhfId !== (org.ebmBhfId ?? null);
  const hasErrors = !!tinError || !!taxRateError;

  const save = () => {
    const payload: UpdateOrgInput = {
      tin: norm.tin,
      taxRate: norm.taxRate,
      ebmEnabled,
      ebmBhfId: norm.ebmBhfId,
    };
    update.mutate(payload);
  };

  const fieldStyle = (err: string): React.CSSProperties => ({
    ...(canManage ? inputStyle : readonlyStyle),
    ...(err ? { borderColor: 'var(--err, #d4444f)' } : {}),
  });

  return (
    <Card title="Tax & EBM">
      <Field label="Tax ID (TIN)" hint={tinError || 'RRA taxpayer id used on fiscal receipts (9 digits).'}>
        <input
          value={tin}
          onChange={(e) => setTin(e.target.value)}
          disabled={!canManage}
          placeholder="—"
          inputMode="numeric"
          style={fieldStyle(tinError)}
        />
      </Field>

      <Field label="Default tax rate (%)" hint={taxRateError || 'VAT rate applied on receipts. Leave blank to use the system default.'}>
        <input
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          disabled={!canManage}
          placeholder="e.g. 18"
          inputMode="decimal"
          style={{ ...fieldStyle(taxRateError), maxWidth: 160 }}
        />
      </Field>

      <Field label="EBM fiscal receipts">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: canManage ? 'pointer' : 'default' }}>
          <input
            type="checkbox"
            checked={ebmEnabled}
            disabled={!canManage}
            onChange={(e) => setEbmEnabled(e.target.checked)}
          />
          Issue EBM fiscal receipts for this organization
          {ebmEnabled ? (
            <Badge kind="ok" dot>
              on
            </Badge>
          ) : (
            <Badge kind="neutral">off</Badge>
          )}
        </label>
      </Field>

      <Field
        label="EBM branch ID (BHF)"
        hint="VSDC branch id used when issuing this organization's receipts."
      >
        <input
          value={ebmBhfId}
          onChange={(e) => setEbmBhfId(e.target.value)}
          disabled={!canManage || !ebmEnabled}
          placeholder="—"
          style={{ ...(canManage && ebmEnabled ? inputStyle : readonlyStyle), maxWidth: 200 }}
        />
      </Field>

      <div
        style={{
          fontSize: 12, color: 'var(--text3)', background: 'var(--sunken)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, maxWidth: 520,
        }}
      >
        When EBM is enabled, completed sessions are issued as fiscal receipts to RRA using the TIN and branch ID above; the tax rate determines the VAT applied on each receipt.
      </div>

      {canManage ? (
        <Btn
          variant="primary"
          size="sm"
          disabled={!dirty || hasErrors}
          loading={update.isPending}
          onClick={save}
        >
          Save changes
        </Btn>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>
          You don&apos;t have permission to edit tax settings.
        </div>
      )}
    </Card>
  );
}
