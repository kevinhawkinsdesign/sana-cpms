'use client';

/**
 * Charger operations / commands data layer (Kabisa Tags & Operations plan).
 *
 * FRONTEND-ONLY MOCK. The command catalogue mirrors the OCPP 1.6/2.0.1 set
 * CitrineOS exposes (POST /ocpp/1.6/* and /ocpp/2.0.1/* on the CitrineOS core).
 * `sendCommand` is a stub that resolves with a fake accept/pending result so the
 * Control tab + command modal + response console are demoable. Wire it to the
 * real CitrineOS proxy (org-scoped, perm-gated) when the backend lands.
 */
import api from '@/lib/api/api';
import type { BadgeKind, IconName } from '@/components/console/ui';

export type CommandGroup =
  | 'Transaction'
  | 'Diagnostics'
  | 'Maintenance'
  | 'Smart charging & reservations';

export interface CommandParam {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface CommandDef {
  id: string;
  label: string;
  desc: string;
  group: CommandGroup;
  icon: IconName;
  /** last-run memory shown on the row (e.g. "14:30"); null = never run */
  lastRun?: string | null;
  /** roadmap item — rendered disabled with a "planned" tag */
  planned?: boolean;
  params?: CommandParam[];
}

/** The command catalogue, grouped exactly as the plan lays them out. */
export const COMMAND_CATALOG: CommandDef[] = [
  // Transaction
  { id: 'remote_start', group: 'Transaction', icon: 'play', lastRun: '14:30', label: 'Remote start transaction', desc: 'open a session on a connector', params: [
    { name: 'idToken', label: 'ID token', type: 'text', placeholder: 'TAG-…' },
    { name: 'connectorId', label: 'Connector', type: 'number', placeholder: '1' },
  ] },
  { id: 'remote_stop', group: 'Transaction', icon: 'stop', label: 'Remote stop transaction', desc: 'end the active session', params: [
    { name: 'transactionId', label: 'Transaction', type: 'text', placeholder: 'active transaction' },
  ] },
  { id: 'change_availability', group: 'Transaction', icon: 'power', label: 'Change availability', desc: 'set a connector operative / inoperative', params: [
    { name: 'connectorId', label: 'Connector', type: 'number', placeholder: '0 = whole charger' },
    { name: 'type', label: 'Availability', type: 'select', options: ['Operative', 'Inoperative'] },
  ] },
  { id: 'get_configuration', group: 'Transaction', icon: 'doc', lastRun: 'just now', label: 'Get configuration', desc: 'read all 1.6 configuration keys' },
  { id: 'change_configuration', group: 'Transaction', icon: 'sliders', label: 'Change configuration', desc: 'set a configuration key value', params: [
    { name: 'key', label: 'Configuration key', type: 'text', placeholder: 'HeartbeatInterval' },
    { name: 'value', label: 'Value', type: 'text', placeholder: '30' },
  ] },
  // Diagnostics
  { id: 'get_diagnostics', group: 'Diagnostics', icon: 'download', label: 'Get diagnostics', desc: 'upload a diagnostics file', params: [
    { name: 'location', label: 'Upload location (URL)', type: 'text', placeholder: 'sftp://…' },
  ] },
  { id: 'trigger_message', group: 'Diagnostics', icon: 'message', label: 'Trigger message', desc: 'ask the charger to re-send a message', params: [
    { name: 'requestedMessage', label: 'Message', type: 'select', options: ['StatusNotification', 'Heartbeat', 'MeterValues', 'BootNotification', 'FirmwareStatusNotification'] },
    { name: 'connectorId', label: 'Connector (optional)', type: 'number', placeholder: '1' },
  ] },
  { id: 'data_transfer', group: 'Diagnostics', icon: 'transfer', label: 'Data transfer', desc: 'vendor-specific payload', params: [
    { name: 'vendorId', label: 'Vendor ID', type: 'text' },
    { name: 'messageId', label: 'Message ID (optional)', type: 'text' },
    { name: 'data', label: 'Data', type: 'text' },
  ] },
  // Maintenance
  { id: 'reset', group: 'Maintenance', icon: 'refresh', label: 'Reset charger', desc: 'soft or hard reboot', params: [
    { name: 'type', label: 'Reset type', type: 'select', options: ['Soft', 'Hard'] },
  ] },
  { id: 'update_firmware', group: 'Maintenance', icon: 'upload', label: 'Update firmware', desc: 'schedule a firmware fetch', params: [
    { name: 'location', label: 'Firmware URL', type: 'text', placeholder: 'https://…' },
    { name: 'retrieveDate', label: 'Retrieve at', type: 'text', placeholder: 'now' },
  ] },
  { id: 'unlock_connector', group: 'Maintenance', icon: 'unlock', label: 'Unlock connector', desc: 'release the cable latch', planned: true },
  { id: 'clear_cache', group: 'Maintenance', icon: 'eraser', label: 'Clear cache', desc: 'clear the local authorization cache' },
  // Smart charging & reservations · roadmap
  { id: 'set_charging_profile', group: 'Smart charging & reservations', icon: 'calendar', label: 'Set charging profile', desc: 'apply a power-limit schedule', planned: true },
  { id: 'get_composite_schedule', group: 'Smart charging & reservations', icon: 'calendar', label: 'Get composite schedule', desc: 'read the effective schedule', planned: true },
  { id: 'reserve_now', group: 'Smart charging & reservations', icon: 'calendarPlus', label: 'Reserve now', desc: 'hold a connector for a tag', planned: true },
  { id: 'cancel_reservation', group: 'Smart charging & reservations', icon: 'calendarX', label: 'Cancel reservation', desc: 'release a held connector', planned: true },
];

export const COMMAND_GROUPS: CommandGroup[] = [
  'Transaction',
  'Diagnostics',
  'Maintenance',
  'Smart charging & reservations',
];

export type CommandResult = 'Accepted' | 'Pending' | 'Rejected';

export interface RecentOp {
  id: string;
  command: string;
  result: CommandResult;
  detail: string;
  by: string;
  time: string;
}

export function commandResultBadge(result: CommandResult): { kind: BadgeKind; label: string } {
  if (result === 'Accepted') return { kind: 'ok', label: 'Accepted' };
  if (result === 'Rejected') return { kind: 'err', label: 'Rejected' };
  return { kind: 'warn', label: 'Pending' };
}

/** Seed entries for the live response console / "recent operations". */
export const MOCK_RECENT_OPS: RecentOp[] = [
  { id: 'op-1', command: 'Get configuration', result: 'Accepted', detail: 'read 42 keys', by: 'K. Thomas', time: 'just now' },
  { id: 'op-2', command: 'Send local list', result: 'Pending', detail: 'v7 · 18 tags · full update', by: 'K. Thomas', time: '1m ago' },
  { id: 'op-3', command: 'Change configuration', result: 'Rejected', detail: 'HeartbeatInterval — read-only key', by: 'K. Thomas', time: '4m ago' },
];

/**
 * Mock send. Resolves with a plausible result so the UI can toast + append to
 * the response console. Read-only commands accept; mutating ones go Pending.
 */
export async function sendCommand(
  orgId: string,
  chargerId: string,
  cmd: CommandDef,
  params: Record<string, string>,
  ocppVersion: '1.6' | '2.0.1' = '1.6',
  stationId?: string,
): Promise<{ result: CommandResult; detail: string }> {
  if (cmd.planned) return { result: 'Rejected', detail: 'not yet available' };
  try {
    const res = await api(false, false).post(
      `/api/orgs/${orgId}/chargers/${encodeURIComponent(chargerId)}/commands`,
      { command: cmd.id, ocppVersion, params, ...(stationId ? { stationId } : {}) },
    );
    // backend returns { success, detail, payload } — success = the core accepted
    // the command (it's still async on the charger), so surface it as Pending.
    const data = (res.data?.data ?? {}) as { success?: boolean; detail?: string };
    return data.success
      ? { result: 'Pending', detail: data.detail ?? 'sent — awaiting charger confirmation' }
      : { result: 'Rejected', detail: data.detail ?? 'charger rejected the command' };
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } }; message?: string });
    return { result: 'Rejected', detail: msg.response?.data?.message ?? msg.message ?? 'command failed' };
  }
}

