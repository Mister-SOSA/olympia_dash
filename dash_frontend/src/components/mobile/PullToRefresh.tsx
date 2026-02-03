"use client";

import React, { memo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { MdRefresh } from "react-icons/md";
import { toast } from "sonner";
import { vibrate } from "./utils";

// ============================================
// Pull to Refresh - Memoized
// ============================================

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh = memo(function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const THRESHOLD = 80;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (isRefreshing || containerRef.current?.scrollTop !== 0) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
            }
        },
        [isRefreshing]
    );

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD);
            vibrate(20);

            try {
                await onRefresh();
                toast.success("Refreshed!");
            } catch {
                toast.error("Failed to refresh");
            }

            setIsRefreshing(false);
        }
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            style={{ WebkitOverflowScrolling: "touch" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center"
                style={{
                    height: pullDistance,
                    opacity: pullDistance / THRESHOLD,
                    transition: pullDistance === 0 ? "height 0.2s ease" : "none",
                }}
            >
                <motion.div
                    animate={{
                        rotate: isRefreshing ? 360 : (pullDistance / THRESHOLD) * 180,
                    }}
                    transition={{
                        duration: isRefreshing ? 1 : 0,
                        repeat: isRefreshing ? Infinity : 0,
                        ease: "linear",
                    }}
                >
                    <MdRefresh
                        className={`w-6 h-6 ${pullDistance >= THRESHOLD ? "text-ui-accent-primary" : "text-ui-text-muted"
                            }`}
                    />
                </motion.div>
            </div>
            {children}
        </div>
    );
});
