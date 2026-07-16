'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ebmItemsApi, type EbmItemClassification } from '@/lib/api/ebmItems';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ItemClassComboboxProps {
  value: string;
  onChange: (code: string, taxTyCd?: string) => void;
  disabled?: boolean;
}

const TAX_TYPE_LABEL: Record<string, string> = {
  A: '0%',
  B: '18%',
  C: 'Exempt',
  D: '0%',
};

function taxBadgeLabel(taxTyCd: string | null): string | null {
  if (!taxTyCd) return null;
  const pct = TAX_TYPE_LABEL[taxTyCd.toUpperCase()];
  if (!pct) return taxTyCd;
  return `${taxTyCd.toUpperCase()} (${pct})`;
}

export function ItemClassCombobox({
  value,
  onChange,
  disabled = false,
}: ItemClassComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputSearch, setInputSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // 300ms debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(inputSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputSearch]);

  // Only fetch when popover is open
  const { data, isFetching } = useQuery({
    queryKey: ['item-classifications', debouncedSearch],
    queryFn: () => ebmItemsApi.getItemClassifications(debouncedSearch || undefined, 200),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  // Separate query to resolve the display label for the current value
  const { data: selectedData } = useQuery({
    queryKey: ['item-classifications', value],
    queryFn: () => ebmItemsApi.getItemClassifications(value, 1),
    enabled: !!value && !open,
    staleTime: 1000 * 60 * 30,
  });

  const classifications: EbmItemClassification[] = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const hasMore = classifications.length < totalCount;

  // Find the selected classification in current results or from the label query
  const selectedClassification =
    classifications.find((c) => c.itemClsCd === value) ??
    selectedData?.items?.find((c: EbmItemClassification) => c.itemClsCd === value);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInputSearch('');
      setDebouncedSearch('');
    }
  };

  const handleSelect = (classification: EbmItemClassification) => {
    onChange(classification.itemClsCd, classification.taxTyCd ?? undefined);
    setOpen(false);
    setInputSearch('');
    setDebouncedSearch('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select item classification"
          disabled={disabled}
          className="w-full justify-between font-normal h-auto min-h-10 py-2"
        >
          <span className="truncate text-left">
            {selectedClassification ? (
              <>
                <span className="font-medium">{selectedClassification.itemClsCd}</span>
                {' — '}
                {selectedClassification.itemClsNm}
              </>
            ) : value ? (
              value
            ) : (
              <span className="text-muted-foreground">Select item classification...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[350px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by code or name..."
            value={inputSearch}
            onValueChange={setInputSearch}
          />

          <CommandList className="max-h-[280px]">
            {isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Searching...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>No classifications found.</CommandEmpty>

                <CommandGroup>
                  {classifications.map((classification) => {
                    const isSelected = classification.itemClsCd === value;
                    const badge = taxBadgeLabel(classification.taxTyCd);

                    return (
                      <CommandItem
                        key={classification.id}
                        value={classification.itemClsCd}
                        onSelect={() => handleSelect(classification)}
                      >
                        <Check
                          className={cn(
                            'size-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                          <span className="truncate text-sm">
                            <span className="font-mono font-medium text-xs">
                              {classification.itemClsCd}
                            </span>
                            {' — '}
                            {classification.itemClsNm}
                          </span>
                          {badge && (
                            <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0">
                              {badge}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {hasMore && (
                  <div className="border-t px-3 py-2 text-xs text-muted-foreground text-center">
                    Showing {classifications.length} of {totalCount} — type to narrow results
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
