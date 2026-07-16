'use client';

import { Button } from '@/components/ui/button';
import { DataTable } from './DataTable';
import { Heading } from './heading';
import { Separator } from '@/components/ui/separator';
import { Plus, LucideIcon } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { SharedTableActions } from './SharedTableActions';
import { SharedTableSkeleton } from './SharedTableSkeleton';
import { BarLoader } from 'react-spinners';
import { Breadcrumbs } from '../breadcrumbs';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterableField {
  field: string;
  label: string;
  options?: FilterOption[];
}

interface AdditionalAction<T> {
  label: string;
  icon: LucideIcon;
  onClick: (record: T) => void;
  show?: (record: T) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title: string;
  description: string;
  onAdd?: () => void;
  onDelete?: (row: T) => Promise<void>;
  onUpdate?: (row: T) => void;
  onView?: (row: T) => void;
  isLoading?: boolean;
  isSendingRequest?: boolean;
  showDefaultActions?: boolean;
  icon?: LucideIcon;
  additionalActions?: AdditionalAction<T>[];
  filterableFields?: FilterableField[];
  searchableFields?: string[];
  showBreadcrumbs?: boolean;
  getRowId?: (row: T) => string;
}

const SharedTable = <T extends Record<string, any>>({
  data,
  columns,
  title,
  description,
  onAdd,
  onDelete,
  onUpdate,
  onView,
  isLoading = false,
  showDefaultActions = false,
  isSendingRequest = false,
  icon: Icon,
  additionalActions = [],
  filterableFields = [],
  searchableFields = [],
  showBreadcrumbs = true,
  getRowId,
}: TableProps<T>) => {

  const cols: ColumnDef<T>[] = [
    {
      header: '#',
      accessorFn: (row, index) => index + 1,
      id: 'rowNumber'
    },
    ...columns,
  ];

  if (showDefaultActions || additionalActions.length > 0) {
    cols.push({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2 justify-end">
            <SharedTableActions<T>
              data={row.original}
              onDelete={onDelete ? (() => onDelete(row.original)) : undefined}
              onUpdate={onUpdate ? (() => onUpdate(row.original)) : undefined}
              onView={onView ? (() => onView(row.original)) : undefined}
              additionalActions={additionalActions}
            />
          </div>
        );
      }
    });
  }

  const handleAdd = () => {
    if (onAdd) { onAdd(); }
  };

  if (isLoading) {
    return <SharedTableSkeleton columnCount={cols.length} rowCount={5} />;
  }

  return (
    <>
      {showBreadcrumbs && <Breadcrumbs />}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <Heading
            title={`${title} (${data.length})`}
            description={description}
          />
        </div>
        {onAdd && (
          <Button
            className="text-xs md:text-sm"
            onClick={handleAdd}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        )}
      </div>
      <Separator />
      {isSendingRequest && (
        <div className="w-full">
          <BarLoader color="#001d3d" width="100%" />
        </div>
      )}

      <DataTable 
        columns={cols} 
        data={data}
        filterableFields={filterableFields}
        searchableFields={searchableFields}
      />
    </>
  );
};

export default SharedTable;