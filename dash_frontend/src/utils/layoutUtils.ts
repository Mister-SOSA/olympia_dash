import { Widget, DashboardPreset } from "@/types";
import { COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";
import { preferencesService } from "@/lib/preferences";

/**
 * Generate a smart default name for a preset based on its widgets
 */
export const generatePresetName = (layout: Widget[]): string => {
    const enabledWidgets = layout.filter(w => w.enabled);
    
    if (enabledWidgets.length === 0) return "Empty Preset";
    if (enabledWidgets.length === 1) {
        return enabledWidgets[0].displayName || enabledWidgets[0].id;
    }
    
    // Try to identify common patterns
    const names = enabledWidgets.map(w => w.displayName || w.id);
    const categories = enabledWidgets
        .map(w => w.category)
        .filter((c, i, arr) => c && arr.indexOf(c) === i); // unique categories
    
    // If all widgets are from the same category, use that
    if (categories.length === 1 && categories[0]) {
        return `${categories[0]} Dashboard`;
    }
    
    // Check for common themes
    const hasSales = names.some(n => n.toLowerCase().includes('sales'));
    const hasInventory = names.some(n => n.toLowerCase().includes('inventory') || n.toLowerCase().includes('stock'));
    const hasOrders = names.some(n => n.toLowerCase().includes('order'));
    
    if (hasSales && hasInventory) return "Sales & Inventory";
    if (hasSales && hasOrders) return "Sales & Orders";
    if (hasSales) return "Sales Overview";
    if (hasInventory) return "Inventory Overview";
    if (hasOrders) return "Orders Overview";
    
    // Default to count
    return `Dashboard (${enabledWidgets.length} widgets)`;
};

/**
 * Migrate old preset format to new format with names
 */
const migratePreset = (preset: any, index: number): DashboardPreset | null => {
    if (!preset) return null;
    
    // Already in new format
    if (preset.name !== undefined || preset.createdAt !== undefined) {
        return preset as DashboardPreset;
    }
    
    // Old format - add name and timestamps
    const layout = preset.layout || preset;
    const name = generatePresetName(layout);
    
    return {
        type: preset.type || "grid",
        layout: layout,
        name: name,
        description: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

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
 * Automatically migrates old presets to include names and timestamps.
 */
export const readPresetsFromStorage = (): Array<DashboardPreset | null> => {
    const saved = preferencesService.get<Array<DashboardPreset | null>>('dashboard.presets');
    if (saved) {
        try {
            if (Array.isArray(saved) && saved.length === 9) {
                // Migrate each preset to new format
                const migrated = saved.map((preset, index) => migratePreset(preset, index));
                
                // Check if any migration happened
                const hasChanged = migrated.some((preset, index) => {
                    const original = saved[index];
                    return preset && original && !original.name && preset.name;
                });
                
                // If migration happened, save the migrated presets
                if (hasChanged) {
                    console.log("Migrating presets to include names and timestamps");
                    savePresetsToStorage(migrated);
                }
                
                return migrated;
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

/**
 * Save the currently active preset index
 */
export const saveActivePresetIndex = (index: number | null) => {
    preferencesService.set('dashboard.activePresetIndex', index);
};

/**
 * Read the currently active preset index
 */
export const readActivePresetIndex = (): number | null => {
    return preferencesService.get<number | null>('dashboard.activePresetIndex', null);
};