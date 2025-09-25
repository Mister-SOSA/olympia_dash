"use client";

import React, { useState, useMemo } from "react";
import { Widget } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WIDGETS, getWidgetsByCategory, WidgetDefinition } from "@/constants/widgets";
import { motion, AnimatePresence } from "framer-motion";
import {
    MdAdd,
    MdRemove,
    MdSearch,
    MdClear,
    MdSelectAll,
    MdInfo,
    MdClose,
    MdCheck
} from "react-icons/md";

interface ImprovedWidgetMenuProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
}

export default function ImprovedWidgetMenu({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
}: ImprovedWidgetMenuProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const widgetsByCategory = getWidgetsByCategory();
    const categories = Object.keys(widgetsByCategory);

    // Filter widgets based on search and category
    const filteredWidgets = useMemo(() => {
        let widgets = WIDGETS;

        // Filter by category
        if (selectedCategory !== "all") {
            widgets = widgets.filter(w => w.category === selectedCategory);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            widgets = widgets.filter(w =>
                w.title.toLowerCase().includes(term) ||
                w.description?.toLowerCase().includes(term) ||
                w.category.toLowerCase().includes(term)
            );
        }

        return widgets;
    }, [searchTerm, selectedCategory]);

    const isWidgetEnabled = (widgetId: string) => {
        return tempLayout.find(w => w.id === widgetId)?.enabled || false;
    };

    const enabledCount = tempLayout.filter(w => w.enabled).length;

    const toggleWidget = (widgetId: string) => {
        const widgetDef = WIDGETS.find(w => w.id === widgetId);
        if (!widgetDef) return;

        const existingWidget = tempLayout.find(w => w.id === widgetId);
        const isCurrentlyEnabled = existingWidget?.enabled || false;

        if (existingWidget) {
            // Update existing widget
            setTempLayout(prev =>
                prev.map(w =>
                    w.id === widgetId
                        ? { ...w, enabled: !isCurrentlyEnabled }
                        : w
                )
            );
        } else {
            // Add new widget
            const newWidget: Widget = {
                id: widgetId,
                x: 0,
                y: 0,
                w: widgetDef.defaultSize.w,
                h: widgetDef.defaultSize.h,
                enabled: true,
                displayName: widgetDef.title,
                category: widgetDef.category,
                description: widgetDef.description
            };

            setTempLayout(prev => [...prev, newWidget]);
        }
    };

    const selectAll = () => {
        const allWidgets = WIDGETS.map(widget => {
            const existing = tempLayout.find(w => w.id === widget.id);
            return existing ? { ...existing, enabled: true } : {
                id: widget.id,
                x: 0,
                y: 0,
                w: widget.defaultSize.w,
                h: widget.defaultSize.h,
                enabled: true,
                displayName: widget.title,
                category: widget.category,
                description: widget.description
            };
        });
        setTempLayout(allWidgets);
    };

    const clearAll = () => {
        setTempLayout(prev => prev.map(w => ({ ...w, enabled: false })));
    };

    const selectCategory = (category: string) => {
        const categoryWidgets = widgetsByCategory[category] || [];
        setTempLayout(prev => {
            return prev.map(widget => {
                const isInCategory = categoryWidgets.some(cw => cw.id === widget.id);
                return isInCategory ? { ...widget, enabled: true } : widget;
            });
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Widget Library</h2>
                            <p className="text-blue-100 mt-1">
                                {enabledCount} widget{enabledCount !== 1 ? 's' : ''} selected
                            </p>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                        >
                            <MdClose size={24} />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 border-b border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search widgets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                            >
                                All
                            </button>
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === category
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4">
                        <Button
                            onClick={selectAll}
                            variant="outline"
                            size="sm"
                            className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30"
                        >
                            <MdSelectAll className="mr-2" size={16} />
                            Select All
                        </Button>
                        <Button
                            onClick={clearAll}
                            variant="outline"
                            size="sm"
                            className="bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                        >
                            <MdClear className="mr-2" size={16} />
                            Clear All
                        </Button>
                        {selectedCategory !== "all" && (
                            <Button
                                onClick={() => selectCategory(selectedCategory)}
                                variant="outline"
                                size="sm"
                                className="bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30"
                            >
                                <MdAdd className="mr-2" size={16} />
                                Add Category
                            </Button>
                        )}
                    </div>
                </div>

                {/* Widget Grid */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {filteredWidgets.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MdSearch size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No widgets found</p>
                            <p className="text-sm">Try adjusting your search or category filter</p>
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${viewMode === "grid"
                            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-1"
                            }`}>
                            {filteredWidgets.map((widget) => (
                                <WidgetCard
                                    key={widget.id}
                                    widget={widget}
                                    isEnabled={isWidgetEnabled(widget.id)}
                                    onToggle={() => toggleWidget(widget.id)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-800 p-6 flex justify-between items-center">
                    <div className="text-gray-400 text-sm">
                        {enabledCount} of {WIDGETS.length} widgets selected
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleCancel} variant="outline">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <MdCheck className="mr-2" size={16} />
                            Apply Changes
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

interface WidgetCardProps {
    widget: WidgetDefinition;
    isEnabled: boolean;
    onToggle: () => void;
    viewMode: "grid" | "list";
}

function WidgetCard({ widget, isEnabled, onToggle, viewMode }: WidgetCardProps) {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <motion.div
            layout
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative cursor-pointer transition-all duration-200 ${isEnabled
                ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30"
                : "bg-gray-800 border-gray-600 hover:border-gray-500"
                } border rounded-lg p-4 ${viewMode === "list" ? "flex items-center" : ""}`}
            onClick={onToggle}
        >
            {/* Status Indicator */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isEnabled ? "bg-green-500" : "bg-gray-500"
                }`} />

            <div className={`${viewMode === "list" ? "flex-1" : ""}`}>
                {/* Widget Title */}
                <h3 className="font-semibold text-white text-lg mb-2 pr-6">
                    {widget.title}
                </h3>

                {/* Widget Description */}
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {widget.description || "No description available"}
                </p>

                {/* Widget Details */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                        <span className="text-xs text-gray-400">
                            {widget.category}
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInfo(!showInfo);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <MdInfo size={16} />
                    </button>
                </div>

                {/* Action Button */}
                <div className="mt-3">
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all ${isEnabled
                        ? "bg-red-600/20 text-red-400 border border-red-500/30"
                        : "bg-green-600/20 text-green-400 border border-green-500/30"
                        }`}>
                        {isEnabled ? (
                            <>
                                <MdRemove size={16} />
                                Remove
                            </>
                        ) : (
                            <>
                                <MdAdd size={16} />
                                Add Widget
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Popup */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-xl z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="font-semibold text-white mb-2">{widget.title}</h4>
                        <p className="text-gray-300 text-sm mb-3">{widget.description}</p>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Category: {widget.category}</span>
                            <span>Size: {widget.defaultSize.w}×{widget.defaultSize.h}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Enhanced stats component
function MenuStats({ enabledCount, totalCount }: { enabledCount: number; totalCount: number }) {
    const percentage = Math.round((enabledCount / totalCount) * 100);

    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 font-medium">Dashboard Status</span>
                <span className="text-blue-400 font-bold">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{enabledCount} enabled</span>
                <span>{totalCount - enabledCount} available</span>
            </div>
        </div>
    );
}
