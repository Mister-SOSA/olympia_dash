/**
 * useWidgetSettings Hook
 * 
 * A React hook for accessing and updating widget-specific settings.
 * Provides real-time synchronization when settings change.
 */

import { useState, useEffect, useCallback } from 'react';
import { widgetSettingsService } from '@/lib/widgetSettings';
import { getWidgetDefaultSettings, getWidgetSettingsSchema } from '@/constants/widgetSettings';

/**
 * Hook to access and update settings for a specific widget
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

    // Get the schema for this widget
    const schema = getWidgetSettingsSchema(widgetId);

    // Get the default settings for this widget
    const defaults = getWidgetDefaultSettings(widgetId) as T;

    return {
        settings,
        updateSetting,
        updateSettings,
        resetSettings,
        resetSetting,
        schema,
        defaults,
        hasCustomSettings: widgetSettingsService.hasCustomSettings(widgetId),
    };
}

/**
 * Hook to access a single widget setting
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
