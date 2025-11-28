"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { preferencesService } from "@/lib/preferences";
import {
    APPEARANCE_SETTINGS,
    KEYBOARD_SETTINGS
} from "@/constants/settings";
import { MotionConfig } from "framer-motion";

interface SettingsContextType {
    animations: boolean;
    compactMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    enableHotkeys: boolean;
    snowEffect: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
    animations: APPEARANCE_SETTINGS.animations.default,
    compactMode: APPEARANCE_SETTINGS.compactMode.default,
    fontSize: APPEARANCE_SETTINGS.fontSize.default,
    enableHotkeys: KEYBOARD_SETTINGS.enableHotkeys.default,
    snowEffect: APPEARANCE_SETTINGS.snowEffect.default,
});

export function useAppSettings() {
    return useContext(SettingsContext);
}

const FONT_SIZE_MAP = {
    small: '14px',
    medium: '16px',
    large: '18px',
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SettingsContextType>({
        animations: APPEARANCE_SETTINGS.animations.default,
        compactMode: APPEARANCE_SETTINGS.compactMode.default,
        fontSize: APPEARANCE_SETTINGS.fontSize.default,
        enableHotkeys: KEYBOARD_SETTINGS.enableHotkeys.default,
        snowEffect: APPEARANCE_SETTINGS.snowEffect.default,
    });
    
    const settingsJsonRef = useRef<string>(JSON.stringify(settings));

    const loadSettings = useCallback(() => {
        const animations = preferencesService.get(
            APPEARANCE_SETTINGS.animations.key,
            APPEARANCE_SETTINGS.animations.default
        ) as boolean;

        const compactMode = preferencesService.get(
            APPEARANCE_SETTINGS.compactMode.key,
            APPEARANCE_SETTINGS.compactMode.default
        ) as boolean;

        const fontSize = preferencesService.get(
            APPEARANCE_SETTINGS.fontSize.key,
            APPEARANCE_SETTINGS.fontSize.default
        ) as 'small' | 'medium' | 'large';

        const enableHotkeys = preferencesService.get(
            KEYBOARD_SETTINGS.enableHotkeys.key,
            KEYBOARD_SETTINGS.enableHotkeys.default
        ) as boolean;

        const snowEffect = preferencesService.get(
            APPEARANCE_SETTINGS.snowEffect.key,
            APPEARANCE_SETTINGS.snowEffect.default
        ) as boolean;

        const newSettings = { animations, compactMode, fontSize, enableHotkeys, snowEffect };
        const newJson = JSON.stringify(newSettings);
        
        // Only update if settings actually changed
        if (newJson !== settingsJsonRef.current) {
            settingsJsonRef.current = newJson;
            setSettings(newSettings);
        }
    }, []);

    // Load settings on mount and subscribe to changes
    useEffect(() => {
        loadSettings();

        const unsubscribe = preferencesService.subscribe((isRemote: boolean, changedKeys?: string[]) => {
            // Only reload for remote changes or appearance/keyboard changes
            if (isRemote) {
                loadSettings();
            } else if (changedKeys) {
                const hasRelevantChanges = changedKeys.some(key => 
                    key.startsWith('appearance') || key.startsWith('keyboard')
                );
                if (hasRelevantChanges) {
                    loadSettings();
                }
            }
        });

        return unsubscribe;
    }, [loadSettings]);

    // Apply settings to document
    useEffect(() => {
        const root = document.documentElement;

        // Apply font size
        root.style.setProperty('--base-font-size', FONT_SIZE_MAP[settings.fontSize]);
        root.classList.toggle('font-size-small', settings.fontSize === 'small');
        root.classList.toggle('font-size-medium', settings.fontSize === 'medium');
        root.classList.toggle('font-size-large', settings.fontSize === 'large');

        // Apply compact mode
        root.classList.toggle('compact-mode', settings.compactMode);

        // Apply animations setting
        root.classList.toggle('reduce-motion', !settings.animations);

        // Set CSS variable for animation duration
        if (!settings.animations) {
            root.style.setProperty('--animation-duration', '0s');
            root.style.setProperty('--transition-duration', '0s');
        } else {
            root.style.removeProperty('--animation-duration');
            root.style.removeProperty('--transition-duration');
        }
    }, [settings]);

    return (
        <SettingsContext.Provider value={settings}>
            <MotionConfig reducedMotion={settings.animations ? "never" : "always"}>
                {children}
            </MotionConfig>
        </SettingsContext.Provider>
    );
}
