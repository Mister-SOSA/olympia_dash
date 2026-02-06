"use client";

import React, { memo, useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import {
    MdClose,
    MdTune,
    MdSearch,
    MdCheck,
    MdAdd,
    MdRemove,
    MdExpandMore,
    MdSelectAll,
    MdDeselect,
} from "react-icons/md";
import { getWidgetById } from "@/constants/widgets";
import {
    WIDGET_CONFIGS,
    type WidgetCategory,
    CATEGORY_ORDER,
    CATEGORY_METADATA,
    getWidgetConfigById,
    searchWidgets,
    groupWidgetsByCategory,
    type WidgetConfig,
} from "@/components/widgets/registry";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { Loader } from "@/components/ui/loader";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import WidgetSettingsDialog from "@/components/WidgetSettingsDialog";
import { getWidgetSettingsSchema } from "@/constants/widgetSettings";
import { CATEGORY_ICONS, getWidgetTypeIcon, vibrate } from "./utils";
import {
    getWidgetType,
    getWidgetInstances as getInstancesFromLayout,
    isMultiInstanceWidget,
} from "@/utils/widgetInstanceUtils";

// ============================================
// Detail View (Full Screen Widget) - Using Vaul Drawer
// ============================================

interface DetailViewProps {
    isOpen: boolean;
    widgetId: string | null;
    onClose: () => void;
}

export const DetailView = memo(function DetailView({ isOpen, widgetId, onClose }: DetailViewProps) {
    const widgetDef = widgetId ? getWidgetById(widgetId) : null;
    const config = widgetId ? getWidgetConfigById(widgetId) : null;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const hasSettings = widgetId ? getWidgetSettingsSchema(widgetId) !== null : false;
    const title = widgetDef?.title || config?.title || widgetId || '';

    const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
    const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

    return (
        <>
            <Drawer.Root
                open={isOpen}
                onOpenChange={handleOpenChange}
                shouldScaleBackground={false}
            >
                <Drawer.Portal>
                    <Drawer.Overlay
                        className="fixed inset-0 z-50 bg-black/60"
                    />
                    <Drawer.Content
                        className="fixed inset-x-0 bottom-0 z-50 flex flex-col outline-none"
                        style={{
                            top: "env(safe-area-inset-top, 0px)",
                            backgroundColor: "var(--ui-bg-primary)",
                            borderTopLeftRadius: "0.75rem",
                            borderTopRightRadius: "0.75rem",
                        }}
                        aria-label={`${title} widget details`}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <Drawer.Handle
                                className="w-10 h-1 rounded-full"
                                style={{ backgroundColor: "var(--ui-border-secondary)" }}
                            />
                        </div>

                        {/* Header */}
                        <div
                            className="flex items-center gap-3 px-3 pb-2 border-b flex-shrink-0"
                            style={{ borderColor: "var(--ui-border-primary)" }}
                        >
                            {/* Settings button - left side */}
                            {hasSettings ? (
                                <button
                                    onClick={handleOpenSettings}
                                    className="p-1.5 -ml-1 rounded-full transition-colors active:scale-95"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Widget Settings"
                                >
                                    <MdTune className="w-5 h-5" />
                                </button>
                            ) : (
                                <div className="w-8" />
                            )}

                            {/* Title - centered */}
                            <Drawer.Title className="flex-1 min-w-0 text-center">
                                <span
                                    className="text-base font-semibold truncate leading-tight block"
                                    style={{ color: "var(--ui-text-primary)" }}
                                >
                                    {title}
                                </span>
                            </Drawer.Title>

                            {/* Close button - right side */}
                            <Drawer.Close asChild>
                                <button
                                    className="p-1.5 -mr-1 rounded-full transition-colors active:scale-95"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </Drawer.Close>
                        </div>

                        {/* Widget Content - maximized space */}
                        <div
                            className="flex-1 overflow-auto"
                            style={{
                                padding: "0.75rem",
                                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))"
                            }}
                        >
                            {widgetDef && (
                                <WidgetErrorBoundary widgetName={widgetDef.title || widgetDef.id}>
                                    <Suspense
                                        fallback={
                                            <div className="flex items-center justify-center h-48">
                                                <Loader />
                                            </div>
                                        }
                                    >
                                        <div className="h-full w-full">
                                            <widgetDef.component />
                                        </div>
                                    </Suspense>
                                </WidgetErrorBoundary>
                            )}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {hasSettings && widgetId && (
                <WidgetSettingsDialog
                    widgetId={widgetId}
                    widgetTitle={title}
                    isOpen={settingsOpen}
                    onClose={handleCloseSettings}
                />
            )}
        </>
    );
});

