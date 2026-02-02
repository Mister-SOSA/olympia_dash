"use client";

import React, { useState, useEffect } from "react";
import { Edit3, Save } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PresetNameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    initialName?: string;
    initialDescription?: string;
    title?: string;
    presetNumber?: number;
}

export default function PresetNameDialog({
    isOpen,
    onClose,
    onSave,
    initialName = "",
    initialDescription = "",
    title = "Name Your Preset",
    presetNumber
}: PresetNameDialogProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);

    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setDescription(initialDescription);
        }
    }, [isOpen, initialName, initialDescription]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), description.trim());
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="sm">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-ui-accent-primary" />
                        <div>
                            <DialogTitle>{title}</DialogTitle>
                            {presetNumber !== undefined && (
                                <DialogDescription>Preset {presetNumber}</DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="preset-name">
                            Preset Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="preset-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Sales Overview, Morning Dashboard"
                            autoFocus
                            maxLength={50}
                        />
                        <p className="text-xs text-ui-text-secondary">
                            {name.length}/50 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="preset-description">
                            Description <span className="text-ui-text-muted">(optional)</span>
                        </Label>
                        <textarea
                            id="preset-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a description to help you remember what this preset is for..."
                            rows={3}
                            maxLength={200}
                            className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:border-ui-accent-primary focus:ring-2 focus:ring-ui-accent-primary/20 transition-all resize-none text-sm"
                        />
                        <p className="text-xs text-ui-text-secondary">
                            {description.length}/200 characters
                        </p>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 sm:flex-none gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

