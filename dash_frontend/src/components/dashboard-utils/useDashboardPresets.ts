"use client";

import { useState, useCallback, useRef, useEffect, MutableRefObject } from "react";
import { Widget, DashboardPreset, PresetType } from "@/types";
import { toast } from "sonner";
import { masterWidgetList } from "@/constants/widgets";
import { preferencesService } from "@/lib/preferences";
import {
  saveLayoutToStorage,
  savePresetsToStorage,
  saveCurrentPresetType,
  saveActivePresetIndex,
  normalizeLayout,
  generatePresetName,
} from "@/utils/layoutUtils";
import { deepClone, mergePreset } from "./types";

interface UseDashboardPresetsOptions {
  /** Current layout */
  layout: Widget[];
  /** Update layout state */
  setLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
  /** Update temp layout for widget menu */
  setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
  /** Callback when transitioning state changes */
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseDashboardPresetsReturn {
  /** Array of presets (9 slots, null if empty) */
  presets: Array<DashboardPreset | null>;
  /** Set presets state */
  setPresets: React.Dispatch<React.SetStateAction<Array<DashboardPreset | null>>>;
  /** Current preset index */
  presetIndex: number;
  /** Set preset index */
  setPresetIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Currently active preset index (null if no preset active) */
  activePresetIndex: number | null;
  /** Set active preset index */
  setActivePresetIndex: React.Dispatch<React.SetStateAction<number | null>>;
  /** Current preset type (grid or fullscreen) */
  currentPresetType: PresetType;
  /** Set current preset type */
  setCurrentPresetType: React.Dispatch<React.SetStateAction<PresetType>>;
  /** Ref to presets for keyboard shortcuts */
  presetsRef: MutableRefObject<Array<DashboardPreset | null>>;
  /** Ref to preset index for keyboard shortcuts */
  presetIndexRef: MutableRefObject<number>;
  /** Ref to loadPreset function for auto-cycle */
  loadPresetRef: MutableRefObject<((index: number) => void) | null>;
  /** Load a preset by index */
  loadPreset: (index: number) => void;
  /** Handle preset click (load or show empty dialog) */
  handlePresetClick: (index: number) => { action: 'load' | 'empty'; index: number };
  /** Handle preset save (right-click) */
  handlePresetSave: (index: number) => { action: 'save' | 'overwrite'; index: number };
  /** Create a blank preset */
  handleCreateBlank: (index: number) => void;
  /** Save current layout to preset */
  handleSaveToPreset: (index: number, layoutToSave: Widget[], presetType: PresetType) => void;
  /** Quick save preset from keyboard shortcut */
  quickSavePreset: (index: number, layoutToSave: Widget[]) => void;
}

/**
 * Hook to manage dashboard presets
 * 
 * Handles:
 * - Preset state (presets array, active index, type)
 * - Load/save/create/clear operations
 * - Smooth transitions when switching presets
 */
export function useDashboardPresets({
  layout,
  setLayout,
  setTempLayout,
  setIsTransitioning,
}: UseDashboardPresetsOptions): UseDashboardPresetsReturn {
  const [presets, setPresets] = useState<Array<DashboardPreset | null>>(new Array(9).fill(null));
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [currentPresetType, setCurrentPresetType] = useState<PresetType>("grid");
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);

  // Refs for keyboard shortcuts (to avoid stale closures)
  const presetsRef = useRef(presets);
  const presetIndexRef = useRef(presetIndex);
  const loadPresetRef = useRef<((index: number) => void) | null>(null);

  // Keep refs in sync
  useEffect(() => {
    presetsRef.current = presets;
    presetIndexRef.current = presetIndex;
  }, [presets, presetIndex]);

  // Load a preset with smooth fade transition
  const loadPreset = useCallback(
    (index: number) => {
      const preset = presets[index];

      // Check if preset exists and has widgets before doing anything
      if (!preset || preset.layout.filter(w => w.enabled).length === 0) {
        toast.error(`Preset ${index + 1} is empty`);
        return;
      }

      toast.info(`Loaded Preset ${index + 1}`);

      // Start fade out
      setIsTransitioning(true);

      // Wait for fade out, then switch layout, then fade in
      setTimeout(() => {
        const merged = normalizeLayout(mergePreset(deepClone(preset.layout)));

        setLayout(merged);
        setTempLayout(merged);
        setPresetIndex(index);
        setCurrentPresetType(preset.type);
        setActivePresetIndex(index);
        // Tag as preset-load for remote sessions
        saveLayoutToStorage(merged, { source: 'preset-load' });
        saveCurrentPresetType(preset.type);
        saveActivePresetIndex(index);

        // End transition to fade back in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50); // Small delay to ensure layout has updated
      }, 200); // Fade out duration
    },
    [presets, setLayout, setTempLayout, setIsTransitioning]
  );

