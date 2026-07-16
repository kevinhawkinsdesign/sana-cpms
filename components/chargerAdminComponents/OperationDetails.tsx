'use client';

import React, { useState, useCallback } from 'react';
import { Settings, Loader2, AlertCircle } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormInputScanner } from '@/components/shared/FormInputScanner';
import PopupKabisaGenerator from '@/components/dashboard/sessions/PopupKabisaGenerator';
import { OperationStatus } from '@/types/enums';
import { formatEnumValue } from '@/lib/utils/formatters';
import { toast } from "sonner";
import type { Control, FieldValues } from 'react-hook-form';

// Type definitions
interface Meter {
  id: string;
  meterNumber: string;
  meterOwner: string;
}

interface OperationOptions {
  meters: Meter[];
}

interface OperationalDetailsProps {
  form: {
    control: Control<FieldValues>;
    setValue: (name: string, value: any) => void;
    watch: (name: string) => any;
  };
  options: OperationOptions;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * OperationalDetails component for charger operational configuration
 * Handles Kabisa ID, gun number, meter selection, and operational status
 */
export const OperationalDetails: React.FC<OperationalDetailsProps> = ({
  form,
  options,
  isLoading = false,
  error = null
}) => {
  const [showCreateId, setShowCreateId] = useState(false);
  const [currentField, setCurrentField] = useState<'kabisaId' | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  /**
   * Handles opening the Kabisa ID generator modal
   */
  const handleCreateNew = useCallback(() => {
    setCurrentField('kabisaId');
    setShowCreateId(true);
  }, []);

  /**
   * Handles Kabisa ID selection from generator
   */
  const handleSelectId = useCallback((id: string) => {
    try {
      form.setValue('kabisaId', id);
      setShowCreateId(false);
      setCurrentField(null);
      toast.success("Kabisa ID generated and applied successfully");
    } catch (error) {
      console.error('Error setting Kabisa ID:', error);
      toast.error("Failed to apply Kabisa ID");
    }
  }, [form]);

  /**
   * Handles modal close with confirmation if generating
   */
  const handleCloseModal = useCallback(() => {
    if (isGeneratingId) {
      if (window.confirm("ID generation is in progress. Are you sure you want to close?")) {
        setShowCreateId(false);
        setCurrentField(null);
        setIsGeneratingId(false);
      }
    } else {
      setShowCreateId(false);
      setCurrentField(null);
    }
  }, [isGeneratingId]);

  /**
   * Create New Action component with accessibility
   */
  const CreateNewAction = () => (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Don't have one?</span>
      <Button
        variant="link"
        className="px-1 h-auto font-medium"
        onClick={handleCreateNew}
        disabled={isLoading}
        aria-label="Create new Kabisa ID"
      >
        Create new one
      </Button>
    </div>
  );

  // Loading state
  if (isLoading) {
    return <OperationalDetailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Operational Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load operational details. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div 
            className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"
            aria-hidden="true"
          >
            <Settings className="w-4 h-4 text-purple-600" />
          </div>
          <CardTitle>Operational Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kabisa ID Scanner */}
            <FormInputScanner
              control={form.control}
              name="kabisaId"
              label="Kabisa ID"
              placeholder="Scan or enter Kabisa ID"
              description="You can find this ID on the charger"
              bottomContent={<CreateNewAction />}
              disabled={isLoading}
              aria-describedby="kabisa-id-help"
            />

            {/* Gun Number */}
            <FormField
              control={form.control}
              name="gun"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="gun-number">Gun Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="gun-number"
                      type="number"
                      min="1"
                      max="999"
                      placeholder="Enter gun number"
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                      disabled={isLoading}
                      aria-describedby="gun-error"
                    />
                  </FormControl>
                  <FormMessage id="gun-error" />
                </FormItem>
              )}
            />

            {/* Meter Selection */}
            <FormField
              control={form.control}
              name="meterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="meter-select">Meter</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger 
                        id="meter-select"
                        aria-describedby="meter-error"
                      >
                        <SelectValue placeholder="Select meter" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.meters.length === 0 ? (
                        <SelectItem value="" disabled>
                          No meters available
                        </SelectItem>
                      ) : (
                        options.meters.map((meter) => (
                          <SelectItem key={meter.id} value={meter.id}>
                            {meter.meterNumber} - {meter.meterOwner}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage id="meter-error" />
                </FormItem>
              )}
            />

            {/* Operational Status */}
            <FormField
              control={form.control}
              name="operationalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="status-select">Operational Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger 
                        id="status-select"
                        aria-describedby="status-error"
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(OperationStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatEnumValue(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage id="status-error" />
                </FormItem>
              )}
            />
          </div>

          {/* No Meters Warning */}
          {options.meters.length === 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No meters are available. Please add meters before configuring operational details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Kabisa ID Generator Modal */}
      <Dialog 
        open={showCreateId} 
        onOpenChange={handleCloseModal}
      >
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="kabisa-generator-description"
        >
          <DialogHeader>
            <DialogTitle>
              Generate New Kabisa ID
            </DialogTitle>
            <p 
              id="kabisa-generator-description" 
              className="text-sm text-muted-foreground"
            >
              Create a new unique Kabisa ID for your charger
            </p>
          </DialogHeader>
          
          {isGeneratingId && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Generating Kabisa ID...</span>
            </div>
          )}
          
          <PopupKabisaGenerator
            onSelectId={handleSelectId}
            onClose={handleCloseModal}
            onGenerationStart={() => setIsGeneratingId(true)}
            onGenerationEnd={() => setIsGeneratingId(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Loading skeleton component for OperationalDetails
 */
const OperationalDetailsSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default OperationalDetails;