// ============================================
// Mobile Widget Picker - Using Vaul Drawer
// ============================================

interface MobileWidgetPickerProps {
    isOpen: boolean;
    enabledWidgetIds: string[];
    onToggleWidget: (widgetId: string) => void;
    onAddWidgetInstance: (widgetType: string) => void;
    onRemoveWidgetInstance: (widgetId: string) => void;
    onBulkUpdate: (newWidgetIds: string[]) => void;
    onClose: () => void;
}

// ── Singleton toggle row ──────────────────────────────────
const PickerToggleRow = memo(function PickerToggleRow({
    widget,
    isEnabled,
    onToggle,
    CategoryIcon,
}: {
    widget: WidgetConfig;
    isEnabled: boolean;
    onToggle: () => void;
    CategoryIcon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <motion.button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:scale-[0.98] text-left transition-colors"
            style={
                isEnabled
                    ? { backgroundColor: "var(--ui-accent-primary-bg)" }
                    : { backgroundColor: "transparent" }
            }
            aria-pressed={isEnabled}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
        >
            {/* Category icon */}
            <div
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                    backgroundColor: isEnabled
                        ? "var(--ui-accent-primary)"
                        : "var(--ui-bg-tertiary)",
                    color: isEnabled ? "#ffffff" : "var(--ui-text-muted)",
                }}
            >
                <CategoryIcon className="w-[18px] h-[18px]" />
            </div>

            {/* Title + description */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span
                        className="text-[15px] font-semibold truncate"
                        style={{
                            color: isEnabled
                                ? "var(--ui-accent-primary)"
                                : "var(--ui-text-primary)",
                        }}
                    >
                        {widget.title}
                    </span>
                    {widget.beta && (
                        <span
                            className="text-[8px] font-bold px-1 py-px rounded uppercase flex-shrink-0"
                            style={{
                                backgroundColor: "var(--ui-warning-bg)",
                                color: "var(--ui-warning-text)",
                            }}
                        >
                            Beta
                        </span>
                    )}
                </div>
                <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--ui-text-muted)" }}
                >
                    {widget.description}
                </p>
            </div>

            {/* Toggle indicator */}
            <div
                className="flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all"
                style={
                    isEnabled
                        ? {
                            backgroundColor: "var(--ui-accent-primary)",
                            borderColor: "var(--ui-accent-primary)",
                        }
                        : { borderColor: "var(--ui-border-secondary)" }
                }
            >
                {isEnabled && (
                    <MdCheck className="w-3.5 h-3.5" style={{ color: "#ffffff" }} />
                )}
            </div>
        </motion.button>
    );
});

