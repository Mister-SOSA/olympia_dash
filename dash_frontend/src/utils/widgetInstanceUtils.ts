/**
 * Widget Instance Utilities
 * 
 * Utilities for managing multi-instance widgets. These widgets can have multiple
 * copies on the dashboard, each with their own configuration and settings.
 * 
 * Widget ID Format:
 * - Singleton widgets: "WidgetType" (e.g., "ClockWidget")
 * - Multi-instance widgets: "WidgetType:instanceId" (e.g., "FanController:abc123")
 */

import { Widget } from "@/types";
import { getWidgetConfig, WIDGET_CONFIGS, type WidgetConfig } from "@/components/widgets/registry";

/** Separator used between widget type and instance ID */
export const INSTANCE_SEPARATOR = ":";

/**
 * Parse a widget ID into its component parts
 * @param widgetId - The full widget ID (e.g., "FanController:abc123" or "ClockWidget")
 * @returns Object with widgetType and optional instanceId
 */
export function parseWidgetId(widgetId: string): { widgetType: string; instanceId?: string } {
    const separatorIndex = widgetId.indexOf(INSTANCE_SEPARATOR);

    if (separatorIndex === -1) {
        return { widgetType: widgetId };
    }

    return {
        widgetType: widgetId.substring(0, separatorIndex),
        instanceId: widgetId.substring(separatorIndex + 1),
    };
}

/**
 * Get the widget type from a widget ID
 * @param widgetId - The full widget ID
 * @returns The widget type (config ID)
 */
export function getWidgetType(widgetId: string): string {
    return parseWidgetId(widgetId).widgetType;
}

/**
 * Get the instance ID from a widget ID (if it's a multi-instance widget)
 * @param widgetId - The full widget ID
 * @returns The instance ID or undefined for singleton widgets
 */
export function getInstanceId(widgetId: string): string | undefined {
    return parseWidgetId(widgetId).instanceId;
}

/**
 * Check if a widget ID represents a multi-instance widget
 * @param widgetId - The full widget ID
 * @returns true if the widget has an instance ID
 */
export function isMultiInstanceWidget(widgetId: string): boolean {
    return widgetId.includes(INSTANCE_SEPARATOR);
}

/**
 * Create a full widget ID from type and instance ID
 * @param widgetType - The widget type (config ID)
 * @param instanceId - The instance identifier
 * @returns Full widget ID in format "widgetType:instanceId"
 */
export function createWidgetId(widgetType: string, instanceId: string): string {
    return `${widgetType}${INSTANCE_SEPARATOR}${instanceId}`;
}

/**
 * Generate a unique instance ID for a new widget instance
 * @returns A unique instance ID (short random string)
 */
export function generateInstanceId(): string {
    // Generate a short, URL-safe random ID
    return Math.random().toString(36).substring(2, 10);
}

/**
 * Check if a widget type allows multiple instances
 * @param widgetType - The widget type (config ID)
 * @returns true if the widget type allows multiple instances
 */
export function widgetAllowsMultiple(widgetType: string): boolean {
    const config = getWidgetConfig(widgetType);
    return config?.allowMultiple === true;
}

/**
 * Get the configuration for a widget by its full ID
 * Handles both singleton and multi-instance widgets
 * @param widgetId - The full widget ID
 * @returns The widget configuration or undefined
 */
export function getWidgetConfigById(widgetId: string): WidgetConfig | undefined {
    const { widgetType } = parseWidgetId(widgetId);
    return getWidgetConfig(widgetType);
}

/**
 * Count how many instances of a widget type exist in a layout
 * @param layout - The current widget layout
 * @param widgetType - The widget type to count
 * @returns Number of instances (including disabled ones)
 */
export function countWidgetInstances(layout: Widget[], widgetType: string): number {
    return layout.filter(w => getWidgetType(w.id) === widgetType).length;
}

/**
 * Count how many enabled instances of a widget type exist in a layout
 * @param layout - The current widget layout
 * @param widgetType - The widget type to count
 * @returns Number of enabled instances
 */
export function countEnabledWidgetInstances(layout: Widget[], widgetType: string): number {
    return layout.filter(w => getWidgetType(w.id) === widgetType && w.enabled).length;
}

/**
 * Get all instances of a widget type from a layout
 * @param layout - The current widget layout
 * @param widgetType - The widget type to find
 * @returns Array of widgets matching the type
 */
export function getWidgetInstances(layout: Widget[], widgetType: string): Widget[] {
    return layout.filter(w => getWidgetType(w.id) === widgetType);
}

/**
 * Check if a new instance can be added for a widget type
 * @param layout - The current widget layout
 * @param widgetType - The widget type to check
 * @returns true if a new instance can be added
 */
export function canAddInstance(layout: Widget[], widgetType: string): boolean {
    const config = getWidgetConfig(widgetType);

    if (!config) return false;
    if (!config.allowMultiple) return false;

    const currentCount = countEnabledWidgetInstances(layout, widgetType);

    // If maxInstances is defined, check against it
    if (config.maxInstances !== undefined) {
        return currentCount < config.maxInstances;
    }

    return true;
}

