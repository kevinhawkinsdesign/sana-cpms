'use client';

/** User drill-in (KAB-173). Renders from the directory row (works for blocked
 *  users too — GET /users/:id 404s when isActive is false) and enriches with
 *  sessions / vehicles / businesses / payment methods / org memberships for
 *  active users. A user can belong to several organizations — each one links
 *  to its org detail page. */
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Badge, Btn } from '@/components/console/ui';
import { ModalShell } from '@/components/console/ModalShell';
import { UserMembershipsSection, type AccessTarget } from '@/components/console/platformAdmin/UserMembershipsSection';
import {
  useUserDetail,
  useUpdateUser,
  useVerifyUser,
  useSetUserBlocked,
  type User,
} from '@/lib/console/platformAdmin';

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  OPERATOR: 'Operator',
  ORGANIZATION_ADMIN: 'Org Admin',
  ADMIN: 'Admin',
};

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{children}</span>
    </div>
  );
}

function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '14px 0 4px' }}>
      {children}
    </div>
  );
}

function userName(u: User): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || '—';
}

export function UserDetailDrawer({
  user,
  onClose,
  onEdit,
  onManageAccess,
}: Readonly<{ user: User; onClose: () => void; onEdit?: () => void; onManageAccess: (target: AccessTarget) => void }>) {
  const params = useParams<{ country: string }>();
  const router = useRouter();
  const { data: detail } = useUserDetail(user.isActive ? user.id : null);
  const updateUserM = useUpdateUser();
  const verifyM = useVerifyUser();
  const blockM = useSetUserBlocked();
  const busy = updateUserM.isPending || verifyM.isPending || blockM.isPending;

  const vehicles = detail?.vehicles ?? [];
  const businesses = detail?.businesses ?? [];

  const openOrg = (orgId: string) => {
    onClose();
    router.push(`/${params.country}/console/settings/organizations/${orgId}`);
  };

  return (
    <ModalShell onClose={onClose} width={520}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <Avatar name={userName(user)} size={40} />
          <div className="min-w-0">
            <div style={{ fontSize: 15, fontWeight: 650 }}>{userName(user)}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge kind="info">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              {user.isActive ? <Badge kind="ok">active</Badge> : <Badge kind="err">blocked</Badge>}
              {user.isVerified ? <Badge kind="ok">verified</Badge> : <Badge kind="neutral">unverified</Badge>}
              {user.isTrainee && <Badge kind="warn">trainee</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1 }}>
        <InfoRow label="Email">{user.email || '—'}</InfoRow>
        <InfoRow label="Phone"><span className="mono">{user.phone || '—'}</span></InfoRow>
        <InfoRow label="Joined">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</InfoRow>
        {user.operatorAirtableId && <InfoRow label="Airtable ID"><span className="mono">{user.operatorAirtableId}</span></InfoRow>}

        <SectionTitle>Organizations</SectionTitle>
        <UserMembershipsSection user={user} editable={user.isActive} onOpenOrg={openOrg} onManageAccess={onManageAccess} />

        {user.isActive && detail && (
          <>
            <SectionTitle>Account</SectionTitle>
            <InfoRow label="Active sessions">{detail.activeSessions?.length ?? 0}</InfoRow>
            <InfoRow label="Payment methods">{detail.paymentMethods?.length ?? 0}</InfoRow>
            {vehicles.length > 0 && (
              <>
                <SectionTitle>Vehicles</SectionTitle>
                {vehicles.map(({ vehicle }) => (
                  <InfoRow key={vehicle.id} label={vehicle.kabisaId ?? '—'}>
                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'}
                  </InfoRow>
                ))}
              </>
            )}
            {businesses.length > 0 && (
              <>
                <SectionTitle>Businesses</SectionTitle>
                {businesses.map(({ business }) => (
                  <InfoRow key={business.id} label={business.tin ? `TIN ${business.tin}` : 'Business'}>{business.name}</InfoRow>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onEdit && user.isActive && (
          <Btn size="sm" variant="ghost" icon="sliders" onClick={onEdit}>Edit</Btn>
        )}
        {!user.isVerified && user.isActive && (
          <Btn size="sm" variant="ghost" disabled={busy} onClick={() => verifyM.mutate(user.id)}>Verify</Btn>
        )}
        {user.role === 'OPERATOR' && user.isActive && (
          <>
            <Btn size="sm" variant={user.isTrainee ? 'secondary' : 'ghost'} disabled={busy} onClick={() => updateUserM.mutate({ id: user.id, data: { isTrainee: !user.isTrainee } })}>
              Trainee
            </Btn>
            <Btn size="sm" variant={user.autofillEnabled ? 'secondary' : 'ghost'} disabled={busy} onClick={() => updateUserM.mutate({ id: user.id, data: { autofillEnabled: !user.autofillEnabled } })}>
              Autofill
            </Btn>
          </>
        )}
        <Btn
          size="sm"
          variant={user.isActive ? 'danger' : 'primary'}
          loading={blockM.isPending}
          onClick={() => blockM.mutate({ id: user.id, blocked: user.isActive })}
        >
          {user.isActive ? 'Block' : 'Unblock'}
        </Btn>
      </div>
    </ModalShell>
  );
}
