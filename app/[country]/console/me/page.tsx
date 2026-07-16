'use client';

/** Console operator overview (operator self-service home): shift status, live
 *  session cards, sessions-needing-attention, today KPIs and recent sessions.
 *  Ports the legacy dashboard operator page onto console primitives; reuses the
 *  operator data hooks, ActiveSessionCard, SessionsTable and session dialogs. */
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, CalendarClock, UserPlus } from 'lucide-react';

import { Btn, Card, PageHead, SummaryStrip } from '@/components/console/ui';
import { fmtCompact, fmtNumber } from '@/lib/console/dashboard';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useOperatorLiveSessions } from '@/lib/hooks/useOperatorLiveSessions';
import { ShiftStatusIndicator } from '@/components/dashboard/Operator/ShiftStatusIndicator';
import { ActiveSessionCard } from '@/components/shared/ActiveSessionCard';
import SessionsTable from '@/components/shared/tables/SessionsTable';
import { OperatorSessionModal } from '@/components/console/sessions/OperatorSessionModal';
import { EnhancedPaymentDialog } from '@/components/dashboard/sessions/EnhancedPaymentDialog';
import { EBMOperatorPopup } from '@/components/dashboard/sessions/EBMOperatorPopup';
import { SessionCardDialogs } from '@/components/shared/SessionCardDialogs';
import { useSessionCardActions } from '@/lib/hooks/useSessionCardActions';
import { useSharedSessionId } from '@/lib/hooks/useSharedSessionId';
import { buildEbmPopupSessionData } from '@/lib/utils/ebmPopupData';
import { getVehicleLicensePlateNumber } from '@/lib/utils/vehicleUtils';
import {
  getOperatorActiveSessions,
  getOperatorLatestSessions,
  getOperatorSessions,
  getOperatorSessionsPaginated,
  getOperatorSessionAlerts,
  generateEbm,
  type Session,
} from '@/lib/api/chargingSessions';
import {
  type DashboardStats,
  EMPTY_STATS,
  calculateDashboardStats,
  filterTodaySessions,
  fetchUserProfileWithFallback,
} from '@/lib/utils/dashboardStats';

