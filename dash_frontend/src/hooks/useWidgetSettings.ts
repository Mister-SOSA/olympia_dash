/**
 * useWidgetSettings Hook
 * 
 * A React hook for accessing and updating widget-specific settings.
 * Provides real-time synchronization when settings change.
 * 
 * For multi-instance widgets, pass the full widget ID (e.g., "FanController:abc123")
 * The hook will use the widget type to look up the settings schema.
 */

import { useState, useEffect, useCallback } from 'react';
import { widgetSettingsService } from '@/lib/widgetSettings';
import { getWidgetDefaultSettings, getWidgetSettingsSchema } from '@/constants/widgetSettings';
import { getWidgetType } from '@/utils/widgetInstanceUtils';

/**
 * Hook to access and update settings for a specific widget instance
 * @param widgetId - The full widget ID (including instance ID for multi-instance widgets)
 */
export function useWidgetSettings<T extends Record<string, any> = Record<string, any>>(
    widgetId: string
) {
    const [settings, setSettings] = useState<T>(() =>
        widgetSettingsService.getSettings(widgetId) as T
    );

    // Subscribe to settings changes
    useEffect(() => {
        const unsubscribe = widgetSettingsService.subscribe(widgetId, () => {
            setSettings(widgetSettingsService.getSettings(widgetId) as T);
        });
        return unsubscribe;
    }, [widgetId]);

    // Update a single setting
    const updateSetting = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        widgetSettingsService.setSetting(widgetId, key as string, value);
    }, [widgetId]);

    // Update multiple settings
    const updateSettings = useCallback((updates: Partial<T>) => {
        widgetSettingsService.setSettings(widgetId, updates);
    }, [widgetId]);

    // Reset all settings to defaults
    const resetSettings = useCallback(() => {
        widgetSettingsService.resetSettings(widgetId);
    }, [widgetId]);

    // Reset a single setting to default
    const resetSetting = useCallback(<K extends keyof T>(key: K) => {
        widgetSettingsService.resetSetting(widgetId, key as string);
    }, [widgetId]);

    // Get the widget type for schema lookup
    const widgetType = getWidgetType(widgetId);

    // Get the schema for this widget type
    const schema = getWidgetSettingsSchema(widgetType);

    // Get the default settings for this widget type
    const defaults = getWidgetDefaultSettings(widgetType) as T;

    return {
        settings,
        updateSetting,
        updateSettings,
        resetSettings,
        resetSetting,
        schema,
        defaults,
        hasCustomSettings: widgetSettingsService.hasCustomSettings(widgetId),
        widgetType, // Expose for debugging/display
    };
}

/**
 * Hook to access a single widget setting
 * @param widgetId - The full widget ID (including instance ID for multi-instance widgets)
 * @param key - The setting key
 * @param defaultValue - Optional default value
 */
export function useWidgetSetting<T = any>(
    widgetId: string,
    key: string,
    defaultValue?: T
): [T, (value: T) => void] {
    const [value, setValue] = useState<T>(() =>
        widgetSettingsService.getSetting(widgetId, key, defaultValue)
    );

    useEffect(() => {
        const unsubscribe = widgetSettingsService.subscribe(widgetId, () => {
            setValue(widgetSettingsService.getSetting(widgetId, key, defaultValue));
        });
        return unsubscribe;
    }, [widgetId, key, defaultValue]);

    const updateValue = useCallback((newValue: T) => {
        widgetSettingsService.setSetting(widgetId, key, newValue);
    }, [widgetId, key]);

    return [value, updateValue];
}
