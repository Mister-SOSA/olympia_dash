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

        const baseHeight = iconSize + 16;

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex gap-1 items-end rounded-2xl px-3 pb-2",
                    "bg-ui-bg-secondary/95 backdrop-blur-xl",
                    "border border-ui-border-primary",
                    "shadow-xl",
                    className
                )}
                style={{ height: `${baseHeight}px` }}
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

        const fallbackMouseX = useMotionValue(Infinity);
        const effectiveMouseX = mouseX || fallbackMouseX;

        const distance = useTransform(effectiveMouseX, (val: number) => {
            const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
            return val - bounds.x - bounds.width / 2;
        });

        const magnifiedSize = Math.round(iconSize * magnificationScale);

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
                    "flex aspect-square items-center justify-center rounded-xl",
                    "transition-colors duration-200",
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

