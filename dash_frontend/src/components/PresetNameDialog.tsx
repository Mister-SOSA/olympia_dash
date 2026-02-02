"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MdClose, MdEdit, MdSave } from "react-icons/md";

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

    if (!isOpen) return null;

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
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-ui-border-primary">
                    <div className="flex items-center gap-2">
                        <MdEdit className="w-5 h-5 text-ui-accent-primary-text" />
                        <div>
                            <h3 className="text-lg font-semibold text-ui-text-primary">{title}</h3>
                            {presetNumber !== undefined && (
                                <p className="text-xs text-ui-text-secondary">Preset {presetNumber}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ui-text-primary mb-2">
                            Preset Name <span className="text-ui-danger-text">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Sales Overview, Morning Dashboard"
                            autoFocus
                            maxLength={50}
                            className="w-full px-4 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:border-ui-accent-primary focus:ring-2 focus:ring-ui-accent-primary/20 transition-all"
                        />
                        <p className="mt-1 text-xs text-ui-text-secondary">
                            {name.length}/50 characters
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ui-text-primary mb-2">
                            Description <span className="text-ui-text-muted">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a description to help you remember what this preset is for..."
                            rows={3}
                            maxLength={200}
                            className="w-full px-4 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:border-ui-accent-primary focus:ring-2 focus:ring-ui-accent-primary/20 transition-all resize-none"
                        />
                        <p className="mt-1 text-xs text-ui-text-secondary">
                            {description.length}/200 characters
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-ui-border-primary flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-ui-bg-secondary hover:bg-ui-bg-tertiary text-ui-text-primary rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 px-4 py-2 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <MdSave className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

