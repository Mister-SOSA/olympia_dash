'use client';

import { motion } from "framer-motion";
import { useState } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES, Theme } from "@/contexts/ThemeContext";
import { preferencesService } from "@/lib/preferences";
import { 
    MdCheck, 
    MdPerson, 
    MdPalette, 
    MdKeyboard, 
    MdDashboard,
    MdNotifications,
    MdWidgets,
    MdSettings as MdSettingsIcon,
    MdChevronRight
} from "react-icons/md";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

type Tab = 'general' | 'dashboard' | 'widgets' | 'notifications' | 'keyboard' | 'account';

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick }: SettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [themeExpanded, setThemeExpanded] = useState(false);

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

    const tabs = [
        { id: 'general' as Tab, label: 'General', icon: MdSettingsIcon },
        { id: 'dashboard' as Tab, label: 'Dashboard', icon: MdDashboard },
        { id: 'widgets' as Tab, label: 'Widgets', icon: MdWidgets },
        { id: 'notifications' as Tab, label: 'Notifications', icon: MdNotifications },
        { id: 'keyboard' as Tab, label: 'Keyboard', icon: MdKeyboard },
        { id: 'account' as Tab, label: 'Account', icon: MdPerson },
    ];

    const updatePreference = (key: string, value: any, setter: (val: any) => void) => {
        setter(value);
        preferencesService.set(key, value);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
                <div className="bg-ui-bg-primary rounded-xl shadow-2xl border border-ui-border-primary overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-ui-border-primary flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                            <p className="text-xs text-ui-text-secondary">Customize your dashboard experience</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>

                    {/* Content Area with Sidebar */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-48 border-r border-ui-border-primary bg-ui-bg-secondary/30 flex-shrink-0">
                            <nav className="p-2 space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                                                activeTab === tab.id
                                                    ? 'bg-ui-accent-primary text-white'
                                                    : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Content Panel */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6">
                                {/* General Tab */}
                                {activeTab === 'general' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Appearance</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Customize how your dashboard looks</p>
                                        </div>

                                        {/* Theme Selector */}
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setThemeExpanded(!themeExpanded)}
                                                className="w-full flex items-center justify-between p-4 rounded-lg bg-ui-bg-secondary hover:bg-ui-bg-tertiary border border-ui-border-primary transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <MdPalette className="w-5 h-5 text-ui-accent-primary-text" />
                                                    <div className="text-left">
                                                        <div className="font-medium text-ui-text-primary text-sm">Theme</div>
                                                        <div className="text-xs text-ui-text-secondary">
                                                            {THEMES.find(t => t.id === theme)?.name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <motion.div
                                                    animate={{ rotate: themeExpanded ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <MdChevronRight className="w-5 h-5 text-ui-text-secondary" />
                                                </motion.div>
                                            </button>

                                            {themeExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-2 pl-4"
                                                >
                                                    {THEMES.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => setTheme(t.id)}
                                                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                                theme === t.id
                                                                    ? 'border-ui-accent-primary bg-ui-accent-primary-bg'
                                                                    : 'border-ui-border-primary bg-ui-bg-primary/50 hover:bg-ui-bg-secondary'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex gap-1 flex-shrink-0">
                                                                    {t.colors.map((color, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="w-4 h-4 rounded-full border border-black/20"
                                                                            style={{ backgroundColor: color }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-ui-text-primary text-sm">{t.name}</div>
                                                                    <div className="text-xs text-ui-text-secondary truncate">{t.description}</div>
                                                                </div>
                                                                {theme === t.id && (
                                                                    <MdCheck className="w-5 h-5 text-ui-accent-primary-text flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Animations Toggle */}
                                        <ToggleSetting
                                            label="Enable Animations"
                                            description="Smooth transitions and effects"
                                            enabled={enableAnimations}
                                            onChange={(val) => updatePreference('appearance.animations', val, setEnableAnimations)}
                                        />
                                    </div>
                                )}

                                {/* Dashboard Tab */}
                                {activeTab === 'dashboard' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Dashboard Settings</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Configure dashboard behavior</p>
                                        </div>

                                        <ToggleSetting
                                            label="Auto-Save Layout"
                                            description="Automatically save widget positions when moved"
                                            enabled={autoSaveLayout}
                                            onChange={(val) => updatePreference('dashboard.autoSave', val, setAutoSaveLayout)}
                                        />

                                        <div className="p-4 rounded-lg bg-ui-bg-secondary border border-ui-border-primary">
                                            <div className="text-sm font-medium text-ui-text-primary mb-2">Layout Info</div>
                                            <div className="text-xs text-ui-text-secondary space-y-1">
                                                <p>• Use presets (1-9) to save and switch between layouts</p>
                                                <p>• Drag widgets to rearrange your dashboard</p>
                                                <p>• Right-click widgets for more options</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Widgets Tab */}
                                {activeTab === 'widgets' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Widget Settings</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Control widget behavior and updates</p>
                                        </div>

                                        <ToggleSetting
                                            label="Show Refresh Indicators"
                                            description="Display countdown rings on widgets"
                                            enabled={showRefreshIndicators}
                                            onChange={(val) => updatePreference('widgets.showRefreshIndicators', val, setShowRefreshIndicators)}
                                        />

                                        <div className="space-y-3">
                                            <label className="block">
                                                <div className="text-sm font-medium text-ui-text-primary mb-1">Default Refresh Interval</div>
                                                <div className="text-xs text-ui-text-secondary mb-3">How often widgets update (in seconds)</div>
                                                <select
                                                    value={widgetRefreshInterval}
                                                    onChange={(e) => updatePreference('widgets.defaultRefreshInterval', Number(e.target.value), setWidgetRefreshInterval)}
                                                    className="w-full px-4 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all"
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
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Notification Settings</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Manage alerts and notifications</p>
                                        </div>

                                        <ToggleSetting
                                            label="Sound Notifications"
                                            description="Play sound for important alerts"
                                            enabled={soundNotifications}
                                            onChange={(val) => updatePreference('notifications.sound', val, setSoundNotifications)}
                                        />

                                        <div className="p-4 rounded-lg bg-ui-bg-secondary border border-ui-border-primary">
                                            <div className="text-sm font-medium text-ui-text-primary mb-2">Toast Notifications</div>
                                            <div className="text-xs text-ui-text-secondary space-y-1">
                                                <p>• Preset changes show at the top</p>
                                                <p>• Status updates appear briefly</p>
                                                <p>• Click to dismiss early</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Keyboard Tab */}
                                {activeTab === 'keyboard' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Keyboard Shortcuts</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Quick actions at your fingertips</p>
                                        </div>

                                        <div className="space-y-3">
                                            <ShortcutItem shortcut="F" description="Open Widget Menu" />
                                            <ShortcutItem shortcut="P" description="Open Preset Manager" />
                                            <ShortcutItem shortcut="S" description="Open Settings" />
                                            <ShortcutItem shortcut="X" description="Compact Dashboard" />
                                            <ShortcutItem shortcut="1-9" description="Load Preset" />
                                            <ShortcutItem shortcut="⇧ 1-9" description="Save Preset" />
                                            <ShortcutItem shortcut="0" description="Reload Page" />
                                            <ShortcutItem shortcut="← →" description="Previous/Next Preset" />
                                        </div>
                                    </div>
                                )}

                                {/* Account Tab */}
                                {activeTab === 'account' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-semibold text-ui-text-primary mb-1">Account</h3>
                                            <p className="text-sm text-ui-text-secondary mb-4">Manage your account settings</p>
                                        </div>

                                        <div className="p-4 rounded-lg bg-ui-bg-secondary border border-ui-border-primary">
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-xs text-ui-text-secondary mb-1">Name</div>
                                                    <div className="text-sm font-medium text-ui-text-primary">{user?.name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-ui-text-secondary mb-1">Email</div>
                                                    <div className="text-sm font-medium text-ui-text-primary">{user?.email}</div>
                                                </div>
                                                {user?.role && (
                                                    <div>
                                                        <div className="text-xs text-ui-text-secondary mb-1">Role</div>
                                                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                            user.role === 'admin'
                                                                ? 'bg-ui-accent-secondary-bg text-ui-accent-secondary-text'
                                                                : 'bg-ui-accent-primary-bg text-ui-accent-primary-text'
                                                        }`}>
                                                            {user.role.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {user?.role === 'admin' && onAdminClick && (
                                                <button
                                                    onClick={onAdminClick}
                                                    className="w-full px-4 py-3 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Open Admin Panel
                                                </button>
                                            )}
                                            <button
                                                onClick={onLogout}
                                                className="w-full px-4 py-3 bg-ui-danger-bg hover:bg-ui-danger-bg border border-ui-danger-border text-ui-danger-text rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Helper Components
function ToggleSetting({ 
    label, 
    description, 
    enabled, 
    onChange 
}: { 
    label: string; 
    description: string; 
    enabled: boolean; 
    onChange: (val: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 rounded-lg bg-ui-bg-secondary border border-ui-border-primary">
            <div className="flex-1">
                <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                <div className="text-xs text-ui-text-secondary mt-1">{description}</div>
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                }`}
            >
                <motion.div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                    animate={{ x: enabled ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}

function ShortcutItem({ shortcut, description }: { shortcut: string; description: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-ui-bg-secondary/50">
            <span className="text-sm text-ui-text-primary">{description}</span>
            <kbd className="px-3 py-1.5 bg-ui-bg-tertiary text-ui-text-primary rounded font-mono text-sm border border-ui-border-primary">
                {shortcut}
            </kbd>
        </div>
    );
}
