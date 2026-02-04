"use client";

import React, { memo, useCallback, useState } from "react";
import { Widget, PresetType } from "@/types";
import { Plus, Grid3X3, Maximize2, AlertTriangle, Copy, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DialogType = "create" | "save" | "overwrite";

interface PresetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dialogType: DialogType;
    presetIndex: number;
    currentLayout: Widget[];
    onCreateBlank: (index: number) => void;
    onCreateFromCurrent: (index: number, type: PresetType) => void;
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
    onLoadPreset: (index: number) => void;
    onOpenWidgetMenu?: () => void;
}

const PresetDialog = memo(function PresetDialog({
    isOpen,
    onClose,
    dialogType,
    presetIndex,
    currentLayout,
    onCreateBlank,
    onCreateFromCurrent,
    onSavePreset,
    onLoadPreset,
    onOpenWidgetMenu,
}: PresetDialogProps) {
    const enabledWidgetCount = currentLayout.filter(w => w.enabled).length;
    const hasWidgetsEnabled = enabledWidgetCount > 0;

    const handleSave = useCallback((type: PresetType) => {
        // Prevent saving empty layouts
        if (enabledWidgetCount === 0) {
            return;
        }
        onSavePreset(presetIndex, currentLayout, type);
        onClose();
    }, [presetIndex, currentLayout, onSavePreset, onClose, enabledWidgetCount]);

    const handleCreateBlank = useCallback(() => {
        onCreateBlank(presetIndex);
        onClose();
        // Open widget menu after a short delay to let the preset load
        if (onOpenWidgetMenu) {
            setTimeout(() => onOpenWidgetMenu(), 100);
        }
    }, [presetIndex, onCreateBlank, onClose, onOpenWidgetMenu]);

    const handleCreateFromCurrent = useCallback((type: PresetType) => {
        onCreateFromCurrent(presetIndex, type);
        onClose();
    }, [presetIndex, onCreateFromCurrent, onClose]);

    const handleLoadPreset = useCallback(() => {
        onLoadPreset(presetIndex);
        onClose();
    }, [presetIndex, onLoadPreset, onClose]);

    const renderDialogContent = () => {
        switch (dialogType) {
            case "create":
                return (
                    <>
                        {/* Header with slot badge */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ui-bg-tertiary text-ui-text-primary font-bold text-lg">
                                {presetIndex + 1}
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-ui-text-primary">
                                    New Preset
                                </h3>
                                <p className="text-xs text-ui-text-muted">
                                    Choose how to set up this slot
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {/* Start Fresh Option */}
                            <button
                                onClick={handleCreateBlank}
                                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-bg-secondary hover:bg-ui-accent-primary/10 border border-ui-border-primary hover:border-ui-accent-primary/30 transition-all"
                            >
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ui-accent-primary/10 group-hover:bg-ui-accent-primary transition-colors">
                                    <Plus className="w-4.5 h-4.5 text-ui-accent-primary group-hover:text-white transition-colors" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-medium text-ui-text-primary text-sm">
                                        Start Empty
                                    </div>
                                    <div className="text-xs text-ui-text-muted">
                                        Pick widgets from scratch
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-ui-text-muted group-hover:text-ui-accent-primary transition-colors" />
                            </button>

                            {/* Use Current Layout Option - only show if there are enabled widgets */}
                            {hasWidgetsEnabled && (
                                <button
                                    onClick={() => handleCreateFromCurrent("grid")}
                                    className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-bg-secondary hover:bg-ui-accent-secondary/10 border border-ui-border-primary hover:border-ui-accent-secondary/30 transition-all"
                                >
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ui-accent-secondary/10 group-hover:bg-ui-accent-secondary transition-colors">
                                        <Copy className="w-4 h-4 text-ui-accent-secondary group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium text-ui-text-primary text-sm">
                                            Copy Current Layout
                                        </div>
                                        <div className="text-xs text-ui-text-muted">
                                            Save your {enabledWidgetCount} active widget{enabledWidgetCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ui-text-muted group-hover:text-ui-accent-secondary transition-colors" />
                                </button>
                            )}
                        </div>
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
                                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-accent-primary/10 hover:bg-ui-accent-primary border border-ui-accent-primary/20 hover:border-ui-accent-primary transition-all"
                            >
                                <Grid3X3 className="w-5 h-5 text-ui-accent-primary group-hover:text-white transition-colors" />
                                <div className="text-left flex-1">
                                    <div className="font-medium text-ui-accent-primary group-hover:text-white transition-colors">
                                        Grid Layout
                                    </div>
                                    <div className="text-xs text-ui-text-secondary group-hover:text-white/70 transition-colors">
                                        Multiple widgets in a grid
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSave("fullscreen")}
                                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ui-accent-secondary/10 hover:bg-ui-accent-secondary border border-ui-accent-secondary/20 hover:border-ui-accent-secondary transition-all"
                            >
                                <Maximize2 className="w-5 h-5 text-ui-accent-secondary group-hover:text-white transition-colors" />
                                <div className="text-left flex-1">
                                    <div className="font-medium text-ui-accent-secondary group-hover:text-white transition-colors">
                                        Fullscreen Widget
                                    </div>
                                    <div className="text-xs text-ui-text-secondary group-hover:text-white/70 transition-colors">
                                        Single widget fills screen
                                    </div>
                                </div>
                            </button>
                        </div>
                    </>
                );

            case "overwrite":
                // If no widgets, show a different message
                if (enabledWidgetCount === 0) {
                    return (
                        <>
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ui-bg-tertiary mb-3">
                                    <AlertTriangle className="w-6 h-6 text-ui-text-muted" />
                                </div>
                                <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                    No Widgets to Save
                                </h3>
                                <p className="text-sm text-ui-text-secondary mb-4">
                                    Add some widgets to your dashboard before saving to this preset.
                                </p>
                            </div>
                        </>
                    );
                }
                
                return (
                    <>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 mb-3">
                                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                Overwrite Preset {presetIndex + 1}?
                            </h3>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                This will replace the existing preset with your current {enabledWidgetCount} widget{enabledWidgetCount !== 1 ? 's' : ''}.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Button
                                onClick={() => handleSave("grid")}
                                className="w-full"
                                size="lg"
                            >
                                Save as Grid
                            </Button>
                            <Button
                                onClick={() => handleSave("fullscreen")}
                                variant="secondary"
                                className="w-full"
                                size="lg"
                            >
                                Save as Fullscreen
                            </Button>
                        </div>
                    </>
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="sm" showClose={false}>
                <DialogBody className="p-6">
                    {renderDialogContent()}

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full mt-3 text-ui-text-secondary"
                    >
                        Cancel
                    </Button>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
});

export default PresetDialog;
