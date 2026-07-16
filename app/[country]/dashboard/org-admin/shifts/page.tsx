'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { OrgAdminAccessGuard } from '@/components/shared/AdminAccessGuard';
import { toast } from 'sonner';
import { Clock, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api/api';

export default function OrgAdminShiftsPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api().get('/api/operator-shift');
      if (res.data.status === 'error') throw new Error(res.data.message);
      setShifts(res.data.data?.shifts || []);
    } catch (e: any) {
      console.error('Failed to load shifts:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  return (
    <OrgAdminAccessGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
        <p className="text-sm text-gray-500">View operator shifts in your organization</p>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No shifts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Operator</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Charger</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Time</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shifts.map((shift: any) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{shift.operator?.firstName} {shift.operator?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shift.charger?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{shift.startTime || '-'} - {shift.endTime || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${shift.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </OrgAdminAccessGuard>
  );
}
