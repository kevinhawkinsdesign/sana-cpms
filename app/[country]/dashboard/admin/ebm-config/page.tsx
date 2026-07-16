'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Info } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActiveMrcConfig } from '@/components/dashboard/admin/ebm/ActiveMrcConfig';
import { MrcConfigForm } from '@/components/dashboard/admin/ebm/MrcConfigForm';
import { MrcHistoryTable } from '@/components/dashboard/admin/ebm/MrcHistoryTable';
import { ebmConfigApi } from '@/lib/api/ebmConfig';

export default function EbmConfigPage() {
  const { data: currentConfig } = useQuery({
    queryKey: ['mrc-config'],
    queryFn: () => ebmConfigApi.getActiveMrcConfig(),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          EBM MRC Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage custom Machine Registration Code (MRC) for Electronic Billing Machine receipts
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>What is MRC Override?</strong> The Machine Registration Code (MRC) is an 11-character
          identifier used in EBM receipts. By default, the system uses the MRC provided by Rwanda Revenue
          Authority's VSDC. You can configure a custom MRC here to override the default for all newly
          generated receipts. This is useful for testing, switching VSDC devices, or compliance requirements.
        </AlertDescription>
      </Alert>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Active Config */}
        <div>
          <ActiveMrcConfig />
        </div>

        {/* Right Column: Create/Update Form */}
        <div>
          <MrcConfigForm currentConfig={currentConfig || null} />
        </div>
      </div>

      {/* Full Width: History Table */}
      <div>
        <MrcHistoryTable />
      </div>

      {/* Documentation Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-lg">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>Format:</strong> MRC must be exactly 11 characters containing only uppercase letters
              and numbers (e.g., MRC12345678)
            </li>
            <li>
              <strong>Effect:</strong> Changes apply immediately to all newly generated EBM receipts
            </li>
            <li>
              <strong>Existing Receipts:</strong> Previous EBM receipts are not affected by MRC changes
              (immutable)
            </li>
            <li>
              <strong>Proforma Invoices:</strong> Custom MRC does NOT apply to proforma invoices - they
              always show "PROFORMA" text instead
            </li>
            <li>
              <strong>Audit Trail:</strong> All MRC configuration changes are logged with user details and
              timestamps
            </li>
            <li>
              <strong>Deactivation:</strong> Deactivating a custom MRC will revert to using the
              VSDC-provided MRC
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
