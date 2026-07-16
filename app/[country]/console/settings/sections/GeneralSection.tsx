'use client';

/** General section (KAB-128): org name + console URL. Migrated from the old
 *  single-page Profile card. TIN now lives in the Tax section (KAB-130). */
import React, { useEffect, useState } from 'react';
import { Btn, Card } from '@/components/console/ui';
import type { OrgProfile } from '@/lib/console/settings';
import { useUpdateOrg } from '@/lib/console/settings';
import { Field, inputStyle, readonlyStyle } from '../_ui';

export function GeneralSection({
  org,
  orgId,
  canManage,
}: Readonly<{ org: OrgProfile; orgId: string; canManage: boolean }>) {
  const update = useUpdateOrg(orgId);
  const [name, setName] = useState(org.name);

  useEffect(() => {
    setName(org.name);
  }, [org]);

  // Trim both sides so a stored name with stray whitespace doesn't read as dirty.
  const dirty = name.trim() !== org.name.trim();

  return (
    <Card title="General">
      <Field label="Organization name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
          style={canManage ? inputStyle : readonlyStyle}
        />
      </Field>
      <Field label="Console URL slug" hint="Fixed after activation — it's the charger websocket path.">
        <input value={org.slug ?? '—'} disabled style={readonlyStyle} />
      </Field>
      {canManage ? (
        <Btn
          variant="primary"
          size="sm"
          disabled={!dirty || !name.trim()}
          loading={update.isPending}
          onClick={() => update.mutate({ name: name.trim() })}
        >
          Save changes
        </Btn>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>
          You don&apos;t have permission to edit these settings.
        </div>
      )}
    </Card>
  );
}
