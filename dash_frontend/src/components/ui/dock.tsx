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
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    dockStyle?: 'opaque' | 'glass' | 'clear';
    gap?: number;
    padding?: number;
    iconBorderRadius?: 'square' | 'rounded' | 'circle';
}

const DOCK_BORDER_RADIUS_MAP = {
    none: 'rounded-none',
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    pill: 'rounded-full',
} as const;

const DOCK_STYLE_MAP = {
    opaque: 'bg-ui-bg-secondary',
    glass: 'bg-ui-bg-secondary/60 backdrop-blur-xl',
    clear: 'bg-transparent',
} as const;

export const Dock = React.forwardRef<HTMLDivElement, DockProps>(
    ({ className, children, magnification = true, iconSize = 48, magnificationScale = 1.4, borderRadius = 'large', dockStyle = 'glass', gap = 4, padding = 12, iconBorderRadius = 'rounded' }, ref) => {
        const mouseX = useMotionValue(Infinity);

        const baseHeight = iconSize + 16;

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className={cn(
                    "flex items-end",
                    DOCK_BORDER_RADIUS_MAP[borderRadius],
                    DOCK_STYLE_MAP[dockStyle],
                    dockStyle !== 'clear' && "border border-ui-border-primary shadow-xl",
                    className
                )}
                style={{
                    height: `${baseHeight}px`,
                    gap: `${gap}px`,
                    paddingLeft: `${padding}px`,
                    paddingRight: `${padding}px`,
                    paddingBottom: `${Math.max(padding / 2, 4)}px`,
                }}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            mouseX,
                            magnification,
                            iconSize,
                            magnificationScale,
                            iconBorderRadius,
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
    iconBorderRadius?: 'square' | 'rounded' | 'circle';
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    title?: string;
}

const ICON_BORDER_RADIUS_MAP = {
    square: 'rounded-md',
    rounded: 'rounded-xl',
    circle: 'rounded-full',
} as const;

export const DockIcon = React.forwardRef<HTMLButtonElement, DockIconProps>(
    ({
        className,
        children,
        mouseX,
        magnification = true,
        iconSize = 48,
        magnificationScale = 1.4,
        iconBorderRadius = 'rounded',
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
                    "flex aspect-square items-center justify-center",
                    ICON_BORDER_RADIUS_MAP[iconBorderRadius],
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

