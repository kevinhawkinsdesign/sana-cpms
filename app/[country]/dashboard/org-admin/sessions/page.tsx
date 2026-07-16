'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { OrgAdminAccessGuard } from '@/components/shared/AdminAccessGuard';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Filter, Activity, Zap, Clock, Eye, MoreHorizontal } from 'lucide-react';
import { getAllSessions, getActiveSessions, type AdminSession } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'STARTED', label: 'Started' }, { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' }, { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusColor = (s: string) => {
  switch (s) {
    case 'STARTED': return 'bg-green-100 text-green-800';
    case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED': return 'bg-blue-100 text-blue-800';
    case 'PAID': return 'bg-purple-100 text-purple-800';
    case 'EBM_ISSUED': return 'bg-indigo-100 text-indigo-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function OrgAdminSessionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['orgAdminSessions', page, searchTerm, statusFilter],
    queryFn: () => getAllSessions({
      page, limit,
      organizationId: user!.organizationId!,
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
    }),
    enabled: !!user?.organizationId,
  });

  const sessions = data?.data?.sessions || [];
  const pagination = data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  return (
    <OrgAdminAccessGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Charging Sessions</h1>
        <p className="text-sm text-gray-500">All sessions on chargers in your organization</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by session ID, EBM invoice #, customer, vehicle, operator..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-4 h-4 mr-1 text-gray-400" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Zap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            {searchTerm || statusFilter !== 'all' ? 'No sessions match filters' : 'No sessions yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Session ID</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Vehicle</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Charger</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Operator</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">kWh</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sessions.map((s: AdminSession) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{s.sessionId}</td>
                    <td className="px-4 py-3 text-sm">
                      {s.customerName || s.customerPhone || s.ebmTin ? (
                        <div className="leading-tight">
                          {s.customerName && <div className="font-medium">{s.customerName}</div>}
                          {s.customerPhone && <div className="text-xs text-gray-500 font-mono">{s.customerPhone}</div>}
                          {s.ebmTin && <div className="text-xs text-gray-500 font-mono">TIN: {s.ebmTin}</div>}
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.vehicle ? (
                        <div>
                          <span className="font-medium">{s.vehicle.kabisaId || '-'}</span>
                          {s.vehicle.make && <span className="text-gray-500 ml-1">{s.vehicle.make} {s.vehicle.model}</span>}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.charger?.name || s.chargerId?.slice(0, 8) || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.operator?.firstName} {s.operator?.lastName}</td>
                    <td className="px-4 py-3 text-sm font-medium">{s.chargedKwh != null ? `${s.chargedKwh.toFixed(1)}` : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{s.totalAmount != null ? `${s.totalAmount.toLocaleString()} RWF` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.sessionStatus)}`}>
                        {s.sessionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(s.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </OrgAdminAccessGuard>
  );
}
