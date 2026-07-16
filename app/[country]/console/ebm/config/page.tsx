'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Info } from 'lucide-react';

import { Card, PageHead } from '@/components/console/ui';
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
    <div className="space-y-4">
      <PageHead
        title={
          <>
            <FileText className="h-6 w-6" />
            EBM MRC Configuration
          </>
        }
        sub="Manage custom Machine Registration Code (MRC) for Electronic Billing Machine receipts"
      />

      {/* Info Alert */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>What is MRC Override?</strong> The Machine Registration Code (MRC) is an 11-character
            identifier used in EBM receipts. By default, the system uses the MRC provided by Rwanda Revenue
            Authority&apos;s VSDC. You can configure a custom MRC here to override the default for all newly
            generated receipts. This is useful for testing, switching VSDC devices, or compliance requirements.
          </span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <ActiveMrcConfig />
        </div>
        <div>
          <MrcConfigForm currentConfig={currentConfig || null} />
        </div>
      </div>

      {/* Full Width: History Table */}
      <div>
        <MrcHistoryTable />
      </div>

      {/* Documentation Card */}
      <Card title="Important Notes">
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <strong className="text-gray-700 dark:text-white/80">Format:</strong> MRC must be exactly 11 characters containing only uppercase letters
            and numbers (e.g., MRC12345678)
          </li>
          <li>
            <strong className="text-gray-700 dark:text-white/80">Effect:</strong> Changes apply immediately to all newly generated EBM receipts
          </li>
          <li>
            <strong className="text-gray-700 dark:text-white/80">Existing Receipts:</strong> Previous EBM receipts are not affected by MRC changes
            (immutable)
          </li>
          <li>
            <strong className="text-gray-700 dark:text-white/80">Proforma Invoices:</strong> Custom MRC does NOT apply to proforma invoices - they
            always show &quot;PROFORMA&quot; text instead
          </li>
          <li>
            <strong className="text-gray-700 dark:text-white/80">Audit Trail:</strong> All MRC configuration changes are logged with user details and
            timestamps
          </li>
          <li>
            <strong className="text-gray-700 dark:text-white/80">Deactivation:</strong> Deactivating a custom MRC will revert to using the
            VSDC-provided MRC
          </li>
        </ul>
      </Card>
    </div>
  );
}
