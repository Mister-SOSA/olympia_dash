"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockProps {
    className?: string;
    children: React.ReactNode;
    magnification?: boolean;
    iconSize?: number;
    magnificationScale?: number;
}

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
    ({ className, children, magnification = true, iconSize = 48, magnificationScale = 1.4 }, ref) => {
        const mouseX = useMotionValue(Infinity);

        // Dock height is based on the BASE icon size only
        // Icons grow upward from the bottom when magnified (via items-end)
        // We add a small buffer for the magnification to expand into
        const baseHeight = iconSize + 16; // icon + padding

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex gap-2 items-end rounded-2xl px-3 pb-2",
                    "bg-ui-bg-primary border border-ui-border-primary",
                    "shadow-2xl",
                    className
                )}
                style={{
                    height: `${baseHeight}px`,
                }}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            mouseX,
                            magnification,
                            iconSize,
                            magnificationScale,
                        });
                    }
                    return child;
                })}
            </motion.div>
        );
    }
);

Dock.displayName = "Dock";

export interface DockIconProps {
    className?: string;
    children: React.ReactNode;
    mouseX?: any;
    magnification?: boolean;
    iconSize?: number;
    magnificationScale?: number;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    title?: string;
}

export const DockIcon = React.forwardRef<HTMLButtonElement, DockIconProps>(
    ({
        className,
        children,
        mouseX,
        magnification = true,
        iconSize = 48,
        magnificationScale = 1.4,
        onClick,
        onContextMenu,
        title
    }, ref) => {
        const iconRef = useRef<HTMLButtonElement>(null);

        // Use a fallback mouseX value if not provided
        const fallbackMouseX = useMotionValue(Infinity);
        const effectiveMouseX = mouseX || fallbackMouseX;

        const distance = useTransform(effectiveMouseX, (val: number) => {
            const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
            return val - bounds.x - bounds.width / 2;
        });

        // Calculate magnified size based on iconSize and magnificationScale
        const magnifiedSize = Math.round(iconSize * magnificationScale);

        // When magnification is enabled, scale from base size to magnified size
        const widthSync = useTransform(
            distance,
            [-150, 0, 150],
            magnification
                ? [iconSize, magnifiedSize, iconSize]
                : [iconSize, iconSize, iconSize]
        );
        const width = useSpring(widthSync, {
            mass: 0.1,
            stiffness: 150,
            damping: 12,
        });

        return (
            <motion.button
                ref={iconRef as any}
                style={{ width }}
                onClick={onClick}
                onContextMenu={onContextMenu}
                title={title}
                className={cn(
                    "flex aspect-square items-center justify-center rounded-xl relative",
                    "border transition-colors duration-200",
                    "shadow-lg hover:shadow-xl",
                    className
                )}
            >
                {children}
            </motion.button>
        );
    }
);

DockIcon.displayName = "DockIcon";

export const DockDivider = () => {
    return <div className="w-px h-6 bg-ui-border-primary mx-1" />;
};

