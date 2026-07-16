'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Zap, Clock, Battery, TrendingUp, DollarSign, PlayCircle } from 'lucide-react';
import { ActiveSessionCard } from '@/components/shared/ActiveSessionCard';
import SessionsTable from '@/components/shared/tables/SessionsTable';
import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSharedSessionId } from '@/lib/hooks/useSharedSessionId';
import { useUrlPagination } from '@/lib/hooks/useUrlPagination';
import { Button } from '@/components/ui/button';
import { EnhancedPaymentDialog } from '@/components/dashboard/sessions/EnhancedPaymentDialog';
import { EBMOperatorPopup } from '@/components/dashboard/sessions/EBMOperatorPopup';
import { useQueryClient } from '@tanstack/react-query';
import { SessionDetailsModal } from '@/components/dashboard/sessions/SessionDetailsModal';
import { SessionCardDialogs } from '@/components/shared/SessionCardDialogs';
import { useSessionCardActions } from '@/lib/hooks/useSessionCardActions';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/authContext';
import { UserRole } from '@/lib/utils/roleRedirect';
import {
  getOperatorSessionsPaginated,
  getOperatorActiveSessions,
  getAdminAllSessions,
  getAdminActiveSessions,
  getUserProfile,
  generateEbm,
  type Session
} from '@/lib/api/chargingSessions';
import { getVehicleLicensePlateNumber } from "@/lib/utils/vehicleUtils"
import { useOperatorWs } from '@/lib/hooks/useOperatorWs'
import { buildEbmPopupSessionData } from '@/lib/utils/ebmPopupData'

