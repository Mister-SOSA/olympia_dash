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
                className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">Save Preset {presetIndex + 1}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-400 mb-4">Choose how to display this preset:</p>

                    <button
                        onClick={() => handleSave("grid")}
                        className="w-full p-4 rounded-lg border-2 border-gray-700 hover:border-blue-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
                                <MdGridView className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Grid Layout</h3>
                                <p className="text-xs text-gray-400">Multiple widgets in a grid</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleSave("fullscreen")}
                        className="w-full p-4 rounded-lg border-2 border-gray-700 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
                                <MdFullscreen className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Fullscreen Widget</h3>
                                <p className="text-xs text-gray-400">Single widget fills entire screen</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
