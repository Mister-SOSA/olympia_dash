import React from "react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "circular" | "text" | "card";
    animation?: "pulse" | "shimmer" | "none";
}

/**
 * Skeleton loading placeholder component
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
 * Full page loading overlay
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
            <Loader />
            {message && (
                <p className="mt-4 text-sm text-ui-text-secondary animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                    {message}
                </p>
            )}
        </div>
    );
}
