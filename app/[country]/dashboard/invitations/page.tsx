'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Shield, 
  Crown, 
  Car, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Mail,
  Clock,
  UserPlus,
  ArrowLeft,
  Users,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { acceptInvitation, getPendingInvitations, declineInvitation } from "@/lib/api/business";

// Import the proper types from the API
import { BusinessInvitation } from '@/lib/api/business';

// Use the backend interface directly - no need for custom interface
interface PendingInvitation extends BusinessInvitation {
  // Add computed properties for UI
  businessName: string;
  status: 'PENDING' | 'ACCEPTED' | 'INACTIVE';
}

export default function PendingInvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending invitations
  const fetchPendingInvitations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('Fetching pending invitations...');
      const apiInvitations = await getPendingInvitations();
      console.log('API response:', apiInvitations);
      
             // Transform API response to our interface
       const transformedInvitations: PendingInvitation[] = apiInvitations.map(invitation => ({
         ...invitation, // Spread all backend properties
         businessName: invitation.business?.name || 'Unknown Business',
         status: invitation.invitationAcceptedAt ? 'ACCEPTED' : (invitation.isActive ? 'PENDING' : 'INACTIVE')
       }));
      
      console.log('Transformed invitations:', transformedInvitations);
      setInvitations(transformedInvitations);
    } catch (error: any) {
      console.error('Error fetching pending invitations:', error);
      const errorMessage = error.message || 'Failed to load pending invitations';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const handleRefresh = () => {
    fetchPendingInvitations(true);
  };

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    setAcceptingInvitation(invitation.id);
    try {
      console.log('Accepting invitation:', invitation.invitationCode);
      const result = await acceptInvitation(invitation.invitationCode);
      
      // Extract business details from response
      const businessName = result.business?.name || invitation.businessName;
      const userRole = result.businessUser?.role || invitation.invitationRole;
      const businessId = result.businessUser?.businessId || invitation.businessId;
      
      toast.success(`Successfully joined ${businessName} as ${userRole}!`);
      
      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Redirect to business dashboard with business context
      router.push(`/dashboard/customer?businessId=${businessId}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error.message || 'Failed to accept invitation';
      toast.error(errorMessage);
    } finally {
      setAcceptingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitation: PendingInvitation) => {
    try {
      console.log('Declining invitation:', invitation.invitationCode);
      await declineInvitation(invitation.invitationCode);
      toast.info(`Declined invitation from ${invitation.businessName}`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      const errorMessage = error.message || 'Failed to decline invitation';
      toast.error(errorMessage);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-5 w-5 text-amber-600" />;
      case 'FINANCE': return <Shield className="h-5 w-5 text-blue-600" />;
      case 'DRIVER': return <Car className="h-5 w-5 text-green-600" />;
      default: return <UserPlus className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Owner</Badge>;
      case 'FINANCE': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Finance</Badge>;
      case 'DRIVER': return <Badge className="bg-green-100 text-green-800 border-green-200">Driver</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Full access to business management, team, fleet, and financial data.';
      case 'FINANCE':
        return 'Access to financial data, billing, contracts, and payment management.';
      case 'DRIVER':
        return 'Access to assigned vehicles, charging sessions, and basic business information.';
      default:
        return 'Standard member access with basic permissions.';
    }
  };



  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Review and respond to your business invitations
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2 p-0 h-auto"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && invitations.length === 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Invitations</h3>
            <p className="text-gray-600 mb-6">
              You don't have any pending business invitations at the moment.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/dashboard/customer')}>
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invitations List */}
      {!isLoading && !error && invitations.length > 0 && (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <Card 
              key={invitation.id} 
              className="bg-white/80 backdrop-blur-sm border shadow-lg transition-all duration-300 hover:shadow-xl border-gray-200/50"
            >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Business Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invitation.businessName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getRoleIcon(invitation.invitationRole)}
                            {getRoleBadge(invitation.invitationRole)}
                          </div>
                        </div>
                      </div>

                      {/* Role Description */}
                      <p className="text-sm text-gray-600">
                        {getRoleDescription(invitation.invitationRole)}
                      </p>

                                             {/* Invitation Details */}
                       <div className="flex items-center gap-4 text-sm text-gray-500">
                         <div className="flex items-center gap-1">
                           <Mail className="h-4 w-4" />
                           <span>{invitation.invitedEmail || invitation.invitedPhone}</span>
                         </div>
                         {invitation.invitedByUser && (
                           <div className="flex items-center gap-1">
                             <Users className="h-4 w-4" />
                             <span>by {invitation.invitedByUser.firstName} {invitation.invitedByUser.lastName}</span>
                           </div>
                         )}
                         <div className="flex items-center gap-1">
                           <Clock className="h-4 w-4" />
                           <span>Sent: {new Date(invitation.createdAt).toLocaleDateString()}</span>
                         </div>
                       </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-6">
                      <Button
                        size="sm"
                        disabled={acceptingInvitation === invitation.id}
                        onClick={() => handleAcceptInvitation(invitation)}
                        className="min-w-[100px]"
                      >
                        {acceptingInvitation === invitation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Joining...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Join
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeclineInvitation(invitation)}
                        className="min-w-[100px]"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      )}

    
    </div>
  );
}
