"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Widget } from "@/types";
import {
    WIDGET_CONFIGS,
    WidgetConfig,
    WidgetCategory,
    getAvailableCategories,
    searchWidgets,
} from "@/components/widgets/registry";
import { X, Search, Grid3x3, Check, Package, DollarSign, ShoppingCart, Wrench, Receipt, BarChart3, FileText, Settings2 } from "lucide-react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";

// Category icons mapping
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

interface MobileWidgetMenuProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
    activePresetName?: string;
}

export default function MobileWidgetMenu({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
    activePresetName,
}: MobileWidgetMenuProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");

    const { filterAccessibleWidgets, loading: permissionsLoading } = useWidgetPermissions();

    const categories = getAvailableCategories();

    // Get accessible widgets filtered by permissions
    const accessibleWidgets = useMemo(() => {
        return filterAccessibleWidgets(WIDGET_CONFIGS, 'view') as WidgetConfig[];
    }, [filterAccessibleWidgets]);

    const filteredWidgets = useMemo(() => {
        let widgets = accessibleWidgets;

        if (selectedCategory !== "all") {
            widgets = widgets.filter((w) => w.category === selectedCategory);
        }

        if (searchTerm) {
            widgets = searchWidgets(searchTerm, widgets);
        }

        return widgets;
    }, [searchTerm, selectedCategory, accessibleWidgets]);

    const isWidgetEnabled = (widgetId: string) => {
        return tempLayout.find((w) => w.id === widgetId)?.enabled || false;
    };

    const toggleWidget = (widgetId: string) => {
        const widgetDef = WIDGET_CONFIGS.find((w) => w.id === widgetId);
        if (!widgetDef) return;

        const existingWidget = tempLayout.find((w) => w.id === widgetId);
        const isCurrentlyEnabled = existingWidget?.enabled || false;

        if (existingWidget) {
            // Reset to default size when re-enabling a previously disabled widget
            setTempLayout((prev) =>
                prev.map((w) => (w.id === widgetId ? {
                    ...w,
                    enabled: !isCurrentlyEnabled,
                    w: widgetDef.defaultSize.w,
                    h: widgetDef.defaultSize.h,
                } : w))
            );
        } else {
            const newWidget: Widget = {
                id: widgetId,
                x: 0,
                y: 0,
                w: widgetDef.defaultSize.w,
                h: widgetDef.defaultSize.h,
                enabled: true,
                displayName: widgetDef.title,
                category: widgetDef.category,
                description: widgetDef.description,
            };
            setTempLayout((prev) => [...prev, newWidget]);
        }
    };

    const enabledCount = tempLayout.filter((w) => w.enabled).length;

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="mobile-widget-menu"
        >
            {/* Header - Sticky */}
            <div className="mobile-widget-menu-header">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Grid3x3 className="w-5 h-5 text-ui-accent-primary" />
                        <h2 className="text-lg font-semibold text-ui-text-primary">Widgets</h2>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="mobile-icon-button"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="text-sm text-ui-text-secondary mb-4">
                    {enabledCount} of {accessibleWidgets.length} enabled
                </div>

                {activePresetName && (
                    <div className="mb-4 px-3 py-2 bg-ui-accent-primary-bg border border-ui-accent-primary-border rounded-lg">
                        <div className="text-sm text-ui-text-primary font-medium">
                            Editing: {activePresetName}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-tertiary w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search widgets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mobile-search-input"
                    />
                </div>

                {/* Category Pills - Horizontal Scroll */}
                <div className="mobile-category-scroll">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`mobile-category-pill ${selectedCategory === "all" ? "mobile-category-pill-active" : ""
                            }`}
                    >
                        All
                    </button>
                    {categories.map((category) => {
                        const IconComponent = CATEGORY_ICONS[category];
                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`mobile-category-pill ${selectedCategory === category ? "mobile-category-pill-active" : ""
                                    }`}
                            >
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                                <span className="capitalize">{category}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Widget List - Scrollable */}
            <div className="mobile-widget-menu-content">
                {permissionsLoading ? (
                    <div className="mobile-widget-menu-empty">
                        <div className="loader-spinner mb-3" />
                        <p className="text-ui-text-secondary">Loading permissions...</p>
                    </div>
                ) : filteredWidgets.length === 0 ? (
                    <div className="mobile-widget-menu-empty">
                        <Grid3x3 className="w-12 h-12 text-ui-text-tertiary opacity-40 mb-3" />
                        <p className="text-ui-text-secondary font-medium">No widgets found</p>
                        <p className="text-sm text-ui-text-tertiary mt-1">
                            {searchTerm ? "Try a different search" : "Contact admin for access"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 pb-24">
                        {filteredWidgets.map((widget) => {
                            const isEnabled = isWidgetEnabled(widget.id);
                            return (
                                <button
                                    key={widget.id}
                                    className={`mobile-widget-card ${isEnabled ? "mobile-widget-card-enabled" : ""
                                        }`}
                                    onClick={() => toggleWidget(widget.id)}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Checkbox */}
                                        <div className={`mobile-widget-checkbox ${isEnabled ? "mobile-widget-checkbox-checked" : ""
                                            }`}>
                                            {isEnabled && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <h3 className="font-semibold text-ui-text-primary mb-1">
                                                {widget.title}
                                            </h3>
                                            <p className="text-sm text-ui-text-secondary line-clamp-2 mb-2">
                                                {widget.description || "No description"}
                                            </p>
                                            <div className="flex gap-2">
                                                <span className="mobile-widget-tag">
                                                    {widget.defaultSize.w}×{widget.defaultSize.h}
                                                </span>
                                                <span className="mobile-widget-tag capitalize">
                                                    {widget.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer - Sticky Bottom */}
            <div className="mobile-widget-menu-footer">
                <button
                    onClick={handleCancel}
                    className="mobile-button-secondary"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="mobile-button-primary"
                >
                    Apply Changes
                </button>
            </div>
        </motion.div>
    );
}