const CONSOLE_OPERATOR_BASE = '/console/me';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function ConsoleOperatorOverviewBody() {
  const params = useParams<{ country: string }>();
  const router = useLocalizedRouter();
  const { user } = useAuth();

  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { sharedSessionId, setSharedSessionId, hasConsumed, markConsumed } = useSharedSessionId();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showEbmPopup, setShowEbmPopup] = useState(false);
  const [ebmSessionId, setEbmSessionId] = useState('');
  const [ebmInitialPhone, setEbmInitialPhone] = useState<string | undefined>(undefined);
  const sessionCardActions = useSessionCardActions();

  // Shared operator live-session state + WebSocket wiring (also used by the
  // legacy dashboard operator page).
  const {
    activeSessions,
    setActiveSessions,
    recentSessions,
    setRecentSessions,
    sessionAlerts,
    setSessionAlerts,
    refreshActiveSessions,
    refreshSessionsInBackground,
  } = useOperatorLiveSessions();

  const consoleSessionsHref = `/${params.country}/console/sessions`;
  // Country-prefixed base for <Link href> (router.push uses useLocalizedRouter,
  // which adds the country itself, so it keeps the un-prefixed constant).
  const operatorBase = `/${params.country}${CONSOLE_OPERATOR_BASE}`;

  const handleViewSessionDetails = (session: Session) => {
    setSelectedSession(session);
    setSharedSessionId(session.sessionId || session.id);
  };

  const handleEndSession = (session: Session) => {
    if (session.source === 'REMOTE') return;
    // A vehicle without a registered plate yields an empty string; only prefill
    // the identifier when present so we never seed the end-session form with an
    // empty value that fails its min-length validation (operator types it then).
    const vehicleIdentifier = getVehicleLicensePlateNumber(session.vehicle);
    const query = vehicleIdentifier
      ? `?op=end&vehicleIdentifier=${encodeURIComponent(vehicleIdentifier)}`
      : '?op=end';
    router.push(`${CONSOLE_OPERATOR_BASE}/charge${query}`);
  };

  const handlePaymentSession = (session: Session) => {
    setSelectedSessionId(session.id);
    setShowPayment(true);
  };

  const handlePaymentComplete = (ctx?: {
    chargerGenerateEbm?: boolean;
    momoPhoneNumber?: string;
    paymentMethod?: 'MOMO' | 'MOMO_CODE';
  }) => {
    setShowPayment(false);
    refreshSessionsInBackground();
    if (!selectedSessionId) return;
    setEbmInitialPhone(ctx?.momoPhoneNumber);
    const paidSession =
      recentSessions.find((s) => s.id === selectedSessionId) ||
      stats?.recentSessions.find((s: Session) => s.id === selectedSessionId);
    const ebmEnabled = ctx?.chargerGenerateEbm ?? paidSession?.charger?.generateEbm ?? false;
    if (ebmEnabled === true && ctx?.paymentMethod !== 'MOMO_CODE') {
      setEbmSessionId(selectedSessionId);
      setShowEbmPopup(true);
    }
  };

  // Deep link via ?sessionId=… — try memory then a targeted lookup.
  useEffect(() => {
    if (!sharedSessionId || hasConsumed(sharedSessionId)) return;
    const fromMemory = [...activeSessions, ...recentSessions, ...(stats?.recentSessions ?? [])].find(
      (s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId,
    );
    if (fromMemory) {
      markConsumed(sharedSessionId);
      setSelectedSession(fromMemory);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getOperatorSessionsPaginated({ page: 1, limit: 1, sessionId: sharedSessionId });
        const match = res.sessions.find(
          (s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId,
        );
        if (!cancelled && match) {
          markConsumed(sharedSessionId);
          setSelectedSession(match);
        }
      } catch {
        /* share link may target another operator */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedSessionId, activeSessions, recentSessions, stats?.recentSessions, hasConsumed, markConsumed]);

  useEffect(() => {
    const fetchOperatorData = async () => {
      try {
        setIsLoadingStats(true);
        await fetchUserProfileWithFallback(user);

        let activeData: Session[] = [];
        try {
          activeData = await getOperatorActiveSessions();
        } catch {
          activeData = [];
        }
        setActiveSessions(activeData);

        let todayData: Session[] = [];
        try {
          // Only fetch today's sessions for the KPI stats — fetching an
          // operator's full history can be tens of thousands of rows.
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          todayData = filterTodaySessions(await getOperatorSessions(startOfToday));
        } catch {
          todayData = [];
        }

        getOperatorSessionAlerts().then(setSessionAlerts).catch(() => setSessionAlerts(null));

        let latest: Session[] = [];
        try {
          latest = await getOperatorLatestSessions();
        } catch {
          latest = [];
        }
        setRecentSessions(latest);

        setStats(calculateDashboardStats(todayData, activeData.length, latest));
      } catch (error) {
        console.error('Error fetching operator data:', error);
        toast.error('Failed to load dashboard data');
        setStats(EMPTY_STATS);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchOperatorData();
  }, [user]);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  const refreshRecentAndActive = useCallback(async () => {
    const updated = await getOperatorLatestSessions().catch(() => null);
    if (updated) setRecentSessions(updated);
    refreshActiveSessions().catch(() => {});
  }, [refreshActiveSessions, setRecentSessions]);

  const alertTiles = useMemo(() => {
    if (!sessionAlerts) return [];
    const tiles: Array<{ key: string; count: number; label: string; icon: React.ReactNode; cls: string; style?: React.CSSProperties }> = [];
    if (sessionAlerts.unpaidTotal > 0)
      tiles.push({ key: 'unpaid', count: sessionAlerts.unpaidTotal, label: 'Unpaid all', icon: <AlertCircle className="h-4 w-4" />, cls: 'border-[#4561DE] bg-[#4561DE] hover:bg-[#3a54c9]', style: { color: '#fff' } });
    if (sessionAlerts.unpaidToday > 0)
      tiles.push({ key: 'unpaid-today', count: sessionAlerts.unpaidToday, label: 'Unpaid today', icon: <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400" />, cls: 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:text-orange-300' });
    if (sessionAlerts.needsInfoTotal > 0)
      tiles.push({ key: 'needs-info', count: sessionAlerts.needsInfoTotal, label: 'Needs info all', icon: <UserPlus className="h-4 w-4 text-gray-900" />, cls: 'border-[#FFD400] bg-[#FFD400] hover:bg-[#FFD400]/90 text-gray-900 dark:border-[#FFD400] dark:bg-[#FFD400] dark:hover:bg-[#FFD400]/90 dark:text-gray-900' });
    if (sessionAlerts.needsInfoToday > 0)
      tiles.push({ key: 'needs-info-today', count: sessionAlerts.needsInfoToday, label: 'Needs info today', icon: <UserPlus className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />, cls: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-300' });
    return tiles;
  }, [sessionAlerts]);

  const headline = user?.firstName ? `${greeting}, ${user.firstName}` : greeting;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHead
        title={headline}
        sub="Your operator workspace"
        actions={
          <Link href={`${operatorBase}/charge`}>
            <Btn variant="primary" icon="bolt">Start session</Btn>
          </Link>
        }
      />

      {/* Shift status */}
      <Card>
        <ShiftStatusIndicator />
        <div className="mt-4">
          <Link href={`${operatorBase}/shifts`}>
            <Btn variant="default" icon="clock">Check in / out</Btn>
          </Link>
        </div>
      </Card>

      {/* KPIs */}
      <SummaryStrip
        items={[
          { label: 'Sessions today', value: stats ? fmtNumber(stats.totalSessions) : '—' },
          { label: 'Energy today', value: <>{stats ? fmtNumber(stats.totalKwh) : '—'} <small>kWh</small></> },
          { label: 'Revenue today', value: <>{stats ? fmtCompact(stats.totalRevenue) : '—'} <small>RWF</small></> },
          { label: 'Active now', value: stats ? stats.activeSessionsCount : '—', delta: activeSessions.length ? 'charging' : undefined, deltaKind: 'info' },
        ]}
      />

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Active charging sessions ({activeSessions.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeSessions.map((session) => (
              <ActiveSessionCard
                key={session.id}
                session={session}
                onEndSession={(s) => handleEndSession(s)}
                onEndRemoteSession={sessionCardActions.openEndRemoteDialog}
                onTransfer={sessionCardActions.openTransferDialog}
                onView={handleViewSessionDetails}
                onAddCustomerInfo={sessionCardActions.openCustomerInfoDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sessions needing attention */}
      {alertTiles.length > 0 && (
        <Link href={consoleSessionsHref}>
          <SummaryStrip
            items={alertTiles.map((t) => ({
              label: t.label,
              value: t.count,
              delta: 'needs attention',
              deltaKind: t.key.startsWith('unpaid') ? 'err' as const : 'neutral' as const,
            }))}
          />
        </Link>
      )}

      {/* Recent sessions */}
      <SessionsTable
        sessions={recentSessions.length > 0 ? recentSessions : stats?.recentSessions ?? []}
        title="Recent sessions"
        description="Your latest charging sessions"
        userRole="operator"
        showStats={false}
        onViewDetails={handleViewSessionDetails}
        onEndSession={handleEndSession}
        onPaymentSession={handlePaymentSession}
        isLoading={isLoadingStats}
        emptyMessage="No recent sessions found"
        onCustomerInfoSaved={refreshRecentAndActive}
      />

      {selectedSession && (
        <OperatorSessionModal
          open={!!selectedSession}
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            setSharedSessionId(null);
          }}
        />
      )}

      {showPayment && selectedSessionId && (() => {
        const paymentSession =
          recentSessions.find((s) => s.id === selectedSessionId) ||
          stats?.recentSessions.find((s: Session) => s.id === selectedSessionId);
        if (!paymentSession) return null;
        return (
          <EnhancedPaymentDialog
            session={paymentSession}
            paymentInfo={{ isPaid: false, amount: paymentSession.totalAmount ?? 0, currency: 'RWF', requiresValidation: true }}
            onSuccess={handlePaymentComplete}
            onClose={() => setShowPayment(false)}
          />
        );
      })()}

      <SessionCardDialogs
        {...sessionCardActions}
        onCloseTransfer={sessionCardActions.closeTransferDialog}
        onCloseEndRemote={sessionCardActions.closeEndRemoteDialog}
        onEndRemoteSuccess={(sessionId) => setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))}
        onCloseCustomerInfo={sessionCardActions.closeCustomerInfoDialog}
        onCustomerInfoSaved={async () => {
          setActiveSessions(await getOperatorActiveSessions());
          getOperatorSessionAlerts().then(setSessionAlerts).catch(() => {});
        }}
      />

      <EBMOperatorPopup
        isOpen={showEbmPopup}
        onClose={() => {
          setShowEbmPopup(false);
          setEbmSessionId('');
          setEbmInitialPhone(undefined);
        }}
        onConfirm={() => {
          setShowEbmPopup(false);
          setEbmSessionId('');
          setEbmInitialPhone(undefined);
          refreshSessionsInBackground();
        }}
        onSkip={() => {
          if (ebmSessionId) generateEbm({ sessionId: ebmSessionId }).catch(() => {});
          setShowEbmPopup(false);
          setEbmSessionId('');
          setEbmInitialPhone(undefined);
        }}
        sessionId={ebmSessionId}
        initialPhone={ebmInitialPhone}
        sessionData={buildEbmPopupSessionData(
          recentSessions.find((x) => x.id === ebmSessionId) ||
            stats?.recentSessions?.find((x: Session) => x.id === ebmSessionId),
        )}
      />
    </div>
  );
}

export default function ConsoleOperatorOverviewPage() {
  return (
    <Suspense fallback={null}>
      <ConsoleOperatorOverviewBody />
    </Suspense>
  );
}