/**
 * Generate a display name for a new widget instance
 * @param widgetType - The widget type
 * @param layout - The current layout (to determine instance number)
 * @returns A generated display name
 */
export function generateInstanceDisplayName(widgetType: string, layout: Widget[]): string {
    const config = getWidgetConfig(widgetType);
    if (!config) return widgetType;

    const existingInstances = getWidgetInstances(layout, widgetType);
    const instanceNumber = existingInstances.length + 1;

    if (config.instanceNameTemplate) {
        return config.instanceNameTemplate.replace("{n}", String(instanceNumber));
    }

    if (config.allowMultiple) {
        return `${config.title} ${instanceNumber}`;
    }

    return config.title;
}

/**
 * Create a new widget instance from a widget configuration
 * @param widgetType - The widget type (config ID)
 * @param layout - The current layout (for positioning and naming)
 * @returns A new Widget object ready to be added to the layout
 */
export function createWidgetInstance(widgetType: string, layout: Widget[]): Widget | null {
    const config = getWidgetConfig(widgetType);
    if (!config) return null;

    // For multi-instance widgets, generate a unique ID
    const widgetId = config.allowMultiple
        ? createWidgetId(widgetType, generateInstanceId())
        : widgetType;

    // Find position for new widget (simple: place at 0,0 - grid will handle collision)
    const newWidget: Widget = {
        id: widgetId,
        x: 0,
        y: 0,
        w: config.defaultSize.w,
        h: config.defaultSize.h,
        enabled: true,
        displayName: generateInstanceDisplayName(widgetType, layout),
        category: config.category,
        description: config.description,
    };

    return newWidget;
}

/**
 * Get all widget types that allow multiple instances
 * @returns Array of WidgetConfig objects that allow multiple instances
 */
export function getMultiInstanceWidgetTypes(): WidgetConfig[] {
    return WIDGET_CONFIGS.filter(config => config.allowMultiple === true);
}

/**
 * Get all singleton widget types
 * @returns Array of WidgetConfig objects that are singleton
 */
export function getSingletonWidgetTypes(): WidgetConfig[] {
    return WIDGET_CONFIGS.filter(config => config.allowMultiple !== true);
}

/**
 * Validate a layout and clean up any invalid widget instances
 * @param layout - The layout to validate
 * @returns Cleaned layout with invalid instances removed
 */
export function validateWidgetInstances(layout: Widget[]): Widget[] {
    return layout.filter(widget => {
        const { widgetType } = parseWidgetId(widget.id);
        const config = getWidgetConfig(widgetType);

        // Remove widgets with no config (deleted widget types)
        if (!config) {
            console.warn(`[WidgetInstance] Removing widget with unknown type: ${widgetType}`);
            return false;
        }

        // For singleton widgets with instance IDs (corrupted), only keep if ID matches type
        if (!config.allowMultiple && isMultiInstanceWidget(widget.id)) {
            console.warn(`[WidgetInstance] Singleton widget has instance ID, fixing: ${widget.id}`);
            widget.id = widgetType;
        }

        return true;
    });
}

/**
 * Remove duplicate singleton widgets from a layout
 * (Keep only the first occurrence of each singleton widget type)
 * @param layout - The layout to deduplicate
 * @returns Deduplicated layout
 */
export function deduplicateSingletonWidgets(layout: Widget[]): Widget[] {
    const seenSingletons = new Set<string>();

    return layout.filter(widget => {
        const { widgetType } = parseWidgetId(widget.id);
        const config = getWidgetConfig(widgetType);

        // Multi-instance widgets or unknown types pass through
        if (!config || config.allowMultiple) {
            return true;
        }

        // For singletons, only keep the first one
        if (seenSingletons.has(widgetType)) {
            console.warn(`[WidgetInstance] Removing duplicate singleton: ${widget.id}`);
            return false;
        }

        seenSingletons.add(widgetType);
        return true;
    });
}

/**
 * Normalize widget IDs in a layout
 * - Ensures singleton widgets don't have instance IDs
 * - Ensures multi-instance widgets have instance IDs
 * @param layout - The layout to normalize
 * @returns Normalized layout
 */
export function normalizeWidgetIds(layout: Widget[]): Widget[] {
    return layout.map(widget => {
        const { widgetType, instanceId } = parseWidgetId(widget.id);
        const config = getWidgetConfig(widgetType);

        if (!config) return widget;

        // Singleton widgets should not have instance IDs
        if (!config.allowMultiple && instanceId) {
            return { ...widget, id: widgetType };
        }

        // Multi-instance widgets should have instance IDs
        if (config.allowMultiple && !instanceId) {
            return { ...widget, id: createWidgetId(widgetType, generateInstanceId()) };
        }

        return widget;
    });
}
