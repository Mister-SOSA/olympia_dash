"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import MobileDashboard from "./MobileDashboard";
import MobileWidgetMenu from "./MobileWidgetMenu";
import DashboardDock from "./DashboardDock";
import WidgetPicker from "./WidgetPicker";
import PresetDialog from "./PresetDialog";
import PresetManagerMenu from "./PresetManagerMenu";
import SettingsMenu from "./SettingsMenu";
import OnboardingFlow from "./OnboardingFlow";
import { Widget, DashboardPreset, PresetType } from "@/types";
import { useIsMobile } from "@/hooks/useMediaQuery";
import {
    readLayoutFromStorage,
    saveLayoutToStorage,
    readPresetsFromStorage,
    savePresetsToStorage,
    saveCurrentPresetType,
    readCurrentPresetType,
    saveActivePresetIndex,
    readActivePresetIndex,
    generatePresetName,
    normalizeLayout,
    mergeLayoutWithActive,
    areLayoutsEqual,
    detectStructuralChanges,
    describeSource,
    type LayoutUpdateSource,
} from "@/utils/layoutUtils";
import { masterWidgetList, getWidgetById } from "@/constants/widgets";
import { toast } from "sonner";
import { authService } from "@/lib/auth";
import { preferencesService, migrateFromLocalStorage } from "@/lib/preferences";
import { Loader } from "./ui/loader";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { usePresetAutoCycle } from "@/hooks/usePresetAutoCycle";

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

