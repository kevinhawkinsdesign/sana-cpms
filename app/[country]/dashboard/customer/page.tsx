'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { useBusiness } from "@/lib/providers/BusinessProvider";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusDisplayLabel, getStatusDisplayColor } from '@/lib/utils/formatters';
import { 
  Car, 
  CreditCard, 
  History, 
  Users, 
  Building2, 
  Wallet, 
 
  Zap,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Star,
  FileText,
  BarChart3,
  UserPlus,
  DollarSign,
  Clock,
  Activity,
  StopCircle,
  Calendar,
  MapPin,
  Battery,
  Fuel,
  Target,
  Award,
  Shield,
  Crown,
  User,
  Mail,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertCircle
} from "lucide-react";

// Import API functions
import { 
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  type BusinessStats,
  type BusinessInvitation
} from "@/lib/api/business";
import { toast } from "sonner";
import { getUserAccessLevel, getDashboardContent, type AccessControlContext } from "@/lib/utils/accessControl";
import { StatCard } from '@/components/shared/StatCard';

// Types
interface RecentActivity {
  id: string;
  type: 'SESSION' | 'PAYMENT' | 'VEHICLE' | 'BUSINESS';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}


const QuickActionCard = ({ title, description, icon, onClick, color = 'bg-blue-600', isLoading = false }: any) => (
  <Card 
    className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg"
    onClick={onClick}
  >
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-gray-900">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <CardDescription className="text-gray-600">{description}</CardDescription>
    </CardContent>
  </Card>
);

