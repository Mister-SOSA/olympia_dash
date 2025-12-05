import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "circular" | "text" | "card";
    animation?: "pulse" | "shimmer" | "none";
}

/**
 * Skeleton loading placeholder component with smooth animations
 * Use this for initial loading states before content is ready
 */
export function Skeleton({
    className,
    variant = "default",
    animation = "shimmer",
    ...props
}: SkeletonProps) {
    const baseClasses = "bg-ui-bg-tertiary";

    const variantClasses = {
        default: "rounded-md",
        circular: "rounded-full aspect-square",
        text: "rounded h-4 w-full",
        card: "rounded-lg",
    };

    const animationClasses = {
        pulse: "animate-pulse",
        shimmer: "skeleton-shimmer",
        none: "",
    };

    return (
        <div
            className={cn(
                baseClasses,
                variantClasses[variant],
                animationClasses[animation],
                className
            )}
            {...props}
        />
    );
}

/**
 * Widget skeleton for loading state with smooth fade-in
 */
export function WidgetSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "w-full h-full flex flex-col gap-3 p-4 animate-in fade-in duration-200",
            className
        )}>
            {/* Header skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" variant="circular" />
                <Skeleton className="h-4 w-32" variant="text" />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3 w-full" variant="text" />
                <Skeleton className="h-3 w-4/5" variant="text" />
                <Skeleton className="h-3 w-3/4" variant="text" />
            </div>
        </div>
    );
}

/**
 * Table skeleton for loading state
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="w-full h-full flex flex-col gap-2 p-2 animate-in fade-in duration-200">
            {/* Header row */}
            <div className="flex gap-4 pb-2 border-b border-ui-border-primary">
                <Skeleton className="h-4 w-24" variant="text" />
                <Skeleton className="h-4 w-32" variant="text" />
                <Skeleton className="h-4 w-20" variant="text" />
                <Skeleton className="h-4 w-28 ml-auto" variant="text" />
            </div>

            {/* Data rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex gap-4 py-2"
                    style={{
                        animationDelay: `${i * 50}ms`,
                    }}
                >
                    <Skeleton className="h-4 w-24" variant="text" />
                    <Skeleton className="h-4 w-32" variant="text" />
                    <Skeleton className="h-4 w-20" variant="text" />
                    <Skeleton className="h-4 w-28 ml-auto" variant="text" />
                </div>
            ))}
        </div>
    );
}

/**
 * Chart skeleton for loading state
 */
export function ChartSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "w-full h-full flex flex-col gap-3 p-4 animate-in fade-in duration-200",
            className
        )}>
            {/* Y-axis labels */}
            <div className="flex gap-2 h-full">
                <div className="flex flex-col justify-between py-4 w-8">
                    <Skeleton className="h-3 w-full" variant="text" />
                    <Skeleton className="h-3 w-full" variant="text" />
                    <Skeleton className="h-3 w-full" variant="text" />
                    <Skeleton className="h-3 w-full" variant="text" />
                </div>

                {/* Chart area */}
                <div className="flex-1 flex items-end gap-2 pb-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="flex-1 rounded-t-md"
                            style={{
                                height: `${30 + Math.random() * 60}%`,
                                animationDelay: `${i * 75}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* X-axis labels */}
            <div className="flex gap-2 ml-10">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1" variant="text" />
                ))}
            </div>
        </div>
    );
}

/**
 * Metric card skeleton
 */
export function MetricSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "flex flex-col gap-2 p-4 animate-in fade-in duration-200",
            className
        )}>
            <Skeleton className="h-4 w-20" variant="text" />
            <Skeleton className="h-8 w-32" variant="text" />
            <Skeleton className="h-3 w-16" variant="text" />
        </div>
    );
}

/**
 * Full page loading overlay with smooth transitions
 */
export function LoadingOverlay({
    message = "Loading...",
    className,
}: {
    message?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex flex-col items-center justify-center",
                "bg-ui-bg-primary/95 backdrop-blur-sm",
                "animate-in fade-in duration-300",
                className
            )}
        >
            <div className="relative">
                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-ui-accent-primary/20 animate-ping" />
                </div>
                <div className="relative w-12 h-12 rounded-full border-2 border-ui-accent-primary border-t-transparent animate-spin" />
            </div>
            {message && (
                <p className="mt-4 text-sm text-ui-text-secondary animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                    {message}
                </p>
            )}
        </div>
    );
}
