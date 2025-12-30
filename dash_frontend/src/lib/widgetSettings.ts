/**
 * Widget Settings Service
 * 
 * Manages per-widget-instance settings storage and retrieval.
 * Settings are stored in the user's preferences under 'widgetSettings.<widgetId>'
 * 
 * For multi-instance widgets, the widgetId includes the instance identifier:
 * - Singleton: "ClockWidget"
 * - Multi-instance: "FanController:abc123"
 * 
 * Settings are retrieved using the widget type to get defaults, but stored
 * using the full widget ID to maintain instance-specific overrides.
 */

import { preferencesService } from './preferences';
import { getWidgetDefaultSettings, getWidgetSettingsSchema } from '@/constants/widgetSettings';
import { getWidgetType, isMultiInstanceWidget } from '@/utils/widgetInstanceUtils';

const WIDGET_SETTINGS_PREFIX = 'widgetSettings';

class WidgetSettingsService {
    private changeCallbacks: Map<string, Set<() => void>> = new Map();
    private initialized = false;

    /**
     * Initialize the service - subscribe to remote preference changes
     * This ensures widget settings are synced in real-time during impersonation
     */
    private initialize(): void {
        if (this.initialized || typeof window === 'undefined') return;
        this.initialized = true;

        // Subscribe to preferences changes to detect remote widget settings updates
        preferencesService.subscribe((isRemote: boolean, changedKeys?: string[]) => {
            if (!isRemote) return; // Only handle remote changes

            // Check if any widget settings changed
            const widgetSettingsChanged = changedKeys?.some(key =>
                key === WIDGET_SETTINGS_PREFIX || key.startsWith(`${WIDGET_SETTINGS_PREFIX}.`)
            );

            if (widgetSettingsChanged || !changedKeys) {
                // Notify all widget subscribers about the remote change
                this.notifyAllSubscribers();
            }
        });

        console.log('[WidgetSettings] Initialized with remote sync support');
    }

    /**
     * Get the storage key for a widget's settings
     * Uses the full widget ID (including instance ID for multi-instance widgets)
     */
    private getStorageKey(widgetId: string): string {
        // Initialize on first use
        this.initialize();
        return `${WIDGET_SETTINGS_PREFIX}.${widgetId}`;
    }

    /**
     * Get all settings for a widget instance
     * Returns merged default settings (by widget type) with any saved overrides (by instance ID)
     */
    getSettings(widgetId: string): Record<string, any> {
        // Get defaults based on widget type (not instance)
        const widgetType = getWidgetType(widgetId);
        const defaults = getWidgetDefaultSettings(widgetType);

        // Get saved settings for this specific instance
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
     * Copy settings from one widget instance to another
     * Useful when duplicating multi-instance widgets
     */
    copySettings(fromWidgetId: string, toWidgetId: string): void {
        const settings = preferencesService.get(this.getStorageKey(fromWidgetId), {}) as Record<string, any>;
        if (Object.keys(settings).length > 0) {
            preferencesService.set(this.getStorageKey(toWidgetId), { ...settings });
            this.notifySubscribers(toWidgetId);
        }
    }

    /**
     * Delete all settings for a widget instance
     * Called when removing a multi-instance widget
     */
    deleteInstanceSettings(widgetId: string): void {
        preferencesService.delete(this.getStorageKey(widgetId));
        // No need to notify - the widget is being removed
    }

    /**
     * Get all widget IDs that have custom settings stored
     * Useful for cleanup and migration
     */
    getAllCustomizedWidgetIds(): string[] {
        const allPrefs = preferencesService.getAll();
        const widgetIds: string[] = [];

        for (const key of Object.keys(allPrefs)) {
            if (key.startsWith(WIDGET_SETTINGS_PREFIX + '.')) {
                const widgetId = key.substring(WIDGET_SETTINGS_PREFIX.length + 1);
                widgetIds.push(widgetId);
            }
        }

        return widgetIds;
    }

    /**
     * Clean up orphaned settings (for widget instances that no longer exist)
     * @param activeWidgetIds - Array of widget IDs currently in the layout
     */
    cleanupOrphanedSettings(activeWidgetIds: string[]): void {
        const customizedIds = this.getAllCustomizedWidgetIds();
        const activeIdSet = new Set(activeWidgetIds);

        for (const widgetId of customizedIds) {
            // Only clean up multi-instance widget settings
            // Singleton widget settings are kept even if widget is disabled
            if (isMultiInstanceWidget(widgetId) && !activeIdSet.has(widgetId)) {
                console.log(`[WidgetSettings] Cleaning up orphaned settings for: ${widgetId}`);
                this.deleteInstanceSettings(widgetId);
            }
        }
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

    /**
     * Notify ALL subscribers (used for remote preference sync)
     * This is called when widget settings change from another session
     */
    private notifyAllSubscribers(): void {
        console.log('[WidgetSettings] Remote settings change detected, notifying all subscribers');
        this.changeCallbacks.forEach((callbacks, key) => {
            callbacks.forEach(cb => cb());
        });
    }
}

export const widgetSettingsService = new WidgetSettingsService();

// Expose for debugging
if (typeof window !== 'undefined') {
    (window as any).widgetSettings = widgetSettingsService;
}
