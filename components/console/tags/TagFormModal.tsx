'use client';

/** Create / edit a tag (Kabisa Tags & Operations). Writes through the Tags API
 *  (lib/console/tags.ts); a create or scope change syncs the token to CitrineOS
 *  server-side so the charger's local-auth list reflects it. The token (idToken)
 *  is immutable once created. Shell mirrors ManageAccessModal. */
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { useAllOrgOperators } from '@/lib/console/operators';
import { useOrgMembers } from '@/lib/console/team';
import { useOrgStations } from '@/lib/console/stations';
import {
  useCreateTag,
  useUpdateTag,
  tagWriteError,
  TAG_TYPES,
  type ConsoleTag,
  type TagWritePayload,
  type TagType,
  type RtaMode,
} from '@/lib/console/tags';

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--surface2, var(--surface))',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md, 8px)',
  color: 'var(--text1, inherit)',
};

export function TagFormModal({
  orgId,
  mode,
  tag,
  defaultAssigneeUserId,
  onClose,
  onCreated,
}: Readonly<{
  orgId: string;
  mode: 'create' | 'edit';
  tag?: ConsoleTag | null;
  /** Pre-select an assignee on create (e.g. opened from an operator's page). */
  defaultAssigneeUserId?: string | null;
  onClose: () => void;
  onCreated?: (tag: ConsoleTag) => void;
}>) {
  const create = useCreateTag();
  const update = useUpdateTag(tag?.id ?? '');
  const saving = create.isPending || update.isPending;

  const { operators, isLoadingAll: opsLoading } = useAllOrgOperators(orgId, { status: 'active' });
  const membersQ = useOrgMembers(orgId);
  const members = membersQ.data?.members ?? [];
  const stations = useOrgStations(orgId);
  const chargers = useMemo(
    () =>
      (stations.data?.stations ?? [])
        .map((s) => ({ id: s.chargerId, name: s.chargerName ?? s.chargerId }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [stations.data],
  );

  const [idToken, setIdToken] = useState(tag?.idToken ?? '');
  const [label, setLabel] = useState(tag?.label ?? '');
  // Assignment mirrors the plan's segmented model: Operator | Team member | Unassigned.
  type AssigneeMode = 'operator' | 'member' | 'unassigned';
  const initialMode: AssigneeMode = tag?.assignee
    ? tag.assignee.kind === 'member' ? 'member' : 'operator'
    : defaultAssigneeUserId ? 'operator' : 'unassigned';
  const [assigneeMode, setAssigneeMode] = useState<AssigneeMode>(initialMode);
  const [assigneeId, setAssigneeId] = useState<string | null>(tag?.assignee?.id ?? defaultAssigneeUserId ?? null);
  const pickMode = (m: AssigneeMode) => {
    setAssigneeMode(m);
    if (m === 'unassigned') setAssigneeId(null);
  };
  const [scopeAll, setScopeAll] = useState<boolean>(tag ? tag.scope === 'all' : true);
  const [chargerIds, setChargerIds] = useState<string[]>(tag?.scopeChargerIds ?? []);
  const [expiresAt, setExpiresAt] = useState<string>(tag?.expiresAt ? tag.expiresAt.slice(0, 10) : '');

  // CitrineOS Authorization fields. Type is immutable after create (it's part of
  // the upsert key). Real-time auth defaults to 'Never' — every managed tag is
  // verified with the backend per charge, so an operator who's checked out is
  // refused. 'Allowed' (trust the cache, never call us) isn't offered here.
  const [idTokenType, setIdTokenType] = useState<TagType>((tag?.idTokenType as TagType) ?? 'ISO14443');
  // Keep the tag's real mode as-is, including 'Allowed' (set in CitrineOS) which
  // the segmented control below can't represent. We only send realTimeAuth when
  // it actually changes (below), so editing an unrelated field never silently
  // rewrites an externally-set 'Allowed' tag to 'Never'.
  const initialRta: RtaMode = (tag?.realTimeAuth as RtaMode) ?? 'Never';
  const [realTimeAuth, setRealTimeAuth] = useState<RtaMode>(initialRta);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [chargingPriority, setChargingPriority] = useState<string>(
    tag?.chargingPriority != null ? String(tag.chargingPriority) : '',
  );
  const [concurrentTransaction, setConcurrentTransaction] = useState<boolean>(tag?.concurrentTransaction ?? false);
  const [parentIdToken, setParentIdToken] = useState<string>(tag?.parentIdToken ?? '');
  const [language1, setLanguage1] = useState<string>(tag?.language1 ?? '');
  const [language2, setLanguage2] = useState<string>(tag?.language2 ?? '');

  const canSave = mode === 'edit' || idToken.trim().length > 0;

  const toggleCharger = (id: string) =>
    setChargerIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const submit = () => {
    if (!canSave || saving) return;
    const priority = chargingPriority.trim() === '' ? null : Number(chargingPriority);
    const payload: TagWritePayload = {
      ...(mode === 'create' ? { idToken: idToken.trim(), idTokenType } : {}),
      label: label.trim() || null,
      assigneeUserId: assigneeMode === 'unassigned' ? null : assigneeId || null,
      scopeAll,
      chargerIds: scopeAll ? [] : chargerIds,
      expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00Z`).toISOString() : null,
      // Only send when set on create or actually changed — omitting it lets the
      // backend preserve the existing mode (e.g. an externally-set 'Allowed').
      ...(mode === 'create' || realTimeAuth !== initialRta ? { realTimeAuth } : {}),
      chargingPriority: priority != null && Number.isFinite(priority) ? priority : null,
      concurrentTransaction,
      parentIdToken: parentIdToken.trim() || null,
      language1: language1.trim() || null,
      language2: language2.trim() || null,
    };
    const onError = (err: unknown) =>
      toast.error(tagWriteError(err, mode === 'create' ? 'Could not create the tag' : 'Could not save the tag'));

    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: (created) => {
          toast.success('Tag created');
          // Close before navigating — onCreated may unmount this modal, so a
          // post-navigation setState here would land on an unmounted component.
          onClose();
          onCreated?.(created);
        },
        onError,
      });
    } else {
      update.mutate(payload, {
        onSuccess: () => {
          toast.success('Tag updated');
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <ModalShell onClose={onClose} closeDisabled={saving}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>{mode === 'create' ? 'Add tag' : 'Edit tag'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
            An ID token (RFID card or app token) assigned to an operator and scoped to the chargers it may start.
          </div>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="tag-idtoken">Tag ID (ID token)</label>
            <input
              id="tag-idtoken"
              style={{ ...inputStyle, opacity: mode === 'edit' ? 0.6 : 1 }}
              value={idToken}
              onChange={(e) => setIdToken(e.target.value)}
              placeholder="e.g. 0000020755112643"
              disabled={mode === 'edit'}
              autoFocus={mode === 'create'}
            />
            {mode === 'edit' ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>The token can&apos;t be changed after creation.</div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="tag-label">Label</label>
            <input id="tag-label" style={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Night-shift card #4" />
          </div>

          <div>
            <label style={labelStyle} htmlFor="tag-type">Tag type</label>
            <select
              id="tag-type"
              style={{ ...inputStyle, opacity: mode === 'edit' ? 0.6 : 1 }}
              value={idTokenType}
              onChange={(e) => setIdTokenType(e.target.value as TagType)}
              disabled={mode === 'edit'}
            >
              {TAG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {mode === 'edit'
                ? "The type can't be changed after creation."
                : 'RFID cards are usually ISO14443. Use KeyCode for typed PINs.'}
            </div>
          </div>

          <div>
            <span style={labelStyle}>Real-time authorization</span>
            <div
              style={{
                display: 'inline-flex', padding: 3, gap: 2, marginBottom: 8,
                background: 'var(--surface2, rgba(0,0,0,0.04))', border: '1px solid var(--border)', borderRadius: 'var(--r-md, 8px)',
              }}
            >
              {([['Never', 'Always verify'], ['AllowedOffline', 'Allow if offline']] as const).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRealTimeAuth(m)}
                  style={{
                    padding: '5px 12px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: realTimeAuth === m ? 'var(--surface)' : 'transparent',
                    color: realTimeAuth === m ? 'var(--text1, inherit)' : 'var(--text3)',
                    boxShadow: realTimeAuth === m ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.08))' : 'none',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {realTimeAuth === 'Never'
                ? 'The charger checks with us on every charge — a checked-out operator or blocked tag is refused. If we’re unreachable, charging is denied.'
                : realTimeAuth === 'AllowedOffline'
                ? 'Same live check, but charging is still allowed if our backend can’t be reached.'
                : 'Cached-only (set in CitrineOS): the charger trusts the stored status and never checks with us. Pick an option above to enable live checks.'}
            </div>
          </div>

          <div>
            <span style={labelStyle}>Assigned to</span>
            <div
              style={{
                display: 'inline-flex', padding: 3, gap: 2, marginBottom: 10,
                background: 'var(--surface2, rgba(0,0,0,0.04))', border: '1px solid var(--border)', borderRadius: 'var(--r-md, 8px)',
              }}
            >
              {([['operator', 'Operator'], ['member', 'Team member'], ['unassigned', 'Unassigned']] as const).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMode(m)}
                  style={{
                    padding: '5px 12px', fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: assigneeMode === m ? 'var(--surface)' : 'transparent',
                    color: assigneeMode === m ? 'var(--text1, inherit)' : 'var(--text3)',
                    boxShadow: assigneeMode === m ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.08))' : 'none',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            {assigneeMode === 'operator' ? (
              <select style={inputStyle} value={assigneeId ?? ''} onChange={(e) => setAssigneeId(e.target.value || null)}>
                <option value="">Select an operator…</option>
                {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : assigneeMode === 'member' ? (
              <select style={inputStyle} value={assigneeId ?? ''} onChange={(e) => setAssigneeId(e.target.value || null)}>
                <option value="">Select a team member…</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Anyone can use this tag where it&apos;s scoped.</div>
            )}
            {(assigneeMode === 'operator' && opsLoading) || (assigneeMode === 'member' && membersQ.isPending) ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Loading…</div>
            ) : null}
          </div>

          <div>
            <span style={labelStyle}>Where it works</span>
            <div style={{ display: 'flex', gap: 16, marginBottom: scopeAll ? 0 : 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="tag-scope" checked={scopeAll} onChange={() => setScopeAll(true)} />
                All sites
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="tag-scope" checked={!scopeAll} onChange={() => setScopeAll(false)} />
                Specific chargers
              </label>
            </div>
            {!scopeAll ? (
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md, 8px)', padding: 8 }}>
                {chargers.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text3)', padding: 6 }}>
                    {stations.isPending ? 'Loading chargers…' : 'No chargers in this organization.'}
                  </div>
                ) : (
                  chargers.map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={chargerIds.includes(c.id)} onChange={() => toggleCharger(c.id)} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
            {!scopeAll && chargerIds.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--warn, #b45309)', marginTop: 6 }}>
                No chargers selected — this tag won&apos;t authorize anywhere until you pick at least one.
              </div>
            ) : null}
          </div>

          <div>
            <label style={labelStyle} htmlFor="tag-expiry">Expires</label>
            <input id="tag-expiry" type="date" style={inputStyle} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Leave blank for no expiry.</div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text2, var(--text3))', fontSize: 12.5, fontWeight: 600,
              }}
            >
              <span style={{ display: 'inline-block', transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
              Advanced
            </button>
            {advancedOpen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="tag-priority">Charging priority</label>
                  <input
                    id="tag-priority"
                    type="number"
                    style={inputStyle}
                    value={chargingPriority}
                    onChange={(e) => setChargingPriority(e.target.value)}
                    placeholder="e.g. 0"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Higher priority charges first when power is limited. Leave blank for default.</div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={concurrentTransaction} onChange={(e) => setConcurrentTransaction(e.target.checked)} />
                  Allow concurrent transactions (charge at more than one station at once)
                </label>

                <div>
                  <label style={labelStyle} htmlFor="tag-parent">Parent tag (ID token)</label>
                  <input
                    id="tag-parent"
                    style={inputStyle}
                    value={parentIdToken}
                    onChange={(e) => setParentIdToken(e.target.value)}
                    placeholder="Group / master token"
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle} htmlFor="tag-lang1">Language</label>
                    <input id="tag-lang1" style={inputStyle} value={language1} onChange={(e) => setLanguage1(e.target.value)} maxLength={8} placeholder="e.g. en" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle} htmlFor="tag-lang2">Fallback language</label>
                    <input id="tag-lang2" style={inputStyle} value={language2} onChange={(e) => setLanguage2(e.target.value)} maxLength={8} placeholder="e.g. fr" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" size="sm" onClick={submit} disabled={!canSave || saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create tag' : 'Save changes'}
          </Btn>
        </div>
    </ModalShell>
  );
}
