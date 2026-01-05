"use client";

import React from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-primary)] p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div
                        className="p-6 rounded-full"
                        style={{ backgroundColor: "var(--ui-bg-secondary)" }}
                    >
                        <WifiOff
                            className="w-16 h-16"
                            style={{ color: "var(--ui-text-muted)" }}
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1
                        className="text-3xl font-bold"
                        style={{ color: "var(--ui-text-primary)" }}
                    >
                        You&apos;re Offline
                    </h1>
                    <p
                        className="text-lg"
                        style={{ color: "var(--ui-text-secondary)" }}
                    >
                        It looks like you&apos;ve lost your internet connection.
                    </p>
                </div>

                {/* Description */}
                <div
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: "var(--ui-bg-secondary)" }}
                >
                    <p style={{ color: "var(--ui-text-secondary)" }}>
                        Don&apos;t worry! Your dashboard will automatically reconnect when
                        you&apos;re back online. Some cached data may still be available.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={handleRetry}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
                        style={{
                            backgroundColor: "var(--ui-accent-primary)",
                            color: "white"
                        }}
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>

                    <button
                        onClick={handleGoHome}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
                        style={{
                            backgroundColor: "var(--ui-bg-secondary)",
                            color: "var(--ui-text-primary)"
                        }}
                    >
                        <Home className="w-5 h-5" />
                        Go Home
                    </button>
                </div>

                {/* Tips */}
                <div className="pt-4 border-t" style={{ borderColor: "var(--ui-border)" }}>
                    <p
                        className="text-sm mb-3"
                        style={{ color: "var(--ui-text-muted)" }}
                    >
                        Things to try:
                    </p>
                    <ul
                        className="text-sm space-y-1 text-left inline-block"
                        style={{ color: "var(--ui-text-secondary)" }}
                    >
                        <li>• Check your Wi-Fi or mobile data</li>
                        <li>• Move closer to your router</li>
                        <li>• Restart your device&apos;s network</li>
                        <li>• Wait a moment and try again</li>
                    </ul>
                </div>

                {/* Branding */}
                <div className="pt-6">
                    <p
                        className="text-sm font-medium"
                        style={{ color: "var(--ui-text-muted)" }}
                    >
                        OlyDash • Works offline when possible
                    </p>
                </div>
            </div>
        </div>
    );
}
