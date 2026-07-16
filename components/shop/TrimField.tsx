'use client'

import { X, Plus, Pencil } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface TrimDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trim: string) => void;
  initialValue?: string;
  title: string;
}

const TrimDialog = ({ isOpen, onClose, onSubmit, initialValue, title }: TrimDialogProps) => {
  const [value, setValue] = useState(initialValue || '');

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter trim name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface TrimFieldProps {
  form: any; // Consider using a more specific type based on your form library
}

const TrimField = ({ form }: TrimFieldProps) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'add' | 'edit';
    editIndex?: number;
  }>({ isOpen: false, type: 'add' });

  const trims = form.watch('trims') || [];

  const handleAdd = (trim: string) => {
    const currentTrims = form.getValues('trims') || [];
    form.setValue('trims', [...currentTrims, trim], { 
      shouldValidate: true,
      shouldDirty: true 
    });
  };

  const handleEdit = (trim: string) => {
    if (typeof dialogState.editIndex !== 'undefined') {
      const currentTrims = [...trims];
      currentTrims[dialogState.editIndex] = trim;
      form.setValue('trims', currentTrims, { 
        shouldValidate: true,
        shouldDirty: true 
      });
    }
  };

  const handleDelete = (index: number) => {
    const newTrims = trims.filter((_: string, i: number) => i !== index);
    form.setValue('trims', newTrims, { 
      shouldValidate: true,
      shouldDirty: true 
    });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, type: 'add' });
  };

  return (
    <FormItem>
      <div className="flex items-center justify-between mb-2">
        <FormLabel>Trims</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogState({ isOpen: true, type: 'add' })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Trim
        </Button>
      </div>
      <FormControl>
        <div className="border rounded-md p-4">
          {trims.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">
              No trims added yet. Click the button above to add one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trims.map((trim: string, index: number) => (
                <Badge
                  key={`${trim}-${index}`}
                  variant="secondary"
                  className="px-3 py-1 flex items-center gap-2"
                >
                  {trim}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDialogState({
                        isOpen: true,
                        type: 'edit',
                        editIndex: index
                      })}
                      className="hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </FormControl>
      <FormMessage />

      <TrimDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onSubmit={dialogState.type === 'add' ? handleAdd : handleEdit}
        initialValue={dialogState.type === 'edit' ? trims[dialogState.editIndex!] : ''}
        title={dialogState.type === 'add' ? 'Add Trim' : 'Edit Trim'}
      />
    </FormItem>
  );
};

export default TrimField;