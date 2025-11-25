/**
 * Widget Settings Service
 * 
 * Manages per-widget-instance settings storage and retrieval.
 * Settings are stored in the user's preferences under 'widgetSettings.<widgetId>'
 */

import { preferencesService } from './preferences';
import { getWidgetDefaultSettings, getWidgetSettingsSchema } from '@/constants/widgetSettings';

const WIDGET_SETTINGS_PREFIX = 'widgetSettings';

class WidgetSettingsService {
    private changeCallbacks: Map<string, Set<() => void>> = new Map();

    /**
     * Get the storage key for a widget's settings
     */
    private getStorageKey(widgetId: string): string {
        return `${WIDGET_SETTINGS_PREFIX}.${widgetId}`;
    }

    /**
     * Get all settings for a widget instance
     * Returns merged default settings with any saved overrides
     */
    getSettings(widgetId: string): Record<string, any> {
        const defaults = getWidgetDefaultSettings(widgetId);
        const saved = preferencesService.get(this.getStorageKey(widgetId), {}) as Record<string, any>;
        return { ...defaults, ...saved };
    }

    /**
     * Get a specific setting value for a widget
     */
    getSetting<T = any>(widgetId: string, key: string, defaultValue?: T): T {
        const settings = this.getSettings(widgetId);
        return (settings[key] ?? defaultValue) as T;
    }

    /**
     * Set a specific setting value for a widget
     */
    setSetting(widgetId: string, key: string, value: any): void {
        const currentSettings = preferencesService.get(this.getStorageKey(widgetId), {}) as Record<string, any>;
        const newSettings = { ...currentSettings, [key]: value };
        preferencesService.set(this.getStorageKey(widgetId), newSettings);
        this.notifySubscribers(widgetId);
    }

    /**
     * Set multiple settings for a widget at once
     */
    setSettings(widgetId: string, settings: Record<string, any>): void {
        const currentSettings = preferencesService.get(this.getStorageKey(widgetId), {}) as Record<string, any>;
        const newSettings = { ...currentSettings, ...settings };
        preferencesService.set(this.getStorageKey(widgetId), newSettings);
        this.notifySubscribers(widgetId);
    }

    /**
     * Reset a widget's settings to defaults
     */
    resetSettings(widgetId: string): void {
        preferencesService.delete(this.getStorageKey(widgetId));
        this.notifySubscribers(widgetId);
    }

    /**
     * Reset a specific setting to its default value
     */
    resetSetting(widgetId: string, key: string): void {
        const currentSettings = preferencesService.get(this.getStorageKey(widgetId), {}) as Record<string, any>;
        delete currentSettings[key];
        if (Object.keys(currentSettings).length === 0) {
            preferencesService.delete(this.getStorageKey(widgetId));
        } else {
            preferencesService.set(this.getStorageKey(widgetId), currentSettings);
        }
        this.notifySubscribers(widgetId);
    }

    /**
     * Check if a widget has any custom settings (non-default)
     */
    hasCustomSettings(widgetId: string): boolean {
        const saved = preferencesService.get(this.getStorageKey(widgetId), {}) as Record<string, any>;
        return Object.keys(saved).length > 0;
    }

    /**
     * Subscribe to settings changes for a specific widget
     */
    subscribe(widgetId: string, callback: () => void): () => void {
        if (!this.changeCallbacks.has(widgetId)) {
            this.changeCallbacks.set(widgetId, new Set());
        }
        this.changeCallbacks.get(widgetId)!.add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.changeCallbacks.get(widgetId);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.changeCallbacks.delete(widgetId);
                }
            }
        };
    }

    /**
     * Subscribe to all widget settings changes
     */
    subscribeAll(callback: () => void): () => void {
        // Use a special key for global subscribers
        const GLOBAL_KEY = '__global__';
        if (!this.changeCallbacks.has(GLOBAL_KEY)) {
            this.changeCallbacks.set(GLOBAL_KEY, new Set());
        }
        this.changeCallbacks.get(GLOBAL_KEY)!.add(callback);

        return () => {
            const callbacks = this.changeCallbacks.get(GLOBAL_KEY);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Notify all subscribers for a widget
     */
    private notifySubscribers(widgetId: string): void {
        // Notify widget-specific subscribers
        const widgetCallbacks = this.changeCallbacks.get(widgetId);
        if (widgetCallbacks) {
            widgetCallbacks.forEach(cb => cb());
        }

        // Notify global subscribers
        const globalCallbacks = this.changeCallbacks.get('__global__');
        if (globalCallbacks) {
            globalCallbacks.forEach(cb => cb());
        }
    }
}

export const widgetSettingsService = new WidgetSettingsService();

// Expose for debugging
if (typeof window !== 'undefined') {
    (window as any).widgetSettings = widgetSettingsService;
}
