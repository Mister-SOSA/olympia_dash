"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import ImprovedWidgetMenu from "./ImprovedWidgetMenu";
import PresetMenu from "./PresetMenu";
import SettingsMenu from "./SettingsMenu";
import { Widget, DashboardPreset, PresetType } from "@/types";
import {
    readLayoutFromStorage,
    saveLayoutToStorage,
    readPresetsFromStorage,
    savePresetsToStorage,
    saveCurrentPresetType,
    readCurrentPresetType,
} from "@/utils/layoutUtils";
import { masterWidgetList, getWidgetById } from "@/constants/widgets";
import { Flip, toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { authService } from "@/lib/auth";
import { Loader } from "./ui/loader";
import { Button } from "./ui/button";

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
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [user, setUser] = useState(authService.getUser());
    const [layout, setLayout] = useState<Widget[]>([]);
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [presets, setPresets] = useState<Array<DashboardPreset | null>>(new Array(9).fill(null));
    const [presetIndex, setPresetIndex] = useState<number>(0);
    const [currentPresetType, setCurrentPresetType] = useState<PresetType>("grid");
    const [presetsOpen, setPresetsOpen] = useState<boolean>(false);
    const [transitionPhase, setTransitionPhase] = useState<"none" | "fadeIn" | "fadeOut">("none");
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (!authService.isAuthenticated()) {
                router.push('/login');
                return;
            }
            
            // Verify token is still valid
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                router.push('/login');
                return;
            }
            
            setUser(currentUser);
            setIsAuthenticated(true);
            setCheckingAuth(false);
        };
        
        checkAuth();
    }, [router]);

    // Initialize layout and presets on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        
        const storedLayout = readLayoutFromStorage();
        if (storedLayout) {
            setLayout(storedLayout);
        } else {
            setLayout(masterWidgetList.map((w) => ({ ...w, enabled: false })));
        }
        setPresets(readPresetsFromStorage());

        // Restore the last used preset type
        const storedPresetType = readCurrentPresetType();
        setCurrentPresetType(storedPresetType as PresetType);
    }, [isAuthenticated]);

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

                const merged = mergePreset(deepClone(preset.layout));
                setLayout(merged);
                setTempLayout(merged);
                setPresetIndex(index);
                setCurrentPresetType(preset.type);

                // Save the preset type so it persists across page reloads
                saveCurrentPresetType(preset.type);

                setTransitionPhase("fadeOut");
                setTimeout(() => setTransitionPhase("none"), 300);
            }, 300);
        },
        [presets]
    );    // Global keybindings: F = menu, X = compact, P = toggle presets, 1–9 / Shift+1–9
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "f") {
                setMenuOpen((prev) => !prev);
                updateTempLayout();
            } else if (key === "s") {
                setSettingsOpen((prev) => !prev);
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
                            // Save as grid preset by default when using keyboard shortcut
                            newPresets[index] = {
                                type: "grid",
                                layout: deepClone(liveLayout)
                            };
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
            // When manually editing widgets, switch to grid mode
            setCurrentPresetType("grid");
            saveCurrentPresetType("grid");
        }
    }, [tempLayout, layout]);

    const handleCancel = useCallback(() => {
        setMenuOpen(false);
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        router.push('/login');
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="dashboard-container">
            <AnimatePresence>
                {menuOpen && (
                    <ImprovedWidgetMenu
                        tempLayout={tempLayout}
                        setTempLayout={setTempLayout}
                        handleSave={handleSave}
                        handleCancel={handleCancel}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {settingsOpen && (
                    <SettingsMenu
                        user={user}
                        onLogout={handleLogout}
                        onClose={() => setSettingsOpen(false)}
                        onAdminClick={user?.role === 'admin' ? () => router.push('/admin') : undefined}
                    />
                )}
            </AnimatePresence>

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
                currentLayout={layout}
                onSavePreset={(index, layoutToSave, presetType) => {
                    const newPresets = [...presets];
                    newPresets[index] = {
                        type: presetType,
                        layout: deepClone(layoutToSave)
                    };
                    setPresets(newPresets);
                    savePresetsToStorage(newPresets);
                    toast(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Layout ${index + 1}`, { type: "success", delay: 0 });
                }}
                onClearPreset={(index) => {
                    const newPresets = [...presets];
                    newPresets[index] = null;
                    setPresets(newPresets);
                    savePresetsToStorage(newPresets);
                    toast(`Cleared Preset ${index + 1}`, { type: "warning", delay: 0 });
                }}
            />

            <GridDashboard
                ref={gridDashboardRef}
                layout={layout.filter((widget) => widget.enabled)}
                onExternalLayoutChange={setLayout}
            />

            {/* Fullscreen Widget Overlay */}
            {currentPresetType === "fullscreen" && layout.filter(w => w.enabled).length === 1 && (
                <div className="fixed inset-0 z-40 bg-gray-950">
                    {(() => {
                        const enabledWidget = layout.find(w => w.enabled);
                        if (!enabledWidget) return null;

                        const widgetDef = getWidgetById(enabledWidget.id);
                        if (!widgetDef) return null;

                        const WidgetComponent = widgetDef.component;

                        return (
                            <div className="w-full h-full overflow-auto">
                                <WidgetComponent />
                            </div>
                        );
                    })()}
                </div>
            )}

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