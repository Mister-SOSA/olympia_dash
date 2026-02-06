"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { motion } from "framer-motion";
import {
    MdWidgets,
    MdSettings,
    MdAdd,
    MdVisibilityOff,
    MdVisibility,
    MdBookmarks,
    MdDragIndicator,
} from "react-icons/md";

// Swiper - native-feeling carousel
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

// Hooks & contexts
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { usePrivacy } from "@/contexts/PrivacyContext";

// Utils
import { toast } from "sonner";
import {
    type MobilePresetsState,
    type MobilePreset,
    readMobilePresets,
    saveMobilePresets,
    getStarterPresets,
    toggleWidgetInActivePreset,
    updateActivePresetWidgets,
    savePreset,
    findNextEmptySlot,
    subscribeMobilePresets,
} from "@/utils/mobilePresetUtils";
import { getWidgetById } from "@/constants/widgets";
import { getWidgetConfig } from "@/components/widgets/registry";

// Mobile components
import {
    vibrate,
    SortableWidgetGrid,
    StaticWidgetCard,
    PresetTabs,
    DetailView,
    MobileWidgetPicker,
    PresetNameDialog,
} from "@/components/mobile";

// ============================================
// Types
// ============================================

export interface MobileDashboardProps {
    onSettingsClick: () => void;
}

// ============================================
// Main Component
// ============================================

