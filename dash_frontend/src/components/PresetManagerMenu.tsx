"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardPreset, Widget, PresetType } from "@/types";
import { MdClose, MdGridView, MdFullscreen, MdDelete } from "react-icons/md";

interface PresetManagerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    presets: Array<DashboardPreset | null>;
    onLoadPreset: (index: number) => void;
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
    onClearPreset: (index: number) => void;
    currentLayout: Widget[];
}

export default function PresetManagerMenu({
    isOpen,
    onClose,
    presets,
    onLoadPreset,
    onSavePreset,
    onClearPreset,
    currentLayout,
}: PresetManagerMenuProps) {
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveIndex, setSaveIndex] = useState<number>(0);

    if (!isOpen) return null;

    const handleSaveClick = (index: number) => {
        setSaveIndex(index);
        setSaveModalOpen(true);
    };

    const handleSave = (type: PresetType) => {
        onSavePreset(saveIndex, currentLayout, type);
        setSaveModalOpen(false);
    };

    const getPresetInfo = (preset: DashboardPreset | null) => {
        if (!preset) return { count: 0, widgets: [], type: "grid" as PresetType };
        const enabledWidgets = preset.layout.filter(w => w.enabled);
        return {
            count: enabledWidgets.length,
            widgets: enabledWidgets.map(w => w.displayName || w.id),
            type: preset.type
        };
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-4xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-ui-border-primary">
                        <div>
                            <h2 className="text-lg font-semibold text-ui-text-primary">Preset Manager</h2>
                            <p className="text-xs text-ui-text-secondary">Manage your dashboard layouts</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-ui-bg-secondary/50 text-xs text-ui-text-secondary uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left w-16">#</th>
                                    <th className="px-4 py-3 text-left w-20">Type</th>
                                    <th className="px-4 py-3 text-left w-20">Count</th>
                                    <th className="px-4 py-3 text-left">Widgets</th>
                                    <th className="px-4 py-3 text-right w-64">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ui-border-primary">
                                {presets.map((preset, index) => {
                                    const info = getPresetInfo(preset);
                                    const isEmpty = info.count === 0;

                                    return (
                                        <tr key={index} className={`${isEmpty ? "opacity-50" : "hover:bg-ui-bg-secondary/30"} transition-colors`}>
                                            <td className="px-4 py-3">
                                                <span className="text-lg font-bold text-ui-accent-primary-text">{index + 1}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {!isEmpty && (
                                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${info.type === "fullscreen"
                                                            ? "bg-ui-accent-secondary-bg text-ui-accent-secondary-text"
                                                            : "bg-ui-accent-primary-bg text-ui-accent-primary-text"
                                                        }`}>
                                                        {info.type === "fullscreen" ? (
                                                            <>
                                                                <MdFullscreen className="w-3 h-3" />
                                                                <span>Full</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MdGridView className="w-3 h-3" />
                                                                <span>Grid</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-ui-text-primary">
                                                    {isEmpty ? "—" : info.count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEmpty ? (
                                                    <span className="text-xs text-ui-text-muted">Empty slot</span>
                                                ) : (
                                                    <div className="text-xs text-ui-text-secondary truncate">
                                                        {info.widgets.slice(0, 3).join(", ")}
                                                        {info.count > 3 && ` +${info.count - 3} more`}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    {!isEmpty && (
                                                        <button
                                                            onClick={() => {
                                                                onLoadPreset(index);
                                                                onClose();
                                                            }}
                                                            className="px-3 py-1.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded text-xs font-medium transition-colors"
                                                        >
                                                            Load
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleSaveClick(index)}
                                                        className="px-3 py-1.5 bg-ui-bg-tertiary hover:bg-ui-bg-secondary text-white rounded text-xs transition-colors"
                                                    >
                                                        {isEmpty ? "Save" : "Overwrite"}
                                                    </button>
                                                    {!isEmpty && (
                                                        <button
                                                            onClick={() => onClearPreset(index)}
                                                            className="p-1.5 bg-ui-danger-bg hover:bg-ui-danger-bg border border-ui-danger-border text-ui-danger-text rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <MdDelete className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-ui-border-primary bg-ui-bg-secondary/30">
                        <div className="flex items-center justify-between text-xs text-ui-text-muted">
                            <div className="flex gap-4">
                                <span>⌨️ Press 1-9 to load</span>
                                <span>⌨️ Shift+1-9 to save</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-white rounded text-xs font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Save Type Modal */}
            <AnimatePresence>
                {saveModalOpen && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-md"
                        >
                            <div className="p-4 border-b border-ui-border-primary">
                                <h3 className="text-lg font-semibold text-ui-text-primary">Save Preset {saveIndex + 1}</h3>
                                <p className="text-sm text-ui-text-secondary">Choose display mode</p>
                            </div>

                            <div className="p-4 space-y-3">
                                <button
                                    onClick={() => handleSave("grid")}
                                    className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-primary-light bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-ui-accent-primary-bg rounded-lg">
                                            <MdGridView className="w-6 h-6 text-ui-accent-primary-text" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-ui-text-primary">Grid Layout</h4>
                                            <p className="text-xs text-ui-text-secondary">Multiple widgets</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSave("fullscreen")}
                                    className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-secondary-light bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-ui-accent-secondary-bg rounded-lg">
                                            <MdFullscreen className="w-6 h-6 text-ui-accent-secondary-text" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-ui-text-primary">Fullscreen</h4>
                                            <p className="text-xs text-ui-text-secondary">Single widget fills screen</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="p-4 border-t border-ui-border-primary">
                                <button
                                    onClick={() => setSaveModalOpen(false)}
                                    className="w-full px-4 py-2 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
