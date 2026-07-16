'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ebmConfigApi, type EbmMrcConfig } from '@/lib/api/ebmConfig';

export function ActiveMrcConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['mrc-config'],
    queryFn: () => ebmConfigApi.getActiveMrcConfig(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const deactivateMutation = useMutation({
    mutationFn: () => ebmConfigApi.deactivateMrcConfig(),
    onSuccess: () => {
      toast.success('MRC configuration deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['mrc-config'] });
      queryClient.invalidateQueries({ queryKey: ['mrc-history'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to deactivate MRC configuration';
      toast.error(errorMessage);
    },
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active MRC Configuration</CardTitle>
          <CardDescription>Currently active custom MRC for EBM generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Active MRC Configuration</CardTitle>
          <CardDescription>Currently active custom MRC for EBM generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Custom MRC Configured</p>
            <p className="text-sm text-muted-foreground max-w-md">
              The system is currently using the VSDC-provided MRC for all newly generated EBM receipts.
              Configure a custom MRC below to override the VSDC default.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Active MRC Configuration
            </CardTitle>
            <CardDescription>Currently active custom MRC for EBM generation</CardDescription>
          </div>
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MRC Value */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">MRC Value</label>
          <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
            {config.mrcValue}
          </p>
        </div>

        {/* Reason */}
        {config.reason && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reason</label>
            <p className="text-sm">{config.reason}</p>
          </div>
        )}

        {/* Created By */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Created By</label>
          <p className="text-sm">
            {config.createdBy.firstName} {config.createdBy.lastName}
            <span className="text-muted-foreground ml-2">({config.createdBy.email})</span>
          </p>
        </div>

        {/* Created At */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Created At</label>
          <p className="text-sm">{formatDate(config.createdAt)}</p>
        </div>

        {/* Deactivate Button */}
        <div className="pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deactivate MRC Configuration
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Deactivate MRC Configuration?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    Are you sure you want to deactivate the custom MRC configuration?
                  </p>
                  <p className="font-semibold">
                    Current MRC: <span className="font-mono">{config.mrcValue}</span>
                  </p>
                  <p className="text-yellow-600 dark:text-yellow-400">
                    After deactivation, all newly generated EBM receipts will use the VSDC-provided MRC instead.
                    Existing receipts will not be affected.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deactivateMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
