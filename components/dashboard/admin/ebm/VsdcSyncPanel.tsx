'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Cloud, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ebmItemsApi, type VsdcSyncResult } from '@/lib/api/ebmItems';

export function VsdcSyncPanel() {
  const queryClient = useQueryClient();
  const [lastSyncResult, setLastSyncResult] = useState<VsdcSyncResult | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => ebmItemsApi.syncFromVsdc(),
    onSuccess: (result) => {
      setLastSyncResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to sync from VSDC');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          VSDC Synchronization
        </CardTitle>
        <CardDescription>
          Sync items from RRA's VSDC system to your local database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription>
            <strong>Sync from VSDC</strong> will fetch all items registered with RRA's VSDC system
            and update your local database. New items will be created, existing items will be updated.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="w-full"
        >
          {syncMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing from VSDC...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Items from VSDC
            </>
          )}
        </Button>

        {lastSyncResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              {lastSyncResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className="font-medium">Sync Result</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="text-lg font-semibold text-green-600">
                  {lastSyncResult.itemsCreated}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="text-lg font-semibold text-blue-600">
                  {lastSyncResult.itemsUpdated}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Skipped</p>
                <p className="text-lg font-semibold text-gray-600">
                  {lastSyncResult.itemsSkipped}
                </p>
              </div>
            </div>
            {lastSyncResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-destructive">Errors:</p>
                <ul className="text-xs text-destructive list-disc list-inside">
                  {lastSyncResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {lastSyncResult.errors.length > 5 && (
                    <li>...and {lastSyncResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
