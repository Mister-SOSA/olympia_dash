/**
 * useSettings Hook
 * 
 * A type-safe React hook for accessing and updating user settings.
 * Provides real-time synchronization across sessions via preferencesService.
 * 
 * OPTIMIZATIONS:
 * - Only re-renders when relevant settings actually change
 * - Batches multiple updates efficiently
 * - Uses shallow comparison to avoid unnecessary state updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesService } from '@/lib/preferences';
import {
    APPEARANCE_SETTINGS,
    DATETIME_SETTINGS,
    DASHBOARD_SETTINGS,
    GRID_SETTINGS,
    DOCK_SETTINGS,
    DRAG_HANDLE_SETTINGS,
    WIDGET_SETTINGS,
    NOTIFICATION_SETTINGS,
    DATA_SETTINGS,
    PRESET_SETTINGS,
    KEYBOARD_SETTINGS,
    type TimezoneOption,
    type DateFormatOption,
    type ClockFormat,
    type FontSize,
    type ToastPosition,
    type NumberFormat,
} from '@/constants/settings';

// Type definitions for all settings
export interface UserSettings {
    // Appearance
    theme: string;
    animations: boolean;
    compactMode: boolean;
    fontSize: FontSize;
    snowEffect: boolean;

    // Date & Time
    timezone: TimezoneOption;
    dateFormat: DateFormatOption;
    clockFormat: ClockFormat;
    showSeconds: boolean;

    // Dashboard
    autoSave: boolean;
    confirmDelete: boolean;
    autoCompact: boolean;

    // Grid
    gridColumns: number;
    gridCellHeight: number;

    // Dock
    dockAutoHide: boolean;
    dockMagnification: boolean;
    dockMagnificationScale: number;
    dockIconSize: number;
    dockShowActiveIndicator: boolean;
    dockTriggerDistance: number;
    dockHideDelay: number;
    dockOpacity: number;
    dockShowWidgetsToggle: boolean;
    dockShowPresetManager: boolean;
    dockShowPrivacyToggle: boolean;
    dockShowSettingsToggle: boolean;
    dockShowCreatePreset: boolean;
    dockShowAutoCycleToggle: boolean;
    dockShowEmptyDockHint: boolean;

    // Drag Handle
    dragHandleAlwaysShow: boolean;
    showResizeHandles: boolean;
    dragHandleOpacity: number;
    dragHandleSize: 'small' | 'medium' | 'large';
    dragHandleStyle: 'pill' | 'bar' | 'dots' | 'minimal';
    dragHandleHoverDelay: number;

    // Widgets
    defaultRefreshInterval: number;
    showRefreshIndicators: boolean;
    showWidgetTitles: boolean;
    tableRowsPerPage: number;

    // Notifications
    soundEnabled: boolean;
    volume: number;
    desktopNotifications: boolean;
    toastPosition: ToastPosition;
    toastDuration: number;

    // Data
    numberFormat: NumberFormat;
    currencySymbol: string;
    cacheEnabled: boolean;

    // Presets
    autoCycleEnabled: boolean;
    autoCycleInterval: number;
    autoCyclePresets: number[];
    autoCyclePauseOnInteraction: boolean;
    autoCycleResumeDelay: number;

    // Keyboard
    enableHotkeys: boolean;
}

// Default settings derived from constants
const DEFAULT_SETTINGS: UserSettings = {
    // Appearance
    theme: APPEARANCE_SETTINGS.theme.default,
    animations: APPEARANCE_SETTINGS.animations.default,
    compactMode: APPEARANCE_SETTINGS.compactMode.default,
    fontSize: APPEARANCE_SETTINGS.fontSize.default,
    snowEffect: APPEARANCE_SETTINGS.snowEffect.default,

    // Date & Time
    timezone: DATETIME_SETTINGS.timezone.default as TimezoneOption,
    dateFormat: DATETIME_SETTINGS.dateFormat.default,
    clockFormat: DATETIME_SETTINGS.clockFormat.default,
    showSeconds: DATETIME_SETTINGS.showSeconds.default,

    // Dashboard
    autoSave: DASHBOARD_SETTINGS.autoSave.default,
    confirmDelete: DASHBOARD_SETTINGS.confirmDelete.default,
    autoCompact: DASHBOARD_SETTINGS.autoCompact.default,

    // Grid
    gridColumns: GRID_SETTINGS.columns.default,
    gridCellHeight: GRID_SETTINGS.cellHeight.default,

    // Dock
    dockAutoHide: DOCK_SETTINGS.autoHide.default,
    dockMagnification: DOCK_SETTINGS.magnification.default,
    dockMagnificationScale: DOCK_SETTINGS.magnificationScale.default,
    dockIconSize: DOCK_SETTINGS.iconSize.default,
    dockShowActiveIndicator: DOCK_SETTINGS.showActiveIndicator.default,
    dockTriggerDistance: DOCK_SETTINGS.triggerDistance.default,
    dockHideDelay: DOCK_SETTINGS.hideDelay.default,
    dockOpacity: DOCK_SETTINGS.opacity.default,
    dockShowWidgetsToggle: DOCK_SETTINGS.showWidgetsToggle.default,
    dockShowPresetManager: DOCK_SETTINGS.showPresetManager.default,
    dockShowPrivacyToggle: DOCK_SETTINGS.showPrivacyToggle.default,
    dockShowSettingsToggle: DOCK_SETTINGS.showSettingsToggle.default,
    dockShowCreatePreset: DOCK_SETTINGS.showCreatePreset.default,
    dockShowAutoCycleToggle: DOCK_SETTINGS.showAutoCycleToggle.default,
    dockShowEmptyDockHint: DOCK_SETTINGS.showEmptyDockHint.default,

    // Drag Handle
    dragHandleAlwaysShow: DRAG_HANDLE_SETTINGS.alwaysShow.default,
    showResizeHandles: DRAG_HANDLE_SETTINGS.showResizeHandles.default,
    dragHandleOpacity: DRAG_HANDLE_SETTINGS.handleOpacity.default,
    dragHandleSize: DRAG_HANDLE_SETTINGS.handleSize.default,
    dragHandleStyle: DRAG_HANDLE_SETTINGS.handleStyle.default,
    dragHandleHoverDelay: DRAG_HANDLE_SETTINGS.hoverDelay.default,

    // Widgets
    defaultRefreshInterval: WIDGET_SETTINGS.defaultRefreshInterval.default,
    showRefreshIndicators: WIDGET_SETTINGS.showRefreshIndicators.default,
    showWidgetTitles: WIDGET_SETTINGS.showWidgetTitles.default,
    tableRowsPerPage: WIDGET_SETTINGS.tableRowsPerPage.default,

    // Notifications
    soundEnabled: NOTIFICATION_SETTINGS.sound.default,
    volume: NOTIFICATION_SETTINGS.volume.default,
    desktopNotifications: NOTIFICATION_SETTINGS.desktopNotifications.default,
    toastPosition: NOTIFICATION_SETTINGS.toastPosition.default,
    toastDuration: NOTIFICATION_SETTINGS.toastDuration.default,

    // Data
    numberFormat: DATA_SETTINGS.numberFormat.default,
    currencySymbol: DATA_SETTINGS.currencySymbol.default,
    cacheEnabled: DATA_SETTINGS.cacheEnabled.default,

    // Presets
    autoCycleEnabled: PRESET_SETTINGS.autoCycleEnabled.default,
    autoCycleInterval: PRESET_SETTINGS.autoCycleInterval.default,
    autoCyclePresets: PRESET_SETTINGS.autoCyclePresets.default,
    autoCyclePauseOnInteraction: PRESET_SETTINGS.autoCyclePauseOnInteraction.default,
    autoCycleResumeDelay: PRESET_SETTINGS.autoCycleResumeDelay.default,

    // Keyboard
    enableHotkeys: KEYBOARD_SETTINGS.enableHotkeys.default,
};

// Mapping from UserSettings keys to preference keys
const SETTINGS_KEY_MAP: Record<keyof UserSettings, string> = {
    theme: APPEARANCE_SETTINGS.theme.key,
    animations: APPEARANCE_SETTINGS.animations.key,
    compactMode: APPEARANCE_SETTINGS.compactMode.key,
    fontSize: APPEARANCE_SETTINGS.fontSize.key,
    snowEffect: APPEARANCE_SETTINGS.snowEffect.key,

    timezone: DATETIME_SETTINGS.timezone.key,
    dateFormat: DATETIME_SETTINGS.dateFormat.key,
    clockFormat: DATETIME_SETTINGS.clockFormat.key,
    showSeconds: DATETIME_SETTINGS.showSeconds.key,

    autoSave: DASHBOARD_SETTINGS.autoSave.key,
    confirmDelete: DASHBOARD_SETTINGS.confirmDelete.key,
    autoCompact: DASHBOARD_SETTINGS.autoCompact.key,

    gridColumns: GRID_SETTINGS.columns.key,
    gridCellHeight: GRID_SETTINGS.cellHeight.key,

    dockAutoHide: DOCK_SETTINGS.autoHide.key,
    dockMagnification: DOCK_SETTINGS.magnification.key,
    dockMagnificationScale: DOCK_SETTINGS.magnificationScale.key,
    dockIconSize: DOCK_SETTINGS.iconSize.key,
    dockShowActiveIndicator: DOCK_SETTINGS.showActiveIndicator.key,
    dockTriggerDistance: DOCK_SETTINGS.triggerDistance.key,
    dockHideDelay: DOCK_SETTINGS.hideDelay.key,
    dockOpacity: DOCK_SETTINGS.opacity.key,
    dockShowWidgetsToggle: DOCK_SETTINGS.showWidgetsToggle.key,
    dockShowPresetManager: DOCK_SETTINGS.showPresetManager.key,
    dockShowPrivacyToggle: DOCK_SETTINGS.showPrivacyToggle.key,
    dockShowSettingsToggle: DOCK_SETTINGS.showSettingsToggle.key,
    dockShowCreatePreset: DOCK_SETTINGS.showCreatePreset.key,
    dockShowAutoCycleToggle: DOCK_SETTINGS.showAutoCycleToggle.key,
    dockShowEmptyDockHint: DOCK_SETTINGS.showEmptyDockHint.key,

    dragHandleAlwaysShow: DRAG_HANDLE_SETTINGS.alwaysShow.key,
    showResizeHandles: DRAG_HANDLE_SETTINGS.showResizeHandles.key,
    dragHandleOpacity: DRAG_HANDLE_SETTINGS.handleOpacity.key,
    dragHandleSize: DRAG_HANDLE_SETTINGS.handleSize.key,
    dragHandleStyle: DRAG_HANDLE_SETTINGS.handleStyle.key,
    dragHandleHoverDelay: DRAG_HANDLE_SETTINGS.hoverDelay.key,

    defaultRefreshInterval: WIDGET_SETTINGS.defaultRefreshInterval.key,
    showRefreshIndicators: WIDGET_SETTINGS.showRefreshIndicators.key,
    showWidgetTitles: WIDGET_SETTINGS.showWidgetTitles.key,
    tableRowsPerPage: WIDGET_SETTINGS.tableRowsPerPage.key,

    soundEnabled: NOTIFICATION_SETTINGS.sound.key,
    volume: NOTIFICATION_SETTINGS.volume.key,
    desktopNotifications: NOTIFICATION_SETTINGS.desktopNotifications.key,
    toastPosition: NOTIFICATION_SETTINGS.toastPosition.key,
    toastDuration: NOTIFICATION_SETTINGS.toastDuration.key,

    numberFormat: DATA_SETTINGS.numberFormat.key,
    currencySymbol: DATA_SETTINGS.currencySymbol.key,
    cacheEnabled: DATA_SETTINGS.cacheEnabled.key,

    autoCycleEnabled: PRESET_SETTINGS.autoCycleEnabled.key,
    autoCycleInterval: PRESET_SETTINGS.autoCycleInterval.key,
    autoCyclePresets: PRESET_SETTINGS.autoCyclePresets.key,
    autoCyclePauseOnInteraction: PRESET_SETTINGS.autoCyclePauseOnInteraction.key,
    autoCycleResumeDelay: PRESET_SETTINGS.autoCycleResumeDelay.key,

    enableHotkeys: KEYBOARD_SETTINGS.enableHotkeys.key,
};

/**
 * Hook to access and update all user settings
 */
