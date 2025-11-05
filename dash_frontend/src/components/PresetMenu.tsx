"use client";

import React, { memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Widget, PresetType } from "@/types";
import { MdGridView, MdFullscreen } from "react-icons/md";

interface PresetMenuProps {
    isOpen: boolean;
    onClose: () => void;
    presetIndex: number;
    currentLayout: Widget[];
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
}

const PresetMenu = memo(function PresetMenu({
    isOpen,
    onClose,
    presetIndex,
    currentLayout,
    onSavePreset,
}: PresetMenuProps) {
    const handleSave = useCallback((type: PresetType) => {
        onSavePreset(presetIndex, currentLayout, type);
        onClose();
    }, [presetIndex, currentLayout, onSavePreset, onClose]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-50 flex items-end justify-center pb-24 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 400
                        }}
                        className="pointer-events-auto"
                    >
                        <div className="flex items-center gap-3 bg-ui-bg-primary/95 backdrop-blur-md border border-ui-border-primary rounded-2xl px-4 py-3 shadow-2xl">
                            <span className="text-sm font-medium text-ui-text-secondary mr-2">
                                Save to slot {presetIndex + 1}:
                            </span>
                            
                            <button
                                onClick={() => handleSave("grid")}
                                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ui-accent-primary-bg hover:bg-ui-accent-primary transition-all hover:scale-105 active:scale-95"
                            >
                                <MdGridView className="w-5 h-5 text-ui-accent-primary-text group-hover:text-white transition-colors" />
                                <span className="text-sm font-medium text-ui-accent-primary-text group-hover:text-white transition-colors">
                                    Grid
                                </span>
                            </button>

                            <button
                                onClick={() => handleSave("fullscreen")}
                                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary transition-all hover:scale-105 active:scale-95"
                            >
                                <MdFullscreen className="w-5 h-5 text-ui-accent-secondary-text group-hover:text-white transition-colors" />
                                <span className="text-sm font-medium text-ui-accent-secondary-text group-hover:text-white transition-colors">
                                    Fullscreen
                                </span>
                            </button>

                            <div className="w-px h-6 bg-ui-border-primary mx-1" />

                            <button
                                onClick={onClose}
                                className="px-3 py-2 text-xs font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                            >
                                ESC
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
        )}
        </AnimatePresence>
    );
});

export default PresetMenu;
