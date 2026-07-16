'use client';

/** Create / full-edit a platform user (KAB-173) via /api/admin/users — name,
 *  contact (email and/or phone), role, user type, organization, verification
 *  and the operator flags (trainee / autofill / Airtable ID). */
import React from 'react';
import { Btn, Select } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { inputStyle } from '@/components/console/form';
import { UserOrgEditor } from '@/components/console/platformAdmin/UserOrgEditor';
import {
  entityOptions,
  useCreateUser,
  useUpdateUser,
  usePlatformOrgs,
  type User,
  type UserCreateData,
  type UserUpdateData,
} from '@/lib/console/platformAdmin';

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  marginBottom: 6,
  display: 'block',
};

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  OPERATOR: 'Operator',
  ORGANIZATION_ADMIN: 'Org Admin',
  ADMIN: 'Admin',
};
const LABEL_TO_ROLE = Object.fromEntries(Object.entries(ROLE_LABELS).map(([k, v]) => [v, k]));

const USER_TYPE_LABELS: Record<string, string> = {
  GUEST: 'Guest',
  KABISA_MEMBER: 'Kabisa member',
  KABISA_OWNER: 'Kabisa owner',
};
const LABEL_TO_USER_TYPE = Object.fromEntries(Object.entries(USER_TYPE_LABELS).map(([k, v]) => [v, k]));

const NO_ORG = 'No organization';
const YES_NO = ['Yes', 'No'];

export function UserFormModal({
  mode = 'create',
  user,
  onClose,
}: Readonly<{ mode?: 'create' | 'edit'; user?: User | null; onClose: () => void }>) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const { data: orgsPage, isPending: orgsLoading } = usePlatformOrgs({ page: 1, limit: 100 });
  const pending = create.isPending || update.isPending;

  const [firstName, setFirstName] = React.useState(user?.firstName ?? '');
  const [lastName, setLastName] = React.useState(user?.lastName ?? '');
  const [email, setEmail] = React.useState(user?.email ?? '');
  const [phone, setPhone] = React.useState(user?.phone ?? '');
  const [roleLabel, setRoleLabel] = React.useState(ROLE_LABELS[user?.role ?? 'CUSTOMER'] ?? 'Customer');
  const [userTypeLabel, setUserTypeLabel] = React.useState(USER_TYPE_LABELS[user?.userType ?? 'GUEST'] ?? 'Guest');
  const [verified, setVerified] = React.useState(user?.isVerified ? 'Yes' : 'No');
  const [trainee, setTrainee] = React.useState(user?.isTrainee ? 'Yes' : 'No');
  const [autofill, setAutofill] = React.useState(user?.autofillEnabled ? 'Yes' : 'No');
  const [airtableId, setAirtableId] = React.useState(user?.operatorAirtableId ?? '');
  const [orgLabel, setOrgLabel] = React.useState(NO_ORG);

  // Id-backed select: the label resolves through entityOptions, never by name.
  const orgSel = React.useMemo(() => entityOptions(orgsPage?.organizations ?? [], NO_ORG), [orgsPage]);
  // The org list loads async — derive the edit prefill by id once it arrives,
  // unless the user already picked something.
  const [orgTouched, setOrgTouched] = React.useState(false);
  React.useEffect(() => {
    if (!orgTouched) setOrgLabel(orgSel.labelForId(user?.organizationId));
  }, [orgTouched, orgSel, user?.organizationId]);

  const isOperator = LABEL_TO_ROLE[roleLabel] === 'OPERATOR';
  const hasContact = email.trim().length > 0 || phone.trim().length > 0;
  // Saving before the org list loads would resolve the still-default org label
  // to null and silently clear the user's organization.
  // Only create gates on the org list: it resolves the single org select's
  // label → id, and saving before it loads would clear the organization. Edit
  // no longer sends organizationId (memberships are managed separately).
  const canSave =
    firstName.trim().length > 0 && lastName.trim().length > 0 && hasContact && !pending && (mode === 'edit' || !orgsLoading);

  const submit = () => {
    if (!canSave) return;
    if (mode === 'create') {
      const data: UserCreateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: LABEL_TO_ROLE[roleLabel],
        userType: LABEL_TO_USER_TYPE[userTypeLabel],
        organizationId: orgSel.idFor(orgLabel),
        isVerified: verified === 'Yes',
      };
      create.mutate(data, { onSuccess: () => onClose() });
    } else if (user) {
      // Organization membership is managed inline by UserOrgEditor (applies
      // immediately), so it's intentionally not part of this profile save.
      const data: UserUpdateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // The API can set but not clear contacts — omit when emptied.
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: LABEL_TO_ROLE[roleLabel],
        userType: LABEL_TO_USER_TYPE[userTypeLabel],
        isVerified: verified === 'Yes',
        ...(isOperator && {
          isTrainee: trainee === 'Yes',
          autofillEnabled: autofill === 'Yes',
          operatorAirtableId: airtableId.trim() || undefined,
        }),
      };
      update.mutate({ id: user.id, data }, { onSuccess: () => onClose() });
    }
  };

  return (
    <ModalShell onClose={onClose} closeDisabled={pending} width={520}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{mode === 'create' ? 'New user' : 'Edit user'}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
          {mode === 'create'
            ? 'Needs at least one contact — email or phone — to sign in.'
            : 'Full profile and access edit. Changes apply immediately.'}
        </div>
      </div>

      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-first">First name</label>
            <input id="u-first" style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus={mode === 'create'} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-last">Last name</label>
            <input id="u-last" style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-email">Email</label>
            <input id="u-email" type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} htmlFor="u-phone">Phone</label>
            <input id="u-phone" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2507…" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>Role</span>
            <Select options={Object.values(ROLE_LABELS)} value={roleLabel} onChange={setRoleLabel} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>User type</span>
            <Select options={Object.values(USER_TYPE_LABELS)} value={userTypeLabel} onChange={setUserTypeLabel} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {mode === 'create' && (
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Organization</span>
              <Select
                options={orgSel.labels}
                value={orgLabel}
                onChange={(v) => { setOrgTouched(true); setOrgLabel(v); }}
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>Verified</span>
            <Select options={YES_NO} value={verified} onChange={setVerified} style={{ width: '100%' }} />
          </div>
        </div>
        {mode === 'edit' && user && (
          <div>
            <span style={labelStyle}>Organizations</span>
            <div style={{ marginTop: 2 }}>
              <UserOrgEditor user={user} editable={user.isActive} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '8px 0 0' }}>
              New members join as Viewer — set their role in the organization&apos;s Team settings. Changes apply immediately.
            </p>
          </div>
        )}
        {mode === 'edit' && isOperator && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>Trainee</span>
                <Select options={YES_NO} value={trainee} onChange={setTrainee} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>Autofill</span>
                <Select options={YES_NO} value={autofill} onChange={setAutofill} style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle} htmlFor="u-airtable">Operator Airtable ID</label>
              <input id="u-airtable" style={inputStyle} value={airtableId} onChange={(e) => setAirtableId(e.target.value)} placeholder="rec…" />
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={pending}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={submit} disabled={!canSave}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
        </Btn>
      </div>
    </ModalShell>
  );
}
