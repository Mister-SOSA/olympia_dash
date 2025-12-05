'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { useSettings } from "@/hooks/useSettings";
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    REFRESH_INTERVAL_OPTIONS,
    NOTIFICATION_SETTINGS,
    WIDGET_SETTINGS,
} from "@/constants/settings";
import {
    X,
    User as UserIcon,
    Palette,
    Settings as SettingsIcon,
    Shield,
    LogOut,
    ChevronRight,
    Check,
    Clock,
    Bell,
    Database
} from "lucide-react";

interface MobileSettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

type View = 'main' | 'themes' | 'preferences' | 'datetime' | 'notifications' | 'data' | 'account';

export default function MobileSettingsMenu({ user, onLogout, onClose, onAdminClick }: MobileSettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoaded } = useSettings();
    const [currentView, setCurrentView] = useState<View>('main');
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>('dark');

    const goBack = () => {
        setCurrentView('main');
    };

    if (!isLoaded) {
        return null;
    }

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
                                    icon={Clock}
                                    label="Date & Time"
                                    description="Timezone and format settings"
                                    onClick={() => setCurrentView('datetime')}
                                />

                                <MenuButton
                                    icon={SettingsIcon}
                                    label="Preferences"
                                    description="Dashboard & widget settings"
                                    onClick={() => setCurrentView('preferences')}
                                />

                                <MenuButton
                                    icon={Bell}
                                    label="Notifications"
                                    description="Sound and alert settings"
                                    onClick={() => setCurrentView('notifications')}
                                />

                                <MenuButton
                                    icon={Database}
                                    label="Data"
                                    description="Number and currency formats"
                                    onClick={() => setCurrentView('data')}
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
                                    enabled={settings.animations}
                                    onChange={(val) => updateSetting('animations', val)}
                                />

                                <MobileToggleSetting
                                    label="Auto-Save Layout"
                                    description="Save widget positions automatically"
                                    enabled={settings.autoSave}
                                    onChange={(val) => updateSetting('autoSave', val)}
                                />

                                <MobileToggleSetting
                                    label="Confirm Widget Removal"
                                    description="Ask before removing widgets"
                                    enabled={settings.confirmDelete}
                                    onChange={(val) => updateSetting('confirmDelete', val)}
                                />

                                <MobileToggleSetting
                                    label="Refresh Indicators"
                                    description="Show countdown rings on widgets"
                                    enabled={settings.showRefreshIndicators}
                                    onChange={(val) => updateSetting('showRefreshIndicators', val)}
                                />

                                <MobileToggleSetting
                                    label="Widget Titles"
                                    description="Show titles in widget headers"
                                    enabled={settings.showWidgetTitles}
                                    onChange={(val) => updateSetting('showWidgetTitles', val)}
                                />

                                <MobileToggleSetting
                                    label="Enable Hotkeys"
                                    description="Allow keyboard shortcuts"
                                    enabled={settings.enableHotkeys}
                                    onChange={(val) => updateSetting('enableHotkeys', val)}
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
                                            value={settings.defaultRefreshInterval}
                                            onChange={(e) => updateSetting('defaultRefreshInterval', Number(e.target.value))}
                                            className="mobile-select"
                                        >
                                            {REFRESH_INTERVAL_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {/* Table Rows */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Table Rows
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            Default rows in table widgets
                                        </div>
                                        <select
                                            value={settings.tableRowsPerPage}
                                            onChange={(e) => updateSetting('tableRowsPerPage', Number(e.target.value))}
                                            className="mobile-select"
                                        >
                                            {WIDGET_SETTINGS.tableRowsPerPage.options.map(n => (
                                                <option key={n} value={n}>{n} rows</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Date & Time View */}
                {currentView === 'datetime' && (
                    <motion.div
                        key="datetime"
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
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Date & Time</h2>
                                    <p className="text-sm text-ui-text-secondary">Regional settings</p>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-4">
                                {/* Timezone */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Timezone
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            Display times in this timezone
                                        </div>
                                        <select
                                            value={settings.timezone}
                                            onChange={(e) => updateSetting('timezone', e.target.value as any)}
                                            className="mobile-select"
                                        >
                                            {TIMEZONE_OPTIONS.map(tz => (
                                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {/* Date Format */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Date Format
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            How dates are displayed
                                        </div>
                                        <select
                                            value={settings.dateFormat}
                                            onChange={(e) => updateSetting('dateFormat', e.target.value as any)}
                                            className="mobile-select"
                                        >
                                            {DATE_FORMAT_OPTIONS.map(df => (
                                                <option key={df.value} value={df.value}>{df.label} ({df.example})</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {/* Clock Format */}
                                <div className="mobile-settings-group">
                                    <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                        Clock Format
                                    </div>
                                    <div className="text-xs text-ui-text-secondary mb-3">
                                        12-hour or 24-hour time
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateSetting('clockFormat', '12h')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.clockFormat === '12h'
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary'
                                                }`}
                                        >
                                            12h
                                        </button>
                                        <button
                                            onClick={() => updateSetting('clockFormat', '24h')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.clockFormat === '24h'
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary'
                                                }`}
                                        >
                                            24h
                                        </button>
                                    </div>
                                </div>

                                <MobileToggleSetting
                                    label="Show Seconds"
                                    description="Display seconds in clock widgets"
                                    enabled={settings.showSeconds}
                                    onChange={(val) => updateSetting('showSeconds', val)}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Notifications View */}
                {currentView === 'notifications' && (
                    <motion.div
                        key="notifications"
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
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Notifications</h2>
                                    <p className="text-sm text-ui-text-secondary">Sound and alert settings</p>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-4">
                                <MobileToggleSetting
                                    label="Sound Notifications"
                                    description="Play sound for important alerts"
                                    enabled={settings.soundEnabled}
                                    onChange={(val) => updateSetting('soundEnabled', val)}
                                />

                                {/* Volume Slider */}
                                <div className={`mobile-settings-group ${!settings.soundEnabled ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div className="text-sm font-semibold text-ui-text-primary">Volume</div>
                                            <div className="text-xs text-ui-text-secondary">Notification volume level</div>
                                        </div>
                                        <span className="text-sm font-medium text-ui-text-primary">{settings.volume}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={settings.volume}
                                        onChange={(e) => settings.soundEnabled && updateSetting('volume', Number(e.target.value))}
                                        disabled={!settings.soundEnabled}
                                        className="w-full h-2 bg-ui-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-ui-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                                    />
                                </div>

                                <MobileToggleSetting
                                    label="Desktop Notifications"
                                    description="Show browser notifications"
                                    enabled={settings.desktopNotifications}
                                    onChange={(val) => updateSetting('desktopNotifications', val)}
                                />

                                {/* Toast Position */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Toast Position
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            Where notifications appear
                                        </div>
                                        <select
                                            value={settings.toastPosition}
                                            onChange={(e) => updateSetting('toastPosition', e.target.value as any)}
                                            className="mobile-select"
                                        >
                                            {NOTIFICATION_SETTINGS.toastPosition.options.map(pos => (
                                                <option key={pos} value={pos}>
                                                    {pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                {/* Toast Duration */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Toast Duration
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            How long toasts stay visible
                                        </div>
                                        <select
                                            value={settings.toastDuration}
                                            onChange={(e) => updateSetting('toastDuration', Number(e.target.value))}
                                            className="mobile-select"
                                        >
                                            <option value={2000}>2 seconds</option>
                                            <option value={4000}>4 seconds</option>
                                            <option value={6000}>6 seconds</option>
                                            <option value={8000}>8 seconds</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Data View */}
                {currentView === 'data' && (
                    <motion.div
                        key="data"
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
                                    <h2 className="text-lg font-semibold text-ui-text-primary">Data</h2>
                                    <p className="text-sm text-ui-text-secondary">Number and currency formats</p>
                                </div>
                            </div>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-4">
                                {/* Number Format */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Number Format
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            How numbers are formatted
                                        </div>
                                        <select
                                            value={settings.numberFormat}
                                            onChange={(e) => updateSetting('numberFormat', e.target.value as any)}
                                            className="mobile-select"
                                        >
                                            <option value="en-US">US (1,234.56)</option>
                                            <option value="en-GB">UK (1,234.56)</option>
                                            <option value="de-DE">German (1.234,56)</option>
                                            <option value="fr-FR">French (1 234,56)</option>
                                            <option value="es-ES">Spanish (1.234,56)</option>
                                        </select>
                                    </label>
                                </div>

                                {/* Currency Symbol */}
                                <div className="mobile-settings-group">
                                    <label className="block">
                                        <div className="text-sm font-semibold text-ui-text-primary mb-1">
                                            Currency Symbol
                                        </div>
                                        <div className="text-xs text-ui-text-secondary mb-3">
                                            Symbol for monetary values
                                        </div>
                                        <select
                                            value={settings.currencySymbol}
                                            onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                                            className="mobile-select"
                                        >
                                            <option value="$">$ (Dollar)</option>
                                            <option value="€">€ (Euro)</option>
                                            <option value="£">£ (Pound)</option>
                                            <option value="¥">¥ (Yen)</option>
                                        </select>
                                    </label>
                                </div>

                                <MobileToggleSetting
                                    label="Enable Caching"
                                    description="Cache data locally for faster loading"
                                    enabled={settings.cacheEnabled}
                                    onChange={(val) => updateSetting('cacheEnabled', val)}
                                />
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