// --- local authorization list (mock) ----------------------------------------

export interface LocalAuthEntry {
  idToken: string;
  source: string; // tag label / owner
  expiry: string | null;
  parentTag: string | null;
}

export interface StagedChange {
  kind: 'ADD' | 'DELETE';
  idToken: string;
  desc: string;
  /** right-aligned undo hint ("remove" for a staged add, "keep" for a delete) */
  note: string;
}

export interface LocalAuthList {
  version: number;
  entries: LocalAuthEntry[];
  staged: StagedChange[];
}

export function useLocalAuthList(): LocalAuthList {
  return {
    version: 7,
    entries: [
      { idToken: 'TAG-C5ZK7S7F', source: "Bailey's fob", expiry: null, parentTag: null },
      { idToken: 'TAG-ZEBTJC7F', source: 'Support card', expiry: '31 Dec 2026', parentTag: null },
      { idToken: 'TAG-9QP2M4XK', source: 'unassigned', expiry: '31 Dec 2026', parentTag: 'PARENT-FLEET' },
      { idToken: 'TAG-LMN84KD2', source: 'Fleet master', expiry: null, parentTag: null },
    ],
    staged: [
      { kind: 'ADD', idToken: 'TAG-9QP2M4XK', desc: 'Spare 01 · Accepted', note: 'remove' },
      { kind: 'DELETE', idToken: 'TAG-7HF3RR2A', desc: 'Night shift · blocked', note: 'keep' },
    ],
  };
}
