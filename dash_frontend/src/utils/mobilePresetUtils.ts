/**
 * Mobile Preset Utilities
 * 
 * Brings preset functionality to mobile with a simplified interface.
 * Mobile presets store widget lists (no grid positions since mobile uses a simple list).
 */

import { preferencesService } from "@/lib/preferences";
import { WIDGET_CONFIGS } from "@/components/widgets/registry";

const MOBILE_PRESETS_KEY = "mobile_presets";
const MOBILE_ACTIVE_PRESET_KEY = "mobile_active_preset";
const MAX_PRESETS = 5;

export interface MobilePreset {
    id: number;
    name: string;
    widgetIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface MobilePresetsState {
    presets: (MobilePreset | null)[];
    activePresetIndex: number;
}

/**
 * Get default presets state
 */
export const getDefaultPresetsState = (): MobilePresetsState => ({
    presets: Array(MAX_PRESETS).fill(null),
    activePresetIndex: 0,
});

/**
 * Get starter presets with some default configurations
 */
export const getStarterPresets = (): MobilePresetsState => {
    const now = new Date().toISOString();
    return {
        presets: [
            {
                id: 0,
                name: "Overview",
                widgetIds: ["Overview", "SalesByDayBar", "ClockWidget", "DateWidget"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 1,
                name: "Sales",
                widgetIds: ["Overview", "SalesByDayBar", "SalesByMonthBar", "TopCustomersThisYearPie"],
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 2,
                name: "Inventory",
                widgetIds: ["DailyMovesByUser", "InventoryMovesLog", "MachineStockStatus"],
                createdAt: now,
                updatedAt: now,
            },
            null,
            null,
        ],
        activePresetIndex: 0,
    };
};

/**
 * Validate a widget ID - supports both singleton IDs ("ClockWidget") 
 * and multi-instance IDs ("FanController:abc123")
 */
const isValidWidgetId = (id: string): boolean => {
    const validBaseIds = new Set(WIDGET_CONFIGS.map(w => w.id));
    // Check direct match (singleton widgets)
    if (validBaseIds.has(id)) return true;
    // Check multi-instance format: "BaseType:instanceId"
    const separatorIndex = id.indexOf(":");
    if (separatorIndex > 0) {
        const baseType = id.substring(0, separatorIndex);
        const config = WIDGET_CONFIGS.find(w => w.id === baseType);
        return config?.allowMultiple === true;
    }
    return false;
};

/**
 * Read presets from preferences
 */
export const readMobilePresets = (): MobilePresetsState => {
    try {
        const saved = preferencesService.get<MobilePresetsState | undefined>(MOBILE_PRESETS_KEY, undefined);
        if (saved && Array.isArray(saved.presets)) {
            // Validate widget IDs - supports both singleton and multi-instance formats
            const presets = saved.presets.map(preset => {
                if (!preset) return null;
                return {
                    ...preset,
                    widgetIds: preset.widgetIds.filter(isValidWidgetId),
                };
            });

            // Ensure we have exactly MAX_PRESETS slots
            while (presets.length < MAX_PRESETS) presets.push(null);

            return {
                presets: presets.slice(0, MAX_PRESETS),
                activePresetIndex: Math.min(saved.activePresetIndex || 0, MAX_PRESETS - 1),
            };
        }
    } catch (e) {
        console.error("[MobilePresets] Error reading presets:", e);
    }
    return getDefaultPresetsState();
};

/**
 * Save presets to preferences
 */
export const saveMobilePresets = (state: MobilePresetsState): void => {
    try {
        preferencesService.set(MOBILE_PRESETS_KEY, state);
    } catch (e) {
        console.error("[MobilePresets] Error saving presets:", e);
    }
};

/**
 * Save active preset index
 */
export const saveActivePresetIndex = (index: number): void => {
    try {
        preferencesService.set(MOBILE_ACTIVE_PRESET_KEY, index);
    } catch (e) {
        console.error("[MobilePresets] Error saving active index:", e);
    }
};

/**
 * Get the current active preset
 */
export const getActivePreset = (state: MobilePresetsState): MobilePreset | null => {
    return state.presets[state.activePresetIndex] || null;
};

/**
 * Save/update a preset at a specific slot
 */
export const savePreset = (
    state: MobilePresetsState,
    index: number,
    name: string,
    widgetIds: string[]
): MobilePresetsState => {
    const now = new Date().toISOString();
    const existingPreset = state.presets[index];

    const newPresets = [...state.presets];
    newPresets[index] = {
        id: index,
        name,
        widgetIds,
        createdAt: existingPreset?.createdAt || now,
        updatedAt: now,
    };

    return {
        ...state,
        presets: newPresets,
    };
};

/**
 * Delete a preset
 */
export const deletePreset = (
    state: MobilePresetsState,
    index: number
): MobilePresetsState => {
    const newPresets = [...state.presets];
    newPresets[index] = null;

    return {
        ...state,
        presets: newPresets,
    };
};

/**
 * Update widgets in the active preset
 */
export const updateActivePresetWidgets = (
    state: MobilePresetsState,
    widgetIds: string[]
): MobilePresetsState => {
    const activePreset = state.presets[state.activePresetIndex];
    if (!activePreset) return state;

    const newPresets = [...state.presets];
    newPresets[state.activePresetIndex] = {
        ...activePreset,
        widgetIds,
        updatedAt: new Date().toISOString(),
    };

    return {
        ...state,
        presets: newPresets,
    };
};

/**
 * Toggle a widget in the active preset
 */
export const toggleWidgetInActivePreset = (
    state: MobilePresetsState,
    widgetId: string
): MobilePresetsState => {
    const activePreset = state.presets[state.activePresetIndex];
    if (!activePreset) return state;

    const isEnabled = activePreset.widgetIds.includes(widgetId);
    const newWidgetIds = isEnabled
        ? activePreset.widgetIds.filter(id => id !== widgetId)
        : [...activePreset.widgetIds, widgetId];

    return updateActivePresetWidgets(state, newWidgetIds);
};

/**
 * Add a widget ID to the active preset (without toggling - always adds)
 */
export const addWidgetToActivePreset = (
    state: MobilePresetsState,
    widgetId: string
): MobilePresetsState => {
    const activePreset = state.presets[state.activePresetIndex];
    if (!activePreset) return state;

    // Don't add duplicates
    if (activePreset.widgetIds.includes(widgetId)) return state;

    return updateActivePresetWidgets(state, [...activePreset.widgetIds, widgetId]);
};

/**
 * Remove a widget ID from the active preset
 */
export const removeWidgetFromActivePreset = (
    state: MobilePresetsState,
    widgetId: string
): MobilePresetsState => {
    const activePreset = state.presets[state.activePresetIndex];
    if (!activePreset) return state;

    return updateActivePresetWidgets(
        state,
        activePreset.widgetIds.filter(id => id !== widgetId)
    );
};

/**
 * Get count of non-null presets
 */
export const getPresetCount = (state: MobilePresetsState): number => {
    return state.presets.filter(p => p !== null).length;
};

/**
 * Find next available preset slot
 */
export const findNextEmptySlot = (state: MobilePresetsState): number => {
    return state.presets.findIndex(p => p === null);
};

/**
 * Subscribe to preset changes from other devices
 */
export const subscribeMobilePresets = (
    callback: (state: MobilePresetsState) => void
): (() => void) => {
    const handler = (isRemote: boolean, changedKeys?: string[]) => {
        if (isRemote && changedKeys?.some(k => k.startsWith('mobile_preset'))) {
            callback(readMobilePresets());
        }
    };
    return preferencesService.subscribe(handler);
};
