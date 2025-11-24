'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { useSettings } from "@/hooks/useSettings";
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    NOTIFICATION_SETTINGS,
    WIDGET_SETTINGS,
} from "@/constants/settings";
import {
    MdCheck,
    MdPalette,
    MdTune,
    MdKeyboard,
    MdShield,
    MdLogout,
    MdClose,
    MdPerson,
    MdSchedule,
    MdNotifications,
    MdStorage,
} from "react-icons/md";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

type SettingsSection = 'appearance' | 'datetime' | 'behavior' | 'notifications' | 'data' | 'shortcuts' | 'account';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
    { id: 'appearance', label: 'Appearance', icon: MdPalette },
    { id: 'datetime', label: 'Date & Time', icon: MdSchedule },
    { id: 'behavior', label: 'Behavior', icon: MdTune },
    { id: 'notifications', label: 'Notifications', icon: MdNotifications },
    { id: 'data', label: 'Data', icon: MdStorage },
    { id: 'shortcuts', label: 'Shortcuts', icon: MdKeyboard },
    { id: 'account', label: 'Account', icon: MdPerson },
];

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick }: SettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoaded } = useSettings();
    const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>(
        THEMES.find(t => t.id === theme)?.category as 'dark' | 'light' || 'dark'
    );
    const contentRef = useRef<HTMLDivElement>(null);

    // Scroll to top when section changes
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSection]);

    if (!isLoaded) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl h-[85vh] max-h-[750px] flex flex-col"
            >
                <div className="bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary overflow-hidden flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-primary flex-shrink-0">
                        <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-ui-bg-secondary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="px-6 py-3 border-b border-ui-border-primary flex-shrink-0 bg-ui-bg-secondary/30">
                        <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {SECTIONS.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                                            ? 'text-ui-accent-primary'
                                            : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{section.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-ui-accent-primary/10 rounded-lg border border-ui-accent-primary/20"
                                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Scrollable Content */}
                    <div ref={contentRef} className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.15 }}
                                className="p-6"
                            >
                                {/* Appearance Section */}
                                {activeSection === 'appearance' && (
                                    <div className="space-y-6">
                                        {/* Theme Selection */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Theme</h3>
                                            <p className="text-xs text-ui-text-secondary mb-4">Choose your preferred color scheme</p>

                                            {/* Category Toggle */}
                                            <div className="flex gap-1 p-1 bg-ui-bg-secondary rounded-lg mb-4 w-fit">
                                                <button
                                                    onClick={() => setThemeCategory('dark')}
                                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${themeCategory === 'dark'
                                                        ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                                        : 'text-ui-text-secondary hover:text-ui-text-primary'
                                                        }`}
                                                >
                                                    Dark
                                                </button>
                                                <button
                                                    onClick={() => setThemeCategory('light')}
                                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${themeCategory === 'light'
                                                        ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                                        : 'text-ui-text-secondary hover:text-ui-text-primary'
                                                        }`}
                                                >
                                                    Light
                                                </button>
                                            </div>

                                            {/* Theme Grid */}
                                            <div className="grid grid-cols-5 gap-3">
                                                {THEMES.filter(t => t.category === themeCategory).map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setTheme(t.id)}
                                                        className={`group relative rounded-xl border-2 transition-all hover:scale-[1.02] overflow-hidden ${theme === t.id
                                                            ? 'border-ui-accent-primary ring-2 ring-ui-accent-primary/20'
                                                            : 'border-ui-border-primary hover:border-ui-border-secondary'
                                                            }`}
                                                    >
                                                        <div
                                                            className="aspect-[4/3] p-2 flex flex-col gap-1.5"
                                                            style={{ backgroundColor: t.colors[2] }}
                                                        >
                                                            <div className="flex gap-1">
                                                                <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: t.colors[0] }} />
                                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                                                            </div>
                                                            <div className="flex-1 flex items-end gap-0.5 pt-1">
                                                                <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '40%' }} />
                                                                <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[1], height: '70%' }} />
                                                                <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '55%' }} />
                                                                <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[1], height: '85%' }} />
                                                            </div>
                                                        </div>
                                                        <div className="px-2 py-1.5 bg-ui-bg-secondary/50 flex items-center justify-between gap-1">
                                                            <span className="text-xs font-medium text-ui-text-primary truncate">{t.name}</span>
                                                            {theme === t.id && (
                                                                <MdCheck className="w-3.5 h-3.5 text-ui-accent-primary flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Visual Settings */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Visual</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Animation and display settings</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <ToggleSetting
                                                    label="Animations"
                                                    description="Smooth transitions and effects"
                                                    enabled={settings.animations}
                                                    onChange={(val) => updateSetting('animations', val)}
                                                />
                                                <ToggleSetting
                                                    label="Compact Mode"
                                                    description="Reduce padding for denser layouts"
                                                    enabled={settings.compactMode}
                                                    onChange={(val) => updateSetting('compactMode', val)}
                                                />
                                                <SelectSetting
                                                    label="Font Size"
                                                    description="Base font size for the dashboard"
                                                    value={settings.fontSize}
                                                    onChange={(val) => updateSetting('fontSize', val as 'small' | 'medium' | 'large')}
                                                    options={[
                                                        { value: 'small', label: 'Small' },
                                                        { value: 'medium', label: 'Medium' },
                                                        { value: 'large', label: 'Large' },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Date & Time Section */}
                                {activeSection === 'datetime' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Regional Settings</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Configure how dates and times are displayed</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <SelectSetting
                                                    label="Timezone"
                                                    description="Display times in this timezone"
                                                    value={settings.timezone}
                                                    onChange={(val) => updateSetting('timezone', val as any)}
                                                    options={TIMEZONE_OPTIONS.map(tz => ({
                                                        value: tz.value,
                                                        label: tz.label,
                                                    }))}
                                                />
                                                <SelectSetting
                                                    label="Date Format"
                                                    description="How dates are displayed"
                                                    value={settings.dateFormat}
                                                    onChange={(val) => updateSetting('dateFormat', val as any)}
                                                    options={DATE_FORMAT_OPTIONS.map(df => ({
                                                        value: df.value,
                                                        label: `${df.label} (${df.example})`,
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Clock</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Clock widget preferences</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <div className="flex items-center justify-between p-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-ui-text-primary">Clock Format</div>
                                                        <div className="text-xs text-ui-text-secondary">12-hour or 24-hour time</div>
                                                    </div>
                                                    <div className="flex gap-1 p-1 bg-ui-bg-secondary rounded-lg">
                                                        <button
                                                            onClick={() => updateSetting('clockFormat', '12h')}
                                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${settings.clockFormat === '12h'
                                                                ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                                                : 'text-ui-text-secondary hover:text-ui-text-primary'
                                                                }`}
                                                        >
                                                            12h
                                                        </button>
                                                        <button
                                                            onClick={() => updateSetting('clockFormat', '24h')}
                                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${settings.clockFormat === '24h'
                                                                ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                                                : 'text-ui-text-secondary hover:text-ui-text-primary'
                                                                }`}
                                                        >
                                                            24h
                                                        </button>
                                                    </div>
                                                </div>
                                                <ToggleSetting
                                                    label="Show Seconds"
                                                    description="Display seconds in clock widgets"
                                                    enabled={settings.showSeconds}
                                                    onChange={(val) => updateSetting('showSeconds', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Behavior Section */}
                                {activeSection === 'behavior' && (
                                    <div className="space-y-6">
                                        {/* Dashboard */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Dashboard</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Layout and save behavior</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <ToggleSetting
                                                    label="Auto-save Layout"
                                                    description="Save widget positions automatically"
                                                    enabled={settings.autoSave}
                                                    onChange={(val) => updateSetting('autoSave', val)}
                                                />
                                                <ToggleSetting
                                                    label="Confirm Widget Removal"
                                                    description="Ask before removing widgets"
                                                    enabled={settings.confirmDelete}
                                                    onChange={(val) => updateSetting('confirmDelete', val)}
                                                />
                                                <ToggleSetting
                                                    label="Auto-compact Layout"
                                                    description="Fill gaps when widgets are removed"
                                                    enabled={settings.autoCompact}
                                                    onChange={(val) => updateSetting('autoCompact', val)}
                                                />
                                            </div>
                                        </div>

                                        {/* Widgets */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Widgets</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Widget refresh and display</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <ToggleSetting
                                                    label="Refresh Indicators"
                                                    description="Show countdown rings on widgets"
                                                    enabled={settings.showRefreshIndicators}
                                                    onChange={(val) => updateSetting('showRefreshIndicators', val)}
                                                />
                                                <ToggleSetting
                                                    label="Widget Titles"
                                                    description="Show titles in widget headers"
                                                    enabled={settings.showWidgetTitles}
                                                    onChange={(val) => updateSetting('showWidgetTitles', val)}
                                                />
                                                <SelectSetting
                                                    label="Table Rows"
                                                    description="Default rows in table widgets"
                                                    value={settings.tableRowsPerPage.toString()}
                                                    onChange={(val) => updateSetting('tableRowsPerPage', Number(val))}
                                                    options={WIDGET_SETTINGS.tableRowsPerPage.options.map(n => ({
                                                        value: n.toString(),
                                                        label: `${n} rows`,
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Keyboard */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Keyboard</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Keyboard shortcuts</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden">
                                                <ToggleSetting
                                                    label="Enable Hotkeys"
                                                    description="Allow keyboard shortcuts"
                                                    enabled={settings.enableHotkeys}
                                                    onChange={(val) => updateSetting('enableHotkeys', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notifications Section */}
                                {activeSection === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Sound</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Audio notification settings</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <ToggleSetting
                                                    label="Sound Notifications"
                                                    description="Play sound for important alerts"
                                                    enabled={settings.soundEnabled}
                                                    onChange={(val) => updateSetting('soundEnabled', val)}
                                                />
                                                <SliderSetting
                                                    label="Volume"
                                                    description="Notification volume level"
                                                    value={settings.volume}
                                                    onChange={(val) => updateSetting('volume', val)}
                                                    min={0}
                                                    max={100}
                                                    disabled={!settings.soundEnabled}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Toasts</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Toast notification settings</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <SelectSetting
                                                    label="Toast Position"
                                                    description="Where notifications appear"
                                                    value={settings.toastPosition}
                                                    onChange={(val) => updateSetting('toastPosition', val as any)}
                                                    options={NOTIFICATION_SETTINGS.toastPosition.options.map(pos => ({
                                                        value: pos,
                                                        label: pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                                    }))}
                                                />
                                                <SelectSetting
                                                    label="Toast Duration"
                                                    description="How long toasts stay visible"
                                                    value={settings.toastDuration.toString()}
                                                    onChange={(val) => updateSetting('toastDuration', Number(val))}
                                                    options={[
                                                        { value: '2000', label: '2 seconds' },
                                                        { value: '4000', label: '4 seconds' },
                                                        { value: '6000', label: '6 seconds' },
                                                        { value: '8000', label: '8 seconds' },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Browser</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Desktop notification settings</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden">
                                                <ToggleSetting
                                                    label="Desktop Notifications"
                                                    description="Show browser notifications"
                                                    enabled={settings.desktopNotifications}
                                                    onChange={(val) => updateSetting('desktopNotifications', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Data Section */}
                                {activeSection === 'data' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Formatting</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Number and currency display</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <SelectSetting
                                                    label="Number Format"
                                                    description="How numbers are formatted"
                                                    value={settings.numberFormat}
                                                    onChange={(val) => updateSetting('numberFormat', val as any)}
                                                    options={[
                                                        { value: 'en-US', label: 'US (1,234.56)' },
                                                        { value: 'en-GB', label: 'UK (1,234.56)' },
                                                        { value: 'de-DE', label: 'German (1.234,56)' },
                                                        { value: 'fr-FR', label: 'French (1 234,56)' },
                                                        { value: 'es-ES', label: 'Spanish (1.234,56)' },
                                                    ]}
                                                />
                                                <SelectSetting
                                                    label="Currency Symbol"
                                                    description="Symbol for monetary values"
                                                    value={settings.currencySymbol}
                                                    onChange={(val) => updateSetting('currencySymbol', val)}
                                                    options={[
                                                        { value: '$', label: '$ (Dollar)' },
                                                        { value: '€', label: '€ (Euro)' },
                                                        { value: '£', label: '£ (Pound)' },
                                                        { value: '¥', label: '¥ (Yen)' },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Performance</h3>
                                            <p className="text-xs text-ui-text-secondary mb-3">Data caching settings</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden">
                                                <ToggleSetting
                                                    label="Enable Caching"
                                                    description="Cache data locally for faster loading"
                                                    enabled={settings.cacheEnabled}
                                                    onChange={(val) => updateSetting('cacheEnabled', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Shortcuts Section */}
                                {activeSection === 'shortcuts' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Keyboard Shortcuts</h3>
                                            <p className="text-xs text-ui-text-secondary mb-4">Quick actions at your fingertips</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                <ShortcutGroup title="Navigation">
                                                    <ShortcutItem shortcut="F" description="Open widget menu" />
                                                    <ShortcutItem shortcut="P" description="Open preset manager" />
                                                    <ShortcutItem shortcut="S" description="Open settings" />
                                                </ShortcutGroup>

                                                <ShortcutGroup title="Presets">
                                                    <ShortcutItem shortcut="1-9" description="Load preset" />
                                                    <ShortcutItem shortcut="⇧ 1-9" description="Save to preset" />
                                                    <ShortcutItem shortcut="← →" description="Previous / next preset" />
                                                </ShortcutGroup>

                                                <ShortcutGroup title="View">
                                                    <ShortcutItem shortcut="X" description="Toggle compact view" />
                                                    <ShortcutItem shortcut="0" description="Reload page" />
                                                </ShortcutGroup>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Account Section */}
                                {activeSection === 'account' && (
                                    <div className="space-y-6">
                                        {/* Profile Info */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Profile</h3>
                                            <p className="text-xs text-ui-text-secondary mb-4">Your account information</p>

                                            <div className="rounded-xl border border-ui-border-primary overflow-hidden">
                                                <div className="p-4 flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full bg-ui-accent-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-2xl font-semibold text-ui-accent-primary">
                                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-base font-semibold text-ui-text-primary truncate">{user?.name}</div>
                                                        <div className="text-sm text-ui-text-secondary truncate">{user?.email}</div>
                                                        {user?.role && (
                                                            <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'admin'
                                                                ? 'bg-ui-accent-secondary/20 text-ui-accent-secondary'
                                                                : 'bg-ui-accent-primary/20 text-ui-accent-primary'
                                                                }`}>
                                                                {user.role.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-ui-text-primary mb-1">Actions</h3>
                                            <p className="text-xs text-ui-text-secondary mb-4">Account actions</p>

                                            <div className="space-y-3">
                                                {user?.role === 'admin' && onAdminClick && (
                                                    <button
                                                        onClick={onAdminClick}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white rounded-xl text-sm font-medium transition-colors"
                                                    >
                                                        <MdShield className="w-5 h-5" />
                                                        Open Admin Panel
                                                    </button>
                                                )}
                                                <button
                                                    onClick={onLogout}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-xl text-sm font-medium transition-all"
                                                >
                                                    <MdLogout className="w-5 h-5" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
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
    onChange,
    disabled = false,
}: {
    label: string;
    description: string;
    enabled?: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    const isEnabled = enabled ?? false;
    return (
        <div className={`flex items-center justify-between p-4 ${disabled ? 'opacity-50' : ''}`}>
            <div>
                <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                <div className="text-xs text-ui-text-secondary">{description}</div>
            </div>
            <button
                onClick={() => !disabled && onChange(!isEnabled)}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}

function SelectSetting({
    label,
    description,
    value,
    onChange,
    options,
}: {
    label: string;
    description: string;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0 mr-4">
                <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                <div className="text-xs text-ui-text-secondary">{description}</div>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-1.5 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all cursor-pointer max-w-[180px]"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function SliderSetting({
    label,
    description,
    value,
    onChange,
    min,
    max,
    disabled = false,
}: {
    label: string;
    description: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    disabled?: boolean;
}) {
    return (
        <div className={`p-4 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                    <div className="text-xs text-ui-text-secondary">{description}</div>
                </div>
                <span className="text-sm font-medium text-ui-text-primary min-w-[3rem] text-right">
                    {value}%
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => !disabled && onChange(Number(e.target.value))}
                disabled={disabled}
                className={`w-full h-2 bg-ui-bg-tertiary rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                    } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ui-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md`}
            />
        </div>
    );
}

function ShortcutGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="p-4">
            <div className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">{title}</div>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

function ShortcutItem({ shortcut, description }: { shortcut: string; description: string }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-ui-text-primary">{description}</span>
            <kbd className="px-2.5 py-1 bg-ui-bg-tertiary text-ui-text-primary rounded-md text-xs font-mono border border-ui-border-primary min-w-[2.5rem] text-center">
                {shortcut}
            </kbd>
        </div>
    );
}
