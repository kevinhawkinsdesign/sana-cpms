'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Globe, Building2 } from 'lucide-react';
import { getAllCountries, createCountry, updateCountry, deleteCountry } from '@/lib/api/countries';
import type { Country, CreateCountryData, UpdateCountryData } from '@/types/country';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCountry, setEditCountry] = useState<Country | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Country | null>(null);
  const [formData, setFormData] = useState<CreateCountryData>({ name: '', code: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchCountries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllCountries();
      setCountries(response.data || []);
    } catch { toast.error('Failed to load countries'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) { toast.error('Name and code are required'); return; }
    if (formData.code.length !== 2) { toast.error('Country code must be exactly 2 characters (e.g. RW, KE)'); return; }
    setIsSaving(true);
    try {
      await createCountry(formData);
      toast.success('Country created');
      setShowCreate(false);
      setFormData({ name: '', code: '' });
      fetchCountries();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editCountry) return;
    setIsSaving(true);
    try {
      const data: UpdateCountryData = {};
      if (formData.name !== editCountry.name) data.name = formData.name;
      if (formData.code !== editCountry.code) data.code = formData.code;
      if (formData.currency !== editCountry.currency) data.currency = formData.currency;
      if (formData.receiptMethod !== editCountry.receiptMethod) data.receiptMethod = formData.receiptMethod;
      if (formData.paymentMethod !== editCountry.paymentMethod) data.paymentMethod = formData.paymentMethod;
      await updateCountry(editCountry.id, data);
      toast.success('Country updated');
      setEditCountry(null);
      fetchCountries();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await deleteCountry(deleteConfirm.id); toast.success('Country deleted'); setDeleteConfirm(null); fetchCountries(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const openEdit = (c: Country) => {
    setFormData({ name: c.name, code: c.code, currency: c.currency, receiptMethod: c.receiptMethod, paymentMethod: c.paymentMethod });
    setEditCountry(c);
  };

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Country Name *</Label>
          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Rwanda" />
        </div>
        <div>
          <Label>Code (ISO 3166) *</Label>
          <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 2) })} placeholder="RW" maxLength={2} />
        </div>
      </div>
      <div>
        <Label>Currency (ISO 4217)</Label>
        <Input value={formData.currency || ''} onChange={e => setFormData({ ...formData, currency: e.target.value })} placeholder="RWF" />
      </div>
      <div>
        <Label>Receipt Method</Label>
        <Input value={formData.receiptMethod || ''} onChange={e => setFormData({ ...formData, receiptMethod: e.target.value || null })} placeholder="e.g. EBM_RRA, KRA_TIMS" />
        <p className="text-xs text-gray-500 mt-1">Determines which fiscal receipt system to use</p>
      </div>
      <div>
        <Label>Payment Method</Label>
        <Input value={formData.paymentMethod || ''} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value || null })} placeholder="e.g. MTN_MOMO, PAYSTACK, M_PESA" />
        <p className="text-xs text-gray-500 mt-1">Determines which payment provider to use</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Countries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage countries with their receipt and payment configurations</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', code: '' }); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Country
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : countries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No countries configured</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Country</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Currency</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Receipt Method</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Payment Method</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Organizations</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {countries.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-mono font-medium">{c.code}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.currency}</td>
                  <td className="px-4 py-3 text-sm">{c.receiptMethod ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{c.receiptMethod}</span> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3 text-sm">{c.paymentMethod ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">{c.paymentMethod}</span> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1 text-sm text-gray-600"><Building2 className="w-4 h-4" /> {c._count?.organizations ?? 0}</div></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(c)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Add Country</DialogTitle><DialogDescription>Configure a new country with its receipt and payment methods</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editCountry} onOpenChange={() => setEditCountry(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Country</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCountry(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Country</DialogTitle>
          <DialogDescription>Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? Organizations using this country will be unlinked.</DialogDescription>
        </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
