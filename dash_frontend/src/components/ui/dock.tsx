"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockProps {
    className?: string;
    children: React.ReactNode;
}

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
    ({ className, children }, ref) => {
        const mouseX = useMotionValue(Infinity);

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex h-16 gap-2 items-end rounded-2xl bg-gray-950/95 backdrop-blur-md border-2 border-gray-600 px-3 pb-2 shadow-2xl",
                    className
                )}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            mouseX,
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
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    title?: string;
}

export const DockIcon = React.forwardRef<HTMLButtonElement, DockIconProps>(
    ({ className, children, mouseX, onClick, onContextMenu, title }, ref) => {
        const iconRef = useRef<HTMLButtonElement>(null);

        const distance = useTransform(mouseX, (val: number) => {
            const bounds = iconRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
            return val - bounds.x - bounds.width / 2;
        });

        const widthSync = useTransform(distance, [-150, 0, 150], [48, 64, 48]);
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
                    "bg-gray-800/80 hover:bg-gray-700 transition-colors border border-gray-700",
                    "text-gray-200 hover:text-white",
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
    return <div className="w-[1px] h-full bg-gray-700 mx-1" />;
};

