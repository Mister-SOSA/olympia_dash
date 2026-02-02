'use client';

import { AlertTriangle, Trash2 } from "lucide-react";
import { preferencesService } from "@/lib/preferences";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
    const handleConfirm = async () => {
        if (nuclearInput === 'DELETE ALL PREFERENCES') {
            await preferencesService.clearAll();
            window.location.reload();
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="border-2 border-red-500/50">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-full bg-red-500/10">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-lg font-bold">
                            Clear All Preferences
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
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
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={nuclearInput !== 'DELETE ALL PREFERENCES'}
                        variant="danger"
                        className={nuclearInput !== 'DELETE ALL PREFERENCES' ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Wipe Everything
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
