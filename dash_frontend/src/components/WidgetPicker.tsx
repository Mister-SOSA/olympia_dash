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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left mb-1"
                        style={isEnabled ? {
                            backgroundColor: 'var(--ui-accent-primary-bg)',
                            borderColor: 'var(--ui-accent-primary-border)'
                        } : undefined}
                        onClick={onToggle}
                        onMouseEnter={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {/* Checkbox */}
                        <div
                            className="flex-shrink-0 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-colors"
                            style={isEnabled ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                borderColor: 'var(--ui-accent-primary)'
                            } : {
                                borderColor: 'var(--ui-border-secondary)'
                            }}
                        >
                            {isEnabled && (
                                <Check className="w-2.5 h-2.5" style={{ color: '#ffffff' }} strokeWidth={3} />
                            )}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span
                                className="text-sm font-medium truncate"
                                style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-primary)' }}
                            >
                                {widget.title}
                            </span>
                            {widget.beta && (
                                <span
                                    className="px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase border"
                                    style={{
                                        backgroundColor: 'var(--ui-warning-bg)',
                                        color: 'var(--ui-warning-text)',
                                        borderColor: 'var(--ui-warning-border)'
                                    }}
                                >
                                    Beta
                                </span>
                            )}
                            {showCategory && (
                                <span
                                    className="px-1.5 py-0.5 text-[10px] rounded border"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-tertiary)',
                                        color: 'var(--ui-text-muted)',
                                        borderColor: 'var(--ui-border-primary)'
                                    }}
                                >
                                    {widget.category}
                                </span>
                            )}
                        </div>

                        {/* Size */}
                        <span
                            className="flex-shrink-0 text-[11px] font-mono tabular-nums"
                            style={{ color: 'var(--ui-text-muted)' }}
                        >
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <p className="font-medium">{widget.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>{widget.description}</p>
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
            className="relative flex flex-col p-4 rounded-xl border transition-all text-left group"
            style={isEnabled ? {
                backgroundColor: 'var(--ui-accent-primary-bg)',
                borderColor: 'var(--ui-accent-primary-border)'
            } : {
                backgroundColor: 'var(--ui-bg-secondary)',
                borderColor: 'var(--ui-border-primary)'
            }}
            onClick={onToggle}
            onMouseEnter={(e) => {
                if (!isEnabled) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--ui-border-secondary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isEnabled) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                }
            }}
        >
            {/* Checkbox top right */}
            <div
                className="absolute top-3 right-3 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all"
                style={isEnabled ? {
                    backgroundColor: 'var(--ui-accent-primary)',
                    borderColor: 'var(--ui-accent-primary)'
                } : {
                    borderColor: 'var(--ui-border-secondary)'
                }}
            >
                {isEnabled && <Check className="w-3 h-3" style={{ color: '#ffffff' }} strokeWidth={3} />}
            </div>

            {/* Category icon */}
            <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: isEnabled ? 'var(--ui-accent-primary-bg)' : 'var(--ui-bg-tertiary)' }}
            >
                {IconComponent && (
                    <div style={{ color: isEnabled ? 'var(--ui-accent-primary)' : 'var(--ui-text-muted)' }}>
                        <IconComponent className="w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold mb-1 pr-6" style={{ color: 'var(--ui-text-primary)' }}>
                {widget.title}
            </h3>

            {/* Description */}
            <p className="text-xs line-clamp-2 mb-3 flex-1" style={{ color: 'var(--ui-text-muted)' }}>
                {widget.description}
            </p>

            {/* Footer: size + badges */}
            <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded" style={{
                    color: 'var(--ui-text-muted)',
                    backgroundColor: 'var(--ui-bg-tertiary)'
                }}>
                    {widget.defaultSize.w}×{widget.defaultSize.h}
                </span>
                {widget.beta && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{
                        backgroundColor: 'var(--ui-warning-bg)',
                        color: 'var(--ui-warning-text)'
                    }}>
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
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-left transition-all"
                        style={isEnabled ? {
                            backgroundColor: 'var(--ui-accent-primary-bg)',
                            borderColor: 'var(--ui-accent-primary-border)',
                            color: 'var(--ui-text-primary)'
                        } : {
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderColor: 'var(--ui-border-primary)',
                            color: 'var(--ui-text-secondary)'
                        }}
                        onClick={onToggle}
                        onMouseEnter={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                e.currentTarget.style.color = 'var(--ui-text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isEnabled) {
                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                                e.currentTarget.style.color = 'var(--ui-text-secondary)';
                            }
                        }}
                    >
                        <div
                            className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
                            style={isEnabled ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                borderColor: 'var(--ui-accent-primary)'
                            } : {
                                borderColor: 'var(--ui-border-secondary)'
                            }}
                        >
                            {isEnabled && <Check className="w-2 h-2" style={{ color: '#ffffff' }} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium truncate">{widget.title}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p className="font-medium text-sm">{widget.title}</p>
                    <p className="text-xs mt-1 max-w-[200px]" style={{ color: 'var(--ui-text-muted)' }}>{widget.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--ui-text-muted)' }}>Size: {widget.defaultSize.w}×{widget.defaultSize.h}</p>
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
            style={isSelected ? {
                backgroundColor: 'var(--ui-accent-primary)',
                color: '#ffffff'
            } : {
                color: 'var(--ui-text-secondary)'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--ui-text-secondary)';
                }
            }}
        >
            {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-sm font-semibold">{metadata.label}</span>
            <span className="text-xs tabular-nums" style={{
                color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--ui-text-muted)'
            }}>
                {enabledCount > 0 ? (
                    <><span style={{ color: isSelected ? '#ffffff' : 'var(--ui-accent-primary)', fontWeight: isSelected ? 600 : 500 }}>{enabledCount}</span>/{count}</>
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
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (!allSelected) {
                                    e.currentTarget.style.color = 'var(--ui-success)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-success-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!allSelected) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
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
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (!noneSelected) {
                                    e.currentTarget.style.color = 'var(--ui-danger)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!noneSelected) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
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
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--ui-accent-secondary)';
                                e.currentTarget.style.backgroundColor = 'var(--ui-accent-secondary-bg)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>Invert selection</TooltipContent>
                </Tooltip>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onReset}
                            disabled={!hasChanges}
                            className="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--ui-text-muted)' }}
                            onMouseEnter={(e) => {
                                if (hasChanges) {
                                    e.currentTarget.style.color = 'var(--ui-warning)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-warning-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (hasChanges) {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden shadow-2xl"
                style={{
                    backgroundColor: 'var(--ui-bg-primary)',
                    borderColor: 'var(--ui-border-primary)'
                }}
            >
                {/* Header - Clean with view modes */}
                <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--ui-border-primary)' }}>
                    <div className="px-5 py-3 flex items-center gap-3">
                        {/* Search - Primary, takes most space */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ui-text-muted)' }}>
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search widgets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none transition-colors placeholder:opacity-50"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderColor: 'var(--ui-border-primary)',
                                        color: 'var(--ui-text-primary)'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--ui-accent-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--ui-accent-primary-bg)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                        style={{ color: 'var(--ui-text-muted)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ui-text-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ui-text-muted)'}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* View Mode Switcher - Compact */}
                        <div className="flex items-center rounded-lg p-0.5 border" style={{
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderColor: 'var(--ui-border-primary)'
                        }}>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "list" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "list") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "list") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
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
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "cards" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "cards") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "cards") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
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
                                            className="p-2 rounded-md transition-all"
                                            style={viewMode === "compact" ? {
                                                backgroundColor: 'var(--ui-accent-primary)',
                                                color: '#ffffff'
                                            } : {
                                                color: 'var(--ui-text-muted)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (viewMode !== "compact") {
                                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (viewMode !== "compact") {
                                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Compact view</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="w-px h-6" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                        {/* Status */}
                        <div className="flex items-center gap-3">
                            {activePresetName && (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)'
                                }}>
                                    <div style={{ color: 'var(--ui-accent-primary)' }}>
                                        <Sparkles className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: 'var(--ui-accent-primary)' }}>{activePresetName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums" style={enabledCount > 0 ? {
                                backgroundColor: 'var(--ui-success-bg)',
                                color: 'var(--ui-success-text)'
                            } : {
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-muted)'
                            }}>
                                {enabledCount} active
                            </div>
                            {hasChanges && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{
                                    backgroundColor: 'var(--ui-warning-bg)',
                                    color: 'var(--ui-warning-text)'
                                }}>
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ui-warning)' }} />
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

                            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                                style={{ color: 'var(--ui-text-muted)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={hasChanges ? {
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    color: '#ffffff'
                                } : {
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    color: 'var(--ui-text-muted)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-border-primary)'
                                }}
                                onMouseEnter={(e) => {
                                    if (hasChanges) {
                                        e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary-hover)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (hasChanges) {
                                        e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary)';
                                    }
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-56 flex-shrink-0 border-r p-3 overflow-y-auto" style={{
                        borderColor: 'var(--ui-border-primary)'
                    }}>
                        {/* All Widgets */}
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left mb-2"
                            style={selectedCategory === "all" ? {
                                backgroundColor: 'var(--ui-accent-primary)',
                                color: '#ffffff'
                            } : {
                                color: 'var(--ui-text-secondary)'
                            }}
                            onClick={() => setSelectedCategory("all")}
                            onMouseEnter={(e) => {
                                if (selectedCategory !== "all") {
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedCategory !== "all") {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--ui-text-secondary)';
                                }
                            }}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="flex-1 text-sm font-semibold">All Widgets</span>
                            <span className="text-xs tabular-nums" style={{
                                color: selectedCategory === "all" ? 'rgba(255, 255, 255, 0.8)' : 'var(--ui-text-muted)'
                            }}>
                                {enabledCount > 0 ? (
                                    <><span style={{ color: selectedCategory === "all" ? '#ffffff' : 'var(--ui-accent-primary)', fontWeight: selectedCategory === "all" ? 600 : 500 }}>{enabledCount}</span>/{totalCount}</>
                                ) : (
                                    totalCount
                                )}
                            </span>
                        </button>

                        <div className="h-px my-2" style={{ backgroundColor: 'var(--ui-border-primary)' }} />

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
                        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--ui-border-primary)' }}>
                            <p className="text-[10px] uppercase tracking-wider font-medium mb-2 px-1" style={{ color: 'var(--ui-text-muted)' }}>Shortcuts</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { label: "Search", keys: "⌘F" },
                                    { label: "Save", keys: "⌘↵" },
                                    { label: "Close", keys: "Esc" },
                                ].map(({ label, keys }) => (
                                    <div key={label} className="flex items-center justify-between px-1" style={{ color: 'var(--ui-text-muted)' }}>
                                        <span>{label}</span>
                                        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{
                                            backgroundColor: 'var(--ui-bg-tertiary)'
                                        }}>{keys}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Widget Content - View Mode Dependent */}
                    <div ref={listRef} className="flex-1 overflow-y-auto">
                        {permissionsLoading ? (
                            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--ui-text-muted)' }}>
                                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{
                                    borderColor: 'var(--ui-accent-primary)'
                                }} />
                                <p className="text-sm">Loading widgets...</p>
                            </div>
                        ) : filteredWidgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full px-8" style={{ color: 'var(--ui-text-muted)' }}>
                                <div style={{ opacity: 0.3 }}>
                                    <Search className="w-10 h-10 mb-4" />
                                </div>
                                <p className="font-medium" style={{ color: 'var(--ui-text-secondary)' }}>No widgets found</p>
                                <p className="text-sm mt-1 text-center" style={{ color: 'var(--ui-text-muted)' }}>
                                    {searchTerm ? `No results for "${searchTerm}"` : "No widgets in this category."}
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="mt-4 px-4 py-2 text-sm rounded-lg transition-colors"
                                        style={{
                                            backgroundColor: 'var(--ui-bg-tertiary)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-bg-quaternary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)'}
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
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-5 h-5" /></div>}
                                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </h3>
                                                    <span className="text-xs ml-1" style={{ color: 'var(--ui-text-muted)' }}>
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
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-4 h-4" /></div>}
                                                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-secondary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
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
                                            <div className="flex items-center gap-2 px-3 py-2 sticky top-0 z-10 border-b" style={{
                                                backgroundColor: 'var(--ui-bg-primary)',
                                                borderColor: 'var(--ui-border-primary)'
                                            }}>
                                                <div className="flex items-center gap-2 flex-1">
                                                    {IconComponent && <div style={{ color: 'var(--ui-text-muted)' }}><IconComponent className="w-4 h-4" /></div>}
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                                        {CATEGORY_METADATA[category].label}
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                                        {stats?.enabled || 0}/{stats?.total || 0}
                                                    </span>
                                                </div>

                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => toggleAllInCategory(category, true)}
                                                                disabled={allEnabled}
                                                                className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                style={{ color: 'var(--ui-text-muted)' }}
                                                                onMouseEnter={(e) => {
                                                                    if (!allEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-success)';
                                                                        e.currentTarget.style.backgroundColor = 'var(--ui-success-bg)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!allEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }
                                                                }}
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
                                                                className="p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                style={{ color: 'var(--ui-text-muted)' }}
                                                                onMouseEnter={(e) => {
                                                                    if (!noneEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-danger)';
                                                                        e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!noneEnabled) {
                                                                        e.currentTarget.style.color = 'var(--ui-text-muted)';
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }
                                                                }}
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
                                <div className="flex items-center justify-between px-3 py-2 mb-2 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
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
                <div className="px-6 py-2.5 border-t flex items-center justify-between" style={{
                    borderColor: 'var(--ui-border-primary)',
                    backgroundColor: 'var(--ui-bg-secondary)'
                }}>
                    <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>Space</kbd>
                            Toggle widget
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>⌘F</kbd>
                            Search
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>⌘↵</kbd>
                            Save
                        </span>
                        <span className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>Esc</kbd>
                            {searchTerm ? "Clear search" : "Close"}
                        </span>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
                        {filteredWidgets.length} widgets
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
