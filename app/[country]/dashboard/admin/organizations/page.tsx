'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, Users2, Battery, Link, Upload } from 'lucide-react';
import { getAllOrganizations, createOrganization, updateOrganization, deleteOrganization } from '@/lib/api/organizations';
import { getOperators, type AdminOperator } from '@/lib/api/admin';
import { getAllCountries } from '@/lib/api/countries';
import type { Organization, CreateOrganizationData, UpdateOrganizationData } from '@/types/organization';
import type { Country } from '@/types/country';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ImageUpload from '@/components/ui/image-upload';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { Search } from 'lucide-react';

export default function OrganizationsPage() {
  const router = useLocalizedRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<CreateOrganizationData>({ name: '' });
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [isSaving, setIsSaving] = useState(false);
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);

  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllOrganizations();
      setOrganizations(response.data || []);
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOperators = useCallback(async () => {
    try {
      const response = await getOperators();
      setOperators(response.data.operators || []);
    } catch (error) {
      console.error('Failed to fetch operators:', error);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await getAllCountries();
      setCountries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    }
  }, []);

  useEffect(() => { fetchOrganizations(); fetchOperators(); fetchCountries(); }, [fetchOrganizations, fetchOperators, fetchCountries]);

  const filteredOperators = operators.filter((op) => {
    if (!operatorSearch) return true;
    const s = operatorSearch.toLowerCase();
    return `${op.firstName} ${op.lastName}`.toLowerCase().includes(s)
      || (op.email && op.email.toLowerCase().includes(s))
      || (op.phone && op.phone.includes(s));
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error('Organization name is required'); return; }
    setIsSaving(true);
    try {
      await createOrganization(formData);
      toast.success('Organization created');
      setShowCreateDialog(false);
      setFormData({ name: '' });
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editOrg) return;
    setIsSaving(true);
    try {
      const updateData: UpdateOrganizationData = {};
      if (formData.name && formData.name !== editOrg.name) updateData.name = formData.name;
      if (formData.citrineTenantId !== undefined) updateData.citrineTenantId = formData.citrineTenantId;
      if (formData.logo !== undefined) updateData.logo = formData.logo;
      if (formData.defaultOperatorId !== undefined) updateData.defaultOperatorId = formData.defaultOperatorId;
      if (formData.countryId !== undefined) updateData.countryId = formData.countryId;
      await updateOrganization(editOrg.id, updateData);
      toast.success('Organization updated');
      setEditOrg(null);
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmOrg) return;
    try {
      await deleteOrganization(deleteConfirmOrg.id);
      toast.success('Organization deleted');
      setDeleteConfirmOrg(null);
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete organization');
    }
  };

  const openEdit = (org: Organization) => {
    setFormData({ name: org.name, citrineTenantId: org.citrineTenantId, logo: org.logo, defaultOperatorId: org.defaultOperatorId, countryId: org.countryId });
    setLogoMode(org.logo ? 'url' : 'upload');
    setOperatorSearch('');
    setEditOrg(org);
  };

  const renderOrgFormFields = (showPlaceholders: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>Name {showPlaceholders && '*'}</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={showPlaceholders ? 'e.g. EVP, IZI' : undefined} />
      </div>
      <div>
        <Label>Country</Label>
        <Select value={formData.countryId ?? 'none'} onValueChange={v => setFormData({ ...formData, countryId: v === 'none' ? null : v })}>
          <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code}) — {c.currency}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Citrine Tenant ID</Label>
        <Input type="number" value={formData.citrineTenantId ?? ''} onChange={(e) => setFormData({ ...formData, citrineTenantId: e.target.value ? parseInt(e.target.value) : null })} placeholder={showPlaceholders ? 'Integer from Citrine Tenants table' : undefined} />
      </div>
      <div>
        <Label className="mb-2 block">Logo</Label>
        <Tabs value={logoMode} onValueChange={(v) => setLogoMode(v as 'upload' | 'url')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="upload" className="text-xs flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</TabsTrigger>
            <TabsTrigger value="url" className="text-xs flex items-center gap-1"><Link className="w-3 h-3" /> URL</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-2">
            <ImageUpload
              name="logo"
              label="Organization Logo"
              currentImage={formData.logo}
              onImageChange={(_name, url) => setFormData({ ...formData, logo: url || null })}
              isRequired={false}
              compact
              uploadContext="organization-image"
              entityId={editOrg?.id}
            />
          </TabsContent>
          <TabsContent value="url" className="mt-2">
            <Input value={formData.logo ?? ''} onChange={(e) => setFormData({ ...formData, logo: e.target.value || null })} placeholder={showPlaceholders ? 'https://...' : undefined} />
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <Label>Default Operator</Label>
        <Select
          value={formData.defaultOperatorId ?? 'none'}
          onValueChange={(v) => setFormData({ ...formData, defaultOperatorId: v === 'none' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operator..." />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search operators..."
                  value={operatorSearch}
                  onChange={(e) => { e.stopPropagation(); setOperatorSearch(e.target.value); }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="pl-7 h-8 text-sm"
                />
              </div>
            </div>
            <SelectItem value="none">None</SelectItem>
            {filteredOperators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.firstName} {op.lastName} {op.email ? `(${op.email})` : ''}
              </SelectItem>
            ))}
            {filteredOperators.length === 0 && operatorSearch && (
              <div className="px-2 py-1.5 text-sm text-gray-500">No operators found</div>
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">Fallback operator for Citrine sessions when no one is on shift</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage charging network organizations and their Citrine tenant mappings</p>
        </div>
        <Button onClick={() => { setFormData({ name: '' }); setOperatorSearch(''); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Organization
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No organizations found</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Country</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Citrine Tenant ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Users</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Chargers</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/admin/organizations/${org.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {org.country ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs font-medium">
                        <span className="font-mono">{org.country.code}</span> {org.country.name}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {org.citrineTenantId ?? <span className="text-gray-400">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users2 className="w-4 h-4" /> {org._count?.users ?? 0}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Battery className="w-4 h-4" /> {org._count?.chargers ?? 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(org)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmOrg(org)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Add a new charging network organization</DialogDescription>
          </DialogHeader>
          {renderOrgFormFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editOrg} onOpenChange={() => setEditOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          {renderOrgFormFields(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmOrg} onOpenChange={() => setDeleteConfirmOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmOrg?.name}&quot;? This will remove the organization but not its users or chargers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOrg(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
