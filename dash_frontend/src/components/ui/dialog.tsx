"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Dialog Root Components
// ============================================

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

// ============================================
// Dialog Overlay
// ============================================

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
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
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ============================================
// Dialog Content
// ============================================

interface DialogContentProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    /** Size variant for the dialog */
    size?: "sm" | "md" | "lg" | "xl" | "full";
    /** Whether to show the close button */
    showClose?: boolean;
    /** Custom close button render function */
    closeButton?: React.ReactNode;
    /** Whether clicking outside closes the dialog */
    closeOnOutsideClick?: boolean;
    /** Whether pressing escape closes the dialog */
    closeOnEscape?: boolean;
}

const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-[95vw] h-[90vh]",
};

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    DialogContentProps
>(({
    className,
    children,
    size = "md",
    showClose = true,
    closeButton,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    ...props
}, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            onPointerDownOutside={(e) => {
                if (!closeOnOutsideClick) {
                    e.preventDefault();
                }
            }}
            onEscapeKeyDown={(e) => {
                if (!closeOnEscape) {
                    e.preventDefault();
                }
            }}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]",
                "bg-ui-bg-primary border border-ui-border-primary rounded-xl shadow-2xl",
                "duration-200",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                "focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/20",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {children}
            {showClose && (
                closeButton || (
                    <DialogPrimitive.Close
                        className={cn(
                            "absolute right-4 top-4 rounded-md p-1.5",
                            "text-ui-text-muted hover:text-ui-text-primary",
                            "hover:bg-ui-bg-tertiary transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/20",
                            "disabled:pointer-events-none"
                        )}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )
            )}
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// ============================================
// Dialog Header
// ============================================

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col gap-1.5 px-6 pt-6 pb-4",
            "border-b border-ui-border-primary",
            className
        )}
        {...props}
    />
);
DialogHeader.displayName = "DialogHeader";

// ============================================
// Dialog Footer
// ============================================

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3",
            "px-6 py-4 border-t border-ui-border-primary bg-ui-bg-secondary/30",
            className
        )}
        {...props}
    />
);
DialogFooter.displayName = "DialogFooter";

// ============================================
// Dialog Title
// ============================================

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-ui-text-primary",
            className
        )}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ============================================
// Dialog Description
// ============================================

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-ui-text-secondary", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ============================================
// Dialog Body (scrollable content area)
// ============================================

const DialogBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "px-6 py-4 overflow-y-auto",
            "max-h-[60vh]",
            className
        )}
        {...props}
    />
);
DialogBody.displayName = "DialogBody";

// ============================================
// Exports
// ============================================

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogBody,
};
