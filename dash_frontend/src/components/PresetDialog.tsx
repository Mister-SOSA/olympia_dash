"use client";

import React, { memo, useCallback } from "react";
import { Widget, PresetType } from "@/types";
import { Plus, Grid3X3, Maximize2, AlertTriangle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DialogType = "empty" | "save" | "overwrite";

interface PresetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dialogType: DialogType;
    presetIndex: number;
    currentLayout: Widget[];
    onCreateBlank: (index: number) => void;
    onSavePreset: (index: number, layout: Widget[], type: PresetType) => void;
    onLoadPreset: (index: number) => void;
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

    const renderDialogContent = () => {
        switch (dialogType) {
            case "empty":
                return (
                    <>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ui-accent-primary/10 mb-3">
                                <Plus className="w-6 h-6 text-ui-accent-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
                                Slot {presetIndex + 1} is Empty
                            </h3>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                Create a new blank preset or use the widget menu to customize your dashboard first.
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateBlank}
                            className="w-full"
                            size="lg"
                        >
                            Create Blank Preset
                        </Button>
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
                                This will replace the existing preset with your current layout.
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
