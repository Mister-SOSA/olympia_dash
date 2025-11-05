"use client";

import React, { memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Widget, PresetType } from "@/types";
import { MdGridView, MdFullscreen, MdAdd, MdWarning } from "react-icons/md";

type DialogType = "empty" | "save" | "overwrite" | "unsaved";

interface PresetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dialogType: DialogType;
    presetIndex: number;
    currentLayout: Widget[];
    onCreateBlank: (index: number) => void;
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
    onLoadPreset: (index: number) => void;
    onDiscardAndLoad: (index: number) => void;
}

const PresetDialog = memo(function PresetDialog({
    isOpen,
    onClose,
    dialogType,
    presetIndex,
    currentLayout,
    onCreateBlank,
    onSavePreset,
    onLoadPreset,
    onDiscardAndLoad,
}: PresetDialogProps) {
    const handleSave = useCallback((type: PresetType) => {
        onSavePreset(presetIndex, currentLayout, type);
        onClose();
    }, [presetIndex, currentLayout, onSavePreset, onClose]);

    const handleCreateBlank = useCallback(() => {
        onCreateBlank(presetIndex);
        onClose();
    }, [presetIndex, onCreateBlank, onClose]);

    const handleLoadPreset = useCallback(() => {
        onLoadPreset(presetIndex);
        onClose();
    }, [presetIndex, onLoadPreset, onClose]);

    const handleDiscardAndLoad = useCallback(() => {
        onDiscardAndLoad(presetIndex);
        onClose();
    }, [presetIndex, onDiscardAndLoad, onClose]);

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

    const renderDialogContent = () => {
        switch (dialogType) {
            case "empty":
                return (
                    <>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ui-accent-primary-bg mb-3">
                                <MdAdd className="w-6 h-6 text-ui-accent-primary-text" />
                            </div>
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                Slot {presetIndex + 1} is Empty
                            </h3>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                Create a new blank preset or use the widget menu to customize your dashboard first.
                            </p>
                        </div>
                        <button
                            onClick={handleCreateBlank}
                            className="w-full px-4 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Create Blank Preset
                        </button>
                    </>
                );

            case "save":
                return (
                    <>
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                Save to Slot {presetIndex + 1}
                            </h3>
                            <p className="text-sm text-ui-text-secondary">
                                Choose how to display this preset
                            </p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleSave("grid")}
                                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-accent-primary-bg hover:bg-ui-accent-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <MdGridView className="w-5 h-5 text-ui-accent-primary-text group-hover:text-white transition-colors" />
                                <div className="text-left flex-1">
                                    <div className="font-medium text-ui-accent-primary-text group-hover:text-white transition-colors">
                                        Grid Layout
                                    </div>
                                    <div className="text-xs text-ui-accent-primary-text/70 group-hover:text-white/70 transition-colors">
                                        Multiple widgets in a grid
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSave("fullscreen")}
                                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <MdFullscreen className="w-5 h-5 text-ui-accent-secondary-text group-hover:text-white transition-colors" />
                                <div className="text-left flex-1">
                                    <div className="font-medium text-ui-accent-secondary-text group-hover:text-white transition-colors">
                                        Fullscreen Widget
                                    </div>
                                    <div className="text-xs text-ui-accent-secondary-text/70 group-hover:text-white/70 transition-colors">
                                        Single widget fills screen
                                    </div>
                                </div>
                            </button>
                        </div>
                    </>
                );

            case "overwrite":
                return (
                    <>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
                                <MdWarning className="w-6 h-6 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                Overwrite Preset {presetIndex + 1}?
                            </h3>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                This will replace the existing preset with your current layout.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleSave("grid")}
                                className="w-full px-4 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Save as Grid
                            </button>
                            <button
                                onClick={() => handleSave("fullscreen")}
                                className="w-full px-4 py-3 rounded-xl bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Save as Fullscreen
                            </button>
                        </div>
                    </>
                );

            case "unsaved":
                return (
                    <>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-3">
                                <MdWarning className="w-6 h-6 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                You Have Unsaved Changes
                            </h3>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                Loading Preset {presetIndex + 1} will discard your current changes.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={handleDiscardAndLoad}
                                className="w-full px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Discard & Load Preset
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 rounded-xl bg-ui-bg-tertiary hover:bg-ui-bg-tertiary/80 text-ui-text-primary font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Keep Editing
                            </button>
                        </div>
                    </>
                );
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 400
                        }}
                        className="bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {renderDialogContent()}
                        
                        <button
                            onClick={onClose}
                            className="w-full mt-3 px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                        >
                            Cancel (ESC)
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default PresetDialog;