// ── Multi-instance stepper row ────────────────────────────
const PickerInstanceRow = memo(function PickerInstanceRow({
    widget,
    instanceCount,
    onAdd,
    onRemoveLast,
    canAddMore,
    CategoryIcon,
}: {
    widget: WidgetConfig;
    instanceCount: number;
    onAdd: () => void;
    onRemoveLast: () => void;
    canAddMore: boolean;
    CategoryIcon: React.ComponentType<{ className?: string }>;
}) {
    const hasInstances = instanceCount > 0;
    const maxInstances = widget.maxInstances;

    return (
        <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
            style={
                hasInstances
                    ? { backgroundColor: "var(--ui-accent-primary-bg)" }
                    : { backgroundColor: "transparent" }
            }
        >
            {/* Category icon with count badge */}
            <div className="flex-shrink-0 relative">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                        backgroundColor: hasInstances
                            ? "var(--ui-accent-primary)"
                            : "var(--ui-bg-tertiary)",
                        color: hasInstances ? "#ffffff" : "var(--ui-text-muted)",
                    }}
                >
                    <CategoryIcon className="w-[18px] h-[18px]" />
                </div>
                {hasInstances && (
                    <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{
                            backgroundColor: "var(--ui-bg-primary)",
                            color: "var(--ui-accent-primary)",
                            border: "1.5px solid var(--ui-accent-primary)",
                        }}
                    >
                        {instanceCount}
                    </span>
                )}
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span
                        className="text-[15px] font-semibold truncate"
                        style={{
                            color: hasInstances
                                ? "var(--ui-accent-primary)"
                                : "var(--ui-text-primary)",
                        }}
                    >
                        {widget.title}
                    </span>
                    {widget.beta && (
                        <span
                            className="text-[8px] font-bold px-1 py-px rounded uppercase flex-shrink-0"
                            style={{
                                backgroundColor: "var(--ui-warning-bg)",
                                color: "var(--ui-warning-text)",
                            }}
                        >
                            Beta
                        </span>
                    )}
                </div>
                <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--ui-text-muted)" }}
                >
                    {hasInstances
                        ? `${instanceCount} active${maxInstances ? ` of ${maxInstances}` : ""}`
                        : widget.description}
                </p>
            </div>

            {/* Stepper control */}
            <div className="flex-shrink-0 flex items-center gap-0.5">
                {/* Remove */}
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        vibrate(10);
                        onRemoveLast();
                    }}
                    disabled={!hasInstances}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-0"
                    style={{
                        backgroundColor: hasInstances
                            ? "var(--ui-danger-bg)"
                            : "transparent",
                        color: hasInstances
                            ? "var(--ui-danger)"
                            : "var(--ui-text-muted)",
                    }}
                    whileTap={hasInstances ? { scale: 0.85 } : undefined}
                >
                    <MdRemove className="w-4 h-4" />
                </motion.button>

                {/* Count */}
                <span
                    className="w-6 text-center text-sm font-bold tabular-nums"
                    style={{
                        color: hasInstances
                            ? "var(--ui-accent-primary)"
                            : "var(--ui-text-muted)",
                    }}
                >
                    {instanceCount}
                </span>

                {/* Add */}
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        vibrate(10);
                        onAdd();
                    }}
                    disabled={!canAddMore}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                        backgroundColor: canAddMore
                            ? "var(--ui-accent-primary)"
                            : "var(--ui-bg-tertiary)",
                        color: canAddMore ? "#ffffff" : "var(--ui-text-muted)",
                    }}
                    whileTap={canAddMore ? { scale: 0.85 } : undefined}
                >
                    <MdAdd className="w-4 h-4" />
                </motion.button>
            </div>
        </div>
    );
});

