"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

// ============================================
// AlertDialog Root Components
// ============================================

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

// ============================================
// AlertDialog Overlay
// ============================================

const AlertDialogOverlay = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

// ============================================
// AlertDialog Content
// ============================================

const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
                "bg-ui-bg-primary border border-ui-border-primary rounded-xl shadow-2xl p-6",
                "duration-200",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                "focus:outline-none",
                className
            )}
            {...props}
        />
    </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

// ============================================
// AlertDialog Header
// ============================================

const AlertDialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
        {...props}
    />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

// ============================================
// AlertDialog Footer
// ============================================

const AlertDialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3 mt-6",
            className
        )}
        {...props}
    />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

// ============================================
// AlertDialog Title
// ============================================

const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold text-ui-text-primary", className)}
        {...props}
    />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

// ============================================
// AlertDialog Description
// ============================================

const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-ui-text-secondary leading-relaxed", className)}
        {...props}
    />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

// ============================================
// AlertDialog Action Button
// ============================================

const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Action>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
        variant?: "default" | "danger" | "warning";
    }
>(({ className, variant = "default", ...props }, ref) => {
    const variantClasses = {
        default: "bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white",
        danger: "bg-red-600 hover:bg-red-500 text-white",
        warning: "bg-yellow-600 hover:bg-yellow-500 text-white",
    };

    return (
        <AlertDialogPrimitive.Action
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center rounded-lg px-4 py-2.5",
                "text-sm font-semibold transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ui-bg-primary",
                "disabled:pointer-events-none disabled:opacity-50",
                variantClasses[variant],
                variant === "default" && "focus:ring-ui-accent-primary/50",
                variant === "danger" && "focus:ring-red-500/50",
                variant === "warning" && "focus:ring-yellow-500/50",
                className
            )}
            {...props}
        />
    );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

// ============================================
// AlertDialog Cancel Button
// ============================================

const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Cancel
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center rounded-lg px-4 py-2.5",
            "text-sm font-medium",
            "bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-ui-text-primary",
            "border border-ui-border-primary",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/20",
            "disabled:pointer-events-none disabled:opacity-50",
            "mt-2 sm:mt-0",
            className
        )}
        {...props}
    />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

// ============================================
// Pre-built Confirm Dialog Component
// ============================================

type ConfirmType = "info" | "warning" | "danger" | "success";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmType;
    onConfirm: () => void;
    onCancel?: () => void;
    loading?: boolean;
}

const typeConfig: Record<ConfirmType, {
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    iconBgClass: string;
    actionVariant: "default" | "danger" | "warning";
}> = {
    info: {
        icon: Info,
        iconClass: "text-ui-accent-primary",
        iconBgClass: "bg-ui-accent-primary/10",
        actionVariant: "default",
    },
    success: {
        icon: CheckCircle,
        iconClass: "text-green-500",
        iconBgClass: "bg-green-500/10",
        actionVariant: "default",
    },
    warning: {
        icon: AlertTriangle,
        iconClass: "text-yellow-500",
        iconBgClass: "bg-yellow-500/10",
        actionVariant: "warning",
    },
    danger: {
        icon: XCircle,
        iconClass: "text-red-500",
        iconBgClass: "bg-red-500/10",
        actionVariant: "danger",
    },
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning",
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmDialogProps) {
    const config = typeConfig[type];
    const IconComponent = config.icon;

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-start gap-4">
                        <div className={cn("p-2.5 rounded-full flex-shrink-0", config.iconBgClass)}>
                            <IconComponent className={cn("w-5 h-5", config.iconClass)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <AlertDialogTitle className="mb-2">{title}</AlertDialogTitle>
                            <AlertDialogDescription className="whitespace-pre-line">
                                {description}
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} disabled={loading}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={config.actionVariant}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            confirmText
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ============================================
// Exports
// ============================================

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
};
