'use client';

import React, { useState, useCallback } from 'react';
import { Camera, HelpCircle, X, Loader2 } from 'lucide-react';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import QRScanner from "@/components/scanner/QrScanner";
import { toast } from "sonner";
import type { Control, FieldValues } from 'react-hook-form';

// Type definitions
interface FormInputScannerProps {
    control: Control<FieldValues>;
    name: string;
    label: string;
    placeholder?: string;
    description?: string;
    bottomContent?: React.ReactNode;
    disabled?: boolean;
    required?: boolean;
    maxLength?: number;
    pattern?: string;
    className?: string;
}

/**
 * FormInputScanner component with QR code scanning capability
 * Provides text input with integrated QR scanner and optional help tooltip
 */
export const FormInputScanner: React.FC<FormInputScannerProps> = ({
    control,
    name,
    label,
    placeholder,
    description,
    bottomContent,
    disabled = false,
    required = false,
    maxLength,
    pattern,
    className
}) => {
    const [showScanner, setShowScanner] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);

    /**
     * Handles QR code scan result
     */
    const handleScan = useCallback((result: string, field: any) => {
        if (!result || disabled) return;

        try {
            // Validate scanned result if pattern is provided
            if (pattern && !new RegExp(pattern).test(result)) {
                toast.error("Scanned code doesn't match the expected format");
                return;
            }

            // Apply maxLength constraint
            const finalResult = maxLength ? result.substring(0, maxLength) : result;
            
            field.onChange(finalResult);
            setShowScanner(false);
            setIsScanning(false);
            setScannerError(null);
            
            toast.success(`${label} scanned successfully`);
        } catch (error) {
            console.error('Error processing scanned result:', error);
            toast.error("Failed to process scanned code");
        }
    }, [disabled, pattern, maxLength, label]);

    /**
     * Handles scanner errors
     */
    const handleScannerError = useCallback((error: string) => {
        console.error('QR Scanner error:', error);
        setScannerError(error);
        setIsScanning(false);
        
        // User-friendly error messages
        let userMessage = "Failed to scan QR code";
        if (error.includes("permission")) {
            userMessage = "Camera permission denied. Please allow camera access.";
        } else if (error.includes("NotFoundError")) {
            userMessage = "No camera found. Please check your camera connection.";
        } else if (error.includes("NotReadableError")) {
            userMessage = "Camera is busy or not accessible.";
        }
        
        toast.error(userMessage);
    }, []);

    /**
     * Opens scanner with proper initialization
     */
    const openScanner = useCallback(() => {
        if (disabled) return;
        
        setShowScanner(true);
        setIsScanning(true);
        setScannerError(null);
    }, [disabled]);

    /**
     * Closes scanner and resets state
     */
    const closeScanner = useCallback(() => {
        setShowScanner(false);
        setIsScanning(false);
        setScannerError(null);
    }, []);

    /**
     * Info tooltip component with accessibility
     */
    const InfoIcon = () => (
        <Popover open={showTooltip} onOpenChange={setShowTooltip}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent focus-visible:ring-0"
                    onClick={() => setShowTooltip(true)}
                    disabled={disabled}
                    aria-label={`Show information about ${label}`}
                >
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 text-sm"
                onInteractOutside={() => setShowTooltip(false)}
                align="start"
                side="top"
            >
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none">{label}</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowTooltip(false)}
                            aria-label="Close information"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground">{description}</p>
                </div>
            </PopoverContent>
        </Popover>
    );

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <div className="flex items-center gap-2">
                        <FormLabel 
                            className="text-base font-medium"
                            htmlFor={`${name}-input`}
                        >
                            {label}
                            {required && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        {description && <InfoIcon />}
                    </div>
                    
                    <div className="relative mt-1.5">
                        <FormControl>
                            <Input 
                                {...field}
                                id={`${name}-input`}
                                placeholder={placeholder}
                                disabled={disabled}
                                maxLength={maxLength}
                                pattern={pattern}
                                className={cn(
                                    "pr-10",
                                    field.value && "bg-secondary",
                                    disabled && "opacity-50"
                                )}
                                aria-describedby={
                                    description ? `${name}-description` : undefined
                                }
                                aria-required={required}
                            />
                        </FormControl>
                        
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={openScanner}
                            disabled={disabled}
                            aria-label={`Open QR code scanner for ${label}`}
                            title={`Scan QR code for ${label}`}
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <FormMessage />
                    
                    {/* Hidden description for screen readers */}
                    {description && (
                        <div 
                            id={`${name}-description`} 
                            className="sr-only"
                        >
                            {description}
                        </div>
                    )}
                    
                    {/* Bottom content */}
                    {bottomContent && (
                        <div className="mt-1.5 text-sm text-muted-foreground">
                            {bottomContent}
                        </div>
                    )}

                    {/* QR Scanner Modal */}
                    <Dialog 
                        open={showScanner} 
                        onOpenChange={closeScanner}
                    >
                        <DialogContent 
                            className="max-w-[340px] p-4"
                            aria-describedby="scanner-description"
                        >
                            <DialogHeader>
                                <DialogTitle className="text-center">
                                    Scan {label}
                                </DialogTitle>
                                <p 
                                    id="scanner-description"
                                    className="text-sm text-muted-foreground text-center"
                                >
                                    Point your camera at the QR code to scan
                                </p>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Loading state */}
                                {isScanning && !scannerError && (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        <span className="text-sm">Initializing camera...</span>
                                    </div>
                                )}

                                {/* Error state */}
                                {scannerError && (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-destructive mb-2">
                                            {scannerError}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setScannerError(null);
                                                setIsScanning(true);
                                            }}
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                )}

                                {/* QR Scanner Component */}
                                {!scannerError && (
                                    <QRScanner
                                        onScan={(result) => handleScan(result, field)}
                                        onError={handleScannerError}
                                        onReady={() => setIsScanning(false)}
                                        enabled={showScanner}
                                    />
                                )}

                                {/* Manual input fallback */}
                                <div className="text-center">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={closeScanner}
                                        className="text-xs"
                                    >
                                        Enter manually instead
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </FormItem>
            )}
        />
    );
};

export default FormInputScanner;