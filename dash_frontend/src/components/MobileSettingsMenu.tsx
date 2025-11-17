'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { preferencesService } from "@/lib/preferences";
import {
    X,
    User as UserIcon,
    Palette,
    Settings as SettingsIcon,
    Shield,
    LogOut,
    ChevronRight,
    Check
} from "lucide-react";

interface MobileSettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

type View = 'main' | 'themes' | 'preferences' | 'account';

export default function MobileSettingsMenu({ user, onLogout, onClose, onAdminClick }: MobileSettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const [currentView, setCurrentView] = useState<View>('main');
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>('dark');

    // Load preferences
    const [autoSaveLayout, setAutoSaveLayout] = useState(
        preferencesService.get<boolean>('dashboard.autoSave', true)
    );
    const [showRefreshIndicators, setShowRefreshIndicators] = useState(
        preferencesService.get<boolean>('widgets.showRefreshIndicators', true)
    );
    const [enableAnimations, setEnableAnimations] = useState(
        preferencesService.get<boolean>('appearance.animations', true)
    );
    const [soundNotifications, setSoundNotifications] = useState(
        preferencesService.get<boolean>('notifications.sound', true)
    );
    const [widgetRefreshInterval, setWidgetRefreshInterval] = useState(
        preferencesService.get<number>('widgets.defaultRefreshInterval', 30)
    );

    const updatePreference = (key: string, value: any, setter: (val: any) => void) => {
        setter(value);
        preferencesService.set(key, value);
    };

    const goBack = () => {
        setCurrentView('main');
    };

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="mobile-settings-menu"
        >
            <AnimatePresence mode="wait">
                {/* Main Menu */}
                {currentView === 'main' && (
                    <motion.div
                        key="main"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="mobile-settings-view"
                    >
                        {/* Header */}
                        <div className="mobile-settings-header">
                            <div className="flex items-center gap-2 mb-1">
                                <SettingsIcon className="w-5 h-5 text-ui-accent-primary" />
                                <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                            </div>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                {user?.name} • {user?.role?.toUpperCase()}
                            </p>
                            <button
                                onClick={onClose}
                                className="mobile-icon-button absolute top-4 right-4"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="mobile-settings-content">
                            <div className="space-y-2">
                                <MenuButton
                                    icon={Palette}
                                    label="Themes"
                                    description="Change your dashboard theme"
                                    onClick={() => setCurrentView('themes')}
                                />

                                <MenuButton
                                    icon={SettingsIcon}
                                    label="Preferences"
                                    description="Dashboard & widget settings"
                                    onClick={() => setCurrentView('preferences')}
                                />

                                <MenuButton
                                    icon={UserIcon}
                                    label="Account"
                                    description="Profile and account info"
                                    onClick={() => setCurrentView('account')}
                                />
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 space-y-2">
                                {user?.role === 'admin' && onAdminClick && (
                                    <button
                                        onClick={onAdminClick}
                                        className="mobile-settings-action-button bg-ui-accent-secondary border-ui-accent-secondary"
                                    >
                                        <Shield className="w-5 h-5" />
                                        <span>Admin Panel</span>
                                    </button>
                                )}

                                <button
                                    onClick={onLogout}
                                    className="mobile-settings-action-button bg-ui-danger-bg border-ui-danger-border text-ui-danger-text"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Themes View */}
                {currentView === 'themes' && (
                    <motion.div
                        key="themes"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="mobile-settings-view"
                    >
                        <div className="mobile-settings-header">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={goBack} className="mobile-icon-button">
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Themes</h2>
                                    <p className="text-sm text-ui-text-secondary">Choose your dashboard theme</p>
                                </div>
                            </div>

                            {/* Category Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setThemeCategory('dark')}
                                    className={`mobile-category-pill ${themeCategory === 'dark' ? 'mobile-category-pill-active' : ''
                                        }`}
                                >
                                    Dark Themes
                                </button>
                                <button
                                    onClick={() => setThemeCategory('light')}
                                    className={`mobile-category-pill ${themeCategory === 'light' ? 'mobile-category-pill-active' : ''
                                        }`}
                                >
                                    Light Themes
                                </button>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="grid grid-cols-2 gap-3">
                                {THEMES.filter(t => t.category === themeCategory).map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`mobile-theme-card ${theme === t.id ? 'mobile-theme-card-active' : ''
                                            }`}
                                    >
                                        {/* Theme Preview */}
                                        <div className="mobile-theme-preview" style={{ backgroundColor: t.colors[2] }}>
                                            <div className="flex-1 p-2 space-y-2">
                                                {/* Header */}
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-1.5 w-8 rounded" style={{ backgroundColor: t.colors[0] }} />
                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                                                </div>

                                                {/* Widget */}
                                                <div className="rounded p-2 space-y-1" style={{
                                                    backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
                                                }}>
                                                    <div className="h-1 w-full rounded" style={{
                                                        backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                                                    }} />
                                                    <div className="h-1 w-3/4 rounded" style={{
                                                        backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                                                    }} />
                                                </div>

                                                {/* Chart */}
                                                <div className="rounded p-1.5" style={{
                                                    backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
                                                }}>
                                                    <div className="flex items-end justify-between h-6 gap-0.5">
                                                        <div className="w-full rounded-t" style={{
                                                            backgroundColor: t.colors[0],
                                                            height: '50%'
                                                        }} />
                                                        <div className="w-full rounded-t" style={{
                                                            backgroundColor: t.colors[1],
                                                            height: '80%'
                                                        }} />
                                                        <div className="w-full rounded-t" style={{
                                                            backgroundColor: t.colors[0],
                                                            height: '35%'
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Theme Name */}
                                        <div className="mobile-theme-name">
                                            <span className="font-medium text-ui-text-primary">{t.name}</span>
                                            {theme === t.id && (
                                                <Check className="w-4 h-4 text-ui-accent-primary" strokeWidth={3} />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Preferences View */}
                {currentView === 'preferences' && (
                    <motion.div
                        key="preferences"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="mobile-settings-view"
                    >
                        <div className="mobile-settings-header">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={goBack} className="mobile-icon-button">
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Preferences</h2>
                                    <p className="text-sm text-ui-text-secondary">Customize behavior</p>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-4">
                                <MobileToggleSetting
                                    label="Enable Animations"
                                    description="Smooth transitions and effects"
                                    enabled={enableAnimations}
                                    onChange={(val) => updatePreference('appearance.animations', val, setEnableAnimations)}
                                />

                                <MobileToggleSetting
                                    label="Auto-Save Layout"
                                    description="Save widget positions automatically"
                                    enabled={autoSaveLayout}
                                    onChange={(val) => updatePreference('dashboard.autoSave', val, setAutoSaveLayout)}
                                />

                                <MobileToggleSetting
                                    label="Refresh Indicators"
                                    description="Show countdown rings on widgets"
                                    enabled={showRefreshIndicators}
                                    onChange={(val) => updatePreference('widgets.showRefreshIndicators', val, setShowRefreshIndicators)}
                                />

                                <MobileToggleSetting
                                    label="Sound Notifications"
                                    description="Play sound for important alerts"
                                    enabled={soundNotifications}
                                    onChange={(val) => updatePreference('notifications.sound', val, setSoundNotifications)}
                                />

                                {/* Refresh Interval */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Refresh Interval
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            How often widgets update
                                        </div>
                                        <select
                                            value={widgetRefreshInterval}
                                            onChange={(e) => updatePreference('widgets.defaultRefreshInterval', Number(e.target.value), setWidgetRefreshInterval)}
                                            className="mobile-select"
                                        >
                                            <option value={10}>10 seconds (Fast)</option>
                                            <option value={30}>30 seconds (Default)</option>
                                            <option value={60}>1 minute</option>
                                            <option value={300}>5 minutes</option>
                                            <option value={600}>10 minutes</option>
                                            <option value={0}>Manual only</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Account View */}
                {currentView === 'account' && (
                    <motion.div
                        key="account"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="mobile-settings-view"
                    >
                        <div className="mobile-settings-header">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={goBack} className="mobile-icon-button">
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Account</h2>
                                    <p className="text-sm text-ui-text-secondary">Your profile information</p>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-4">
                                <div className="mobile-settings-group">
                                    <div className="text-xs text-ui-text-tertiary mb-1">Name</div>
                                    <div className="text-base font-semibold text-ui-text-primary">{user?.name}</div>
                                </div>

                                <div className="mobile-settings-group">
                                    <div className="text-xs text-ui-text-tertiary mb-1">Email</div>
                                    <div className="text-base font-semibold text-ui-text-primary">{user?.email}</div>
                                </div>

                                {user?.role && (
                                    <div className="mobile-settings-group">
                                        <div className="text-xs text-ui-text-tertiary mb-2">Role</div>
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${user.role === 'admin'
                                                ? 'bg-ui-accent-secondary text-white'
                                                : 'bg-ui-accent-primary text-white'
                                            }`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Helper Components
function MenuButton({
    icon: Icon,
    label,
    description,
    onClick
}: {
    icon: any;
    label: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button onClick={onClick} className="mobile-menu-button">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="mobile-menu-icon">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="font-semibold text-ui-text-primary">{label}</div>
                    <div className="text-sm text-ui-text-secondary">{description}</div>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-ui-text-tertiary flex-shrink-0" />
        </button>
    );
}

function MobileToggleSetting({
    label,
    description,
    enabled,
    onChange
}: {
    label: string;
    description: string;
    enabled?: boolean;
    onChange: (val: boolean) => void;
}) {
    const isEnabled = enabled ?? false;
    return (
        <div className="mobile-settings-group">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ui-text-primary mb-1">{label}</div>
                    <div className="text-xs text-ui-text-secondary">{description}</div>
                </div>
                <button
                    onClick={() => onChange(!isEnabled)}
                    className={`mobile-toggle ${isEnabled ? 'mobile-toggle-active' : ''}`}
                >
                    <motion.div
                        className="mobile-toggle-knob"
                        animate={{ x: isEnabled ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                </button>
            </div>
        </div>
    );
}
