'use client';

/** Station Control + Local-auth-list tabs (Kabisa Tags & Operations plan).
 *  Control: searchable, grouped command surface beside a live response console.
 *  Local list: the charger's authorization list with a staged differential.
 *  FRONTEND-ONLY MOCK — commands resolve via lib/console/chargerCommands.ts
 *  (no real OCPP yet). Wire to the CitrineOS proxy when the backend lands. */
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Btn, Card, Icon, Select, Pagination } from '@/components/console/ui';
import { useOrgs } from '@/lib/console/orgs';
import {
  useChargerCommandActivity,
  useChargerDeviceState,
  useSendLocalList,
  useChargerConfiguration,
  useRunChargerCommand,
  CHARGER_CONFIG_PAGE_SIZE,
  type ChargerDeviceState,
  type ConfigVersion,
  type ChargerConfigEntry,
} from '@/lib/console/stations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  COMMAND_CATALOG,
  COMMAND_GROUPS,
  commandResultBadge,
  sendCommand,
  useLocalAuthList,
  type CommandDef,
  type RecentOp,
} from '@/lib/console/chargerCommands';

// Monotonic id for response-console entries — avoids Math.random (Sonar S2245)
// and is collision-free within a session.
let opSeq = 0;

/* ----------------------------- command modal ----------------------------- */

