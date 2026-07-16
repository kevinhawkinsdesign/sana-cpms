'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Building2, 
  Users, 
  Shield, 
  Crown, 
  Car, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Mail,
  Clock,
  UserPlus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { getBusinessInvitations, cancelBusinessInvitation, createBusinessInvitation } from "@/lib/api/business";
import { getUserBusinesses } from "@/lib/api/business";

// Import the proper types from the API
import { BusinessInvitation } from '@/lib/api/business';

// Use the backend interface directly
interface BusinessInvitationAdmin extends BusinessInvitation {
  // All properties are already included from BusinessInvitation
}

export default function BusinessInvitationsAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingInvitation, setCancellingInvitation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Carousel pagination state
  const [currentIndex, setCurrentIndex] = useState(0); // Current invitation index
  const [activeTab, setActiveTab] = useState('all'); // Tab filter state
  
  // Invitation modal state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    phone: '',
    role: 'DRIVER' as 'OWNER' | 'FINANCE' | 'DRIVER'
  });
  const [isInviting, setIsInviting] = useState(false);

  // Get business ID from URL params
  useEffect(() => {
    const businessId = searchParams.get('businessId');
    if (businessId) {
      setSelectedBusiness(businessId);
    }
  }, [searchParams]);

  // Fetch user's businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const userBusinesses = await getUserBusinesses();
        setBusinesses(userBusinesses);
        
        // Set default business if none selected
        if (!selectedBusiness && userBusinesses.length > 0) {
          setSelectedBusiness(userBusinesses[0].id);
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);
      }
    };

    fetchBusinesses();
  }, [selectedBusiness]);

  // Fetch business invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!selectedBusiness) return;

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching invitations for business:', selectedBusiness);
        const businessInvitations = await getBusinessInvitations(selectedBusiness);
        console.log('Business invitations:', businessInvitations);
        
        setInvitations(businessInvitations);
      } catch (error: any) {
        console.error('Error fetching business invitations:', error);
        setError(error.message || 'Failed to load invitations');
        toast.error(error.message || 'Failed to load invitations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitations();
  }, [selectedBusiness]);

  const handleRefresh = async () => {
    if (!selectedBusiness) return;
    
    setIsRefreshing(true);
    try {
      const businessInvitations = await getBusinessInvitations(selectedBusiness);
      setInvitations(businessInvitations);
      toast.success('Invitations refreshed');
    } catch (error: any) {
      console.error('Error refreshing invitations:', error);
      toast.error(error.message || 'Failed to refresh invitations');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedBusiness) return;

    setCancellingInvitation(invitationId);
    try {
      await cancelBusinessInvitation(selectedBusiness, invitationId);
      toast.success('Invitation cancelled successfully');
      
      // Remove the cancelled invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error(error.message || 'Failed to cancel invitation');
    } finally {
      setCancellingInvitation(null);
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

  const getStatusBadge = (invitation: BusinessInvitation) => {
    if (invitation.invitationAcceptedAt) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
    } else if (!invitation.isActive) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return toast.error('Please select a business first');
    if (!inviteData.email) return toast.error('Email address is required');
    
    console.log('Form data being sent:', {
      businessId: selectedBusiness,
      invitationRole: inviteData.role,
      invitedEmail: inviteData.email,
      invitedPhone: inviteData.phone || undefined
    });
    
    setIsInviting(true);
    try {
      const result = await createBusinessInvitation(selectedBusiness, {
        invitationRole: inviteData.role,
        invitedEmail: inviteData.email,
        invitedPhone: inviteData.phone || undefined
      });
      
      console.log('Invitation created successfully:', result);
      toast.success(`Invitation sent to ${inviteData.email}!`);
      setInviteData({ email: '', phone: '', role: 'DRIVER' });
      setIsInviteDialogOpen(false);
      
      // Refresh the invitations list
      await fetchInvitations();
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to send invitation.';
      toast.error('Invitation Failed', { description: errorMessage });
    } finally {
      setIsInviting(false);
    }
  };

  const selectedBusinessData = businesses.find(b => b.id === selectedBusiness);

  // Responsive screen size detection
  const [isBigScreen, setIsBigScreen] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsBigScreen(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Filter invitations based on active tab
  const filteredInvitations = invitations.filter(invitation => {
    switch (activeTab) {
      case 'accepted':
        return invitation.invitationAcceptedAt;
      case 'cancelled':
        return !invitation.isActive;
      case 'pending':
        return invitation.isActive && !invitation.invitationAcceptedAt;
      default:
        return true; // 'all'
    }
  });

  // Carousel navigation - show 2 invitations on big screens, 1 on small screens
  const itemsPerView = isBigScreen ? 2 : 1;
  const totalPages = Math.ceil(filteredInvitations.length / itemsPerView);
  const currentPage = Math.floor(currentIndex / itemsPerView);
  
  const currentInvitations = filteredInvitations.slice(
    currentPage * itemsPerView, 
    (currentPage + 1) * itemsPerView
  );
  const totalInvitations = filteredInvitations.length;

  // Reset to first invitation when business changes, screen size changes, or tab changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedBusiness, isBigScreen, activeTab]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (filteredInvitations.length === 0) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Carousel navigation handlers
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentIndex((currentPage - 1) * itemsPerView);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentIndex((currentPage + 1) * itemsPerView);
    }
  };

  const goToPage = (page: number) => {
    setCurrentIndex(page * itemsPerView);
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
            <h1 className="text-3xl font-bold tracking-tight">Business Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Manage invitations for {selectedBusinessData?.name || 'your business'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
          
          <Button 
            onClick={() => setIsInviteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Send Invitation
          </Button>
        </div>
      </div>

      {/* Business Selector */}
      {businesses.length > 1 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {businesses.map(business => (
                <Button
                  key={business.id}
                  variant={selectedBusiness === business.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedBusiness(business.id)}
                >
                  {business.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invitations Found</h3>
            <p className="text-gray-600 mb-6">
              You haven't sent any invitations for this business yet.
            </p>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              Send Invitations
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invitation Tabs and Carousel */}
      {!isLoading && !error && invitations.length > 0 && (
        <div className="space-y-6">
          {/* Beautiful Shadcn Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                All ({invitations.length})
              </TabsTrigger>
              <TabsTrigger value="accepted" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Accepted ({invitations.filter(inv => inv.invitationAcceptedAt).length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancelled ({invitations.filter(inv => !inv.isActive).length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({invitations.filter(inv => inv.isActive && !inv.invitationAcceptedAt).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {/* Invitation Counter */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  {totalInvitations === 0 ? 'No invitations found' : 
                   isBigScreen ? `Page ${currentPage + 1} of ${totalPages}` : 
                   `Invitation ${currentIndex + 1} of ${totalInvitations}`}
                </p>
              </div>

              {/* Invitations Display */}
              {totalInvitations === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No {activeTab} invitations found
                  </h3>
                  <p className="text-gray-600">
                    {activeTab === 'all' 
                      ? 'No invitations have been sent yet.'
                      : `No ${activeTab} invitations at the moment.`
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className={`grid gap-8 ${isBigScreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} max-w-7xl mx-auto`}>
                      {currentInvitations.map((invitation) => (
            <Card 
              key={invitation.id} 
                          className="bg-white/80 backdrop-blur-sm border shadow-lg transition-all duration-300 border-gray-200/50"
            >
                          <CardContent className="p-8">
                            <div className="space-y-6">
                              {/* Invitation Info */}
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Mail className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900">
                                    {invitation.invitedEmail || invitation.invitedPhone || 'Unknown User'}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    {getRoleIcon(invitation.invitationRole)}
                                    {getRoleBadge(invitation.invitationRole)}
                                    {getStatusBadge(invitation)}
                                  </div>
                                </div>
                              </div>

                              {/* Invitation Details */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Sent: {formatDate(invitation.createdAt)}</span>
                      </div>
                      {invitation.invitationAcceptedAt && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Accepted: {formatDate(invitation.invitationAcceptedAt)}</span>
                        </div>
                      )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    Code: {invitation.invitationCode}
                        </span>
                    </div>
                  </div>

                              {/* Action Buttons */}
                              {invitation.isActive && !invitation.invitationAcceptedAt && (
                                <div className="pt-4 border-t">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancellingInvitation === invitation.id}
                        onClick={() => handleCancelInvitation(invitation.id)}
                                    className="w-full"
                      >
                        {cancellingInvitation === invitation.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                                        Cancel Invitation
                          </>
                        )}
                      </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Navigation Arrows */}
                    {totalPages > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 0}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages - 1}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Dots Indicator */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      {Array.from({ length: totalPages }, (_, index) => (
                        <button
                          key={index}
                          onClick={() => goToPage(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentPage 
                              ? 'bg-primary' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}



      {/* Invitation Modal */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Send Business Invitation
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={inviteData.phone}
                onChange={(e) => setInviteData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value: 'OWNER' | 'FINANCE' | 'DRIVER') => 
                  setInviteData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Driver
                    </div>
                  </SelectItem>
                  <SelectItem value="FINANCE">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Finance Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="OWNER">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Owner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



