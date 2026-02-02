"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DashboardPreset, Widget, PresetType } from "@/types";
import {
    X,
    Save,
    Sparkles,
    Grid3X3,
    Maximize2,
    Edit3,
    Copy,
    Trash2,
    Plus,
    Clock,
    Info,
    AlertCircle,
    Check,
    Calendar,
} from "lucide-react";
import { generatePresetName } from "@/utils/layoutUtils";
import PresetDialog from "./PresetDialog";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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

// ============================================
// Preset Card Component
// ============================================

interface PresetCardProps {
    preset: DashboardPreset | null;
    index: number;
    isActive: boolean;
    isEditing: boolean;
    onLoad: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    editName: string;
    editDescription: string;
    setEditName: (name: string) => void;
    setEditDescription: (desc: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
}

const PresetCard = React.memo(({
    preset,
    index,
    isActive,
    isEditing,
    onLoad,
    onEdit,
    onDuplicate,
    onDelete,
    editName,
    editDescription,
    setEditName,
    setEditDescription,
    onSaveEdit,
    onCancelEdit,
}: PresetCardProps) => {
    const isEmpty = !preset || preset.layout.filter(w => w.enabled).length === 0;
    const widgetCount = preset?.layout.filter(w => w.enabled).length || 0;

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div
            className="relative rounded-xl border-2 cursor-pointer transition-all group"
            style={
                isActive ? {
                    borderColor: 'var(--ui-accent-primary)',
                    backgroundColor: 'var(--ui-accent-primary-bg)',
                } : isEmpty ? {
                    borderStyle: 'dashed',
                    borderColor: 'var(--ui-border-primary)',
                    backgroundColor: 'var(--ui-bg-secondary)',
                } : {
                    borderColor: 'var(--ui-border-primary)',
                    backgroundColor: 'var(--ui-bg-secondary)',
                }
            }
            onClick={!isEditing ? onLoad : undefined}
            onMouseEnter={(e) => {
                if (!isActive && !isEmpty && !isEditing) {
                    e.currentTarget.style.borderColor = 'var(--ui-accent-secondary)';
                    e.currentTarget.style.backgroundColor = 'var(--ui-accent-secondary-bg)';
                } else if (isEmpty && !isEditing) {
                    e.currentTarget.style.borderColor = 'var(--ui-accent-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive && !isEmpty) {
                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                } else if (isEmpty) {
                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                }
            }}
        >
            {/* Slot Number Badge */}
            <div
                className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 z-10"
                style={isActive ? {
                    backgroundColor: 'var(--ui-accent-primary)',
                    borderColor: 'var(--ui-bg-primary)',
                    color: '#ffffff',
                } : {
                    backgroundColor: 'var(--ui-bg-tertiary)',
                    borderColor: 'var(--ui-bg-primary)',
                    color: 'var(--ui-text-secondary)',
                }}
            >
                {index + 1}
            </div>

            {/* Type Badge */}
            {!isEmpty && preset && !isEditing && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 z-10"
                                style={preset.type === "fullscreen" ? {
                                    backgroundColor: 'var(--ui-accent-secondary)',
                                    borderColor: 'var(--ui-bg-primary)',
                                } : {
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    borderColor: 'var(--ui-bg-primary)',
                                }}
                            >
                                {preset.type === "fullscreen" ? (
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                ) : (
                                    <Grid3X3 className="w-3.5 h-3.5 text-white" />
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {preset.type === "fullscreen" ? "Fullscreen" : "Grid Layout"}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Active Indicator */}
            {isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium" style={{
                    backgroundColor: 'var(--ui-success-bg)',
                    color: 'var(--ui-success-text)',
                }}>
                    <Check className="w-3 h-3" />
                    Active
                </div>
            )}

            {/* Content */}
            <div className="p-4 min-h-[160px] flex flex-col">
                {isEditing ? (
                    // Edit Mode
                    <div className="space-y-3 flex-1" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <label className="text-[10px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--ui-text-muted)' }}>
                                Preset Name
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter name..."
                                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-all"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    borderColor: 'var(--ui-border-primary)',
                                    color: 'var(--ui-text-primary)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--ui-accent-primary)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--ui-accent-primary-bg)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--ui-text-muted)' }}>
                                Description (Optional)
                            </label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Add description..."
                                rows={2}
                                className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition-all resize-none"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    borderColor: 'var(--ui-border-primary)',
                                    color: 'var(--ui-text-secondary)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--ui-accent-primary)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--ui-accent-primary-bg)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--ui-border-primary)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={onSaveEdit}
                                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                style={{
                                    backgroundColor: 'var(--ui-accent-primary)',
                                    color: '#ffffff',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--ui-accent-primary)'}
                            >
                                Save
                            </button>
                            <button
                                onClick={onCancelEdit}
                                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                style={{
                                    backgroundColor: 'var(--ui-bg-tertiary)',
                                    color: 'var(--ui-text-secondary)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-quaternary)';
                                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                    e.currentTarget.style.color = 'var(--ui-text-secondary)';
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : isEmpty ? (
                    // Empty Slot
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{
                            backgroundColor: 'var(--ui-bg-tertiary)',
                        }}>
                            <Plus className="w-6 h-6" style={{ color: 'var(--ui-text-muted)', opacity: 0.5 }} />
                        </div>
                        <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                            Empty Slot
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)', opacity: 0.7 }}>
                            Click to create
                        </p>
                    </div>
                ) : (
                    // Preset Display
                    <>
                        <div className="flex-1 mb-3">
                            <h3 className="text-base font-semibold mb-1.5 line-clamp-2" style={{ color: 'var(--ui-text-primary)' }}>
                                {preset?.name || `Preset ${index + 1}`}
                            </h3>

                            {/* Widget count */}
                            <div className="flex items-center gap-1.5 mb-2">
                                <Grid3X3 className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                                    {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Description */}
                            {preset?.description && (
                                <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                                    {preset.description}
                                </p>
                            )}

                            {/* Metadata */}
                            {preset?.updatedAt && (
                                <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                                    <Clock className="w-3 h-3" />
                                    <span>Updated {formatDate(preset.updatedAt)}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onEdit}
                                            className="flex-1 p-2 rounded-lg transition-all"
                                            style={{ color: 'var(--ui-text-muted)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                e.currentTarget.style.color = 'var(--ui-text-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                            }}
                                        >
                                            <Edit3 className="w-4 h-4 mx-auto" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit preset</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onDuplicate}
                                            className="flex-1 p-2 rounded-lg transition-all"
                                            style={{ color: 'var(--ui-text-muted)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                                e.currentTarget.style.color = 'var(--ui-text-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                            }}
                                        >
                                            <Copy className="w-4 h-4 mx-auto" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicate preset</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onDelete}
                                            className="flex-1 p-2 rounded-lg transition-all"
                                            style={{ color: 'var(--ui-text-muted)' }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--ui-danger-bg)';
                                                e.currentTarget.style.color = 'var(--ui-danger-text)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'var(--ui-text-muted)';
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mx-auto" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete preset</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

PresetCard.displayName = "PresetCard";

// ============================================
// Main Component
// ============================================

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

    // Stats
    const stats = useMemo(() => {
        const filled = presets.filter(p => p && p.layout.filter(w => w.enabled).length > 0).length;
        const totalWidgets = presets.reduce((sum, p) => {
            if (!p) return sum;
            return sum + p.layout.filter(w => w.enabled).length;
        }, 0);
        return { filled, totalWidgets };
    }, [presets]);

    // Handlers
    const handleLoadOrSave = (index: number) => {
        const preset = presets[index];
        if (!preset || preset.layout.filter(w => w.enabled).length === 0) {
            setDialogType("empty");
            setDialogIndex(index);
            setDialogOpen(true);
        } else {
            onLoadPreset(index);
            onClose();
        }
    };

    const handleCreateBlank = (index: number) => {
        const now = new Date().toISOString();
        const newPreset: DashboardPreset = {
            type: "grid",
            layout: currentLayout.map((w) => ({ ...w, enabled: false })),
            name: `Preset ${index + 1}`,
            description: "",
            createdAt: now,
            updatedAt: now
        };
        onSavePreset(index, newPreset.layout, "grid", newPreset.name, newPreset.description);
    };

    const handleSavePreset = (index: number, layout: Widget[], type: PresetType) => {
        const name = generatePresetName(layout);
        onSavePreset(index, layout, type, name, "");
    };

    const handleStartEdit = (index: number) => {
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

    const handleDuplicate = (index: number) => {
        const preset = presets[index];
        if (!preset) return;

        const emptyIndex = presets.findIndex(p => !p || p.layout.filter(w => w.enabled).length === 0);
        if (emptyIndex !== -1) {
            onSavePreset(emptyIndex, preset.layout, preset.type, `${preset.name} (Copy)`, preset.description);
        }
    };

    const handleDelete = (index: number) => {
        onClearPreset(index);
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                if (editingIndex !== null) {
                    handleCancelEdit();
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, editingIndex, onClose]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent
                    size="xl"
                    className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0"
                    showClose={false}
                >
                    {/* Header */}
                    <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border-primary)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                                    backgroundColor: 'var(--ui-accent-primary-bg)',
                                }}>
                                    <Sparkles className="w-5 h-5" style={{ color: 'var(--ui-accent-primary)' }} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-text-primary)' }}>
                                        Preset Manager
                                    </h2>
                                    <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                        Save and load dashboard configurations
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Stats */}
                                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg" style={{
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                }}>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Save className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
                                        <span className="font-medium tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                                            {stats.filled}
                                        </span>
                                        <span style={{ color: 'var(--ui-text-muted)' }}>/</span>
                                        <span style={{ color: 'var(--ui-text-muted)' }}>9</span>
                                    </div>
                                    <div className="w-px h-4" style={{ backgroundColor: 'var(--ui-border-primary)' }} />
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Grid3X3 className="w-4 h-4" style={{ color: 'var(--ui-text-muted)' }} />
                                        <span className="font-medium tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>
                                            {stats.totalWidgets}
                                        </span>
                                        <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>widgets</span>
                                    </div>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
                                        e.currentTarget.style.color = 'var(--ui-text-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--ui-text-muted)';
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content - 3x3 Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto">
                            {presets.map((preset, index) => (
                                <PresetCard
                                    key={index}
                                    preset={preset}
                                    index={index}
                                    isActive={activePresetIndex === index}
                                    isEditing={editingIndex === index}
                                    onLoad={() => handleLoadOrSave(index)}
                                    onEdit={() => handleStartEdit(index)}
                                    onDuplicate={() => handleDuplicate(index)}
                                    onDelete={() => handleDelete(index)}
                                    editName={editName}
                                    editDescription={editDescription}
                                    setEditName={setEditName}
                                    setEditDescription={setEditDescription}
                                    onSaveEdit={() => handleSaveEdit(index)}
                                    onCancelEdit={handleCancelEdit}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t flex items-center justify-between" style={{
                        borderColor: 'var(--ui-border-primary)',
                        backgroundColor: 'var(--ui-bg-secondary)'
                    }}>
                        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                            <span className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>1-9</kbd>
                                Load preset
                            </span>
                            <span className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>⇧1-9</kbd>
                                Save current
                            </span>
                            <span className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>Esc</kbd>
                                Close
                            </span>
                        </div>

                        {activePresetIndex !== null && presets[activePresetIndex] && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{
                                backgroundColor: 'var(--ui-accent-primary-bg)',
                            }}>
                                <Check className="w-3 h-3" style={{ color: 'var(--ui-accent-primary)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--ui-accent-primary)' }}>
                                    {presets[activePresetIndex]?.name || `Preset ${activePresetIndex + 1}`}
                                </span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
            />
        </>
    );
}

