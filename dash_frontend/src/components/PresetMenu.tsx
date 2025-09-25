"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Widget } from "@/types";
import {
    MdBookmark,
    MdBookmarkBorder,
    MdClose,
    MdKeyboard,
    MdSave,
    MdDashboard,
    MdApps,
    MdLayers,
    MdDelete,
    MdContentCopy,
    MdVisibility,
    MdMoreVert,
    MdAdd,
    MdInfoOutline
} from "react-icons/md";

interface PresetMenuProps {
    presets: Array<Widget[] | null>;
    loadPreset: (index: number) => void;
    presetsOpen: boolean;
    setPresetsOpen: (open: boolean) => void;
    currentLayout: Widget[];
    onSavePreset: (index: number, layout: Widget[]) => void;
    onClearPreset: (index: number) => void;
}

export default function PresetMenu({
    presets,
    loadPreset,
    presetsOpen,
    setPresetsOpen,
    currentLayout,
    onSavePreset,
    onClearPreset,
}: PresetMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const [activePreview, setActivePreview] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
    const [copySource, setCopySource] = useState<number | null>(null);

    // Close on escape key or click outside
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPresetsOpen(false);
                setContextMenu(null);
                setCopySource(null);
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideMenu = menuRef.current?.contains(target);
            const clickedInsideContextMenu = contextMenuRef.current?.contains(target);

            if (!clickedInsideMenu && !clickedInsideContextMenu) {
                setPresetsOpen(false);
                setContextMenu(null);
                setCopySource(null);
            }
        };

        if (presetsOpen) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [presetsOpen, setPresetsOpen]);

    if (!presetsOpen) return null;

    const getPresetIcon = (preset: Widget[] | null, index: number) => {
        if (!preset) return <MdBookmarkBorder className="w-6 h-6" />;
        
        const enabledWidgets = preset.filter(w => w.enabled);
        if (enabledWidgets.length === 0) return <MdBookmarkBorder className="w-6 h-6" />;
        
        // Different icons based on widget count
        if (enabledWidgets.length <= 3) return <MdApps className="w-6 h-6" />;
        if (enabledWidgets.length <= 6) return <MdDashboard className="w-6 h-6" />;
        return <MdLayers className="w-6 h-6" />;
    };

    const getPresetStats = (preset: Widget[] | null) => {
        if (!preset) return { enabled: 0, total: 0 };
        const enabled = preset.filter(w => w.enabled).length;
        return { enabled, total: preset.length };
    };

    const handleContextMenu = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ index, x: e.clientX, y: e.clientY });
    };

    const handleSaveToSlot = (index: number) => {
        onSavePreset(index, currentLayout);
        setContextMenu(null);
    };

    const handleClearSlot = (index: number) => {
        onClearPreset(index);
        setContextMenu(null);
    };

    const handleCopyToSlot = (targetIndex: number) => {
        if (copySource !== null && presets[copySource]) {
            onSavePreset(targetIndex, presets[copySource]!);
        }
        setCopySource(null);
        setContextMenu(null);
    };

    const getWidgetPreview = (preset: Widget[] | null) => {
        if (!preset) return [];
        return preset
            .filter(w => w.enabled)
            .slice(0, 5)
            .map(w => w.displayName || w.id.replace(/-/g, ' '));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                                    <MdBookmark className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Dashboard Presets</h2>
                                    <p className="text-gray-400 text-sm">
                                        {copySource !== null ? 
                                            `Click a slot to copy Preset ${copySource + 1}` : 
                                            "Save and load your favorite layouts"
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {copySource !== null && (
                                    <button
                                        onClick={() => setCopySource(null)}
                                        className="px-3 py-1 text-xs bg-yellow-600/20 text-yellow-400 rounded-lg border border-yellow-600/30"
                                    >
                                        Cancel Copy
                                    </button>
                                )}
                                <button
                                    onClick={() => setPresetsOpen(false)}
                                    className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors text-gray-400 hover:text-white"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="px-6 py-4 bg-gray-800/30 border-b border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <MdKeyboard className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-gray-300">Controls</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">Shift</kbd>
                                    <span className="text-gray-500">+</span>
                                    <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">1-9</kbd>
                                </div>
                                <span className="text-gray-400">Save current layout</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">1-9</kbd>
                                <span className="text-gray-400">Load saved layout</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono">Right Click</kbd>
                                <span className="text-gray-400">More options</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex">
                        {/* Presets Grid */}
                        <div className="flex-1 p-6">
                            <div className="grid grid-cols-3 gap-4">
                                {presets.map((preset, i) => {
                                    const stats = getPresetStats(preset);
                                    const isEmpty = !preset || stats.enabled === 0;
                                    const isCopyTarget = copySource !== null && copySource !== i;
                                    
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`group relative rounded-xl border-2 transition-all duration-300 ${
                                                isCopyTarget
                                                    ? "border-yellow-500/50 bg-yellow-900/20"
                                                    : isEmpty
                                                    ? "border-gray-700 bg-gray-800/30"
                                                    : "border-gray-600 bg-gray-800/50 hover:border-blue-500/50 hover:bg-gray-700/50 hover:shadow-lg hover:shadow-blue-500/10"
                                            } min-h-[120px] flex flex-col`}
                                        >
                                            {/* Main Action Button */}
                                            <motion.button
                                                onClick={() => {
                                                    if (isCopyTarget) {
                                                        handleCopyToSlot(i);
                                                    } else if (preset && stats.enabled > 0) {
                                                        loadPreset(i);
                                                        setPresetsOpen(false);
                                                    }
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, i)}
                                                onMouseEnter={() => setActivePreview(i)}
                                                onMouseLeave={() => setActivePreview(null)}
                                                disabled={!isCopyTarget && isEmpty}
                                                className="w-full h-full p-4 flex flex-col cursor-pointer disabled:cursor-not-allowed"
                                                whileHover={!isEmpty || isCopyTarget ? { scale: 1.02 } : {}}
                                                whileTap={!isEmpty || isCopyTarget ? { scale: 0.98 } : {}}
                                            >
                                                {/* Preset Number & Icon */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`text-2xl font-bold ${
                                                        isCopyTarget
                                                            ? "text-yellow-400"
                                                            : isEmpty 
                                                            ? "text-gray-600" 
                                                            : "text-blue-400 group-hover:text-blue-300"
                                                    }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className={`${
                                                        isCopyTarget
                                                            ? "text-yellow-400"
                                                            : isEmpty 
                                                            ? "text-gray-600" 
                                                            : "text-blue-400 group-hover:text-blue-300"
                                                    }`}>
                                                        {isCopyTarget ? (
                                                            <MdContentCopy className="w-6 h-6" />
                                                        ) : (
                                                            getPresetIcon(preset, i)
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preset Content */}
                                                <div className="flex-1 flex flex-col justify-center">
                                                    {isCopyTarget ? (
                                                        <div className="text-center">
                                                            <div className="text-yellow-400 text-sm mb-1">Paste Here</div>
                                                            <div className="text-xs text-yellow-600">
                                                                Copy Preset {copySource! + 1}
                                                            </div>
                                                        </div>
                                                    ) : isEmpty ? (
                                                        <div className="text-center">
                                                            <div className="text-gray-500 text-sm mb-1">Empty Slot</div>
                                                            <div className="text-xs text-gray-600">
                                                                Right-click or <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Shift+{i + 1}</kbd>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <div className="text-white text-sm font-medium mb-1">
                                                                {stats.enabled} Widget{stats.enabled !== 1 ? 's' : ''}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mb-2">
                                                                Saved Layout
                                                            </div>
                                                            
                                                            {/* Widget preview dots */}
                                                            <div className="flex justify-center gap-1">
                                                                {Array.from({ length: Math.min(stats.enabled, 8) }).map((_, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60"
                                                                    />
                                                                ))}
                                                                {stats.enabled > 8 && (
                                                                    <div className="text-xs text-blue-400 ml-1">
                                                                        +{stats.enabled - 8}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.button>

                                            {/* Actions Overlay */}
                                            {!isEmpty && !isCopyTarget && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleContextMenu(e as any, i);
                                                        }}
                                                        className="p-1 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
                                                    >
                                                        <MdMoreVert className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Hover effect overlay */}
                                            {(!isEmpty || isCopyTarget) && (
                                                <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                    isCopyTarget 
                                                        ? "bg-gradient-to-br from-yellow-500/5 to-orange-500/5"
                                                        : "bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                                                }`} />
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sidebar Preview */}
                        <div className="w-80 bg-gray-800/30 border-l border-gray-700 p-4">
                            <div className="sticky top-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <MdVisibility className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-gray-300">Preview</span>
                                </div>

                                {activePreview !== null ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg font-bold text-blue-400">
                                                Preset {activePreview + 1}
                                            </div>
                                            {getPresetIcon(presets[activePreview], activePreview)}
                                        </div>

                                        {presets[activePreview] ? (
                                            <div>
                                                <div className="text-sm text-gray-400 mb-2">
                                                    {getPresetStats(presets[activePreview]).enabled} enabled widgets:
                                                </div>
                                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                                    {getWidgetPreview(presets[activePreview]).map((name, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
                                                            <span className="text-gray-300 capitalize">
                                                                {name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {getPresetStats(presets[activePreview]).enabled > 5 && (
                                                        <div className="text-xs text-gray-500 pl-4">
                                                            +{getPresetStats(presets[activePreview]).enabled - 5} more widgets
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 py-8">
                                                <MdAdd className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <div className="text-sm">Empty slot</div>
                                                <div className="text-xs mt-1">Right-click to save current layout</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <MdInfoOutline className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <div className="text-sm">Hover over a preset</div>
                                        <div className="text-xs mt-1">to see widget details</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <MdSave className="w-4 h-4" />
                                    <span>Auto-saved to localStorage</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    <span>{currentLayout.filter(w => w.enabled).length} widgets active</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setPresetsOpen(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Context Menu */}
                {contextMenu && (
                    <motion.div
                        ref={contextMenuRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed bg-gray-900/95 backdrop-blur-md border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-[60] min-w-[200px]"
                        style={{
                            left: Math.min(contextMenu.x, window.innerWidth - 220),
                            top: Math.min(contextMenu.y, window.innerHeight - 200),
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="py-2">
                            <button
                                onClick={() => handleSaveToSlot(contextMenu.index)}
                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-blue-600/20 hover:text-blue-400 transition-colors flex items-center gap-3"
                            >
                                <MdSave className="w-4 h-4" />
                                Save Current Layout Here
                            </button>
                            
                            {presets[contextMenu.index] && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCopySource(contextMenu.index);
                                            setContextMenu(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-green-600/20 hover:text-green-400 transition-colors flex items-center gap-3"
                                    >
                                        <MdContentCopy className="w-4 h-4" />
                                        Copy This Preset
                                    </button>
                                    
                                    <div className="border-t border-gray-700 my-1"></div>
                                    
                                    <button
                                        onClick={() => handleClearSlot(contextMenu.index)}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors flex items-center gap-3"
                                    >
                                        <MdDelete className="w-4 h-4" />
                                        Clear This Preset
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}