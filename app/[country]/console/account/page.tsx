'use client';

/** Account → Profile. View identity + edit personal info (first/last name,
 *  email, phone). Reuses AuthContext.updateUser (PUT /api/user/profile), which
 *  persists, merges the result into auth state and toasts — so the whole app
 *  (top-bar avatar, greeting) reflects the change immediately. Read-only facts
 *  (role, account type, member since, verification) come from the auth user and
 *  the active-org membership. */
import React, { useEffect, useState } from 'react';
import { Avatar, Badge, Btn, Card } from '@/components/console/ui';
import { Field, Row, inputStyle } from '@/components/console/form';
import { useAuth } from '@/lib/auth/authContext';
import { UserRole } from '@/lib/utils/roleRedirect';
import { useOrgs } from '@/lib/console/orgs';
import { roleBadgeKind, roleLabel, type OrgRole } from '@/lib/console/team';
import { fmtSessionTime } from '@/lib/console/account';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function toForm(user: { firstName?: string; lastName?: string; email?: string; phone?: string } | null): ProfileForm {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  };
}

const PROFILE_KEYS: (keyof ProfileForm)[] = ['firstName', 'lastName', 'email', 'phone'];

export default function AccountProfilePage() {
  const { user, updateUser } = useAuth();
  const { data: orgs } = useOrgs();
  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [saved, setSaved] = useState<ProfileForm>(() => toForm(user));
  const [saving, setSaving] = useState(false);

  // Re-sync the form + baseline only when the signed-in identity changes
  // (initial load / account switch). Keying on the whole `user` object would
  // also fire on unrelated updates to the same user — including the merge after
  // our own save — and silently overwrite in-progress edits.
  useEffect(() => {
    const next = toForm(user);
    setForm(next);
    setSaved(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fields that differ from the saved baseline (trimmed) — drives both the
  // dirty flag and the update payload, so they can never disagree.
  const changed = PROFILE_KEYS.reduce<Partial<ProfileForm>>(
    (acc, k) => (form[k].trim() !== saved[k].trim() ? { ...acc, [k]: form[k].trim() } : acc),
    {},
  );
  const dirty = Object.keys(changed).length > 0;
  const canSave = dirty && form.firstName.trim().length > 0 && !saving;

  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // BE checks email/phone uniqueness and rejects an operator clearing their
      // phone — only send what changed.
      const updated = await updateUser(changed);
      // Adopt the server-confirmed user (normalized email/phone, trimmed names)
      // as both the form and the baseline, so dirty reflects the persisted
      // state — not the raw input. Inputs are disabled during the save, so this
      // can't clobber an in-flight edit.
      if (updated) {
        const next = toForm(updated);
        setForm(next);
        setSaved(next);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <span className="kc-skeleton block h-[320px] max-w-xl rounded-xl" />;
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Your account';
  const orgRole = orgs?.activeOrg?.role ?? null;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={name} size={56} />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-gray-800 dark:text-white/90">{name}</div>
            {user.email && <div className="truncate text-sm text-gray-500 dark:text-gray-400">{user.email}</div>}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {orgRole && <Badge kind={roleBadgeKind(orgRole as OrgRole)}>{roleLabel(orgRole as OrgRole)}</Badge>}
              {user.isVerified ? (
                <Badge kind="ok" dot>Verified</Badge>
              ) : (
                <Badge kind="warn" dot>Unverified</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Personal information">
        <Field label="First name">
          <input value={form.firstName} onChange={set('firstName')} disabled={saving} style={inputStyle} placeholder="First name" />
        </Field>
        <Field label="Last name">
          <input value={form.lastName} onChange={set('lastName')} disabled={saving} style={inputStyle} placeholder="Last name" />
        </Field>
        <Field label="Email" hint="Used to sign in and for account notifications.">
          <input value={form.email} onChange={set('email')} disabled={saving} type="email" style={inputStyle} placeholder="you@example.com" />
        </Field>
        <Field label="Phone" hint="Operators must keep a phone number on file.">
          <input value={form.phone} onChange={set('phone')} disabled={saving} type="tel" style={inputStyle} placeholder="+250…" />
        </Field>
        <Btn variant="primary" size="sm" disabled={!canSave} loading={saving} onClick={onSave}>
          Save changes
        </Btn>
      </Card>

      <Card title="Account details">
        <div className="space-y-3">
          {/* "Account type" is the customer membership tier (Guest / Kabisa
              member / owner) — only meaningful for customers, not org staff. */}
          {user.role === UserRole.CUSTOMER && <Row label="Account type">{user.userType}</Row>}
          {orgs?.activeOrg && orgRole && (
            <Row label="Organization role">{roleLabel(orgRole as OrgRole)}</Row>
          )}
          {user.organization?.name && <Row label="Organization">{user.organization.name}</Row>}
          <Row label="Member since">{fmtSessionTime(user.createdAt)}</Row>
          <Row label="Last sign-in">{fmtSessionTime(user.lastLoginAt)}</Row>
        </div>
      </Card>
    </div>
  );
}
