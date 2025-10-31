'use client';

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { User } from "@/lib/auth";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick }: SettingsMenuProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
            >
                <Card className="bg-slate-800/95 border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Settings</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* User Info */}
                        <div className="border-b border-slate-700 pb-4">
                            <p className="text-slate-400 text-sm mb-1">Signed in as</p>
                            <p className="text-white font-semibold">{user?.name}</p>
                            <p className="text-slate-300 text-sm">{user?.email}</p>
                            {user?.role && (
                                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {user.role.toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            {user?.role === 'admin' && onAdminClick && (
                                <Button
                                    onClick={onAdminClick}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    Admin Panel
                                </Button>
                            )}

                            <Button
                                onClick={onLogout}
                                variant="outline"
                                className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                            >
                                Logout
                            </Button>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div className="border-t border-slate-700 pt-4">
                            <p className="text-slate-400 text-sm font-semibold mb-2">Keyboard Shortcuts</p>
                            <div className="space-y-1 text-xs text-slate-400">
                                <div className="flex justify-between">
                                    <span>Widget Menu</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">F</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Preset Menu</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">P</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Settings</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">S</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Compact Dashboard</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">X</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Load Preset 1-9</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">1-9</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Save Preset 1-9</span>
                                    <kbd className="px-2 py-1 bg-slate-700 rounded">Shift+1-9</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
}
