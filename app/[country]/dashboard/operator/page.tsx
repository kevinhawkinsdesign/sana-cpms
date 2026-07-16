'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  Clock,
  Settings2,
  AlertCircle,
  CalendarClock,
  UserPlus,
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { ActiveSessionCard } from '@/components/shared/ActiveSessionCard';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { ShiftStatusIndicator } from '@/components/dashboard/Operator/ShiftStatusIndicator';
import { getAccessToken } from '@/lib/utils/authStorage';
import SessionsTable from '@/components/shared/tables/SessionsTable';
import { SessionDetailsModal } from '@/components/dashboard/sessions/SessionDetailsModal';
import { EnhancedPaymentDialog } from '@/components/dashboard/sessions/EnhancedPaymentDialog';
import { EBMOperatorPopup } from '@/components/dashboard/sessions/EBMOperatorPopup';
import {
  getOperatorActiveSessions,
  getOperatorLatestSessions,
  getOperatorSessions,
  getOperatorSessionsPaginated,
  getOperatorSessionAlerts,
  generateEbm,
  type Session,
} from '@/lib/api/chargingSessions';
import { useSharedSessionId } from '@/lib/hooks/useSharedSessionId';
import {
  type DashboardStats,
  EMPTY_STATS,
  calculateDashboardStats,
  filterTodaySessions,
  fetchUserProfileWithFallback,
} from '@/lib/utils/dashboardStats';
import { SessionCardDialogs } from '@/components/shared/SessionCardDialogs';
import { useSessionCardActions } from '@/lib/hooks/useSessionCardActions';
import { buildEbmPopupSessionData } from '@/lib/utils/ebmPopupData';
// import { 
//   getPendingShiftSwaps,
//   type ShiftSwap 
// } from '@/lib/api/shiftsAndInspections';
// import { ShiftSwapBanner } from '@/components/shared/ShiftSwapBanner';
import { toast } from 'sonner';
import { getVehicleLicensePlateNumber } from "@/lib/utils/vehicleUtils"
import QuickActions from '@/components/shared/QuickActions'
import DashboardStatsOverview from '@/components/shared/DashboardStatsOverview'
import { useOperatorLiveSessions } from '@/lib/hooks/useOperatorLiveSessions'

