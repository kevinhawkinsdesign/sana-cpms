'use client'

import { useState } from 'react'
import { Camera, HelpCircle, X } from 'lucide-react'
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import PlateScanner from '../scanner/PlateScanner'

interface FormPlateScannerInputProps {
    control: any
    name: string
    label: string
    placeholder?: string
    description?: string
    bottomContent?: React.ReactNode
}

export const FormInputPlateScanner = ({
    control,
    name,
    label,
    placeholder,
    description,
    bottomContent
}: FormPlateScannerInputProps) => {
    const [showScanner, setShowScanner] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    const InfoIcon = () => (
        <Popover open={showTooltip} onOpenChange={setShowTooltip}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-transparent focus-visible:ring-0"
                    onClick={() => setShowTooltip(true)}
                >
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    <span className="sr-only">Show information about {label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 text-sm"
                onInteractOutside={() => setShowTooltip(false)}
                align="start"
            >
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none">{label}</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowTooltip(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground">{description}</p>
                </div>
            </PopoverContent>
        </Popover>
    )

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">{label}</FormLabel>
                        {description && <InfoIcon />}
                    </div>
                    <div className="relative mt-1.5">
                        <FormControl>
                            <Input 
                                placeholder={placeholder} 
                                {...field} 
                                className={cn(
                                    "pr-10",
                                    field.value && "bg-secondary"
                                )}
                                aria-describedby={description ? `${name}-description` : undefined}
                            />
                        </FormControl>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowScanner(true)}
                            aria-label="Scan license plate"
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                    </div>
                    <FormMessage />
                    {bottomContent && (
                        <div className="mt-1.5 text-sm text-muted-foreground">
                            {bottomContent}
                        </div>
                    )}

                    <Dialog 
                        open={showScanner} 
                        onOpenChange={setShowScanner}
                    >
                        <DialogContent className="max-w-[450px] p-4">
                            <DialogHeader>
                                <DialogTitle className="text-center">Scan License Plate</DialogTitle>
                            </DialogHeader>

                            <PlateScanner
                                onDetect={(result) => {
                                    if (result) {
                                        field.onChange(result)
                                        setShowScanner(false)
                                    }
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </FormItem>
            )}
        />
    )
}