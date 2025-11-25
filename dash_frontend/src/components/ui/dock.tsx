"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockProps {
    className?: string;
    children: React.ReactNode;
    magnification?: boolean;
}

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
    ({ className, children, magnification = true }, ref) => {
        const mouseX = useMotionValue(Infinity);

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex h-16 gap-2 items-end rounded-2xl px-3 pb-2",
                    "bg-ui-bg-primary border-2 border-ui-border-primary/80",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
                    className
                )}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            mouseX,
                            magnification,
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
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    title?: string;
}

export const DockIcon = React.forwardRef<HTMLButtonElement, DockIconProps>(
    ({ className, children, mouseX, magnification = true, onClick, onContextMenu, title }, ref) => {
        const iconRef = useRef<HTMLButtonElement>(null);

        const distance = useTransform(mouseX, (val: number) => {
            const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
            return val - bounds.x - bounds.width / 2;
        });

        // When magnification is enabled, scale from 48 to 64; otherwise, stay at 48
        const widthSync = useTransform(
            distance, 
            [-150, 0, 150], 
            magnification ? [48, 64, 48] : [48, 48, 48]
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
                    "bg-ui-bg-secondary/90 hover:bg-ui-bg-tertiary",
                    "border-2 border-ui-border-primary hover:border-ui-border-secondary",
                    "text-ui-text-secondary hover:text-ui-text-primary",
                    "shadow-lg hover:shadow-xl",
                    "transition-[background-color,border-color,color,box-shadow] duration-200",
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
    return <div className="w-[2px] h-full bg-ui-border-primary rounded-full mx-1 shadow-sm" />;
};

