import { Widget } from "@/types";
import { LOCAL_STORAGE_KEY, COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";

/** 
 * Reads the current layout from localStorage and merges it with the master widget list.
 * For any widget not found in the saved layout, it is assumed to be disabled.
 */
export const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
        const parsedLayout: Widget[] = JSON.parse(savedLayout);
        return masterWidgetList.map((widget) => {
            const saved = parsedLayout.find((s) => s.id === widget.id);
            return saved ? { ...widget, ...saved } : { ...widget, enabled: false };
        });
    }
    return masterWidgetList.map(widget => ({ ...widget, enabled: false }));
};

/** Saves only enabled widgets from the layout into localStorage */
export const saveLayoutToStorage = (layout: Widget[]) => {
    const enabledLayout = layout.filter(widget => widget.enabled);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(enabledLayout));
};

/** Ensures that each widget fits within the given column count */
export const validateLayout = (layout: Widget[], columnCount: number = COLUMN_COUNT): Widget[] =>
    layout.map((widget) => ({
        ...widget,
        w: Math.min(widget.w, columnCount),
        x: Math.min(widget.x, columnCount - widget.w),
    }));

// --- Preset Functions ---

const PRESETS_KEY = "dashboard_presets";

/**
 * Reads an array of 9 preset layouts from localStorage.
 * If nothing is saved yet, returns an array with 9 null entries.
 */
export const readPresetsFromStorage = (): Array<Widget[] | null> => {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) {
        try {
            const presets = JSON.parse(saved);
            if (Array.isArray(presets) && presets.length === 9) {
                return presets;
            }
        } catch (e) {
            console.error("Error parsing presets", e);
        }
    }
    return new Array(9).fill(null);
};

/** Saves an array of 9 preset layouts into localStorage, each preset only storing enabled widgets */
export const savePresetsToStorage = (presets: Array<Widget[] | null>) => {
    const filteredPresets = presets.map(preset => {
        if (preset) {
            return preset.filter(widget => widget.enabled);
        }
        return preset;
    });
    localStorage.setItem(PRESETS_KEY, JSON.stringify(filteredPresets));
};