function CommandModal({
  cmd,
  orgId,
  chargerId,
  stationId,
  onClose,
  onResult,
}: Readonly<{ cmd: CommandDef | null; orgId: string | null; chargerId: string; stationId?: string | null; onClose: () => void; onResult: (op: RecentOp) => void }>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    // seed select defaults whenever the command changes
    const seed: Record<string, string> = {};
    for (const p of cmd?.params ?? []) if (p.type === 'select' && p.options?.length) seed[p.name] = p.options[0];
    setValues(seed);
  }, [cmd]);

  if (!cmd) return null;

  const submit = async () => {
    setSending(true);
    try {
      const res = await sendCommand(orgId ?? '', chargerId, cmd, values, '1.6', stationId ?? undefined);
      const op: RecentOp = {
        id: `op-${cmd.id}-${(opSeq += 1)}`,
        command: cmd.label,
        result: res.result,
        detail: res.detail,
        by: 'You',
        time: 'just now',
      };
      onResult(op);
      const b = commandResultBadge(res.result);
      if (res.result === 'Rejected') toast.error(`${cmd.label} · ${b.label}`, { description: res.detail });
      else toast.success(`${cmd.label} · ${b.label}`, { description: `${chargerId} — ${res.detail}` });
      onClose();
    } catch (e) {
      // A real backend can throw (network / 5xx) — never strand the modal in a
      // loading state; surface the error and let the user retry.
      toast.error(`${cmd.label} failed`, { description: e instanceof Error ? e.message : 'Command could not be sent' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!cmd} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cmd.label}</DialogTitle>
          <DialogDescription>{chargerId} · OCPP 1.6 · {cmd.desc}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {(cmd.params ?? []).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No parameters — sends as-is.</p>
          )}
          {(cmd.params ?? []).map((p) => (
            <label key={p.name} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">{p.label}</span>
              {p.type === 'select' ? (
                <Select
                  options={p.options ?? []}
                  value={values[p.name] ?? p.options?.[0] ?? ''}
                  onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
                />
              ) : (
                <input
                  type={p.type === 'number' ? 'number' : 'text'}
                  placeholder={p.placeholder}
                  value={values[p.name] ?? ''}
                  onChange={(e) => setValues((s) => ({ ...s, [p.name]: e.target.value }))}
                  className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-[#0B4F42] focus:outline-none focus:ring-3 focus:ring-[#0B4F42]/10 dark:border-gray-700 dark:text-white/90"
                />
              )}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Btn variant="default" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" loading={sending} onClick={submit}>Send command</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Live response console -------------------------- */

function fmtOcppTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 'ChangeConfiguration' → 'Change configuration'. */
function prettyAction(a: string): string {
  const spaced = a.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function statusCls(status: string): string {
  if (status === 'Accepted') return 'bg-[#10b981]/20 text-[#34d399]';
  if (status === 'Rejected') return 'bg-red-500/20 text-red-400';
  if (status === 'Pending') return 'bg-amber-500/20 text-amber-400';
  return 'bg-white/10 text-white/50';
}

/** Collapsible JSON block (request / response) with a copy button. */
function JsonBlock({ label, data, defaultOpen }: Readonly<{ label: string; data: unknown; defaultOpen?: boolean }>) {
  const [open, setOpen] = useState(!!defaultOpen);
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[10px] font-medium uppercase tracking-wide text-white/30 hover:text-white/60"
      >
        {open ? '▾' : '▸'} {label}
      </button>
      {open && (
        <div className="relative mt-1">
          <pre className="overflow-auto whitespace-pre-wrap break-all rounded bg-black/30 px-3 py-2 pr-9 text-[11px] leading-relaxed text-[#6ee7b7] max-h-48">
            {json}
          </pre>
          <button
            type="button"
            title="Copy JSON"
            onClick={() => navigator.clipboard.writeText(json).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Failed to copy'))}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
          >
            <Icon name="doc" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function ResponseConsole({ orgId, chargerId, stationId }: Readonly<{ orgId: string | null; chargerId: string; stationId?: string | null }>) {
  const q = useChargerCommandActivity(orgId, chargerId, { live: true }, stationId);
  const entries = q.data?.activity ?? [];
  const protocolLabel = entries[0]?.ocppVersion ?? '—';

  const hasParams = (p: unknown) =>
    p != null && typeof p === 'object' && Object.keys(p as Record<string, unknown>).length > 0;

  return (
    <div className="overflow-hidden rounded-[10px] bg-[#0f1729] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#34d399] animate-pulse" />
          <span className="text-sm font-semibold text-white/90">Live response console</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
          <span>{chargerId}</span>
          <span>·</span>
          <span>{protocolLabel}</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 max-h-[500px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-sm text-white/30">
            {q.isPending ? 'Loading…' : 'No commands run yet.'}
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={e.id} className={`px-4 py-2.5 ${i > 0 ? 'border-t border-white/5' : ''}`}>
              <div className="flex items-start gap-2">
                <span className="shrink-0 font-mono text-[11px] text-white/30 pt-0.5">{fmtOcppTime(e.createdAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white/90">{prettyAction(e.ocppAction)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusCls(e.status)}`}>{e.status}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/30">
                    by {e.actor?.name ?? '—'}{e.summary ? ` · ${e.summary}` : ''}
                  </div>
                  {hasParams(e.requestParams) && <JsonBlock label="request" data={e.requestParams} />}
                  {e.responsePayload != null && <JsonBlock label="response" data={e.responsePayload} defaultOpen />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Device state ------------------------------ */

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function ocppLabel(protocol: string | null): string {
  if (!protocol) return '—';
  // 'OCPP1_6' → '1.6', 'OCPP2_0_1' → '2.0.1'
  const m = protocol.replace(/^OCPP/i, '').replace(/_/g, '.');
  return m || protocol;
}

function StateCell({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{value}</span>
    </div>
  );
}

function DeviceStateCard({ orgId, chargerId, stationId }: Readonly<{ orgId: string | null; chargerId: string; stationId?: string | null }>) {
  const q = useChargerDeviceState(orgId, chargerId, { live: true }, stationId);
  const send = useSendLocalList(orgId, chargerId);
  const d: ChargerDeviceState | undefined = q.data;

  const sync = () => {
    if (!orgId || !chargerId) return;
    send.mutate('full', {
      onSuccess: () => toast.success('Local list sync sent', { description: `${chargerId} — full update` }),
      onError: (e) => toast.error('Could not sync the local list', { description: e instanceof Error ? e.message : undefined }),
    });
  };

  return (
    <Card title={<span className="inline-flex items-center gap-2"><Icon name="monitor" size={15} /> Device state</span>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <StateCell label="Firmware" value={d?.firmwareVersion ?? '—'} />
        <StateCell label="OCPP" value={ocppLabel(d?.ocppProtocol ?? null)} />
        <StateCell label="Heartbeat" value={relativeTime(d?.lastHeartbeatAt ?? null)} />
        <StateCell label="Boot reason" value={d?.bootReason ?? d?.bootStatus ?? '—'} />
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-[#f0f3f7] pt-3.5 dark:border-[#242424]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f4f8] text-[#566882] dark:bg-white/5 dark:text-gray-300">
          <Icon name="tag" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-gray-800 dark:text-white/90">
            Local auth list{d?.localList?.version != null ? ` · v${d.localList.version}` : ''}
          </div>
          <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">
            {d?.localList?.scopedTagCount ?? 0} tag{d?.localList?.scopedTagCount === 1 ? '' : 's'} scoped to this station
          </div>
        </div>
        <Btn variant="primary" size="sm" icon="refresh" loading={send.isPending} disabled={!orgId || !chargerId} onClick={sync}>Sync</Btn>
      </div>
    </Card>
  );
}

/* ------------------------------- Control tab ------------------------------ */

export function ControlTab({ chargerId, stationId }: Readonly<{ chargerId: string; stationId?: string | null }>) {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<CommandDef | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (c: CommandDef) => !q || c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start">
      {/* command surface */}
      <div className="min-w-0">
        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" size={15} /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Run a command…"
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 focus:border-[#0B4F42] focus:outline-none focus:ring-3 focus:ring-[#0B4F42]/10 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div className="flex flex-col gap-4">
          {COMMAND_GROUPS.map((group) => {
            const cmds = COMMAND_CATALOG.filter((c) => c.group === group && matches(c));
            if (cmds.length === 0) return null;
            const roadmap = group === 'Smart charging & reservations';
            return (
              <div key={group}>
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {group}{roadmap && <Badge kind="neutral">roadmap</Badge>}
                </div>
                <div className="overflow-hidden rounded-[10px] border border-[#e6ebf2] dark:border-[#2A2A2A]">
                  {cmds.map((c, i) => (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-[#f0f3f7] dark:border-[#242424]' : ''}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1f4f8] text-[#566882] dark:bg-white/5 dark:text-gray-300">
                        <Icon name={c.icon} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-800 dark:text-white/90">
                          {c.label}
                          {c.planned && <Badge kind="neutral">planned</Badge>}
                        </div>
                        <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{c.desc}</div>
                      </div>
                      {c.lastRun ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-[#1f7a45]">
                          <span className="h-[5px] w-[5px] rounded-full bg-[#23a35a]" />
                          {c.lastRun}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] text-gray-300 dark:text-gray-600">—</span>
                      )}
                      <Btn variant="default" size="xs" disabled={c.planned} onClick={() => setActive(c)}>Run</Btn>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* right column: device state + live response console */}
      <div className="flex min-w-0 flex-col gap-4">
        <DeviceStateCard orgId={orgId} chargerId={chargerId} stationId={stationId} />
        <ResponseConsole orgId={orgId} chargerId={chargerId} stationId={stationId} />
      </div>

      <CommandModal cmd={active} orgId={orgId} chargerId={chargerId} stationId={stationId} onClose={() => setActive(null)} onResult={() => {}} />
    </div>
  );
}

/* ----------------------------- Local list tab ---------------------------- */

const soon = (what: string) => () => toast(`${what} lands with the backend`, { description: 'Local-list sync is mocked for now.' });

export function LocalListTab({ chargerId }: Readonly<{ chargerId: string }>) {
  const list = useLocalAuthList();
  const stagedCount = list.staged.length;

  return (
    <div className="p-4">
      <Card
        pad={false}
        title={
          <span className="inline-flex items-center gap-2">
            Local authorization list <Badge kind="info">v{list.version}</Badge>
            <span className="text-xs font-normal text-gray-400">· {list.entries.length} entries · OCPP 1.6</span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="default" size="xs" icon="cloudDownload" onClick={soon('Get version')}>Get version</Btn>
            <Btn variant="default" size="xs" icon="plus" onClick={soon('Add entry')}>Add entry</Btn>
            <Btn variant="secondary" size="xs" icon="gitCompare" disabled={stagedCount === 0} onClick={soon('Send differential')}>
              Send differential{stagedCount ? ` (${stagedCount})` : ''}
            </Btn>
            <Btn variant="primary" size="xs" icon="upload" onClick={soon('Send full list')}>Send full</Btn>
            <button
              type="button"
              onClick={soon('Clear local list')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#f1c9c0] bg-white px-2.5 py-1 text-xs font-semibold text-[#c0392b] hover:bg-[#fdece8] dark:border-[#e0533d]/40 dark:bg-transparent dark:text-[#f0998a] dark:hover:bg-[#e0533d]/10"
            >
              <Icon name="trash" size={13} /> Clear
            </button>
          </div>
        }
      >
        {stagedCount > 0 && (
          <div className="border-b border-[#f0f3f7] bg-[#fffaf0] px-4 py-3 dark:border-[#242424] dark:bg-[#e0a800]/[0.06]">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8a6f00]">
              {stagedCount} staged change{stagedCount !== 1 ? 's' : ''} — apply as a differential update
            </div>
            <div className="flex flex-col gap-2.5">
              {list.staged.map((s, i) => (
                <div key={`${s.kind}-${i}`} className="flex items-center gap-2.5">
                  <span
                    className={`rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-semibold ${
                      s.kind === 'ADD'
                        ? 'bg-[#e8f6ee] text-[#1f7a45] dark:bg-[#1f7a45]/15 dark:text-[#5fd08a]'
                        : 'bg-[#fdece8] text-[#c0392b] dark:bg-[#e0533d]/15 dark:text-[#f0998a]'
                    }`}
                  >
                    {s.kind}
                  </span>
                  <span className="mono text-[12.5px] text-gray-800 dark:text-white/90">{s.idToken}</span>
                  <span className="text-[11.5px] text-[#8696ac]">{s.desc}</span>
                  <button className="ml-auto text-[11px] font-semibold text-[#8696ac] hover:underline" onClick={soon('Undo')}>{s.note}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <table className="kc-table">
          <thead>
            <tr><th>idToken</th><th>Source</th><th>Expiry</th><th>Parent tag</th></tr>
          </thead>
          <tbody>
            {list.entries.map((e) => (
              <tr key={e.idToken}>
                <td><span className="mono text-gray-800 dark:text-white/90">{e.idToken}</span></td>
                <td className="text-gray-700 dark:text-gray-300">{e.source}</td>
                <td className="text-gray-500 dark:text-gray-400">{e.expiry ?? '—'}</td>
                <td className="mono text-gray-500 dark:text-gray-400">{e.parentTag ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------- Configuration tab --------------------------- */

const CONFIG_VERSIONS: ConfigVersion[] = ['1.6', '2.0.1'];

function configToCsv(version: ConfigVersion, rows: { key: string; value: string | null; readonly: boolean; type: string | null; component: string | null; variable: string | null; evse: number | null }[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header =
    version === '1.6'
      ? ['Key', 'Value', 'Read-only']
      : ['Component', 'Variable', 'Type', 'Value', 'EVSE', 'Read-only'];
  const lines = rows.map((r) =>
    version === '1.6'
      ? [r.key, r.value, r.readonly].map(esc).join(',')
      : [r.component, r.variable, r.type, r.value, r.evse, r.readonly].map(esc).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

/** Change a single 1.6 configuration key (OCPP ChangeConfiguration). */
function ConfigEditModal({
  entry,
  orgId,
  chargerId,
  stationId,
  onClose,
}: Readonly<{ entry: ChargerConfigEntry | null; orgId: string | null; chargerId: string; stationId?: string | null; onClose: () => void }>) {
  const [value, setValue] = useState('');
  const run = useRunChargerCommand(orgId, chargerId, stationId);

  React.useEffect(() => { setValue(entry?.value ?? ''); }, [entry]);

  if (!entry) return null;

  const submit = async () => {
    try {
      const res = await run.mutateAsync({ command: 'change_configuration', params: { key: entry.key, value } });
      if (res.success) {
        toast.success('Change configuration sent', { description: `${entry.key} — awaiting charger confirmation` });
        onClose();
      } else {
        toast.error('Charger rejected the change', { description: res.detail ?? entry.key });
      }
    } catch (e) {
      toast.error('Could not send the change', { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change configuration</DialogTitle>
          <DialogDescription>{chargerId} · OCPP 1.6 · {entry.key}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1 py-1 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">Value</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-[#0B4F42] focus:outline-none focus:ring-3 focus:ring-[#0B4F42]/10 dark:border-gray-700 dark:text-white/90"
          />
        </label>
        <DialogFooter>
          <Btn variant="default" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" size="sm" loading={run.isPending} onClick={submit}>Send change</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChargerConfigTab({ chargerId, defaultVersion, stationId }: Readonly<{ chargerId: string; defaultVersion?: ConfigVersion; stationId?: string | null }>) {
  const orgId = useOrgs().data?.activeOrgId ?? null;
  const [version, setVersion] = useState<ConfigVersion>(defaultVersion ?? '1.6');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ChargerConfigEntry | null>(null);
  const getCfg = useRunChargerCommand(orgId, chargerId, stationId);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const q = useChargerConfiguration(orgId, chargerId, version, page, debounced || undefined, stationId);
  const entries = q.data?.entries ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CHARGER_CONFIG_PAGE_SIZE));
  const is201 = version === '2.0.1';

  const getConfiguration = async () => {
    try {
      const res = await getCfg.mutateAsync({ command: 'get_configuration' });
      if (res.success) toast.success('Get configuration sent', { description: 'Refreshing keys from the charger…' });
      else toast.error('Charger rejected the request', { description: res.detail });
    } catch (e) {
      toast.error('Could not request configuration', { description: e instanceof Error ? e.message : undefined });
    }
  };

  const exportCsv = () => {
    if (entries.length === 0) { toast('Nothing to export on this page'); return; }
    const csv = configToCsv(version, entries);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chargerId}-config-${version}-p${page}.csv`;
    // Firefox needs the anchor in the DOM, and revoking the blob URL too early
    // can cancel the download — append, click, then defer the revoke.
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="p-4">
      <Card
        pad={false}
        title={<span className="inline-flex items-center gap-2"><Icon name="sliders" size={15} /> Configuration</span>}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#e6ebf2] p-0.5 dark:border-[#2A2A2A]">
              {CONFIG_VERSIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setVersion(v); setPage(1); setSearch(''); setDebounced(''); }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    version === v ? 'bg-[#0B4F42] text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                  }`}
                >
                  OCPP {v}
                </button>
              ))}
            </div>
            {!is201 && (
              <Btn variant="default" size="xs" icon="refresh" loading={getCfg.isPending} disabled={!orgId} onClick={getConfiguration}>
                Get configuration
              </Btn>
            )}
            <Btn variant="default" size="xs" icon="download" disabled={entries.length === 0} onClick={exportCsv}>CSV</Btn>
          </div>
        }
      >
        <div className="border-b border-gray-100/50 px-4 py-3 dark:border-white/5">
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" size={14} /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={is201 ? 'Search component / variable…' : 'Search key…'}
              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 focus:border-[#0B4F42] focus:outline-none dark:border-gray-700 dark:text-white/90"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400">
          <span>{total} key{total === 1 ? '' : 's'}</span>
          {q.isFetching && <Badge kind="info" dot pulse>updating</Badge>}
        </div>

        {q.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }, (_, i) => <span key={i} className="kc-skeleton h-8 rounded-md" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No configuration keys found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>{is201 ? 'Component · Variable' : 'Key'}</th>
                  {is201 && <th>Type</th>}
                  <th>Value</th>
                  {is201 && <th className="num">EVSE</th>}
                  <th>Access</th>
                  {!is201 && <th />}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td><span className="mono text-gray-800 dark:text-white/90">{e.key}</span></td>
                    {is201 && <td className="text-gray-500 dark:text-gray-400">{e.type ?? '—'}</td>}
                    <td className="mono break-all text-gray-700 dark:text-gray-300">{e.value ?? '—'}</td>
                    {is201 && <td className="num mono text-gray-500">{e.evse ?? '—'}</td>}
                    <td>{e.readonly ? <Badge kind="neutral">read-only</Badge> : <Badge kind="ok">writable</Badge>}</td>
                    {!is201 && (
                      <td className="text-right">
                        {!e.readonly && (
                          <Btn variant="default" size="xs" icon="sliders" onClick={() => setEditing(e)}>Edit</Btn>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={CHARGER_CONFIG_PAGE_SIZE} />
        </div>
      </Card>

      <ConfigEditModal entry={editing} orgId={orgId} chargerId={chargerId} stationId={stationId} onClose={() => setEditing(null)} />
    </div>
  );
}
