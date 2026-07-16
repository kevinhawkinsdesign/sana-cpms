'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings, RefreshCw, Loader2 } from 'lucide-react';

import { Badge, Btn, Card, PageHead } from '@/components/console/ui';
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
    <div className="space-y-4">
      <PageHead
        title={
          <>
            <Settings className="h-6 w-6" />
            VSDC Initialization
          </>
        }
        sub="Check VSDC connection status and initialize the device for Electronic Billing Machine usage"
      />

      {/* Status Card */}
      <Card
        title="VSDC Connection Status"
        action={
          <Btn
            variant="default"
            size="sm"
            onClick={() => refetchStatus()}
            disabled={statusFetching}
            loading={statusFetching}
          >
            Refresh
          </Btn>
        }
      >
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Current connection status of the VSDC device
        </p>
        {statusLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Checking status...</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Badge kind={isOnline ? 'ok' : 'err'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {isOnline && responseTime !== undefined && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Response time: {responseTime}ms
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Initialize Card */}
      <Card title="Initialize VSDC">
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Send initialization request to the VSDC device with your TIN and Branch ID
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* TIN */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                TIN (Tax Identification Number)
              </label>
              <input
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90"
                placeholder="123456789"
                maxLength={9}
                {...form.register('tin')}
              />
              {form.formState.errors.tin && (
                <span className="mt-1 block text-xs text-red-500">
                  {form.formState.errors.tin.message}
                </span>
              )}
            </div>

            {/* Branch ID */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Branch ID (bhfId)
              </label>
              <input
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90"
                placeholder="00"
                maxLength={2}
                {...form.register('bhfId')}
              />
              {form.formState.errors.bhfId && (
                <span className="mt-1 block text-xs text-red-500">
                  {form.formState.errors.bhfId.message}
                </span>
              )}
            </div>
          </div>

          {/* Device Serial Number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Device Serial Number (dvcSrlNo)
            </label>
            <input
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#08294f] focus:ring-3 focus:ring-[#08294f]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90"
              placeholder="e.g. SN1234567890"
              maxLength={100}
              {...form.register('dvcSrlNo')}
            />
            {form.formState.errors.dvcSrlNo && (
              <span className="mt-1 block text-xs text-red-500">
                {form.formState.errors.dvcSrlNo.message}
              </span>
            )}
          </div>

          <Btn
            variant="primary"
            type="submit"
            disabled={initMutation.isPending}
            loading={initMutation.isPending}
          >
            Initialize VSDC
          </Btn>
        </form>

        {/* Response display */}
        {initResponse && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              initResponse.success
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                initResponse.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}
            >
              {initResponse.success ? 'Success' : 'Error'}
            </p>
            <p
              className={`mt-1 text-sm ${
                initResponse.success
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {initResponse.message}
            </p>
            {initResponse.data && (
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-gray-100 p-2 text-xs dark:bg-black">
                {JSON.stringify(initResponse.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
