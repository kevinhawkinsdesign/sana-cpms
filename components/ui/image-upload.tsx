'use client'

import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, ImageIcon, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldError } from 'react-hook-form';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useR2Upload } from '@/lib/hooks/useR2Upload';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageUploadProps {
    name: string;
    label: string;
    currentImage: string | null | undefined;
    onImageChange: (name: string, url: string) => void;
    isRequired: boolean;
    classNames?: string;
    error?: FieldError;
    rounded?: boolean;
    cameraOnly?: boolean;
    /** Stretch full width with a short fixed height — ideal for dialogs / compact layouts */
    compact?: boolean;
    /** R2 upload context — determines the folder path in R2 (e.g. 'session-photo', 'shift-checkin-selfie') */
    uploadContext?: string;
    /** Entity ID used to build the R2 key path (e.g. session ID, shift report ID) */
    entityId?: string;
}

/** Renders the image preview, upload progress, and overlay controls when an image exists or is uploading. */
function ImageOverlay({ currentImage, isUploading, uploadProgress, label, rounded, onReplace, onRemove, onPreview }: {
    currentImage: string | null | undefined;
    isUploading: boolean;
    uploadProgress: number;
    label: string;
    rounded: boolean;
    onReplace: (e: React.MouseEvent) => void;
    onRemove: (e: React.MouseEvent) => void;
    onPreview: (e: React.MouseEvent) => void;
}) {
    if (!currentImage && !isUploading) return null;

    return (
        <>
            {isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4">
                    <Upload className="h-10 w-10 text-primary animate-bounce mb-2" />
                    <Progress value={uploadProgress} className="w-full" />
                </div>
            ) : (
                <img
                    src={currentImage || ''}
                    alt={label}
                    className={cn("w-full h-full object-cover", rounded && "rounded-full")}
                />
            )}

            {currentImage && !isUploading && (
                <div className={cn("absolute z-50", rounded ? "bottom-2 right-2" : "bottom-2 left-2")}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="secondary" size="icon" onClick={onReplace}
                                className="h-8 w-8 bg-white/95 hover:bg-white text-gray-800 shadow-lg border border-gray-200">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Replace image</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {currentImage && !isUploading && rounded && (
                <div className="absolute bottom-2 left-2 z-50">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon"
                                        className="h-8 w-8 bg-red-500/95 hover:bg-red-600 text-white shadow-lg border border-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Remove Profile Picture</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to remove your profile picture? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={onRemove} className="bg-red-600 hover:bg-red-700">
                                            Remove Picture
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent>Remove profile picture</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {currentImage && !isUploading && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50">
                    <div className="flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="secondary" size="icon" onClick={onReplace} className="bg-white/90 hover:bg-white text-gray-800">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Replace image</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="secondary" size="icon" onClick={onPreview}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview image</TooltipContent>
                        </Tooltip>
                        {!rounded && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="destructive" size="icon" onClick={onRemove}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove image</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

/** Returns the placeholder text for the empty upload state. */
function getEmptyStateText(cameraOnly: boolean, rounded: boolean): string {
    if (cameraOnly) return 'Click to take photo with camera';
    if (rounded) return 'Click to upload profile picture';
    return 'Click or drag image here';
}

const ImageUpload: React.FC<ImageUploadProps> = ({ name, label, currentImage, onImageChange, isRequired, classNames, error, rounded = false, cameraOnly = false, compact = false, uploadContext = 'session-photo', entityId }) => {
    const { upload: r2Upload, isUploading: r2IsUploading, progress: r2Progress } = useR2Upload();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Sync R2 upload state into local state
    const effectiveIsUploading = isUploading || r2IsUploading;
    const effectiveProgress = r2IsUploading ? r2Progress : uploadProgress;

    const handleImageUpload = async (file: File) => {
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            // Generate a fallback entity ID if none provided
            const resolvedEntityId = entityId || crypto.randomUUID();
            // Unique suffix per upload so each upload gets a NEW key/URL. Without it the key
            // is deterministic (context + entityId), so replacing an image returns the same
            // URL — the change isn't detected (Save stays disabled) and the browser keeps
            // showing the cached old image.
            const uploadSuffix = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

            setIsUploading(true);
            setImageError(false);

            try {
                const publicUrl = await r2Upload(file, uploadContext, resolvedEntityId, uploadSuffix);
                setUploadProgress(100);
                onImageChange(name, publicUrl);
            } catch (error) {
                console.error('Error uploading image:', error);
                toast.error('Failed to upload image. Please try again.');
            } finally {
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                }, 500);
            }
        }
    };

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === dropZoneRef.current) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    };

    const openFileOrCamera = () => {
        if (fileInputRef.current) {
            if (cameraOnly || ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
                fileInputRef.current.capture = 'environment';
            }
            fileInputRef.current.click();
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
                {label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>

            <div
                ref={dropZoneRef}
                role={!currentImage ? "button" : undefined}
                tabIndex={!currentImage ? 0 : undefined}
                onClick={!currentImage ? openFileOrCamera : undefined}
                onKeyDown={!currentImage ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileOrCamera(); } } : undefined}
                onDragEnter={cameraOnly ? undefined : handleDragEnter}
                onDragOver={cameraOnly ? undefined : handleDragOver}
                onDragLeave={cameraOnly ? undefined : handleDragLeave}
                onDrop={cameraOnly ? undefined : handleDrop}
                className={cn(
                    "relative transition-all duration-300",
                    compact ? "w-full h-28" : "w-32 h-32 sm:w-40 sm:h-40",
                    rounded ? "rounded-full" : "rounded-lg",
                    "overflow-hidden",
                    isDragging && "ring-2 ring-primary ring-offset-2 scale-105",
                    isRequired && !currentImage ? "border-2 border-destructive" : "border-2 border-input",
                    !currentImage && "cursor-pointer hover:border-primary",
                    "group",
                    classNames
                )}
            >
                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="text-center text-primary">
                            <Upload className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm">Drop image here</p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!currentImage && !effectiveIsUploading && !isDragging && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-2">
                        {rounded ? (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        ) : (
                            <div className="p-2 rounded-full bg-muted">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground text-center px-1">
                            {getEmptyStateText(cameraOnly, rounded)}
                        </p>
                    </div>
                )}

                {/* Current image or uploading state */}
                <ImageOverlay
                    currentImage={currentImage}
                    isUploading={effectiveIsUploading}
                    uploadProgress={effectiveProgress}
                    label={label}
                    rounded={rounded}
                    onReplace={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    onRemove={(e) => { e.stopPropagation(); onImageChange(name, ''); }}
                    onPreview={(e) => { e.stopPropagation(); setShowPreview(true); }}
                />

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept="image/*"
                    disabled={effectiveIsUploading}
                    capture={cameraOnly ? "environment" : undefined}
                />
            </div>

            {/* Validation message */}
            {(isRequired && !currentImage || error) && (
                <Alert variant="destructive" className="mt-2">
                    <AlertDescription>
                        {error?.message || 'This image is required'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{label}</DialogTitle>
                    </DialogHeader>
                    <div className={cn(
                        "relative aspect-video w-full overflow-hidden rounded-lg",
                        rounded && "rounded-full aspect-square"
                    )}>
                        <img
                            src={currentImage || ''}
                            alt={label}
                            className="object-contain w-full h-full"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ImageUpload; 