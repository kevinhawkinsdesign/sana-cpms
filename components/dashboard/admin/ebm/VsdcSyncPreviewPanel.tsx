'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  RefreshCw,
  Cloud,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  Check,
  X,
  History,
  Trash2,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ebmItemsApi,
  type SyncPreviewItem,
  type SyncPreviewStats,
} from '@/lib/api/ebmItems';

export function VsdcSyncPreviewPanel() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch pending previews
  const { data: pendingItems = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['sync-preview-pending'],
    queryFn: () => ebmItemsApi.getPendingPreviews(),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['sync-preview-stats'],
    queryFn: () => ebmItemsApi.getSyncPreviewStats(),
    refetchInterval: 30000,
  });

  // Fetch history
  const { data: historyData } = useQuery({
    queryKey: ['sync-preview-history'],
    queryFn: () => ebmItemsApi.getSyncHistory({ limit: 50 }),
    enabled: activeTab === 'history',
  });

  // Create sync preview mutation
  const createPreviewMutation = useMutation({
    mutationFn: () => ebmItemsApi.createSyncPreview(),
    onSuccess: (result) => {
      if (result.summary.newItems === 0 && result.summary.updatedItems === 0) {
        toast.info('No new changes found in VSDC');
      } else {
        toast.success(
          `Found ${result.summary.newItems} new items and ${result.summary.updatedItems} updates to review`
        );
      }
      queryClient.invalidateQueries({ queryKey: ['sync-preview-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to fetch from VSDC');
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (ids: string[]) => ebmItemsApi.approvePreviews(ids),
    onSuccess: (result) => {
      toast.success(`Approved ${result.approved} items`);
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['sync-preview-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to approve items');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) =>
      ebmItemsApi.rejectPreviews(ids, reason),
    onSuccess: (result) => {
      toast.success(`Rejected ${result.rejected} items`);
      setSelectedItems([]);
      setRejectDialogOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['sync-preview-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-history'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reject items');
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: () => ebmItemsApi.applyApprovedPreviews(),
    onSuccess: (result) => {
      if (result.applied > 0) {
        toast.success(`Applied ${result.applied} items to database`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} items failed to apply`);
      }
      queryClient.invalidateQueries({ queryKey: ['sync-preview-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sync-preview-history'] });
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to apply items');
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(pendingItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, id]);
    } else {
      setSelectedItems((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleRejectConfirm = () => {
    rejectMutation.mutate({ ids: selectedItems, reason: rejectReason || undefined });
  };

  const getActionBadge = (actionType: string) => {
    if (actionType === 'CREATE') {
      return (
        <Badge className="bg-green-600 gap-1">
          <Plus className="h-3 w-3" />
          New
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-600 gap-1">
        <RefreshCw className="h-3 w-3" />
        Update
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-yellow-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'APPLIED':
        return <Badge className="bg-green-600">Applied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderDiffSummary = (item: SyncPreviewItem) => {
    if (item.actionType === 'CREATE') {
      return (
        <div className="text-xs text-muted-foreground">
          New item from VSDC
        </div>
      );
    }

    if (!item.diffSummary || Object.keys(item.diffSummary).length === 0) {
      return <div className="text-xs text-muted-foreground">No changes</div>;
    }

    return (
      <div className="text-xs space-y-1">
        {Object.entries(item.diffSummary).slice(0, 3).map(([field, { old, new: newVal }]) => (
          <div key={field} className="flex items-center gap-1">
            <span className="font-medium">{field}:</span>
            <span className="text-red-500 line-through">{String(old ?? 'null')}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-green-600">{String(newVal ?? 'null')}</span>
          </div>
        ))}
        {Object.keys(item.diffSummary).length > 3 && (
          <div className="text-muted-foreground">
            +{Object.keys(item.diffSummary).length - 3} more changes
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
              <p className="text-xs text-muted-foreground">Applied</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            VSDC Sync with Approval
          </CardTitle>
          <CardDescription>
            Fetch items from VSDC and review changes before applying them to your database.
            Rejected items won't appear again unless VSDC data changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fetch Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => createPreviewMutation.mutate()}
              disabled={createPreviewMutation.isPending}
            >
              {createPreviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching from VSDC...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Fetch Changes from VSDC
                </>
              )}
            </Button>

            {stats && stats.approved > 0 && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Apply {stats.approved} Approved Items
                  </>
                )}
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review {stats?.pending ? `(${stats.pending})` : ''}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(selectedItems)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedItems([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Pending Items Table */}
              {loadingPending ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingItems.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No pending items to review. Click "Fetch Changes from VSDC" to check for updates.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              pendingItems.length > 0 &&
                              selectedItems.length === pendingItems.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) =>
                                handleSelectItem(item.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>{getActionBadge(item.actionType)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.vsdcItemCode}
                          </TableCell>
                          <TableCell>{item.vsdcItemName}</TableCell>
                          <TableCell>{renderDiffSummary(item)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => approveMutation.mutate([item.id])}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedItems([item.id]);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {historyData && historyData.items.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Reviewed At</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{getActionBadge(item.actionType)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.vsdcItemCode}
                          </TableCell>
                          <TableCell>{item.vsdcItemName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.reviewedAt
                              ? new Date(item.reviewedAt).toLocaleString()
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {item.rejectionReason || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>No sync history found.</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Rejected items will not be synced to your database. They won't appear again
                in future syncs unless the VSDC data changes.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason (optional)</label>
                <Textarea
                  placeholder="e.g., Incorrect pricing, duplicate item, etc."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
