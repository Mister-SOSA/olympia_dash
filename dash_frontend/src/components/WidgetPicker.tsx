"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Widget } from "@/types";
import {
    WIDGET_CONFIGS,
    WidgetConfig,
    WidgetCategory,
    CATEGORY_ORDER,
    CATEGORY_METADATA,
    searchWidgets,
    groupWidgetsByCategory,
    getAvailableCategories,
} from "@/components/widgets/registry";
import {
    X,
    Search,
    Check,
    Package,
    DollarSign,
    ShoppingCart,
    Wrench,
    Receipt,
    BarChart3,
    FileText,
    Settings2,
    Sparkles,
    LayoutGrid,
    Minus,
    Plus,
    RotateCcw,
    CheckCheck,
    XCircle,
    Shuffle,
    List,
    Grid3X3,
    LayoutDashboard,
} from "lucide-react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================
// Category Icons
// ============================================

const CATEGORY_ICONS: Record<WidgetCategory, React.ComponentType<{ className?: string }>> = {
    Sales: DollarSign,
    Purchasing: ShoppingCart,
    Inventory: Package,
    AP: Receipt,
    Analytics: BarChart3,
    Reports: FileText,
    Operations: Settings2,
    Utilities: Wrench,
};

// ============================================
// Types
// ============================================

interface WidgetPickerProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
    activePresetName?: string;
}

// ============================================
// Widget Row Component
// ============================================

interface WidgetRowProps {
    widget: WidgetConfig;
    isEnabled: boolean;
    onToggle: () => void;
    showCategory?: boolean;
}

const WidgetRow = React.memo(({ widget, isEnabled, onToggle, showCategory }: WidgetRowProps) => {
    return (
        <TooltipProvider delayDuration={400}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${isEnabled
                                ? "bg-ui-accent-primary/15"
                                : "hover:bg-white/5"
                            }`}
                        onClick={onToggle}
                    >
                        {/* Checkbox */}
                        <div
                            className={`flex-shrink-0 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-colors ${isEnabled
                                    ? "bg-ui-accent-primary border-ui-accent-primary"
                                    : "border-white/25 group-hover:border-white/40"
                                }`}
                        >
                            {isEnabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`text-sm truncate ${isEnabled ? "text-white font-medium" : "text-white/70 group-hover:text-white/90"
                                }`}>
                                {widget.title}
                            </span>
                            {widget.beta && (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/20 text-amber-400 rounded uppercase">
                                    Beta
                                </span>
                            )}
                            {showCategory && (
                                <span className="px-1.5 py-0.5 text-[10px] text-white/40 bg-white/5 rounded">
                                    {widget.category}
                                </span>
                            )}
                        </div>

                        {/* Size */}
                        <span className="flex-shrink-0 text-[11px] text-white/30 font-mono tabular-nums">
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p className="font-medium">{widget.title}</p>
                    <p className="text-xs text-white/60 mt-1">{widget.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WidgetRow.displayName = "WidgetRow";

// ============================================
// Widget Card (Visual card view)
// ============================================

const WidgetCard = React.memo(({ widget, isEnabled, onToggle }: WidgetRowProps) => {
    const IconComponent = CATEGORY_ICONS[widget.category];

    return (
        <button
            className={`relative flex flex-col p-4 rounded-xl border transition-all text-left group ${isEnabled
                    ? "bg-ui-accent-primary/15 border-ui-accent-primary/30"
                    : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                }`}
            onClick={onToggle}
        >
            {/* Checkbox top right */}
            <div
                className={`absolute top-3 right-3 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all ${isEnabled
                        ? "bg-ui-accent-primary border-ui-accent-primary"
                        : "border-white/20 group-hover:border-white/40"
                    }`}
            >
                {isEnabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>

            {/* Category icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isEnabled ? "bg-ui-accent-primary/20" : "bg-white/5"
                }`}>
                {IconComponent && <IconComponent className={`w-5 h-5 ${isEnabled ? "text-ui-accent-primary" : "text-white/40"}`} />}
            </div>

            {/* Title */}
            <h3 className={`text-sm font-medium mb-1 pr-6 ${isEnabled ? "text-white" : "text-white/80"}`}>
                {widget.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-white/40 line-clamp-2 mb-3 flex-1">
                {widget.description}
            </p>

            {/* Footer: size + badges */}
            <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] text-white/30 font-mono tabular-nums bg-white/5 px-1.5 py-0.5 rounded">
                    {widget.defaultSize.w}×{widget.defaultSize.h}
                </span>
                {widget.beta && (
                    <span className="text-[9px] font-semibold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">
                        Beta
                    </span>
                )}
            </div>
        </button>
    );
});