const ChargingSessionsPageBody = () => {
    const router = useLocalizedRouter();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [showPayment, setShowPayment] = useState(false);
    const [showEbmPopup, setShowEbmPopup] = useState(false);
    const [ebmSessionId, setEbmSessionId] = useState<string>("");
    const [ebmInitialPhone, setEbmInitialPhone] = useState<string | undefined>(undefined);
    const { currentPage, currentLimit: itemsPerPage, setPage, resetPage } = useUrlPagination();
    // Server-side search + status (debounced search so we don't spam backend)
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilterValue, setStatusFilterValue] = useState<string>('all');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);
    // Reset pagination via the input handlers (below) so a `?page=30` deep
    // link survives the initial mount instead of being clobbered.
    const resetIfNeeded = () => {
        if (currentPage !== 1) resetPage();
    };
    const handleSearchInputChange = (value: string) => {
        setSearchInput(value);
        resetIfNeeded();
    };
    const handleStatusFilterValueChange = (value: string) => {
        setStatusFilterValue(value);
        resetIfNeeded();
    };
    const sessionCardActions = useSessionCardActions();

    const queryClient = useQueryClient();

    // Determine if user is admin
    const isAdmin = user?.role === UserRole.ADMIN;

    const searchParams = useSearchParams();
    const urlFilter = searchParams.get('filter');
    const { sharedSessionId, setSharedSessionId, hasConsumed, markConsumed } = useSharedSessionId();

    // Server-side paginated sessions with search + status filter
    const statusParam = statusFilterValue === 'all' ? undefined : statusFilterValue;
    const searchParam = debouncedSearch || undefined;
    const { data: allSessionsData, isLoading } = useQuery({
        queryKey: ['sessions', isAdmin ? 'admin' : 'operator', currentPage, itemsPerPage, searchParam, statusParam],
        queryFn: async () => {
            const fetcher = isAdmin ? getAdminAllSessions : getOperatorSessionsPaginated;
            const response = await fetcher({
                page: currentPage,
                limit: itemsPerPage,
                search: searchParam,
                status: statusParam,
            });
            return {
                sessions: response.sessions,
                pagination: response.pagination,
            };
        },
        // Wait for auth so `isAdmin` is correct on the first fetch instead of
        // hitting the operator endpoint and immediately re-fetching.
        enabled: !isAuthLoading,
        staleTime: 60 * 1000,
    });

    const activeQueryKey = ['activeSessions', isAdmin ? 'admin' : 'operator'];

    // Session IDs whose `isPaid` was set optimistically via WS; protects against
    // a refetch that races replication lag and returns the row still unpaid.
    const optimisticallyPaidRef = useRef<Set<string>>(new Set());

    // Fetch active sessions based on user role
    const { data: activeSessions } = useQuery({
        queryKey: activeQueryKey,
        queryFn: async () => {
            const sessions = isAdmin
                ? (await getAdminActiveSessions()).sessions
                : await getOperatorActiveSessions();
            return sessions.map((s) =>
                !s.isPaid && optimisticallyPaidRef.current.has(s.id) ? { ...s, isPaid: true } : s
            );
        },
        // Same auth-resolution guard as the main paginated query above.
        enabled: !isAuthLoading,
    });

    // Real-time WebSocket updates for active sessions
    useOperatorWs({
        onConnected: () => {
            queryClient.invalidateQueries({ queryKey: activeQueryKey });
        },
        onSessionStarted: (session) => {
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) => {
                if (!prev) return [session];
                if (prev.some((s) => s.id === session.id)) return prev;
                return [session, ...prev];
            });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        // Backend-driven mutation after start (MAC auto-attribute fills
        // vehicleId). Merge by id into both the active-cards cache and the
        // paginated list so plate / make / model / VIN / battery surface
        // without a refetch. We drop `vehicle.imageUrl` — operator captures
        // the live session photo at the charger; the saved vehicle photo
        // would be misleading.
        onSessionUpdated: (session) => {
            const stripped: Session = session.vehicle
                ? { ...session, vehicle: { ...session.vehicle, imageUrl: null } }
                : session;
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) =>
                prev
                    ? prev.map((s) => (s.id === session.id ? { ...s, ...stripped } : s))
                    : prev
            );
            queryClient.setQueriesData<{ sessions: Session[]; pagination: any }>(
                { queryKey: ['sessions'] },
                (prev) => {
                    if (!prev?.sessions) return prev as any;
                    let touched = false;
                    const updated = prev.sessions.map((s) => {
                        if (s.id !== session.id) return s;
                        touched = true;
                        return { ...s, ...stripped };
                    });
                    return touched ? { ...prev, sessions: updated } : prev;
                }
            );
        },
        onSessionEnded: ({ sessionId }) => {
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) =>
                prev ? prev.filter((s) => s.id !== sessionId) : prev
            );
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        onSessionTransferred: ({ sessionId, session: transferredSession }) => {
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) => {
                if (!prev) return prev;
                const exists = prev.some((s) => s.id === sessionId);
                if (exists) return prev.filter((s) => s.id !== sessionId);
                return [transferredSession, ...prev];
            });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        onSessionTelemetry: ({ sessionId, chargedKwh, currentSoc, startSoc }) => {
            const applyPatch = (s: Session): Session => ({
                ...s,
                chargedKwh: chargedKwh ?? s.chargedKwh,
                endSoc: currentSoc ?? s.endSoc,
                // Only overwrite startSoc if backend backfilled it this tick.
                startSoc: startSoc != null ? startSoc : s.startSoc,
            });
            // Update active cards cache
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) =>
                prev ? prev.map((s) => (s.id === sessionId ? applyPatch(s) : s)) : prev
            );
            // Also patch the paginated sessions list so "Energy & SOC" updates live
            // without refetching the whole page. Covers every cached query key
            // variant (page/search/status) for both admin and operator views.
            queryClient.setQueriesData<{ sessions: Session[]; pagination: any }>(
                { queryKey: ['sessions'] },
                (prev) => {
                    if (!prev?.sessions) return prev as any;
                    let touched = false;
                    const updated = prev.sessions.map((s) => {
                        if (s.id !== sessionId) return s;
                        touched = true;
                        return applyPatch(s);
                    });
                    return touched ? { ...prev, sessions: updated } : prev;
                }
            );
        },
        onPaymentConfirmed: ({ sessionId }) => {
            optimisticallyPaidRef.current.add(sessionId);
            queryClient.setQueryData<Session[]>(activeQueryKey, (prev) =>
                prev ? prev.map((s) => (s.id === sessionId ? { ...s, isPaid: true } : s)) : prev
            );
            queryClient.invalidateQueries({ queryKey: activeQueryKey });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('MoMo payment confirmed');
        },
        onPaymentFailed: ({ reason }) => {
            queryClient.invalidateQueries({ queryKey: activeQueryKey });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.error(reason ? `MoMo payment failed: ${reason}` : 'MoMo payment failed');
        },
    });

    // Fetch user profile (only for non-admin users)
    const { data: userProfile } = useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            return await getUserProfile();
        },
        enabled: !isAdmin // Only fetch for non-admin users
    });

    const [activeFilter, setActiveFilter] = useState<string | null>(urlFilter);

    // Sync URL filter to local state on mount / URL change. We do *not* reset
    // pagination here because that would clobber `?page=30` deep links.
    // Filter-tab clicks already call resetPage() in their onClick handler.
    useEffect(() => {
      setActiveFilter(urlFilter);
    }, [urlFilter]);

    // Side query: fetch just the shared session so the popup opens regardless
    // of which page is currently visible. The main list is *not* filtered by
    // the URL sessionId, so the user keeps their context.
    //
    // Gated on `!isAuthLoading` so we don't fire against the wrong endpoint:
    // on first paint `user` is undefined → `isAdmin` is false → we'd hit the
    // operator endpoint by mistake, only to re-fetch with the admin one once
    // auth resolves.
    const sharedSessionFetcher = isAdmin ? getAdminAllSessions : getOperatorSessionsPaginated;
    const { data: sharedSessionData } = useQuery({
        queryKey: ['sharedSession', isAdmin ? 'admin' : 'operator', sharedSessionId],
        // `sessionId` is an exact-match filter — avoids the partial-match false
        // positives that `search` would otherwise produce.
        queryFn: () => sharedSessionFetcher({ page: 1, limit: 1, sessionId: sharedSessionId }),
        enabled: !!sharedSessionId && !isAuthLoading,
        staleTime: 60 * 1000,
    });
    const sharedSessionMatch = (sharedSessionData?.sessions || []).find(
        (s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId,
    );

    // Auto-open the Session Details modal when a shareable sessionId URL is opened.
    useEffect(() => {
        if (!sharedSessionId || hasConsumed(sharedSessionId)) return;
        const match =
            sharedSessionMatch ||
            (allSessionsData?.sessions || []).find(
                (s: Session) => s.sessionId === sharedSessionId || s.id === sharedSessionId,
            );
        if (match) {
            markConsumed(sharedSessionId);
            setSelectedSession(match);
        }
    }, [sharedSessionId, sharedSessionMatch, allSessionsData?.sessions, hasConsumed, markConsumed]);

    const UNPAID_STATUSES = new Set(['COMPLETED', 'PAUSED']);

    // Backend returns one page; URL preset filters (unpaid/needs-info) are
    // applied client-side on that page as composite refinements.
    const rawSessions = allSessionsData?.sessions || [];
    const serverPagination = allSessionsData?.pagination;
    const allSessions = useMemo(() => {
      if (activeFilter === 'unpaid') {
        return rawSessions.filter((s: Session) =>
          s.isPaid !== true && UNPAID_STATUSES.has(s.sessionStatus?.toUpperCase())
        );
      }
      if (activeFilter === 'unpaid-today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return rawSessions.filter((s: Session) =>
          s.isPaid !== true
          && UNPAID_STATUSES.has(s.sessionStatus?.toUpperCase())
          && new Date(s.startTime) >= todayStart
        );
      }
      if (activeFilter === 'needs-info') {
        return rawSessions.filter((s: Session) =>
          s.source === 'REMOTE' && (s as any).customerInfoAdded === false
        );
      }
      if (activeFilter === 'needs-info-today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return rawSessions.filter((s: Session) =>
          s.source === 'REMOTE'
          && (s as any).customerInfoAdded === false
          && new Date(s.startTime) >= todayStart
        );
      }
      return rawSessions;
    }, [rawSessions, activeFilter]);
    const activeSessionsList = activeSessions || [];

    // Sessions to display: whatever backend returned for this page, optionally
    // refined by URL preset filter. Pagination mirrors the server response.
    const sessions = allSessions;
    const pagination = {
        page: serverPagination?.page || currentPage,
        limit: serverPagination?.limit || itemsPerPage,
        total: serverPagination?.total ?? sessions.length,
        totalPages: serverPagination?.totalPages || 1
    };

    const handlePageChange = (page: number) => {
        setPage(page);
    };




    // Calculate comprehensive statistics from ALL sessions (all-time data)
    const calculateStats = () => {
        // Use allSessions for statistics (all-time data for both admin and operator)
        const totalSessions = pagination?.total || allSessions.length; // Use pagination total if available
        const totalEnergy = allSessions.reduce((sum: number, session: Session) => sum + (session.chargedKwh || 0), 0);
        const totalRevenue = allSessions.reduce((sum: number, session: Session) => sum + (session.totalAmount || 0), 0);
        const averageSession = allSessions.length > 0 ? totalEnergy / allSessions.length : 0;
        const completedSessions = allSessions.filter((s: Session) => {
            const status = (s.sessionStatus || '').toUpperCase();
            return status === 'COMPLETED' || status === 'PAID';
        }).length;
        const activeSessions = allSessions.filter((s: Session) => {
            const status = (s.sessionStatus || '').toUpperCase();
            return status === 'STARTED' || status === 'PAUSED';
        }).length;
        const pausedSessions = allSessions.filter((s: Session) => (s.sessionStatus || '').toUpperCase() === 'PAUSED').length;
        const averageRevenue = allSessions.length > 0 ? totalRevenue / allSessions.length : 0;

        return {
            totalSessions,
            totalEnergy,
            totalRevenue,
            averageSession,
            completedSessions,
            activeSessions,
            pausedSessions,
            averageRevenue
        };
    };

    const stats = calculateStats();

    const statsCards = [
        {
            title: 'Total Sessions',
            value: stats.totalSessions,
            description: 'All time sessions',
            icon: <Zap className="h-4 w-4 text-white" />,
            color: 'bg-[#1E3A8A]',
            trend: `${stats.completedSessions} completed`
        },
        {
            title: 'Total Energy',
            value: `${stats.totalEnergy.toFixed(1)} kWh`,
            description: 'Total energy delivered',
            icon: <Battery className="h-4 w-4 text-white" />,
            color: 'bg-[#F59E0B]',
            trend: `${stats.averageSession.toFixed(1)} kWh avg`
        },
        {
            title: 'Total Revenue',
            value: `${stats.totalRevenue.toLocaleString()} RWF`,
            description: 'Total revenue generated',
            icon: <DollarSign className="h-4 w-4 text-white" />,
            color: 'bg-[#FFD400]',
            trend: `${stats.averageRevenue.toFixed(0)} RWF avg`
        },
        {
            title: 'Active Sessions',
            value: stats.activeSessions,
            description: 'Currently in progress',
            icon: <Clock className="h-4 w-4 text-white" />,
            color: 'bg-[#EF4444]',
            trend: stats.activeSessions > 0 ? `${stats.pausedSessions} paused` : 'All completed'
        }
    ];

    const handlePaymentComplete = (ctx?: { chargerGenerateEbm?: boolean; momoPhoneNumber?: string; paymentMethod?: 'MOMO' | 'MOMO_CODE' }) => {
        setShowPayment(false);
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
        queryClient.refetchQueries({ queryKey: ['sessions'] });
        queryClient.refetchQueries({ queryKey: ['activeSessions'] });
        if (!selectedSessionId) return;
        // Overwrite unconditionally (including to undefined) so a subsequent
        // non-MOMO session doesn't inherit a previous MOMO customer's phone.
        setEbmInitialPhone(ctx?.momoPhoneNumber);
        const paidSession = sessions.find((s: Session) => s.id === selectedSessionId);
        const ebmEnabled =
            ctx?.chargerGenerateEbm ?? paidSession?.charger?.generateEbm ?? false;
        // MOMO_CODE payments cannot receive an EBM — don't open the popup.
        const ebmBlockedByPaymentMethod = ctx?.paymentMethod === 'MOMO_CODE';
        if (ebmEnabled === true && !ebmBlockedByPaymentMethod) {
            setEbmSessionId(selectedSessionId);
            setShowEbmPopup(true);
        }
    };

    const handleEndSession = (session: Session) => {
        const status = (session.sessionStatus || '').toUpperCase();
        if ((session as any).source === 'REMOTE') return;
        if (status === 'STARTED' || status === 'PAUSED') {
            const vehicleIdentifier = getVehicleLicensePlateNumber(session.vehicle) || session.vehicleId;
            router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${vehicleIdentifier}`);
        }
    };

    const handlePaymentSession = (session: Session) => {
        setSelectedSessionId(session.id);
        setShowPayment(true);
    };

    return (
        <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {isAdmin ? 'All Charging Sessions' : 'Charging Sessions'}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        {isAdmin 
                            ? 'View and manage all charging sessions from all users' 
                            : 'View and manage all your charging sessions'
                        }
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => router.push('/dashboard')}
                        className="w-full sm:w-auto"
                    >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                        <span className="sm:hidden">Dashboard</span>
                    </Button>
                    <Button 
                        onClick={() => router.push('/dashboard/charge/session?op=start')}
                        className="w-full sm:w-auto"
                    >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Start New Session</span>
                        <span className="sm:hidden">Start Session</span>
                    </Button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: null, label: 'All' },
                { key: 'unpaid', label: 'Unpaid' },
                { key: 'unpaid-today', label: 'Unpaid Today' },
                { key: 'needs-info', label: 'Needs Info' },
                { key: 'needs-info-today', label: 'Needs Info Today' },
              ].map(({ key, label }) => {
                const isActive = activeFilter === key;
                return (
                  <Button
                    key={label}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setActiveFilter(key);
                      if (currentPage !== 1) resetPage();
                      // Update URL without full navigation
                      const url = key
                        ? `/dashboard/charge/sessions?filter=${key}`
                        : '/dashboard/charge/sessions';
                      router.push(url);
                    }}
                  >
                    {label}
                    {isActive && key && (
                      <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
                        {allSessions.length}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Active Sessions - Shared Cards */}
            {activeSessionsList.length > 0 && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            Active Charging Sessions ({activeSessionsList.length})
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Showing all {activeSessionsList.length} active sessions
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeSessionsList.map((session) => (
                            <ActiveSessionCard
                                key={session.id}
                                session={session}
                                onEndSession={(s) => {
                                    const vehicleIdentifier = getVehicleLicensePlateNumber(s.vehicle);
                                    router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${vehicleIdentifier}`);
                                }}
                                onEndRemoteSession={sessionCardActions.openEndRemoteDialog}
                                onTransfer={sessionCardActions.openTransferDialog}
                                onView={(s) => { setSelectedSession(s); setSharedSessionId(s.sessionId || s.id); }}
                                onAddCustomerInfo={sessionCardActions.openCustomerInfoDialog}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat, index) => (
                    <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-1.5 sm:p-2 rounded-lg ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="text-lg sm:text-2xl font-bold text-foreground mb-2">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mb-3">{stat.description}</p>
                            {stat.trend && (
                                <div className="flex items-center text-xs text-green-600">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {stat.trend}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Sessions Table */}
            <SessionsTable
                sessions={sessions}
                isLoading={isLoading}
                highlightedSessionId={sharedSessionId || selectedSession?.sessionId || selectedSession?.id || null}
                title={isAdmin ? 'All Sessions' : 'Session History'}
                description={isAdmin 
                    ? 'View and manage all charging sessions from all users' 
                    : 'View and manage all your charging sessions'
                }
                userRole={isAdmin ? 'admin' : 'operator'}
                showStats={true}
                showPagination={true}
                currentPage={pagination?.page || currentPage}
                totalPages={pagination?.totalPages || 1}
                totalItems={pagination?.total || sessions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onViewDetails={(session) => { setSelectedSession(session); setSharedSessionId(session.sessionId || session.id); }}
                onEndSession={handleEndSession}
                onPaymentSession={handlePaymentSession}
                searchValue={searchInput}
                onSearchChange={handleSearchInputChange}
                statusValue={statusFilterValue}
                onStatusChange={handleStatusFilterValueChange}
                onAddVehicleInfo={sessionCardActions.openCustomerInfoDialog}
                onCustomerInfoSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                    queryClient.invalidateQueries({ queryKey: activeQueryKey });
                    queryClient.refetchQueries({ queryKey: ['sessions'] });
                }}
            />

            {/* Dialogs */}
            {selectedSession && (
                <SessionDetailsModal
                    open={!!selectedSession}
                    session={selectedSession}
                    onClose={() => { setSelectedSession(null); setSharedSessionId(null); }}
                    onCustomerInfoSaved={() => {
                        queryClient.invalidateQueries({ queryKey: ['sessions'] });
                        queryClient.refetchQueries({ queryKey: ['sessions'] });
                    }}
                />
            )}

            {showPayment && selectedSessionId && (() => {
                const paymentSession = sessions.find((s: Session) => s.id === selectedSessionId);
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
                onCloseCustomerInfo={sessionCardActions.closeCustomerInfoDialog}
                onCustomerInfoSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                    queryClient.invalidateQueries({ queryKey: activeQueryKey });
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
                    queryClient.invalidateQueries({ queryKey: ['sessions'] })
                    queryClient.refetchQueries({ queryKey: ['sessions'] })
                    queryClient.invalidateQueries({ queryKey: activeQueryKey })
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
                    allSessions.find((x: Session) => x.id === ebmSessionId)
                )}
            />

        </div>
    );
};

// Wrap in Suspense because the body reads `useSearchParams` — without it,
// Next.js can render the page before the URL hooks hydrate, which means a
// deep link like `?page=23` paints page 1 on first load.
const ChargingSessionsPage = () => (
  <Suspense fallback={null}>
    <ChargingSessionsPageBody />
  </Suspense>
);

export default ChargingSessionsPage; 