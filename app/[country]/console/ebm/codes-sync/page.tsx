'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

import { Badge, Btn, Card, PageHead } from '@/components/console/ui';
import {
  syncVsdcCodes,
  getCurrentVsdcCodes,
  type VsdcCodesSyncPayload,
  type VsdcCodesSyncResponse,
  type VsdcCurrentCodesResponse,
} from '@/lib/api/admin';

interface CisSyncSinceFormProps {
  isSyncing: boolean;
  onSyncSince: (since: string) => void;
}

const CisSyncSinceForm = ({ isSyncing, onSyncSince }: CisSyncSinceFormProps) => {
  const [since, setSince] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!since.trim()) {
      toast.error('Please enter a since date in yyyyMMddHHmmss format.');
      return;
    }
    onSyncSince(since.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">Sync since specific date</p>
      <div className="mt-1 flex flex-col gap-2">
        <input
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#0B4F42] focus:ring-3 focus:ring-[#0B4F42]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90"
          placeholder="e.g. 20000128214014"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          disabled={isSyncing}
        />
        <Btn variant="default" type="submit" disabled={isSyncing} size="sm">
          <RefreshCw className="mr-1 h-4 w-4" />
          Sync from date
        </Btn>
      </div>
    </form>
  );
};

const EbmCodesSyncPage = () => {
  const [lastSyncResult, setLastSyncResult] = useState<VsdcCodesSyncResponse | null>(null);

  const {
    data: currentCodes,
    isLoading: isLoadingCodes,
    isError: isCodesError,
  } = useQuery<VsdcCurrentCodesResponse>({
    queryKey: ['vsdcCurrentCodes'],
    queryFn: getCurrentVsdcCodes,
    staleTime: 5 * 60 * 1000,
  });

  const syncCodesMutation = useMutation({
    mutationFn: async (payload: VsdcCodesSyncPayload) => {
      const res = await syncVsdcCodes(payload);
      if (!res.success) {
        const baseMessage = res.message || 'CIS codes sync failed';
        const errorDetails = res.data?.errors?.length
          ? ` (${res.data.errors.join('; ')})`
          : '';
        throw new Error(baseMessage + errorDetails);
      }
      return res;
    },
    onSuccess: (res) => {
      setLastSyncResult(res);
      const summary = res.data
        ? `Synced ${res.data.classesCreated ?? 0} classes, ${res.data.detailsCreated ?? 0} details.`
        : '';
      toast.success(res.message || summary || 'CIS codes sync completed');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'CIS codes sync failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHead
        title="CIS / VSDC Codes sync"
        sub="Sync CIS / VSDC codes from RRA and review what is currently stored."
      />

      {/* Sync controls */}
      <Card
        title={
          <span className="flex items-center gap-3">
            Sync controls
            <Badge kind="neutral">Admin only</Badge>
          </span>
        }
      >
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Run a codes sync and see the latest result.
        </p>
        <div className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">Incremental sync (recommended)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sync only new or updated codes since the last successful run. Safe to run frequently.
              </p>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => syncCodesMutation.mutate({})}
                disabled={syncCodesMutation.isPending}
                loading={syncCodesMutation.isPending}
              >
                {syncCodesMutation.isPending ? 'Syncing...' : 'Run incremental sync'}
              </Btn>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">Full sync (heavy)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Refresh all codes from CIS / VSDC from 2018.
              </p>
              <Btn
                variant="default"
                size="sm"
                onClick={() => {
                  const confirmed = globalThis.confirm(
                    'This will run a heavy full sync from the sentinel date. Continue?'
                  );
                  if (!confirmed) return;
                  syncCodesMutation.mutate({ fullSync: true });
                }}
                disabled={syncCodesMutation.isPending}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Run full sync
              </Btn>
            </div>

            <CisSyncSinceForm
              isSyncing={syncCodesMutation.isPending}
              onSyncSince={(since) => syncCodesMutation.mutate({ since })}
            />
          </div>

          {lastSyncResult && (
            <div className="mt-2 space-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-400">
              <p className="font-medium text-gray-800 dark:text-white/90">Last sync result</p>
              <p>{lastSyncResult.message}</p>
              {lastSyncResult.data?.resultDt && (
                <p>
                  <span className="font-medium">resultDt:</span>{' '}
                  <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                    {lastSyncResult.data.resultDt}
                  </code>
                </p>
              )}
              {(lastSyncResult.data?.classesCreated != null ||
                lastSyncResult.data?.detailsCreated != null) && (
                <p>
                  <span className="font-medium">Summary:</span>{' '}
                  {lastSyncResult.data?.classesCreated ?? 0} classes created,{' '}
                  {lastSyncResult.data?.classesUpdated ?? 0} updated;{' '}
                  {lastSyncResult.data?.detailsCreated ?? 0} details created,{' '}
                  {lastSyncResult.data?.detailsUpdated ?? 0} updated.
                </p>
              )}
              {lastSyncResult.data?.errors && lastSyncResult.data.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-800 dark:text-white/90">View errors</summary>
                  <ul className="mt-1 list-disc pl-4">
                    {lastSyncResult.data.errors.map((err, idx) => (
                      <li key={`${err}-${idx}`}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Current stored codes */}
      <Card title="Current stored codes">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Codes currently available for use in EBM-related screens.
        </p>
        <div className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
          {isLoadingCodes && <p>Loading current codes...</p>}
          {isCodesError && (
            <p className="text-red-500">
              Failed to load current codes. Please refresh or check your connection.
            </p>
          )}

          {currentCodes?.data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <CodeList title="Payment methods" items={currentCodes.data.paymentMethods} />
              <CodeList title="Refund reasons" items={currentCodes.data.refundReasons} />
              <CodeList title="Sales types" items={currentCodes.data.salesTypes} />
              <CodeList title="Receipt types" items={currentCodes.data.receiptTypes} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EbmCodesSyncPage;

interface CodeListProps {
  title: string;
  items: { code: string; name: string }[];
}

const CodeList = ({ title, items }: CodeListProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
        {title}{' '}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({items.length})
        </span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No codes available.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs dark:border-gray-700 dark:bg-black">
          {items.map((item) => (
            <li key={item.code} className="flex justify-between gap-2">
              <span className="rounded bg-gray-200 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                {item.code}
              </span>
              <span className="flex-1 truncate text-right">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
