'use client';

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import { useAuth } from "@/lib/auth/authContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Mail,
  ArrowLeft,
  UserPlus,
  Shield,
  Crown,
  Car
} from "lucide-react";
import { toast } from "sonner";
import { acceptInvitation, getInvitationDetails, BusinessInvitation } from "@/lib/api/business";

export default function BusinessInvitationPage() {
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<BusinessInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get invitation code from URL and fetch details
  React.useEffect(() => {
    const code = searchParams.get('invitation');
    setInvitationCode(code);
  }, [searchParams]);

  // Fetch invitation details when authenticated and code is available
  React.useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationCode || authLoading) return;

      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching invitation details for code:', invitationCode);
        const invitation = await getInvitationDetails(invitationCode);
        console.log('Invitation details:', invitation);
        
        setInvitationDetails(invitation);
      } catch (error: any) {
        console.error('Error fetching invitation details:', error);
        setError(error.message || 'Failed to load invitation details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [invitationCode, isAuthenticated, authLoading]);

  const handleAcceptInvitation = async () => {
    if (!invitationCode) return;

    setIsAccepting(true);
    setError(null);
    
    try {
      const result = await acceptInvitation(invitationCode);
      
      // Extract business details from response
      const businessName = result.business?.name || 'the business';
      const userRole = result.businessUser?.role || 'member';
      const businessId = result.businessUser?.businessId;
      
      toast.success(`Successfully joined ${businessName} as ${userRole}!`);
      
      // Redirect to business dashboard with business context
      if (businessId) {
        router.push(`/dashboard/customer?businessId=${businessId}`);
      } else {
        router.push('/dashboard/customer');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineInvitation = () => {
    router.push('/dashboard/customer');
  };

  const getErrorMessage = (err: any): string => {
    if (err.response?.status === 404) {
      return 'Invalid or expired invitation code';
    }
    if (err.response?.status === 400) {
      return 'You are already a member of this business';
    }
    if (err.response?.status === 401) {
      return 'Please log in to accept this invitation';
    }
    return 'Failed to accept invitation. Please try again.';
  };

  // Show loading state
  if (isLoading) {
    return null
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Sign in to accept your invitation</CardTitle>
            <CardDescription>
              You need to sign in to accept the business invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                After signing in, you'll be redirected back to accept your invitation.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => {
                  const currentUrl = window.location.href;
                  router.push(`/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
                }}
              >
                Sign In
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const currentUrl = window.location.href;
                  router.push(`/auth/signup?callbackUrl=${encodeURIComponent(currentUrl)}`);
                }}
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>
              There was a problem with your invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard/customer')}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation details if available
  if (invitationDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Business Invitation</CardTitle>
            <CardDescription>
              You've been invited to join a business on KABISA
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Business Information */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {invitationDetails.business?.name || 'Unknown Business'}
              </h3>
              <p className="text-sm text-gray-500">
                Invitation Code: <strong className="text-blue-600 font-mono">{invitationCode}</strong>
              </p>
            </div>

            {/* Inviter Information */}
            {invitationDetails.invitedByUser && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Invited by:</h4>
                <p className="text-sm text-gray-600">
                  {invitationDetails.invitedByUser.firstName} {invitationDetails.invitedByUser.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {invitationDetails.invitedByUser.email}
                </p>
              </div>
            )}

            {/* Role Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Your Role: {invitationDetails.invitationRole}</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Charge vehicles at KABISA stations</li>
                <li>• View business vehicles and sessions</li>
                <li>• Track charging history</li>
                <li>• Access business features</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                className="w-full"
                disabled={isAccepting}
                onClick={handleAcceptInvitation}
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDeclineInvitation}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation acceptance page (fallback)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Business Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a business on KABISA
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Info */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to KABISA Business
            </h3>
            <p className="text-sm text-gray-500">
              Invitation Code: <strong className="text-blue-600 font-mono">{invitationCode}</strong>
            </p>
          </div>

          {/* Role Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What you'll be able to do:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Charge vehicles at KABISA stations</li>
              <li>• View business vehicles and sessions</li>
              <li>• Track charging history</li>
              <li>• Access business features</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full"
              disabled={isAccepting}
              onClick={handleAcceptInvitation}
            >
              {isAccepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDeclineInvitation}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
