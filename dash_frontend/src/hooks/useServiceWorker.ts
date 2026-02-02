"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ServiceWorkerState {
    isSupported: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    registration: ServiceWorkerRegistration | null;
    updateAvailable: boolean;
    isUpdating: boolean;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
    update: () => Promise<void>;
    skipWaiting: () => void;
    clearCache: () => Promise<boolean>;
    getCacheSize: () => Promise<{ usage: number; quota: number; percentage: string } | null>;
}

/**
 * Hook to manage service worker registration and lifecycle
 */
export function useServiceWorker(): UseServiceWorkerReturn {
    const [state, setState] = useState<ServiceWorkerState>({
        isSupported: false,
        isInstalled: false,
        isOnline: true,
        registration: null,
        updateAvailable: false,
        isUpdating: false,
    });

    const waitingWorkerRef = useRef<ServiceWorker | null>(null);

    // Register service worker on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        const isSupported = "serviceWorker" in navigator;
        setState((prev) => ({
            ...prev,
            isSupported,
            isOnline: navigator.onLine,
        }));

        if (!isSupported) {
            console.log("[SW Hook] Service workers not supported");
            return;
        }

        // Register the service worker
        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                });

                console.log("[SW Hook] Service worker registered:", registration.scope);

                setState((prev) => ({
                    ...prev,
                    isInstalled: true,
                    registration,
                }));

                // Check for updates periodically (every 60 minutes)
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);

                // Handle updates
                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener("statechange", () => {
                        if (
                            newWorker.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            // New version available
                            waitingWorkerRef.current = newWorker;
                            setState((prev) => ({
                                ...prev,
                                updateAvailable: true,
                            }));
                            console.log("[SW Hook] Update available");
                        }
                    });
                });

                // Check if there's already a waiting worker
                if (registration.waiting) {
                    waitingWorkerRef.current = registration.waiting;
                    setState((prev) => ({
                        ...prev,
                        updateAvailable: true,
                    }));
                }
            } catch (error) {
                console.error("[SW Hook] Registration failed:", error);
            }
        };

        registerSW();

        // Handle online/offline status
        const handleOnline = () => {
            setState((prev) => ({ ...prev, isOnline: true }));
            console.log("[SW Hook] Back online");
        };

        const handleOffline = () => {
            setState((prev) => ({ ...prev, isOnline: false }));
            console.log("[SW Hook] Gone offline");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Handle controller change (new SW activated)
        const handleControllerChange = () => {
            console.log("[SW Hook] Controller changed, reloading...");
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange
        );

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange
            );
        };
    }, []);

    // Force update check
    const update = useCallback(async () => {
        if (!state.registration) return;

        setState((prev) => ({ ...prev, isUpdating: true }));

        try {
            await state.registration.update();
            console.log("[SW Hook] Update check complete");
        } catch (error) {
            console.error("[SW Hook] Update check failed:", error);
        } finally {
            setState((prev) => ({ ...prev, isUpdating: false }));
        }
    }, [state.registration]);

    // Skip waiting and activate new SW
    const skipWaiting = useCallback(() => {
        const waitingWorker = waitingWorkerRef.current;
        if (!waitingWorker) return;

        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        setState((prev) => ({ ...prev, updateAvailable: false }));
    }, []);

    // Clear all caches
    const clearCache = useCallback(async (): Promise<boolean> => {
        if (!state.registration?.active) return false;

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
                resolve(event.data?.success ?? false);
            };

            state.registration!.active!.postMessage(
                { type: "CLEAR_CACHE" },
                [messageChannel.port2]
            );

            // Timeout after 5 seconds
            setTimeout(() => resolve(false), 5000);
        });
    }, [state.registration]);

    // Get cache size
    const getCacheSize = useCallback(async () => {
        if (!("storage" in navigator && "estimate" in navigator.storage)) {
            return null;
        }

        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            percentage: (((estimate.usage || 0) / (estimate.quota || 1)) * 100).toFixed(2),
        };
    }, []);

    return {
        ...state,
        update,
        skipWaiting,
        clearCache,
        getCacheSize,
    };
}

/**
 * Hook to detect if the app can be installed (PWA)
 */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UseInstallPromptReturn {
    canInstall: boolean;
    isInstalled: boolean;
    promptInstall: () => Promise<boolean>;
}

export function useInstallPrompt(): UseInstallPromptReturn {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if already installed
        const checkInstalled = () => {
            const isStandalone =
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as any).standalone === true;
            setIsInstalled(isStandalone);
        };

        checkInstalled();

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            deferredPromptRef.current = e as BeforeInstallPromptEvent;
            setCanInstall(true);
            console.log("[PWA] Install prompt available");
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setCanInstall(false);
            deferredPromptRef.current = null;
            console.log("[PWA] App installed");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        // Check display mode changes
        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        const handleDisplayModeChange = (e: MediaQueryListEvent) => {
            setIsInstalled(e.matches);
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handleDisplayModeChange);
        }

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener("change", handleDisplayModeChange);
            }
        };
    }, []);

    const promptInstall = useCallback(async (): Promise<boolean> => {
        const deferredPrompt = deferredPromptRef.current;
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            console.log("[PWA] Install prompt outcome:", outcome);

            if (outcome === "accepted") {
                setCanInstall(false);
                deferredPromptRef.current = null;
                return true;
            }

            return false;
        } catch (error) {
            console.error("[PWA] Install prompt failed:", error);
            return false;
        }
    }, []);

    return {
        canInstall,
        isInstalled,
        promptInstall,
    };
}
