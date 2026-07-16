'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Users2, Battery, Plus, X, Search, Filter, MoreHorizontal,
  Pencil, ShieldCheck, Ban, ShieldOff, Trash2, UserPlus, AlertTriangle,
} from 'lucide-react';
import {
  getOrganization, assignUsersToOrganization, removeUserFromOrganization,
  assignChargersToOrganization, removeChargerFromOrganization,
  getAvailableUsers, getAvailableChargers,
} from '@/lib/api/organizations';
import {
  updateUser as adminUpdateUser, verifyUser, blockUser, unblockUser,
  updateCharger, deleteCharger, createUserAdmin,
  type UserUpdateData, type UserCreateData,
} from '@/lib/api/admin';
import type { OrganizationDetail } from '@/types/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Alert, AlertDescription,
} from '@/components/ui/alert';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'ORGANIZATION_ADMIN', label: 'Org Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CUSTOMER', label: 'Customer' },
];
const EDITABLE_ROLES = ['CUSTOMER', 'OPERATOR', 'ORGANIZATION_ADMIN', 'ADMIN'];
const USER_TYPES = ['KABISA_OWNER', 'KABISA_MEMBER', 'GUEST'];
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'BEING_INSTALLED', label: 'Being Installed' },
  { value: 'PLANNED_FOR_FUTURE_DATE', label: 'Planned' },
];
const CHARGER_STATUS_LIST = ['OPERATIONAL', 'UNDER_REPAIR', 'CLOSED', 'CANCELLED', 'BEING_INSTALLED', 'PLANNED_FOR_FUTURE_DATE'];

const roleBadge = (r: string) =>
  r === 'ORGANIZATION_ADMIN' ? 'bg-purple-100 text-purple-800' :
  r === 'OPERATOR' ? 'bg-blue-100 text-blue-800' :
  r === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
