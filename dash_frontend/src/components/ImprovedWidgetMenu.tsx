"use client";

import React, { useState, useMemo } from "react";
import { Widget } from "@/types";

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
    MdCheck,
    MdSave
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-6 py-4 border-b border-gray-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-green-600/10"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-700/50 rounded-xl">
                                <MdSelectAll className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Widget Library</h2>
                                <p className="text-gray-400 text-sm">
                                    {enabledCount} of {WIDGETS.length} widgets selected
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-6 py-4 bg-gray-800/30 border-b border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search widgets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
                            />
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-700/50 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "grid"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "list"
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                List
                            </button>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedCategory === "all"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600"
                                }`}
                        >
                            All Categories
                        </button>
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${selectedCategory === category
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white border border-gray-600"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={selectAll}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 hover:border-green-500/50 transition-all flex items-center gap-2"
                        >
                            <MdSelectAll size={16} />
                            Select All
                        </button>
                        <button
                            onClick={clearAll}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 hover:border-red-500/50 transition-all flex items-center gap-2"
                        >
                            <MdClear size={16} />
                            Clear All
                        </button>
                        {selectedCategory !== "all" && (
                            <button
                                onClick={() => selectCategory(selectedCategory)}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all flex items-center gap-2"
                            >
                                <MdAdd size={16} />
                                Add {selectedCategory}
                            </button>
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
                <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                <span>{enabledCount} of {WIDGETS.length} widgets selected</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MdSave className="w-4 h-4" />
                                <span>Changes applied instantly</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                <MdCheck size={16} />
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative cursor-pointer transition-all duration-300 overflow-hidden ${isEnabled
                ? "bg-blue-600/20 border-blue-500/50 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10"
                : "bg-gray-800/50 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                } border-2 rounded-xl p-4 backdrop-blur-sm ${viewMode === "list" ? "flex items-center" : ""}`}
            onClick={onToggle}
        >
            {/* Background Gradient Overlay */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${isEnabled
                    ? "bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                    : "bg-gradient-to-br from-gray-500/5 to-gray-400/5"
                }`} />

            {/* Status Indicator */}
            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full shadow-sm ${isEnabled ? "bg-green-500 shadow-green-500/30" : "bg-gray-500"
                }`} />

            <div className={`relative z-10 ${viewMode === "list" ? "flex-1" : ""}`}>
                {/* Widget Title */}
                <h3 className="font-bold text-white text-lg mb-2 pr-6 group-hover:text-blue-300 transition-colors">
                    {widget.title}
                </h3>

                {/* Widget Description */}
                <p className="text-gray-300 text-sm mb-3 line-clamp-2 group-hover:text-gray-200 transition-colors">
                    {widget.description || "No description available"}
                </p>

                {/* Widget Details */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-lg font-medium backdrop-blur-sm">
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                        </span>
                        <span className="text-xs text-gray-400 capitalize bg-gray-600/30 px-2 py-1 rounded-lg">
                            {widget.category}
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInfo(!showInfo);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-700/50"
                    >
                        <MdInfo size={16} />
                    </button>
                </div>

                {/* Action Button */}
                <div className="relative">
                    <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold transition-all ${isEnabled
                        ? "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:border-red-500/50"
                        : "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 hover:border-green-500/50"
                        } backdrop-blur-sm shadow-sm`}>
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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-md border border-gray-600 rounded-xl p-4 shadow-2xl z-20"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="font-bold text-white mb-2">{widget.title}</h4>
                        <p className="text-gray-300 text-sm mb-3">{widget.description}</p>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Category: <span className="text-blue-400 capitalize">{widget.category}</span></span>
                            <span className="text-gray-400">Size: <span className="text-green-400">{widget.defaultSize.w}×{widget.defaultSize.h}</span></span>
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
