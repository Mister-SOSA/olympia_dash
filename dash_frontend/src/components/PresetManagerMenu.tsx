"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardPreset, Widget, PresetType } from "@/types";
import { MdClose, MdGridView, MdFullscreen, MdAdd, MdEdit, MdContentCopy, MdDelete, MdRadioButtonChecked, MdCircle } from "react-icons/md";
import PresetNameDialog from "./PresetNameDialog";
import { generatePresetName } from "@/utils/layoutUtils";

interface PresetManagerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    presets: Array<DashboardPreset | null>;
    activePresetIndex: number | null;
    onLoadPreset: (index: number) => void;
    onSavePreset: (index: number, layout: Widget[], type: PresetType, name?: string, description?: string) => void;
    onUpdatePreset: (index: number, updates: Partial<DashboardPreset>) => void;
    onClearPreset: (index: number) => void;
    currentLayout: Widget[];
}

export default function PresetManagerMenu({
    isOpen,
    onClose,
    presets,
    activePresetIndex,
    onLoadPreset,
    onSavePreset,
    onUpdatePreset,
    onClearPreset,
    currentLayout,
}: PresetManagerMenuProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [actionMode, setActionMode] = useState<'save' | 'rename' | 'duplicate' | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [saveTypeModal, setSaveTypeModal] = useState(false);
    const [nameDialogOpen, setNameDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<PresetType>("grid");

    if (!isOpen) return null;

    const handleTileClick = (index: number) => {
        const preset = presets[index];
        if (!preset || preset.layout.filter(w => w.enabled).length === 0) {
            // Empty - start save flow
            setSelectedIndex(index);
            setSaveTypeModal(true);
        } else {
            // Load preset
            onLoadPreset(index);
            onClose();
        }
    };

    const handleSaveClick = (index: number) => {
        setSelectedIndex(index);
        setSaveTypeModal(true);
    };

    const handleTypeSelected = (type: PresetType) => {
        setSelectedType(type);
        setSaveTypeModal(false);
        setNameDialogOpen(true);
    };

    const handleNameSave = (name: string, description: string) => {
        if (selectedIndex !== null) {
            if (actionMode === 'rename') {
                onUpdatePreset(selectedIndex, { name, description });
            } else {
                onSavePreset(selectedIndex, currentLayout, selectedType, name, description);
            }
            setActionMode(null);
            setSelectedIndex(null);
        }
    };

    const handleRename = (index: number) => {
        setActionMode('rename');
        setSelectedIndex(index);
        setNameDialogOpen(true);
    };

    const handleDuplicate = (index: number) => {
        const preset = presets[index];
        if (!preset) return;

        const emptyIndex = presets.findIndex(p => !p || p.layout.filter(w => w.enabled).length === 0);
        if (emptyIndex !== -1) {
            onSavePreset(emptyIndex, preset.layout, preset.type, `${preset.name} (Copy)`, preset.description);
        }
    };

    const getPresetInfo = (preset: DashboardPreset | null) => {
        if (!preset) return { count: 0, isEmpty: true };
        const count = preset.layout.filter(w => w.enabled).length;
        return { count, isEmpty: count === 0 };
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary w-full max-w-3xl"
                >
                    {/* Compact Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-primary">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ui-accent-primary to-ui-accent-secondary flex items-center justify-center">
                                <MdGridView className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-ui-text-primary">Presets</h2>
                                <p className="text-xs text-ui-text-secondary">Click to load • Right-click to save</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Active Preset Indicator */}
                    {activePresetIndex !== null && presets[activePresetIndex] && (
                        <div className="mx-6 mt-4 px-4 py-2 bg-gradient-to-r from-ui-accent-primary-bg/50 to-transparent border-l-4 border-ui-accent-primary rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <MdRadioButtonChecked className="w-4 h-4 text-ui-accent-primary-text animate-pulse" />
                                <span className="font-semibold text-ui-text-primary">
                                    Active: {presets[activePresetIndex]?.name || `Preset ${activePresetIndex + 1}`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 3×3 Grid - Phone Keypad Layout */}
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-3">
                            {presets.map((preset, index) => {
                                const info = getPresetInfo(preset);
                                const isActive = activePresetIndex === index;
                                const isHovered = hoveredIndex === index;
                                const presetName = preset?.name || `Preset ${index + 1}`;

                                return (
                                    <motion.div
                                        key={index}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        onClick={() => handleTileClick(index)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleSaveClick(index);
                                        }}
                                        className={`
                                            relative aspect-square rounded-xl border-2 cursor-pointer transition-all
                                            ${isActive 
                                                ? "border-ui-accent-primary bg-gradient-to-br from-ui-accent-primary/20 to-ui-accent-primary/5 shadow-lg shadow-ui-accent-primary/20" 
                                                : info.isEmpty
                                                ? "border-dashed border-ui-border-primary bg-ui-bg-secondary/30 hover:border-ui-accent-primary/50 hover:bg-ui-bg-secondary/50"
                                                : "border-ui-accent-secondary-border bg-gradient-to-br from-ui-accent-secondary-bg/40 to-ui-bg-secondary hover:border-ui-accent-secondary hover:shadow-lg"
                                            }
                                        `}
                                    >
                                        {/* Preset Number Badge */}
                                        <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-lg ${
                                            isActive 
                                                ? "bg-ui-accent-primary border-ui-accent-primary text-white"
                                                : "bg-ui-bg-primary border-ui-border-primary text-ui-text-primary"
                                        }`}>
                                            {index + 1}
                                        </div>

                                        {/* Type Badge */}
                                        {!info.isEmpty && preset && (
                                            <div className="absolute -top-2 -right-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                    preset.type === "fullscreen" 
                                                        ? "bg-ui-accent-secondary text-white" 
                                                        : "bg-ui-accent-primary text-white"
                                                }`}>
                                                    {preset.type === "fullscreen" ? (
                                                        <MdFullscreen className="w-3 h-3" />
                                                    ) : (
                                                        <MdGridView className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="p-4 h-full flex flex-col items-center justify-center text-center">
                                            {info.isEmpty ? (
                                                <div className="space-y-2">
                                                    <MdAdd className="w-8 h-8 text-ui-text-muted mx-auto opacity-50" />
                                                    <p className="text-xs text-ui-text-muted">Empty</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 w-full">
                                                    <h3 className="font-semibold text-sm text-ui-text-primary line-clamp-2 leading-tight">
                                                        {presetName}
                                                    </h3>
                                                    <div className="flex items-center justify-center gap-1 text-xs text-ui-text-secondary">
                                                        <MdCircle className="w-1.5 h-1.5" />
                                                        <span>{info.count} widget{info.count !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    {preset?.description && (
                                                        <p className="text-xs text-ui-text-muted line-clamp-1">
                                                            {preset.description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Actions (on hover) */}
                                        {!info.isEmpty && isHovered && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRename(index);
                                                    }}
                                                    className="p-2 bg-ui-bg-primary/90 hover:bg-ui-accent-primary rounded-lg transition-colors"
                                                    title="Rename"
                                                >
                                                    <MdEdit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDuplicate(index);
                                                    }}
                                                    className="p-2 bg-ui-bg-primary/90 hover:bg-ui-accent-secondary rounded-lg transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <MdContentCopy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onClearPreset(index);
                                                    }}
                                                    className="p-2 bg-ui-bg-primary/90 hover:bg-ui-danger-bg rounded-lg transition-colors text-ui-danger-text"
                                                    title="Delete"
                                                >
                                                    <MdDelete className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Compact Footer */}
                    <div className="px-6 py-3 border-t border-ui-border-primary bg-ui-bg-secondary/30 rounded-b-2xl">
                        <div className="flex items-center justify-between text-xs text-ui-text-muted">
                            <div className="flex gap-3">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-ui-bg-tertiary rounded text-xs">1-9</kbd>
                                    Load
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-ui-bg-tertiary rounded text-xs">⇧1-9</kbd>
                                    Save
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded text-xs font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Type Selection Modal */}
            <AnimatePresence>
                {saveTypeModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-md"
                        >
                            <div className="p-4 border-b border-ui-border-primary">
                                <h3 className="text-lg font-semibold text-ui-text-primary">Choose Display Mode</h3>
                                <p className="text-xs text-ui-text-secondary mt-1">Preset {selectedIndex !== null ? selectedIndex + 1 : ''}</p>
                            </div>

                            <div className="p-4 space-y-3">
                                <button
                                    onClick={() => handleTypeSelected("grid")}
                                    className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-primary bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-ui-accent-primary-bg rounded-lg group-hover:bg-ui-accent-primary transition-colors">
                                            <MdGridView className="w-6 h-6 text-ui-accent-primary-text group-hover:text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-ui-text-primary">Grid Layout</h4>
                                            <p className="text-xs text-ui-text-secondary">Multiple widgets</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleTypeSelected("fullscreen")}
                                    className="w-full p-4 rounded-lg border-2 border-ui-border-primary hover:border-ui-accent-secondary bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-ui-accent-secondary-bg rounded-lg group-hover:bg-ui-accent-secondary transition-colors">
                                            <MdFullscreen className="w-6 h-6 text-ui-accent-secondary-text group-hover:text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-ui-text-primary">Fullscreen</h4>
                                            <p className="text-xs text-ui-text-secondary">Single widget fills screen</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="p-4 border-t border-ui-border-primary">
                                <button
                                    onClick={() => setSaveTypeModal(false)}
                                    className="w-full px-4 py-2 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-white rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Name Dialog */}
            <PresetNameDialog
                isOpen={nameDialogOpen}
                onClose={() => {
                    setNameDialogOpen(false);
                    setActionMode(null);
                    setSelectedIndex(null);
                }}
                onSave={handleNameSave}
                initialName={selectedIndex !== null && presets[selectedIndex] && actionMode === 'rename' ? presets[selectedIndex]!.name || "" : ""}
                initialDescription={selectedIndex !== null && presets[selectedIndex] && actionMode === 'rename' ? presets[selectedIndex]!.description || "" : ""}
                title={actionMode === 'rename' ? "Rename Preset" : "Name Your Preset"}
                presetNumber={selectedIndex !== null ? selectedIndex + 1 : undefined}
            />
        </>
    );
}
