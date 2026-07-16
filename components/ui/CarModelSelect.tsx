'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Car, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { getCarModelMakes } from '@/lib/api/chargingSessions';
import { toast } from 'sonner';

interface CarModelSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CarModelSelect({
  value,
  onValueChange,
  placeholder = "Select car model/make...",
  disabled = false,
  className
}: CarModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch car models on component mount
  useEffect(() => {
    const fetchCarModels = async () => {
      try {
        setLoading(true);
        const models = await getCarModelMakes();
        setCarModels(models);
        setFilteredModels(models);
      } catch (error: any) {
        console.error('Failed to fetch car models:', error);
        toast.error('Failed to load car models. Please try again.');
        // Set some fallback models for better UX
        setCarModels([
          'Tesla Model 3',
          'Tesla Model Y', 
          'BYD Atto 3',
          'BMW iX1',
          'Volkswagen ID.4'
        ]);
        setFilteredModels([
          'Tesla Model 3',
          'Tesla Model Y', 
          'BYD Atto 3',
          'BMW iX1',
          'Volkswagen ID.4'
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCarModels();
  }, []);

  // Filter models based on search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (!searchValue.trim()) {
        setFilteredModels(carModels);
      } else {
        const filtered = carModels.filter(model =>
          model.toLowerCase().includes(searchValue.toLowerCase())
        );
        setFilteredModels(filtered);
      }
    }, 300); // Debounce search

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, carModels]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between overflow-hidden",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading && (
            <>
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
              <span className="truncate">Loading car models...</span>
            </>
          )}
          {!loading && (
            <>
              <Car className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{value || placeholder}</span>
            </>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search car models..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading car models...
                </div>
              ) : searchValue ? (
                <div className="py-6 text-center text-sm">
                  <p>No car models found for "{searchValue}"</p>
                  <p className="text-muted-foreground mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-sm">
                  <p>No car models available</p>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredModels.map((model) => (
                <CommandItem
                  key={model}
                  value={model}
                  onSelect={() => handleSelect(model)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center">
                    <Car className="mr-2 h-4 w-4 text-muted-foreground" />
                    {model}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
