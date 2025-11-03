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
                    "flex h-16 gap-2 items-end rounded-2xl backdrop-blur-xl px-3 pb-2",
                    "bg-[#08121a]/95 border-2 border-[#2c3e50]/80",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
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
                    "bg-[#161e28]/90 hover:bg-[#23303d]",
                    "border-2 border-[#202D3C] hover:border-[#2c3e50]",
                    "text-gray-300 hover:text-white",
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
    return <div className="w-[2px] h-full bg-[#2c3e50] rounded-full mx-1 shadow-sm" />;
};

