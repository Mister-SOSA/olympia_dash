"use client";

import { useState, useCallback } from "react";
import { Widget, DashboardPreset, PresetType } from "@/types";
import { preferencesService } from "@/lib/preferences";
import {
  saveLayoutToStorage,
  savePresetsToStorage,
  saveCurrentPresetType,
  saveActivePresetIndex,
  normalizeLayout,
  mergeLayoutWithActive,
  areLayoutsEqual,
  detectStructuralChanges,
  generatePresetName,
  type LayoutUpdateSource,
} from "@/utils/layoutUtils";
import { createTempLayout, deepClone } from "./types";

interface UseDashboardLayoutOptions {
  /** Active preset index */
  activePresetIndex: number | null;
  /** Presets array */
  presets: Array<DashboardPreset | null>;
  /** Set presets state */
  setPresets: React.Dispatch<React.SetStateAction<Array<DashboardPreset | null>>>;
  /** Set preset type state */
  setCurrentPresetType: React.Dispatch<React.SetStateAction<PresetType>>;
  /** Set active preset index state */
  setActivePresetIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

interface UseDashboardLayoutReturn {
  /** Current layout state */
  layout: Widget[];
  /** Set layout state */
  setLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
  /** Temporary layout for widget menu */
  tempLayout: Widget[];
  /** Set temporary layout */
  setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
  /** Update temp layout from current layout (for opening menu) */
  updateTempLayout: () => void;
  /** Handle layout changes from grid interactions */
  handleExternalLayoutChange: (activeLayout: Widget[], source?: LayoutUpdateSource) => void;
  /** Handle save from widget menu */
  handleMenuSave: () => void;
  /** Handle cancel from widget menu */
  handleMenuCancel: () => void;
}

/**
 * Hook to manage dashboard layout state
 * 
 * Handles:
 * - Main layout state
 * - Temp layout for widget menu
 * - External layout changes from grid interactions
 * - Menu save/cancel operations
 */
export function useDashboardLayout({
  activePresetIndex,
  presets,
  setPresets,
  setCurrentPresetType,
  setActivePresetIndex,
}: UseDashboardLayoutOptions): UseDashboardLayoutReturn {
  const [layout, setLayout] = useState<Widget[]>([]);
  const [tempLayout, setTempLayout] = useState<Widget[]>([]);

  // Prepare a temporary layout for the widget menu
  const updateTempLayout = useCallback(() => {
    setTempLayout(createTempLayout(layout));
  }, [layout]);

  // Handle layout changes from grid interactions
  const handleExternalLayoutChange = useCallback((
    activeLayout: Widget[], 
    source: LayoutUpdateSource = 'local-interaction'
  ) => {
    const mergedLayout = mergeLayoutWithActive(layout, activeLayout);
    const normalizedLayout = normalizeLayout(mergedLayout);

    // Check if layout actually changed before saving
    if (areLayoutsEqual(layout, normalizedLayout)) {
      return;
    }

    // Update state first
    setLayout(normalizedLayout);

    // Save layout with source tag - this controls notifyLocal behavior
    saveLayoutToStorage(normalizedLayout, { source });

    // Update active preset if one is selected
    if (activePresetIndex !== null) {
      setPresets((prevPresets) => {
        const currentPreset = prevPresets[activePresetIndex];
        if (!currentPreset || areLayoutsEqual(currentPreset.layout, normalizedLayout)) {
          return prevPresets;
        }

        const updatedPresets = [...prevPresets];
        updatedPresets[activePresetIndex] = {
          ...currentPreset,
          layout: deepClone(normalizedLayout),
          updatedAt: new Date().toISOString()
        };

        // Use setMany to batch this with other preference changes
        preferencesService.set('dashboard.presets', updatedPresets, {
          debounce: true,
          notifyLocal: false // Already updating our own state
        });

        return updatedPresets;
      });
    }
  }, [layout, activePresetIndex, setPresets]);

  // Save/cancel from widget menu
  const handleMenuSave = useCallback(() => {
    const normalizedLayout = normalizeLayout(tempLayout);

    // Check what changed to determine the source
    const structuralChanges = detectStructuralChanges(layout, normalizedLayout);
    const source: LayoutUpdateSource = structuralChanges.widgetsAdded
      ? 'widget-add'
      : structuralChanges.widgetsRemoved
        ? 'widget-remove'
        : 'local-interaction';

    // Save with appropriate source tag
    saveLayoutToStorage(normalizedLayout, { source });

    if (!areLayoutsEqual(layout, normalizedLayout)) {
      setLayout(normalizedLayout);

      if (activePresetIndex !== null && presets[activePresetIndex]) {
        const now = new Date().toISOString();
        const updatedPresets = [...presets];
        const existingPreset = updatedPresets[activePresetIndex];

        updatedPresets[activePresetIndex] = {
          ...existingPreset!,
          layout: deepClone(normalizedLayout),
          type: existingPreset?.type || "grid",
          name: existingPreset?.name || generatePresetName(normalizedLayout),
          updatedAt: now
        };

        setPresets(updatedPresets);
        savePresetsToStorage(updatedPresets);
        const presetType = updatedPresets[activePresetIndex]!.type;
        setCurrentPresetType(presetType);
        saveCurrentPresetType(presetType);
        saveActivePresetIndex(activePresetIndex);
      } else {
        // Manual layout edits without an active preset fall back to grid mode
        setCurrentPresetType("grid");
        saveCurrentPresetType("grid");
        setActivePresetIndex(null);
        saveActivePresetIndex(null);
      }
    }
  }, [tempLayout, layout, activePresetIndex, presets, setPresets, setCurrentPresetType, setActivePresetIndex]);

  const handleMenuCancel = useCallback(() => {
    // Just close menu, don't update layout
    // The caller should handle closing the menu
  }, []);

  return {
    layout,
    setLayout,
    tempLayout,
    setTempLayout,
    updateTempLayout,
    handleExternalLayoutChange,
    handleMenuSave,
    handleMenuCancel,
  };
}

export default useDashboardLayout;
