"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import Menu from "./WidgetMenu";
import PresetMenu from "./PresetMenu";
import { Widget } from "@/types";
import {
    readLayoutFromStorage,
    saveLayoutToStorage,
    readPresetsFromStorage,
    savePresetsToStorage,
} from "@/utils/layoutUtils";
import { masterWidgetList } from "@/constants/widgets";
import { Flip, toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Utility: deep clone an object
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Merges a preset layout (which might define only a subset of widgets)
 * with the master widget list.
 */
const mergePreset = (preset: Widget[]): Widget[] =>
    masterWidgetList.map((widget) => {
        const presetItem = preset.find((p) => p.id === widget.id);
        return presetItem ? { ...widget, ...presetItem } : { ...widget, enabled: false };
    });

/**
 * Finds the next available preset index given a direction.
 */
const findNextPresetIndex = (
    presets: Array<Widget[] | null>,
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
 * Deep comparison of two layouts.
 */
const layoutsEqual = (l1: Widget[], l2: Widget[]): boolean => {
    if (l1.length !== l2.length) return false;
    return l1.every((widget1) => {
        const widget2 = l2.find((w) => w.id === widget1.id);
        return (
            widget2 &&
            widget1.x === widget2.x &&
            widget1.y === widget2.y &&
            widget1.w === widget2.w &&
            widget1.h === widget2.h &&
            widget1.enabled === widget2.enabled
        );
    });
};

export default function Dashboard() {
    const [layout, setLayout] = useState<Widget[]>([]);
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [presets, setPresets] = useState<Array<Widget[] | null>>(new Array(9).fill(null));
    const [presetIndex, setPresetIndex] = useState<number>(0);
    const [presetsOpen, setPresetsOpen] = useState<boolean>(false);
    const [transitionPhase, setTransitionPhase] = useState<"none" | "fadeIn" | "fadeOut">("none");
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // Initialize layout and presets on mount
    useEffect(() => {
        const storedLayout = readLayoutFromStorage();
        if (storedLayout) {
            setLayout(storedLayout);
        } else {
            setLayout(masterWidgetList.map((w) => ({ ...w, enabled: false })));
        }
        setPresets(readPresetsFromStorage());
    }, []);

    // Prepare a temporary layout for the widget menu
    const updateTempLayout = useCallback(() => {
        setTempLayout(
            masterWidgetList.map((widget) => {
                const existing = layout.find((w) => w.id === widget.id);
                return existing || { ...widget, enabled: false };
            })
        );
    }, [layout]);

    // Load a preset with fade transition
    const loadPreset = useCallback(
        (index: number) => {
            toast(`Loaded Dash ${index + 1}`, { type: "info", delay: 0 });
            setTransitionPhase("fadeIn");
            setTimeout(() => {
                const preset = presets[index];
                if (!preset) {
                    toast(`Dash ${index + 1} is empty`, { type: "error", delay: 0 });
                    setTransitionPhase("none");
                    return;
                }
                const merged = mergePreset(deepClone(preset));
                setLayout(merged);
                setTempLayout(merged);
                setPresetIndex(index);
                setTransitionPhase("fadeOut");
                setTimeout(() => setTransitionPhase("none"), 300);
            }, 300);
        },
        [presets]
    );

    // Global keybindings: F = menu, X = compact, P = toggle presets, 1–9 / Shift+1–9
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "f") {
                setMenuOpen((prev) => !prev);
                updateTempLayout();
            } else if (key === "x") {
                if (gridDashboardRef.current) {
                    gridDashboardRef.current.compact();
                    toast("Dash Compacted!", { type: "warning" });
                }
            } else if (key === "p") {
                setPresetsOpen((prev) => !prev);
            } else if (
                (!e.shiftKey && key >= "0" && key <= "9") ||
                (e.shiftKey && e.code.startsWith("Digit"))
            ) {
                let digit: number;
                if (e.shiftKey) {
                    digit = parseInt(e.code.replace("Digit", ""), 10);
                } else {
                    digit = parseInt(key, 10);
                }
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
                            toast(`Saved Layout ${index + 1}`, { type: "success", delay: 0 });
                        }
                    } else {
                        loadPreset(index);
                    }
                }
            } else if (key === "arrowleft") {
                const newIndex = findNextPresetIndex(presets, presetIndex, -1);
                if (newIndex !== presetIndex) loadPreset(newIndex);
            } else if (key === "arrowright") {
                const newIndex = findNextPresetIndex(presets, presetIndex, 1);
                if (newIndex !== presetIndex) loadPreset(newIndex);
            }
        },
        [layout, presets, presetIndex, loadPreset, updateTempLayout]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Save/cancel from widget menu
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
            {menuOpen && (
                <Menu
                    masterWidgetList={masterWidgetList}
                    tempLayout={tempLayout}
                    setTempLayout={setTempLayout}
                    handleSave={handleSave}
                    handleCancel={handleCancel}
                />
            )}

            {!menuOpen && (
                <button
                    onClick={() => {
                        setMenuOpen(true);
                        updateTempLayout();
                    }}
                    className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 md:hidden"
                    aria-label="Open Widget Menu"
                >
                    ⚙️
                </button>
            )}

            <PresetMenu
                presets={presets}
                loadPreset={loadPreset}
                presetsOpen={presetsOpen}
                setPresetsOpen={setPresetsOpen}
            />

            <GridDashboard
                ref={gridDashboardRef}
                layout={layout.filter((widget) => widget.enabled)}
                onExternalLayoutChange={setLayout}
            />

            {transitionPhase !== "none" && (
                <motion.div
                    initial={{ opacity: transitionPhase === "fadeIn" ? 0 : 1 }}
                    animate={{ opacity: transitionPhase === "fadeIn" ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "black",
                        zIndex: 9999,
                    }}
                />
            )}

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