export function useSettings() {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Track which setting categories we care about for selective updates
    const settingsJsonRef = useRef<string>(JSON.stringify(DEFAULT_SETTINGS));

    // Track if we're the one making changes (to avoid reloading from our own updates)
    const isUpdatingRef = useRef<boolean>(false);

    // Load settings from preferences service
    const loadSettings = useCallback(() => {
        const loadedSettings: UserSettings = { ...DEFAULT_SETTINGS };

        (Object.keys(SETTINGS_KEY_MAP) as Array<keyof UserSettings>).forEach((key) => {
            const prefKey = SETTINGS_KEY_MAP[key];
            const value = preferencesService.get(prefKey, DEFAULT_SETTINGS[key]);
            if (value !== undefined) {
                (loadedSettings as any)[key] = value;
            }
        });

        const newJson = JSON.stringify(loadedSettings);

        // Only update state if settings actually changed
        if (newJson !== settingsJsonRef.current) {
            settingsJsonRef.current = newJson;
            setSettings(loadedSettings);
        }
        setIsLoaded(true);
    }, []);

    // Subscribe to preference changes
    useEffect(() => {
        loadSettings();

        const unsubscribe = preferencesService.subscribe((isRemote: boolean, changedKeys?: string[]) => {
            // Skip if we're the one making the change (we already updated our state)
            if (isUpdatingRef.current) {
                return;
            }

            // For remote changes, always reload
            if (isRemote) {
                loadSettings();
                return;
            }

            // For local changes from other hooks, check if relevant keys changed
            if (changedKeys) {
                const hasRelevantChanges = changedKeys.some(key =>
                    key.startsWith('appearance') ||
                    key.startsWith('datetime') ||
                    key.startsWith('dashboard') ||
                    key.startsWith('grid') ||
                    key.startsWith('dock') ||
                    key.startsWith('dragHandle') ||
                    key.startsWith('widget') ||
                    key.startsWith('notifications') ||
                    key.startsWith('data') ||
                    key.startsWith('presets') ||
                    key.startsWith('keyboard')
                );
                if (hasRelevantChanges) {
                    loadSettings();
                }
            }
        });

        return unsubscribe;
    }, [loadSettings]);

    // Update a single setting
    const updateSetting = useCallback(<K extends keyof UserSettings>(
        key: K,
        value: UserSettings[K]
    ) => {
        const prefKey = SETTINGS_KEY_MAP[key];

        // Update local state immediately
        setSettings(prev => {
            if (prev[key] === value) {
                return prev; // No change
            }
            const newSettings = {
                ...prev,
                [key]: value,
            };
            settingsJsonRef.current = JSON.stringify(newSettings);
            return newSettings;
        });

        // Mark that we're updating to avoid reacting to our own notification
        isUpdatingRef.current = true;

        // Sync to preferences - notify local so SettingsContext and other consumers update
        preferencesService.set(prefKey, value);

        // Clear the flag after a short delay (after notifications are processed)
        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 100);
    }, []);

    // Update multiple settings at once
    const updateSettings = useCallback((updates: Partial<UserSettings>) => {
        const prefUpdates: Record<string, any> = {};

        (Object.keys(updates) as Array<keyof UserSettings>).forEach((key) => {
            const prefKey = SETTINGS_KEY_MAP[key];
            prefUpdates[prefKey] = updates[key];
        });

        // Update local state immediately
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            settingsJsonRef.current = JSON.stringify(newSettings);
            return newSettings;
        });

        // Mark that we're updating to avoid reacting to our own notification
        isUpdatingRef.current = true;

        // Sync to preferences - notify local so SettingsContext and other consumers update
        preferencesService.setMany(prefUpdates);

        // Clear the flag after a short delay
        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 100);
    }, []);

    // Reset a setting to default
    const resetSetting = useCallback(<K extends keyof UserSettings>(key: K) => {
        const defaultValue = DEFAULT_SETTINGS[key];
        updateSetting(key, defaultValue);
    }, [updateSetting]);

    // Reset all settings to defaults
    const resetAllSettings = useCallback(() => {
        updateSettings(DEFAULT_SETTINGS);
    }, [updateSettings]);

    return {
        settings,
        isLoaded,
        updateSetting,
        updateSettings,
        resetSetting,
        resetAllSettings,
        defaults: DEFAULT_SETTINGS,
    };
}

/**
 * Hook to access a single setting
 */
export function useSetting<K extends keyof UserSettings>(key: K): [
    UserSettings[K],
    (value: UserSettings[K]) => void
] {
    const { settings, updateSetting } = useSettings();

    const setValue = useCallback((value: UserSettings[K]) => {
        updateSetting(key, value);
    }, [key, updateSetting]);

    return [settings[key], setValue];
}

/**
 * Get a single setting value directly (non-reactive, for use outside React)
 */
export function getSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    const prefKey = SETTINGS_KEY_MAP[key];
    return preferencesService.get(prefKey, DEFAULT_SETTINGS[key]) as UserSettings[K];
}

/**
 * Set a single setting value directly (non-reactive, for use outside React)
 */
export function setSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
    const prefKey = SETTINGS_KEY_MAP[key];
    preferencesService.set(prefKey, value);
}

// Export defaults for external use
export { DEFAULT_SETTINGS };
