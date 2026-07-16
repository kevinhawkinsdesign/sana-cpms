'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ebmConfigApi, type CreateMrcConfigData, type EbmMrcConfig } from '@/lib/api/ebmConfig';

interface MrcConfigFormProps {
  currentConfig: EbmMrcConfig | null;
}

export function MrcConfigForm({ currentConfig }: MrcConfigFormProps) {
  const [mrcValue, setMrcValue] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateMrcConfigData) => ebmConfigApi.createMrcConfig(data),
    onSuccess: () => {
      toast.success('MRC configuration created successfully');
      setMrcValue('');
      setReason('');
      setValidationError(null);
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['mrc-config'] });
      queryClient.invalidateQueries({ queryKey: ['mrc-history'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create MRC configuration';
      toast.error(errorMessage);
    },
  });

  const validateMrcValue = (value: string): boolean => {
    setValidationError(null);

    if (!value) {
      setValidationError('MRC value is required');
      return false;
    }

    if (value.length !== 11) {
      setValidationError('MRC value must be exactly 11 characters');
      return false;
    }

    if (!/^[A-Z0-9]+$/.test(value)) {
      setValidationError('MRC value must contain only uppercase letters and numbers');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateMrcValue(mrcValue)) {
      return;
    }

    if (reason && reason.length > 500) {
      setValidationError('Reason must be less than 500 characters');
      return;
    }

    createMutation.mutate({
      mrcValue: mrcValue.toUpperCase(),
      reason: reason.trim() || undefined,
    });
  };

  const handleMrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setMrcValue(value);
    if (value) {
      validateMrcValue(value);
    } else {
      setValidationError(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create/Update MRC Configuration</CardTitle>
        <CardDescription>
          Configure a custom Machine Registration Code (MRC) to override the VSDC-provided MRC for newly generated EBM receipts.
          {currentConfig && (
            <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
              ⚠️ Creating a new configuration will automatically deactivate the current active MRC.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* MRC Value Input */}
          <div className="space-y-2">
            <Label htmlFor="mrcValue">
              MRC Value <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mrcValue"
              type="text"
              placeholder="MRC12345678"
              value={mrcValue}
              onChange={handleMrcChange}
              maxLength={11}
              className={validationError ? 'border-red-500' : ''}
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Must be exactly 11 characters, uppercase letters and numbers only
            </p>
            {validationError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationError}
              </p>
            )}
            {mrcValue && !validationError && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Valid MRC format ({mrcValue.length}/11 characters)
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Testing new VSDC device, Switching to production MRC, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Optional reason for this MRC configuration change ({reason.length}/500 characters)
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This MRC will be used for all newly generated EBM receipts.
              Existing receipts will not be affected. The change takes effect immediately.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={createMutation.isPending || !mrcValue || !!validationError}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Configuration...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create MRC Configuration
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
