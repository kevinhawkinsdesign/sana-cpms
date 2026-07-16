'use client';

/** Create / edit an organization (KAB-172) — name, country, plan, TIN, Citrine
 *  tenant and logo; parent org on create only. Writes via the platform org
 *  APIs (KAB-171). Slug is assigned during OCPP onboarding, not here. */
import React from 'react';
import { Btn, Select } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { ImageField } from '@/components/console/ImageField';
import { inputStyle } from '@/components/console/form';
import {
  entityOptions,
  useCountries,
  useCreateOrg,
  usePlatformOrgs,
  useUpdateOrg,
  type PlatformOrg,
  type PlatformOrgInput,
} from '@/lib/console/platformAdmin';

/** Accepts a detail (with parentOrg) or a plain list row — edit mode only
 *  reads the flat fields, parentOrg just prefills the (create-only) label. */
type OrgFormOrg = PlatformOrg & { parentOrg?: { id: string; name: string } | null };

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};

const PLAN_LABELS: Record<string, string> = { STARTER: 'Starter', GROWTH: 'Growth', INTERNAL: 'Internal' };
const LABEL_TO_PLAN = Object.fromEntries(Object.entries(PLAN_LABELS).map(([k, v]) => [v, k]));
const NO_COUNTRY = 'No country';
const NO_PARENT = 'None (top-level)';

export function OrgFormModal({
  mode,
  org,
  onClose,
  onCreated,
}: Readonly<{
  mode: 'create' | 'edit';
  org?: OrgFormOrg | null;
  onClose: () => void;
  onCreated?: (created: PlatformOrg) => void;
}>) {
  const create = useCreateOrg();
  const update = useUpdateOrg();
  const { data: countries, isPending: countriesLoading } = useCountries();
  // Parent options: top-level orgs only (hierarchy depth <= 2, enforced server-side).
  const { data: orgsPage, isPending: orgsLoading } = usePlatformOrgs({ page: 1, limit: 100 });

  // Id-backed selects: labels resolve through entityOptions, never by name.
  const countrySel = React.useMemo(() => entityOptions(countries ?? [], NO_COUNTRY), [countries]);
  const parentSel = React.useMemo(
    () =>
      entityOptions(
        // Top-level orgs only (hierarchy depth <= 2, enforced server-side).
        (orgsPage?.organizations ?? []).filter((o) => !o.parentOrgId && o.id !== org?.id),
        NO_PARENT,
      ),
    [orgsPage, org?.id],
  );

  const [name, setName] = React.useState(org?.name ?? '');
  const [countryLabel, setCountryLabel] = React.useState(countrySel.labelForId(org?.country?.id));
  const [plan, setPlan] = React.useState(PLAN_LABELS[org?.plan ?? 'STARTER'] ?? 'Starter');
  const [tin, setTin] = React.useState(org?.tin ?? '');
  const [citrine, setCitrine] = React.useState(org?.citrineTenantId != null ? String(org.citrineTenantId) : '');
  const [logo, setLogo] = React.useState(org?.logo ?? '');
  const [parentLabel, setParentLabel] = React.useState(parentSel.labelForId(org?.parentOrg?.id));

  // The initial labels are computed before the async country/org lists load
  // (both resolve to the none label on an empty map). Re-derive by id once
  // the lists arrive — but never stomp a value the user has already picked.
  const [countryTouched, setCountryTouched] = React.useState(false);
  const [parentTouched, setParentTouched] = React.useState(false);
  React.useEffect(() => {
    if (!countryTouched) setCountryLabel(countrySel.labelForId(org?.country?.id));
  }, [countryTouched, countrySel, org?.country?.id]);
  React.useEffect(() => {
    if (!parentTouched) setParentLabel(parentSel.labelForId(org?.parentOrg?.id));
  }, [parentTouched, parentSel, org?.parentOrg?.id]);

  const pending = create.isPending || update.isPending;

  const citrineValue = citrine.trim() === '' ? null : Number(citrine);
  const citrineInvalid = citrineValue != null && (!Number.isInteger(citrineValue) || citrineValue < 1);
  // Saving before the country/org lists load would resolve the still-default
  // labels to null and silently clear those fields.
  const canSave = name.trim().length >= 2 && !citrineInvalid && !pending && !countriesLoading && !orgsLoading;

  const submit = () => {
    if (!canSave) return;
    const data: PlatformOrgInput = {
      name: name.trim(),
      countryId: countrySel.idFor(countryLabel),
      plan: LABEL_TO_PLAN[plan],
      tin: tin.trim() || null,
      citrineTenantId: citrineValue,
      logo: logo.trim() || null,
    };
    if (mode === 'create') {
      data.parentOrgId = parentSel.idFor(parentLabel);
      create.mutate(data, {
        onSuccess: (created) => {
          onClose();
          onCreated?.(created);
        },
      });
    } else if (org) {
      update.mutate({ id: org.id, data }, { onSuccess: () => onClose() });
    }
  };

  return (
    <ModalShell onClose={onClose} closeDisabled={pending} width={520}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{mode === 'create' ? 'New organization' : 'Edit organization'}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
          {mode === 'create'
            ? 'Creates a customer organization on the platform. The OCPP slug is assigned during charger onboarding.'
            : 'Changes apply immediately across the platform.'}
        </div>
      </div>

      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="o-name">Name</label>
          <input id="o-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Volt Mobility" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>Country</span>
            <Select
              options={countrySel.labels}
              value={countryLabel}
              onChange={(v) => { setCountryTouched(true); setCountryLabel(v); }}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>Plan</span>
            <Select options={Object.values(PLAN_LABELS)} value={plan} onChange={setPlan} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="o-tin">TIN</label>
            <input id="o-tin" style={inputStyle} value={tin} onChange={(e) => setTin(e.target.value)} placeholder="RRA taxpayer id" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="o-citrine">Citrine tenant ID</label>
            <input
              id="o-citrine"
              type="number"
              min={1}
              style={inputStyle}
              value={citrine}
              onChange={(e) => setCitrine(e.target.value)}
              placeholder={mode === 'edit' ? 'Leave blank to clear' : 'Optional'}
            />
          </div>
        </div>
        <ImageField label="Logo" value={logo} onChange={setLogo} uploadContext="organization-image" entityId={org?.id} rounded />
        {mode === 'create' && (
          <div>
            <span style={labelStyle}>Parent organization</span>
            <Select
              options={parentSel.labels}
              value={parentLabel}
              onChange={(v) => { setParentTouched(true); setParentLabel(v); }}
              style={{ width: '100%' }}
            />
          </div>
        )}
        {citrineInvalid && (
          <p style={{ fontSize: 12, color: '#c0392b', margin: 0 }}>Citrine tenant ID must be a positive whole number.</p>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={pending}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={submit} disabled={!canSave}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create organization' : 'Save changes'}
        </Btn>
      </div>
    </ModalShell>
  );
}
