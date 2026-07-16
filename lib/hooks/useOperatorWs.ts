'use client';

import { useEffect, useRef } from 'react';
import { getAccessToken } from '@/lib/utils/authStorage';
import type { Session } from '@/lib/api/chargingSessions';

export type WsEventType =
  | 'session:started'
  | 'session:updated'
  | 'session:ended'
  | 'session:transferred'
  | 'session:telemetry'
  | 'payment:confirmed'
  | 'payment:failed'
  | 'ping';

interface WsEvent {
  type: WsEventType;
  payload?: unknown;
}

interface SessionEndedPayload {
  sessionId: string;
  sessionStatus: string;
}

interface SessionTransferredPayload {
  sessionId: string;
  fromOperatorId: string;
  toOperatorId: string;
  session: Session;
}

interface SessionTelemetryPayload {
  sessionId: string;
  chargedKwh: number | null;
  currentSoc: number | null;
  // Populated when the backend backfills startSoc after the session:started
  // event (e.g. Citrine MeterStart arrives without a SoC reading).
  startSoc?: number | null;
}

export interface PaymentConfirmedPayload {
  sessionId: string;
  transactionId: string;
  paidAt: string;
  /** EBM rollout flag from the charger. Drives whether the EBM popup opens
   *  after successful payment. Absent on legacy broadcasts → treated as false. */
  chargerGenerateEbm?: boolean;
}

export interface PaymentFailedPayload {
  sessionId: string;
  transactionId: string;
  reason?: string;
}

interface UseOperatorWsOptions {
  onSessionStarted?: (session: Session) => void;
  /**
   * In-place session mutation broadcast — emitted by the backend when a
   * field flips after `session:started` (currently: MAC auto-attribute fills
   * `vehicleId` from a confirmed EVCC sighting). Payload is the full refreshed
   * session row, so listeners can merge by id instead of refetching.
   */
  onSessionUpdated?: (session: Session) => void;
  onSessionEnded?: (payload: SessionEndedPayload) => void;
  onSessionTransferred?: (payload: SessionTransferredPayload) => void;
  onSessionTelemetry?: (payload: SessionTelemetryPayload) => void;
  onPaymentConfirmed?: (payload: PaymentConfirmedPayload) => void;
  onPaymentFailed?: (payload: PaymentFailedPayload) => void;
  onConnected?: () => void;
}

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Shared single connection to /ws/operator.
 *
 * Every component that wants operator events registers its callbacks here; the
 * manager keeps ONE WebSocket open and fans each broadcast out to all
 * subscribers. This avoids one socket per mounted component (overview hook +
 * any open dialog), which previously meant the backend delivered every event N
 * times — N reconnect-refreshes, N toasts. The socket opens on the first
 * subscriber and closes when the last unsubscribes.
 */
type Subscriber = { current: UseOperatorWsOptions };

const subscribers = new Set<Subscriber>();
let socket: WebSocket | null = null;
let backoff = INITIAL_BACKOFF_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function dispatch(msg: WsEvent) {
  if (!msg.payload) return;
  for (const sub of subscribers) {
    const cb = sub.current;
    switch (msg.type) {
      case 'session:started': cb.onSessionStarted?.(msg.payload as Session); break;
      case 'session:updated': cb.onSessionUpdated?.(msg.payload as Session); break;
      case 'session:ended': cb.onSessionEnded?.(msg.payload as SessionEndedPayload); break;
      case 'session:transferred': cb.onSessionTransferred?.(msg.payload as SessionTransferredPayload); break;
      case 'session:telemetry': cb.onSessionTelemetry?.(msg.payload as SessionTelemetryPayload); break;
      case 'payment:confirmed': cb.onPaymentConfirmed?.(msg.payload as PaymentConfirmedPayload); break;
      case 'payment:failed': cb.onPaymentFailed?.(msg.payload as PaymentFailedPayload); break;
      default: break;
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = backoff;
  backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  reconnectTimer = setTimeout(() => {
    if (subscribers.size > 0) connect();
  }, delay);
}

function connect() {
  if (typeof window === 'undefined') return;
  if (subscribers.size === 0) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  const token = getAccessToken();
  if (!token) {
    // No token yet (e.g. storage race) — retry with backoff instead of going permanently silent
    scheduleReconnect();
    return;
  }

  let apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  while (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
  // Convert http(s):// → ws(s)://
  const wsBase = apiUrl.replace(/^http/, 'ws');
  const url = `${wsBase}/ws/operator?token=${encodeURIComponent(token)}`;

  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    console.log('[OperatorWS] Connected to', url.replace(/token=[^&]+/, 'token=***'));
    backoff = INITIAL_BACKOFF_MS;
    for (const sub of subscribers) sub.current.onConnected?.();
  };

  ws.onmessage = (event) => {
    let msg: WsEvent;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }
    dispatch(msg);
  };

  ws.onclose = (e) => {
    console.log('[OperatorWS] Disconnected', e.code, e.reason);
    socket = null;
    if (subscribers.size > 0) scheduleReconnect();
  };

  ws.onerror = () => {
    console.error('[OperatorWS] Connection error');
    ws.close();
  };
}

function addSubscriber(sub: Subscriber) {
  subscribers.add(sub);
  if (!socket) {
    connect();
  } else if (socket.readyState === WebSocket.OPEN) {
    // Late joiner on an already-open socket: fire its onConnected so it can run
    // its initial sync, matching the per-socket behaviour callers relied on.
    sub.current.onConnected?.();
  }
}

function removeSubscriber(sub: Subscriber) {
  subscribers.delete(sub);
  if (subscribers.size === 0) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.close();
      socket = null;
    }
  }
}

export function useOperatorWs(options: UseOperatorWsOptions) {
  // Keep latest callbacks in a stable ref so dispatch never stale-closes and the
  // subscriber identity is constant across renders.
  const sub = useRef<UseOperatorWsOptions>(options);
  sub.current = options;

  useEffect(() => {
    const ref = sub;
    addSubscriber(ref);
    return () => removeSubscriber(ref);
  }, []);
}
