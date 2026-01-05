"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Monitor, Share2, Plus, MoreVertical } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useServiceWorker";

interface InstallPromptProps {
    /** Delay before showing the prompt (ms) */
    delay?: number;
    /** Whether to show on mobile devices */
    showOnMobile?: boolean;
    /** Whether to show on desktop */
    showOnDesktop?: boolean;
}

/**
 * PWA Install Prompt Component
 * 
 * Shows a native-feeling prompt to install the app as a PWA.
 * Handles both the standard beforeinstallprompt event and provides
 * manual instructions for iOS/Safari.
 */
export function InstallPrompt({
    delay = 30000, // 30 seconds
    showOnMobile = true,
    showOnDesktop = true,
}: InstallPromptProps) {
    const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    // Detect device type
    useEffect(() => {
        if (typeof window === "undefined") return;

        const ua = navigator.userAgent;
        const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

        setIsIOS(iOS);
        setIsMobile(mobile);

        // Check if user has dismissed before
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            // Show again after 7 days
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
                setIsDismissed(true);
            }
        }
    }, []);

    // Show prompt after delay
    useEffect(() => {
        if (isInstalled || isDismissed) return;

        // Check device preferences
        if (isMobile && !showOnMobile) return;
        if (!isMobile && !showOnDesktop) return;

        // For iOS, always show (since canInstall won't trigger)
        // For others, only show if canInstall is true
        const shouldShow = isIOS || canInstall;
        if (!shouldShow) return;

        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [canInstall, isInstalled, isDismissed, delay, isIOS, isMobile, showOnMobile, showOnDesktop]);

    const handleInstall = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        const installed = await promptInstall();
        if (installed) {
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    // Don't render if installed or not showing
    if (isInstalled || !isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={handleClose}
                    />

                    {/* Prompt */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50"
                    >
                        <div
                            className="rounded-2xl overflow-hidden shadow-2xl"
                            style={{ backgroundColor: "var(--ui-bg-primary)" }}
                        >
                            {/* Header */}
                            <div
                                className="p-4 flex items-center gap-3"
                                style={{ backgroundColor: "var(--ui-bg-secondary)" }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: "var(--ui-accent-primary)" }}
                                >
                                    <img
                                        src="/icon-192.png"
                                        alt="OlyDash"
                                        className="w-8 h-8 rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3
                                        className="font-semibold text-lg"
                                        style={{ color: "var(--ui-text-primary)" }}
                                    >
                                        Install OlyDash
                                    </h3>
                                    <p
                                        className="text-sm"
                                        style={{ color: "var(--ui-text-muted)" }}
                                    >
                                        Add to your home screen
                                    </p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-lg hover:bg-black/10 transition-colors"
                                >
                                    <X
                                        className="w-5 h-5"
                                        style={{ color: "var(--ui-text-muted)" }}
                                    />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {showIOSInstructions ? (
                                    // iOS Manual Instructions
                                    <div className="space-y-3">
                                        <p
                                            className="text-sm"
                                            style={{ color: "var(--ui-text-secondary)" }}
                                        >
                                            To install OlyDash on your iPhone or iPad:
                                        </p>
                                        <ol className="space-y-3">
                                            <li className="flex items-start gap-3">
                                                <span
                                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{
                                                        backgroundColor: "var(--ui-accent-primary)",
                                                        color: "white",
                                                    }}
                                                >
                                                    1
                                                </span>
                                                <span
                                                    className="text-sm pt-0.5 flex items-center gap-2"
                                                    style={{ color: "var(--ui-text-secondary)" }}
                                                >
                                                    Tap the Share button
                                                    <Share2 className="w-4 h-4 inline" />
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span
                                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{
                                                        backgroundColor: "var(--ui-accent-primary)",
                                                        color: "white",
                                                    }}
                                                >
                                                    2
                                                </span>
                                                <span
                                                    className="text-sm pt-0.5 flex items-center gap-2"
                                                    style={{ color: "var(--ui-text-secondary)" }}
                                                >
                                                    Scroll and tap &quot;Add to Home Screen&quot;
                                                    <Plus className="w-4 h-4 inline" />
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span
                                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{
                                                        backgroundColor: "var(--ui-accent-primary)",
                                                        color: "white",
                                                    }}
                                                >
                                                    3
                                                </span>
                                                <span
                                                    className="text-sm pt-0.5"
                                                    style={{ color: "var(--ui-text-secondary)" }}
                                                >
                                                    Tap &quot;Add&quot; to install
                                                </span>
                                            </li>
                                        </ol>
                                        <button
                                            onClick={() => setShowIOSInstructions(false)}
                                            className="w-full py-2 text-sm rounded-lg transition-colors"
                                            style={{
                                                backgroundColor: "var(--ui-bg-secondary)",
                                                color: "var(--ui-text-primary)",
                                            }}
                                        >
                                            Got it
                                        </button>
                                    </div>
                                ) : (
                                    // Standard Content
                                    <>
                                        <div className="flex items-start gap-3">
                                            {isMobile ? (
                                                <Smartphone
                                                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                                                    style={{ color: "var(--ui-accent-primary)" }}
                                                />
                                            ) : (
                                                <Monitor
                                                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                                                    style={{ color: "var(--ui-accent-primary)" }}
                                                />
                                            )}
                                            <p
                                                className="text-sm"
                                                style={{ color: "var(--ui-text-secondary)" }}
                                            >
                                                Install OlyDash for quick access, offline support, and a
                                                native app experience.
                                            </p>
                                        </div>

                                        <div
                                            className="flex flex-wrap gap-2 text-xs"
                                            style={{ color: "var(--ui-text-muted)" }}
                                        >
                                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "var(--ui-bg-secondary)" }}>
                                                ⚡ Faster loading
                                            </span>
                                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "var(--ui-bg-secondary)" }}>
                                                📴 Works offline
                                            </span>
                                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "var(--ui-bg-secondary)" }}>
                                                🔔 Notifications
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={handleDismiss}
                                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors"
                                                style={{
                                                    backgroundColor: "var(--ui-bg-secondary)",
                                                    color: "var(--ui-text-secondary)",
                                                }}
                                            >
                                                Not now
                                            </button>
                                            <button
                                                onClick={handleInstall}
                                                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-105"
                                                style={{
                                                    backgroundColor: "var(--ui-accent-primary)",
                                                    color: "white",
                                                }}
                                            >
                                                <Download className="w-4 h-4" />
                                                Install
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * Minimal install button for dock/menu integration
 */
export function InstallButton({ className }: { className?: string }) {
    const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
    const [isIOS, setIsIOS] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);
    }, []);

    // Don't show if already installed and not iOS
    if (isInstalled) return null;
    if (!canInstall && !isIOS) return null;

    const handleClick = async () => {
        if (isIOS) {
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 5000);
            return;
        }
        await promptInstall();
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${className}`}
                style={{
                    backgroundColor: "var(--ui-bg-secondary)",
                    color: "var(--ui-text-secondary)",
                }}
                title="Install App"
            >
                <Download className="w-4 h-4" />
                <span className="text-sm">Install App</span>
            </button>

            {/* iOS tooltip */}
            <AnimatePresence>
                {showTooltip && isIOS && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 right-0 p-3 rounded-lg shadow-lg text-xs whitespace-nowrap"
                        style={{
                            backgroundColor: "var(--ui-bg-primary)",
                            border: "1px solid var(--ui-border)",
                        }}
                    >
                        <p style={{ color: "var(--ui-text-secondary)" }}>
                            Tap <Share2 className="w-3 h-3 inline mx-1" /> then &quot;Add to Home Screen&quot;
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default InstallPrompt;
