"use client";

import { Toaster, ToasterProps } from "sonner";
import { useEffect, useState } from "react";
import { preferencesService } from "@/lib/preferences";
import { NOTIFICATION_SETTINGS } from "@/constants/settings";

type ToastPosition = typeof NOTIFICATION_SETTINGS.toastPosition.options[number];

/**
 * A client-side wrapper for Sonner's Toaster that respects user settings
 * for toast position and duration.
 */
export function ToasterProvider() {
    const [position, setPosition] = useState<ToasterProps['position']>(
        NOTIFICATION_SETTINGS.toastPosition.default as ToasterProps['position']
    );
    const [duration, setDuration] = useState<number>(
        NOTIFICATION_SETTINGS.toastDuration.default
    );

    useEffect(() => {
        // Load initial settings
        const loadSettings = () => {
            const savedPosition = preferencesService.get(
                NOTIFICATION_SETTINGS.toastPosition.key,
                NOTIFICATION_SETTINGS.toastPosition.default
            ) as ToastPosition;

            const savedDuration = preferencesService.get(
                NOTIFICATION_SETTINGS.toastDuration.key,
                NOTIFICATION_SETTINGS.toastDuration.default
            ) as number;

            setPosition(savedPosition as ToasterProps['position']);
            setDuration(savedDuration);
        };

        loadSettings();

        // Subscribe to preference changes
        const unsubscribe = preferencesService.subscribe((_isRemote: boolean) => {
            loadSettings();
        });

        return unsubscribe;
    }, []);

    return (
        <Toaster
            position={position}
            theme="dark"
            richColors
            className="preset-toast"
            duration={duration}
        />
    );
}
