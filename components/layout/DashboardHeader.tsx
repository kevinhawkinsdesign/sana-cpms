'use client';

import Image from 'next/image';
import { useAuth } from "@/lib/auth/authContext";
import { useBusiness } from "@/lib/providers/BusinessProvider";
import { getPendingInvitations } from "@/lib/api/business";
import { BusinessInvitation } from "@/lib/api/business";
import {
  Menu,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Building2,
  Mail,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { KABISA_TIN } from "@/lib/constants/kabisaTin";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatEnumValue } from "@/lib/utils/formatters";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";
import { useState, useEffect } from "react";
import { ShiftStatusIndicator } from "@/components/dashboard/Operator/ShiftStatusIndicator";
import { UserRole } from "@/lib/utils/roleRedirect";
import { RraNoticesPanel } from "@/components/rra-notices/RraNoticesPanel";

interface HeaderProps {
  onMenuClick: () => void;
  isOpen: boolean;
}

const DashboardHeader = ({ onMenuClick, isOpen }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { selectedBusiness, businesses, setSelectedBusiness } = useBusiness();
  const [pendingInvitations, setPendingInvitations] = useState<BusinessInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const router = useLocalizedRouter();
  const [tinCopied, setTinCopied] = useState(false);

  const handleCopyTin = async () => {
    try {
      await navigator.clipboard.writeText(KABISA_TIN);
      setTinCopied(true);
      toast.success('Kabisa TIN copied');
      setTimeout(() => setTinCopied(false), 1500);
    } catch {
      toast.error('Copy failed — long-press to copy');
    }
  };

  const showKabisaTin = !!user && user.role === UserRole.OPERATOR;

  // Fetch pending invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user) return;
      
      setIsLoadingInvitations(true);
      try {
        const invitations = await getPendingInvitations();
        setPendingInvitations(invitations);
      } catch (error) {
        console.error('Failed to fetch pending invitations:', error);
        setPendingInvitations([]);
      } finally {
        setIsLoadingInvitations(false);
      }
    };

    fetchInvitations();
  }, [user]);

  const getUserInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  };

  // Helper function to get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Building2 className="h-3 w-3 text-blue-600" />;
      case 'FINANCE':
        return <User className="h-3 w-3 text-green-600" />;
      case 'DRIVER':
        return <User className="h-3 w-3 text-orange-600" />;
      default:
        return <User className="h-3 w-3 text-gray-600" />;
    }
  };

  // Helper function to get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-blue-100 text-blue-800';
      case 'FINANCE':
        return 'bg-green-100 text-green-800';
      case 'DRIVER':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRandomColor = (initials: string) => {
    const colors = [
      'bg-emerald-100 text-emerald-600',
      'bg-blue-100 text-blue-600',
      'bg-purple-100 text-purple-600',
      'bg-amber-100 text-amber-600',
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b z-20 h-16">
      <div className={`h-full px-4 flex items-center justify-between transition-all duration-300 
        ${isOpen ? 'lg:ml-72' : 'lg:ml-0'}`}
      >
        {/* Left Section - Mobile Menu & Kabisa TIN */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {showKabisaTin && (
            <button
              type="button"
              onClick={handleCopyTin}
              title="Kabisa TIN — tap to copy"
              className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-800 leading-none hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:ml-4"
            >
              <span className="font-semibold tracking-tight">KABISA TIN:</span>
              <span className="font-mono font-bold tracking-wider text-[11px]">
                {KABISA_TIN}
              </span>
              {tinCopied ? (
                <Check className="h-2.5 w-2.5 text-emerald-600" />
              ) : (
                <Copy className="h-2.5 w-2.5 opacity-60" />
              )}
            </button>
          )}
        </div>

        {/* Right Section - Business Selector, Notifications & User */}
        <div className="flex items-center gap-2">
          {/* Business Selector - Only show for CUSTOMER role users who have businesses */}
          {user?.role === 'CUSTOMER' && businesses.length > 0 && (
            <Select
              value={selectedBusiness?.id || 'personal'}
              onValueChange={(value) => {
                if (value === 'personal') {
                  setSelectedBusiness(null);
                } else {
                  const business = businesses.find(b => b.id === value);
                  setSelectedBusiness(business || null);
                }
              }}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {/* Personal Account Option */}
                <SelectItem value="personal">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-500" />
                    <span>Personal Account</span>
                  </div>
                </SelectItem>

                {/* Business Account Options */}
                {businesses.map(business => (
                  <SelectItem key={business.id} value={business.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-gray-500" />
                        <span className="truncate max-w-[120px]">{business.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize ml-2">
                        {business.role?.toLowerCase() || 'member'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* RRA Official Notices */}
          <RraNoticesPanel />

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {pendingInvitations.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
                    {pendingInvitations.length > 99 ? '99+' : pendingInvitations.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {pendingInvitations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {pendingInvitations.length}
                    </Badge>
                  )}
                </div>
              </div>
              
              {isLoadingInvitations ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : pendingInvitations.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {pendingInvitations.slice(0, 5).map((invitation) => (
                    <Card key={invitation.id} className="m-2 border-0 shadow-none hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push('/dashboard/invitations')}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {invitation.business?.name || 'Unknown Business'}
                              </p>
                              <Badge className={`text-xs ${getRoleBadgeColor(invitation.invitationRole)}`}>
                                {invitation.invitationRole.toLowerCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              has invited you to join as {invitation.invitationRole.toLowerCase()}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {pendingInvitations.length > 5 && (
                    <div className="p-3 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => router.push('/dashboard/invitations')}
                      >
                        View all {pendingInvitations.length} invitations
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  No new notifications
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 flex items-center gap-2 p-4">
                <Avatar className={`h-8 w-8 ${getRandomColor(getUserInitials(user?.firstName, user?.lastName))}`}>
                  {user?.imageUrl ? (
                    <AvatarImage src={user.imageUrl} alt={getUserDisplayName()} />
                  ) : null}
                  <AvatarFallback>{getUserInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {getUserDisplayName()}
                    </p>
                    {user?.organization?.name && (
                      <p className="text-xs text-muted-foreground">{user.organization.name}</p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.organization?.name && (
                    <p className="text-xs text-muted-foreground font-medium">{user.organization.name}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;