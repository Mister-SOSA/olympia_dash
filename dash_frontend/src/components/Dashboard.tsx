"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import Menu from "./WidgetMenu";
import { Widget } from "@/types";
import {
    readLayoutFromStorage,
    saveLayoutToStorage,
    readPresetsFromStorage,
    savePresetsToStorage
} from "@/utils/layoutUtils";
import { masterWidgetList } from "@/constants/widgets";
import { Flip, toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Utility: deep clone an object using JSON serialization
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Merge a preset (which may only define a subset of widgets) with the master widget list,
// assuming any widget not present in the preset is disabled.
const mergePreset = (preset: Widget[]): Widget[] =>
    masterWidgetList.map(widget => {
        const presetItem = preset.find(p => p.id === widget.id);
        return presetItem ? { ...widget, ...presetItem } : { ...widget, enabled: false };
    });

// Find the next available preset index given a direction (+1 for right, -1 for left)
const findNextPresetIndex = (
    presets: Array<Widget[] | null>,
    currentIndex: number,
    direction: number
): number => {
    let newIndex = currentIndex;
    for (let i = 0; i < presets.length; i++) {
        newIndex = (newIndex + direction + presets.length) % presets.length;
        if (presets[newIndex]) return newIndex;
    }
    return currentIndex;
};

// Compare two layouts deeply
const layoutsEqual = (l1: Widget[], l2: Widget[]): boolean => {
    if (l1.length !== l2.length) return false;
    return l1.every(widget1 => {
        const widget2 = l2.find(w => w.id === widget1.id);
        return widget2 &&
            widget1.x === widget2.x &&
            widget1.y === widget2.y &&
            widget1.w === widget2.w &&
            widget1.h === widget2.h &&
            widget1.enabled === widget2.enabled;
    });
};

export default function Dashboard() {
    // State variables
    const [layout, setLayout] = useState<Widget[]>([]);
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [presets, setPresets] = useState<Array<Widget[] | null>>(new Array(9).fill(null));
    const [presetIndex, setPresetIndex] = useState<number>(0);
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // On mount, initialize layout and presets
    useEffect(() => {
        const storedLayout = readLayoutFromStorage();
        if (storedLayout) {
            setLayout(storedLayout);
        } else {
            // Fallback: use disabled state for all widgets
            setLayout(masterWidgetList.map(w => ({ ...w, enabled: false })));
        }
        setPresets(readPresetsFromStorage());
    }, []);

    // Update tempLayout by merging the current layout with the master widget list
    const updateTempLayout = useCallback(() => {
        setTempLayout(
            masterWidgetList.map(widget => {
                const existing = layout.find(w => w.id === widget.id);
                return existing || { ...widget, enabled: false };
            })
        );
    }, [layout]);

    // Load a preset by index
    const loadPreset = useCallback((index: number) => {
        const preset = presets[index];
        if (!preset) {
            toast(`Dash ${index + 1} is empty`, { type: "error" });
            return;
        }
        const merged = mergePreset(deepClone(preset));
        setLayout(merged);
        setTempLayout(merged);
        setPresetIndex(index);
        toast(`Loaded Dash ${index + 1}`, { type: "info" });
    }, [presets]);

    // Handle keydown events for menu toggle, grid compaction, saving/loading presets
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        console.log(`Key pressed: ${e.key}`);
        const key = e.key.toLowerCase();
        if (key === "f") {
            setMenuOpen(prev => !prev);
            updateTempLayout();
        } else if (key === "x") {
            if (gridDashboardRef.current) {
                gridDashboardRef.current.compact();
                toast("Dash Compacted!", { type: "warning" });
            }
        } else if (e.code.startsWith("Digit")) {
            const digit = parseInt(e.code.replace("Digit", ""), 10);
            if (digit === 0) {
                window.location.reload();
            } else if (digit >= 1 && digit <= 9) {
                const index = digit - 1;
                if (e.shiftKey) {
                    const liveLayout = readLayoutFromStorage();
                    if (liveLayout) {
                        const newPresets = [...presets];
                        newPresets[index] = deepClone(liveLayout);
                        setPresets(newPresets);
                        savePresetsToStorage(newPresets);
                        toast(`Saved Layout ${index + 1}`, { type: "success" });
                    }
                } else {
                    loadPreset(index);
                }
            }
        } else if (e.key === "arrowleft") {
            const newIndex = findNextPresetIndex(presets, presetIndex, -1);
            if (newIndex !== presetIndex) loadPreset(newIndex);
        } else if (e.key === "arrowright") {
            const newIndex = findNextPresetIndex(presets, presetIndex, 1);
            if (newIndex !== presetIndex) loadPreset(newIndex);
        }
    }, [layout, presets, presetIndex, loadPreset, updateTempLayout]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Save changes from the widget menu
    const handleSave = useCallback(() => {
        saveLayoutToStorage(tempLayout);
        setMenuOpen(false);
        if (!layoutsEqual(layout, tempLayout)) {
            setLayout([...tempLayout]);
        }
    }, [tempLayout, layout]);

    const handleCancel = useCallback(() => {
        setMenuOpen(false);
    }, []);

    return (
        <div>
            <table className="grid-layout-debug w-50 text-center">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>X</th>
                        <th>Y</th>
                        <th>W</th>
                        <th>H</th>
                    </tr>
                </thead>
                <tbody>
                    {layout.filter(widget => widget.enabled).map(widget => (
                        <tr key={widget.id}>
                            <td>{widget.id}</td>
                            <td>{widget.x}</td>
                            <td>{widget.y}</td>
                            <td>{widget.w}</td>
                            <td>{widget.h}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
                onExternalLayoutChange={setLayout}
            />
            <ToastContainer
                position="bottom-center"
                autoClose={1000}
                pauseOnHover
                theme="colored"
                transition={Flip}
            />
        </div>
    );
}