'use client';

import { motion, AnimatePresence } from "framer-motion";
import { MdWarning, MdDelete } from "react-icons/md";
import { preferencesService } from "@/lib/preferences";

// =============================================================================
// Nuclear Modal Component
// =============================================================================

interface NuclearModalProps {
    isOpen: boolean;
    onClose: () => void;
    nuclearInput: string;
    setNuclearInput: (val: string) => void;
}

export function NuclearModal({
    isOpen,
    onClose,
    nuclearInput,
    setNuclearInput,
}: NuclearModalProps) {
    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (nuclearInput === 'DELETE ALL PREFERENCES') {
            await preferencesService.clearAll();
            window.location.reload();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-ui-bg-secondary rounded-lg shadow-xl border-2 border-red-500/50 w-full max-w-md overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="text-red-500">
                                <MdWarning size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-ui-text-primary">Clear All Preferences</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-ui-text-secondary text-sm leading-relaxed">
                                This will permanently delete <strong>ALL</strong> your preferences and cannot be undone!
                                This includes layouts, presets, themes, widget settings, and all configurations.
                            </p>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-400">
                                    ⚠️ This action is PERMANENT and syncs across all sessions!
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ui-text-primary mb-2">
                                    Type <code className="px-2 py-1 bg-ui-bg-tertiary rounded text-red-400 font-mono text-xs">DELETE ALL PREFERENCES</code> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={nuclearInput}
                                    onChange={(e) => setNuclearInput(e.target.value)}
                                    placeholder="DELETE ALL PREFERENCES"
                                    className="w-full px-3 py-2 bg-ui-bg-tertiary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-ui-bg-tertiary px-6 py-4 flex gap-3 justify-end border-t border-ui-border-primary">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={nuclearInput !== 'DELETE ALL PREFERENCES'}
                            className={`px-5 py-2 text-sm font-bold rounded-md transition-colors shadow-lg ${nuclearInput === 'DELETE ALL PREFERENCES'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-ui-bg-quaternary text-ui-text-muted cursor-not-allowed'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <MdDelete className="w-4 h-4" />
                                Wipe Everything
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