export default function CustomerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { selectedBusiness, businesses, stats, isLoading } = useBusiness();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const [greeting, setGreeting] = useState('');
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<BusinessInvitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2; // Show only 2 invitations at a time

  // Access control
  const accessContext: AccessControlContext = {
    userRole: user?.role || '',
    hasBusinesses: businesses.length > 0,
    selectedBusiness,
    pendingInvitations,
    businessRole: selectedBusiness?.role as 'OWNER' | 'FINANCE' | 'DRIVER' | undefined
  };
  const accessLevel = getUserAccessLevel(accessContext);
  const dashboardContent = getDashboardContent(accessLevel);

  // Get business ID from URL params if available
  useEffect(() => {
    const businessId = searchParams.get('businessId');
    if (businessId) {
      // This will be handled by the BusinessProvider
      // The business switching is now managed in the header
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPendingInvitations = async () => {
      try {
        const invitationsResponse = await getPendingInvitations();
        setPendingInvitations(invitationsResponse);
      } catch (error) {
        console.error('Failed to fetch pending invitations:', error);
        setPendingInvitations([]);
      }
    };

    // Only fetch if user is authenticated
    if (isAuthenticated) {
    fetchPendingInvitations();
    }
  }, [isAuthenticated]);

  const handleAcceptInvitation = async (invitation: BusinessInvitation) => {
    setProcessingInvitation(invitation.id);
    try {
      const result = await acceptInvitation(invitation.invitationCode);
      
      const businessName = result.business?.name || invitation.business?.name || 'the business';
      const userRole = result.businessUser?.role || invitation.invitationRole;
      const businessId = result.businessUser?.businessId || invitation.businessId;
      
      toast.success(`Successfully joined ${businessName} as ${userRole}!`);
      
      // Remove the accepted invitation from the list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Redirect to business dashboard with business context
      router.push(`/dashboard/customer?businessId=${businessId}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error.message || 'Failed to accept invitation';
      toast.error(errorMessage);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitation: BusinessInvitation) => {
    setProcessingInvitation(invitation.id);
    try {
      await declineInvitation(invitation.invitationCode);
      toast.info(`Declined invitation from ${invitation.business?.name || 'the business'}`);
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      const errorMessage = error.message || 'Failed to decline invitation';
      toast.error(errorMessage);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-4 w-4 text-amber-600" />;
      case 'FINANCE': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'DRIVER': return <Car className="h-4 w-4 text-green-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER': return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Owner</Badge>;
      case 'FINANCE': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Finance</Badge>;
      case 'DRIVER': return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Driver</Badge>;
      default: return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(pendingInvitations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvitations = pendingInvitations.slice(startIndex, endIndex);

  useEffect(() => {
    // For now, set empty activity - this can be implemented later
    setRecentActivity([]);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPricingBadge = () => {
    // Get pricing from selected business or user's default pricing
    // TODO: Get actual pricing from business contracts when available
    const pricing = 600; // Default pricing for now
    return <Badge className="bg-blue-100 text-blue-800">{pricing} RWF/kWh</Badge>;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SESSION': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'PAYMENT': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'VEHICLE': return <Car className="h-4 w-4 text-purple-600" />;
      case 'BUSINESS': return <Building2 className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    // Use the utility function for COMPLETED status
    if (status?.toUpperCase() === 'COMPLETED') {
      return getStatusDisplayColor(status);
    }
    // Keep other status colors as they were
    switch (status) {
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">

      {/* Pending Invitations Notification */}
      {dashboardContent.showInvitationBanner && pendingInvitations.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                <CardTitle className="text-base">Business Invitations</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {pendingInvitations.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {currentInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-gray-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate text-sm">
                          {invitation.business?.name || 'Unknown Business'}
                        </h4>
                        {getRoleBadge(invitation.invitationRole)}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          {getRoleIcon(invitation.invitationRole)}
                          <span>as {invitation.invitationRole.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={processingInvitation === invitation.id}
                      className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      {processingInvitation === invitation.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvitation(invitation)}
                      disabled={processingInvitation === invitation.id}
                      className="h-7 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    
                    <span className="text-xs text-gray-500">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push('/dashboard/invitations')}
                    className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              
              {/* Show "View All" button if no pagination needed but multiple invitations */}
              {totalPages === 1 && pendingInvitations.length > itemsPerPage && (
                <div className="pt-2 border-t border-gray-200">
              <Button 
                    variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard/invitations')}
                    className="w-full h-7 text-xs text-gray-600 hover:text-gray-900"
              >
                    View All Invitations
                    <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground">
            Welcome to your dashboard. Here's an overview of your charging activity.
            {selectedBusiness && (
              <span className="ml-2 text-blue-600 font-medium">
                • Viewing: {selectedBusiness.name}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {getPricingBadge()}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/dashboard/settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {dashboardContent.showPersonalStats && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions || 0}
          description="Charging sessions completed"
          icon={<Zap className="h-5 w-5 text-white" />}
          isLoading={isLoading}
          trend={stats?.monthlyGrowth ? `+${stats.monthlyGrowth}% this month` : undefined}
          color="bg-blue-600"
        />

        <StatCard
          title="Total Spent"
          value={stats?.totalSpent ? formatCurrency(stats.totalSpent) : 'RWF 0'}
          description="Total amount spent on charging"
          icon={<DollarSign className="h-5 w-5 text-white" />}
          isLoading={isLoading}
          color="bg-green-600"
        />

        <StatCard
          title="Energy Used"
          value={stats?.totalKwh ? `${stats.totalKwh.toFixed(1)} kWh` : '0 kWh'}
          description="Total energy consumed"
          icon={<Battery className="h-5 w-5 text-white" />}
          isLoading={isLoading}
          color="bg-yellow-600"
        />

        <StatCard
          title="Vehicles"
          value={selectedBusiness ? stats?.fleetVehicleCount || 0 : stats?.vehicleCount || 0}
          description={selectedBusiness ? "Fleet vehicles" : "Personal vehicles"}
          icon={<Car className="h-5 w-5 text-white" />}
          isLoading={isLoading}
          color="bg-purple-600"
        />
      </div>
      )}

      {/* Additional Stats for Business Users */}
      {dashboardContent.showBusinessStats && selectedBusiness && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Team Members"
            value={stats?.teamMemberCount || 0}
            description="Active team members"
            icon={<Users className="h-5 w-5 text-white" />}
            isLoading={isLoading}
            color="bg-indigo-600"
          />

          <StatCard
            title="Business Contracts"
            value={stats?.contractCount || 0}
            description="Active contracts"
            icon={<FileText className="h-5 w-5 text-white" />}
            isLoading={isLoading}
            color="bg-teal-600"
          />

          <StatCard
            title="Avg Session Cost"
            value={stats?.averageSessionCost ? formatCurrency(stats.averageSessionCost) : 'RWF 0'}
            description="Average cost per session"
            icon={<Target className="h-5 w-5 text-white" />}
            isLoading={isLoading}
            color="bg-pink-600"
          />
        </div>
      )}

      {/* Quick Actions */}
      {dashboardContent.showQuickActions && (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedBusiness ? (
            // Business Quick Actions
            <>
              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/business/fleet')}
              >
                <Car className="h-4 w-4" />
                Manage Fleet
              </Button>

              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/business/team')}
              >
                <UserPlus className="h-4 w-4" />
                Manage Team
              </Button>


              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/business/contracts')}
              >
                <FileText className="h-4 w-4" />
                View Contracts
              </Button>
            </>
          ) : (
            // Personal Quick Actions
            <>
              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/vehicles')}
              >
                <Car className="h-4 w-4" />
                My Vehicles
              </Button>

              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/payments')}
              >
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </Button>

              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/sessions')}
              >
                <History className="h-4 w-4" />
                Charging History
              </Button>

              <Button 
                variant="outline" 
                size="default"
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/customer/entitlements')}
              >
                <Star className="h-4 w-4" />
                Entitlements
              </Button>


                <Button 
                  variant="outline" 
                  size="default"
                  className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/profile')}
                >
                <User className="h-4 w-4" />
                My Profile
                </Button>

            </>
          )}
        </div>
      </div>
      )}

      {/* Recent Activity */}
      {dashboardContent.showRecentActivity && (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/customer/sessions')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activity.amount && (
                      <span className="font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                    <Badge className={getStatusColor(activity.status)}>
                      {getStatusDisplayLabel(activity.status)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-500">
                  Start charging to see your activity here.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
