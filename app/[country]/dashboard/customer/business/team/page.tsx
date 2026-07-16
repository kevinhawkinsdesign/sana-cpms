'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// --- SHADCN/UI & LUCIDE IMPORTS ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Users, 
  ArrowLeft, 
  Plus,
  Mail,
  Phone,
  CheckCircle,
  Crown,
  Shield,
  User,
  Building2,
  Car,
  FileText,
  Trash2,
  Edit,
  MoreVertical,
  UserPlus,
  TrendingUp,
  Clock,
  Star
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";


// --- API & TYPE IMPORTS ---
import { 
  getBusinessUsers, 
  createBusinessInvitation, 
  removeUserFromBusiness,
  updateBusinessUserRole,
  getUserBusinesses,
  type BusinessUser,
  type Business 
} from "@/lib/api/business";

// Types
interface TeamMember {
  id: string; // This is the BusinessUser ID, not the User ID
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  role: 'OWNER' | 'FINANCE' | 'DRIVER';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  joinedAt: string;
}

// --- MAIN COMPONENT ---
export default function TeamManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- STATE MANAGEMENT ---
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    phone: '',
    role: 'DRIVER' as 'OWNER' | 'FINANCE' | 'DRIVER'
  });

  // User management state
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<'OWNER' | 'FINANCE' | 'DRIVER'>('DRIVER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);

  // --- DATA FETCHING EFFECTS ---
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const userBusinesses = await getUserBusinesses();
        setBusinesses(userBusinesses);
        
        if (userBusinesses.length === 0) {
          setIsLoading(false);
          return;
        }

        const businessId = searchParams.get('businessId');
        const businessToSelect = userBusinesses.find(b => b.id === businessId) || userBusinesses[0];
        setSelectedBusiness(businessToSelect);
      } catch (error) {
        console.error('Error loading businesses:', error);
        toast.error('Failed to load your businesses.');
        setIsLoading(false);
      }
    };
    loadBusinesses();
  }, [searchParams]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedBusiness) return;
      
      try {
        setIsLoading(true);
        const businessUsers = await getBusinessUsers(selectedBusiness.id);
        
        const transformedMembers: TeamMember[] = businessUsers.map(user => ({
          id: user.id,
          user: {
            id: user.user.id,
            name: `${user.user.firstName} ${user.user.lastName}`,
            email: user.user.email,
            phone: user.user.phone,
          },
          role: user.role,
          status: 'ACTIVE', // Backend should provide this in future
          joinedAt: user.createdAt,
        }));
        
        setTeamMembers(transformedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        toast.error(`Failed to load team for ${selectedBusiness.name}.`);
        setTeamMembers([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeamMembers();
  }, [selectedBusiness]);

  // --- UI HELPER FUNCTIONS ---
  const getRoleIcon = (role: string) => {
    const props = { className: "h-4 w-4" };
    switch (role) {
      case 'OWNER': return <Crown {...props} color="#d97706" />;
      case 'FINANCE': return <Shield {...props} color="#2563eb" />;
      case 'DRIVER': return <User {...props} color="#B39400" />;
      default: return <User {...props} />;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'INACTIVE': return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // --- EVENT HANDLERS ---
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return toast.error('Please select a business first');
    if (!inviteData.email) return toast.error('Email address is required');
    
    console.log('Form data being sent:', {
      businessId: selectedBusiness.id,
      invitationRole: inviteData.role,
      invitedEmail: inviteData.email,
      invitedPhone: inviteData.phone || undefined
    });
    
    setIsInviting(true);
    try {
      const result = await createBusinessInvitation(selectedBusiness.id, {
        invitationRole: inviteData.role,
        invitedEmail: inviteData.email,
        invitedPhone: inviteData.phone || undefined
      });
      
      toast.success(`Invitation sent to ${inviteData.email}!`);
      setInviteData({ email: '', phone: '', role: 'DRIVER' });
      setIsInviteDialogOpen(false);
      // Refresh team list after successful invitation
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to send invitation.';
      toast.error('Invitation Failed', { description: errorMessage });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedBusiness) return;

    try {
      await removeUserFromBusiness(selectedBusiness.id, memberId);
      toast.success(`${memberName} has been removed from the team.`);
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to remove team member.';
      toast.error('Removal Failed', { description: errorMessage });
    }
  };

  const handleEditRole = (member: TeamMember) => {
    setEditingUser(member);
    setNewRole(member.role);
    setIsEditRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedBusiness || !editingUser) return;

    setIsUpdatingRole(true);
    try {
      const updatedUser = await updateBusinessUserRole(selectedBusiness.id, editingUser.user.id, newRole);
      toast.success(`${editingUser.user.name}'s role has been updated to ${newRole}.`);
      
      // Update the team member in the list
      setTeamMembers(prev => prev.map(member => 
        member.id === editingUser.id 
          ? { ...member, role: updatedUser.role }
          : member
      ));
      
      setIsEditRoleDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update user role.';
      toast.error('Update Failed', { description: errorMessage });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveUser = async (member: TeamMember) => {
    if (!selectedBusiness) return;

    // Prevent removing the last owner
    const owners = teamMembers.filter(m => m.role === 'OWNER');
    if (owners.length === 1 && member.role === 'OWNER') {
      toast.error('Cannot remove the last owner. Please assign another owner first.');
      return;
    }

    setIsRemovingUser(member.id);
    try {
      await removeUserFromBusiness(selectedBusiness.id, member.user.id);
      toast.success(`${member.user.name} has been removed from the team.`);
      setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to remove user from team.';
      toast.error('Removal Failed', { description: errorMessage });
    } finally {
      setIsRemovingUser(null);
    }
  };

  const teamStats = {
    total: teamMembers.length,
    active: teamMembers.filter(m => m.status === 'ACTIVE').length,
    pending: teamMembers.filter(m => m.status === 'PENDING').length,
    drivers: teamMembers.filter(m => m.role === 'DRIVER').length
  };

  // --- RENDER LOGIC ---
  if (isLoading && businesses.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoading && businesses.length === 0) {
    return (
      <div className="text-center p-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No businesses found</h3>
        <p className="text-muted-foreground mb-4">Create or join a business to manage your team.</p>
        <Button onClick={() => router.push('/dashboard/customer/business/create')}>Create Business</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Manage members for your selected business.</p>
          </div>
        </div>
        
        {selectedBusiness && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Invite New Team Member</DialogTitle>
                <CardDescription>Invite someone to join {selectedBusiness.name}.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={inviteData.email} 
                    onChange={(e) => setInviteData(p => ({ ...p, email: e.target.value }))} 
                    placeholder="member@example.com" 
                    required
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number (Optional)</Label>
                  <Input 
                    id="phone" 
                    value={inviteData.phone} 
                    onChange={(e) => setInviteData(p => ({ ...p, phone: e.target.value }))} 
                    placeholder="+250 781 234 567"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                  <Select value={inviteData.role} onValueChange={(value: 'OWNER' | 'FINANCE' | 'DRIVER') => setInviteData(p => ({ ...p, role: value }))}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRIVER">Driver</SelectItem>
                      <SelectItem value="FINANCE">Finance</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="border-gray-300 hover:bg-gray-50">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={isInviting || !inviteData.email}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Business Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              Select Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedBusiness?.id || ''} 
              onValueChange={(value) => setSelectedBusiness(businesses.find(b => b.id === value) || null)}
            >
              <SelectTrigger className="w-full text-base h-auto border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select a business..." />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(business => (
                  <SelectItem key={business.id} value={business.id}>
                    <div className="flex items-center gap-2">
                      <span>{business.name}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {business.role?.toLowerCase() || 'member'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-purple-600" />
              Team Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="p-2 bg-blue-200 rounded-lg w-fit mx-auto mb-2">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{teamStats.total}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="p-2 bg-green-200 rounded-lg w-fit mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <p className="text-sm text-green-700 font-medium">Active</p>
              <p className="text-2xl font-bold text-green-900">{teamStats.active}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
              <div className="p-2 bg-yellow-200 rounded-lg w-fit mx-auto mb-2">
                <Clock className="h-5 w-5 text-yellow-700" />
              </div>
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{teamStats.pending}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="p-2 bg-purple-200 rounded-lg w-fit mx-auto mb-2">
                <Car className="h-5 w-5 text-purple-700" />
              </div>
              <p className="text-sm text-purple-700 font-medium">Drivers</p>
              <p className="text-2xl font-bold text-purple-900">{teamStats.drivers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Star className="h-5 w-5 text-amber-600" />
            Team Members List
          </CardTitle>
          <CardDescription className="text-gray-600">
            A list of all members in {selectedBusiness?.name || 'your business'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-gray-700 font-semibold">Member</TableHead>
                <TableHead className="text-gray-700 font-semibold">Role</TableHead>
                <TableHead className="hidden md:table-cell text-gray-700 font-semibold">Status</TableHead>
                <TableHead className="hidden lg:table-cell text-gray-700 font-semibold">Joined On</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Users className="h-8 w-8" />
                      <p>Loading team members...</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <TableRow key={member.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{member.user.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        {getRoleBadge(member.role)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getStatusBadge(member.status)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-600">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => handleEditRole(member)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Role
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove <span className="font-semibold">{member.user.name}</span> from the business. They will lose all access. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-300 hover:bg-gray-50">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemoveUser(member)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isRemovingUser === member.id}
                            >
                              {isRemovingUser === member.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Removing...
                                </>
                              ) : (
                                'Yes, remove member'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Users className="h-8 w-8" />
                      <p>No team members found. Invite your first member to get started!</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit User Role
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
                  {editingUser.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{editingUser.user.name}</div>
                  <div className="text-sm text-gray-600">{editingUser.user.email}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(value: 'OWNER' | 'FINANCE' | 'DRIVER') => setNewRole(value)}
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
                <Button 
                  onClick={handleUpdateRole}
                  disabled={isUpdatingRole || newRole === editingUser.role}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isUpdatingRole ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Role'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}