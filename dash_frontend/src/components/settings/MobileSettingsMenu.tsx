'use client';

import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/lib/auth";
import { MdChevronRight, MdShield, MdLogout } from "react-icons/md";
import { NAVIGATION_ITEMS, getBadgeColors, SettingsView } from "./types";

// =============================================================================
// Mobile Main Menu
// =============================================================================

interface MobileMainMenuProps {
    user: User | null;
    onNavigate: (view: SettingsView) => void;
    onLogout: () => void;
    onAdminClick?: () => void;
    privacyEnabled: boolean;
}

export function MobileMainMenu({
    user,
    onNavigate,
    onLogout,
    onAdminClick,
    privacyEnabled,
}: MobileMainMenuProps) {
    return (
        <motion.div
            key="main-menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4"
        >
            {/* User Info Card */}
            <div className="mb-6 p-4 bg-ui-bg-secondary/50 rounded-xl border border-ui-border-primary">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ui-accent-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-semibold text-ui-accent-primary">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-ui-text-primary truncate">{user?.name}</div>
                        <div className="text-sm text-ui-text-secondary truncate">{user?.email}</div>
                        {user?.role && (
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'admin'
                                    ? 'bg-ui-accent-secondary/20 text-ui-accent-secondary'
                                    : 'bg-ui-accent-primary/20 text-ui-accent-primary'
                                }`}>
                                {user.role.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <div className="space-y-2">
                {NAVIGATION_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const showBadge = item.id === 'privacy' && privacyEnabled;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-ui-bg-secondary/30 hover:bg-ui-bg-secondary/60 transition-all active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-lg bg-ui-bg-tertiary flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-ui-text-secondary" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-ui-text-primary">{item.label}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {item.badge && !showBadge && (
                                    <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                        style={getBadgeColors(item.badge)}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                                {showBadge && (
                                    <div className="w-2 h-2 rounded-full bg-ui-accent-secondary flex-shrink-0" />
                                )}
                                <MdChevronRight className="w-5 h-5 text-ui-text-tertiary" />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
                {user?.role === 'admin' && onAdminClick && (
                    <button
                        onClick={onAdminClick}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white rounded-xl font-medium transition-colors"
                    >
                        <MdShield className="w-5 h-5" />
                        <span>Admin Panel</span>
                    </button>
                )}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-xl font-medium transition-all"
                >
                    <MdLogout className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </motion.div>
    );
}