WidgetCard.displayName = "WidgetCard";

// ============================================
// Widget Compact (Dense grid for power users)
// ============================================

const WidgetCompact = React.memo(({ widget, isEnabled, onToggle }: WidgetRowProps) => {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left transition-all ${isEnabled
                                ? "bg-ui-accent-primary/20 border-ui-accent-primary/30 text-white"
                                : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white/80"
                            }`}
                        onClick={onToggle}
                    >
                        <div
                            className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${isEnabled
                                    ? "bg-ui-accent-primary border-ui-accent-primary"
                                    : "border-white/30"
                                }`}
                        >
                            {isEnabled && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium truncate">{widget.title}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p className="font-medium text-sm">{widget.title}</p>
                    <p className="text-xs text-white/60 mt-1 max-w-[200px]">{widget.description}</p>
                    <p className="text-[10px] text-white/40 mt-1">Size: {widget.defaultSize.w}×{widget.defaultSize.h}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

WidgetCompact.displayName = "WidgetCompact";

// ============================================
// Category Sidebar Item
// ============================================

interface CategorySidebarItemProps {
    category: WidgetCategory;
    count: number;
    enabledCount: number;
    isSelected: boolean;
    onClick: () => void;
}

const CategorySidebarItem = React.memo(({
    category,
    count,
    enabledCount,
    isSelected,
    onClick,
}: CategorySidebarItemProps) => {
    const IconComponent = CATEGORY_ICONS[category];
    const metadata = CATEGORY_METADATA[category];

    return (
        <button
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${isSelected
                    ? "bg-ui-accent-primary text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                }`}
            onClick={onClick}
        >
            {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{metadata.label}</span>
            <span className={`text-xs tabular-nums ${isSelected ? "text-white/70" : "text-white/40"}`}>
                {enabledCount > 0 ? (
                    <><span className={isSelected ? "text-white" : "text-ui-accent-primary"}>{enabledCount}</span>/{count}</>
                ) : (
                    count
                )}
            </span>
        </button>
    );
});

CategorySidebarItem.displayName = "CategorySidebarItem";

// ============================================
// Quick Actions
// ============================================

interface QuickActionsProps {
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onInvert: () => void;
    onReset: () => void;
    enabledCount: number;
    totalCount: number;
    hasChanges: boolean;
}

const QuickActions = React.memo(({
    onSelectAll,
    onDeselectAll,
    onInvert,
    onReset,
    enabledCount,
    totalCount,
    hasChanges,
}: QuickActionsProps) => {
    const allSelected = enabledCount === totalCount;
    const noneSelected = enabledCount === 0;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onSelectAll}
                            disabled={allSelected}
                            className="p-2 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <CheckCheck className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Select all visible</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onDeselectAll}
                            disabled={noneSelected}
                            className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onInvert}
                            className="p-2 rounded-lg text-white/40 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Invert selection</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onReset}
                            disabled={!hasChanges}
                            className="p-2 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Reset changes</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
});

QuickActions.displayName = "QuickActions";

// ============================================
// Main Component
// ============================================

export default function WidgetPicker({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
    activePresetName,
}: WidgetPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
    const [viewMode, setViewMode] = useState<"list" | "cards" | "compact">("list");
    const [initialLayout] = useState(() => JSON.parse(JSON.stringify(tempLayout)));
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Track changes made this session for the "changes" pill
    const [sessionChanges, setSessionChanges] = useState<Set<string>>(new Set());

    const { filterAccessibleWidgets, loading: permissionsLoading } = useWidgetPermissions();

    // Get accessible widgets
    const accessibleWidgets = useMemo(() => {
        return filterAccessibleWidgets(WIDGET_CONFIGS, "view") as WidgetConfig[];
    }, [filterAccessibleWidgets]);

    // Filter widgets
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

    // Group widgets by category
    const groupedWidgets = useMemo(() => groupWidgetsByCategory(filteredWidgets), [filteredWidgets]);

    // Enabled widget IDs
    const enabledWidgets = useMemo(() => {
        return new Set(tempLayout.filter((w) => w.enabled).map((w) => w.id));
    }, [tempLayout]);

    // Category stats
    const categoryStats = useMemo(() => {
        const stats: Record<string, { total: number; enabled: number }> = {};
        accessibleWidgets.forEach((w) => {
            if (!stats[w.category]) stats[w.category] = { total: 0, enabled: 0 };
            stats[w.category].total++;
            if (enabledWidgets.has(w.id)) stats[w.category].enabled++;
        });
        return stats;
    }, [accessibleWidgets, enabledWidgets]);

    // Check for unsaved changes
    const hasChanges = useMemo(() => {
        const initialEnabled = new Set<string>(initialLayout.filter((w: Widget) => w.enabled).map((w: Widget) => w.id));
        if (initialEnabled.size !== enabledWidgets.size) return true;
        for (const id of Array.from(initialEnabled)) {
            if (!enabledWidgets.has(id)) return true;
        }
        return false;
    }, [initialLayout, enabledWidgets]);

    // Toggle widget
    const toggleWidget = useCallback((widgetId: string) => {
        const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
        if (!widgetDef) return;

        const existingWidget = tempLayout.find((w) => w.id === widgetId);
        const isCurrentlyEnabled = existingWidget?.enabled || false;

        // Track this change
        setSessionChanges(prev => new Set(prev).add(widgetId));

        if (existingWidget) {
            setTempLayout((prev) =>
                prev.map((w) => w.id === widgetId ? { ...w, enabled: !isCurrentlyEnabled } : w)
            );
        } else {
            const newWidget: Widget = {
                id: widgetId,
                x: 0, y: 0,
                w: widgetDef.defaultSize.w,
                h: widgetDef.defaultSize.h,
                enabled: true,
                displayName: widgetDef.title,
                category: widgetDef.category,
                description: widgetDef.description,
            };
            setTempLayout((prev) => [...prev, newWidget]);
        }
    }, [tempLayout, setTempLayout]);

    // Bulk toggle category
    const toggleAllInCategory = useCallback((category: WidgetCategory, enable: boolean) => {
        const categoryWidgets = accessibleWidgets.filter((w) => w.category === category);
        const widgetIds = categoryWidgets.map((w) => w.id);

        setTempLayout((prev) => {
            const updated = [...prev];
            widgetIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: enable };
                } else if (enable) {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [accessibleWidgets, setTempLayout]);

    // Global bulk actions
    const selectAllVisible = useCallback(() => {
        const visibleIds = filteredWidgets.map((w) => w.id);
        setTempLayout((prev) => {
            const updated = [...prev];
            visibleIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: true };
                } else {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [filteredWidgets, setTempLayout]);

    const deselectAllVisible = useCallback(() => {
        const visibleIds = new Set(filteredWidgets.map((w) => w.id));
        setTempLayout((prev) => prev.map((w) => visibleIds.has(w.id) ? { ...w, enabled: false } : w));
    }, [filteredWidgets, setTempLayout]);

    const invertSelection = useCallback(() => {
        const visibleIds = new Set(filteredWidgets.map((w) => w.id));
        setTempLayout((prev) => {
            const updated = [...prev];
            visibleIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);
                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: !updated[existingIndex].enabled };
                } else {
                    const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId, x: 0, y: 0,
                            w: widgetDef.defaultSize.w, h: widgetDef.defaultSize.h,
                            enabled: true,
                            displayName: widgetDef.title,
                            category: widgetDef.category,
                            description: widgetDef.description,
                        });
                    }
                }
            });
            return updated;
        });
    }, [filteredWidgets, setTempLayout]);

    const resetChanges = useCallback(() => {
        setTempLayout(JSON.parse(JSON.stringify(initialLayout)));
    }, [initialLayout, setTempLayout]);

    // Stats
    const enabledCount = tempLayout.filter((w) => w.enabled).length;
    const totalCount = accessibleWidgets.length;
    const visibleEnabledCount = filteredWidgets.filter((w) => enabledWidgets.has(w.id)).length;
    const categories = getAvailableCategories();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "Escape" && searchTerm) {
                e.preventDefault();
                setSearchTerm("");
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchTerm, handleSave]);

    // Scroll to top on category change
    useEffect(() => {
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [selectedCategory]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="bg-[#161616] rounded-xl border border-white/10 w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden shadow-2xl"
            >
                {/* Header - Clean with view modes */}
                <div className="flex-shrink-0 border-b border-white/10">
                    <div className="px-5 py-3 flex items-center gap-3">
                        {/* Search - Primary, takes most space */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search widgets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-ui-accent-primary/50 focus:outline-none transition-colors"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* View Mode Switcher - Compact */}
                        <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className={`p-2 rounded-md transition-all ${viewMode === "list"
                                                    ? "bg-ui-accent-primary text-white"
                                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>List view</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("cards")}
                                            className={`p-2 rounded-md transition-all ${viewMode === "cards"
                                                    ? "bg-ui-accent-primary text-white"
                                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Card view</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("compact")}
                                            className={`p-2 rounded-md transition-all ${viewMode === "compact"
                                                    ? "bg-ui-accent-primary text-white"
                                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                                }`}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Compact view</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="w-px h-6 bg-white/10" />

                        {/* Status */}
                        <div className="flex items-center gap-3">
                            {activePresetName && (
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-ui-accent-primary/10 rounded-lg">
                                    <Sparkles className="w-3 h-3 text-ui-accent-primary" />
                                    <span className="text-xs text-ui-accent-primary font-medium">{activePresetName}</span>
                                </div>
                            )}
                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums ${enabledCount > 0
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-white/5 text-white/40"
                                }`}>
                                {enabledCount} active
                            </div>
                            {hasChanges && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    Unsaved
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <QuickActions
                                onSelectAll={selectAllVisible}
                                onDeselectAll={deselectAllVisible}
                                onInvert={invertSelection}
                                onReset={resetChanges}
                                enabledCount={visibleEnabledCount}
                                totalCount={filteredWidgets.length}
                                hasChanges={hasChanges}
                            />

                            <div className="w-px h-6 bg-white/10 mx-1" />

                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${hasChanges
                                        ? "bg-ui-accent-primary text-white hover:bg-ui-accent-primary/90"
                                        : "bg-white/5 text-white/30 cursor-not-allowed"
                                    }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-56 flex-shrink-0 border-r border-white/10 p-3 overflow-y-auto">
                        {/* All Widgets */}
                        <button
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left mb-2 ${selectedCategory === "all"
                                    ? "bg-ui-accent-primary text-white"
                                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                                }`}
                            onClick={() => setSelectedCategory("all")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="flex-1 text-sm font-medium">All Widgets</span>
                            <span className={`text-xs tabular-nums ${selectedCategory === "all" ? "text-white/70" : "text-white/40"}`}>
                                {enabledCount > 0 ? (
                                    <><span className={selectedCategory === "all" ? "text-white" : "text-ui-accent-primary"}>{enabledCount}</span>/{totalCount}</>
                                ) : (
                                    totalCount
                                )}
                            </span>
                        </button>

                        <div className="h-px bg-white/10 my-2" />

                        {/* Categories */}
                        <div className="space-y-0.5">
                            {categories.map((category) => (
                                <CategorySidebarItem
                                    key={category}
                                    category={category}
                                    count={categoryStats[category]?.total || 0}
                                    enabledCount={categoryStats[category]?.enabled || 0}
                                    isSelected={selectedCategory === category}
                                    onClick={() => setSelectedCategory(category)}
                                />
                            ))}
                        </div>

                        {/* Shortcuts */}
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2 px-1">Shortcuts</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { label: "Search", keys: "⌘F" },
                                    { label: "Save", keys: "⌘↵" },
                                    { label: "Close", keys: "Esc" },
                                ].map(({ label, keys }) => (
                                    <div key={label} className="flex items-center justify-between px-1 text-white/40">
                                        <span>{label}</span>
                                        <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">{keys}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Widget Content - View Mode Dependent */}
                    <div ref={listRef} className="flex-1 overflow-y-auto">
                        {permissionsLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/40">
                                <div className="w-6 h-6 border-2 border-ui-accent-primary border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-sm">Loading widgets...</p>
                            </div>
                        ) : filteredWidgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/40 px-8">
                                <Search className="w-10 h-10 mb-4 opacity-30" />
                                <p className="font-medium text-white/60">No widgets found</p>
                                <p className="text-sm mt-1 text-white/40 text-center">
                                    {searchTerm ? `No results for "${searchTerm}"` : "No widgets in this category."}
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="mt-4 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : viewMode === "cards" ? (
                            // Card Grid View
                            <div className="p-4">
                                {selectedCategory === "all" && !searchTerm ? (
                                    // Grouped cards
                                    CATEGORY_ORDER.map((category) => {
                                        const widgets = groupedWidgets[category];
                                        if (!widgets?.length) return null;
                                        const stats = categoryStats[category];
                                        const IconComponent = CATEGORY_ICONS[category];

                                        return (
                                            <div key={category} className="mb-8 last:mb-0">
                                                <div className="flex items-center gap-2 mb-4">
                                                    {IconComponent && <IconComponent className="w-5 h-5 text-white/40" />}
                                                    <h3 className="text-sm font-semibold text-white">
                                                        {CATEGORY_METADATA[category].label}
                                                    </h3>
                                                    <span className="text-xs text-white/30 ml-1">
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                    {widgets.map((widget) => (
                                                        <WidgetCard
                                                            key={widget.id}
                                                            widget={widget}
                                                            isEnabled={enabledWidgets.has(widget.id)}
                                                            onToggle={() => toggleWidget(widget.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Flat card grid
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {filteredWidgets.map((widget) => (
                                            <WidgetCard
                                                key={widget.id}
                                                widget={widget}
                                                isEnabled={enabledWidgets.has(widget.id)}
                                                onToggle={() => toggleWidget(widget.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : viewMode === "compact" ? (
                            // Compact Dense Grid
                            <div className="p-4">
                                {selectedCategory === "all" && !searchTerm ? (
                                    // Grouped compact
                                    CATEGORY_ORDER.map((category) => {
                                        const widgets = groupedWidgets[category];
                                        if (!widgets?.length) return null;
                                        const stats = categoryStats[category];
                                        const IconComponent = CATEGORY_ICONS[category];

                                        return (
                                            <div key={category} className="mb-5 last:mb-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {IconComponent && <IconComponent className="w-4 h-4 text-white/40" />}
                                                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-[10px] text-white/30">
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {widgets.map((widget) => (
                                                        <WidgetCompact
                                                            key={widget.id}
                                                            widget={widget}
                                                            isEnabled={enabledWidgets.has(widget.id)}
                                                            onToggle={() => toggleWidget(widget.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Flat compact
                                    <div className="flex flex-wrap gap-1.5">
                                        {filteredWidgets.map((widget) => (
                                            <WidgetCompact
                                                key={widget.id}
                                                widget={widget}
                                                isEnabled={enabledWidgets.has(widget.id)}
                                                onToggle={() => toggleWidget(widget.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : selectedCategory === "all" && !searchTerm ? (
                            // List View - Grouped
                            <div className="p-4">
                                {CATEGORY_ORDER.map((category) => {
                                    const widgets = groupedWidgets[category];
                                    if (!widgets?.length) return null;
                                    const stats = categoryStats[category];
                                    const IconComponent = CATEGORY_ICONS[category];
                                    const allEnabled = stats?.enabled === stats?.total;
                                    const noneEnabled = stats?.enabled === 0;

                                    return (
                                        <div key={category} className="mb-6 last:mb-0">
                                            {/* Category Header */}
                                            <div className="flex items-center gap-2 px-3 py-2 sticky top-0 bg-[#161616] z-10 border-b border-white/5">
                                                <div className="flex items-center gap-2 flex-1">
                                                    {IconComponent && <IconComponent className="w-4 h-4 text-white/40" />}
                                                    <span className="text-sm font-semibold text-white">
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-xs text-white/30">
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>

                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => toggleAllInCategory(category, true)}
                                                                disabled={allEnabled}
                                                                className="p-1.5 rounded text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Enable all</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => toggleAllInCategory(category, false)}
                                                                disabled={noneEnabled}
                                                                className="p-1.5 rounded text-white/30 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Disable all</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            {/* Widgets */}
                                            <div className="mt-1">
                                                {widgets.map((widget) => (
                                                    <WidgetRow
                                                        key={widget.id}
                                                        widget={widget}
                                                        isEnabled={enabledWidgets.has(widget.id)}
                                                        onToggle={() => toggleWidget(widget.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // List View - Flat
                            <div className="p-4">
                                <div className="flex items-center justify-between px-3 py-2 mb-2 text-xs text-white/40">
                                    <span>{filteredWidgets.length} result{filteredWidgets.length !== 1 ? "s" : ""}</span>
                                    <span>{visibleEnabledCount} selected</span>
                                </div>
                                {filteredWidgets.map((widget) => (
                                    <WidgetRow
                                        key={widget.id}
                                        widget={widget}
                                        isEnabled={enabledWidgets.has(widget.id)}
                                        onToggle={() => toggleWidget(widget.id)}
                                        showCategory={selectedCategory === "all"}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Minimal, keyboard hints only */}
                <div className="px-6 py-2.5 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Space</kbd>
                            Toggle widget
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">⌘F</kbd>
                            Search
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">⌘↵</kbd>
                            Save
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Esc</kbd>
                            {searchTerm ? "Clear search" : "Close"}
                        </span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">
                        {filteredWidgets.length} widgets
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
