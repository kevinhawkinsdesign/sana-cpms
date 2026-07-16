'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Battery, Plus, X, Search, Filter, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { OrgAdminAccessGuard } from '@/components/shared/AdminAccessGuard';
import { getOrganization, assignChargersToOrganization, removeChargerFromOrganization, getAvailableChargers } from '@/lib/api/organizations';
import { updateCharger, deleteCharger } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' }, { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' }, { value: 'CLOSED', label: 'Closed' },
  { value: 'BEING_INSTALLED', label: 'Being Installed' }, { value: 'PLANNED_FOR_FUTURE_DATE', label: 'Planned' },
];
const CHARGER_STATUS_LIST = ['OPERATIONAL', 'UNDER_REPAIR', 'CLOSED', 'CANCELLED', 'BEING_INSTALLED', 'PLANNED_FOR_FUTURE_DATE'];
const statusBadge = (s: string) =>
  s === 'OPERATIONAL' ? 'bg-green-100 text-green-800' : s === 'UNDER_REPAIR' ? 'bg-yellow-100 text-yellow-800' :
  s === 'CLOSED' || s === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';

export default function OrgAdminChargersPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [chargers, setChargers] = useState<any[]>([]);
  const [totalChargers, setTotalChargers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [chargerSearch, setChargerSearch] = useState('');
  const [chargerStatus, setChargerStatus] = useState('ALL');
  const dSearch = useDebounce(chargerSearch, 300);

  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const dAddSearch = useDebounce(addSearch, 300);
  const [availableChargers, setAvailableChargers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addLoading, setAddLoading] = useState(false);

  const [editCharger, setEditCharger] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchChargers = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const filters: any = {};
      if (dSearch) filters.chargerSearch = dSearch;
      if (chargerStatus !== 'ALL') filters.chargerStatus = chargerStatus;
      const res = await getOrganization(orgId, filters);
      setChargers(res.data.chargers || []);
      setTotalChargers(res.data._count?.chargers ?? 0);
    } catch { toast.error('Failed to load chargers'); }
    finally { setIsLoading(false); }
  }, [orgId, dSearch, chargerStatus]);

  useEffect(() => { fetchChargers(); }, [fetchChargers]);

  useEffect(() => {
    if (!showAdd || !orgId) return;
    getAvailableChargers(orgId, dAddSearch || undefined).then(r => setAvailableChargers(r.data || [])).catch(() => {});
  }, [showAdd, orgId, dAddSearch]);

  const toggleId = (id: string) => setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleAdd = async () => {
    if (!orgId || selectedIds.size === 0) return;
    setAddLoading(true);
    try { await assignChargersToOrganization(orgId, Array.from(selectedIds)); toast.success(`${selectedIds.size} charger(s) added`); setShowAdd(false); setSelectedIds(new Set()); fetchChargers(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setAddLoading(false); }
  };

  const handleRemove = async (id: string) => { try { await removeChargerFromOrganization(orgId!, id); toast.success('Removed'); fetchChargers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };
  const handleDelete = async (id: string) => { try { await deleteCharger(id); toast.success('Deleted'); fetchChargers(); } catch (e: any) { toast.error(e?.message || 'Failed'); } };

  const openEdit = (c: any) => { setEditForm({ name: c.name || '', address: c.address || '', operationalStatus: c.operationalStatus, power: c.power, pricePerKwh: c.pricePerKwh ?? '', ownerPhone: c.ownerPhone || '', ownerEmail: c.ownerEmail || '', ownerWebsite: c.ownerWebsite || '' }); setEditCharger(c); };
  const handleSave = async () => {
    if (!editCharger) return; setSaving(true);
    try {
      const payload: any = { ...editForm };
      if (payload.pricePerKwh === '' || payload.pricePerKwh == null) {
        // If the charger had a price and user cleared the field, send null so the
        // backend actually clears it. Sending undefined (or deleting the key) would
        // be stripped by JSON serialization and the price would silently persist.
        if (editCharger?.pricePerKwh != null) {
          payload.pricePerKwh = null;
        } else {
          delete payload.pricePerKwh;
        }
      } else {
        const p = Number(payload.pricePerKwh);
        if (Number.isNaN(p) || p < 0) {
          toast.error('Price per kWh must be a non-negative number');
          setSaving(false);
          return;
        }
        payload.pricePerKwh = p;
      }
      // For nullable contact fields: trim, then send null if the user cleared a
      // previously set value (delete would be stripped and the DB would keep the
      // old value). If the field was already empty, omit it from the payload.
      (['ownerPhone', 'ownerEmail', 'ownerWebsite'] as const).forEach(k => {
        if (typeof payload[k] === 'string') payload[k] = payload[k].trim();
        if (payload[k] === '' || payload[k] == null) {
          if ((editCharger as any)?.[k]) {
            payload[k] = null;
          } else {
            delete payload[k];
          }
        }
      });
      await updateCharger(editCharger.id, payload); toast.success('Updated'); setEditCharger(null); fetchChargers();
    }
    catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <OrgAdminAccessGuard>
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Chargers</h1><p className="text-sm text-gray-500">Manage charging stations in your organization</p></div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search name, Kabisa ID, address..." value={chargerSearch} onChange={e => setChargerSearch(e.target.value)} className="pl-9" /></div>
        <Select value={chargerStatus} onValueChange={setChargerStatus}><SelectTrigger className="w-full sm:w-48"><Filter className="w-4 h-4 mr-1 text-gray-400" /><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
        <Button onClick={() => { setAddSearch(''); setSelectedIds(new Set()); setShowAdd(true); }}><Plus className="w-4 h-4 mr-1" /> Add Charger</Button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : chargers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{dSearch || chargerStatus !== 'ALL' ? 'No chargers match filters' : 'No chargers yet'}</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Kabisa ID</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Address</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Power</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr></thead>
            <tbody className="divide-y">{chargers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{c.kabisaId}</td>
                <td className="px-4 py-3 font-medium">{c.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.address || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.power}W</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.operationalStatus)}`}>{c.operationalStatus.replace(/_/g, ' ')}</span></td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRemove(c.id)}><X className="w-4 h-4 mr-2" /> Remove from Org</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {chargers.length > 0 && <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">Showing {chargers.length} of {totalChargers} chargers</div>}
      </div>

      {/* Add Charger Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add Chargers</DialogTitle><DialogDescription>Search and select chargers to add</DialogDescription></DialogHeader>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-9" /></div>
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {availableChargers.length === 0 ? <div className="text-center py-6 text-sm text-gray-500">{dAddSearch ? 'No chargers found' : 'Type to search...'}</div> : availableChargers.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleId(c.id)} className="rounded border-gray-300" />
                <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{c.name || c.kabisaId}</div><div className="text-xs text-gray-500 truncate">{c.address || '-'} | {c.power}W</div></div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.operationalStatus)}`}>{c.operationalStatus.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd} disabled={selectedIds.size === 0 || addLoading}>{addLoading ? 'Adding...' : `Add ${selectedIds.size}`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Charger Dialog */}
      <Dialog open={!!editCharger} onOpenChange={() => setEditCharger(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit {editCharger?.name || editCharger?.kabisaId}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></div>
            <div><Label>Power (W)</Label><Input type="number" value={editForm.power || ''} onChange={e => setEditForm({ ...editForm, power: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Status</Label><Select value={editForm.operationalStatus || ''} onValueChange={v => setEditForm({ ...editForm, operationalStatus: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHARGER_STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Price per kWh (RWF)</Label><Input type="number" inputMode="decimal" min="0" step="0.01" value={editForm.pricePerKwh ?? ''} onChange={e => setEditForm({ ...editForm, pricePerKwh: e.target.value })} /></div>
            <div><Label>Owner phone</Label><Input type="tel" value={editForm.ownerPhone || ''} onChange={e => setEditForm({ ...editForm, ownerPhone: e.target.value })} /></div>
            <div><Label>Owner email</Label><Input type="email" value={editForm.ownerEmail || ''} onChange={e => setEditForm({ ...editForm, ownerEmail: e.target.value })} /></div>
            <div><Label>Owner website</Label><Input type="url" placeholder="https://..." value={editForm.ownerWebsite || ''} onChange={e => setEditForm({ ...editForm, ownerWebsite: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditCharger(null)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </OrgAdminAccessGuard>
  );
}
