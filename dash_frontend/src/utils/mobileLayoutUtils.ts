/**
 * Mobile Layout Utilities
 * 
 * Mobile layouts are completely independent from desktop layouts:
 * - No presets, no grid positions
 * - Just a simple list of enabled widget IDs
 * - Syncs only with other mobile devices via preferences
 * - Order determines display order in the grid
 */

import { preferencesService } from "@/lib/preferences";
import { WIDGET_CONFIGS } from "@/components/widgets/registry";

const MOBILE_LAYOUT_KEY = "mobile_widget_layout";

export interface MobileLayout {
    /** Ordered list of enabled widget IDs */
    enabledWidgetIds: string[];
    /** Last updated timestamp */
    updatedAt: string;
}

/**
 * Get the default mobile layout (all widgets disabled initially)
 */
export const getDefaultMobileLayout = (): MobileLayout => ({
    enabledWidgetIds: [],
    updatedAt: new Date().toISOString(),
});

/**
 * Get a sensible starter layout with common widgets
 */
export const getStarterMobileLayout = (): MobileLayout => ({
    enabledWidgetIds: [
        "Overview",
        "SalesByDayBar",
        "ClockWidget",
        "DateWidget",
    ],
    updatedAt: new Date().toISOString(),
});

/**
 * Read mobile layout from preferences
 */
export const readMobileLayout = (): MobileLayout => {
    try {
        const saved = preferencesService.get<MobileLayout | undefined>(MOBILE_LAYOUT_KEY, undefined);
        if (saved && Array.isArray(saved.enabledWidgetIds)) {
            // Validate that all widget IDs still exist
            const validIds = new Set(WIDGET_CONFIGS.map(w => w.id));
            const filteredIds = saved.enabledWidgetIds.filter(id => validIds.has(id));
            return {
                enabledWidgetIds: filteredIds,
                updatedAt: saved.updatedAt || new Date().toISOString(),
            };
        }
    } catch (e) {
        console.error("[MobileLayout] Error reading layout:", e);
    }
    return getDefaultMobileLayout();
};

/**
 * Save mobile layout to preferences (syncs to server)
 */
export const saveMobileLayout = (layout: MobileLayout): void => {
    try {
        preferencesService.set(MOBILE_LAYOUT_KEY, {
            ...layout,
            updatedAt: new Date().toISOString(),
        });
    } catch (e) {
        console.error("[MobileLayout] Error saving layout:", e);
    }
};

/**
 * Check if a widget is enabled in the mobile layout
 */
export const isWidgetEnabled = (layout: MobileLayout, widgetId: string): boolean => {
    return layout.enabledWidgetIds.includes(widgetId);
};

/**
 * Toggle a widget's enabled state
 */
export const toggleWidget = (layout: MobileLayout, widgetId: string): MobileLayout => {
    const isEnabled = isWidgetEnabled(layout, widgetId);

    if (isEnabled) {
        // Remove widget
        return {
            enabledWidgetIds: layout.enabledWidgetIds.filter(id => id !== widgetId),
            updatedAt: new Date().toISOString(),
        };
    } else {
        // Add widget at end
        return {
            enabledWidgetIds: [...layout.enabledWidgetIds, widgetId],
            updatedAt: new Date().toISOString(),
        };
    }
};

/**
 * Set multiple widgets' enabled state at once
 */
export const setWidgetsEnabled = (
    layout: MobileLayout,
    widgetIds: string[],
    enabled: boolean
): MobileLayout => {
    const currentSet = new Set(layout.enabledWidgetIds);

    if (enabled) {
        // Add all specified widgets
        widgetIds.forEach(id => currentSet.add(id));
    } else {
        // Remove all specified widgets
        widgetIds.forEach(id => currentSet.delete(id));
    }

    return {
        enabledWidgetIds: Array.from(currentSet),
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Reorder widgets in the layout
 */
export const reorderWidgets = (
    layout: MobileLayout,
    fromIndex: number,
    toIndex: number
): MobileLayout => {
    const newOrder = [...layout.enabledWidgetIds];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    return {
        enabledWidgetIds: newOrder,
        updatedAt: new Date().toISOString(),
    };
};

/**
 * Subscribe to mobile layout changes (from other devices)
 */
export const subscribeMobileLayout = (
    callback: (layout: MobileLayout) => void
): (() => void) => {
    const handler = (isRemote: boolean, changedKeys?: string[]) => {
        if (isRemote && changedKeys?.includes(MOBILE_LAYOUT_KEY)) {
            callback(readMobileLayout());
        }
    };

    return preferencesService.subscribe(handler);
};
