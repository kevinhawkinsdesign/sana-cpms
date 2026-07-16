'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, AlertCircle, X } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAllUsers } from '@/lib/api/admin';
import { UserRole } from '@/lib/utils/roleRedirect';

// Type definitions
interface User {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: string;
}

interface UserSelectProps {
  onUserSelect: (userId: string | null) => void;
  userType?: UserRole | string;
  placeholder?: string;
  className?: string;
  value?: string | null;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  maxWidth?: string;
  showUserType?: boolean;
}

/**
 * UserSelect component for selecting users with search and filtering
 * Includes proper error handling and loading states
 */
export function UserSelect({ 
  onUserSelect, 
  userType = UserRole.CUSTOMER,
  placeholder = 'Select user...',
  className,
  value,
  disabled = false,
  required = false,
  allowClear = true,
  maxWidth = '400px',
  showUserType = false
}: UserSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Query users with proper error handling
  const { 
    data: usersResponse, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    // Shared with the admin users page, shift forms and ShiftBoard so their
    // mutations' invalidateQueries(['users']) refresh this list too.
    queryKey: ['users'],
    queryFn: getAllUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract users array safely
  const users = React.useMemo<User[]>(() => {
    const list = usersResponse?.data?.users;
    return Array.isArray(list) ? (list as User[]) : [];
  }, [usersResponse]);

  // Filter users based on userType and search query
  const filteredUsers = React.useMemo(() => {
    let filtered = users;

    // Filter by role if specified (the `userType` prop carries a UserRole value)
    if (userType && userType !== 'ALL') {
      filtered = filtered.filter(user => user.role === userType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const username = user.username?.toLowerCase() || '';
        
        return fullName.includes(query) || 
               email.includes(query) || 
               username.includes(query);
      });
    }

    return filtered;
  }, [users, userType, searchQuery]);

  // Update selected user when value prop changes
  React.useEffect(() => {
    if (value && users.length > 0) {
      const user = users.find(u => u.id === value);
      setSelectedUser(user || null);
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value, users]);

  /**
   * Handles user selection
   */
  const handleUserSelect = React.useCallback((user: User) => {
    setSelectedUser(user);
    onUserSelect(user.id);
    setOpen(false);
    setSearchQuery('');
    
    toast.success(`Selected user: ${user.firstName} ${user.lastName}`);
  }, [onUserSelect]);

  /**
   * Handles clearing selection
   */
  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(null);
    onUserSelect(null);
    
    toast.success('User selection cleared');
  }, [onUserSelect]);

  /**
   * Handles retry when there's an error
   */
  const handleRetry = React.useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Formats user display name
   */
  const formatUserDisplay = React.useCallback((user: User) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.email || user.username;
  }, []);

  /**
   * Gets role badge color
   */
  const getUserTypeBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.CUSTOMER:
        return 'default';
      case UserRole.OPERATOR:
        return 'secondary';
      case UserRole.ADMIN:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={placeholder}
            className={cn(
              'w-full justify-between',
              !selectedUser && 'text-muted-foreground',
              className
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedUser ? (
                <>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate">
                      {formatUserDisplay(selectedUser)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedUser.email}
                    </span>
                  </div>
                  {showUserType && (
                    <Badge
                      variant={getUserTypeBadgeVariant(selectedUser.role)}
                      className="text-xs"
                    >
                      {selectedUser.role}
                    </Badge>
                  )}
                </>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              {allowClear && selectedUser && !disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleClear}
                  aria-label="Clear selection"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="p-0" 
          style={{ width: maxWidth }}
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search users..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            
            <CommandList>
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading users...</span>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load users</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="ml-2"
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && filteredUsers.length === 0 && (
                <CommandEmpty>
                  {searchQuery ? 'No users found matching your search.' : 'No users available.'}
                </CommandEmpty>
              )}

              {/* Users List */}
              {!isLoading && !error && filteredUsers.length > 0 && (
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleUserSelect(user)}
                      className="flex items-center gap-2 p-3"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          selectedUser?.id === user.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {formatUserDisplay(user)}
                          </span>
                          {showUserType && (
                            <Badge
                              variant={getUserTypeBadgeVariant(user.role)}
                              className="text-xs"
                            >
                              {user.role}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </span>
                        {user.username && user.username !== user.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Required indicator */}
      {required && !selectedUser && (
        <div className="absolute -top-1 -right-1">
          <span className="text-destructive text-xs">*</span>
        </div>
      )}
    </div>
  );
}

export default UserSelect;