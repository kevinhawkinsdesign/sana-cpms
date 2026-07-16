'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings, RefreshCw, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { getVsdcStatus, initializeVsdc } from '@/lib/api/admin';

const vsdcInitFormSchema = z.object({
  tin: z
    .string()
    .trim()
    .regex(/^[0-9]{9}$/, 'TIN must be exactly 9 digits'),
  bhfId: z
    .string()
    .trim()
    .min(1, 'Branch ID is required')
    .max(2, 'Branch ID cannot exceed 2 characters'),
  dvcSrlNo: z
    .string()
    .trim()
    .min(1, 'Device serial number is required')
    .max(100, 'Device serial number cannot exceed 100 characters'),
});

type VsdcInitFormValues = z.infer<typeof vsdcInitFormSchema>;

export default function VsdcInitPage() {
  const queryClient = useQueryClient();
  const [initResponse, setInitResponse] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // VSDC status query
  const {
    data: statusData,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isFetching: statusFetching,
  } = useQuery({
    queryKey: ['vsdc-status'],
    queryFn: () => getVsdcStatus(),
  });

  const isOnline = statusData?.data?.online ?? false;
  const responseTime = statusData?.data?.responseTime;

  // Form setup
  const form = useForm<VsdcInitFormValues>({
    resolver: zodResolver(vsdcInitFormSchema),
    defaultValues: {
      tin: '',
      bhfId: '00',
      dvcSrlNo: '',
    },
  });

  // Initialize mutation
  const initMutation = useMutation({
    mutationFn: (values: VsdcInitFormValues) =>
      initializeVsdc(values.tin, values.bhfId, values.dvcSrlNo),
    onSuccess: (data) => {
      setInitResponse(data);
      if (data.success) {
        toast.success('VSDC initialized successfully');
      } else {
        toast.error(data.message || 'VSDC initialization failed');
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error.message || 'Failed to initialize VSDC';
      setInitResponse({
        success: false,
        message,
      });
      toast.error(message);
    },
  });

  const onSubmit = (values: VsdcInitFormValues) => {
    setInitResponse(null);
    initMutation.mutate(values);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8" />
          VSDC Initialization
        </h1>
        <p className="text-muted-foreground mt-2">
          Check VSDC connection status and initialize the device for Electronic Billing Machine usage
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>VSDC Connection Status</CardTitle>
              <CardDescription>
                Current connection status of the VSDC device
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusFetching}
            >
              {statusFetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Checking status...</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {isOnline && responseTime !== undefined && (
                <span className="text-sm text-muted-foreground">
                  Response time: {responseTime}ms
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initialize Card */}
      <Card>
        <CardHeader>
          <CardTitle>Initialize VSDC</CardTitle>
          <CardDescription>
            Send initialization request to the VSDC device with your TIN and Branch ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIN (Tax Identification Number)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789"
                          maxLength={9}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bhfId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch ID (bhfId)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00"
                          maxLength={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dvcSrlNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Serial Number (dvcSrlNo)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. SN1234567890"
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={initMutation.isPending}
              >
                {initMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Initialize VSDC
              </Button>
            </form>
          </Form>

          {/* Response display */}
          {initResponse && (
            <Alert
              className="mt-4"
              variant={initResponse.success ? 'default' : 'destructive'}
            >
              <AlertTitle>
                {initResponse.success ? 'Success' : 'Error'}
              </AlertTitle>
              <AlertDescription>
                <p>{initResponse.message}</p>
                {initResponse.data && (
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                    {JSON.stringify(initResponse.data, null, 2)}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
