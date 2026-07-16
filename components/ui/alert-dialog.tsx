'use client';

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { X, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

// Enhanced overlay variants
const overlayVariants = cva(
  "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      blur: {
        none: "",
        sm: "backdrop-blur-sm",
        md: "backdrop-blur-md",
        lg: "backdrop-blur-lg",
      },
    },
    defaultVariants: {
      blur: "sm",
    },
  }
);

// Enhanced content variants
const contentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
      },
      variant: {
        default: "border-border",
        destructive: "border-destructive/20 bg-destructive/5",
        warning: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950",
        info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
        success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
      },
    },
    defaultVariants: {
      size: "lg",
      variant: "default",
    },
  }
);

// Enhanced title variants
const titleVariants = cva("text-lg font-semibold", {
  variants: {
    variant: {
      default: "text-foreground",
      destructive: "text-destructive",
      warning: "text-orange-700 dark:text-orange-300",
      info: "text-blue-700 dark:text-blue-300",
      success: "text-green-700 dark:text-green-300",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

// Enhanced action button variants
const actionVariants = cva(buttonVariants(), {
  variants: {
    intent: {
      default: "",
      destructive: "bg-destructive hover:bg-destructive/90",
      warning: "bg-orange-600 hover:bg-orange-700 text-white",
      info: "bg-blue-600 hover:bg-blue-700 text-white",
      success: "bg-green-600 hover:bg-green-700 text-white",
    },
  },
  defaultVariants: {
    intent: "default",
  },
});

// Icon mapping for different variants
const variantIcons = {
  default: null,
  destructive: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
} as const;

// Base components
const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

// Enhanced Overlay component
interface AlertDialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>,
    VariantProps<typeof overlayVariants> {}

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  AlertDialogOverlayProps
>(({ className, blur, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(overlayVariants({ blur }), className)}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

// Enhanced Content component
interface AlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  showCloseButton?: boolean;
  closeButtonAriaLabel?: string;
  blur?: VariantProps<typeof overlayVariants>["blur"];
}

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ 
  className, 
  size, 
  variant, 
  showCloseButton = false, 
  closeButtonAriaLabel = "Close dialog",
  blur,
  children,
  ...props 
}, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay blur={blur} />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(contentVariants({ size, variant }), className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <AlertDialogPrimitive.Cancel
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          aria-label={closeButtonAriaLabel}
        >
          <X className="h-4 w-4" />
        </AlertDialogPrimitive.Cancel>
      )}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

// Enhanced Header component
interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: VariantProps<typeof titleVariants>["variant"];
  icon?: boolean;
  align?: "left" | "center";
}

const AlertDialogHeader = React.forwardRef<
  HTMLDivElement,
  AlertDialogHeaderProps
>(({ className, variant = "default", icon = true, align = "left", children, ...props }, ref) => {
  const IconComponent = variant && icon ? variantIcons[variant] : null;
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-2",
        align === "center" ? "text-center" : "text-left",
        className
      )}
      {...props}
    >
      {IconComponent && (
        <div className={cn(
          "flex",
          align === "center" ? "justify-center" : "justify-start"
        )}>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            variant === "destructive" && "bg-destructive/10 text-destructive",
            variant === "warning" && "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
            variant === "info" && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
            variant === "success" && "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
          )}>
            <IconComponent className="h-6 w-6" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
});
AlertDialogHeader.displayName = "AlertDialogHeader";

// Enhanced Footer component
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right" | "center" | "between";
  stack?: boolean;
}

const AlertDialogFooter = React.forwardRef<
  HTMLDivElement,
  AlertDialogFooterProps
>(({ className, align = "right", stack = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex gap-2",
      stack ? "flex-col" : "flex-col-reverse sm:flex-row",
      align === "left" && "sm:justify-start",
      align === "right" && "sm:justify-end",
      align === "center" && "sm:justify-center",
      align === "between" && "sm:justify-between",
      className
    )}
    {...props}
  />
));
AlertDialogFooter.displayName = "AlertDialogFooter";

// Enhanced Title component
interface AlertDialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>,
    VariantProps<typeof titleVariants> {}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  AlertDialogTitleProps
>(({ className, variant, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(titleVariants({ variant }), className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

// Enhanced Description component
interface AlertDialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> {
  variant?: "default" | "muted" | "emphasis";
}

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  AlertDialogDescriptionProps
>(({ className, variant = "default", ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm",
      variant === "default" && "text-muted-foreground",
      variant === "muted" && "text-muted-foreground/70",
      variant === "emphasis" && "text-foreground font-medium",
      className
    )}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

// Enhanced Action component
interface AlertDialogActionProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>,
    VariantProps<typeof actionVariants> {
  loading?: boolean;
  loadingText?: string;
}

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  AlertDialogActionProps
>(({ className, intent, loading, loadingText, children, disabled, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(actionVariants({ intent }), className)}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {loadingText || "Loading..."}
      </div>
    ) : (
      children
    )}
  </AlertDialogPrimitive.Action>
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

// Enhanced Cancel component
interface AlertDialogCancelProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> {
  loading?: boolean;
}

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  AlertDialogCancelProps
>(({ className, loading, disabled, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    disabled={disabled || loading}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

// Compound component for common use cases
interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "info" | "success";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  size?: VariantProps<typeof contentVariants>["size"];
  icon?: boolean;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
  size = "md",
  icon = true,
  children,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent size={size} variant={variant}>
        <AlertDialogHeader variant={variant} icon={icon}>
          <AlertDialogTitle variant={variant}>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} loading={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            intent={variant === "default" ? "default" : variant}
            onClick={handleConfirm}
            loading={loading}
            loadingText="Processing..."
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  ConfirmDialog,
  // Export variants for external use
  overlayVariants,
  contentVariants,
  titleVariants,
  actionVariants,
};