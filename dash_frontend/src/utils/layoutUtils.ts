import { Widget, DashboardPreset } from "@/types";
import { COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";
import { preferencesService } from "@/lib/preferences";

/**
 * Reads the saved layout from preferences service.
 * Falls back to the master widget list with all widgets disabled.
 */
export const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = preferencesService.get<Widget[]>('dashboard.layout');
    if (savedLayout) {
        try {
            return savedLayout;
        } catch (error) {
            console.error("Error parsing saved layout:", error);
        }
    }
    return masterWidgetList.map((widget) => ({ ...widget, enabled: false }));
};

/**
 * Saves the full layout to preferences service.
 */
export const saveLayoutToStorage = (layout: Widget[]) => {
    preferencesService.set('dashboard.layout', layout);
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

/**
 * Saves the current preset type to preferences service.
 */
export const saveCurrentPresetType = (type: string) => {
    preferencesService.set('dashboard.currentPresetType', type);
};

/**
 * Reads the current preset type from preferences service.
 */
export const readCurrentPresetType = (): string => {
    return preferencesService.get<string>('dashboard.currentPresetType', 'grid');
};

/**
 * Reads an array of 9 preset layouts from preferences service.
 * If nothing is saved yet, returns an array with 9 null entries.
 * Now supports both old format (Widget[]) and new format (DashboardPreset).
 */
export const readPresetsFromStorage = (): Array<DashboardPreset | null> => {
    const saved = preferencesService.get<Array<DashboardPreset | null>>('dashboard.presets');
    if (saved) {
        try {
            if (Array.isArray(saved) && saved.length === 9) {
                // Convert old format to new format if needed
                return saved.map(preset => {
                    if (!preset) return null;
                    // Check if it's already in the new format
                    if (preset.type && preset.layout) {
                        return preset as DashboardPreset;
                    }
                    // Convert old format (Widget[]) to new format
                    return {
                        type: "grid" as const,
                        layout: preset as any
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
 * Saves an array of 9 preset layouts into preferences service.
 */
export const savePresetsToStorage = (presets: Array<DashboardPreset | null>) => {
    preferencesService.set('dashboard.presets', presets);
};