'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth/authContext'
import { UserRole } from '@/lib/utils/roleRedirect'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Users, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  UserCheck,
  UserX
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  getAllUsers, 
  getBlockedUsers, 
  getOperators,
  updateUser, 
  verifyUser, 
  blockUser, 
  unblockUser,
  patchOperatorTrainee,
  patchOperatorAutofill,
  type User as AdminUser
} from '@/lib/api/admin'
import { StatCard } from '@/components/shared/StatCard'

const AdminUsersPage = () => {
  const { user, isLoading } = useAuth()
  const router = useLocalizedRouter()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'CUSTOMER' | 'OPERATOR' | 'ADMIN'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const   [editFormData, setEditFormData] = useState({
    role: '',
    userType: '',
    phone: '',
    isVerified: false,
    isActive: true,
    isTrainee: false,
    autofillEnabled: true,
    operatorAirtableId: ''
  })

  // Fetch users data
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers
  })

  // Fetch operators for trainee status
  const { data: operatorsData } = useQuery({
    queryKey: ['adminOperators'],
    queryFn: getOperators
  })

  // Fetch blocked users
  const { data: blockedUsersData, isLoading: blockedUsersLoading } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: getBlockedUsers
  })

  // User management mutations
  const verifyUserMutation = useMutation({
    mutationFn: verifyUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      toast.success('User verified successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to verify user')
    }
  })

  const blockUserMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      toast.success('User blocked successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to block user')
    }
  })

  const unblockUserMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      toast.success('User unblocked successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unblock user')
    }
  })

  // Patch operator trainee status mutation
  const patchTraineeMutation = useMutation({
    mutationFn: ({ operatorId, isTrainee }: { operatorId: string; isTrainee: boolean }) =>
      patchOperatorTrainee(operatorId, isTrainee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['adminOperators'] })
      toast.success('Operator trainee status updated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update trainee status')
    }
  })

  // Patch operator autofill status mutation
  const patchAutofillMutation = useMutation({
    mutationFn: ({ operatorId, autofillEnabled }: { operatorId: string; autofillEnabled: boolean }) =>
      patchOperatorAutofill(operatorId, autofillEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['adminOperators'] })
      toast.success('Operator autofill status updated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update autofill status')
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      toast.success('User updated successfully')
      setIsEditUserOpen(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user')
    }
  })

  // Calculate real stats from API data
  const users = usersData?.data?.users || []
  const blockedUsers = blockedUsersData?.data?.users || []
  const adminOperators = operatorsData?.data?.operators || []
  const traineeByOperatorId = Object.fromEntries(
    adminOperators.map((op) => [op.id, op.isTrainee])
  )
  const autofillByOperatorId = Object.fromEntries(
    adminOperators.map((op) => [op.id, op.autofillEnabled])
  )

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((user: AdminUser) => user.isActive).length,
    blockedUsers: blockedUsers.length,
    verifiedUsers: users.filter((user: AdminUser) => user.isVerified).length,
    customers: users.filter((user: AdminUser) => user.role === 'CUSTOMER').length,
    operators: users.filter((user: AdminUser) => user.role === 'OPERATOR').length,
    admins: users.filter((user: AdminUser) => user.role === 'ADMIN').length,
    verificationRate: users.length > 0 ? Math.round((users.filter((user: AdminUser) => user.isVerified).length / users.length) * 100) : 0
  }

  // Filter users based on search and filters
  const filteredUsers = users.filter((user: AdminUser) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = 
      roleFilter === 'all' || user.role === roleFilter

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'blocked' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const isAdminOrOrgAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ORGANIZATION_ADMIN;

  const handleVerifyUser = (userId: string) => {
    verifyUserMutation.mutate(userId)
  }

  const handleBlockUser = (userId: string) => {
    if (confirm('Are you sure you want to block this user?')) {
      blockUserMutation.mutate(userId)
    }
  }

  const handleUnblockUser = (userId: string) => {
    unblockUserMutation.mutate(userId)
  }

  const handleViewUserDetails = (user: AdminUser) => {
    setSelectedUser(user)
    setIsUserDetailsOpen(true)
  }

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user)
    const isTrainee = user.role === 'OPERATOR' ? (traineeByOperatorId[user.id] ?? user.isTrainee ?? false) : false
    const autofillEnabled = user.role === 'OPERATOR' ? (autofillByOperatorId[user.id] ?? user.autofillEnabled ?? true) : true
    setEditFormData({
      role: user.role,
      userType: user.userType,
      phone: user.phone || '',
      isVerified: user.isVerified,
      isActive: user.isActive,
      isTrainee,
      autofillEnabled,
      operatorAirtableId: user.operatorAirtableId || ''
    })
    setIsEditUserOpen(true)
  }

  const handleToggleTrainee = (user: AdminUser, isTrainee: boolean) => {
    if (user.role !== 'OPERATOR') return
    patchTraineeMutation.mutate({ operatorId: user.id, isTrainee })
  }

  const handleToggleAutofill = (user: AdminUser, autofillEnabled: boolean) => {
    if (user.role !== 'OPERATOR') return
    patchAutofillMutation.mutate({ operatorId: user.id, autofillEnabled })
  }

  const handleUpdateUser = () => {
    if (!editingUser) return

    const { isTrainee, autofillEnabled, userType, operatorAirtableId, ...rest } = editFormData
    const data: any = { ...rest }
    if (rest.role === 'OPERATOR') {
      data.isTrainee = isTrainee
      data.autofillEnabled = autofillEnabled
      data.operatorAirtableId = operatorAirtableId
    }
    if (rest.role === 'CUSTOMER') {
      data.userType = userType
    }

    updateUserMutation.mutate({
      userId: editingUser.id,
      data
    })
  }

  return (
    <AdminAccessGuard>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage all users, verify accounts, and control access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Quick Stats - Backend Integrated */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description={`${stats.totalUsers} registered users`}
          icon={<Users className="h-4 w-4 text-white" />}
          color="bg-blue-600"
          isLoading={usersLoading}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          description={`${stats.verificationRate}% verified`}
          icon={<UserCheck className="h-4 w-4 text-white" />}
          color="bg-green-600"
          isLoading={usersLoading}
        />
        <StatCard
          title="Blocked Users"
          value={stats.blockedUsers}
          description={`${stats.blockedUsers} blocked accounts`}
          icon={<UserX className="h-4 w-4 text-white" />}
          color="bg-red-600"
          isLoading={blockedUsersLoading}
        />
        <StatCard
          title="Operators"
          value={stats.operators}
          description={`${stats.operators} active operators`}
          icon={<Shield className="h-4 w-4 text-white" />}
          color="bg-purple-600"
          isLoading={usersLoading}
        />
      </div>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>
                Manage user accounts, verification, and access control
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {roleFilter === 'all' ? 'All Roles' : roleFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter('all')}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('CUSTOMER')}>
                  Customers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('OPERATOR')}>
                  Operators
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter('ADMIN')}>
                  Admins
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Blocked'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('blocked')}>
                  Blocked
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Trainee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Airtable ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No users found</p>
                        {searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">
                            Try adjusting your search terms
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            {user.role === 'CUSTOMER' && user.userType && (
                              <div className="text-sm text-gray-500">
                                {user.userType}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span className="text-sm">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === 'ADMIN' ? 'destructive' :
                          user.role === 'OPERATOR' ? 'default' : 'secondary'
                        }>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'OPERATOR' ? (
                          <div className="flex flex-col gap-1">
                            {(traineeByOperatorId[user.id] ?? user.isTrainee) && (
                              <Badge variant="secondary">Trainee</Badge>
                            )}
                            {!(autofillByOperatorId[user.id] ?? user.autofillEnabled ?? true) && (
                              <Badge variant="outline">Autofill Off</Badge>
                            )}
                            {!(traineeByOperatorId[user.id] ?? user.isTrainee) && (autofillByOperatorId[user.id] ?? user.autofillEnabled ?? true) && (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? "Active" : "Blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {user.isVerified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'OPERATOR' ? (
                          <div className="text-sm text-gray-600">
                            {user.operatorAirtableId || 'N/A'}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUserDetails(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            {user.role === 'OPERATOR' && (
                              <DropdownMenuItem
                                onClick={() => handleToggleTrainee(user, !(traineeByOperatorId[user.id] ?? user.isTrainee))}
                                disabled={patchTraineeMutation.isPending}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {(traineeByOperatorId[user.id] ?? user.isTrainee)
                                  ? 'Remove trainee status'
                                  : 'Mark as trainee'}
                              </DropdownMenuItem>
                            )}
                            {user.role === 'OPERATOR' && (
                              <DropdownMenuItem
                                onClick={() => handleToggleAutofill(user, !(autofillByOperatorId[user.id] ?? user.autofillEnabled ?? true))}
                                disabled={patchAutofillMutation.isPending}
                              >
                                <Search className="h-4 w-4 mr-2" />
                                {(autofillByOperatorId[user.id] ?? user.autofillEnabled ?? true)
                                  ? 'Disable autofill'
                                  : 'Enable autofill'}
                              </DropdownMenuItem>
                            )}
                            {!user.isVerified && (
                              <DropdownMenuItem onClick={() => handleVerifyUser(user.id)}>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Verify User
                              </DropdownMenuItem>
                            )}
                            {user.isActive ? (
                              <DropdownMenuItem 
                                onClick={() => handleBlockUser(user.id)}
                                className="text-red-600"
                              >
                                <ShieldX className="h-4 w-4 mr-2" />
                                Block User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnblockUser(user.id)}>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Unblock User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-gray-600">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-gray-600">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <p className="text-sm text-gray-600">{selectedUser.role}</p>
                </div>
                {selectedUser.role === 'CUSTOMER' && (
                  <div>
                    <label className="text-sm font-medium">User Type</label>
                    <p className="text-sm text-gray-600">{selectedUser.userType}</p>
                  </div>
                )}
                {selectedUser.role === 'OPERATOR' && (
                  <div>
                    <label className="text-sm font-medium">Operator Airtable ID</label>
                    <p className="text-sm text-gray-600">{selectedUser.operatorAirtableId || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedUser.isActive ? "default" : "destructive"}>
                    {selectedUser.isActive ? "Active" : "Blocked"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Verification</label>
                  <Badge variant={selectedUser.isVerified ? "default" : "secondary"}>
                    {selectedUser.isVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedUser.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User</label>
                <p className="text-sm text-gray-600">
                  {editingUser.firstName} {editingUser.lastName} ({editingUser.email})
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select 
                  value={editFormData.role} 
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="BUSINESS_OWNER">Business Owner</SelectItem>
                    <SelectItem value="OPERATOR">Operator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editFormData.role === 'CUSTOMER' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Type</label>
                  <Select 
                    value={editFormData.userType} 
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, userType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KABISA_OWNER">Kabisa Owner</SelectItem>
                      <SelectItem value="KABISA_MEMBER">Kabisa Member</SelectItem>
                      <SelectItem value="GUEST">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              {editFormData.role === 'OPERATOR' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operator Airtable ID</label>
                  <Input
                    value={editFormData.operatorAirtableId}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, operatorAirtableId: e.target.value }))}
                    placeholder="Enter Airtable ID"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={editFormData.isVerified}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, isVerified: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isVerified" className="text-sm font-medium">
                  Verified
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </label>
              </div>

              {editFormData.role === 'OPERATOR' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isTrainee"
                    checked={editFormData.isTrainee}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isTrainee: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isTrainee" className="text-sm font-medium">
                    Trainee (generates training EBMs only)
                  </label>
                </div>
              )}

              {editFormData.role === 'OPERATOR' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autofillEnabled"
                    checked={editFormData.autofillEnabled}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, autofillEnabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="autofillEnabled" className="text-sm font-medium">
                    Autofill enabled (auto-populate customer data from license plate)
                  </label>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditUserOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminAccessGuard>
  )
}

export default AdminUsersPage
