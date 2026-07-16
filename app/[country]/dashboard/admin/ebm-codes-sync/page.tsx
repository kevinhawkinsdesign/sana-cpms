'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <p className="font-medium text-foreground text-sm">Sync since specific date</p>
      <div className="flex flex-col gap-2 mt-1">
        <Input
          placeholder="e.g. 20000128214014"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          disabled={isSyncing}
        />
        <Button
          size="sm"
          variant="outline"
          type="submit"
          disabled={isSyncing}
          className="self-start"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync from date
        </Button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CIS / VSDC Codes sync</h2>
        <p className="text-muted-foreground">
          Sync CIS / VSDC codes from RRA and review what is currently stored.
        </p>
      </div>

      {/* Sync controls */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Sync controls</CardTitle>
              <CardDescription>
                Run a codes sync and see the latest result.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Admin only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">Incremental sync (recommended)</p>
              <p className="text-xs text-muted-foreground">
                Sync only new or updated codes since the last successful run. Safe to run frequently.
              </p>
              <Button
                size="sm"
                className="mt-1"
                onClick={() => syncCodesMutation.mutate({})}
                disabled={syncCodesMutation.isPending}
              >
                {syncCodesMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run incremental sync
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">Full sync (heavy)</p>
              <p className="text-xs text-muted-foreground">
                Refresh all codes from CIS / VSDC from 2018.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => {
                  const confirmed = globalThis.confirm(
                    'This will run a heavy full sync from the sentinel date. Continue?'
                  );
                  if (!confirmed) return;
                  syncCodesMutation.mutate({ fullSync: true });
                }}
                disabled={syncCodesMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Run full sync
              </Button>
            </div>

            <CisSyncSinceForm
              isSyncing={syncCodesMutation.isPending}
              onSyncSince={(since) => syncCodesMutation.mutate({ since })}
            />
          </div>

          {lastSyncResult && (
            <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Last sync result</p>
              <p>{lastSyncResult.message}</p>
              {lastSyncResult.data?.resultDt && (
                <p>
                  <span className="font-medium">resultDt:</span>{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">
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
                  <summary className="cursor-pointer text-foreground">View errors</summary>
                  <ul className="mt-1 list-disc pl-4">
                    {lastSyncResult.data.errors.map((err, idx) => (
                      <li key={`${err}-${idx}`}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current stored codes */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Current stored codes</CardTitle>
              <CardDescription>
                Codes currently available for use in EBM-related screens.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {isLoadingCodes && <p>Loading current codes…</p>}
          {isCodesError && (
            <p className="text-destructive">
              Failed to load current codes. Please refresh or check your connection.
            </p>
          )}

          {currentCodes?.data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <CodeList
                title="Payment methods"
                items={currentCodes.data.paymentMethods}
              />
              <CodeList
                title="Refund reasons"
                items={currentCodes.data.refundReasons}
              />
              <CodeList
                title="Sales types"
                items={currentCodes.data.salesTypes}
              />
              <CodeList
                title="Receipt types"
                items={currentCodes.data.receiptTypes}
              />
            </div>
          )}
        </CardContent>
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
      <p className="font-medium text-foreground text-sm">
        {title}{' '}
        <span className="text-xs text-muted-foreground">
          ({items.length})
        </span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No codes available.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto text-xs space-y-1 border rounded-md p-2 bg-muted/40">
          {items.map((item) => (
            <li key={item.code} className="flex justify-between gap-2">
              <span className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">
                {item.code}
              </span>
              <span className="flex-1 text-right truncate">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

