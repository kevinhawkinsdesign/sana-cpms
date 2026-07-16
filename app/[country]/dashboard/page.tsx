'use client';

import { useEffect, useState } from 'react';
import {
  StopCircle,
  History,
  Clock,
  Settings2,
  Battery,
  Car,
  Settings,
  Eye,
  ArrowRight,
} from 'lucide-react';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChargingIndicator from '@/components/shared/ChargingIndicator';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { getAccessToken } from '@/lib/utils/authStorage';
import { UserRole } from '@/lib/utils/roleRedirect';
import { ShiftStatusIndicator } from '@/components/dashboard/Operator/ShiftStatusIndicator';
import SharedTable from '@/components/shared/tables/SharedTable';
import { SessionDetailsModal } from '@/components/dashboard/sessions/SessionDetailsModal';
import { SessionTransferDialog } from '@/components/dashboard/sessions/SessionTransferDialog';
import {
  getOperatorActiveSessions,
  getOperatorLatestSessions,
  getOperatorSessions,
  getAdminAllSessions,
  getAdminActiveSessions,
  type Session
} from '@/lib/api/chargingSessions';
import { getAdminSessionStats } from '@/lib/api/admin';
import {
  type DashboardStats,
  EMPTY_STATS,
  calculateDashboardStats,
  filterTodaySessions,
  fetchUserProfileWithFallback,
} from '@/lib/utils/dashboardStats';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { getVehicleLicensePlateNumber } from "@/lib/utils/vehicleUtils"
import { getStatusDisplayLabel, getStatusDisplayColor } from '@/lib/utils/formatters'
import QuickActions from '@/components/shared/QuickActions'
import DashboardStatsOverview from '@/components/shared/DashboardStatsOverview'

