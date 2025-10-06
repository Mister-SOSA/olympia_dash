import { Widget, DashboardPreset } from "@/types";
import { LOCAL_STORAGE_KEY, COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";

/**
 * Reads the saved layout from localStorage.
 * Falls back to the master widget list with all widgets disabled.
 */
export const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
        try {
            const parsedLayout: Widget[] = JSON.parse(savedLayout);
            return parsedLayout;
        } catch (error) {
            console.error("Error parsing saved layout:", error);
        }
    }
    return masterWidgetList.map((widget) => ({ ...widget, enabled: false }));
};

/**
 * Saves the full layout to localStorage.
 */
export const saveLayoutToStorage = (layout: Widget[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
};

/**
 * Ensures that each widget fits within the given column count.
 */
export const validateLayout = (layout: Widget[], columnCount: number = COLUMN_COUNT): Widget[] =>
    layout.map((widget) => ({
        ...widget,
        w: Math.min(widget.w, columnCount),
        x: Math.min(widget.x, columnCount - widget.w),
    }));

// --- Preset Functions ---

const PRESETS_KEY = "dashboard_presets";
const CURRENT_PRESET_TYPE_KEY = "dashboard_current_preset_type";

/**
 * Saves the current preset type to localStorage.
 */
export const saveCurrentPresetType = (type: string) => {
    localStorage.setItem(CURRENT_PRESET_TYPE_KEY, type);
};

/**
 * Reads the current preset type from localStorage.
 */
export const readCurrentPresetType = (): string => {
    return localStorage.getItem(CURRENT_PRESET_TYPE_KEY) || "grid";
};

/**
 * Reads an array of 9 preset layouts from localStorage.
 * If nothing is saved yet, returns an array with 9 null entries.
 * Now supports both old format (Widget[]) and new format (DashboardPreset).
 */
export const readPresetsFromStorage = (): Array<DashboardPreset | null> => {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) {
        try {
            const presets = JSON.parse(saved);
            if (Array.isArray(presets) && presets.length === 9) {
                // Convert old format to new format
                return presets.map(preset => {
                    if (!preset) return null;
                    // Check if it's already in the new format
                    if (preset.type && preset.layout) {
                        return preset as DashboardPreset;
                    }
                    // Convert old format (Widget[]) to new format
                    return {
                        type: "grid" as const,
                        layout: preset
                    };
                });
            }
        } catch (e) {
            console.error("Error parsing presets", e);
        }
    }
    return new Array(9).fill(null);
};

/**
 * Saves an array of 9 preset layouts into localStorage.
 */
export const savePresetsToStorage = (presets: Array<DashboardPreset | null>) => {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
};