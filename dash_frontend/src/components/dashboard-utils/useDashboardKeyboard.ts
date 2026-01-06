"use client";

import { useEffect, useCallback, useRef, MutableRefObject } from "react";
import { Widget, DashboardPreset, PresetType } from "@/types";
import { preferencesService } from "@/lib/preferences";
import { toast } from "sonner";
import {
  readLayoutFromStorage,
  savePresetsToStorage,
  saveActivePresetIndex,
  normalizeLayout,
  generatePresetName,
} from "@/utils/layoutUtils";
import { GridDashboardHandle } from "@/components/GridDashboard";
import { shouldIgnoreGlobalHotkeys, findNextPresetIndex, deepClone } from "./types";

interface UseDashboardKeyboardOptions {
  /** Reference to GridDashboard for compact action */
  gridDashboardRef: MutableRefObject<GridDashboardHandle | null>;
  /** Reference to presets (to avoid stale closures) */
  presetsRef: MutableRefObject<Array<DashboardPreset | null>>;
  /** Reference to preset index (to avoid stale closures) */
  presetIndexRef: MutableRefObject<number>;
  /** Whether menu is open */
  menuOpen: boolean;
  /** Whether settings is open */
  settingsOpen: boolean;
  /** Whether preset manager is open */
  presetManagerOpen: boolean;
  /** Whether preset dialog is open */
  presetDialogOpen: boolean;
  /** Toggle menu */
  onToggleMenu: () => void;
  /** Toggle preset manager */
  onTogglePresetManager: () => void;
  /** Toggle settings */
  onToggleSettings: () => void;
  /** Load preset callback */
  onLoadPreset: (index: number) => void;
  /** Save preset callback */
  onSavePreset: (index: number, layout: Widget[]) => void;
  /** Update temp layout for menu */
  onUpdateTempLayout: () => void;
  /** Toggle privacy mode */
  onTogglePrivacy: () => void;
  /** Current privacy state */
  isPrivate: boolean;
}

/**
 * Hook to manage dashboard keyboard shortcuts
 * 
 * Keyboard shortcuts:
 * - F: Toggle widget menu
 * - P: Toggle preset manager
 * - S: Toggle settings
 * - X: Compact dashboard
 * - \: Toggle privacy mode
 * - 1-9: Load preset
 * - Shift+1-9: Save current layout to preset
 * - 0: Reload page
 * - Arrow Left/Right: Navigate presets
 */
export function useDashboardKeyboard({
  gridDashboardRef,
  presetsRef,
  presetIndexRef,
  menuOpen,
  settingsOpen,
  presetManagerOpen,
  presetDialogOpen,
  onToggleMenu,
  onTogglePresetManager,
  onToggleSettings,
  onLoadPreset,
  onSavePreset,
  onUpdateTempLayout,
  onTogglePrivacy,
  isPrivate,
}: UseDashboardKeyboardOptions): void {
  // Use refs for values that change frequently to avoid event listener re-registration
  const menuOpenRef = useRef(menuOpen);
  const settingsOpenRef = useRef(settingsOpen);
  const presetManagerOpenRef = useRef(presetManagerOpen);
  const presetDialogOpenRef = useRef(presetDialogOpen);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
    settingsOpenRef.current = settingsOpen;
    presetManagerOpenRef.current = presetManagerOpen;
    presetDialogOpenRef.current = presetDialogOpen;
  }, [menuOpen, settingsOpen, presetManagerOpen, presetDialogOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check if hotkeys are enabled
      const hotkeysEnabled = preferencesService.get('keyboard.enableHotkeys', true);
      if (!hotkeysEnabled) {
        return;
      }

      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const targetElement = (e.target as HTMLElement) ?? null;
      const activeElement = (document.activeElement as HTMLElement) ?? null;
      const elementToCheck = targetElement ?? activeElement;

      if (shouldIgnoreGlobalHotkeys(elementToCheck)) {
        return;
      }

      const key = e.key.toLowerCase();
      const otherModalOpen = settingsOpenRef.current || presetManagerOpenRef.current || presetDialogOpenRef.current;
      const anyModalOpen = otherModalOpen || menuOpenRef.current;

      // F: Toggle widget menu
      if (key === "f") {
        if (otherModalOpen) {
          return;
        }
        e.preventDefault();
        if (!menuOpenRef.current) {
          onUpdateTempLayout();
        }
        onToggleMenu();
        return;
      }

      // P: Toggle preset manager
      if (key === "p") {
        if (menuOpenRef.current || settingsOpenRef.current || presetDialogOpenRef.current) {
          return;
        }
        e.preventDefault();
        onTogglePresetManager();
        return;
      }

      // S: Toggle settings
      if (key === "s") {
        if (menuOpenRef.current || presetManagerOpenRef.current || presetDialogOpenRef.current) {
          return;
        }
        e.preventDefault();
        onToggleSettings();
        return;
      }

      // X: Compact dashboard
      if (key === "x") {
        if (anyModalOpen) {
          return;
        }
        if (gridDashboardRef.current) {
          gridDashboardRef.current.compact();
          toast.success("Dashboard Compacted");
        }
        return;
      }

      // \: Privacy mode toggle
      if (key === "\\" || key === "\\\\") {
        e.preventDefault();
        onTogglePrivacy();
        toast.info(isPrivate ? "Privacy Mode Off" : "Privacy Mode On");
        return;
      }

      // Number keys: Load/save presets
      if (
        (!e.shiftKey && key >= "0" && key <= "9") ||
        (e.shiftKey && e.code.startsWith("Digit"))
      ) {
        if (anyModalOpen) {
          return;
        }
        let digit: number;
        if (e.shiftKey) {
          digit = parseInt(e.code.replace("Digit", ""), 10);
        } else {
          digit = parseInt(key, 10);
        }
        
        // 0: Reload page
        if (digit === 0) {
          window.location.reload();
        } else if (digit >= 1 && digit <= 9) {
          const index = digit - 1;
          
          // Shift+number: Save to preset
          if (e.shiftKey) {
            const liveLayout = readLayoutFromStorage();
            if (liveLayout) {
              onSavePreset(index, liveLayout);
            }
          } else {
            // Just number: Load preset
            onLoadPreset(index);
          }
        }
        return;
      }

      // Arrow keys: Navigate presets
      if (key === "arrowleft") {
        if (anyModalOpen) {
          return;
        }
        const newIndex = findNextPresetIndex(presetsRef.current, presetIndexRef.current, -1);
        if (newIndex !== presetIndexRef.current) onLoadPreset(newIndex);
        return;
      }

      if (key === "arrowright") {
        if (anyModalOpen) {
          return;
        }
        const newIndex = findNextPresetIndex(presetsRef.current, presetIndexRef.current, 1);
        if (newIndex !== presetIndexRef.current) onLoadPreset(newIndex);
      }
    },
    [
      gridDashboardRef,
      presetsRef,
      presetIndexRef,
      onToggleMenu,
      onTogglePresetManager,
      onToggleSettings,
      onLoadPreset,
      onSavePreset,
      onUpdateTempLayout,
      onTogglePrivacy,
      isPrivate,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default useDashboardKeyboard;
