"use client";

import React, { useState } from "react";
import { DashboardPreset, Widget, PresetType } from "@/types";
import { MdClose, MdGridView, MdFullscreen, MdEdit, MdContentCopy, MdDelete, MdAdd } from "react-icons/md";
import { generatePresetName } from "@/utils/layoutUtils";
import PresetDialog from "./PresetDialog";

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
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<"empty" | "save">("save");
    const [dialogIndex, setDialogIndex] = useState<number>(0);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");

    if (!isOpen) return null;

    const handleLoadOrSave = (index: number) => {
        const preset = presets[index];
        if (!preset || preset.layout.filter(w => w.enabled).length === 0) {
            // Empty slot - show empty dialog (like dock does on left-click empty)
            setDialogType("empty");
            setDialogIndex(index);
            setDialogOpen(true);
        } else {
            // Load preset
            onLoadPreset(index);
            onClose();
        }
    };

    const handleCreateBlank = (index: number) => {
        const now = new Date().toISOString();
        const newPresets = [...presets];

        newPresets[index] = {
            type: "grid",
            layout: currentLayout.map((w) => ({ ...w, enabled: false })),
            name: `Preset ${index + 1}`,
            description: "",
            createdAt: now,
            updatedAt: now
        };

        // Update via parent callback
        onSavePreset(index, newPresets[index].layout, "grid", newPresets[index].name, newPresets[index].description);
    };

    const handleSavePreset = (index: number, layout: Widget[], type: PresetType) => {
        const name = generatePresetName(layout);
        onSavePreset(index, layout, type, name, "");
    };

    const handleStartEdit = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const preset = presets[index];
        if (!preset) return;

        setEditingIndex(index);
        setEditName(preset.name || "");
        setEditDescription(preset.description || "");
    };

    const handleSaveEdit = (index: number) => {
        onUpdatePreset(index, {
            name: editName.trim() || generatePresetName(presets[index]?.layout || []),
            description: editDescription.trim()
        });
        setEditingIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditName("");
        setEditDescription("");
    };

    const handleDuplicate = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const preset = presets[index];
        if (!preset) return;

        const emptyIndex = presets.findIndex(p => !p || p.layout.filter(w => w.enabled).length === 0);
        if (emptyIndex !== -1) {
            onSavePreset(emptyIndex, preset.layout, preset.type, `${preset.name} (Copy)`, preset.description);
        }
    };

    const handleDelete = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onClearPreset(index);
    };

    const getPresetInfo = (preset: DashboardPreset | null) => {
        if (!preset) return { count: 0, isEmpty: true };
        const count = preset.layout.filter(w => w.enabled).length;
        return { count, isEmpty: count === 0 };
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-ui-border-primary">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-ui-accent-primary/10 flex items-center justify-center">
                                <MdGridView className="w-5 h-5 text-ui-accent-primary" />
                            </div>
                            <h2 className="text-base font-semibold text-ui-text-primary">Preset Manager</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 3x3 Grid - Compact */}
                    <div className="p-5">
                        <div className="grid grid-cols-3 gap-3">
                            {presets.map((preset, index) => {
                                const info = getPresetInfo(preset);
                                const isActive = activePresetIndex === index;
                                const isEditing = editingIndex === index;

                                return (
                                    <div
                                        key={index}
                                        className={`
                                            relative rounded-lg border-2 cursor-pointer transition-all
                                            ${isActive
                                                ? 'border-ui-accent-primary bg-ui-accent-primary/5'
                                                : info.isEmpty
                                                    ? 'border-dashed border-ui-border-primary hover:border-ui-accent-primary/50 bg-ui-bg-secondary/30'
                                                    : 'border-ui-border-primary hover:border-ui-accent-secondary/50 bg-ui-bg-secondary/50'
                                            }
                                        `}
                                        onClick={() => !isEditing && handleLoadOrSave(index)}
                                    >
                                        {/* Slot Number */}
                                        <div className={`
                                        absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${isActive
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary border border-ui-border-primary'
                                            }
                                    `}>
                                            {index + 1}
                                        </div>

                                        {/* Type Badge */}
                                        {!info.isEmpty && preset && !isEditing && (
                                            <div className="absolute -top-2 -right-2">
                                                <div className={`
                                                w-5 h-5 rounded-full flex items-center justify-center
                                                ${preset.type === "fullscreen"
                                                        ? "bg-ui-accent-secondary text-white"
                                                        : "bg-ui-accent-primary text-white"
                                                    }
                                            `}>
                                                    {preset.type === "fullscreen" ? (
                                                        <MdFullscreen className="w-3 h-3" />
                                                    ) : (
                                                        <MdGridView className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="p-3 min-h-[100px] flex flex-col">
                                            {isEditing ? (
                                                // Edit Mode
                                                <div className="space-y-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        placeholder="Name"
                                                        className="w-full px-2 py-1 text-xs bg-ui-bg-tertiary border border-ui-border-primary rounded text-ui-text-primary"
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        placeholder="Description"
                                                        className="w-full px-2 py-1 text-xs bg-ui-bg-tertiary border border-ui-border-primary rounded text-ui-text-secondary"
                                                    />
                                                    <div className="flex gap-1.5 pt-1">
                                                        <button
                                                            onClick={() => handleSaveEdit(index)}
                                                            className="flex-1 px-2 py-1 text-xs bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex-1 px-2 py-1 text-xs bg-ui-bg-tertiary hover:bg-ui-bg-secondary text-ui-text-secondary rounded transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : info.isEmpty ? (
                                                // Empty Slot
                                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                                    <MdAdd className="w-6 h-6 text-ui-text-muted/50 mb-1" />
                                                    <span className="text-xs text-ui-text-muted">Empty</span>
                                                </div>
                                            ) : (
                                                // Preset Display
                                                <>
                                                    <div className="flex-1 mb-2">
                                                        <div className="text-sm font-medium text-ui-text-primary line-clamp-2 mb-1">
                                                            {preset?.name || `Preset ${index + 1}`}
                                                        </div>
                                                        <div className="text-xs text-ui-text-secondary">
                                                            {info.count} widget{info.count !== 1 ? 's' : ''}
                                                        </div>
                                                        {preset?.description && (
                                                            <div className="text-xs text-ui-text-muted line-clamp-1 mt-1">
                                                                {preset.description}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-1 mt-auto" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => handleStartEdit(index, e)}
                                                            className="flex-1 p-1.5 hover:bg-ui-bg-tertiary rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <MdEdit className="w-3.5 h-3.5 text-ui-text-muted mx-auto" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDuplicate(index, e)}
                                                            className="flex-1 p-1.5 hover:bg-ui-bg-tertiary rounded transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <MdContentCopy className="w-3.5 h-3.5 text-ui-text-muted mx-auto" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(index, e)}
                                                            className="flex-1 p-1.5 hover:bg-ui-danger-bg rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <MdDelete className="w-3.5 h-3.5 text-ui-text-muted hover:text-ui-danger-text mx-auto" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-ui-border-primary bg-ui-bg-secondary/30 rounded-b-xl flex items-center justify-between text-xs text-ui-text-muted">
                        <div className="flex gap-3">
                            <span><kbd className="px-1.5 py-0.5 bg-ui-bg-tertiary rounded">1-9</kbd> Load</span>
                            <span><kbd className="px-1.5 py-0.5 bg-ui-bg-tertiary rounded">⇧1-9</kbd> Save</span>
                        </div>
                        <span>{presets.filter(p => p && p.layout.filter(w => w.enabled).length > 0).length} / 9</span>
                    </div>
                </div>
            </div>

            {/* Preset Dialog */}
            <PresetDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                dialogType={dialogType}
                presetIndex={dialogIndex}
                currentLayout={currentLayout}
                onCreateBlank={handleCreateBlank}
                onSavePreset={handleSavePreset}
                onLoadPreset={() => { }}
                onDiscardAndLoad={() => { }}
            />
        </>
    );
}

