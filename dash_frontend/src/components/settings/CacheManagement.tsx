'use client';

import { useState } from "react";
import { toast } from "sonner";
import { MdCloudOff, MdDownload } from "react-icons/md";
import { useServiceWorker, useInstallPrompt } from "@/hooks/useServiceWorker";

// =============================================================================
// Cache Management and PWA Install Buttons
// =============================================================================

export function CacheManagementButtons() {
    const { clearCache, isSupported, isOnline } = useServiceWorker();
    const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
    const [isClearing, setIsClearing] = useState(false);

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            const success = await clearCache();
            if (success) {
                toast.success("Cache cleared", {
                    description: "All cached data has been cleared successfully.",
                });
            } else {
                toast.error("Failed to clear cache", {
                    description: "Could not clear the cache. Try again later.",
                });
            }
        } catch {
            toast.error("Error clearing cache");
        } finally {
            setIsClearing(false);
        }
    };

    const handleInstall = async () => {
        const success = await promptInstall();
        if (success) {
            toast.success("App installed!", {
                description: "OlyDash has been added to your device.",
            });
        }
    };

    return (
        <>
            {/* Install App button - only show if not installed and can install */}
            {!isInstalled && canInstall && (
                <button
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-all"
                >
                    <MdDownload className="w-4 h-4" />
                    Install App
                </button>
            )}
            {/* Clear Cache button */}
            {isSupported && (
                <button
                    onClick={handleClearCache}
                    disabled={isClearing || !isOnline}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary border border-ui-border-primary text-ui-text-primary rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MdCloudOff className="w-4 h-4" />
                    {isClearing ? "Clearing..." : "Clear Cache"}
                </button>
            )}
        </>
    );
}