const OperatorDashboardBody = () => {
  const router = useLocalizedRouter();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { sharedSessionId, setSharedSessionId, hasConsumed, markConsumed } = useSharedSessionId();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);
  const [showEbmPopup, setShowEbmPopup] = useState(false);
  const [ebmSessionId, setEbmSessionId] = useState<string>("");
  const [ebmInitialPhone, setEbmInitialPhone] = useState<string | undefined>(undefined);
  const sessionCardActions = useSessionCardActions();

  // Shared operator live-session state + WebSocket wiring (also used by the
  // console operator overview).
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

  const handlePaymentComplete = (ctx?: { chargerGenerateEbm?: boolean; momoPhoneNumber?: string; paymentMethod?: 'MOMO' | 'MOMO_CODE' }) => {
    setShowPayment(false);
    refreshSessionsInBackground();
    if (!selectedSessionId) return;
    // Overwrite unconditionally (including to undefined) so a subsequent
    // non-MOMO session doesn't inherit a previous MOMO customer's phone.
    setEbmInitialPhone(ctx?.momoPhoneNumber);
    // Prefer the authoritative flag from the payment response; fall back to
    // whatever the session in local state carries (pre-existing-popup path).
    const paidSession = recentSessions.find((s) => s.id === selectedSessionId)
      || stats?.recentSessions.find((s: Session) => s.id === selectedSessionId);
    const ebmEnabled =
      ctx?.chargerGenerateEbm ?? paidSession?.charger?.generateEbm ?? false;
    // MOMO_CODE payments cannot receive an EBM — don't open the popup (the
    // backend blocks generation for them anyway).
    const ebmBlockedByPaymentMethod = ctx?.paymentMethod === 'MOMO_CODE';
    if (ebmEnabled === true && !ebmBlockedByPaymentMethod) {
      setEbmSessionId(selectedSessionId);
      setShowEbmPopup(true);
    }
  };

  const handleViewSessionDetails = (session: Session) => {
    setSelectedSession(session);
    setSharedSessionId(session.sessionId || session.id);
  };

  // Auto-open the popup when the URL carries `?sessionId=...` (shareable link).
  // Tries the in-memory active/recent lists first, then falls back to a
  // targeted backend lookup so even a session that isn't already loaded opens.
  useEffect(() => {
    if (!sharedSessionId || hasConsumed(sharedSessionId)) return;
    const fromMemory = [
      ...activeSessions,
      ...recentSessions,
      ...(stats?.recentSessions ?? []),
    ].find((s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId);
    if (fromMemory) {
      markConsumed(sharedSessionId);
      setSelectedSession(fromMemory);
      return;
    }
    // Not yet in any in-memory list — ask the backend for this one session.
    let cancelled = false;
    (async () => {
      try {
        const res = await getOperatorSessionsPaginated({
          page: 1,
          limit: 1,
          // Exact-match filter; `search` would risk a false positive.
          sessionId: sharedSessionId,
        });
        const match = res.sessions.find(
          (s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId,
        );
        if (!cancelled && match) {
          markConsumed(sharedSessionId);
          setSelectedSession(match);
        }
      } catch {
        /* silent — share link target may belong to another operator */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sharedSessionId, activeSessions, recentSessions, stats?.recentSessions, hasConsumed, markConsumed]);

  const handleEndSession = (session: Session) => {
    // Hide end session flow for REMOTE (CITRINE) sessions – they are controlled remotely
    if (session.source === 'REMOTE') return;
    const vehicleIdentifier = getVehicleLicensePlateNumber(session.vehicle);
    router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${vehicleIdentifier}`);
  };

  const handlePaymentSession = (session: Session) => {
    setSelectedSessionId(session.id);
    setShowPayment(true);
  };



  useEffect(() => {
    const fetchOperatorData = async () => {
      try {
        setIsLoadingStats(true);
        await fetchUserProfileWithFallback(user);

        let activeSessionsData: Session[] = [];
        try {
          activeSessionsData = await getOperatorActiveSessions();
        } catch (error) {
          console.error('Error fetching active sessions:', error);
          try {
            const fallbackResponse = await fetch('/api/charging-sessions/active', {
              headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            });
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              activeSessionsData = fallbackData.data.sessions || [];
            }
          } catch {
            activeSessionsData = [];
          }
        }
        setActiveSessions(activeSessionsData);

        let todaySessionsData: Session[] = [];
        try {
          const allOperatorSessions = await getOperatorSessions();
          todaySessionsData = filterTodaySessions(allOperatorSessions);
        } catch {
          todaySessionsData = [];
        }

        // Fetch alert counts from dedicated endpoint
        getOperatorSessionAlerts()
          .then(setSessionAlerts)
          .catch(() => setSessionAlerts(null));

        let latestSessionsData: Session[] = [];
        try {
          latestSessionsData = await getOperatorLatestSessions();
        } catch {
          latestSessionsData = [];
        }
        setRecentSessions(latestSessionsData);

        setStats(calculateDashboardStats(todaySessionsData, activeSessionsData.length, latestSessionsData));
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
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening in your operator dashboard today.
          </p>
        </div>
        <Button className='hidden lg:flex' variant="outline" onClick={() => router.push('/dashboard/settings')}>
          <Settings2 className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Shift Status for Operators */}
      <div className="mb-6">
        <ShiftStatusIndicator />
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={() => router.push('/dashboard/shifts')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Manage Shifts
          </Button>
        </div>
      </div>

      {/* Pending Shift Swap Notifications */}
      {
      // pendingSwaps && pendingSwaps.length > 0 && (
      //   <div className="mb-4 sm:mb-6">
      //     <ShiftSwapBanner
      //       shiftSwap={pendingSwaps[0]}
      //       currentUserName={user?.firstName}
      //       className="mb-4"
      //     />
          
          
      //     // pendingSwaps.length > 1 && (
      //     //   <div className="text-center">
      //     //     <p className="text-sm text-gray-500">
      //     //       +{pendingSwaps.length - 1} more request{pendingSwaps.length - 1 > 1 ? 's' : ''} pending
      //     //     </p>
      //     //   </div>
      //     // )
          
      //   </div>
      // )
      }

      {/* Active Sessions - Individual Cards */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Active Charging Sessions ({activeSessions.length})
              </h3>
              {/* Debug info - remove this in production */}
              <p className="text-xs text-gray-500 mt-1">
                Showing all {activeSessions.length} active sessions
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/charge/sessions')}
              className="text-sm"
            >
              View All Sessions
            </Button>
          </div>
          {/* SOC bar legend */}
          <div className="inline-flex flex-wrap items-center gap-3 text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 w-fit">
            <span className="inline-flex items-center gap-1" title="Battery level when session started">
              <span
                className="inline-block h-2 w-3 rounded-sm border border-gray-200"
                style={{
                  backgroundColor: '#0E159A',
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 2px, transparent 2px 4px)',
                }}
              />
              Came with
            </span>
            <span className="inline-flex items-center gap-1" title="Charge added this session">
              <span className="inline-block h-2 w-3 rounded-sm border border-gray-200" style={{ backgroundColor: '#0E159A' }} />
              This session
            </span>
            <span className="inline-flex items-center gap-1" title="Remaining to full">
              <span
                className="inline-block h-2 w-3 rounded-sm border border-gray-200"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #f3f4f6 0 3px, #e5e7eb 3px 6px)',
                }}
              />
              Remaining
            </span>
          </div>
          
          {/* Responsive grid: Auto-fit with optimal card sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeSessions.map((session) => (
              <ActiveSessionCard
                key={session.id}
                session={session}
                onEndSession={(s) => {
                  const vehicleIdentifier = getVehicleLicensePlateNumber(s.vehicle);
                  router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${vehicleIdentifier}`);
                }}
                onEndRemoteSession={sessionCardActions.openEndRemoteDialog}
                onTransfer={sessionCardActions.openTransferDialog}
                onView={(s) => handleViewSessionDetails(s)}
                onAddCustomerInfo={sessionCardActions.openCustomerInfoDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sessions Needing Attention */}
      {sessionAlerts && (sessionAlerts.unpaidTotal > 0 || sessionAlerts.unpaidToday > 0 || sessionAlerts.needsInfoTotal > 0 || sessionAlerts.needsInfoToday > 0) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Sessions Needing Attention</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sessionAlerts.unpaidTotal > 0 && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/charge/sessions?filter=unpaid')}
                className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-red-700 leading-none">{sessionAlerts.unpaidTotal}</p>
                  <p className="text-xs text-red-600 mt-0.5">Unpaid all</p>
                </div>
              </button>
            )}
            {sessionAlerts.unpaidToday > 0 && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/charge/sessions?filter=unpaid-today')}
                className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left transition-colors hover:bg-orange-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <CalendarClock className="h-4 w-4 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-orange-700 leading-none">{sessionAlerts.unpaidToday}</p>
                  <p className="text-xs text-orange-600 mt-0.5">Unpaid today</p>
                </div>
              </button>
            )}
            {sessionAlerts.needsInfoTotal > 0 && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/charge/sessions?filter=needs-info')}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <UserPlus className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-amber-700 leading-none">{sessionAlerts.needsInfoTotal}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Needs info all</p>
                </div>
              </button>
            )}
            {sessionAlerts.needsInfoToday > 0 && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/charge/sessions?filter=needs-info-today')}
                className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-left transition-colors hover:bg-yellow-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                  <UserPlus className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-yellow-700 leading-none">{sessionAlerts.needsInfoToday}</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Needs info today</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      <QuickActions />

      <DashboardStatsOverview stats={stats} isLoading={isLoadingStats} />

      {/* Recent Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Recent Sessions</h3>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/charge/sessions')}>
            View All
          </Button>
        </div>
        
        <SessionsTable
          sessions={recentSessions.length > 0 ? recentSessions : (stats?.recentSessions || [])}
          title="Recent Sessions"
          description="Your latest 5 charging sessions (all time)"
          userRole="operator"
          showStats={false}
          onViewDetails={handleViewSessionDetails}
          onEndSession={handleEndSession}
          onPaymentSession={handlePaymentSession}
          isLoading={isLoadingStats}
          emptyMessage="No recent sessions found"
          onCustomerInfoSaved={async () => {
            const updated = await getOperatorLatestSessions().catch(() => null);
            if (updated) setRecentSessions(updated);
            void refreshActiveSessions();
          }}
        />
      </div>

      {selectedSession && (
        <SessionDetailsModal
          open={!!selectedSession}
          session={selectedSession}
          onClose={() => { setSelectedSession(null); setSharedSessionId(null); }}
          onCustomerInfoSaved={async () => {
            const updated = await getOperatorLatestSessions().catch(() => null);
            if (updated) setRecentSessions(updated);
            void refreshActiveSessions();
          }}
        />
      )}

      {showPayment && selectedSessionId && (() => {
        const paymentSession = recentSessions.find((s) => s.id === selectedSessionId)
          || stats?.recentSessions.find((s: Session) => s.id === selectedSessionId);
        if (!paymentSession) return null;
        return (
          <EnhancedPaymentDialog
            session={paymentSession}
            paymentInfo={{
              isPaid: false,
              amount: paymentSession.totalAmount || 0,
              currency: 'RWF',
              requiresValidation: true
            }}
            onSuccess={handlePaymentComplete}
            onClose={() => setShowPayment(false)}
          />
        );
      })()}
      
      <SessionCardDialogs
        {...sessionCardActions}
        onCloseTransfer={sessionCardActions.closeTransferDialog}
        onCloseEndRemote={sessionCardActions.closeEndRemoteDialog}
        onEndRemoteSuccess={(sessionId) => {
          setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
        }}
        onCloseCustomerInfo={sessionCardActions.closeCustomerInfoDialog}
        onCustomerInfoSaved={async () => {
          const updated = await getOperatorActiveSessions();
          setActiveSessions(updated);
          getOperatorSessionAlerts().then(setSessionAlerts).catch(() => {});
        }}
      />

      {/* EBM Operator Popup - shown after payment for previously-ended sessions */}
      <EBMOperatorPopup
        isOpen={showEbmPopup}
        onClose={() => {
          setShowEbmPopup(false)
          setEbmSessionId("")
          setEbmInitialPhone(undefined)
        }}
        onConfirm={() => {
          setShowEbmPopup(false)
          setEbmSessionId("")
          setEbmInitialPhone(undefined)
          refreshSessionsInBackground()
        }}
        onSkip={() => {
          const sid = ebmSessionId
          if (sid) {
            generateEbm({ sessionId: sid }).catch(() => {})
          }
          setShowEbmPopup(false)
          setEbmSessionId("")
          setEbmInitialPhone(undefined)
        }}
        sessionId={ebmSessionId}
        initialPhone={ebmInitialPhone}
        sessionData={buildEbmPopupSessionData(
          recentSessions.find((x) => x.id === ebmSessionId)
            || stats?.recentSessions?.find((x: Session) => x.id === ebmSessionId)
        )}
      />
    </div>
  );
};

// Suspense wraps `useSearchParams` (read via `useSharedSessionId`) so a
// deep link like `?sessionId=...` resolves before the body renders.
const OperatorDashboard = () => (
  <Suspense fallback={null}>
    <OperatorDashboardBody />
  </Suspense>
);

export default OperatorDashboard;
