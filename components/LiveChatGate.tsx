'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import LiveChat from './LiveChat';

// Routes where the chat bubble must stay hidden. Patterns also match
// country-prefixed paths (/rw/login, /ke/onboarding) since the app routes
// under app/[country]/... — mirrors the same convention used by
// ConditionalMailchimp.
const HIDDEN_ROUTE_PATTERNS: RegExp[] = [
  /^\/(?:[a-z]{2}\/)?onboarding(?:\/|$)/,
  /^\/(?:[a-z]{2}\/)?login(?:\/|$)/,
];

// Vendor dashboard configures two departments today: "Charging" and
// "Car sales". Default routes to "Charging" — Slack relay wired on this
// dept. Extend mapping when sales personas need different routing.
const DEFAULT_DEPARTMENT = 'Charging';

const extractCountryFromPath = (pathname: string | null): string | undefined => {
  if (!pathname) return undefined;
  const segment = pathname.split('/')[1];
  return segment && /^[a-z]{2}$/.test(segment) ? segment : undefined;
};

const LiveChatGate = () => {
  const widgetId = process.env.NEXT_PUBLIC_SOCIAL_INTENTS_WIDGET_ID;
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  if (!widgetId) return null;
  if (!isAuthenticated || !user) return null;

  const hidden = HIDDEN_ROUTE_PATTERNS.some((re) => re.test(pathname ?? ''));

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const country = extractCountryFromPath(pathname);

  // Troubleshooting metadata shown to the agent. Avoid leaking tokens or
  // anything beyond identifiers the support team already sees in the admin UI.
  const customVars: Record<string, string | undefined> = {
    userId: user.id,
    role: user.role,
    userType: user.userType,
    country,
    currentPath: pathname ?? undefined,
    organizationId: user.organizationId,
    organizationName: user.organization?.name,
  };

  return (
    <LiveChat
      widgetId={widgetId}
      hidden={hidden}
      user={{
        name: fullName || undefined,
        email: user.email,
        phone: user.phone,
        group: DEFAULT_DEPARTMENT,
      }}
      customVars={customVars}
    />
  );
};

export default LiveChatGate;
