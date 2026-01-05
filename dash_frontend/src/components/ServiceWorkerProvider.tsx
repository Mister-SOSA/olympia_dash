"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { toast } from "sonner";

interface ServiceWorkerContextType {
    isSupported: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
    update: () => Promise<void>;
    skipWaiting: () => void;
    clearCache: () => Promise<boolean>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(null);

export function useServiceWorkerContext() {
    const context = useContext(ServiceWorkerContext);
    if (!context) {
        throw new Error("useServiceWorkerContext must be used within ServiceWorkerProvider");
    }
    return context;
}

interface ServiceWorkerProviderProps {
    children: ReactNode;
}

/**
 * Service Worker Provider
 * 
 * Manages the service worker lifecycle and provides context to the app.
 * Shows toasts for important events like updates and offline status.
 */
export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
    const sw = useServiceWorker();

    // Show toast when update is available
    useEffect(() => {
        if (sw.updateAvailable) {
            toast.info("Update Available", {
                description: "A new version of OlyDash is ready.",
                duration: Infinity,
                action: {
                    label: "Update Now",
                    onClick: () => {
                        sw.skipWaiting();
                    },
                },
                id: "sw-update",
            });
        }
    }, [sw.updateAvailable, sw.skipWaiting]);

    // Show toast when going offline/online
    useEffect(() => {
        // Skip initial render
        const isInitialRender = typeof window !== "undefined" && !window.__swInitialized;
        if (isInitialRender) {
            (window as any).__swInitialized = true;
            return;
        }

        if (!sw.isOnline) {
            toast.warning("You're offline", {
                description: "Some features may be limited. Cached data will be used when available.",
                duration: 5000,
                id: "offline-status",
            });
        } else {
            // Only show "back online" if we previously showed offline
            toast.success("Back online", {
                description: "Your connection has been restored.",
                duration: 3000,
                id: "online-status",
            });
        }
    }, [sw.isOnline]);

    const contextValue: ServiceWorkerContextType = {
        isSupported: sw.isSupported,
        isInstalled: sw.isInstalled,
        isOnline: sw.isOnline,
        updateAvailable: sw.updateAvailable,
        update: sw.update,
        skipWaiting: sw.skipWaiting,
        clearCache: sw.clearCache,
    };

    return (
        <ServiceWorkerContext.Provider value={contextValue}>
            {children}
        </ServiceWorkerContext.Provider>
    );
}

// Extend Window interface for our flag
declare global {
    interface Window {
        __swInitialized?: boolean;
    }
}
