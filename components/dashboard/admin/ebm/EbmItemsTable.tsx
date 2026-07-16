'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Star,
  StarOff,
  MoreHorizontal,
  Cloud,
  CloudOff,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ebmItemsApi, type EbmItem } from '@/lib/api/ebmItems';

interface EbmItemsTableProps {
  onEdit?: (item: EbmItem) => void;
}

export function EbmItemsTable({ onEdit }: EbmItemsTableProps) {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EbmItem | null>(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['ebm-items'],
    queryFn: () => ebmItemsApi.getAllItems(),
    refetchInterval: 60000, // Refetch every minute
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => ebmItemsApi.setDefaultItem(id),
    onSuccess: () => {
      toast.success('Default item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to set default item');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => ebmItemsApi.deactivateItem(id),
    onSuccess: () => {
      toast.success('Item deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to deactivate item');
    },
  });

  const registerVsdcMutation = useMutation({
    mutationFn: (id: string) => ebmItemsApi.registerWithVsdc(id),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(`Registration failed: ${data.error}`);
      } else {
        toast.success('Item registered with VSDC successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to register with VSDC');
    },
  });

  const bulkRegisterMutation = useMutation({
    mutationFn: (itemIds: string[]) => ebmItemsApi.bulkRegisterWithVsdc(itemIds),
    onSuccess: (data) => {
      toast.success(
        `Bulk registration: ${data.summary.succeeded} succeeded, ${data.summary.failed} failed`
      );
      queryClient.invalidateQueries({ queryKey: ['ebm-items'] });
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to bulk register items');
    },
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const getVsdcStatusBadge = (item: EbmItem) => {
    if (item.vsdcRegistered) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="default" className="bg-green-600 gap-1">
                <Cloud className="h-3 w-3" />
                Registered
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Registered on {formatDate(item.vsdcRegisteredAt)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (item.vsdcErrorMessage) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Failed ({item.vsdcRetryCount})
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">Error:</p>
              <p className="text-xs">{item.vsdcErrorMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
        <CloudOff className="h-3 w-3" />
        Not Registered
      </Badge>
    );
  };

  const getTaxTypeBadge = (taxTypeCode: string) => {
    const colors: Record<string, string> = {
      A: 'bg-gray-500',
      B: 'bg-blue-600',
      C: 'bg-yellow-600',
      D: 'bg-purple-600',
    };
    const labels: Record<string, string> = {
      A: '0%',
      B: '18%',
      C: 'Exempt',
      D: 'Zero',
    };
    return (
      <Badge className={colors[taxTypeCode.toUpperCase()] || 'bg-gray-500'}>
        {taxTypeCode.toUpperCase()} ({labels[taxTypeCode.toUpperCase()] || 'N/A'})
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unregisteredIds = items
        .filter((item) => !item.vsdcRegistered)
        .map((item) => item.id);
      setSelectedItems(unregisteredIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const unregisteredCount = items.filter((item) => !item.vsdcRegistered).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => bulkRegisterMutation.mutate(selectedItems)}
              disabled={bulkRegisterMutation.isPending}
            >
              {bulkRegisterMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Register Selected with VSDC
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedItems([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    unregisteredCount > 0 &&
                    selectedItems.length === unregisteredCount
                  }
                  onCheckedChange={handleSelectAll}
                  disabled={unregisteredCount === 0}
                />
              </TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tax Type</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead>VSDC Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <XCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No EBM items found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) =>
                        handleSelectItem(item.id, checked as boolean)
                      }
                      disabled={item.vsdcRegistered}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.itemCode}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        Class: {item.itemClassCode}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getTaxTypeBadge(item.taxTypeCode)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(item.unitPrice)} RWF
                  </TableCell>
                  <TableCell>{getVsdcStatusBadge(item)}</TableCell>
                  <TableCell>
                    {item.isDefault ? (
                      <Badge className="bg-yellow-500 gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            Edit Item
                          </DropdownMenuItem>
                        )}
                        {!item.isDefault && (
                          <DropdownMenuItem
                            onClick={() => setDefaultMutation.mutate(item.id)}
                            disabled={setDefaultMutation.isPending}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {!item.vsdcRegistered && (
                          <DropdownMenuItem
                            onClick={() => registerVsdcMutation.mutate(item.id)}
                            disabled={registerVsdcMutation.isPending}
                          >
                            <Cloud className="h-4 w-4 mr-2" />
                            Register with VSDC
                          </DropdownMenuItem>
                        )}
                        {item.vsdcErrorMessage && !item.vsdcRegistered && (
                          <DropdownMenuItem
                            onClick={() => registerVsdcMutation.mutate(item.id)}
                            disabled={registerVsdcMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry VSDC Registration
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setItemToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={item.isDefault}
                        >
                          Deactivate Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Deactivate EBM Item?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to deactivate this item?</p>
              {itemToDelete && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-mono text-sm">{itemToDelete.itemCode}</p>
                  <p className="font-medium">{itemToDelete.itemName}</p>
                </div>
              )}
              <p className="text-yellow-600">
                This item will no longer be available for EBM generation.
                {itemToDelete?.vsdcRegistered && (
                  <strong>
                    {' '}
                    Note: The item will remain registered in VSDC (item codes are
                    permanent).
                  </strong>
                )}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deactivateMutation.mutate(itemToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