  // Update loadPresetRef for auto-cycle hook
  useEffect(() => {
    loadPresetRef.current = loadPreset;
  }, [loadPreset]);

  // Handle preset click with intelligent dialog
  const handlePresetClick = useCallback((index: number): { action: 'load' | 'empty'; index: number } => {
    const preset = presets[index];
    const isPresetEmpty = !preset || preset.layout.filter(w => w.enabled).length === 0;

    if (isPresetEmpty) {
      return { action: 'empty', index };
    } else {
      loadPreset(index);
      return { action: 'load', index };
    }
  }, [presets, loadPreset]);

  // Handle preset save (right-click)
  const handlePresetSave = useCallback((index: number): { action: 'save' | 'overwrite'; index: number } => {
    const preset = presets[index];
    const isPresetEmpty = !preset || preset.layout.filter(w => w.enabled).length === 0;

    return {
      action: isPresetEmpty ? 'save' : 'overwrite',
      index
    };
  }, [presets]);

  // Create a blank preset
  const handleCreateBlank = useCallback((index: number) => {
    const now = new Date().toISOString();
    const newPresets = [...presets];

    const blankLayout = normalizeLayout(masterWidgetList.map((w) => ({ ...w, enabled: false })));

    newPresets[index] = {
      type: "grid",
      layout: deepClone(blankLayout),
      name: `Preset ${index + 1}`,
      description: "",
      createdAt: now,
      updatedAt: now
    };

    setPresets(newPresets);
    savePresetsToStorage(newPresets);
    setActivePresetIndex(index);
    setPresetIndex(index);
    saveActivePresetIndex(index);
    setLayout(blankLayout);
    saveLayoutToStorage(blankLayout, { source: 'preset-load' });
    setCurrentPresetType("grid");
    saveCurrentPresetType("grid");
    toast.success(`Created blank Preset ${index + 1}`);
  }, [presets, setLayout]);

  // Save current layout to preset
  const handleSaveToPreset = useCallback((index: number, layoutToSave: Widget[], presetType: PresetType) => {
    const normalizedLayout = normalizeLayout(layoutToSave);

    const newPresets = [...presets];
    const existingPreset = newPresets[index];
    const now = new Date().toISOString();

    newPresets[index] = {
      type: presetType,
      layout: deepClone(normalizedLayout),
      name: existingPreset?.name || generatePresetName(normalizedLayout),
      description: existingPreset?.description || "",
      createdAt: existingPreset?.createdAt || now,
      updatedAt: now
    };

    setPresets(newPresets);
    savePresetsToStorage(newPresets);
    setActivePresetIndex(index);
    setPresetIndex(index);
    saveActivePresetIndex(index);
    setLayout(normalizedLayout);
    saveLayoutToStorage(normalizedLayout, { source: 'preset-load' });
    toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
  }, [presets, setLayout]);

  // Quick save preset from keyboard shortcut (Shift+1-9)
  const quickSavePreset = useCallback((index: number, layoutToSave: Widget[]) => {
    const newPresets = [...presetsRef.current];
    const existingPreset = newPresets[index];
    const now = new Date().toISOString();

    newPresets[index] = {
      type: "grid",
      layout: deepClone(layoutToSave),
      name: existingPreset?.name || generatePresetName(layoutToSave),
      description: existingPreset?.description || "",
      createdAt: existingPreset?.createdAt || now,
      updatedAt: now
    };

    setPresets(newPresets);
    savePresetsToStorage(newPresets);
    setActivePresetIndex(index);
    setPresetIndex(index);
    saveActivePresetIndex(index);
    toast.success(`Saved Preset ${index + 1}`);
  }, []);

  return {
    presets,
    setPresets,
    presetIndex,
    setPresetIndex,
    activePresetIndex,
    setActivePresetIndex,
    currentPresetType,
    setCurrentPresetType,
    presetsRef,
    presetIndexRef,
    loadPresetRef,
    loadPreset,
    handlePresetClick,
    handlePresetSave,
    handleCreateBlank,
    handleSaveToPreset,
    quickSavePreset,
  };
}

export default useDashboardPresets;