const DashboardHome = () => {
  const router = useLocalizedRouter();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferSession, setTransferSession] = useState<Session | null>(null);

  // Column definitions for recent sessions table
  const recentSessionsColumns: ColumnDef<Session>[] = [
    {
      accessorKey: 'vehicle',
      header: 'Vehicle',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gray-100">
            <Car className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">
              {row.original.carModelMake || `${row.original.vehicle?.make} ${row.original.vehicle?.model}` || 'Unknown Vehicle'}
            </div>
            <div className="text-sm text-muted-foreground"> 
              {row.original.vehicle?.kabisaId || row.original.vehicleId}
            </div>
            {row.original.vehicle?.licensePlates?.[0]?.licencePlateNumber && (
              <div className="text-xs text-blue-600 font-medium">
                {row.original.vehicle.licensePlates[0].licencePlateNumber}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'charger',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gray-100">
            <Settings className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">
              {row.original.charger?.name || 'Unknown Charger'}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.original.charger?.kabisaId || row.original.chargerId}
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'sessionTime',
      header: 'Session Time',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {new Date(row.original.startTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(row.original.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          {row.original.endTime && (
            <div className="text-xs text-gray-500">
              Duration: {Math.round((new Date(row.original.endTime).getTime() - new Date(row.original.startTime).getTime()) / (1000 * 60))} min
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'energy',
      header: 'Energy & SOC',
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{row.original.startSoc}% → {row.original.endSoc || 'N/A'}%</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.chargedKwh || 'N/A'} kWh
          </div>
        </div>
      )
    },
    {
      accessorKey: 'payment',
      header: 'Payment',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.totalAmount ? `${row.original.totalAmount.toLocaleString()} RWF` : 'N/A'}
          </div>
          <div className="text-sm text-muted-foreground">
            Pending
          </div>
        </div>
      )
    },
    {
      accessorKey: 'sessionStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.sessionStatus;
        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
        const normalizedStatus = status?.toUpperCase() || '';

        switch (normalizedStatus) {
          case 'STARTED':
            badgeVariant = "secondary";
            break;
          case 'COMPLETED':
            badgeVariant = "destructive"; // Red for UNPAID
            break;
          case 'CANCELLED':
            badgeVariant = "destructive";
            break;
          default:
            badgeVariant = "outline";
        }

        return (
          <Badge variant={badgeVariant} className={`capitalize ${getStatusDisplayColor(status)}`}>
            {getStatusDisplayLabel(status)}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSession(row.original);
            }}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.sessionStatus === 'STARTED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${getVehicleLicensePlateNumber(row.original.vehicle)}`);
              }}
              className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              End
            </Button>
          )}
        </div>
      )
    }
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingStats(true);

        await fetchUserProfileWithFallback(user);
        const isAdmin = user?.role === UserRole.ADMIN;

        let activeSessionsData: Session[] = [];
        let activeSessionsTotal = 0;
        try {
          if (isAdmin) {
            const response = await getAdminActiveSessions();
            activeSessionsData = response.sessions || [];
            activeSessionsTotal = response.pagination?.total ?? activeSessionsData.length;
          } else {
            activeSessionsData = await getOperatorActiveSessions();
            activeSessionsTotal = activeSessionsData.length;
          }
        } catch {
          try {
            const fallbackResponse = await fetch('/api/charging-sessions/active', {
              headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            });
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              activeSessionsData = fallbackData.data.sessions || [];
              activeSessionsTotal = fallbackData.data.pagination?.total ?? activeSessionsData.length;
            }
          } catch {
            activeSessionsData = [];
          }
        }
        setActiveSessions(activeSessionsData);

        let latestSessionsData: Session[] = [];
        try {
          if (isAdmin) {
            const response = await getAdminAllSessions({ page: 1, limit: 5 });
            latestSessionsData = response.sessions || [];
          } else {
            latestSessionsData = await getOperatorLatestSessions();
          }
        } catch {
          latestSessionsData = [];
        }
        setRecentSessions(latestSessionsData);

        if (isAdmin) {
          // Use server-side aggregation for accurate stats — never truncated by row limits
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          try {
            const statsResponse = await getAdminSessionStats({
              startDate: startOfToday.toISOString(),
              endDate: endOfToday.toISOString(),
            });
            const s = statsResponse.data.stats;
            const averageSession = s.totalSessions > 0 ? s.totalKwh / s.totalSessions : 0;
            setStats({
              totalSessions: s.totalSessions,
              totalKwh: s.totalKwh,
              totalRevenue: s.totalRevenue,
              averageSession,
              activeSessionsCount: activeSessionsTotal,
              recentSessions: latestSessionsData,
              todayCompletedSessions: s.completedSessions,
            });
          } catch {
            setStats({ ...EMPTY_STATS, recentSessions: latestSessionsData });
          }
        } else {
          let todaySessionsData: Session[] = [];
          try {
            const allSessions = await getOperatorSessions();
            todaySessionsData = filterTodaySessions(allSessions);
          } catch {
            todaySessionsData = [];
          }
          setStats(calculateDashboardStats(todaySessionsData, activeSessionsTotal, latestSessionsData));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
        setStats(EMPTY_STATS);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Check if user is an operator to show right sidebar and shift status
  const isOperator = user?.role === UserRole.OPERATOR;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening in your dashboard today.
          </p>
        </div>
        <Button className='hidden lg:flex' variant="outline" onClick={() => router.push('/dashboard/settings')}>
          <Settings2 className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

        {/* Shift Status for Operators */}
        {isOperator && (
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
        )}

        {/* Active Sessions Banner - Prominently Displayed */}
        {activeSessions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-100">
                  <ChargingIndicator />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">
                    Active Charging Session{activeSessions.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-600">
                    {activeSessions.length} session{activeSessions.length > 1 ? 's' : ''} currently in progress
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => {
                    const vehicle = activeSessions[0]?.vehicle
                    const vehicleIdentifier = getVehicleLicensePlateNumber(vehicle)
                    router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${vehicleIdentifier}`)
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                  size="sm"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  End Session
                </Button>
                <Button
                  onClick={() => { setTransferSession(activeSessions[0] || null); setShowTransferDialog(true); }}
                  className="bg-black hover:bg-gray-800 text-white font-medium"
                  size="sm"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
                <Button
                  onClick={() => setSelectedSession(activeSessions[0])}
                  className="bg-white text-black border border-gray-300 hover:bg-gray-50 font-medium"
                  size="sm"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/charge/sessions')}
                  className="bg-white text-black border border-gray-300 hover:bg-gray-50 font-medium"
                  size="sm"
                >
                  View All Sessions
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions Details - Commented Out */}
        {/* {activeSessions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Active Sessions ({activeSessions.length})
              </h3>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/charge/sessions')}
                className="text-sm"
              >
                View All Sessions
              </Button>
            </div>
            
            <div className="grid gap-4">
              {activeSessions.map(session => (
                <Card key={session.id} className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-yellow-100">
                          <ChargingIndicator />
                        </div>
              <div>
                          <CardTitle className="text-lg font-medium text-yellow-800">
                            {session.carModelMake || 'Vehicle'}
                          </CardTitle>
                          <CardDescription className="text-yellow-700">
                            Vehicle {session.vehicle?.kabisaId || session.vehicleId} at {session.charger?.name || 'Unknown Charger'}
                </CardDescription>
              </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        IN PROGRESS
                      </Badge>
            </div>
          </CardHeader>
          <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-yellow-700 font-medium">Started:</span>
                        <p className="text-yellow-700">
                          {new Date(session.startTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                        </p>
                      </div>
                      <div>
                        <span className="text-yellow-700 font-medium">Initial SOC:</span>
                        <p className="text-yellow-700">{session.startSoc}%</p>
                      </div>
                      <div>
                        <span className="text-yellow-700 font-medium">Duration:</span>
                        <p className="text-yellow-700">
                          {Math.round((Date.now() - new Date(session.startTime).getTime()) / (1000 * 60))} minutes
                        </p>
                </div>
                      
              </div>
                    <div className="flex gap-2 mt-4">
              <Button
                        onClick={() => router.push(`/dashboard/charge/session?op=end&vehicleIdentifier=${session.vehicle?.kabisaId || session.vehicleId}`)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium"
                        size="sm"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                        End Session Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSession(session)}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        size="sm"
                      >
                        View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
            </div>
          </div>
        )} */}

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
          
          <div className="grid gap-4">
            {stats?.recentSessions && stats.recentSessions.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div className="min-w-full">
                  <SharedTable
                    data={stats.recentSessions as any[]}
                    columns={recentSessionsColumns as any}
                    title="Recent Sessions"
                    description="Your latest 5 charging sessions (all time)"
                    isLoading={isLoadingStats}
                    searchableFields={['vehicle.kabisaId', 'charger.name', 'sessionStatus']}
                  />
                </div>
            </div>
          ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent sessions found</p>
                    <p className="text-sm mt-1">Start your first charging session to see it here</p>
                  </div>
                </CardContent>
              </Card>
                    )}
          </div>
                  </div>
                </div>

      {/* Right Sidebar - Only for Operators */}
       {/* {isOperator && (
        <div className="block">
          <OperatorShiftsStats />
            </div>
      )}  */}
      {selectedSession && (
        <SessionDetailsModal
          open={!!selectedSession}
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
      
      <SessionTransferDialog
        session={transferSession}
        isOpen={showTransferDialog}
        onClose={() => { setShowTransferDialog(false); setTransferSession(null); }}
      />
    </div>
  );
};

const DashboardPage = () => {
  const { user, isLoading } = useAuth();
  const router = useLocalizedRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on user role
      if (user.role === UserRole.ADMIN) {
        router.push('/dashboard/admin');
      } else if (user.role === UserRole.ORGANIZATION_ADMIN) {
        router.push('/dashboard/org-admin');
      } else if (user.role === UserRole.OPERATOR) {
        router.push('/dashboard/operator');
      } else if (user.role === UserRole.CUSTOMER) {
        router.push('/dashboard/customer');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null
  }

  if (!user) {
    return null
  }

  // Show loading while redirecting
  return null

  // For admin and operator, show loading while redirecting
  return null
};

export default DashboardPage;