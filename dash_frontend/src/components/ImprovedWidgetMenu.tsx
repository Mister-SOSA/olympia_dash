"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Widget } from "@/types";
import { WIDGETS, getWidgetsByCategory } from "@/constants/widgets";
import { MdClose, MdSearch, MdCheck, MdSelectAll, MdDeselect, MdClear, MdSwapVert } from "react-icons/md";

interface ImprovedWidgetMenuProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
    activePresetName?: string;
}

export default function ImprovedWidgetMenu({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
    activePresetName,
}: ImprovedWidgetMenuProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const widgetsByCategory = getWidgetsByCategory();
    const categories = Object.keys(widgetsByCategory);

    const filteredWidgets = useMemo(() => {
        let widgets = WIDGETS;

        if (selectedCategory !== "all") {
            widgets = widgets.filter((w) => w.category === selectedCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            widgets = widgets.filter(
                (w) =>
                    w.title.toLowerCase().includes(term) ||
                    w.description?.toLowerCase().includes(term)
            );
        }

        return widgets;
    }, [searchTerm, selectedCategory]);

    const isWidgetEnabled = (widgetId: string) => {
        return tempLayout.find((w) => w.id === widgetId)?.enabled || false;
    };

    const toggleWidget = (widgetId: string) => {
        const widgetDef = WIDGETS.find((w) => w.id === widgetId);
        if (!widgetDef) return;

        const existingWidget = tempLayout.find((w) => w.id === widgetId);
        const isCurrentlyEnabled = existingWidget?.enabled || false;

        if (existingWidget) {
            setTempLayout((prev) =>
                prev.map((w) => (w.id === widgetId ? { ...w, enabled: !isCurrentlyEnabled } : w))
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

    // Bulk actions for filtered widgets
    const selectAllVisible = () => {
        const visibleWidgetIds = filteredWidgets.map((w) => w.id);

        setTempLayout((prev) => {
            const updated = [...prev];

            visibleWidgetIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);

                if (existingIndex >= 0) {
                    updated[existingIndex] = { ...updated[existingIndex], enabled: true };
                } else {
                    const widgetDef = WIDGETS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId,
                            x: 0,
                            y: 0,
                            w: widgetDef.defaultSize.w,
                            h: widgetDef.defaultSize.h,
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
    };

    const deselectAllVisible = () => {
        const visibleWidgetIds = filteredWidgets.map((w) => w.id);
        setTempLayout((prev) =>
            prev.map((w) =>
                visibleWidgetIds.includes(w.id) ? { ...w, enabled: false } : w
            )
        );
    };

    const clearAll = () => {
        setTempLayout((prev) => prev.map((w) => ({ ...w, enabled: false })));
    };

    const invertSelection = () => {
        const visibleWidgetIds = filteredWidgets.map((w) => w.id);

        setTempLayout((prev) => {
            const updated = [...prev];

            visibleWidgetIds.forEach((widgetId) => {
                const existingIndex = updated.findIndex((w) => w.id === widgetId);

                if (existingIndex >= 0) {
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        enabled: !updated[existingIndex].enabled,
                    };
                } else {
                    const widgetDef = WIDGETS.find((w) => w.id === widgetId);
                    if (widgetDef) {
                        updated.push({
                            id: widgetId,
                            x: 0,
                            y: 0,
                            w: widgetDef.defaultSize.w,
                            h: widgetDef.defaultSize.h,
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
    };

    const enabledCount = tempLayout.filter((w) => w.enabled).length;
    const visibleEnabledCount = filteredWidgets.filter((w) => isWidgetEnabled(w.id)).length;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-ui-border-primary">
                    <div>
                        <h2 className="text-lg font-semibold text-ui-text-primary">Widgets</h2>
                        <p className="text-sm text-ui-text-secondary">
                            {enabledCount} of {WIDGETS.length} enabled
                            {filteredWidgets.length < WIDGETS.length &&
                                ` • ${visibleEnabledCount} of ${filteredWidgets.length} visible`
                            }
                        </p>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Active Preset Context Banner */}
                {activePresetName && (
                    <div className="px-4 py-3 border-b border-ui-border-primary bg-ui-accent-primary-bg/30 border-ui-accent-primary-border">
                        <div className="text-sm text-ui-text-primary font-medium">
                            Active preset: {activePresetName}
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                <div className="p-4 border-b border-ui-border-primary space-y-3">
                    <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-secondary w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search widgets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm placeholder-ui-text-muted focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all"
                        />
                    </div>

                    {/* Bulk Actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-xs text-ui-text-muted font-medium">Quick actions:</span>
                        <button
                            onClick={selectAllVisible}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-ui-success-bg hover:bg-ui-success-bg border border-ui-success-border text-ui-success-text rounded-lg text-xs font-medium transition-colors"
                            title="Enable all visible widgets"
                        >
                            <MdSelectAll className="w-3.5 h-3.5" />
                            Select Visible
                        </button>
                        <button
                            onClick={deselectAllVisible}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-ui-warning-bg hover:bg-ui-warning-bg border border-ui-warning-border text-ui-warning-text rounded-lg text-xs font-medium transition-colors"
                            title="Disable all visible widgets"
                        >
                            <MdDeselect className="w-3.5 h-3.5" />
                            Deselect Visible
                        </button>
                        <button
                            onClick={invertSelection}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary-bg border border-ui-accent-secondary-border text-ui-accent-secondary-text rounded-lg text-xs font-medium transition-colors"
                            title="Invert selection of visible widgets"
                        >
                            <MdSwapVert className="w-3.5 h-3.5" />
                            Invert
                        </button>
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-ui-danger-bg hover:bg-ui-danger-bg border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-colors"
                            title="Disable all widgets"
                        >
                            <MdClear className="w-3.5 h-3.5" />
                            Clear All
                        </button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selectedCategory === "all"
                                ? "bg-ui-accent-primary text-white"
                                : "bg-ui-bg-secondary text-ui-text-secondary hover:bg-ui-bg-tertiary"
                                }`}
                        >
                            All
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${selectedCategory === category
                                    ? "bg-ui-accent-primary text-white"
                                    : "bg-ui-bg-secondary text-ui-text-secondary hover:bg-ui-bg-tertiary"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Widget List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredWidgets.length === 0 ? (
                        <div className="text-center py-12 text-ui-text-muted">
                            <p>No widgets found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredWidgets.map((widget) => {
                                const isEnabled = isWidgetEnabled(widget.id);
                                return (
                                    <button
                                        key={widget.id}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${isEnabled
                                            ? "bg-ui-accent-primary-bg border-ui-accent-primary-border hover:bg-ui-accent-primary-bg"
                                            : "bg-ui-bg-secondary/50 border-ui-border-primary hover:bg-ui-bg-secondary hover:border-ui-accent-primary"
                                            }`}
                                        onClick={() => toggleWidget(widget.id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-ui-text-primary text-sm mb-1">
                                                    {widget.title}
                                                </h3>
                                                <p className="text-xs text-ui-text-secondary line-clamp-2">
                                                    {widget.description || "No description"}
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-xs bg-ui-bg-tertiary text-ui-text-secondary px-2 py-0.5 rounded">
                                                        {widget.defaultSize.w}×{widget.defaultSize.h}
                                                    </span>
                                                    <span className="text-xs bg-ui-bg-tertiary text-ui-text-secondary px-2 py-0.5 rounded capitalize">
                                                        {widget.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isEnabled
                                                    ? "bg-ui-accent-primary border-ui-accent-primary"
                                                    : "border-ui-border-secondary"
                                                    }`}
                                            >
                                                {isEnabled && <MdCheck className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-ui-border-primary flex justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Apply Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