export default function MobileDashboard({ onSettingsClick }: MobileDashboardProps) {
    const { hasAccess } = useWidgetPermissions();
    const { settings: privacySettings, toggle: togglePrivacy } = usePrivacy();

    // State
    const [presetsState, setPresetsState] = useState<MobilePresetsState>(() => readMobilePresets());
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
    const [presetNameDialogOpen, setPresetNameDialogOpen] = useState(false);
    const [pendingPresetSlot, setPendingPresetSlot] = useState<number | null>(null);
    const [visiblePresetIndex, setVisiblePresetIndex] = useState<number>(() => readMobilePresets().activePresetIndex);

    // *** Drag state - controls swiper blocking ***
    const [isWidgetDragging, setIsWidgetDragging] = useState(false);

    // Refs
    const swiperRef = useRef<SwiperType | null>(null);
    const lastSyncedIndex = useRef(-1);

    // Subscribe to remote preset changes
    useEffect(() => {
        const unsubscribe = subscribeMobilePresets((newState) => {
            setPresetsState(newState);
        });
        return unsubscribe;
    }, []);

    // Derived state
    const activePreset = presetsState.presets[presetsState.activePresetIndex];

    const enabledWidgetIds = useMemo(() => {
        if (!activePreset) return [];
        return activePreset.widgetIds.filter((id) => hasAccess(id, "view"));
    }, [activePreset, hasAccess]);

    const nonNullPresets = useMemo(
        () =>
            presetsState.presets
                .map((preset, index) => ({ preset, index }))
                .filter(({ preset }) => preset !== null) as { preset: MobilePreset; index: number }[],
        [presetsState.presets]
    );

    const currentSwiperIndex = useMemo(
        () => nonNullPresets.findIndex(({ index }) => index === presetsState.activePresetIndex),
        [nonNullPresets, presetsState.activePresetIndex]
    );

    // ============================================
    // Handlers - Memoized
    // ============================================

    const handlePresetChange = useCallback((index: number) => {
        if (presetsState.presets[index] === null) return;
        vibrate(10);
        setPresetsState((prev) => {
            const newState = { ...prev, activePresetIndex: index };
            saveMobilePresets(newState);
            return newState;
        });
    }, [presetsState.presets]);

    const handleWidgetClick = useCallback(
        (widgetId: string) => {
            setSelectedWidgetId(widgetId);
        },
        []
    );

    const handleToggleWidget = useCallback((widgetId: string) => {
        setPresetsState((prev) => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        const widgetDef = getWidgetById(widgetId);
        const config = getWidgetConfig(widgetId);
        const widgetName = widgetDef?.title || config?.title || widgetId;

        setPresetsState((prev) => {
            const newState = toggleWidgetInActivePreset(prev, widgetId);
            saveMobilePresets(newState);
            return newState;
        });
        toast.success(`Removed "${widgetName}"`);
    }, []);

    const handleReorder = useCallback((newOrder: string[]) => {
        setPresetsState((prev) => {
            const newState = updateActivePresetWidgets(prev, newOrder);
            saveMobilePresets(newState);
            return newState;
        });
    }, []);

    // Handle drag state changes - block swiper when dragging
    const handleDragStateChange = useCallback((isDragging: boolean) => {
        setIsWidgetDragging(isDragging);
        // Disable/enable swiper touch when drag state changes
        if (swiperRef.current) {
            swiperRef.current.allowTouchMove = !isDragging;
        }
    }, []);

    const handleAddPreset = useCallback(() => {
        const emptySlot = findNextEmptySlot(presetsState);
        if (emptySlot === -1) {
            toast.error("All preset slots are full");
            return;
        }
        setPendingPresetSlot(emptySlot);
        setPresetNameDialogOpen(true);
    }, [presetsState]);

    const handleSaveNewPreset = useCallback(
        (name: string) => {
            if (pendingPresetSlot === null) return;

            const existingPreset = presetsState.presets[pendingPresetSlot];

            setPresetsState((prev) => {
                if (existingPreset) {
                    // Renaming existing preset - keep widgets
                    const newPresets = [...prev.presets];
                    newPresets[pendingPresetSlot] = { ...existingPreset, name };
                    const newState = { ...prev, presets: newPresets };
                    saveMobilePresets(newState);
                    return newState;
                } else {
                    // Creating new preset
                    const newState = savePreset(prev, pendingPresetSlot, name, []);
                    const withActiveChange = { ...newState, activePresetIndex: pendingPresetSlot };
                    saveMobilePresets(withActiveChange);
                    return withActiveChange;
                }
            });
            toast.success(existingPreset ? `Renamed to "${name}"` : `Created "${name}"`);
            setPendingPresetSlot(null);
        },
        [pendingPresetSlot, presetsState.presets]
    );

    const handleRenamePreset = useCallback((index: number) => {
        setPendingPresetSlot(index);
        setPresetNameDialogOpen(true);
    }, []);

    const handleDeletePreset = useCallback((index: number) => {
        const preset = presetsState.presets[index];
        if (!preset) return;

        // Count non-null presets
        const nonNullCount = presetsState.presets.filter(p => p !== null).length;
        if (nonNullCount <= 1) {
            toast.error("Cannot delete the last preset");
            return;
        }

        setPresetsState((prev) => {
            const newPresets = [...prev.presets];
            newPresets[index] = null;

            // If deleting active preset, switch to first available
            let newActiveIndex = prev.activePresetIndex;
            if (index === prev.activePresetIndex) {
                newActiveIndex = newPresets.findIndex(p => p !== null);
            }

            const newState = { ...prev, presets: newPresets, activePresetIndex: newActiveIndex };
            saveMobilePresets(newState);
            return newState;
        });
        toast.success(`Deleted "${preset.name}"`);
        vibrate(20);
    }, [presetsState.presets]);

    const handleUseStarter = useCallback(() => {
        const starterPresets = getStarterPresets();
        setPresetsState(starterPresets);
        saveMobilePresets(starterPresets);
        toast.success("Loaded starter presets!");
    }, []);

    const handleClosePresetDialog = useCallback(() => {
        setPresetNameDialogOpen(false);
        setPendingPresetSlot(null);
    }, []);

    const handleCloseDetailView = useCallback(() => setSelectedWidgetId(null), []);
    const handleCloseWidgetPicker = useCallback(() => setWidgetPickerOpen(false), []);
    const handleOpenWidgetPicker = useCallback(() => setWidgetPickerOpen(true), []);

    // Computed values for preset dialog
    const pendingPresetName = pendingPresetSlot !== null ? presetsState.presets[pendingPresetSlot]?.name ?? "" : "";
    const isRenamingPreset = pendingPresetSlot !== null && presetsState.presets[pendingPresetSlot] !== null;
    const presetDialogTitle = isRenamingPreset ? "Rename Preset" : "New Preset";

    // ============================================
    // Swiper Handlers
    // ============================================

    // Sync swiper when preset changes externally (e.g., from tabs)
    useEffect(() => {
        if (swiperRef.current && currentSwiperIndex >= 0 && currentSwiperIndex !== lastSyncedIndex.current) {
            const swiperActiveIndex = swiperRef.current.activeIndex;
            if (swiperActiveIndex !== currentSwiperIndex) {
                swiperRef.current.slideTo(currentSwiperIndex, 300);
            }
            lastSyncedIndex.current = currentSwiperIndex;
        }
    }, [currentSwiperIndex]);

    const handleSlideChange = useCallback(
        (swiper: SwiperType) => {
            const targetPresetIndex = nonNullPresets[swiper.activeIndex]?.index;
            if (targetPresetIndex !== undefined && targetPresetIndex !== presetsState.activePresetIndex) {
                lastSyncedIndex.current = swiper.activeIndex;
                setPresetsState((prev) => {
                    const newState = { ...prev, activePresetIndex: targetPresetIndex };
                    saveMobilePresets(newState);
                    return newState;
                });
                vibrate(10);
            }
        },
        [nonNullPresets, presetsState.activePresetIndex]
    );

    const handleTransitionEnd = useCallback(() => {
        // Set visible preset index to trigger fade-in on the new active preset
        setVisiblePresetIndex(presetsState.activePresetIndex);
    }, [presetsState.activePresetIndex]);

    const handleSwiperInit = useCallback((swiper: SwiperType) => {
        swiperRef.current = swiper;
    }, []);

    // ============================================
    // Empty State - No Presets
    // ============================================

    if (presetsState.presets.every((p) => p === null)) {
        return (
            <div className="mobile-dashboard-empty">
                <div className="mobile-empty-state">
                    <MdBookmarks className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4" />
                    <h2 className="text-xl font-medium text-ui-text-secondary mb-2">
                        Welcome to OlyDash
                    </h2>
                    <p className="text-sm text-ui-text-tertiary mb-6 text-center px-4">
                        Create presets to organize your widgets into different views
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <motion.button
                            onClick={handleUseStarter}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            <MdBookmarks className="w-5 h-5" />
                            <span>Use Starter Presets</span>
                        </motion.button>
                        <motion.button
                            onClick={handleAddPreset}
                            className="mobile-nav-button justify-center"
                            style={{ backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            <MdAdd className="w-5 h-5" />
                            <span>Create Empty Preset</span>
                        </motion.button>
                    </div>
                </div>

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={handleClosePresetDialog}
                    onSave={handleSaveNewPreset}
                    initialName={pendingPresetName}
                    title={presetDialogTitle}
                />
            </div>
        );
    }

    // ============================================
    // Empty Preset State
    // ============================================

    if (!activePreset || enabledWidgetIds.length === 0) {
        return (
            <>
                <div className="mobile-dashboard-grid">
                    {/* Header */}
                    <div className="mobile-grid-header">
                        <div className="flex items-center gap-3">
                            <MdBookmarks className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                            <div>
                                <h1
                                    className="text-lg font-semibold"
                                    style={{ color: "var(--ui-text-primary)" }}
                                >
                                    {activePreset?.name || "No Preset"}
                                </h1>
                                <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                    No widgets
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={onSettingsClick}
                                className="mobile-header-button"
                                aria-label="Settings"
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <MdSettings className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Preset Tabs */}
                    <PresetTabs
                        presets={presetsState}
                        onPresetChange={handlePresetChange}
                        onAddPreset={handleAddPreset}
                        onRenamePreset={handleRenamePreset}
                        onDeletePreset={handleDeletePreset}
                        currentSwiperIndex={currentSwiperIndex}
                        nonNullPresetsCount={nonNullPresets.length}
                    />

                    {/* Empty content */}
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="text-center">
                            <MdWidgets className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4 mx-auto" />
                            <h2 className="text-lg font-medium text-ui-text-secondary mb-2">
                                {activePreset ? "No widgets yet" : "Select a preset"}
                            </h2>
                            <p className="text-sm text-ui-text-tertiary mb-6">
                                {activePreset ? "Add widgets to this preset" : "Choose a preset or create a new one"}
                            </p>
                            {activePreset && (
                                <motion.button
                                    onClick={handleOpenWidgetPicker}
                                    className="px-6 py-3 rounded-xl font-medium"
                                    style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <MdAdd className="w-5 h-5 inline mr-2" />
                                    Add Widgets
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Widget Picker */}
                <MobileWidgetPicker
                    isOpen={widgetPickerOpen}
                    enabledWidgetIds={enabledWidgetIds}
                    onToggleWidget={handleToggleWidget}
                    onClose={handleCloseWidgetPicker}
                />

                <PresetNameDialog
                    isOpen={presetNameDialogOpen}
                    onClose={handleClosePresetDialog}
                    onSave={handleSaveNewPreset}
                    initialName={pendingPresetName}
                    title={presetDialogTitle}
                />
            </>
        );
    }

    // ============================================
    // Main Dashboard View
    // ============================================

    return (
        <div className="mobile-dashboard-grid">
            {/* Header */}
            <div className="mobile-grid-header">
                <div className="flex items-center gap-3">
                    {/* Icon - springy crossfade */}
                    <div className="relative w-5 h-5">
                        <motion.div
                            className="absolute inset-0"
                            animate={{ opacity: isWidgetDragging ? 0 : 1, scale: isWidgetDragging ? 0.5 : 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                            <MdBookmarks className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                        </motion.div>
                        <motion.div
                            className="absolute inset-0"
                            animate={{ opacity: isWidgetDragging ? 1 : 0, scale: isWidgetDragging ? 1 : 0.5 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                            <MdDragIndicator className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                        </motion.div>
                    </div>
                    <div className="overflow-hidden">
                        {/* Title with crossfade */}
                        <div className="relative h-[1.575rem]">
                            <motion.h1
                                className="text-lg font-semibold absolute inset-0"
                                style={{ color: "var(--ui-text-primary)" }}
                                animate={{ opacity: isWidgetDragging ? 0 : 1, y: isWidgetDragging ? -4 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            >
                                {activePreset.name}
                            </motion.h1>
                            <motion.h1
                                className="text-lg font-semibold absolute inset-0"
                                style={{ color: "var(--ui-text-primary)" }}
                                animate={{ opacity: isWidgetDragging ? 1 : 0, y: isWidgetDragging ? 0 : 4 }}
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            >
                                Editing Layout
                            </motion.h1>
                        </div>
                        {/* Subtitle with crossfade */}
                        <div className="relative h-[1rem]">
                            <motion.p
                                className="text-xs absolute inset-0"
                                style={{ color: "var(--ui-text-muted)" }}
                                animate={{ opacity: isWidgetDragging ? 0 : 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            >
                                {`${enabledWidgetIds.length} widget${enabledWidgetIds.length !== 1 ? "s" : ""}`}
                            </motion.p>
                            <motion.p
                                className="text-xs absolute inset-0"
                                style={{ color: "var(--ui-text-muted)" }}
                                animate={{ opacity: isWidgetDragging ? 1 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            >
                                Hold &amp; drag to reorder
                            </motion.p>
                        </div>
                    </div>
                </div>

                {/* Header buttons - spring scale out */}
                <motion.div
                    className="flex items-center gap-2"
                    animate={{
                        opacity: isWidgetDragging ? 0 : 1,
                        scale: isWidgetDragging ? 0.85 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ pointerEvents: isWidgetDragging ? 'none' : 'auto' }}
                >
                    {/* Privacy Toggle */}
                    <motion.button
                        onClick={togglePrivacy}
                        className={`mobile-header-button ${privacySettings.enabled ? "bg-ui-accent-secondary text-white" : ""}`}
                        aria-label={privacySettings.enabled ? "Disable privacy mode" : "Enable privacy mode"}
                        aria-pressed={privacySettings.enabled}
                        whileTap={{ scale: 0.9 }}
                    >
                        {privacySettings.enabled ? (
                            <MdVisibilityOff className="w-5 h-5" />
                        ) : (
                            <MdVisibility className="w-5 h-5" />
                        )}
                    </motion.button>

                    {/* Add Widget */}
                    <motion.button
                        onClick={handleOpenWidgetPicker}
                        className="mobile-header-button"
                        aria-label="Add widgets"
                        whileTap={{ scale: 0.9 }}
                    >
                        <MdAdd className="w-5 h-5" />
                    </motion.button>

                    {/* Settings */}
                    <motion.button
                        onClick={onSettingsClick}
                        className="mobile-header-button"
                        aria-label="Settings"
                        whileTap={{ scale: 0.9 }}
                    >
                        <MdSettings className="w-5 h-5" />
                    </motion.button>
                </motion.div>
            </div>

            {/* Preset Tabs */}
            <PresetTabs
                presets={presetsState}
                onPresetChange={handlePresetChange}
                onAddPreset={handleAddPreset}
                onRenamePreset={handleRenamePreset}
                onDeletePreset={handleDeletePreset}
                currentSwiperIndex={currentSwiperIndex}
                nonNullPresetsCount={nonNullPresets.length}
            />

            {/* Main Content - Swiper Carousel */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <Swiper
                    onSwiper={handleSwiperInit}
                    onSlideChange={handleSlideChange}
                    onTransitionEnd={handleTransitionEnd}
                    initialSlide={currentSwiperIndex >= 0 ? currentSwiperIndex : 0}
                    spaceBetween={0}
                    slidesPerView={1}
                    speed={300}
                    followFinger={!isWidgetDragging}
                    shortSwipes={!isWidgetDragging}
                    longSwipes={!isWidgetDragging}
                    longSwipesRatio={0.25}
                    longSwipesMs={150}
                    resistance={true}
                    resistanceRatio={0.65}
                    touchRatio={1}
                    touchAngle={45}
                    threshold={5}
                    touchStartPreventDefault={false}
                    touchMoveStopPropagation={isWidgetDragging}
                    passiveListeners={!isWidgetDragging}
                    allowTouchMove={!isWidgetDragging}
                    edgeSwipeDetection={!isWidgetDragging}
                    edgeSwipeThreshold={20}
                    modules={[Pagination]}
                    className="h-full w-full"
                >
                    {nonNullPresets.map(({ preset, index: presetIndex }) => {
                        const presetWidgetIds = preset.widgetIds.filter((id) => hasAccess(id, "view"));
                        const isActivePreset = presetIndex === presetsState.activePresetIndex;
                        const isPresetVisible = presetIndex === visiblePresetIndex;

                        return (
                            <SwiperSlide key={presetIndex} style={{ height: "100%", overflow: "hidden" }}>
                                <div
                                    className="h-full overflow-y-auto overflow-x-hidden"
                                    style={{ WebkitOverflowScrolling: "touch" }}
                                >
                                    <div className="mobile-grid-content">
                                        {presetWidgetIds.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center p-4 min-h-[300px]">
                                                <div className="text-center">
                                                    <MdWidgets className="w-16 h-16 text-ui-text-tertiary opacity-40 mb-4 mx-auto" />
                                                    <h2 className="text-lg font-medium text-ui-text-secondary mb-2">
                                                        No widgets yet
                                                    </h2>
                                                    <p className="text-sm text-ui-text-tertiary mb-6">
                                                        Add widgets to this preset
                                                    </p>
                                                    {isActivePreset && (
                                                        <motion.button
                                                            onClick={handleOpenWidgetPicker}
                                                            className="px-6 py-3 rounded-xl font-medium"
                                                            style={{
                                                                backgroundColor: "var(--ui-accent-primary)",
                                                                color: "#ffffff",
                                                            }}
                                                            whileTap={{ scale: 0.95 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                        >
                                                            <MdAdd className="w-5 h-5 inline mr-2" />
                                                            Add Widgets
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {isActivePreset ? (
                                                    <SortableWidgetGrid
                                                        widgetIds={presetWidgetIds}
                                                        onReorder={handleReorder}
                                                        onWidgetClick={handleWidgetClick}
                                                        onRemoveWidget={handleRemoveWidget}
                                                        onDragStateChange={handleDragStateChange}
                                                        isVisible={isPresetVisible}
                                                    />
                                                ) : (
                                                    /* Non-active presets show static grid to reduce re-renders */
                                                    <div className="mobile-widget-grid">
                                                        {presetWidgetIds.map((widgetId) => (
                                                            <StaticWidgetCard
                                                                key={widgetId}
                                                                widgetId={widgetId}
                                                                isVisible={isPresetVisible}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Widget hint - shown at bottom */}
                                                {isActivePreset && presetWidgetIds.length < 8 && (
                                                    <motion.button
                                                        onClick={handleOpenWidgetPicker}
                                                        className="w-full mt-4 p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2"
                                                        style={{
                                                            borderColor: "var(--ui-border-secondary)",
                                                            color: "var(--ui-text-muted)",
                                                        }}
                                                        whileTap={{ scale: 0.98 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                    >
                                                        <MdAdd className="w-5 h-5" />
                                                        <span className="font-medium">Add Widget</span>
                                                    </motion.button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            {/* Pagination dots indicator */}
            {nonNullPresets.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2" role="tablist" aria-label="Preset pages">
                    {nonNullPresets.map((_, idx) => (
                        <div
                            key={idx}
                            role="tab"
                            aria-selected={idx === currentSwiperIndex}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${idx === currentSwiperIndex ? "bg-ui-accent-primary w-4" : "bg-ui-border-secondary"
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Detail View Modal */}
            <DetailView
                isOpen={!!selectedWidgetId}
                widgetId={selectedWidgetId}
                onClose={handleCloseDetailView}
            />

            {/* Widget Picker */}
            <MobileWidgetPicker
                isOpen={widgetPickerOpen}
                enabledWidgetIds={enabledWidgetIds}
                onToggleWidget={handleToggleWidget}
                onClose={handleCloseWidgetPicker}
            />

            {/* Preset Name Dialog */}
            <PresetNameDialog
                isOpen={presetNameDialogOpen}
                onClose={handleClosePresetDialog}
                onSave={handleSaveNewPreset}
                initialName={pendingPresetName}
                title={presetDialogTitle}
            />
        </div>
    );
}