// ── Category accordion section ────────────────────────────
const CategorySection = memo(function CategorySection({
    category,
    widgets,
    enabledSet,
    enabledWidgetIds,
    enabledCount,
    totalCount,
    onToggleWidget,
    onAddWidgetInstance,
    onRemoveWidgetInstance,
    onEnableAll,
    onDisableAll,
    canAddMoreInstances,
    getInstanceIdsForType,
    defaultExpanded,
}: {
    category: WidgetCategory;
    widgets: WidgetConfig[];
    enabledSet: Set<string>;
    enabledWidgetIds: string[];
    enabledCount: number;
    totalCount: number;
    onToggleWidget: (id: string) => void;
    onAddWidgetInstance: (type: string) => void;
    onRemoveWidgetInstance: (id: string) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
    canAddMoreInstances: (type: string) => boolean;
    getInstanceIdsForType: (type: string) => string[];
    defaultExpanded: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const IconComponent = CATEGORY_ICONS[category];
    const allEnabled = enabledCount >= totalCount;
    const noneEnabled = enabledCount === 0;

    return (
        <div>
            {/* Section header - tap to expand/collapse */}
            <div className="flex items-center gap-1 px-1 py-2.5">
                <button
                    onClick={() => {
                        vibrate(5);
                        setIsExpanded((v) => !v);
                    }}
                    className="flex-1 flex items-center gap-2.5 active:opacity-70 transition-opacity min-w-0"
                >
                    <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }}
                    >
                        <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                        className="text-sm font-bold flex-1 text-left truncate"
                        style={{ color: "var(--ui-text-primary)" }}
                    >
                        {CATEGORY_METADATA[category].label}
                    </span>
                    {enabledCount > 0 && (
                        <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded-md tabular-nums flex-shrink-0"
                            style={{
                                backgroundColor: "var(--ui-accent-primary-bg)",
                                color: "var(--ui-accent-primary)",
                            }}
                        >
                            {enabledCount}
                        </span>
                    )}
                    <span
                        className="text-xs tabular-nums flex-shrink-0"
                        style={{ color: "var(--ui-text-muted)" }}
                    >
                        {totalCount}
                    </span>
                    <MdExpandMore
                        className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: "var(--ui-text-muted)" }}
                    />
                </button>

                {/* Category-level enable/disable */}
                {isExpanded && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                vibrate(10);
                                onEnableAll();
                            }}
                            disabled={allEnabled}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-25"
                            style={{
                                backgroundColor: allEnabled ? "transparent" : "var(--ui-success-bg)",
                                color: allEnabled ? "var(--ui-text-muted)" : "var(--ui-success)",
                            }}
                            whileTap={!allEnabled ? { scale: 0.85 } : undefined}
                            aria-label={`Enable all ${CATEGORY_METADATA[category].label}`}
                        >
                            <MdSelectAll className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                vibrate(10);
                                onDisableAll();
                            }}
                            disabled={noneEnabled}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-25"
                            style={{
                                backgroundColor: noneEnabled ? "transparent" : "var(--ui-danger-bg)",
                                color: noneEnabled ? "var(--ui-text-muted)" : "var(--ui-danger)",
                            }}
                            whileTap={!noneEnabled ? { scale: 0.85 } : undefined}
                            aria-label={`Disable all ${CATEGORY_METADATA[category].label}`}
                        >
                            <MdDeselect className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pb-2 space-y-0.5">
                            {widgets.map((widget) => {
                                if (widget.allowMultiple) {
                                    const instanceIds = getInstanceIdsForType(widget.id);
                                    return (
                                        <PickerInstanceRow
                                            key={widget.id}
                                            widget={widget}
                                            instanceCount={instanceIds.length}
                                            onAdd={() => onAddWidgetInstance(widget.id)}
                                            onRemoveLast={() => {
                                                const last = instanceIds[instanceIds.length - 1];
                                                if (last) onRemoveWidgetInstance(last);
                                            }}
                                            canAddMore={canAddMoreInstances(widget.id)}
                                            CategoryIcon={IconComponent}
                                        />
                                    );
                                }

                                return (
                                    <PickerToggleRow
                                        key={widget.id}
                                        widget={widget}
                                        isEnabled={enabledSet.has(widget.id)}
                                        onToggle={() => onToggleWidget(widget.id)}
                                        CategoryIcon={IconComponent}
                                    />
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// ── Main MobileWidgetPicker ───────────────────────────────
export const MobileWidgetPicker = memo(function MobileWidgetPicker({
    isOpen,
    enabledWidgetIds,
    onToggleWidget,
    onAddWidgetInstance,
    onRemoveWidgetInstance,
    onBulkUpdate,
    onClose,
}: MobileWidgetPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { filterAccessibleWidgets } = useWidgetPermissions();
    const listRef = useRef<HTMLDivElement>(null);

    // Reset search when drawer closes
    useEffect(() => {
        if (!isOpen) setSearchTerm("");
    }, [isOpen]);

    const accessibleWidgets = useMemo(
        () => filterAccessibleWidgets(WIDGET_CONFIGS, "view") as WidgetConfig[],
        [filterAccessibleWidgets]
    );

    // Search filtered widgets
    const isSearching = searchTerm.trim().length > 0;
    const searchResults = useMemo(() => {
        if (!isSearching) return [];
        return searchWidgets(searchTerm, accessibleWidgets);
    }, [searchTerm, accessibleWidgets, isSearching]);

    // Group by category for default view
    const groupedWidgets = useMemo(
        () => groupWidgetsByCategory(accessibleWidgets),
        [accessibleWidgets]
    );

    const enabledSet = useMemo(
        () => new Set(enabledWidgetIds),
        [enabledWidgetIds]
    );

    // Count enabled per category (including multi-instance)
    const categoryStats = useMemo(() => {
        const stats: Record<string, { total: number; enabled: number }> = {};
        accessibleWidgets.forEach((w) => {
            if (!stats[w.category]) stats[w.category] = { total: 0, enabled: 0 };
            stats[w.category].total++;
            if (w.allowMultiple) {
                const count = enabledWidgetIds.filter(
                    (id) => getWidgetType(id) === w.id
                ).length;
                stats[w.category].enabled += count;
            } else if (enabledSet.has(w.id)) {
                stats[w.category].enabled++;
            }
        });
        return stats;
    }, [accessibleWidgets, enabledWidgetIds, enabledSet]);

    const enabledCount = enabledWidgetIds.length;

    // For multi-instance: get instance IDs
    const getInstanceIdsForType = useCallback(
        (widgetType: string): string[] =>
            enabledWidgetIds.filter(
                (id) => getWidgetType(id) === widgetType && isMultiInstanceWidget(id)
            ),
        [enabledWidgetIds]
    );

    // Can add more instances?
    const canAddMoreInstances = useCallback(
        (widgetType: string): boolean => {
            const config = accessibleWidgets.find((w) => w.id === widgetType);
            if (!config?.allowMultiple) return false;
            const cur = enabledWidgetIds.filter(
                (id) => getWidgetType(id) === widgetType
            ).length;
            if (config.maxInstances !== undefined) return cur < config.maxInstances;
            return true;
        },
        [accessibleWidgets, enabledWidgetIds]
    );

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value),
        []
    );
    const handleClearSearch = useCallback(() => setSearchTerm(""), []);

    const handleToggle = useCallback(
        (widgetId: string) => {
            vibrate(10);
            onToggleWidget(widgetId);
        },
        [onToggleWidget]
    );

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) onClose();
        },
        [onClose]
    );

    // ── Bulk actions ──────────────────────────────────
    const handleSelectAll = useCallback(() => {
        vibrate(10);
        const singletonIds = accessibleWidgets
            .filter((w) => !w.allowMultiple)
            .map((w) => w.id);
        // Keep existing multi-instance IDs, add all singletons
        const multiInstanceIds = enabledWidgetIds.filter((id) => isMultiInstanceWidget(id));
        const merged = [...new Set([...multiInstanceIds, ...singletonIds])];
        onBulkUpdate(merged);
    }, [accessibleWidgets, enabledWidgetIds, onBulkUpdate]);

    const handleRemoveAll = useCallback(() => {
        vibrate(10);
        onBulkUpdate([]);
    }, [onBulkUpdate]);

    const handleEnableAllInCategory = useCallback(
        (category: WidgetCategory) => {
            const categoryWidgets = accessibleWidgets.filter(
                (w) => w.category === category && !w.allowMultiple
            );
            const idsToAdd = categoryWidgets.map((w) => w.id);
            const merged = [...new Set([...enabledWidgetIds, ...idsToAdd])];
            onBulkUpdate(merged);
        },
        [accessibleWidgets, enabledWidgetIds, onBulkUpdate]
    );

    const handleDisableAllInCategory = useCallback(
        (category: WidgetCategory) => {
            const categoryWidgetIds = new Set(
                accessibleWidgets
                    .filter((w) => w.category === category)
                    .map((w) => w.id)
            );
            // Remove singletons + multi-instance widgets in this category
            const filtered = enabledWidgetIds.filter((id) => {
                const baseType = getWidgetType(id);
                return !categoryWidgetIds.has(baseType);
            });
            onBulkUpdate(filtered);
        },
        [accessibleWidgets, enabledWidgetIds, onBulkUpdate]
    );

    const totalWidgetCount = accessibleWidgets.filter((w) => !w.allowMultiple).length;
    const allSingletonsEnabled = accessibleWidgets
        .filter((w) => !w.allowMultiple)
        .every((w) => enabledSet.has(w.id));

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={handleOpenChange}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
                <Drawer.Content
                    className="fixed inset-x-0 bottom-0 z-50 flex flex-col outline-none"
                    style={{
                        top: "env(safe-area-inset-top, 0px)",
                        backgroundColor: "var(--ui-bg-primary)",
                        borderTopLeftRadius: "0.75rem",
                        borderTopRightRadius: "0.75rem",
                    }}
                    aria-label="Add widgets"
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <Drawer.Handle
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    {/* ─── Header ─── */}
                    <div
                        className="flex-shrink-0 px-4 pb-3"
                    >
                        {/* Title row */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <Drawer.Title
                                    className="text-xl font-bold"
                                    style={{ color: "var(--ui-text-primary)" }}
                                >
                                    Widgets
                                </Drawer.Title>
                                <p
                                    className="text-xs mt-0.5"
                                    style={{ color: "var(--ui-text-muted)" }}
                                >
                                    {enabledCount} active on this preset
                                </p>
                            </div>
                            <Drawer.Close asChild>
                                <button
                                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                                    style={{
                                        backgroundColor: "var(--ui-bg-tertiary)",
                                        color: "var(--ui-text-secondary)",
                                    }}
                                    aria-label="Close"
                                >
                                    <MdClose className="w-4 h-4" />
                                </button>
                            </Drawer.Close>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <MdSearch
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                style={{ color: "var(--ui-text-muted)" }}
                            />
                            <input
                                type="text"
                                placeholder="Search widgets..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full pl-9 pr-9 py-2.5 rounded-xl border text-sm"
                                style={{
                                    backgroundColor: "var(--ui-bg-secondary)",
                                    borderColor: "var(--ui-border-primary)",
                                    color: "var(--ui-text-primary)",
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor: "var(--ui-bg-tertiary)",
                                        color: "var(--ui-text-muted)",
                                    }}
                                    aria-label="Clear search"
                                >
                                    <MdClose className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-2 mt-2.5">
                            <motion.button
                                onClick={handleSelectAll}
                                disabled={allSingletonsEnabled}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                                style={{
                                    backgroundColor: "var(--ui-success-bg)",
                                    color: "var(--ui-success)",
                                }}
                                whileTap={!allSingletonsEnabled ? { scale: 0.95 } : undefined}
                            >
                                <MdSelectAll className="w-3.5 h-3.5" />
                                Select All
                            </motion.button>
                            <motion.button
                                onClick={handleRemoveAll}
                                disabled={enabledCount === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                                style={{
                                    backgroundColor: "var(--ui-danger-bg)",
                                    color: "var(--ui-danger)",
                                }}
                                whileTap={enabledCount > 0 ? { scale: 0.95 } : undefined}
                            >
                                <MdDeselect className="w-3.5 h-3.5" />
                                Remove All
                            </motion.button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div
                        className="h-px flex-shrink-0"
                        style={{ backgroundColor: "var(--ui-border-primary)" }}
                    />

                    {/* ─── Widget List ─── */}
                    <div ref={listRef} className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
                        {isSearching ? (
                            /* Search results - flat list */
                            searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <MdSearch
                                        className="w-10 h-10 mb-2 opacity-30"
                                        style={{ color: "var(--ui-text-tertiary)" }}
                                    />
                                    <p
                                        className="text-sm font-medium"
                                        style={{ color: "var(--ui-text-secondary)" }}
                                    >
                                        No matches for &ldquo;{searchTerm}&rdquo;
                                    </p>
                                    <button
                                        onClick={handleClearSearch}
                                        className="mt-3 px-4 py-1.5 text-xs font-medium rounded-lg active:scale-95 transition-transform"
                                        style={{
                                            backgroundColor: "var(--ui-bg-tertiary)",
                                            color: "var(--ui-text-secondary)",
                                        }}
                                    >
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-0.5 pb-4">
                                    <p
                                        className="text-xs px-1 py-2"
                                        style={{ color: "var(--ui-text-muted)" }}
                                    >
                                        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                                    </p>
                                    {searchResults.map((widget) => {
                                        const CatIcon = CATEGORY_ICONS[widget.category];
                                        if (widget.allowMultiple) {
                                            const instanceIds = getInstanceIdsForType(widget.id);
                                            return (
                                                <PickerInstanceRow
                                                    key={widget.id}
                                                    widget={widget}
                                                    instanceCount={instanceIds.length}
                                                    onAdd={() => {
                                                        vibrate(10);
                                                        onAddWidgetInstance(widget.id);
                                                    }}
                                                    onRemoveLast={() => {
                                                        vibrate(10);
                                                        const last = instanceIds[instanceIds.length - 1];
                                                        if (last) onRemoveWidgetInstance(last);
                                                    }}
                                                    canAddMore={canAddMoreInstances(widget.id)}
                                                    CategoryIcon={CatIcon}
                                                />
                                            );
                                        }
                                        return (
                                            <PickerToggleRow
                                                key={widget.id}
                                                widget={widget}
                                                isEnabled={enabledSet.has(widget.id)}
                                                onToggle={() => handleToggle(widget.id)}
                                                CategoryIcon={CatIcon}
                                            />
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            /* Default: category accordions */
                            <div className="space-y-1 pb-4">
                                {CATEGORY_ORDER.map((category) => {
                                    const widgets = groupedWidgets[category];
                                    if (!widgets?.length) return null;
                                    const stats = categoryStats[category];

                                    return (
                                        <CategorySection
                                            key={category}
                                            category={category}
                                            widgets={widgets}
                                            enabledSet={enabledSet}
                                            enabledWidgetIds={enabledWidgetIds}
                                            enabledCount={stats?.enabled || 0}
                                            totalCount={stats?.total || 0}
                                            onToggleWidget={handleToggle}
                                            onAddWidgetInstance={(type) => {
                                                vibrate(10);
                                                onAddWidgetInstance(type);
                                            }}
                                            onRemoveWidgetInstance={(id) => {
                                                vibrate(10);
                                                onRemoveWidgetInstance(id);
                                            }}
                                            onEnableAll={() => handleEnableAllInCategory(category)}
                                            onDisableAll={() => handleDisableAllInCategory(category)}
                                            canAddMoreInstances={canAddMoreInstances}
                                            getInstanceIdsForType={getInstanceIdsForType}
                                            defaultExpanded={
                                                (stats?.enabled || 0) > 0
                                            }
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ─── Footer ─── */}
                    <div
                        className="flex-shrink-0 border-t px-4 pt-3 safe-bottom"
                        style={{
                            borderColor: "var(--ui-border-primary)",
                            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
                        }}
                    >
                        <Drawer.Close asChild>
                            <motion.button
                                className="w-full py-3 rounded-xl font-semibold text-[15px]"
                                style={{
                                    backgroundColor: "var(--ui-accent-primary)",
                                    color: "#ffffff",
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                }}
                            >
                                Done
                            </motion.button>
                        </Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
});

// ============================================
// Preset Name Dialog - Memoized
// ============================================

interface PresetNameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    initialName?: string;
    title?: string;
}

export const PresetNameDialog = memo(function PresetNameDialog({
    isOpen,
    onClose,
    onSave,
    initialName = "",
    title = "Save Preset",
}: PresetNameDialogProps) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(initialName);
    }, [initialName, isOpen]);

    // Focus input when dialog opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSave = useCallback(() => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    }, [name, onSave, onClose]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                handleSave();
            } else if (e.key === "Escape") {
                onClose();
            }
        },
        [handleSave, onClose]
    );

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <Drawer.Root
            open={isOpen}
            onOpenChange={handleOpenChange}
            shouldScaleBackground={false}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/60" />
                <Drawer.Content
                    className="fixed inset-x-0 bottom-0 z-[100] flex flex-col outline-none p-4"
                    style={{
                        backgroundColor: "var(--ui-bg-primary)",
                        borderTopLeftRadius: "1rem",
                        borderTopRightRadius: "1rem",
                        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                    }}
                    aria-label={title}
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-1 pb-4">
                        <Drawer.Handle
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    <Drawer.Title
                        className="text-lg font-semibold mb-4"
                        style={{ color: "var(--ui-text-primary)" }}
                    >
                        {title}
                    </Drawer.Title>
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Preset name..."
                        className="w-full px-4 py-3 rounded-lg border text-sm mb-4"
                        style={{
                            backgroundColor: "var(--ui-bg-secondary)",
                            borderColor: "var(--ui-border-primary)",
                            color: "var(--ui-text-primary)",
                        }}
                        maxLength={32}
                    />
                    <div className="flex gap-3">
                        <Drawer.Close asChild>
                            <motion.button
                                className="flex-1 py-3 rounded-lg font-medium"
                                style={{
                                    backgroundColor: "var(--ui-bg-tertiary)",
                                    color: "var(--ui-text-secondary)",
                                }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                Cancel
                            </motion.button>
                        </Drawer.Close>
                        <motion.button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="flex-1 py-3 rounded-lg font-medium disabled:opacity-50"
                            style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            Save
                        </motion.button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
});
