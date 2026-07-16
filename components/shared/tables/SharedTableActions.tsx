'use client';

import { Edit, Trash2, Eye, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface AdditionalAction<T> {
  label: string;
  icon: LucideIcon;
  onClick: (record: T) => void;
  show?: (record: T) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface ActionProps<T> {
  data: T;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string) => void;
  onView?: (id: string) => void;
  additionalActions?: AdditionalAction<T>[];
}

export const SharedTableActions = <T extends { id: string }>({
  data,
  onDelete,
  onUpdate,
  onView,
  additionalActions = []
}: ActionProps<T>) => {
  const handleDelete = async () => {
    try {
      if (onDelete) {
        await onDelete(data.id);
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(data.id)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {onUpdate && (
          <DropdownMenuItem onClick={() => onUpdate(data.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {additionalActions.map((action, index) => {
          if (action.show && !action.show(data)) return null;
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={index}
              onClick={() => action.onClick(data)}
              className={action.variant === 'destructive' ? 'text-destructive' : ''}
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          );
        })}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};