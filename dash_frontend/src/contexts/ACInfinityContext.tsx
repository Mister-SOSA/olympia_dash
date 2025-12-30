/**
 * AC Infinity Data Context
 * 
 * Provides shared data fetching for all FanController widgets.
 * Instead of each widget making its own API calls, this context
 * fetches data once and shares it with all instances.
 * 
 * Also manages global settings that apply to ALL widget instances.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/lib/auth';

const AC_INFINITY_API = '/api/ac-infinity/controllers';
const GLOBAL_SETTINGS_KEY = 'ac-infinity-global-settings';

// =============================================================================
// TYPES
// =============================================================================

export type TempUnit = 'C' | 'F';

export interface ACInfinityGlobalSettings {
    refreshInterval: number;      // seconds
    temperatureUnit: TempUnit;
    enableAnimations: boolean;
    showVPD: boolean;
    showHumidity: boolean;
    showTemperature: boolean;
}

const DEFAULT_GLOBAL_SETTINGS: ACInfinityGlobalSettings = {
    refreshInterval: 30,
    temperatureUnit: 'F',
    enableAnimations: true,
    showVPD: true,
    showHumidity: true,
    showTemperature: true,
};

export interface ACInfinityPort {
    portIndex: number;
    portName: string;
    deviceType: number;
    isOnline: boolean;
    currentPower: number;
    currentMode: number;
    currentModeName: string;
}

export interface ACInfinityController {
    deviceId: string;
    deviceName: string;
    isOnline: boolean;
    temperature: number;
    temperatureF: number;
    humidity: number;
    vpd: number;
    ports: ACInfinityPort[];
}

export interface PortSettings {
    mode: number;
    modeName: string;
    onSpeed: number;
    offSpeed: number;
    tempHigh: number;
    tempLow: number;
    tempHighF: number;
    tempLowF: number;
    tempHighEnabled: boolean;
    tempLowEnabled: boolean;
    humidityHigh: number;
    humidityLow: number;
    humidityHighEnabled: boolean;
    humidityLowEnabled: boolean;
    targetVpd: number;
    vpdHigh: number;
    vpdLow: number;
}

interface ACInfinityContextValue {
    // Global settings (shared across all widgets)
    globalSettings: ACInfinityGlobalSettings;
    updateGlobalSettings: (settings: Partial<ACInfinityGlobalSettings>) => void;

    // Data
    controllers: ACInfinityController[];
    portSettings: Record<string, Record<number, PortSettings>>; // deviceId -> portIndex -> settings
    loading: boolean;
    error: string | null;

    // Actions
    refresh: () => Promise<void>;
    updatePortMode: (deviceId: string, portIndex: number, mode: number) => Promise<boolean>;
    updatePortSpeed: (deviceId: string, portIndex: number, speed: number) => Promise<boolean>;
    updatePortSettings: (deviceId: string, portIndex: number, settings: Partial<PortSettings>) => Promise<boolean>;

    // Local optimistic state management
    applyLocalOverride: (deviceId: string, portIndex: number, changes: Partial<PortSettings>) => void;
    getEffectiveSettings: (deviceId: string, portIndex: number) => PortSettings | undefined;
}

const ACInfinityContext = createContext<ACInfinityContextValue | null>(null);

// =============================================================================
// HELPER: Load/Save Global Settings from localStorage
// =============================================================================

function loadGlobalSettings(): ACInfinityGlobalSettings {
    if (typeof window === 'undefined') return DEFAULT_GLOBAL_SETTINGS;
    try {
        const stored = localStorage.getItem(GLOBAL_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load AC Infinity global settings:', e);
    }
    return DEFAULT_GLOBAL_SETTINGS;
}

function saveGlobalSettings(settings: ACInfinityGlobalSettings): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save AC Infinity global settings:', e);
    }
}

// =============================================================================
// PROVIDER
// =============================================================================

interface ACInfinityProviderProps {
    children: React.ReactNode;
}

export const ACInfinityProvider: React.FC<ACInfinityProviderProps> = ({ children }) => {
    // Global settings state
    const [globalSettings, setGlobalSettings] = useState<ACInfinityGlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

    // Load global settings from localStorage on mount
    useEffect(() => {
        setGlobalSettings(loadGlobalSettings());
    }, []);

    // Update global settings
    const updateGlobalSettings = useCallback((newSettings: Partial<ACInfinityGlobalSettings>) => {
        setGlobalSettings(prev => {
            const updated = { ...prev, ...newSettings };
            saveGlobalSettings(updated);
            return updated;
        });
    }, []);

    const [controllers, setControllers] = useState<ACInfinityController[]>([]);
    const [serverSettings, setServerSettings] = useState<Record<string, Record<number, PortSettings>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Local overrides for optimistic updates
    const localOverridesRef = useRef<Record<string, Record<number, Partial<PortSettings>>>>({});
    const overrideTimestampsRef = useRef<Record<string, Record<number, number>>>({});
    const [overrideVersion, setOverrideVersion] = useState(0);

    // Debounce timers for settings updates
    const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
    const pendingSettingsRef = useRef<Record<string, Partial<PortSettings>>>({});

    // Fetch all controllers
    const fetchControllers = useCallback(async () => {
        try {
            const res = await authService.fetchWithAuth(AC_INFINITY_API);
            if (!res.ok) throw new Error("Failed to fetch controllers");
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Error fetching controllers");
            setControllers(json.data || []);
            setError(null);
            return json.data || [];
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error");
            return [];
        }
    }, []);

    // Fetch settings for all ports on a controller
    const fetchControllerSettings = useCallback(async (controller: ACInfinityController) => {
        const settings: Record<number, PortSettings> = {};
        const now = Date.now();

        for (const port of controller.ports) {
            try {
                const res = await authService.fetchWithAuth(
                    `${AC_INFINITY_API}/${controller.deviceId}/ports/${port.portIndex}/settings`
                );
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        settings[port.portIndex] = json.data;

                        // Clear local overrides if they're older than 5 seconds
                        const deviceOverrides = overrideTimestampsRef.current[controller.deviceId];
                        const overrideTime = deviceOverrides?.[port.portIndex];
                        if (overrideTime && now - overrideTime > 5000) {
                            if (localOverridesRef.current[controller.deviceId]) {
                                delete localOverridesRef.current[controller.deviceId][port.portIndex];
                            }
                            if (overrideTimestampsRef.current[controller.deviceId]) {
                                delete overrideTimestampsRef.current[controller.deviceId][port.portIndex];
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to fetch settings for ${controller.deviceId}:${port.portIndex}:`, e);
            }
        }

        return settings;
    }, []);

    // Full refresh - fetch controllers and all settings
    const refresh = useCallback(async () => {
        // Don't fetch if user is not authenticated
        if (!authService.isAuthenticated()) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const controllerList = await fetchControllers();

            // Fetch settings for all controllers in parallel
            const settingsPromises = controllerList.map(async (controller: ACInfinityController) => {
                const settings = await fetchControllerSettings(controller);
                return { deviceId: controller.deviceId, settings };
            });

            const results = await Promise.all(settingsPromises);

            const newSettings: Record<string, Record<number, PortSettings>> = {};
            for (const { deviceId, settings } of results) {
                newSettings[deviceId] = settings;
            }

            setServerSettings(newSettings);
        } catch (e) {
            console.error('Error refreshing AC Infinity data:', e);
        } finally {
            setLoading(false);
        }
    }, [fetchControllers, fetchControllerSettings]);

    // Initial fetch and polling - uses global refresh interval
    // Only poll when user is authenticated
    useEffect(() => {
        // Initial fetch
        refresh();

        // Only set up polling interval if authenticated
        if (!authService.isAuthenticated()) {
            return;
        }

        const intervalMs = globalSettings.refreshInterval * 1000;
        const id = setInterval(refresh, intervalMs);
        return () => clearInterval(id);
    }, [refresh, globalSettings.refreshInterval]);

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimerRef.current).forEach(clearTimeout);
        };
    }, []);

    // Apply local override for optimistic updates
    const applyLocalOverride = useCallback((deviceId: string, portIndex: number, changes: Partial<PortSettings>) => {
        if (!localOverridesRef.current[deviceId]) {
            localOverridesRef.current[deviceId] = {};
        }
        localOverridesRef.current[deviceId][portIndex] = {
            ...localOverridesRef.current[deviceId][portIndex],
            ...changes
        };

        if (!overrideTimestampsRef.current[deviceId]) {
            overrideTimestampsRef.current[deviceId] = {};
        }
        overrideTimestampsRef.current[deviceId][portIndex] = Date.now();

        setOverrideVersion(v => v + 1);
    }, []);

    // Get effective settings (server + local overrides)
    const getEffectiveSettings = useCallback((deviceId: string, portIndex: number): PortSettings | undefined => {
        const server = serverSettings[deviceId]?.[portIndex];
        const overrides = localOverridesRef.current[deviceId]?.[portIndex];

        if (!server) return undefined;
        if (!overrides) return server;

        return { ...server, ...overrides };
    }, [serverSettings, overrideVersion]); // overrideVersion ensures re-render on override changes

    // Update port mode
    const updatePortMode = useCallback(async (deviceId: string, portIndex: number, mode: number): Promise<boolean> => {
        // Optimistic update
        applyLocalOverride(deviceId, portIndex, { mode });

        try {
            const res = await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${deviceId}/ports/${portIndex}/mode`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                }
            );

            if (!res.ok) throw new Error('Failed to update mode');
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to update mode');

            // Refresh settings for this controller after a short delay
            setTimeout(() => refresh(), 1000);
            return true;
        } catch (e) {
            console.error('Error updating mode:', e);
            // Revert optimistic update by triggering refresh
            refresh();
            return false;
        }
    }, [applyLocalOverride, refresh]);

    // Update port speed
    const updatePortSpeed = useCallback(async (deviceId: string, portIndex: number, speed: number): Promise<boolean> => {
        // Optimistic update
        applyLocalOverride(deviceId, portIndex, { onSpeed: speed });

        try {
            const res = await authService.fetchWithAuth(
                `${AC_INFINITY_API}/${deviceId}/ports/${portIndex}/speed`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speed })
                }
            );

            if (!res.ok) throw new Error('Failed to update speed');
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to update speed');

            setTimeout(() => refresh(), 1000);
            return true;
        } catch (e) {
            console.error('Error updating speed:', e);
            refresh();
            return false;
        }
    }, [applyLocalOverride, refresh]);

    // Update port settings with debouncing
    const updatePortSettings = useCallback(async (deviceId: string, portIndex: number, settings: Partial<PortSettings>): Promise<boolean> => {
        const key = `${deviceId}:${portIndex}`;

        // Optimistic update immediately
        applyLocalOverride(deviceId, portIndex, settings);

        // Accumulate pending changes
        pendingSettingsRef.current[key] = {
            ...pendingSettingsRef.current[key],
            ...settings
        };

        // Clear existing debounce timer
        if (debounceTimerRef.current[key]) {
            clearTimeout(debounceTimerRef.current[key]);
        }

        // Return a promise that resolves after the debounced API call
        return new Promise((resolve) => {
            debounceTimerRef.current[key] = setTimeout(async () => {
                const settingsToSend = pendingSettingsRef.current[key];
                if (!settingsToSend || Object.keys(settingsToSend).length === 0) {
                    resolve(true);
                    return;
                }

                delete pendingSettingsRef.current[key];

                try {
                    const res = await authService.fetchWithAuth(
                        `${AC_INFINITY_API}/${deviceId}/ports/${portIndex}/settings`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(settingsToSend)
                        }
                    );

                    if (!res.ok) throw new Error('Failed to update settings');
                    const json = await res.json();
                    if (!json.success) throw new Error(json.error || 'Failed to update settings');

                    setTimeout(() => refresh(), 1000);
                    resolve(true);
                } catch (e) {
                    console.error('Error updating settings:', e);
                    refresh();
                    resolve(false);
                }
            }, 500);
        });
    }, [applyLocalOverride, refresh]);

    const value: ACInfinityContextValue = {
        globalSettings,
        updateGlobalSettings,
        controllers,
        portSettings: serverSettings,
        loading,
        error,
        refresh,
        updatePortMode,
        updatePortSpeed,
        updatePortSettings,
        applyLocalOverride,
        getEffectiveSettings,
    };

    return (
        <ACInfinityContext.Provider value={value}>
            {children}
        </ACInfinityContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

export const useACInfinity = () => {
    const context = useContext(ACInfinityContext);
    if (!context) {
        throw new Error('useACInfinity must be used within an ACInfinityProvider');
    }
    return context;
};

// Optional hook that returns null instead of throwing (for conditional usage)
export const useACInfinityOptional = () => {
    return useContext(ACInfinityContext);
};
