'use client';

/** Account → Sessions. The devices where this user is currently signed in
 *  (GET /api/auth/sessions). Non-current devices can be revoked one at a time
 *  or multi-selected and signed out in bulk. The current device is flagged and
 *  can't be revoked here — use the top-bar Log out for that, so the app can
 *  clear local auth and redirect cleanly. */
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Btn, Card, Icon } from '@/components/console/ui';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import {
  fmtSessionTime,
  useSessions,
  useTerminateSession,
  useTerminateSessions,
  type UserSession,
} from '@/lib/console/account';

const CHECKBOX_CLASS = 'h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500/10';

function SessionRow({
  session,
  selected,
  onToggle,
  onRevoke,
}: Readonly<{
  session: UserSession;
  selected: boolean;
  onToggle: (id: string) => void;
  onRevoke: (s: UserSession) => void;
}>) {
  const selectable = !session.isCurrentDevice;
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="flex w-4 justify-center pt-0.5">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(session.id)}
            aria-label={`Select ${session.deviceInfo || 'device'}`}
            className={CHECKBOX_CLASS}
          />
        )}
      </span>
      <span className="mt-0.5 text-gray-400 dark:text-gray-500">
        <Icon name="monitor" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
            {session.deviceInfo || 'Unknown device'}
          </span>
          {session.isCurrentDevice && <Badge kind="ok" dot>This device</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {session.ipAddress && (
            <span className="inline-flex items-center gap-1">
              <Icon name="globe" size={12} /> {session.ipAddress}
            </span>
          )}
          <span>Signed in {fmtSessionTime(session.createdAt)}</span>
          <span>Expires {fmtSessionTime(session.expiresAt)}</span>
        </div>
      </div>
      {selectable && (
        <Btn variant="ghost" size="xs" icon="logout" onClick={() => onRevoke(session)}>
          Sign out
        </Btn>
      )}
    </div>
  );
}

export default function AccountSessionsPage() {
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const terminate = useTerminateSession();
  const terminateMany = useTerminateSessions();
  const [revokeTarget, setRevokeTarget] = useState<UserSession | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectableIds = useMemo(
    () => (sessions ?? []).filter((s) => !s.isCurrentDevice).map((s) => s.id),
    [sessions],
  );

  // Drop selections for sessions that no longer exist (after a refetch/removal).
  useEffect(() => {
    setSelected((prev) => {
      const live = new Set(selectableIds);
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [selectableIds]);

  // If a background refetch empties the selection while the bulk-confirm dialog
  // is open, close it — otherwise confirming would fire a no-op "0 devices"
  // sign-out with a misleading success toast.
  useEffect(() => {
    if (confirmBulk && selected.size === 0) setConfirmBulk(false);
  }, [confirmBulk, selected.size]);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableIds));

  if (isLoading) {
    return <span className="kc-skeleton block h-[320px] max-w-2xl rounded-xl" />;
  }
  if (isError || !sessions) {
    return (
      <Card style={{ maxWidth: 560, padding: 28, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
        Couldn&apos;t load your sessions.
        <div style={{ marginTop: 10 }}>
          <Btn size="sm" onClick={() => refetch()}>Retry</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card
        title="Active sessions"
        action={
          <Btn
            variant="danger"
            size="sm"
            icon="logout"
            disabled={selected.size === 0 || terminateMany.isPending}
            loading={terminateMany.isPending}
            onClick={() => setConfirmBulk(true)}
          >
            {selected.size > 0 ? `Sign out (${selected.size})` : 'Sign out selected'}
          </Btn>
        }
      >
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No active sessions found.
          </div>
        ) : (
          <>
            {selectableIds.length > 0 && (
              <label className="flex cursor-pointer items-center gap-3 border-b border-gray-100 pb-3 text-xs font-medium text-gray-500 dark:border-white/5 dark:text-gray-400">
                <span className="flex w-4 justify-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all other devices"
                    className={CHECKBOX_CLASS}
                  />
                </span>
                {selected.size > 0 ? `${selected.size} selected` : 'Select all other devices'}
              </label>
            )}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  selected={selected.has(s.id)}
                  onToggle={toggleRow}
                  onRevoke={setRevokeTarget}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {revokeTarget && (
        <ConfirmDialog
          title="Sign out this device?"
          body={
            <>
              The session on <b>{revokeTarget.deviceInfo || 'this device'}</b> will be ended immediately
              and will need to sign in again.
            </>
          }
          confirmLabel="Sign out device"
          pending={terminate.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() =>
            terminate.mutate(revokeTarget.id, { onSettled: () => setRevokeTarget(null) })
          }
        />
      )}

      {confirmBulk && (
        <ConfirmDialog
          title={`Sign out ${selected.size} device${selected.size === 1 ? '' : 's'}?`}
          body="The selected devices will be signed out immediately and will need to sign in again. This device stays signed in."
          confirmLabel={`Sign out ${selected.size} device${selected.size === 1 ? '' : 's'}`}
          pending={terminateMany.isPending}
          onCancel={() => setConfirmBulk(false)}
          onConfirm={() => {
            // Guard the empty case (selection emptied by a refetch this tick)
            // so we never fire a no-op sign-out with a "0 devices" toast.
            if (selectedIds.length === 0) {
              setConfirmBulk(false);
              return;
            }
            terminateMany.mutate(selectedIds, {
              // Clear selection on both paths — a partial failure still removes
              // some sessions, so the old selection is stale either way.
              onSettled: () => {
                setSelected(new Set());
                setConfirmBulk(false);
              },
            });
          }}
        />
      )}
    </div>
  );
}
