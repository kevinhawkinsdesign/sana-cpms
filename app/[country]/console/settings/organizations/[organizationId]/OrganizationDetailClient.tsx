'use client';

/** Platform · Organization detail (KAB-163 / KAB-97 core): one org via the new
 *  /api/admin/platform/organizations/:id API. Platform admins can suspend /
 *  reactivate and edit the platform fee (both audit-logged server-side). */
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Btn, Card, PageHead, SummaryStrip } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { ClickableImage } from '@/components/console/ImageLightbox';
import { OrgFormModal } from '@/components/console/platformAdmin/OrgFormModal';
import { inputStyle } from '@/components/console/form';
import { fmtNumber } from '@/lib/console/dashboard';
import { useOrgs, useSwitchOrg } from '@/lib/console/orgs';
import {
  usePlatformOrg,
  useSuspendOrg,
  useSetPlatformFee,
  useArchiveOrg,
  useSetParentFlag,
} from '@/lib/console/platformAdmin';

function InfoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-right text-gray-800 dark:text-white/90">{children}</span>
    </div>
  );
}

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge kind="ok">active</Badge>;
  if (status === 'SUSPENDED') return <Badge kind="err">suspended</Badge>;
  return <Badge kind="warn">{status.toLowerCase().replaceAll('_', ' ')}</Badge>;
}

