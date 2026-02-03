"use client";

import React, { memo, useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { Drawer } from "vaul";
import {
    MdWidgets,
    MdClose,
    MdTune,
    MdSearch,
    MdCheck,
} from "react-icons/md";
import { getWidgetById } from "@/constants/widgets";
import {
    WIDGET_CONFIGS,
    type WidgetCategory,
    getWidgetConfig,
    getAvailableCategories,
    searchWidgets,
    type WidgetConfig,
} from "@/components/widgets/registry";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { Loader } from "@/components/ui/loader";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import WidgetSettingsDialog from "@/components/WidgetSettingsDialog";
import { getWidgetSettingsSchema } from "@/constants/widgetSettings";
import { CATEGORY_ICONS, getWidgetTypeIcon, vibrate } from "./utils";

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
    const config = widgetId ? getWidgetConfig(widgetId) : null;
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
    onClose: () => void;
}

export const MobileWidgetPicker = memo(function MobileWidgetPicker({
    isOpen,
    enabledWidgetIds,
    onToggleWidget,
    onClose,
}: MobileWidgetPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
    const { filterAccessibleWidgets } = useWidgetPermissions();

    const accessibleWidgets = useMemo(
        () => filterAccessibleWidgets(WIDGET_CONFIGS, "view") as WidgetConfig[],
        [filterAccessibleWidgets]
    );

    const filteredWidgets = useMemo(() => {
        let widgets = accessibleWidgets;
        if (selectedCategory !== "all") {
            widgets = widgets.filter((w) => w.category === selectedCategory);
        }
        if (searchTerm) {
            widgets = searchWidgets(searchTerm, widgets);
        }
        return widgets;
    }, [accessibleWidgets, searchTerm, selectedCategory]);

    const categories = useMemo(() => getAvailableCategories(), []);
    const enabledSet = useMemo(() => new Set(enabledWidgetIds), [enabledWidgetIds]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => setSearchTerm(""), []);

    const handleToggle = useCallback(
        (widgetId: string) => {
            vibrate(10);
            onToggleWidget(widgetId);
        },
        [onToggleWidget]
    );

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onClose();
        }
    }, [onClose]);

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
                    <div className="flex justify-center pt-3 pb-2">
                        <Drawer.Handle
                            className="w-10 h-1 rounded-full"
                            style={{ backgroundColor: "var(--ui-border-secondary)" }}
                        />
                    </div>

                    {/* Header */}
                    <div
                        className="flex-shrink-0 border-b"
                        style={{ borderColor: "var(--ui-border-primary)" }}
                    >
                        <div className="px-4 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MdWidgets className="w-5 h-5" style={{ color: "var(--ui-accent-primary)" }} />
                                <div>
                                    <Drawer.Title
                                        className="text-lg font-semibold"
                                        style={{ color: "var(--ui-text-primary)" }}
                                    >
                                        Add Widgets
                                    </Drawer.Title>
                                    <p className="text-xs" style={{ color: "var(--ui-text-muted)" }}>
                                        {enabledSet.size} selected
                                    </p>
                                </div>
                            </div>
                            <Drawer.Close asChild>
                                <button
                                    className="p-2 rounded-lg active:scale-95 transition-transform"
                                    style={{ color: "var(--ui-text-secondary)" }}
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </Drawer.Close>
                        </div>

                        {/* Search */}
                        <div className="px-4 pb-3">
                            <div className="relative">
                                <MdSearch
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: "var(--ui-text-muted)" }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search widgets..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm"
                                    style={{
                                        backgroundColor: "var(--ui-bg-secondary)",
                                        borderColor: "var(--ui-border-primary)",
                                        color: "var(--ui-text-primary)",
                                    }}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        style={{ color: "var(--ui-text-muted)" }}
                                        aria-label="Clear search"
                                    >
                                        <MdClose className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
                            <div className="flex gap-2" role="tablist" aria-label="Widget categories">
                                <button
                                    onClick={() => setSelectedCategory("all")}
                                    role="tab"
                                    aria-selected={selectedCategory === "all"}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95"
                                    style={
                                        selectedCategory === "all"
                                            ? { backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }
                                            : { backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }
                                    }
                                >
                                    All
                                </button>
                                {categories.map((category) => {
                                    const IconComponent = CATEGORY_ICONS[category];
                                    return (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            role="tab"
                                            aria-selected={selectedCategory === category}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95"
                                            style={
                                                selectedCategory === category
                                                    ? { backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }
                                                    : { backgroundColor: "var(--ui-bg-tertiary)", color: "var(--ui-text-secondary)" }
                                            }
                                        >
                                            {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                                            <span>{category}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Widget List */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {filteredWidgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12">
                                <MdWidgets
                                    className="w-12 h-12 mb-3 opacity-40"
                                    style={{ color: "var(--ui-text-tertiary)" }}
                                />
                                <p className="font-medium" style={{ color: "var(--ui-text-secondary)" }}>
                                    No widgets found
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-8">
                                {filteredWidgets.map((widget) => {
                                    const isEnabled = enabledSet.has(widget.id);
                                    const TypeIcon = getWidgetTypeIcon(widget.id);

                                    return (
                                        <motion.button
                                            key={widget.id}
                                            onClick={() => handleToggle(widget.id)}
                                            className="w-full flex items-start gap-3 p-4 rounded-xl border text-left"
                                            style={
                                                isEnabled
                                                    ? {
                                                        backgroundColor: "var(--ui-accent-primary-bg)",
                                                        borderColor: "var(--ui-accent-primary-border)",
                                                    }
                                                    : {
                                                        backgroundColor: "var(--ui-bg-secondary)",
                                                        borderColor: "var(--ui-border-primary)",
                                                    }
                                            }
                                            aria-pressed={isEnabled}
                                            whileTap={{ scale: 0.98 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <div
                                                className="flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition-all"
                                                style={
                                                    isEnabled
                                                        ? {
                                                            backgroundColor: "var(--ui-accent-primary)",
                                                            borderColor: "var(--ui-accent-primary)",
                                                        }
                                                        : {
                                                            borderColor: "var(--ui-border-secondary)",
                                                        }
                                                }
                                            >
                                                {isEnabled && <MdCheck className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3
                                                    className="font-semibold truncate"
                                                    style={{
                                                        color: isEnabled
                                                            ? "var(--ui-accent-primary)"
                                                            : "var(--ui-text-primary)",
                                                    }}
                                                >
                                                    {widget.title}
                                                </h3>
                                                <p
                                                    className="text-sm line-clamp-2"
                                                    style={{ color: "var(--ui-text-muted)" }}
                                                >
                                                    {widget.description}
                                                </p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        className="flex-shrink-0 border-t p-4 safe-bottom"
                        style={{ borderColor: "var(--ui-border-primary)" }}
                    >
                        <Drawer.Close asChild>
                            <motion.button
                                className="w-full py-3 rounded-xl font-semibold"
                                style={{ backgroundColor: "var(--ui-accent-primary)", color: "#ffffff" }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