const statusBadge = (s: string) =>
  s === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
  s === 'UNDER_REPAIR' ? 'bg-yellow-100 text-yellow-800' :
  s === 'CLOSED' || s === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OrganizationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useLocalizedRouter();
  const orgId = params.organizationId as string;
  const defaultTab = searchParams.get('tab') || 'users';

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('ALL');
  const [chargerSearch, setChargerSearch] = useState('');
  const [chargerStatus, setChargerStatus] = useState('ALL');
  const dUserSearch = useDebounce(userSearch, 300);
  const dChargerSearch = useDebounce(chargerSearch, 300);

  // Add dialogs
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCharger, setShowAddCharger] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const dAddSearch = useDebounce(addSearch, 300);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableChargers, setAvailableChargers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  // Track customers that need role change
  const [customerWarningIds, setCustomerWarningIds] = useState<Set<string>>(new Set());

  // Create user dialog
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState<UserCreateData>({ firstName: '', lastName: '', role: 'OPERATOR', organizationId: '' });

  // Edit user dialog
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState<UserUpdateData>({});

  // Edit charger dialog
  const [editCharger, setEditCharger] = useState<any | null>(null);
  const [editChargerForm, setEditChargerForm] = useState<any>({});

  const [saving, setSaving] = useState(false);

  // ─── Fetch org ─────────────────────────────────────────────────────────────
  const fetchOrg = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (dUserSearch) filters.userSearch = dUserSearch;
      if (userRole !== 'ALL') filters.userRole = userRole;
      if (dChargerSearch) filters.chargerSearch = dChargerSearch;
      if (chargerStatus !== 'ALL') filters.chargerStatus = chargerStatus;
      const response = await getOrganization(orgId, filters);
      setOrg(response.data);
    } catch { toast.error('Failed to load organization'); }
    finally { setIsLoading(false); }
  }, [orgId, dUserSearch, userRole, dChargerSearch, chargerStatus]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  // ─── Available items for add dialogs ───────────────────────────────────────
  useEffect(() => {
    if (!showAddUser) return;
    getAvailableUsers(orgId, dAddSearch || undefined).then(r => setAvailableUsers(r.data || [])).catch(() => {});
  }, [showAddUser, orgId, dAddSearch]);
  useEffect(() => {
    if (!showAddCharger) return;
    getAvailableChargers(orgId, dAddSearch || undefined).then(r => setAvailableChargers(r.data || [])).catch(() => {});
  }, [showAddCharger, orgId, dAddSearch]);

  // ─── Toggle selection with customer guard ──────────────────────────────────
  const toggleId = (id: string, role?: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
        setCustomerWarningIds(w => { const n = new Set(w); n.delete(id); return n; });
      } else {
        s.add(id);
        if (role === 'CUSTOMER') {
          setCustomerWarningIds(w => new Set(w).add(id));
        }
      }
      return s;
    });
  };

  // ─── Add users (with customer role change) ─────────────────────────────────
  const handleAddUsers = async () => {
    if (selectedIds.size === 0) return;
    setAddLoading(true);
    try {
      // First change role for any selected customers
      for (const uid of customerWarningIds) {
        if (selectedIds.has(uid)) {
          await adminUpdateUser(uid, { role: 'OPERATOR' });
        }
      }
      await assignUsersToOrganization(orgId, Array.from(selectedIds));
      toast.success(`${selectedIds.size} user(s) added`);
      setShowAddUser(false);
      setSelectedIds(new Set());
      setCustomerWarningIds(new Set());
      fetchOrg();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setAddLoading(false); }
  };

  // ─── Create user ───────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      toast.error('First and last name are required'); return;
    }
    if (!createForm.email && !createForm.phone) {
      toast.error('Email or phone is required'); return;
    }
    setSaving(true);
    try {
      await createUserAdmin({ ...createForm, organizationId: orgId });
      toast.success('User created and added to organization');
      setShowCreateUser(false);
      fetchOrg();
    } catch (e: any) { toast.error(e?.message || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  // ─── User actions ──────────────────────────────────────────────────────────
  const handleRemoveUser = async (userId: string) => {
    try { await removeUserFromOrganization(orgId, userId); toast.success('User removed'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const handleVerifyUser = async (userId: string) => {
    try { await verifyUser(userId); toast.success('User verified'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const handleBlockUser = async (userId: string) => {
    try { await blockUser(userId); toast.success('User blocked'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const handleUnblockUser = async (userId: string) => {
    try { await unblockUser(userId); toast.success('User unblocked'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const openEditUser = (user: any) => {
    setEditUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      userType: user.userType || 'GUEST',
      isVerified: user.isVerified ?? false,
      isActive: user.isActive ?? true,
      isTrainee: user.isTrainee ?? false,
      operatorAirtableId: user.operatorAirtableId || '',
    });
    setEditUser(user);
  };
  const handleSaveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try { await adminUpdateUser(editUser.id, editUserForm); toast.success('User updated'); setEditUser(null); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ─── Charger actions ───────────────────────────────────────────────────────
  const handleAddChargers = async () => {
    if (selectedIds.size === 0) return;
    setAddLoading(true);
    try { await assignChargersToOrganization(orgId, Array.from(selectedIds)); toast.success(`${selectedIds.size} charger(s) added`); setShowAddCharger(false); setSelectedIds(new Set()); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setAddLoading(false); }
  };
  const handleRemoveCharger = async (id: string) => {
    try { await removeChargerFromOrganization(orgId, id); toast.success('Charger removed'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const handleDeleteCharger = async (id: string) => {
    try { await deleteCharger(id); toast.success('Charger deleted'); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const openEditCharger = (c: any) => {
    setEditChargerForm({ name: c.name || '', address: c.address || '', operationalStatus: c.operationalStatus, power: c.power });
    setEditCharger(c);
  };
  const handleSaveCharger = async () => {
    if (!editCharger) return;
    setSaving(true);
    try { await updateCharger(editCharger.id, editChargerForm); toast.success('Charger updated'); setEditCharger(null); fetchOrg(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const totalUsers = org?._count?.users ?? 0;
  const totalChargers = org?._count?.chargers ?? 0;

  if (isLoading && !org) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>;
  if (!org) return <div className="text-center py-12 text-gray-500">Organization not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/organizations')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3">
          {org.logo && <img src={org.logo} alt={org.name} className="w-10 h-10 rounded object-cover" />}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-sm text-gray-500">
              {org.country && <>{org.country.name} ({org.country.code}) | </>}
              Citrine Tenant ID: {org.citrineTenantId ?? 'Not set'}
              {org.defaultOperator && ` | Default Operator: ${org.defaultOperator.firstName} ${org.defaultOperator.lastName}`}
              {org.country?.receiptMethod && <> | Receipt: {org.country.receiptMethod}</>}
              {org.country?.paymentMethod && <> | Payment: {org.country.paymentMethod}</>}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-1"><Users2 className="w-4 h-4" /> Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="chargers" className="flex items-center gap-1"><Battery className="w-4 h-4" /> Chargers ({totalChargers})</TabsTrigger>
        </TabsList>

        {/* ══════════ USERS TAB ══════════ */}
        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search name, email, phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={userRole} onValueChange={setUserRole}>
              <SelectTrigger className="w-full sm:w-44"><Filter className="w-4 h-4 mr-1 text-gray-400" /><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setCreateForm({ firstName: '', lastName: '', role: 'OPERATOR', organizationId: orgId }); setShowCreateUser(true); }}>
              <UserPlus className="w-4 h-4 mr-1" /> Create User
            </Button>
            <Button onClick={() => { setAddSearch(''); setSelectedIds(new Set()); setCustomerWarningIds(new Set()); setShowAddUser(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Existing
            </Button>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            {org.users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{userSearch || userRole !== 'ALL' ? 'No users match filters' : 'No users in this organization'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Phone</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {org.users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '-'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role}</span></td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditUser(u)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleVerifyUser(u.id)}><ShieldCheck className="w-4 h-4 mr-2" /> Verify</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleBlockUser(u.id)}><Ban className="w-4 h-4 mr-2" /> Block</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUnblockUser(u.id)}><ShieldOff className="w-4 h-4 mr-2" /> Unblock</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRemoveUser(u.id)} className="text-red-600"><X className="w-4 h-4 mr-2" /> Remove from Org</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {org.users.length > 0 && <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">Showing {org.users.length} of {totalUsers} users</div>}
          </div>
        </TabsContent>

        {/* ══════════ CHARGERS TAB ══════════ */}
        <TabsContent value="chargers" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search name, Kabisa ID, address..." value={chargerSearch} onChange={e => setChargerSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={chargerStatus} onValueChange={setChargerStatus}>
              <SelectTrigger className="w-full sm:w-48"><Filter className="w-4 h-4 mr-1 text-gray-400" /><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => { setAddSearch(''); setSelectedIds(new Set()); setShowAddCharger(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Charger
            </Button>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            {org.chargers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{chargerSearch || chargerStatus !== 'ALL' ? 'No chargers match filters' : 'No chargers in this organization'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Kabisa ID</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Address</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Power</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {org.chargers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{c.kabisaId}</td>
                        <td className="px-4 py-3 font-medium">{c.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.power}W</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.operationalStatus)}`}>{c.operationalStatus.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditCharger(c)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRemoveCharger(c.id)}><X className="w-4 h-4 mr-2" /> Remove from Org</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteCharger(c.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {org.chargers.length > 0 && <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">Showing {org.chargers.length} of {totalChargers} chargers</div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ══════════ ADD EXISTING USER DIALOG ══════════ */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Users to {org.name}</DialogTitle>
            <DialogDescription>Search and select existing users to assign</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, email, phone..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-9" />
          </div>

          {customerWarningIds.size > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                {customerWarningIds.size} selected user(s) have the <strong>CUSTOMER</strong> role. They will be automatically changed to <strong>OPERATOR</strong> when added to this organization.
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {availableUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">{dAddSearch ? 'No users found' : 'Type to search...'}</div>
            ) : availableUsers.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleId(u.id, u.role)} className="rounded border-gray-300" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-gray-500 truncate">{u.email || u.phone || '-'}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role}</span>
                {u.role === 'CUSTOMER' && <span className="text-xs text-orange-600 font-medium">will change role</span>}
                {u.organizationId && u.role !== 'CUSTOMER' && <span className="text-xs text-orange-500">Other org</span>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
            <Button onClick={handleAddUsers} disabled={selectedIds.size === 0 || addLoading}>
              {addLoading ? 'Adding...' : `Add ${selectedIds.size} User${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ CREATE USER DIALOG ══════════ */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Create a new user and add them to {org.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={createForm.email || ''} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={createForm.phone || ''} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+250..." />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="ORGANIZATION_ADMIN">Organization Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="createVerified" checked={createForm.isVerified ?? false} onChange={e => setCreateForm({ ...createForm, isVerified: e.target.checked })} className="rounded border-gray-300" />
              <Label htmlFor="createVerified">Mark as Verified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ ADD CHARGER DIALOG ══════════ */}
      <Dialog open={showAddCharger} onOpenChange={setShowAddCharger}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Chargers to {org.name}</DialogTitle>
            <DialogDescription>Search and select chargers to assign</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, Kabisa ID, address..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {availableChargers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">{dAddSearch ? 'No chargers found' : 'Type to search...'}</div>
            ) : availableChargers.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleId(c.id)} className="rounded border-gray-300" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name || c.kabisaId}</div>
                  <div className="text-xs text-gray-500 truncate">{c.address || '-'} | {c.power}W</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.operationalStatus)}`}>{c.operationalStatus.replace(/_/g, ' ')}</span>
                {c.organizationId && <span className="text-xs text-orange-500">Other org</span>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCharger(false)}>Cancel</Button>
            <Button onClick={handleAddChargers} disabled={selectedIds.size === 0 || addLoading}>
              {addLoading ? 'Adding...' : `Add ${selectedIds.size} Charger${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ EDIT USER DIALOG (all fields) ══════════ */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User — {editUser?.firstName} {editUser?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={editUserForm.firstName || ''} onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={editUserForm.lastName || ''} onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editUserForm.email || ''} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editUserForm.phone || ''} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editUserForm.role || ''} onValueChange={v => setEditUserForm({ ...editUserForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDITABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUserForm.role === 'CUSTOMER' && (
              <div>
                <Label>User Type</Label>
                <Select value={editUserForm.userType || 'GUEST'} onValueChange={v => setEditUserForm({ ...editUserForm, userType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(editUserForm.role === 'OPERATOR' || editUserForm.role === 'ORGANIZATION_ADMIN') && (
              <div>
                <Label>Operator Airtable ID</Label>
                <Input value={editUserForm.operatorAirtableId || ''} onChange={e => setEditUserForm({ ...editUserForm, operatorAirtableId: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editVerified" checked={editUserForm.isVerified ?? false} onChange={e => setEditUserForm({ ...editUserForm, isVerified: e.target.checked })} className="rounded border-gray-300" />
                <Label htmlFor="editVerified">Verified</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editActive" checked={editUserForm.isActive ?? true} onChange={e => setEditUserForm({ ...editUserForm, isActive: e.target.checked })} className="rounded border-gray-300" />
                <Label htmlFor="editActive">Active</Label>
              </div>
              {editUserForm.role === 'OPERATOR' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="editTrainee" checked={editUserForm.isTrainee ?? false} onChange={e => setEditUserForm({ ...editUserForm, isTrainee: e.target.checked })} className="rounded border-gray-300" />
                  <Label htmlFor="editTrainee">Trainee (training EBMs only)</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════ EDIT CHARGER DIALOG ══════════ */}
      <Dialog open={!!editCharger} onOpenChange={() => setEditCharger(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Charger — {editCharger?.name || editCharger?.kabisaId}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editChargerForm.name || ''} onChange={e => setEditChargerForm({ ...editChargerForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editChargerForm.address || ''} onChange={e => setEditChargerForm({ ...editChargerForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Power (W)</Label>
              <Input type="number" value={editChargerForm.power || ''} onChange={e => setEditChargerForm({ ...editChargerForm, power: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editChargerForm.operationalStatus || ''} onValueChange={v => setEditChargerForm({ ...editChargerForm, operationalStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHARGER_STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCharger(null)}>Cancel</Button>
            <Button onClick={handleSaveCharger} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