export default function ConsoleAdminOrgDetailPage() {
  const params = useParams<{ country: string; organizationId: string }>();
  const router = useRouter();
  const base = `/${params.country}/console`;
  const id = params.organizationId;

  const { data: org, isPending, isError, refetch } = usePlatformOrg(id);
  const suspendOrg = useSuspendOrg();
  const setFee = useSetPlatformFee();
  const archiveOrg = useArchiveOrg();
  const setParentFlag = useSetParentFlag();
  const { data: orgsData } = useOrgs();
  const switchOrg = useSwitchOrg();

  // Chargers/Sessions live on org-scoped pages: act as this org (the same
  // token swap the OrgSwitcher does), then land on the page.
  const goAsOrg = (path: string) => {
    if (orgsData?.activeOrgId === id) {
      router.push(`${base}${path}`);
    } else {
      switchOrg.mutate(id, { onSuccess: () => router.push(`${base}${path}`) });
    }
  };

  const [confirmSuspend, setConfirmSuspend] = React.useState(false);
  const [confirmArchive, setConfirmArchive] = React.useState(false);
  const [confirmParentFlag, setConfirmParentFlag] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [feeInput, setFeeInput] = React.useState('');
  // `feeTouched` gates Save until the user actually edits — otherwise the brief
  // window between the org loading and the sync effect below briefly enables
  // Save while feeInput is still '' (which would submit null and clear the fee).
  const [feeTouched, setFeeTouched] = React.useState(false);
  React.useEffect(() => {
    setFeeInput(org?.platformFeePercent != null ? String(org.platformFeePercent) : '');
    setFeeTouched(false);
  }, [org?.platformFeePercent]);

  const head = (extra?: React.ReactNode) => (
    <PageHead
      title={
        org?.logo ? (
          <span className="flex items-center gap-3">
            <ClickableImage
              src={org.logo}
              title={`${org.name} logo`}
              className="h-9 w-9 rounded-full border border-[var(--border)] bg-white object-cover"
            />
            {org.name}
          </span>
        ) : (
          org?.name ?? 'Organization'
        )
      }
      crumb={<>Organizations</>}
      back
      onBack={() => router.push(`${base}/settings/organizations`)}
      actions={extra}
    />
  );

  if (isPending) {
    return <div className="space-y-6">{head()}<span className="kc-skeleton block" style={{ height: 90 }} /><span className="kc-skeleton block" style={{ height: 220 }} /></div>;
  }
  if (isError || !org) {
    return (
      <div className="space-y-6">
        {head()}
        <Card>
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Couldn&apos;t load this organization.
            <div className="mt-3"><Btn size="sm" onClick={() => refetch()}>Retry</Btn></div>
          </div>
        </Card>
      </div>
    );
  }

  const isSuspended = org.status === 'SUSPENDED';
  const feeValue = feeInput.trim() === '' ? null : Number(feeInput);
  const feeDirty = (org.platformFeePercent ?? null) !== feeValue;
  const feeInvalid = feeValue != null && (Number.isNaN(feeValue) || feeValue < 0 || feeValue > 100);

  const action = (
    <div className="flex items-center gap-2">
      <Btn size="sm" variant="ghost" icon="sliders" onClick={() => setEditing(true)}>
        Edit
      </Btn>
      {isSuspended ? (
        <Btn size="sm" variant="primary" loading={suspendOrg.isPending} onClick={() => suspendOrg.mutate({ id, suspend: false })}>
          Reactivate
        </Btn>
      ) : (
        <Btn size="sm" variant="danger" icon="x" disabled={org.isParentOrganization} onClick={() => setConfirmSuspend(true)}>
          Suspend
        </Btn>
      )}
      <Btn size="sm" variant="ghost" icon="trash" disabled={org.isParentOrganization} onClick={() => setConfirmArchive(true)}>
        Archive
      </Btn>
    </div>
  );

  return (
    <div className="space-y-6">
      {head(action)}

      <SummaryStrip
        items={[
          {
            label: 'Members',
            value: fmtNumber(org._count.users),
            onClick: () => router.push(`${base}/settings/users?org=${encodeURIComponent(org.name)}`),
          },
          {
            label: 'Chargers',
            value: fmtNumber(org._count.chargers),
            delta: orgsData?.activeOrgId !== id ? 'switches org' : undefined,
            onClick: () => goAsOrg('/stations'),
          },
          {
            label: 'Sessions',
            value: fmtNumber(org._count.chargingSessions),
            delta: orgsData?.activeOrgId !== id ? 'switches org' : undefined,
            onClick: () => goAsOrg('/sessions'),
          },
          {
            label: 'Sub-orgs',
            value: fmtNumber(org._count.subOrgs),
            onClick: () => router.push(`${base}/settings/organizations?parent=${id}`),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Organization" pad={false}>
          <div className="px-5 py-3">
            <InfoRow label="Status">{statusBadge(org.status)}</InfoRow>
            <InfoRow label="Plan"><span className="capitalize">{org.plan.toLowerCase()}</span></InfoRow>
            <InfoRow label="Country">{org.country?.name ?? '—'}</InfoRow>
            <InfoRow label="Parent org">{org.parentOrg?.name ?? '—'}</InfoRow>
            <InfoRow label="TIN"><span className="mono">{org.tin || '—'}</span></InfoRow>
            <InfoRow label="Citrine tenant"><span className="mono">{org.citrineTenantId ?? '—'}</span></InfoRow>
            <InfoRow label="Platform org">
              <span className="inline-flex items-center gap-2">
                {org.isParentOrganization ? <Badge kind="info">yes</Badge> : '—'}
                <Btn size="sm" variant="ghost" loading={setParentFlag.isPending} onClick={() => setConfirmParentFlag(true)}>
                  {org.isParentOrganization ? 'Revoke' : 'Grant'}
                </Btn>
              </span>
            </InfoRow>
          </div>
        </Card>

        <Card title="Platform fee" pad={false}>
          <div className="px-5 py-4">
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Revenue-share fee. Leave blank to inherit the parent / platform default.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={feeInput}
                onChange={(e) => { setFeeInput(e.target.value); setFeeTouched(true); }}
                placeholder="—"
                style={{ ...inputStyle, width: 120 }}
              />
              <span className="text-sm text-[var(--text3)]">%</span>
              <Btn
                size="sm"
                loading={setFee.isPending}
                disabled={!feeTouched || !feeDirty || feeInvalid}
                onClick={() => setFee.mutate({ id, platformFeePercent: feeValue })}
              >
                Save
              </Btn>
            </div>
            {feeInvalid && <p className="mt-2 text-xs text-[#c0392b] dark:text-[#f0998a]">Enter a value between 0 and 100.</p>}
          </div>
        </Card>
      </div>

      {confirmSuspend && (
        <ConfirmDialog
          title="Suspend organization?"
          body={<>Suspending <strong>{org.name}</strong> blocks its access until reactivated.</>}
          confirmLabel="Suspend"
          pending={suspendOrg.isPending}
          onCancel={() => setConfirmSuspend(false)}
          onConfirm={() => suspendOrg.mutate({ id, suspend: true }, { onSettled: () => setConfirmSuspend(false) })}
        />
      )}

      {confirmArchive && (
        <ConfirmDialog
          title="Archive organization?"
          body={
            <>
              Archiving removes <strong>{org.name}</strong> from the platform. Only an empty organization — no
              chargers, members or sub-organizations — can be archived; suspend it instead to cut off access.
            </>
          }
          confirmLabel="Archive"
          pending={archiveOrg.isPending}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={() =>
            archiveOrg.mutate(id, {
              onSuccess: () => router.push(`${base}/settings/organizations`),
              onSettled: () => setConfirmArchive(false),
            })
          }
        />
      )}

      {confirmParentFlag && (
        <ConfirmDialog
          title={org.isParentOrganization ? 'Revoke platform-admin access?' : 'Grant platform-admin access?'}
          body={
            org.isParentOrganization ? (
              <>
                Owners and admins of <strong>{org.name}</strong> will lose cross-organization platform access.
                Revoking the last platform organization locks everyone out of this console.
              </>
            ) : (
              <>
                Owners and admins of <strong>{org.name}</strong> will get FULL cross-organization platform access —
                every organization, user and fleet on the platform.
              </>
            )
          }
          confirmLabel={org.isParentOrganization ? 'Revoke' : 'Grant'}
          pending={setParentFlag.isPending}
          onCancel={() => setConfirmParentFlag(false)}
          onConfirm={() =>
            setParentFlag.mutate(
              { id, isParentOrganization: !org.isParentOrganization },
              { onSettled: () => setConfirmParentFlag(false) },
            )
          }
        />
      )}

      {editing && <OrgFormModal mode="edit" org={org} onClose={() => setEditing(false)} />}
    </div>
  );
}
