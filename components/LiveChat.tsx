'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

// Vendor (Social Intents) exposes the `SI_API` global after the widget script
// loads. Documented methods used here:
//   - `setChatInfo(name, email, phone, group, question)`: pre-fill visitor
//     info; hides those fields in the pre-chat form when set.
//   - `addParams([{name, value}, ...])`: attach troubleshooting metadata
//     visible to the agent in the SI inbox sidebar.
//   - `hideTab() / showTab()`: bubble visibility on a per-route basis.
// Readiness signalled via the `onSIApiReady` global callback.
// The component name stays vendor-neutral so swapping providers later only
// touches this file.
declare global {
  interface Window {
    SI_API?: {
      setChatInfo?: (
        name?: string,
        email?: string,
        phone?: string,
        group?: string,
        question?: string,
      ) => void;
      addParams?: (params: Array<{ name: string; value: string }>) => void;
      hideTab?: () => void;
      showTab?: () => void;
    };
    onSIApiReady?: () => void;
  }
}

export interface LiveChatUser {
  name?: string;
  email?: string;
  phone?: string;
  /** Department / group used to route the chat (e.g. "Charging"). */
  group?: string;
  /** Optional pre-filled initial question — usually left blank. */
  initialQuestion?: string;
}

export interface LiveChatProps {
  widgetId: string;
  user?: LiveChatUser;
  hidden?: boolean;
  /**
   * Arbitrary troubleshooting metadata surfaced to the agent in the SI inbox
   * sidebar. Keys/values stringified. Pass things like userId, country,
   * currentPath, organizationId, role.
   */
  customVars?: Record<string, string | number | null | undefined>;
}

const LiveChat = ({ widgetId, user, hidden, customVars }: LiveChatProps) => {
  // Tracks whether the SI_API global is ready.
  const apiReadyRef = useRef(false);

  // Mirror latest props so async callbacks (onSIApiReady, polling, prop-change
  // effects) always read fresh values instead of capturing stale closures.
  const propsRef = useRef({ user, hidden, customVars });
  propsRef.current = { user, hidden, customVars };

  const applyChatInfo = () => {
    if (typeof window === 'undefined') return;
    const api = window.SI_API;
    const { user: u, customVars: cv } = propsRef.current;

    if (api && typeof api.setChatInfo === 'function' && u) {
      api.setChatInfo(
        u.name,
        u.email,
        u.phone,
        u.group,
        u.initialQuestion ?? '',
      );
    }

    if (api && typeof api.addParams === 'function' && cv) {
      const params: Array<{ name: string; value: string }> = [];
      for (const [key, raw] of Object.entries(cv)) {
        if (raw === undefined || raw === null || raw === '') continue;
        params.push({ name: key, value: String(raw) });
      }
      if (params.length > 0) {
        try {
          api.addParams(params);
        } catch {
          // Vendor may throw for unsupported params on certain plans; ignore.
        }
      }
    }
  };

  const applyVisibility = () => {
    if (typeof window === 'undefined') return;
    const api = window.SI_API;
    if (!api) return;
    if (propsRef.current.hidden) {
      if (typeof api.hideTab === 'function') api.hideTab();
    } else {
      if (typeof api.showTab === 'function') api.showTab();
    }
  };

  const applyAll = () => {
    applyChatInfo();
    applyVisibility();
  };

  // Wire the documented onSIApiReady hook. Vendor calls this once SI_API is
  // attached. We also keep a polling fallback to handle remounts where the
  // global was already present (Script.onLoad does not refire) and to cover
  // the small window between mount and global attachment.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fire = () => {
      apiReadyRef.current = true;
      applyAll();
    };

    // Register the documented callback. Preserve any prior handler in case a
    // vendor script set one before our component mounted.
    const previous = window.onSIApiReady;
    window.onSIApiReady = () => {
      try {
        previous?.();
      } catch {
        /* ignore previous handler errors */
      }
      fire();
    };

    if (typeof window.SI_API?.setChatInfo === 'function') {
      fire();
      return () => {
        if (window.onSIApiReady) window.onSIApiReady = previous;
      };
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (typeof window.SI_API?.setChatInfo === 'function') {
        fire();
        window.clearInterval(interval);
      }
    }, 200);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      if (window.onSIApiReady) window.onSIApiReady = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply chat info + visibility whenever the parent passes new user data
  // or toggles visibility. Skipped until the API is actually ready.
  useEffect(() => {
    if (apiReadyRef.current) applyAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.name,
    user?.email,
    user?.phone,
    user?.group,
    user?.initialQuestion,
    hidden,
    // Stringify customVars so prop-change effect fires on nested changes
    // without forcing the parent to memoize the object.
    JSON.stringify(customVars ?? {}),
  ]);

  if (!widgetId) return null;

  return (
    <Script
      id={`live-chat-${widgetId}`}
      src={`https://www.socialintents.com/api/chat/socialintents.1.4.js#${widgetId}`}
      strategy="afterInteractive"
      onLoad={() => {
        // Falls through to onSIApiReady; nothing to do here besides covering
        // the rare case where the script loads without firing the callback.
        if (typeof window !== 'undefined' && typeof window.SI_API?.setChatInfo === 'function') {
          apiReadyRef.current = true;
          applyAll();
        }
      }}
    />
  );
};

export default LiveChat;
