'use client';

import { Suspense, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  Battery,
  Building2,
  IdCard,
  DollarSign,
  Eye,
  BarChart3,
  Zap,
  Clock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import {
  getActiveSessions,
  getAllSessions,
  deleteChargingSession,
  type AdminSession,
} from '@/lib/api/admin';
import SessionsTable from '@/components/shared/tables/SessionsTable';
import { StatCard } from '@/components/shared/StatCard';
import { DeleteSessionDialog } from '@/components/dashboard/admin/DeleteSessionDialog';
import { useSharedSessionId } from '@/lib/hooks/useSharedSessionId';

interface AdminStats {
  totalUsers: number;
  totalChargers: number;
  activeSessions: number;
  totalKabisaIds: number;
  totalSessions: number;
  completedSessions: number;
  totalRevenue: number;
  totalKwh: number;
  systemHealth: 'good' | 'warning' | 'critical';
}


const AdminDashboardBody = () => {
  const router = useLocalizedRouter();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [todaySessions, setTodaySessions] = useState<AdminSession[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<AdminSession | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const goToSessionPage = (sid: string) =>
    router.push(`/dashboard/admin/sessions/${sid}`);
  const { sharedSessionId, setSharedSessionId, hasConsumed, markConsumed } = useSharedSessionId();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setIsLoadingStats(true);
        
        // Fetch session-related data only
        const [activeSessionsResponse, allSessionsResponse] = await Promise.allSettled([
          getActiveSessions(),
          getAllSessions({ page: 1, limit: 1000 })
        ]);

        // Process responses
        const allSessions = allSessionsResponse.status === 'fulfilled' ? allSessionsResponse.value.data.sessions : [];
        const activeSessionsFromAll = allSessions.filter((session: AdminSession) => {
          const status = (session.sessionStatus || '').toUpperCase();
          return status === 'STARTED' || status === 'PAUSED';
        }).length;
        const activeSessions = allSessions.length > 0
          ? activeSessionsFromAll
          : activeSessionsResponse.status === 'fulfilled'
            ? activeSessionsResponse.value.data.sessions.length
            : 0;

        // Filter today's sessions first
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySessionsData = allSessions.filter((session: AdminSession) => {
          const sessionDate = new Date(session.startTime);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === today.getTime();
        });

        // Calculate TODAY'S session statistics
        const todayTotalSessions = todaySessionsData.length;
        const todayCompletedSessions = todaySessionsData.filter((session: AdminSession) => 
          session.sessionStatus === 'COMPLETED' || session.sessionStatus === 'PAID'
        ).length;
        const todayTotalRevenue = todaySessionsData.reduce((sum: number, session: AdminSession) => sum + (session.totalAmount || 0), 0);
        const todayTotalKwh = todaySessionsData.reduce((sum: number, session: AdminSession) => sum + (session.chargedKwh || 0), 0);

        // Calculate system health based on session data
        const systemHealth: 'good' | 'warning' | 'critical' = 
          activeSessions >= 0 ? 'good' : 'warning';

        const realStats: AdminStats = {
          totalUsers: 0, // Not displayed anymore
          totalChargers: 0, // Not displayed anymore
          activeSessions,
          totalKabisaIds: 0, // Not displayed anymore
          totalSessions: todayTotalSessions, // Today's sessions
          completedSessions: todayCompletedSessions, // Today's completed
          totalRevenue: todayTotalRevenue, // Today's revenue
          totalKwh: todayTotalKwh, // Today's kWh
          systemHealth
        };
        
        setStats(realStats);
        setTodaySessions(todaySessionsData);
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setStats({
          totalUsers: 0, // Not displayed anymore
          totalChargers: 0, // Not displayed anymore
          activeSessions: 0,
          totalKabisaIds: 0, // Not displayed anymore
          totalSessions: 0,
          completedSessions: 0,
          totalRevenue: 0,
          totalKwh: 0,
          systemHealth: 'warning'
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAdminData();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleViewSessionDetails = (session: AdminSession) => {
    goToSessionPage(session.sessionId);
  };

  // Backwards-compat: old shareable URLs use `?sessionId=…`. Redirect to the
  // path-based standalone session page.
  useEffect(() => {
    if (!sharedSessionId || hasConsumed(sharedSessionId)) return;
    markConsumed(sharedSessionId);
    setSharedSessionId(null);
    goToSessionPage(sharedSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedSessionId]);

  const handleEndSession = (session: AdminSession) => {
    // TODO: Implement end session functionality
    console.log('End session:', session);
    toast.info('End session functionality coming soon');
  };

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) => deleteChargingSession(sessionId, reason),
    onSuccess: (response) => {
      // Refresh the data by refetching
      const fetchAdminData = async () => {
        try {
          const [activeSessionsResponse, allSessionsResponse] = await Promise.all([
            getActiveSessions(),
            getAllSessions({ page: 1, limit: 100 })
          ]);

          const allSessions = allSessionsResponse.data.sessions;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todaySessionsData = allSessions.filter((session: AdminSession) => {
            const sessionDate = new Date(session.startTime);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === today.getTime();
          });

          // Calculate today's statistics
          const todayTotalSessions = todaySessionsData.length;
          const todayCompletedSessions = todaySessionsData.filter((s: AdminSession) => 
            s.sessionStatus === 'COMPLETED' || s.sessionStatus === 'PAID'
          ).length;
          const todayTotalRevenue = todaySessionsData.reduce((sum: number, session: AdminSession) => sum + (session.totalAmount || 0), 0);
          const todayTotalKwh = todaySessionsData.reduce((sum: number, session: AdminSession) => sum + (session.chargedKwh || 0), 0);

          const activeSessionsCount = allSessions.filter((session: AdminSession) => {
            const status = (session.sessionStatus || '').toUpperCase();
            return status === 'STARTED' || status === 'PAUSED';
          }).length;

          setTodaySessions(todaySessionsData);
          setStats({
            totalUsers: 0, // Not displayed anymore
            totalChargers: 0, // Not displayed anymore
            activeSessions: activeSessionsCount,
            totalKabisaIds: 0, // Not displayed anymore
            totalSessions: todayTotalSessions, // Today's sessions
            completedSessions: todayCompletedSessions, // Today's completed
            totalRevenue: todayTotalRevenue, // Today's revenue
            totalKwh: todayTotalKwh, // Today's kWh
            systemHealth: 'good' as const
          });
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };
      fetchAdminData();
      toast.success('Session moved to Archive');
      if (response?.data?.airtableWarning) toast.warning(response.data.airtableWarning);
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete session');
    }
  });

  const handleDeleteSession = (session: AdminSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };



  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground">
            Welcome to the admin dashboard. Here's an overview of your system.
          </p>
        </div>
       
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/users')}
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Button>

          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/chargers')}
          >
            <Battery className="h-4 w-4" />
            Manage Chargers
          </Button>

          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/sessions')}
          >
            <Zap className="h-4 w-4" />
            Manage Sessions
          </Button>

          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/shifts')}
          >
            <Clock className="h-4 w-4" />
            Manage Shifts
          </Button>

          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/shifts/reports')}
          >
            <BarChart3 className="h-4 w-4" />
            Shift Reports
          </Button>

          <Button 
            variant="outline" 
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/businesses')}
          >
            <Building2 className="h-4 w-4" />
            Business Management
          </Button>

          <Button
            variant="outline"
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/kabisa-ids')}
          >
            <IdCard className="h-4 w-4" />
            Kabisa IDs
          </Button>

          <Button
            variant="outline"
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/plu-reports')}
          >
            <BarChart3 className="h-4 w-4" />
            PLU Report
          </Button>

          <Button
            variant="outline"
            size="default"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/dashboard/admin/xz-reports')}
          >
            <BarChart3 className="h-4 w-4" />
            X/Z Reports
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">System Overview</h3>
          <Badge variant="outline" className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
        
        {/* Session-Related Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sessions"
            value={stats?.totalSessions || 0}
            description={`${stats?.completedSessions || 0} completed today`}
            icon={<Zap className="h-4 w-4 text-white" />}
            isLoading={isLoadingStats}
            trend="Live data"
            color="bg-orange-600"
          />
          <StatCard
            title="Active Sessions"
            value={stats?.activeSessions || 0}
            description="Currently charging"
            icon={<Clock className="h-4 w-4 text-white" />}
            isLoading={isLoadingStats}
            trend="Live monitoring"
            color="bg-purple-600"
          />
          <StatCard
            title="Today's Revenue"
            value={`${stats?.totalRevenue?.toLocaleString() || '0'} RWF`}
            description="Revenue generated today"
            icon={<DollarSign className="h-4 w-4 text-white" />}
            isLoading={isLoadingStats}
            trend="Live data"
            color="bg-emerald-600"
          />
          <StatCard
            title="Today's Energy"
            value={`${stats?.totalKwh?.toFixed(1) || '0.0'} kWh`}
            description="Energy delivered today"
            icon={<BarChart3 className="h-4 w-4 text-white" />}
            isLoading={isLoadingStats}
            trend="Live data"
            color="bg-indigo-600"
          />
        </div>
      </div>

      {/* Today's Sessions Table */}
      <SessionsTable
        sessions={todaySessions}
        title="Today's Sessions"
        description="Monitor today's charging sessions and track real-time activity"
        userRole="admin"
        showStats={true}
        onViewDetails={handleViewSessionDetails}
        onDeleteSession={handleDeleteSession}
        onEndSession={handleEndSession}
        customActions={[
          {
            label: "View All Sessions",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => router.push('/dashboard/admin/sessions'),
            variant: 'default'
          }
        ]}
      />


      {/* Delete → move to archive (requires a reason). Shared with the sessions page. */}
      <DeleteSessionDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => { setIsDeleteDialogOpen(open); if (!open) setSessionToDelete(null); }}
        session={sessionToDelete}
        isDeleting={deleteSessionMutation.isPending}
        onConfirm={(reason) => { if (sessionToDelete) deleteSessionMutation.mutate({ sessionId: sessionToDelete.id, reason }); }}
      />

    </div>
  );
};

// Suspense wraps `useSearchParams` (via `useSharedSessionId`) so a deep link
// like `?sessionId=...` resolves before the body renders.
const AdminDashboard = () => (
  <Suspense fallback={null}>
    <AdminDashboardBody />
  </Suspense>
);

export default AdminDashboard;
