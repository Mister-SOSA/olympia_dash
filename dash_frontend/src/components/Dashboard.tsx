"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import Menu from "./WidgetMenu";
import { Widget } from "@/types";
import {
    readLayoutFromStorage,
    validateLayout,
    saveLayoutToStorage,
    readPresetsFromStorage,
    savePresetsToStorage,
} from "@/utils/layoutUtils";
import { COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";

// Helper: deep-clone an object (using JSON serialization for simplicity)
const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

// Helper: Merge a preset (which may contain only some widgets) with the full master list.
// For each widget in masterWidgetList, if a matching entry exists in the preset, use its values;
// otherwise, include the widget with enabled set to false.
const mergePreset = (preset: Widget[]): Widget[] =>
    masterWidgetList.map((widget) => {
        const presetItem = preset.find((p) => p.id === widget.id);
        return presetItem ? { ...widget, ...presetItem } : { ...widget, enabled: false };
    });

// Helper: Find the next available preset index given the current index and a direction.
// Direction should be +1 (arrow right) or -1 (arrow left). If no other preset is found,
// return the current index.
const findNextPresetIndex = (
    presets: Array<Widget[] | null>,
    currentIndex: number,
    direction: number
): number => {
    let newIndex = currentIndex;
    // Try up to presets.length steps (to cover all slots).
    for (let i = 0; i < presets.length; i++) {
        newIndex = (newIndex + direction + presets.length) % presets.length;
        if (presets[newIndex] != null) {
            return newIndex;
        }
    }
    return currentIndex;
};

export default function Dashboard() {
    // Live layout state used by GridDashboard.
    const [layout, setLayout] = useState<Widget[]>([]);
    // tempLayout is used by the widget menu so that you can add/remove widgets.
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);
    // menuOpen controls whether the widget menu is visible.
    const [menuOpen, setMenuOpen] = useState(false);
    // presets holds up to 9 preset layouts.
    const [presets, setPresets] = useState<Array<Widget[] | null>>(new Array(9).fill(null));
    // presetIndex is the currently active preset (0-based).
    const [presetIndex, setPresetIndex] = useState<number>(0);

    // Ref to access GridDashboard's imperative API.
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // On mount, initialize the layout and presets.
    useEffect(() => {
        // Use the live layout from localStorage (written by GridDashboard via grid.save(false))
        const storedLayoutStr = localStorage.getItem("dashboard_layout");
        if (storedLayoutStr) {
            setLayout(JSON.parse(storedLayoutStr));
        } else {
            // Fallback: use the enabled widgets from the master list.
            setLayout(masterWidgetList.filter((w) => w.enabled));
        }

        const storedPresets = readPresetsFromStorage();
        setPresets(storedPresets);
    }, []);

    // Function to load a preset from presets state.
    const loadPreset = useCallback(
        (index: number) => {
            if (!presets[index]) return;
            // Deep clone the preset so that we have a fresh copy.
            const clonedPreset = deepClone(presets[index]!);
            // Merge with the full master list.
            const merged = mergePreset(clonedPreset);
            // Force new object references.
            setLayout([...merged]);
            setTempLayout([...merged]);
            setPresetIndex(index);
            console.log(`Loaded preset ${index + 1}`);
        },
        [presets]
    );

    // Keydown handler for toggling the menu, saving/loading presets, and compacting.
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Toggle widget menu with "F"
            if (e.key.toLowerCase() === "f") {
                setMenuOpen((prev) => !prev);
                // Instead of copying just the current layout, merge the master list with the current layout.
                setTempLayout(
                    masterWidgetList.map((widget) => {
                        const existing = layout.find((w) => w.id === widget.id);
                        return existing ? existing : { ...widget, enabled: false };
                    })
                );
            }
            // Compact grid with "X"
            else if (e.key.toLowerCase() === "x") {
                if (gridDashboardRef.current) {
                    gridDashboardRef.current.compact();
                }
            }
            // Use e.code so that Shift+Digit still gives "DigitX".
            else if (e.code.startsWith("Digit")) {
                const digit = parseInt(e.code.replace("Digit", ""), 10);
                if (digit >= 1 && digit <= 9) {
                    const index = digit - 1;
                    // If Shift is pressed, save the current live layout as a preset.
                    if (e.shiftKey) {
                        const liveLayoutStr = localStorage.getItem("dashboard_layout");
                        if (liveLayoutStr) {
                            const liveLayout = JSON.parse(liveLayoutStr);
                            const newPresets = [...presets];
                            newPresets[index] = deepClone(liveLayout);
                            setPresets(newPresets);
                            savePresetsToStorage(newPresets);
                            console.log(`Saved preset ${index + 1}`);
                        }
                    }
                    // Otherwise, load the preset (if it exists)
                    else {
                        loadPreset(index);
                    }
                }
            }
            // Cycle through presets with left/right arrow keys.
            else if (e.key === "ArrowLeft") {
                const newIndex = findNextPresetIndex(presets, presetIndex, -1);
                if (newIndex !== presetIndex) {
                    loadPreset(newIndex);
                }
            } else if (e.key === "ArrowRight") {
                const newIndex = findNextPresetIndex(presets, presetIndex, +1);
                if (newIndex !== presetIndex) {
                    loadPreset(newIndex);
                }
            }
        },
        [layout, presets, presetIndex, loadPreset]
    );

    // Register the keydown handler.
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown as EventListener);
        return () => window.removeEventListener("keydown", handleKeyDown as EventListener);
    }, [handleKeyDown]);

    // Callback for saving changes made in the widget menu.
    const handleSave = useCallback(() => {
        saveLayoutToStorage(tempLayout);
        setMenuOpen(false);
        // Update the live layout with a new array reference.
        setLayout([...tempLayout]);
    }, [tempLayout]);

    const handleCancel = useCallback(() => {
        setMenuOpen(false);
    }, []);

    return (
        <div>
            {menuOpen && (
                <Menu
                    masterWidgetList={masterWidgetList}
                    tempLayout={tempLayout}
                    setTempLayout={setTempLayout}
                    handleSave={handleSave}
                    handleCancel={handleCancel}
                />
            )}
            <GridDashboard
                ref={gridDashboardRef}
                layout={layout}
                onExternalLayoutChange={setLayout} // For updates from GridDashboard.
            />
        </div>
    );
}