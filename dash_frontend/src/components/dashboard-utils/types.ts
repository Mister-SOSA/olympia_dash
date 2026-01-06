/**
 * Dashboard Types and Utilities
 * Extracted from Dashboard.tsx for better organization
 */

import { Widget, DashboardPreset, PresetType } from "@/types";
import { masterWidgetList } from "@/constants/widgets";
import { isMultiInstanceWidget, getWidgetType } from "@/utils/widgetInstanceUtils";
import { getWidgetConfig } from "@/components/widgets/registry";

// =============================================================================
// Types
// =============================================================================

export interface DashboardState {
  layout: Widget[];
  tempLayout: Widget[];
  presets: Array<DashboardPreset | null>;
  presetIndex: number;
  currentPresetType: PresetType;
  activePresetIndex: number | null;
}

export interface DashboardUIState {
  menuOpen: boolean;
  settingsOpen: boolean;
  settingsView: SettingsViewType;
  presetManagerOpen: boolean;
  presetDialogOpen: boolean;
  presetDialogType: PresetDialogType;
  presetDialogIndex: number;
  isDockVisible: boolean;
  isTransitioning: boolean;
}

export type SettingsViewType = 'account' | 'widgets' | 'presets' | 'privacy' | 'dock';
export type PresetDialogType = "empty" | "save" | "overwrite";

// =============================================================================
// Constants
// =============================================================================

/**
 * Input types that should NOT block hotkeys (non-text inputs)
 */
export const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
  "time",
  "date",
  "datetime-local",
  "month",
  "week"
]);

/**
 * Table widgets that support arrow key scrolling in fullscreen mode
 */
export const TABLE_WIDGET_IDS = new Set([
  "OutstandingOrdersTable",
  "DailyDueInTable",
  "DailyDueInHiddenVendTable",
  "InventoryMovesLog",
  "TopProductUnitSales"
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Deep clone an object using JSON serialization
 */
export const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Merges a preset layout (which might define only a subset of widgets)
 * with the master widget list.
 * 
 * Handles both singleton widgets (looked up by ID in masterWidgetList) and
 * multi-instance widgets (preserved as-is from the preset).
 */
export const mergePreset = (preset: Widget[]): Widget[] => {
  // Start with singleton widgets from master list
  const singletonWidgets = masterWidgetList.map((widget) => {
    const presetItem = preset.find((p) => p.id === widget.id);
    return presetItem ? { ...widget, ...presetItem } : { ...widget, enabled: false };
  });

  // Add multi-instance widgets from preset (they're not in masterWidgetList)
  const multiInstanceWidgets = preset.filter((p) => {
    // Check if this is a multi-instance widget (has instance ID in the format "Type:instanceId")
    if (!isMultiInstanceWidget(p.id)) return false;

    // Verify the base widget type allows multiple instances
    const widgetType = getWidgetType(p.id);
    const config = getWidgetConfig(widgetType);
    return config?.allowMultiple === true;
  });

  return [...singletonWidgets, ...multiInstanceWidgets];
};

/**
 * Finds the next available preset index given a direction.
 */
export const findNextPresetIndex = (
  presets: Array<DashboardPreset | null>,
  currentIndex: number,
  direction: number
): number => {
  let newIndex = currentIndex;
  do {
    newIndex = (newIndex + direction + presets.length) % presets.length;
  } while (!presets[newIndex] && newIndex !== currentIndex);
  return newIndex;
};

/**
 * Determines if global hotkeys should be ignored based on the currently focused element.
 * Returns true if the user is typing in an input field or similar.
 */
export const shouldIgnoreGlobalHotkeys = (element: HTMLElement | null): boolean => {
  if (!element) return false;

  // Check for explicit hotkey overrides
  if (element.getAttribute("data-hotkeys-allow") === "true") {
    return false;
  }

  if (element.closest('[data-hotkeys-allow="true"]')) {
    return false;
  }

  if (element.closest('[data-hotkeys-disabled="true"]')) {
    return true;
  }

  // Content editable elements should block hotkeys
  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName?.toLowerCase();

  // Textarea and select always block hotkeys
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  // Input elements - only text-like inputs block hotkeys
  if (tagName === "input") {
    const type = (element as HTMLInputElement).type?.toLowerCase() || "text";
    return !NON_TEXT_INPUT_TYPES.has(type);
  }

  // ARIA roles that indicate text input
  const role = element.getAttribute("role")?.toLowerCase();
  if (role === "textbox" || role === "combobox" || role === "searchbox") {
    return true;
  }

  return false;
};

/**
 * Creates a temp layout for the widget menu by combining singleton and multi-instance widgets
 */
export const createTempLayout = (currentLayout: Widget[]): Widget[] => {
  // Start with singleton widgets from master list (excluding multi-instance widget types)
  const singletonWidgets = masterWidgetList
    .filter((widget) => {
      const config = getWidgetConfig(widget.id);
      return !config?.allowMultiple;
    })
    .map((widget) => {
      const existing = currentLayout.find((w) => w.id === widget.id);
      return existing || { ...widget, enabled: false };
    });

  // Add multi-instance widgets from the current layout
  const multiInstanceWidgets = currentLayout.filter((w) => {
    if (!isMultiInstanceWidget(w.id)) return false;
    const widgetType = getWidgetType(w.id);
    const config = getWidgetConfig(widgetType);
    return config?.allowMultiple === true;
  });

  return [...singletonWidgets, ...multiInstanceWidgets];
};
