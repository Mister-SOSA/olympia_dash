"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Sheet Root Components
// ============================================

const Sheet = DialogPrimitive.Root;

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetPortal = DialogPrimitive.Portal;

// ============================================
// Sheet Overlay
// ============================================

const SheetOverlay = React.forwardRef<
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
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ============================================
// Sheet Content Variants
// ============================================

const sheetVariants = cva(
    cn(
        "fixed z-50 gap-4 bg-ui-bg-primary shadow-2xl transition ease-in-out",
        "border-ui-border-primary",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:duration-200 data-[state=open]:duration-300",
        "focus:outline-none"
    ),
    {
        variants: {
            side: {
                top: cn(
                    "inset-x-0 top-0 border-b",
                    "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top"
                ),
                bottom: cn(
                    "inset-x-0 bottom-0 border-t rounded-t-xl",
                    "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
                ),
                left: cn(
                    "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                    "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
                ),
                right: cn(
                    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-md",
                    "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
                ),
            },
        },
        defaultVariants: {
            side: "right",
        },
    }
);

// ============================================
// Sheet Content
// ============================================

interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
    /** Whether to show the close button */
    showClose?: boolean;
    /** Whether clicking outside closes the sheet */
    closeOnOutsideClick?: boolean;
}

const SheetContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    SheetContentProps
>(({
    side = "right",
    className,
    children,
    showClose = true,
    closeOnOutsideClick = true,
    ...props
}, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
            ref={ref}
            onPointerDownOutside={(e) => {
                if (!closeOnOutsideClick) {
                    e.preventDefault();
                }
            }}
            className={cn(sheetVariants({ side }), className)}
            {...props}
        >
            {children}
            {showClose && (
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
            )}
        </DialogPrimitive.Content>
    </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

// ============================================
// Sheet Header
// ============================================

const SheetHeader = ({
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
SheetHeader.displayName = "SheetHeader";

// ============================================
// Sheet Footer
// ============================================

const SheetFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3",
            "px-6 py-4 border-t border-ui-border-primary bg-ui-bg-secondary/30",
            "mt-auto",
            className
        )}
        {...props}
    />
);
SheetFooter.displayName = "SheetFooter";

// ============================================
// Sheet Title
// ============================================

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold text-ui-text-primary",
            className
        )}
        {...props}
    />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

// ============================================
// Sheet Description
// ============================================

const SheetDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-ui-text-secondary", className)}
        {...props}
    />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

// ============================================
// Sheet Body (scrollable content area)
// ============================================

const SheetBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex-1 overflow-y-auto px-6 py-4",
            className
        )}
        {...props}
    />
);
SheetBody.displayName = "SheetBody";

// ============================================
// Exports
// ============================================

export {
    Sheet,
    SheetPortal,
    SheetOverlay,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
    SheetBody,
};