const NON_TEXT_INPUT_TYPES = new Set([
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

const shouldIgnoreGlobalHotkeys = (element: HTMLElement | null): boolean => {
    if (!element) return false;

    if (element.getAttribute("data-hotkeys-allow") === "true") {
        return false;
    }

    if (element.closest('[data-hotkeys-allow="true"]')) {
        return false;
    }

    if (element.closest('[data-hotkeys-disabled="true"]')) {
        return true;
    }

    if (element.isContentEditable) {
        return true;
    }

    const tagName = element.tagName?.toLowerCase();

    if (tagName === "textarea" || tagName === "select") {
        return true;
    }

    if (tagName === "input") {
        const type = (element as HTMLInputElement).type?.toLowerCase() || "text";
        return !NON_TEXT_INPUT_TYPES.has(type);
    }

    const role = element.getAttribute("role")?.toLowerCase();
    if (role === "textbox" || role === "combobox" || role === "searchbox") {
        return true;
    }

    return false;
};

// Table widgets that support arrow key scrolling in fullscreen mode
const TABLE_WIDGET_IDS = new Set([
    "OutstandingOrdersTable",
    "DailyDueInTable",
    "DailyDueInHiddenVendTable",
    "InventoryMovesLog",
    "TopProductUnitSales"
]);

// Fullscreen Widget Component with Arrow Key Scrolling
function FullscreenWidget({ layout }: { layout: Widget[] }) {
    const containerRef = useRef<HTMLDivElement>(null);

    const enabledWidget = layout.find(w => w.enabled);
    const widgetDef = enabledWidget ? getWidgetById(enabledWidget.id) : null;
    const isTableWidget = enabledWidget ? TABLE_WIDGET_IDS.has(enabledWidget.id) : false;

    useEffect(() => {
        if (!isTableWidget || !containerRef.current) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle up/down arrows for scrolling
            // Left/right arrows are reserved for preset navigation
            if (!['ArrowUp', 'ArrowDown'].includes(e.key)) {
                return;
            }

            // Don't interfere if user is in an input field
            if (shouldIgnoreGlobalHotkeys(e.target as HTMLElement)) {
                return;
            }

            // Find the ScrollArea viewport within the widget
            const scrollArea = containerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (!scrollArea) return;

            e.preventDefault();

            const scrollAmount = 40; // pixels to scroll per key press

            switch (e.key) {
                case 'ArrowUp':
                    scrollArea.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
                    break;
                case 'ArrowDown':
                    scrollArea.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTableWidget]);

    if (!enabledWidget || !widgetDef) return null;

    const WidgetComponent = widgetDef.component;

    return (
        <div ref={containerRef} className="fixed inset-0 z-40 bg-ui-bg-primary">
            <div className="w-full h-full overflow-auto">
                <WidgetComponent />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [user, setUser] = useState(authService.getUser());
    const [isImpersonating, setIsImpersonating] = useState(authService.isImpersonating());
    const [layout, setLayout] = useState<Widget[]>([]);
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);

    // ✅ FIX: Get widget permissions
    const { hasAccess, widgetAccess, loading: permissionsLoading, refresh: refreshWidgetPermissions } = useWidgetPermissions();

    // Privacy mode
    const { toggle: togglePrivacy, isPrivate } = usePrivacy();

    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsView, setSettingsView] = useState<'account' | 'widgets' | 'presets' | 'privacy' | 'dock'>('account');
    const [presetManagerOpen, setPresetManagerOpen] = useState(false);
    const [presetDialogOpen, setPresetDialogOpen] = useState(false);
    const [presetDialogType, setPresetDialogType] = useState<"empty" | "save" | "overwrite">("save");
    const [presetDialogIndex, setPresetDialogIndex] = useState<number>(0);
    const [presets, setPresets] = useState<Array<DashboardPreset | null>>(new Array(9).fill(null));
    const [presetIndex, setPresetIndex] = useState<number>(0);
    const [currentPresetType, setCurrentPresetType] = useState<PresetType>("grid");
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);
    const [isDockVisible, setIsDockVisible] = useState(false);
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // ✅ FIX: Track if preferences have been initialized to prevent duplicate loads
    const preferencesInitialized = useRef(false);

    // Load a preset (forward declaration for auto-cycle hook)
    const loadPresetRef = useRef<((index: number) => void) | null>(null);

    // Auto-cycle presets hook
    usePresetAutoCycle({
        presets,
        currentPresetIndex: activePresetIndex,
        onLoadPreset: (index) => loadPresetRef.current?.(index),
        isAnyModalOpen: menuOpen || settingsOpen || presetManagerOpen || presetDialogOpen,
    });

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

            // Set user and impersonation state
            setUser(authService.getUser()); // Gets impersonated user if active
            setIsImpersonating(authService.isImpersonating());
            setIsAuthenticated(true);
            setCheckingAuth(false);
        };

        checkAuth();
    }, [router]);

    // Ensure widget permissions are refreshed once authentication succeeds.
    useEffect(() => {
        if (!isAuthenticated) return;

        refreshWidgetPermissions().catch((error) => {
            console.error('Failed to refresh widget permissions after auth:', error);
        });
    }, [isAuthenticated, refreshWidgetPermissions]);

    // Clean up unauthorized widgets from layout when permissions change
    useEffect(() => {
        // Skip if permissions not loaded yet or user has all access
        if (permissionsLoading || widgetAccess.all_access) return;
        // Skip if layout is empty
        if (layout.length === 0) return;

        // Find enabled widgets that user no longer has access to
        const unauthorizedWidgets = layout.filter(
            w => w.enabled && !hasAccess(w.id, 'view')
        );

        if (unauthorizedWidgets.length > 0) {
            console.log('[Dashboard] Removing unauthorized widgets:', unauthorizedWidgets.map(w => w.id));

            // Disable (remove) unauthorized widgets from layout
            const cleanedLayout = layout.map(w => {
                if (unauthorizedWidgets.some(uw => uw.id === w.id)) {
                    return { ...w, enabled: false };
                }
                return w;
            });

            // Update layout state
            setLayout(cleanedLayout);

            // Save to preferences
            saveLayoutToStorage(cleanedLayout, { source: 'widget-remove', sync: true });
        }
    }, [widgetAccess, permissionsLoading, layout, hasAccess]);

    // Sync preferences from server and migrate old localStorage data
    useEffect(() => {
        // ✅ FIX: Only initialize once
        if (!isAuthenticated || permissionsLoading || preferencesInitialized.current) return;

        const initPreferences = async () => {
            preferencesInitialized.current = true;

            console.log('🚀 Initializing dashboard preferences...');
            console.log(`   User: ${user?.email} (ID: ${user?.id})`);
            console.log(`   Impersonating: ${authService.isImpersonating()}`);
            if (authService.isImpersonating()) {
                console.log(`   Admin: ${authService.getAdminUser()?.email}`);
                console.log(`   Target: ${authService.getImpersonatedUser()?.email}`);
            }

            // Migrate old localStorage preferences to new system (await to ensure it completes)
            await migrateFromLocalStorage();

            // Sync preferences from server
            await preferencesService.syncOnLogin();

            // Check if user has completed onboarding
            const onboardingCompleted = preferencesService.get<boolean>('onboarding.completed', false);
            console.log(`📋 Onboarding check: completed=${onboardingCompleted}, isImpersonating=${authService.isImpersonating()}`);
            console.log(`   All onboarding prefs:`, {
                completed: preferencesService.get('onboarding.completed'),
                skipped: preferencesService.get('onboarding.skipped'),
                completedAt: preferencesService.get('onboarding.completedAt'),
            });
            if (!onboardingCompleted && !authService.isImpersonating()) {
                console.log('📋 New user detected - showing onboarding flow');
                setShowOnboarding(true);
            }

            console.log('📊 Loading dashboard state from preferences...');

            // Load preferences into state
            const storedLayout = readLayoutFromStorage();
            const normalizedLayout = normalizeLayout(storedLayout);
            setLayout(normalizedLayout);
            console.log(`   Layout: ${normalizedLayout.filter(w => w.enabled).length} enabled widgets`);

            const loadedPresets = readPresetsFromStorage();
            setPresets(loadedPresets);
            const presetCount = loadedPresets.filter(p => p !== null).length;
            console.log(`   Presets: ${presetCount}/9 slots filled`);

            // Restore the last used preset type
            const storedPresetType = readCurrentPresetType();
            setCurrentPresetType(storedPresetType as PresetType);

            // Restore the active preset index
            const storedActiveIndex = readActivePresetIndex();
            setActivePresetIndex(storedActiveIndex);

            console.log('✅ Dashboard initialization complete');
        };

        initPreferences();
    }, [isAuthenticated, permissionsLoading, user]);

    // Subscribe to real-time preference changes from other sessions AND user switches
    useEffect(() => {
        if (!isAuthenticated) return;

        // Track initial grid settings to detect changes
        const initialGridColumns = preferencesService.get('grid.columns', 11) as number;
        const initialGridCellHeight = preferencesService.get('grid.cellHeight', 80) as number;

        const unsubscribe = preferencesService.subscribe((isRemote: boolean, changedKeys?: string[]) => {
            // IGNORE local changes - state is already updated directly by the caller
            // Only react to REMOTE changes from other sessions
            if (!isRemote) {
                return;
            }

            console.log('[Dashboard] Remote preferences change detected...', changedKeys);

            // Check for grid setting changes that require reload
            const newGridColumns = preferencesService.get('grid.columns', 11) as number;
            const newGridCellHeight = preferencesService.get('grid.cellHeight', 80) as number;

            if (newGridColumns !== initialGridColumns || newGridCellHeight !== initialGridCellHeight) {
                console.log('[Dashboard] Grid settings changed from another session, reloading...');
                window.location.reload();
                return;
            }

            // Only update state for keys that changed
            if (!changedKeys || changedKeys.length === 0 || changedKeys.includes('dashboard')) {
                const storedLayout = readLayoutFromStorage();
                const normalizedLayout = normalizeLayout(storedLayout);

                // Check if this is a structural change (widgets added/removed) for logging
                const structuralChanges = detectStructuralChanges(layout, normalizedLayout);

                // Check the source metadata to understand WHY the originating session made this change
                const layoutMeta = preferencesService.get<{ source?: LayoutUpdateSource, sessionId?: string }>('dashboard.layoutMeta');
                const originalSource: LayoutUpdateSource = layoutMeta?.source || 'remote-sync';

                console.log(`[Dashboard] Remote layout update: originalSource=${describeSource(originalSource)}, structural=${structuralChanges.widgetsAdded || structuralChanges.widgetsRemoved}`);

                if (structuralChanges.addedIds.length > 0) {
                    console.log(`[Dashboard] Widgets added remotely: ${structuralChanges.addedIds.join(', ')}`);
                }
                if (structuralChanges.removedIds.length > 0) {
                    console.log(`[Dashboard] Widgets removed remotely: ${structuralChanges.removedIds.join(', ')}`);
                }

                // Apply the remote layout - react-grid-layout handles this declaratively
                // No need to force reload, just update state and React will re-render
                setLayout(normalizedLayout);

                // Always sync presets and other metadata
                setPresets(readPresetsFromStorage());
                setCurrentPresetType(readCurrentPresetType() as PresetType);
                setActivePresetIndex(readActivePresetIndex());
            }

            // Update user state to reflect impersonation changes
            setUser(authService.getUser());
            setIsImpersonating(authService.isImpersonating());

            console.log('[Dashboard] State updated from remote');
        });

        return unsubscribe;
    }, [isAuthenticated, layout]);

    // Prepare a temporary layout for the widget menu
    const updateTempLayout = useCallback(() => {
        setTempLayout(
            masterWidgetList.map((widget) => {
                const existing = layout.find((w) => w.id === widget.id);
                return existing || { ...widget, enabled: false };
            })
        );
    }, [layout]);

    const handleExternalLayoutChange = useCallback((activeLayout: Widget[], source: LayoutUpdateSource = 'local-interaction') => {
        const mergedLayout = mergeLayoutWithActive(layout, activeLayout);
        const normalizedLayout = normalizeLayout(mergedLayout);

        // Check if layout actually changed before saving
        if (areLayoutsEqual(layout, normalizedLayout)) {
            return;
        }

        // Update state first
        setLayout(normalizedLayout);

        // Save layout with source tag - this controls notifyLocal behavior
        // For local-interaction, notifyLocal defaults to false to prevent feedback loops
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
    }, [layout, activePresetIndex]);

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
        [presets]
    );

    // Update loadPresetRef for auto-cycle hook
    useEffect(() => {
        loadPresetRef.current = loadPreset;
    }, [loadPreset]);    // ✅ FIX: Use refs for values that change frequently to avoid event listener re-registration
    const presetsRef = useRef(presets);
    const presetIndexRef = useRef(presetIndex);
    const menuOpenRef = useRef(menuOpen);
    const settingsOpenRef = useRef(settingsOpen);
    const presetManagerOpenRef = useRef(presetManagerOpen);
    const presetDialogOpenRef = useRef(presetDialogOpen);

    useEffect(() => {
        presetsRef.current = presets;
        presetIndexRef.current = presetIndex;
        menuOpenRef.current = menuOpen;
        settingsOpenRef.current = settingsOpen;
        presetManagerOpenRef.current = presetManagerOpen;
        presetDialogOpenRef.current = presetDialogOpen;
    }, [presets, presetIndex, menuOpen, settingsOpen, presetManagerOpen, presetDialogOpen]);

    // Global keybindings: F = menu, P = presets, S = settings, X = compact, 1–9 = load/save presets
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

            if (key === "f") {
                if (otherModalOpen) {
                    return;
                }
                e.preventDefault();
                setMenuOpen((prev) => {
                    if (!prev) {
                        updateTempLayout();
                    }
                    return !prev;
                });
                return;
            }

            if (key === "p") {
                if (menuOpenRef.current || settingsOpenRef.current || presetDialogOpenRef.current) {
                    return;
                }
                e.preventDefault();
                setPresetManagerOpen((prev) => !prev);
                return;
            }

            if (key === "s") {
                if (menuOpenRef.current || presetManagerOpenRef.current || presetDialogOpenRef.current) {
                    return;
                }
                e.preventDefault();
                setSettingsView('account');
                setSettingsOpen((prev) => !prev);
                return;
            }

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

            // Privacy mode toggle (backslash key)
            if (key === "\\" || key === "\\\\") {
                e.preventDefault();
                togglePrivacy();
                toast.info(isPrivate ? "Privacy Mode Off" : "Privacy Mode On");
                return;
            }

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
                if (digit === 0) {
                    window.location.reload();
                } else if (digit >= 1 && digit <= 9) {
                    const index = digit - 1;
                    if (e.shiftKey) {
                        const liveLayout = readLayoutFromStorage();
                        if (liveLayout) {
                            const newPresets = [...presetsRef.current];
                            const existingPreset = newPresets[index];
                            const now = new Date().toISOString();

                            newPresets[index] = {
                                type: "grid",
                                layout: deepClone(liveLayout),
                                name: existingPreset?.name || generatePresetName(liveLayout),
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
                        }
                    } else {
                        loadPreset(index);
                    }
                }
                return;
            }

            if (key === "arrowleft") {
                if (anyModalOpen) {
                    return;
                }
                const newIndex = findNextPresetIndex(presetsRef.current, presetIndexRef.current, -1);
                if (newIndex !== presetIndexRef.current) loadPreset(newIndex);
                return;
            }

            if (key === "arrowright") {
                if (anyModalOpen) {
                    return;
                }
                const newIndex = findNextPresetIndex(presetsRef.current, presetIndexRef.current, 1);
                if (newIndex !== presetIndexRef.current) loadPreset(newIndex);
            }
        },
        [loadPreset, updateTempLayout, togglePrivacy, isPrivate]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Save/cancel from widget menu
    const handleSave = useCallback(() => {
        const normalizedLayout = normalizeLayout(tempLayout);

        // Check what changed to determine the source
        const structuralChanges = detectStructuralChanges(layout, normalizedLayout);
        const source: LayoutUpdateSource = structuralChanges.widgetsAdded
            ? 'widget-add'
            : structuralChanges.widgetsRemoved
                ? 'widget-remove'
                : 'local-interaction';

        // ✅ Save with appropriate source tag
        saveLayoutToStorage(normalizedLayout, { source });
        setMenuOpen(false);

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
                toast.success(`Saved Preset ${activePresetIndex + 1}`);
            } else {
                // Manual layout edits without an active preset fall back to grid mode
                setCurrentPresetType("grid");
                saveCurrentPresetType("grid");
                setActivePresetIndex(null);
                saveActivePresetIndex(null);
            }
        }
    }, [
        tempLayout,
        layout,
        activePresetIndex,
        presets,
        generatePresetName
    ]); // Removed permission-related deps since we're not filtering here anymore

    const handleCancel = useCallback(() => {
        setMenuOpen(false);
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        router.push('/login');
    };

    const handleEndImpersonation = async () => {
        await authService.endImpersonation();
        setIsImpersonating(false);
        setUser(authService.getRealUser());
        // Reload dashboard with admin's preferences
        window.location.reload();
    };

    // Handle preset click with intelligent dialog
    const handlePresetClick = useCallback((index: number) => {
        const preset = presets[index];
        const isPresetEmpty = !preset || preset.layout.filter(w => w.enabled).length === 0;

        if (isPresetEmpty) {
            // Empty slot - offer to create blank preset
            setPresetDialogType("empty");
            setPresetDialogIndex(index);
            setPresetDialogOpen(true);
        } else {
            loadPreset(index);
        }
    }, [presets, loadPreset]);

    // Handle preset save (right-click)
    const handlePresetSave = useCallback((index: number) => {
        const preset = presets[index];
        const isPresetEmpty = !preset || preset.layout.filter(w => w.enabled).length === 0;

        if (isPresetEmpty) {
            setPresetDialogType("save");
        } else {
            setPresetDialogType("overwrite");
        }
        setPresetDialogIndex(index);
        setPresetDialogOpen(true);
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
        // ✅ Creating a new blank preset is effectively a preset-load
        saveLayoutToStorage(blankLayout, { source: 'preset-load' });
        setCurrentPresetType("grid");
        saveCurrentPresetType("grid");
        toast.success(`Created blank Preset ${index + 1}`);
    }, [presets]);

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
        // ✅ Saving to a preset is effectively loading that preset
        saveLayoutToStorage(normalizedLayout, { source: 'preset-load' });
        toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
    }, [presets, generatePresetName]);

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ui-bg-primary to-ui-bg-secondary animate-in fade-in duration-300">
                <div className="relative mb-6">
                    {/* Outer pulse ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full border-2 border-ui-accent-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                    </div>
                    {/* Loader */}
                    <Loader />
                </div>
                <p className="text-ui-text-secondary text-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                    Loading your dashboard...
                </p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    // Mobile Experience - Completely different UI
    if (isMobile) {
        return (
            <>
                {/* Onboarding Flow for new users */}
                <AnimatePresence>
                    {showOnboarding && (
                        <OnboardingFlow
                            user={user}
                            onComplete={() => setShowOnboarding(false)}
                        />
                    )}
                </AnimatePresence>

                {isImpersonating && <ImpersonationBanner onEndImpersonation={handleEndImpersonation} />}
                <div className="dashboard-container mobile" style={isImpersonating ? { paddingTop: '60px' } : {}}>
                    {/* Mobile Dashboard with Swipeable Widgets */}
                    <MobileDashboard
                        layout={layout}
                        onSettingsClick={() => {
                            setSettingsView('account');
                            setSettingsOpen(true);
                        }}
                        onWidgetsClick={() => {
                            setMenuOpen(true);
                            updateTempLayout();
                        }}
                    />

                    {/* Widget Menu Modal - Mobile Version */}
                    <AnimatePresence>
                        {menuOpen && (
                            <MobileWidgetMenu
                                tempLayout={tempLayout}
                                setTempLayout={setTempLayout}
                                handleSave={handleSave}
                                handleCancel={handleCancel}
                                activePresetName={
                                    activePresetIndex !== null && presets[activePresetIndex]
                                        ? presets[activePresetIndex]!.name || `Preset ${activePresetIndex + 1}`
                                        : undefined
                                }
                            />
                        )}
                    </AnimatePresence>

                    {/* Settings Menu - Unified responsive component */}
                    <AnimatePresence>
                        {settingsOpen && (
                            <SettingsMenu
                                user={user}
                                onLogout={handleLogout}
                                onClose={() => setSettingsOpen(false)}
                                onAdminClick={user?.role === 'admin' ? () => router.push('/admin') : undefined}
                                presets={presets}
                                initialView={settingsView}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </>
        );
    }

    // Desktop Experience - Original Grid Layout
    return (
        <>
            {/* Onboarding Flow for new users */}
            <AnimatePresence>
                {showOnboarding && (
                    <OnboardingFlow
                        user={user}
                        onComplete={() => setShowOnboarding(false)}
                    />
                )}
            </AnimatePresence>

            {isImpersonating && <ImpersonationBanner onEndImpersonation={handleEndImpersonation} />}
            <div className="dashboard-container" style={isImpersonating ? { paddingTop: '60px' } : {}}>                {/* Dock - Auto-hides at bottom */}
                <DashboardDock
                    presets={presets}
                    activePresetIndex={activePresetIndex}
                    onWidgetsClick={() => {
                        setMenuOpen(true);
                        updateTempLayout();
                    }}
                    onPresetManagerClick={() => setPresetManagerOpen(true)}
                    onPresetClick={handlePresetClick}
                    onPresetSave={handlePresetSave}
                    onSettingsClick={(view) => {
                        setSettingsView(view || 'account');
                        setSettingsOpen(true);
                    }}
                    onVisibilityChange={setIsDockVisible}
                />

                {/* Preset Manager */}
                <PresetManagerMenu
                    isOpen={presetManagerOpen}
                    onClose={() => setPresetManagerOpen(false)}
                    presets={presets}
                    activePresetIndex={activePresetIndex}
                    onLoadPreset={loadPreset}
                    onSavePreset={(index, layoutToSave, presetType, name, description) => {
                        const newPresets = [...presets];
                        const existingPreset = newPresets[index];
                        const now = new Date().toISOString();
                        const normalizedLayout = normalizeLayout(layoutToSave);

                        newPresets[index] = {
                            type: presetType,
                            layout: deepClone(normalizedLayout),
                            name: name || generatePresetName(normalizedLayout),
                            description: description || "",
                            createdAt: existingPreset?.createdAt || now,
                            updatedAt: now
                        };
                        setPresets(newPresets);
                        savePresetsToStorage(newPresets);
                        setActivePresetIndex(index);
                        setPresetIndex(index);
                        saveActivePresetIndex(index);
                        setLayout(normalizedLayout);
                        // ✅ Saving to a preset is effectively loading that preset
                        saveLayoutToStorage(normalizedLayout, { source: 'preset-load' });
                        toast.success(`Saved ${presetType === "fullscreen" ? "Fullscreen" : "Grid"} Preset ${index + 1}`);
                    }}
                    onUpdatePreset={(index, updates) => {
                        const newPresets = [...presets];
                        if (newPresets[index]) {
                            newPresets[index] = {
                                ...newPresets[index]!,
                                ...updates,
                                updatedAt: new Date().toISOString()
                            };
                            setPresets(newPresets);
                            savePresetsToStorage(newPresets);
                            toast.success(`Updated Preset ${index + 1}`);
                        }
                    }}
                    onClearPreset={(index) => {
                        const newPresets = [...presets];
                        newPresets[index] = null;
                        setPresets(newPresets);
                        savePresetsToStorage(newPresets);
                        if (activePresetIndex === index) {
                            setActivePresetIndex(null);
                            saveActivePresetIndex(null);
                        }
                        toast.warning(`Cleared Preset ${index + 1}`);
                    }}
                    currentLayout={layout}
                />

                {/* Intelligent Preset Dialog */}
                <PresetDialog
                    isOpen={presetDialogOpen}
                    onClose={() => setPresetDialogOpen(false)}
                    dialogType={presetDialogType}
                    presetIndex={presetDialogIndex}
                    currentLayout={layout}
                    onCreateBlank={handleCreateBlank}
                    onSavePreset={handleSaveToPreset}
                    onLoadPreset={loadPreset}
                />

                {/* Widget Menu Modal */}
                <AnimatePresence>
                    {menuOpen && (
                        <WidgetPicker
                            tempLayout={tempLayout}
                            setTempLayout={setTempLayout}
                            handleSave={handleSave}
                            handleCancel={handleCancel}
                            activePresetName={
                                activePresetIndex !== null && presets[activePresetIndex]
                                    ? presets[activePresetIndex]!.name || `Preset ${activePresetIndex + 1}`
                                    : undefined
                            }
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
                            presets={presets}
                            initialView={settingsView}
                        />
                    )}
                </AnimatePresence>

                <motion.div
                    animate={{ opacity: isTransitioning ? 0 : 1 }}
                    transition={{
                        duration: 0.2,
                        ease: [0.4, 0.0, 0.2, 1] // Apple-like ease curve
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    className={isTransitioning ? 'transitioning-preset' : ''}
                >
                    <GridDashboard
                        ref={gridDashboardRef}
                        layout={layout.filter((widget) => widget.enabled)}
                        onExternalLayoutChange={handleExternalLayoutChange}
                        onAddWidget={() => {
                            setMenuOpen(true);
                            updateTempLayout();
                        }}
                        onOpenSettings={() => {
                            setSettingsView('account');
                            setSettingsOpen(true);
                        }}
                        isDockVisible={isDockVisible}
                    />

                    {/* Fullscreen Widget Overlay */}
                    {currentPresetType === "fullscreen" && layout.filter(w => w.enabled).length === 1 && (
                        <FullscreenWidget layout={layout} />
                    )}
                </motion.div>
            </div>
        </>
    );
}