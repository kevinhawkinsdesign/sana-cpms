'use client';

import { useState } from 'react';
import { Package, Plus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { EbmItemsTable } from '@/components/dashboard/admin/ebm/EbmItemsTable';
import { EbmItemForm } from '@/components/dashboard/admin/ebm/EbmItemForm';
import { VsdcSyncPreviewPanel } from '@/components/dashboard/admin/ebm/VsdcSyncPreviewPanel';
import type { EbmItem } from '@/lib/api/ebmItems';

export default function EbmItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EbmItem | null>(null);

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
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">EBM Items</h1>
        <p className="text-muted-foreground">
          Manage items for Electronic Billing Machine (EBM) invoices and VSDC registration
        </p>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="vsdc-sync">VSDC Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Items Management Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  EBM Items
                </CardTitle>
                <CardDescription>
                  Items available for EBM invoice generation. Register items with VSDC to use them
                  in official tax invoices.
                </CardDescription>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <EbmItemsTable onEdit={handleEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vsdc-sync" className="space-y-4">
          <VsdcSyncPreviewPanel />

          <Card>
            <CardHeader>
              <CardTitle>How VSDC Sync with Approval Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="font-semibold text-foreground mb-2">1. Fetch Changes</p>
                  <p>
                    Click "Fetch Changes from VSDC" to download items from RRA's system.
                    Changes are shown for review, not applied immediately.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">2. Review Changes</p>
                  <p>
                    Review each item - see what's new or what will change.
                    For updates, you'll see exactly which fields differ.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">3. Approve or Reject</p>
                  <p>
                    Approve items you want to sync. Reject items with mistakes -
                    they won't appear again unless VSDC data changes.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">4. Apply Changes</p>
                  <p>
                    Click "Apply Approved Items" to sync approved changes
                    to your database. Only approved items are synced.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Why approval matters:</strong> EBM invoices use your local database items.
                  Reviewing changes prevents syncing incorrect data that could affect tax receipts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingItem ? 'Edit EBM Item' : 'Create EBM Item'}
            </SheetTitle>
            <SheetDescription>
              {editingItem
                ? 'Update the item details. Note: If already registered with VSDC, changes may be limited.'
                : 'Add a new item for EBM invoices. You can optionally register it with VSDC immediately.'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <EbmItemForm
              item={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
