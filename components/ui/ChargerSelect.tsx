'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2, Search, Loader2 } from 'lucide-react';
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
import { getAllChargers } from '@/lib/api/shifts';
import { toast } from 'sonner';

interface Charger {
  id: string;
  kabisaId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  power: number;
  operationalStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';
  isActive: boolean;
}

interface ChargerSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  onChargerSelect?: (charger: Charger | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChargerSelect({
  value,
  onValueChange,
  onChargerSelect,
  placeholder = "Select a charger...",
  disabled = false,
  className
}: ChargerSelectProps) {
  const [open, setOpen] = useState(false);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>([]);

  // Fetch chargers on component mount
  useEffect(() => {
    const fetchChargers = async () => {
      try {
        setLoading(true);
        const response = await getAllChargers();
        const chargersData = response.data?.chargers || [];
        setChargers(chargersData);
        setFilteredChargers(chargersData);
      } catch (error: any) {
        console.error('Failed to fetch chargers:', error);
        toast.error('Failed to load chargers. Please try again.');
        setChargers([]);
        setFilteredChargers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChargers();
  }, []);

  // Filter chargers based on search input - immediate filtering for better UX
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredChargers(chargers);
    } else {
      const filtered = chargers.filter(charger =>
        charger.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
        charger.address?.toLowerCase().includes(searchValue.toLowerCase()) ||
        charger.kabisaId?.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredChargers(filtered);
    }
  }, [searchValue, chargers]);

  const handleSelect = (selectedValue: string) => {
    const selectedCharger = chargers.find(charger => charger.id === selectedValue) || null
    onValueChange(selectedValue);
    onChargerSelect?.(selectedCharger);
    setOpen(false);
    setSearchValue('');
  };

  const getSelectedChargerName = () => {
    const selectedCharger = chargers.find(charger => charger.id === value);
    return selectedCharger?.name || '';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading chargers...
            </>
          ) : value ? (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              {getSelectedChargerName()}
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              {placeholder}
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
              placeholder="Search chargers..."
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
                  Loading chargers...
                </div>
              ) : searchValue ? (
                <div className="py-6 text-center text-sm">
                  <p>No chargers found for "{searchValue}"</p>
                  <p className="text-muted-foreground mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-sm">
                  <p>No chargers available</p>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredChargers.map((charger) => (
                <CommandItem
                  key={charger.id}
                  value={`${charger.name} ${charger.address} ${charger.kabisaId}`}
                  onSelect={() => handleSelect(charger.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === charger.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {charger.name || 'Unnamed Charger'}
                      </div>
                      {charger.address && (
                        <div className="text-xs text-muted-foreground">
                          {charger.address}
                        </div>
                      )}
                    </div>
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
