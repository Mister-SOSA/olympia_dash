'use client';

import { motion } from "framer-motion";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { MdCheck } from "react-icons/md";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick }: SettingsMenuProps) {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
            >
                <div className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-ui-border-primary">
                        <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* User Info */}
                        <div className="border-b border-ui-border-primary pb-4">
                            <p className="text-ui-text-secondary text-sm mb-1">Signed in as</p>
                            <p className="text-ui-text-primary font-semibold">{user?.name}</p>
                            <p className="text-ui-text-secondary text-sm">{user?.email}</p>
                            {user?.role && (
                                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin'
                                        ? 'bg-ui-accent-secondary-bg text-ui-accent-secondary-text'
                                        : 'bg-ui-accent-primary-bg text-ui-accent-primary-text'
                                    }`}>
                                    {user.role.toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Theme Selector */}
                        <div>
                            <h3 className="text-ui-text-primary text-sm font-semibold mb-3">Theme</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`w-full p-3 rounded-lg border-2 transition-all text-left group ${
                                            theme === t.id
                                                ? 'border-ui-accent-primary bg-ui-accent-primary-bg'
                                                : 'border-ui-border-primary bg-ui-bg-secondary/50 hover:bg-ui-bg-secondary hover:border-ui-border-secondary'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1">
                                                {t.colors.map((color, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-ui-text-primary text-sm">{t.name}</div>
                                                <div className="text-xs text-ui-text-secondary">{t.description}</div>
                                            </div>
                                            {theme === t.id && (
                                                <MdCheck className="w-5 h-5 text-ui-accent-primary-text flex-shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            {user?.role === 'admin' && onAdminClick && (
                                <button
                                    onClick={onAdminClick}
                                    className="w-full px-4 py-2 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Admin Panel
                                </button>
                            )}

                            <button
                                onClick={onLogout}
                                className="w-full px-4 py-2 bg-ui-danger-bg hover:bg-ui-danger-bg border border-ui-danger-border text-ui-danger-text rounded-lg text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div className="border-t border-ui-border-primary pt-4">
                            <p className="text-ui-text-secondary text-sm font-semibold mb-2">Keyboard Shortcuts</p>
                            <div className="space-y-1 text-xs text-ui-text-secondary">
                                <div className="flex justify-between">
                                    <span>Widget Menu</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">F</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Preset Menu</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">P</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Settings</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">S</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Compact Dashboard</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">X</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Load Preset 1-9</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">1-9</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Save Preset 1-9</span>
                                    <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded">Shift+1-9</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
