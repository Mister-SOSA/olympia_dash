'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { preferencesService } from '@/lib/preferences';

/**
 * Privacy Mode Context
 * 
 * Provides a centralized way to manage privacy mode across the dashboard.
 * When enabled, sensitive data like dollar amounts, customer names, and
 * financial figures are obfuscated to protect confidential information
 * during screen sharing, presentations, or in public environments.
 */

// ============================================
// Types
// ============================================

export type ObfuscationStyle = 'blur' | 'redact' | 'asterisk' | 'placeholder';

export interface PrivacySettings {
    /** Whether privacy mode is enabled */
    enabled: boolean;
    /** Style of obfuscation to use */
    style: ObfuscationStyle;
    /** Obfuscate currency/dollar amounts */
    obfuscateCurrency: boolean;
    /** Obfuscate general numbers (quantities, etc.) */
    obfuscateNumbers: boolean;
    /** Obfuscate customer/vendor names */
    obfuscateNames: boolean;
    /** Obfuscate percentages */
    obfuscatePercentages: boolean;
    /** Show visual indicator when privacy mode is active */
    showIndicator: boolean;
}

export interface PrivacyContextValue {
    /** Current privacy settings */
    settings: PrivacySettings;
    /** Quick check if privacy mode is enabled */
    isPrivate: boolean;
    /** Toggle privacy mode on/off */
    toggle: () => void;
    /** Enable privacy mode */
    enable: () => void;
    /** Disable privacy mode */
    disable: () => void;
    /** Update a specific privacy setting */
    updateSetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => void;
    /** Check if a specific data type should be obfuscated */
    shouldObfuscate: (type: 'currency' | 'number' | 'name' | 'percentage') => boolean;
}

// ============================================
// Default Settings
// ============================================

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    enabled: false,
    style: 'blur',
    obfuscateCurrency: true,
    obfuscateNumbers: false,
    obfuscateNames: true,
    obfuscatePercentages: false,
    showIndicator: true,
};

const PREFERENCE_KEY = 'privacy';

// ============================================
// Context
// ============================================

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

// ============================================
// Provider
// ============================================

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
    const [isInitialized, setIsInitialized] = useState(false);

    // Track if we're currently saving to prevent loops
    const isSavingRef = React.useRef(false);

    // Load settings from preferences on mount
    useEffect(() => {
        const loadSettings = () => {
            // Don't reload if we triggered the save ourselves
            if (isSavingRef.current) {
                return;
            }

            const saved = preferencesService.get<PrivacySettings>(PREFERENCE_KEY);
            if (saved) {
                setSettings(prev => {
                    // Only update if actually different to prevent unnecessary renders
                    const merged = { ...DEFAULT_PRIVACY_SETTINGS, ...saved };
                    if (JSON.stringify(prev) === JSON.stringify(merged)) {
                        return prev;
                    }
                    return merged;
                });
            }
            setIsInitialized(true);
        };

        loadSettings();

        // Subscribe to preference changes (for cross-session sync)
        const unsubscribe = preferencesService.subscribe(loadSettings);
        return unsubscribe;
    }, []);

    // Save settings to preferences when they change
    useEffect(() => {
        if (!isInitialized) return;

        // Set flag to prevent subscription from reloading
        isSavingRef.current = true;
        preferencesService.set(PREFERENCE_KEY, settings);

        // Reset flag after a short delay to allow the save to complete
        const timeout = setTimeout(() => {
            isSavingRef.current = false;
        }, 100);

        return () => clearTimeout(timeout);
    }, [settings, isInitialized]);

    // Apply CSS class to body for global blur effect
    useEffect(() => {
        if (settings.enabled && settings.style === 'blur') {
            document.body.classList.add('privacy-mode-active');
        } else {
            document.body.classList.remove('privacy-mode-active');
        }

        return () => {
            document.body.classList.remove('privacy-mode-active');
        };
    }, [settings.enabled, settings.style]);

    const toggle = useCallback(() => {
        setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []);

    const enable = useCallback(() => {
        setSettings(prev => ({ ...prev, enabled: true }));
    }, []);

    const disable = useCallback(() => {
        setSettings(prev => ({ ...prev, enabled: false }));
    }, []);

    const updateSetting = useCallback(<K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const shouldObfuscate = useCallback((type: 'currency' | 'number' | 'name' | 'percentage'): boolean => {
        if (!settings.enabled) return false;

        switch (type) {
            case 'currency':
                return settings.obfuscateCurrency;
            case 'number':
                return settings.obfuscateNumbers;
            case 'name':
                return settings.obfuscateNames;
            case 'percentage':
                return settings.obfuscatePercentages;
            default:
                return false;
        }
    }, [settings.enabled, settings.obfuscateCurrency, settings.obfuscateNumbers, settings.obfuscateNames, settings.obfuscatePercentages]);

    const value = useMemo<PrivacyContextValue>(() => ({
        settings,
        isPrivate: settings.enabled,
        toggle,
        enable,
        disable,
        updateSetting,
        shouldObfuscate,
    }), [settings, toggle, enable, disable, updateSetting, shouldObfuscate]);

    return (
        <PrivacyContext.Provider value={value}>
            {children}
        </PrivacyContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

/**
 * Default context value for when used outside provider
 * This prevents crashes during SSR or when components render before provider mounts
 */
const DEFAULT_CONTEXT_VALUE: PrivacyContextValue = {
    settings: DEFAULT_PRIVACY_SETTINGS,
    isPrivate: false,
    toggle: () => { },
    enable: () => { },
    disable: () => { },
    updateSetting: () => { },
    shouldObfuscate: () => false,
};

export function usePrivacy(): PrivacyContextValue {
    const context = useContext(PrivacyContext);

    // Return safe default if used outside provider (e.g., during SSR)
    if (context === undefined) {
        return DEFAULT_CONTEXT_VALUE;
    }

    return context;
}

// ============================================
// Utilities for use outside React components
// ============================================

/**
 * Check if privacy mode is currently enabled
 * For use in utility functions outside React components
 */
export function isPrivacyModeEnabled(): boolean {
    const settings = preferencesService.get<PrivacySettings>(PREFERENCE_KEY);
    return settings?.enabled ?? false;
}

/**
 * Get current privacy settings
 * For use in utility functions outside React components
 */
export function getPrivacySettings(): PrivacySettings {
    const settings = preferencesService.get<PrivacySettings>(PREFERENCE_KEY);
    return { ...DEFAULT_PRIVACY_SETTINGS, ...settings };
}
