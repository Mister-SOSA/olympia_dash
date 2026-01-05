"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useServiceWorkerContext } from "./ServiceWorkerProvider";

interface NetworkStatusIndicatorProps {
    /** Show as a floating indicator */
    floating?: boolean;
    /** Position for floating indicator */
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    /** Only show when offline */
    offlineOnly?: boolean;
}

/**
 * Network Status Indicator
 * 
 * Shows the current online/offline status. Can be used as:
 * - A floating indicator that appears when offline
 * - An inline indicator for status bars/menus
 */
export function NetworkStatusIndicator({
    floating = true,
    position = "bottom-left",
    offlineOnly = true,
}: NetworkStatusIndicatorProps) {
    const { isOnline } = useServiceWorkerContext();

    // Don't show if online and offlineOnly is true
    if (isOnline && offlineOnly) return null;

    const positionClasses = {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-right": "bottom-4 right-4",
    };

    if (floating) {
        return (
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed ${positionClasses[position]} z-50`}
                    >
                        <div
                            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
                            style={{
                                backgroundColor: "var(--ui-warning)",
                                color: "white",
                            }}
                        >
                            <WifiOff className="w-4 h-4" />
                            <span className="text-sm font-medium">Offline</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Inline variant
    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{
                backgroundColor: isOnline
                    ? "var(--ui-success-bg)"
                    : "var(--ui-warning-bg)",
                color: isOnline ? "var(--ui-success)" : "var(--ui-warning)",
            }}
        >
            {isOnline ? (
                <>
                    <Wifi className="w-3 h-3" />
                    <span>Online</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                </>
            )}
        </div>
    );
}

export default NetworkStatusIndicator;
