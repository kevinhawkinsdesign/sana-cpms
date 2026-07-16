'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { OrgAdminAccessGuard } from '@/components/shared/AdminAccessGuard';
import { Building2, Battery, Users2, Zap, Clock, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getOrganization } from '@/lib/api/organizations';
import { getAllSessions, getActiveSessions, type AdminSession } from '@/lib/api/admin';
import type { OrganizationDetail } from '@/types/organization';

export default function OrgAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useLocalizedRouter();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState({ activeSessions: 0, todaySessions: 0, todayCompleted: 0, todayRevenue: 0, todayKwh: 0 });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (authLoading || !user?.organizationId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [orgRes, activeRes, allRes] = await Promise.allSettled([
          getOrganization(user.organizationId!),
          getActiveSessions({ organizationId: user.organizationId! }),
          getAllSessions({ page: 1, limit: 100, organizationId: user.organizationId! }),
        ]);

        if (orgRes.status === 'fulfilled') setOrg(orgRes.value.data);

        const activeSessions = activeRes.status === 'fulfilled' ? activeRes.value.data.sessions.length : 0;

        if (allRes.status === 'fulfilled') {
          const all = allRes.value.data.sessions || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todaySessions = all.filter((s: AdminSession) => {
            const d = new Date(s.startTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
          });
          setStats({
            activeSessions,
            todaySessions: todaySessions.length,
            todayCompleted: todaySessions.filter((s: AdminSession) => s.sessionStatus === 'COMPLETED' || s.sessionStatus === 'PAID').length,
            todayRevenue: todaySessions.reduce((sum: number, s: AdminSession) => sum + (s.totalAmount || 0), 0),
            todayKwh: todaySessions.reduce((sum: number, s: AdminSession) => sum + (s.chargedKwh || 0), 0),
          });
        }
      } catch (e) {
        console.error('Failed to fetch org dashboard data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user?.organizationId]);

  const orgName = org?.name || user?.organization?.name || 'My Organization';
  const userCount = org?._count?.users ?? 0;
  const chargerCount = org?._count?.chargers ?? 0;

  const statCards = [
    { title: "Active Sessions", value: stats.activeSessions, icon: <Activity className="h-4 w-4 text-white" />, color: "bg-green-600" },
    { title: "Today's Sessions", value: stats.todaySessions, icon: <Zap className="h-4 w-4 text-white" />, color: "bg-orange-600", description: `${stats.todayCompleted} completed` },
    { title: "Today's Revenue", value: `${stats.todayRevenue.toLocaleString()} RWF`, icon: <BarChart3 className="h-4 w-4 text-white" />, color: "bg-blue-600" },
    { title: "Today's kWh", value: `${stats.todayKwh.toFixed(1)}`, icon: <Zap className="h-4 w-4 text-white" />, color: "bg-purple-600" },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <OrgAdminAccessGuard>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.firstName}
          </h2>
          <p className="text-muted-foreground">
            Welcome to {orgName} dashboard. Here&apos;s an overview of your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {org?.logo && <img src={org.logo} alt={orgName} className="w-10 h-10 rounded-lg object-cover" />}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{orgName}</p>
            {org?.country && <p className="text-xs text-muted-foreground">{org.country.name} ({org.country.code})</p>}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard/org-admin/sessions')}>
            <Zap className="h-4 w-4" /> View Sessions
          </Button>
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard/org-admin/chargers')}>
            <Battery className="h-4 w-4" /> Manage Chargers
          </Button>
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard/org-admin/members')}>
            <Users2 className="h-4 w-4" /> Manage Members
          </Button>
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard/org-admin/shifts')}>
            <Clock className="h-4 w-4" /> View Shifts
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Organization Overview</h3>
          <Badge variant="outline" className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`rounded-full p-2 ${card.color}`}>{card.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.description && <p className="text-xs text-muted-foreground">{card.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resource Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => router.push('/dashboard/org-admin/members')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground mt-1">operators and admins in your organization</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-300 transition-colors" onClick={() => router.push('/dashboard/org-admin/chargers')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chargers</CardTitle>
            <Battery className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{chargerCount}</div>
            <p className="text-xs text-muted-foreground mt-1">charging stations managed by your organization</p>
          </CardContent>
        </Card>
      </div>
    </div>
    </OrgAdminAccessGuard>
  );
}
