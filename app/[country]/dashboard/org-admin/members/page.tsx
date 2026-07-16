'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Users2, Plus, X, Search, Filter, MoreHorizontal, Pencil, ShieldCheck, Ban, ShieldOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { OrgAdminAccessGuard } from '@/components/shared/AdminAccessGuard';
import { UserRole } from '@/lib/utils/roleRedirect';
import { getOrganization, assignUsersToOrganization, removeUserFromOrganization, getAvailableUsers } from '@/lib/api/organizations';
import { updateUser as adminUpdateUser, verifyUser, blockUser, unblockUser, createUserAdmin, type UserUpdateData, type UserCreateData } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' }, { value: 'OPERATOR', label: 'Operator' },
  { value: 'ORGANIZATION_ADMIN', label: 'Org Admin' }, { value: 'ADMIN', label: 'Admin' },
];
const EDITABLE_ROLES = ['CUSTOMER', 'OPERATOR', 'ORGANIZATION_ADMIN', 'ADMIN'];
const roleBadge = (r: string) =>
  r === 'ORGANIZATION_ADMIN' ? 'bg-purple-100 text-purple-800' :
  r === 'OPERATOR' ? 'bg-blue-100 text-blue-800' :
  r === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';

export default function OrgAdminMembersPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('ALL');
  const dSearch = useDebounce(userSearch, 300);

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const dAddSearch = useDebounce(addSearch, 300);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customerWarningIds, setCustomerWarningIds] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserCreateData>({ firstName: '', lastName: '', role: 'OPERATOR' });

  // Edit dialog
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<UserUpdateData>({});
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const filters: any = {};
      if (dSearch) filters.userSearch = dSearch;
      if (userRole !== 'ALL') filters.userRole = userRole;
      const res = await getOrganization(orgId, filters);
      setUsers(res.data.users || []);
      setTotalUsers(res.data._count?.users ?? 0);
    } catch { toast.error('Failed to load members'); }
    finally { setIsLoading(false); }
  }, [orgId, dSearch, userRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!showAdd || !orgId) return;
    getAvailableUsers(orgId, dAddSearch || undefined).then(r => setAvailableUsers(r.data || [])).catch(() => {});
  }, [showAdd, orgId, dAddSearch]);

  const toggleId = (id: string, role?: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); if (role === 'CUSTOMER' && !s.has(id)) { setCustomerWarningIds(w => { const n = new Set(w); n.delete(id); return n; }); } else if (role === 'CUSTOMER') { setCustomerWarningIds(w => new Set(w).add(id)); } return s; });
  };

  const handleAdd = async () => {
    if (!orgId || selectedIds.size === 0) return;
    setAddLoading(true);
    try {
      for (const uid of customerWarningIds) { if (selectedIds.has(uid)) await adminUpdateUser(uid, { role: 'OPERATOR' }); }
      await assignUsersToOrganization(orgId, Array.from(selectedIds));
      toast.success(`${selectedIds.size} member(s) added`);
      setShowAdd(false); setSelectedIds(new Set()); setCustomerWarningIds(new Set()); fetchUsers();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setAddLoading(false); }
  };

  const handleCreate = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) { toast.error('Name is required'); return; }
    if (!createForm.email && !createForm.phone) { toast.error('Email or phone required'); return; }
    setSaving(true);
    try {
      await createUserAdmin({ ...createForm, organizationId: orgId });
      toast.success('Member created'); setShowCreate(false); fetchUsers();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => { try { await removeUserFromOrganization(orgId!, id); toast.success('Removed'); fetchUsers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };
  const handleVerify = async (id: string) => { try { await verifyUser(id); toast.success('Verified'); fetchUsers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };
  const handleBlock = async (id: string) => { try { await blockUser(id); toast.success('Blocked'); fetchUsers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };
  const handleUnblock = async (id: string) => { try { await unblockUser(id); toast.success('Unblocked'); fetchUsers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };

  const openEdit = (u: any) => {
    setEditForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', role: u.role, isVerified: u.isVerified ?? false, isActive: u.isActive ?? true, isTrainee: u.isTrainee ?? false });
    setEditUser(u);
  };
  const handleSave = async () => {
    if (!editUser) return; setSaving(true);
    try { await adminUpdateUser(editUser.id, editForm); toast.success('Updated'); setEditUser(null); fetchUsers(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <OrgAdminAccessGuard>
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Members</h1><p className="text-sm text-gray-500">Manage operators and users in your organization</p></div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search name, email, phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" /></div>
        <Select value={userRole} onValueChange={setUserRole}><SelectTrigger className="w-full sm:w-44"><Filter className="w-4 h-4 mr-1 text-gray-400" /><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={() => { setCreateForm({ firstName: '', lastName: '', role: 'OPERATOR', organizationId: orgId }); setShowCreate(true); }}><UserPlus className="w-4 h-4 mr-1" /> Create</Button>
        <Button onClick={() => { setAddSearch(''); setSelectedIds(new Set()); setCustomerWarningIds(new Set()); setShowAdd(true); }}><Plus className="w-4 h-4 mr-1" /> Add Existing</Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{dSearch || userRole !== 'ALL' ? 'No members match filters' : 'No members yet'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr></thead>
              <tbody className="divide-y">{users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '-'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerify(u.id)}><ShieldCheck className="w-4 h-4 mr-2" /> Verify</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBlock(u.id)}><Ban className="w-4 h-4 mr-2" /> Block</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUnblock(u.id)}><ShieldOff className="w-4 h-4 mr-2" /> Unblock</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRemove(u.id)} className="text-red-600"><X className="w-4 h-4 mr-2" /> Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {users.length > 0 && <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">Showing {users.length} of {totalUsers} members</div>}
      </div>

      {/* Add Existing Users Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add Members</DialogTitle><DialogDescription>Search and select users to add</DialogDescription></DialogHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-9" /></div>
          {customerWarningIds.size > 0 && <Alert className="border-orange-200 bg-orange-50"><AlertTriangle className="h-4 w-4 text-orange-600" /><AlertDescription className="text-orange-800 text-sm">{customerWarningIds.size} user(s) with CUSTOMER role will be changed to OPERATOR.</AlertDescription></Alert>}
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {availableUsers.length === 0 ? <div className="text-center py-6 text-sm text-gray-500">{dAddSearch ? 'No users found' : 'Type to search...'}</div> : availableUsers.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleId(u.id, u.role)} className="rounded border-gray-300" />
                <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{u.firstName} {u.lastName}</div><div className="text-xs text-gray-500 truncate">{u.email || u.phone || '-'}</div></div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role}</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd} disabled={selectedIds.size === 0 || addLoading}>{addLoading ? 'Adding...' : `Add ${selectedIds.size}`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Create New Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3"><div><Label>First Name *</Label><Input value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} /></div><div><Label>Last Name *</Label><Input value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} /></div></div>
            <div><Label>Email</Label><Input type="email" value={createForm.email || ''} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={createForm.phone || ''} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+250..." /></div>
            <div><Label>Role *</Label><Select value={createForm.role} onValueChange={v => setCreateForm({ ...createForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPERATOR">Operator</SelectItem><SelectItem value="ORGANIZATION_ADMIN">Organization Admin</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="cv" checked={createForm.isVerified ?? false} onChange={e => setCreateForm({ ...createForm, isVerified: e.target.checked })} className="rounded border-gray-300" /><Label htmlFor="cv">Verified</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit {editUser?.firstName} {editUser?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3"><div><Label>First Name</Label><Input value={editForm.firstName || ''} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} /></div><div><Label>Last Name</Label><Input value={editForm.lastName || ''} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} /></div></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
            <div><Label>Role</Label><Select value={editForm.role || ''} onValueChange={v => setEditForm({ ...editForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EDITABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><input type="checkbox" id="ev" checked={editForm.isVerified ?? false} onChange={e => setEditForm({ ...editForm, isVerified: e.target.checked })} className="rounded border-gray-300" /><Label htmlFor="ev">Verified</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="ea" checked={editForm.isActive ?? true} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} className="rounded border-gray-300" /><Label htmlFor="ea">Active</Label></div>
              {editForm.role === 'OPERATOR' && <div className="flex items-center gap-2"><input type="checkbox" id="et" checked={editForm.isTrainee ?? false} onChange={e => setEditForm({ ...editForm, isTrainee: e.target.checked })} className="rounded border-gray-300" /><Label htmlFor="et">Trainee</Label></div>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </OrgAdminAccessGuard>
  );
}
