"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import DashboardDock from "./DashboardDock";
import ImprovedWidgetMenu from "./ImprovedWidgetMenu";
import PresetMenu from "./PresetMenu";
import PresetManagerMenu from "./PresetManagerMenu";
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
import { toast } from "sonner";
import { authService } from "@/lib/auth";
import { preferencesService, migrateFromLocalStorage } from "@/lib/preferences";
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
    const [presetManagerOpen, setPresetManagerOpen] = useState(false);
    const [presetSaveOpen, setPresetSaveOpen] = useState(false);
    const [presetSaveIndex, setPresetSaveIndex] = useState<number>(0);
    const [presets, setPresets] = useState<Array<DashboardPreset | null>>(new Array(9).fill(null));
    const [presetIndex, setPresetIndex] = useState<number>(0);
    const [currentPresetType, setCurrentPresetType] = useState<PresetType>("grid");
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

    // Sync preferences from server and migrate old localStorage data
    useEffect(() => {
        if (!isAuthenticated) return;

        const initPreferences = async () => {
            // Migrate old localStorage preferences to new system
            migrateFromLocalStorage();

            // Sync preferences from server
            await preferencesService.syncOnLogin();

            // Load preferences into state
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
        };

        initPreferences();
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
            const preset = presets[index];

            // Check if preset exists and has widgets before doing anything
            if (!preset || preset.layout.filter(w => w.enabled).length === 0) {
                toast.error(`Preset ${index + 1} is empty`);
                return;
            }

            toast.info(`Loaded Preset ${index + 1}`);
            setTransitionPhase("fadeIn");

            setTimeout(() => {
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
    );    // Global keybindings: F = menu, P = presets, S = settings, X = compact, 1–9 = load/save presets
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "f") {
                setMenuOpen((prev) => !prev);
                updateTempLayout();
            } else if (key === "p") {
                setPresetManagerOpen((prev) => !prev);
            } else if (key === "s") {
                setSettingsOpen((prev) => !prev);
            } else if (key === "x") {
                if (gridDashboardRef.current) {
                    gridDashboardRef.current.compact();
                    toast.success("Dashboard Compacted");
                }
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
                            newPresets[index] = {
                                type: "grid",
                                layout: deepClone(liveLayout)
                            };
                            setPresets(newPresets);
                            savePresetsToStorage(newPresets);
                            toast.success(`Saved Preset ${index + 1}`);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ui-bg-primary to-ui-bg-secondary">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="dashboard-container">
            {/* Dock - Auto-hides at bottom */}
            <DashboardDock
                presets={presets}
                onWidgetsClick={() => {
                    setMenuOpen(true);
                    updateTempLayout();
                }}
                onPresetManagerClick={() => setPresetManagerOpen(true)}
                onPresetClick={(index) => {
                    if (presets[index] && presets[index]!.layout.filter(w => w.enabled).length > 0) {
                        loadPreset(index);
                    }
                }}
                onPresetSave={(index) => {
                    setPresetSaveIndex(index);
                    setPresetSaveOpen(true);
                }}
                onSettingsClick={() => setSettingsOpen(true)}
            />

            {/* Preset Manager */}
            <PresetManagerMenu
                isOpen={presetManagerOpen}
                onClose={() => setPresetManagerOpen(false)}
                presets={presets}
                onLoadPreset={loadPreset}
                onSavePreset={(index, layoutToSave, presetType) => {
                    const newPresets = [...presets];
                    newPresets[index] = {
                        type: presetType,
                        layout: deepClone(layoutToSave)
                    };
                    setPresets(newPresets);
                    savePresetsToStorage(newPresets);
                    toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
                }}
                onClearPreset={(index) => {
                    const newPresets = [...presets];
                    newPresets[index] = null;
                    setPresets(newPresets);
                    savePresetsToStorage(newPresets);
                    toast.warning(`Cleared Preset ${index + 1}`);
                }}
                currentLayout={layout}
            />

            {/* Quick Save Preset Type Modal */}
            <PresetMenu
                isOpen={presetSaveOpen}
                onClose={() => setPresetSaveOpen(false)}
                presetIndex={presetSaveIndex}
                currentLayout={layout}
                onSavePreset={(index, layoutToSave, presetType) => {
                    const newPresets = [...presets];
                    newPresets[index] = {
                        type: presetType,
                        layout: deepClone(layoutToSave)
                    };
                    setPresets(newPresets);
                    savePresetsToStorage(newPresets);
                    toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
                }}
            />

            {/* Widget Menu Modal */}
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

            {/* Settings Menu Modal */}
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

            <GridDashboard
                ref={gridDashboardRef}
                layout={layout.filter((widget) => widget.enabled)}
                onExternalLayoutChange={setLayout}
            />

            {/* Fullscreen Widget Overlay */}
            {currentPresetType === "fullscreen" && layout.filter(w => w.enabled).length === 1 && (
                <div className="fixed inset-0 z-40 bg-ui-bg-primary">
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
        </div>
    );
}