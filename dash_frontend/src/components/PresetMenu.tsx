"use client";

import React from "react";
import { motion } from "framer-motion";
import { DashboardPreset, Widget, PresetType } from "@/types";
import { MdClose, MdGridView, MdFullscreen } from "react-icons/md";

interface PresetMenuProps {
    isOpen: boolean;
    onClose: () => void;
    presetIndex: number;
    currentLayout: Widget[];
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
}

export default function PresetMenu({
    isOpen,
    onClose,
    presetIndex,
    currentLayout,
    onSavePreset,
}: PresetMenuProps) {
    if (!isOpen) return null;

    const handleSave = (type: PresetType) => {
        onSavePreset(presetIndex, currentLayout, type);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-ui-border-primary">
                    <h2 className="text-lg font-semibold text-ui-text-primary">Save Preset {presetIndex + 1}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <p className="text-sm text-ui-text-secondary mb-4">Choose how to display this preset:</p>

                    <button
                        onClick={() => handleSave("grid")}
                        className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-primary-light bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-ui-accent-primary-bg rounded-lg group-hover:bg-ui-accent-primary-bg transition-colors">
                                <MdGridView className="w-6 h-6 text-ui-accent-primary-text" />
                            </div>
                            <div>
                                <h3 className="font-medium text-ui-text-primary">Grid Layout</h3>
                                <p className="text-xs text-ui-text-secondary">Multiple widgets in a grid</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleSave("fullscreen")}
                        className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-secondary-light bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-ui-accent-secondary-bg rounded-lg group-hover:bg-ui-accent-secondary-bg transition-colors">
                                <MdFullscreen className="w-6 h-6 text-ui-accent-secondary-text" />
                            </div>
                            <div>
                                <h3 className="font-medium text-ui-text-primary">Fullscreen Widget</h3>
                                <p className="text-xs text-ui-text-secondary">Single widget fills entire screen</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-ui-border-primary">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
