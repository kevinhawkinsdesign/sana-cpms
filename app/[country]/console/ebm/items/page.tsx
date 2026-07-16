'use client';

import { useState } from 'react';
import { Package, Plus } from 'lucide-react';

import { Badge, Btn, Card, PageHead, Tabs } from '@/components/console/ui';
import { EbmItemsTable } from '@/components/dashboard/admin/ebm/EbmItemsTable';
import { EbmItemForm } from '@/components/dashboard/admin/ebm/EbmItemForm';
import { VsdcSyncPreviewPanel } from '@/components/dashboard/admin/ebm/VsdcSyncPreviewPanel';
import type { EbmItem } from '@/lib/api/ebmItems';

const TAB_DEFS = [
  { id: 'items', label: 'Items' },
  { id: 'vsdc-sync', label: 'VSDC Sync' },
];

export default function EbmItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EbmItem | null>(null);
  const [activeTab, setActiveTab] = useState('items');

  const handleCreateNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: EbmItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <PageHead
        title="EBM Items"
        sub="Manage items for Electronic Billing Machine (EBM) invoices and VSDC registration"
      />

      <Tabs tabs={TAB_DEFS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'items' && (
        <div className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                EBM Items
              </span>
            }
            action={
              <Btn variant="primary" icon="plus" onClick={handleCreateNew}>
                Add Item
              </Btn>
            }
          >
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Items available for EBM invoice generation. Register items with VSDC to use them
              in official tax invoices.
            </p>
            <EbmItemsTable onEdit={handleEdit} />
          </Card>
        </div>
      )}

      {activeTab === 'vsdc-sync' && (
        <div className="space-y-4">
          <VsdcSyncPreviewPanel />

          <Card title="How VSDC Sync with Approval Works">
            <div className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">1. Fetch Changes</p>
                  <p>
                    Click &quot;Fetch Changes from VSDC&quot; to download items from RRA&apos;s system.
                    Changes are shown for review, not applied immediately.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">2. Review Changes</p>
                  <p>
                    Review each item - see what&apos;s new or what will change.
                    For updates, you&apos;ll see exactly which fields differ.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">3. Approve or Reject</p>
                  <p>
                    Approve items you want to sync. Reject items with mistakes -
                    they won&apos;t appear again unless VSDC data changes.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-gray-800 dark:text-white/90">4. Apply Changes</p>
                  <p>
                    Click &quot;Apply Approved Items&quot; to sync approved changes
                    to your database. Only approved items are synced.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Why approval matters:</strong> EBM invoices use your local database items.
                  Reviewing changes prevents syncing incorrect data that could affect tax receipts.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create/Edit Form Sheet */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
            className="absolute inset-0 cursor-default border-none bg-black/50"
          />
          <div className="kc-fadeup relative w-[480px] max-w-[calc(100vw-32px)] overflow-y-auto bg-white p-6 shadow-xl dark:bg-[#1A1A1A]">
            <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white/90">
              <Package className="h-5 w-5" />
              {editingItem ? 'Edit EBM Item' : 'Create EBM Item'}
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {editingItem
                ? 'Update the item details. Note: If already registered with VSDC, changes may be limited.'
                : 'Add a new item for EBM invoices. You can optionally register it with VSDC immediately.'}
            </p>
            <EbmItemForm
              item={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
