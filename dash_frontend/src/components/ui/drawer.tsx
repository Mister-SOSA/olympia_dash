"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

// ============================================
// Drawer Root Components
// ============================================

const Drawer = ({
    shouldScaleBackground = true,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
    <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        {...props}
    />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

// ============================================
// Drawer Overlay
// ============================================

const DrawerOverlay = React.forwardRef<
    React.ElementRef<typeof DrawerPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DrawerPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            className
        )}
        {...props}
    />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

// ============================================
// Drawer Content
// ============================================

interface DrawerContentProps
    extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
    /** Show the drag handle indicator */
    showHandle?: boolean;
    /** Direction of the drawer */
    direction?: "top" | "bottom" | "left" | "right";
    /** Additional classes for the overlay */
    overlayClassName?: string;
}

const DrawerContent = React.forwardRef<
    React.ElementRef<typeof DrawerPrimitive.Content>,
    DrawerContentProps
>(({ className, children, showHandle = true, direction = "bottom", overlayClassName, ...props }, ref) => {
    const directionClasses = {
        top: "inset-x-0 top-0 rounded-b-xl border-b",
        bottom: "inset-x-0 bottom-0 rounded-t-xl border-t",
        left: "inset-y-0 left-0 w-[85%] max-w-md rounded-r-xl border-r",
        right: "inset-y-0 right-0 w-[85%] max-w-md rounded-l-xl border-l",
    };

    // Extract z-index from className if present to match overlay
    const zIndexMatch = className?.match(/z-\[?(\d+)\]?/);
    const customZIndex = zIndexMatch ? zIndexMatch[0] : null;

    return (
        <DrawerPortal>
            <DrawerOverlay className={cn(customZIndex, overlayClassName)} />
            <DrawerPrimitive.Content
                ref={ref}
                className={cn(
                    "fixed z-50 flex flex-col",
                    "bg-ui-bg-primary border-ui-border-primary",
                    "shadow-2xl",
                    "focus:outline-none",
                    directionClasses[direction],
                    direction === "bottom" && "max-h-[96vh]",
                    direction === "top" && "max-h-[96vh]",
                    className
                )}
                {...props}
            >
                {showHandle && (direction === "bottom" || direction === "top") && (
                    <div className={cn(
                        "flex justify-center py-3",
                        direction === "bottom" ? "pt-3 pb-2" : "pt-2 pb-3"
                    )}>
                        <DrawerPrimitive.Handle
                            className="w-10 h-1 rounded-full bg-ui-border-secondary"
                        />
                    </div>
                )}
                {children}
            </DrawerPrimitive.Content>
        </DrawerPortal>
    );
});
DrawerContent.displayName = "DrawerContent";

// ============================================
// Drawer Header
// ============================================

const DrawerHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col gap-1.5 px-5 py-4",
            "border-b border-ui-border-primary",
            className
        )}
        {...props}
    />
);
DrawerHeader.displayName = "DrawerHeader";

// ============================================
// Drawer Footer
// ============================================

const DrawerFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col gap-3 px-5 py-4",
            "border-t border-ui-border-primary bg-ui-bg-secondary/30",
            "mt-auto",
            className
        )}
        {...props}
    />
);
DrawerFooter.displayName = "DrawerFooter";

// ============================================
// Drawer Title
// ============================================

const DrawerTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-ui-text-primary",
            className
        )}
        {...props}
    />
));
DrawerTitle.displayName = "DrawerTitle";

// ============================================
// Drawer Description
// ============================================

const DrawerDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-ui-text-secondary", className)}
        {...props}
    />
));
DrawerDescription.displayName = "DrawerDescription";

// ============================================
// Drawer Body (scrollable content area)
// ============================================

const DrawerBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex-1 overflow-y-auto px-5 py-4",
            className
        )}
        {...props}
    />
);
DrawerBody.displayName = "DrawerBody";

// ============================================
// Exports
// ============================================

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
    DrawerBody,
};
