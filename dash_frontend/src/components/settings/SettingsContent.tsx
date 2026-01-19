'use client';

import { motion } from "framer-motion";
import { User } from "@/lib/auth";
import { THEMES, Theme } from "@/contexts/ThemeContext";
import { DashboardPreset } from "@/types";
import { preferencesService } from "@/lib/preferences";
import { isHolidaySeason } from "@/components/SnowOverlay";
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    NOTIFICATION_SETTINGS,
    DOCK_SETTINGS,
    DRAG_HANDLE_SETTINGS,
    GRID_SETTINGS,
    REFRESH_INTERVAL_OPTIONS,
    WIDGET_SETTINGS,
} from "@/constants/settings";
import {
    MdCheck,
    MdPalette,
    MdShield,
    MdLogout,
    MdRefresh,
    MdGridOn,
    MdChevronRight,
    MdDock,
    MdVisibilityOff,
    MdBookmarks,
    MdDelete,
    MdWarning,
} from "react-icons/md";

import type { SettingsView } from "./types";
import {
    ToggleSetting,
    SelectSetting,
    SliderSetting,
    ShortcutItem,
    DockItemToggle,
    Subsection,
} from "./SettingControls";
import {
    RealDragHandle,
    ObfuscationPreview,
    DockPreview,
} from "./SettingPreviews";

// =============================================================================
// Types
// =============================================================================

interface AvailablePreset {
    index: number;
    preset: DashboardPreset | null;
    isValid: boolean;
    name: string;
    widgetCount: number;
}

export interface SettingsContentProps {
    activeView: SettingsView;
    user: User | null;
    onLogout: () => void;
    onAdminClick?: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    themeCategory: 'dark' | 'light';
    setThemeCategory: (category: 'dark' | 'light') => void;
    settings: any;
    updateSetting: (key: string, value: any) => void;
    privacySettings: any;
    updatePrivacySetting: (key: string, value: any) => void;
    togglePrivacy: () => void;
    localGridColumns: number;
    setLocalGridColumns: (cols: number) => void;
    localGridCellHeight: number;
    setLocalGridCellHeight: (height: number) => void;
    availablePresets: AvailablePreset[];
    presets: Array<DashboardPreset | null>;
    confirmModal: {
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'warning' | 'danger' | 'info';
    };
    setConfirmModal: (modal: any) => void;
    nuclearInput: string;
    setNuclearInput: (val: string) => void;
    showNuclearModal: boolean;
    setShowNuclearModal: (show: boolean) => void;
    isMobile?: boolean;
}

// =============================================================================
// Settings Content Component
// =============================================================================

export function SettingsContent({
    activeView,
    user,
    onLogout,
    onAdminClick,
    theme,
    setTheme,
    themeCategory,
    setThemeCategory,
    settings,
    updateSetting,
    privacySettings,
    updatePrivacySetting,
    togglePrivacy,
    localGridColumns,
    setLocalGridColumns,
    localGridCellHeight,
    setLocalGridCellHeight,
    availablePresets,
    presets,
    confirmModal,
    setConfirmModal,
    nuclearInput,
    setNuclearInput,
    showNuclearModal,
    setShowNuclearModal,
    isMobile = false,
}: SettingsContentProps) {
    // =========================================================================
    // Account View
    // =========================================================================
    if (activeView === 'account') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Account</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Profile and authentication</p>
                </div>
                <div className="space-y-4">
                    {/* Profile Card */}
                    <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                        <div className="flex items-center gap-4">
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

                    {/* Actions */}
                    <div className="space-y-2">
                        {user?.role === 'admin' && onAdminClick && (
                            <button
                                onClick={onAdminClick}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <MdShield className="w-4 h-4" />
                                Admin Panel
                            </button>
                        )}
                        <button
                            onClick={() => {
                                preferencesService.set('onboarding.completed', false);
                                preferencesService.delete('onboarding.skipped');
                                preferencesService.delete('onboarding.completedAt');
                                window.location.reload();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary border border-ui-border-primary text-ui-text-primary rounded-lg text-sm font-medium transition-all"
                        >
                            <MdRefresh className="w-4 h-4" />
                            Re-run Setup Wizard
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-sm font-medium transition-all"
                        >
                            <MdLogout className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Appearance View
    // =========================================================================
    if (activeView === 'appearance') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Appearance</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Themes, colors, and visual preferences</p>
                </div>
                <div className="space-y-5">
                    <Subsection title="Theme">
                        {/* Category Toggle */}
                        <div className="flex gap-1 p-1 bg-ui-bg-secondary rounded-lg w-fit">
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

                        {/* Theme Grid - responsive */}
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                            {THEMES.filter(t => t.category === themeCategory).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`group relative rounded-lg border-2 transition-all hover:scale-[1.02] overflow-hidden ${theme === t.id
                                        ? 'border-ui-accent-primary ring-2 ring-ui-accent-primary/20'
                                        : 'border-ui-border-primary hover:border-ui-border-secondary'
                                        }`}
                                >
                                    <div
                                        className="aspect-[4/3] p-1.5 flex flex-col gap-1"
                                        style={{ backgroundColor: t.colors[2] }}
                                    >
                                        <div className="flex gap-0.5">
                                            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: t.colors[0] }} />
                                            <div className="h-1 w-1 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                                        </div>
                                        <div className="flex-1 flex items-end gap-0.5">
                                            <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '40%' }} />
                                            <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[1], height: '70%' }} />
                                            <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[0], height: '55%' }} />
                                            <div className="flex-1 rounded-t" style={{ backgroundColor: t.colors[1], height: '85%' }} />
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 bg-ui-bg-secondary/50 flex items-center justify-between gap-1">
                                        <span className="text-[10px] font-medium text-ui-text-primary truncate">{t.name}</span>
                                        {theme === t.id && (
                                            <MdCheck className="w-3 h-3 text-ui-accent-primary flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Subsection>

                    <Subsection title="Visual Style">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
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
                            {isHolidaySeason() && (
                                <ToggleSetting
                                    label="Christmas Mode 🎄"
                                    description="Snow and twinkling lights"
                                    enabled={settings.snowEffect}
                                    onChange={(val) => updateSetting('snowEffect', val)}
                                />
                            )}
                        </div>
                    </Subsection>

                    <Subsection title="Typography">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-ui-border-primary bg-ui-bg-secondary/20">
                            <div>
                                <div className="text-sm font-medium text-ui-text-primary">Font Size</div>
                                <div className="text-xs text-ui-text-secondary">Base text size across dashboard</div>
                            </div>
                            <div className="flex gap-0.5 p-0.5 bg-ui-bg-tertiary rounded-lg">
                                {(['small', 'medium', 'large'] as const).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => updateSetting('fontSize', size)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${settings.fontSize === size
                                            ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                            : 'text-ui-text-secondary hover:text-ui-text-primary'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Subsection>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Regional View
    // =========================================================================
    if (activeView === 'regional') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Regional</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Timezone, date formats, and number formatting</p>
                </div>
                <div className="space-y-5">
                    <div className="rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/5 p-3">
                        <p className="text-xs text-ui-text-secondary">
                            <strong className="text-ui-text-primary">Global defaults.</strong> Widgets can override these in their own settings.
                        </p>
                    </div>

                    <Subsection title="Time & Date">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
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
                            {/* Clock Format */}
                            <div className="p-3">
                                <div className="text-sm font-medium text-ui-text-primary mb-1">Clock Format</div>
                                <div className="text-xs text-ui-text-secondary mb-3">12-hour or 24-hour time</div>
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
                            <ToggleSetting
                                label="Show Seconds"
                                description="Display seconds in clock widgets"
                                enabled={settings.showSeconds}
                                onChange={(val) => updateSetting('showSeconds', val)}
                            />
                        </div>
                    </Subsection>

                    <Subsection title="Numbers & Currency">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <SelectSetting
                                label="Number Format"
                                description="Thousand separators and decimals"
                                value={settings.numberFormat}
                                onChange={(val) => updateSetting('numberFormat', val as any)}
                                options={[
                                    { value: 'en-US', label: 'US (1,234.56)' },
                                    { value: 'en-GB', label: 'UK (1,234.56)' },
                                    { value: 'de-DE', label: 'German (1.234,56)' },
                                    { value: 'fr-FR', label: 'French (1 234,56)' },
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
                    </Subsection>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Notifications View
    // =========================================================================
    if (activeView === 'notifications') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Notifications</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Alerts, sounds, and toast settings</p>
                </div>
                <div className="space-y-5">
                    <Subsection title="Sound">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Sound Notifications"
                                description="Play sound for alerts"
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
                    </Subsection>

                    <Subsection title="Toasts">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <SelectSetting
                                label="Position"
                                description="Where notifications appear"
                                value={settings.toastPosition}
                                onChange={(val) => updateSetting('toastPosition', val as any)}
                                options={NOTIFICATION_SETTINGS.toastPosition.options.map(pos => ({
                                    value: pos,
                                    label: pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                }))}
                            />
                            <SelectSetting
                                label="Duration"
                                description="How long toasts stay visible"
                                value={settings.toastDuration.toString()}
                                onChange={(val) => updateSetting('toastDuration', Number(val))}
                                options={[
                                    { value: '2000', label: '2 seconds' },
                                    { value: '4000', label: '4 seconds' },
                                    { value: '6000', label: '6 seconds' },
                                ]}
                            />
                        </div>
                    </Subsection>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Privacy View
    // =========================================================================
    if (activeView === 'privacy') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Privacy Mode</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Hide sensitive data with one click</p>
                </div>
                <div className="space-y-5">
                    {/* Quick Toggle */}
                    <div className="rounded-lg border-2 border-ui-accent-secondary/30 bg-ui-accent-secondary/5 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${privacySettings.enabled ? 'bg-ui-accent-secondary text-white' : 'bg-ui-bg-secondary text-ui-text-secondary'}`}>
                                    <MdVisibilityOff className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-ui-text-primary">Privacy Mode</div>
                                    <div className="text-xs text-ui-text-secondary mt-0.5">
                                        {privacySettings.enabled ? 'Data is hidden' : 'Data is visible'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={togglePrivacy}
                                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${privacySettings.enabled ? 'bg-ui-accent-secondary' : 'bg-ui-bg-tertiary'
                                    }`}
                            >
                                <motion.div
                                    className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm"
                                    animate={{ x: privacySettings.enabled ? 24 : 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </div>
                        <div className="mt-3 pt-3 border-t border-ui-accent-secondary/20">
                            <p className="text-xs text-ui-text-secondary">
                                Press <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded border border-ui-border-primary text-ui-text-primary font-mono text-xs">\</kbd> to toggle
                            </p>
                        </div>
                    </div>

                    <Subsection title="Protection">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Currency & Amounts"
                                description="Hide dollar values and prices"
                                enabled={privacySettings.obfuscateCurrency}
                                onChange={(val) => updatePrivacySetting('obfuscateCurrency', val)}
                            />
                            <ToggleSetting
                                label="Names"
                                description="Hide customer and vendor names"
                                enabled={privacySettings.obfuscateNames}
                                onChange={(val) => updatePrivacySetting('obfuscateNames', val)}
                            />
                            <ToggleSetting
                                label="Numbers"
                                description="Hide quantities and counts"
                                enabled={privacySettings.obfuscateNumbers}
                                onChange={(val) => updatePrivacySetting('obfuscateNumbers', val)}
                            />
                            <ToggleSetting
                                label="Percentages"
                                description="Hide growth rates and distributions"
                                enabled={privacySettings.obfuscatePercentages}
                                onChange={(val) => updatePrivacySetting('obfuscatePercentages', val)}
                            />
                        </div>
                    </Subsection>

                    {/* Obfuscation Style */}
                    <Subsection title="Obfuscation Style">
                        <p className="text-xs text-ui-text-tertiary mb-3">How sensitive data appears when hidden</p>
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2'}`}>
                            {(['blur', 'redact', 'asterisk', 'placeholder'] as const).map((styleId) => (
                                <button
                                    key={styleId}
                                    onClick={() => updatePrivacySetting('style', styleId)}
                                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${privacySettings.style === styleId
                                        ? 'border-ui-accent-secondary bg-ui-accent-secondary/10 shadow-sm'
                                        : 'border-ui-border-primary hover:border-ui-border-secondary bg-ui-bg-secondary/30'
                                        }`}
                                >
                                    <div className="h-8 flex items-center justify-center mb-2">
                                        <ObfuscationPreview style={styleId} />
                                    </div>
                                    <span className="text-xs font-medium text-ui-text-primary block text-center capitalize">
                                        {styleId === 'asterisk' ? 'Asterisks' : styleId}
                                    </span>
                                    {privacySettings.style === styleId && (
                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-ui-accent-secondary rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </Subsection>

                    <Subsection title="Display">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden">
                            <ToggleSetting
                                label="Show Privacy Indicator"
                                description="Display floating badge when privacy mode is active"
                                enabled={privacySettings.showIndicator}
                                onChange={(val) => updatePrivacySetting('showIndicator', val)}
                            />
                        </div>
                    </Subsection>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Widgets View
    // =========================================================================
    if (activeView === 'widgets') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Widgets</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Widget behavior and display settings</p>
                </div>
                <div className="space-y-5">
                    <Subsection title="Display">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Widget Titles"
                                description="Show titles in widget headers"
                                enabled={settings.showWidgetTitles}
                                onChange={(val) => updateSetting('showWidgetTitles', val)}
                            />
                            <ToggleSetting
                                label="Refresh Indicators"
                                description="Show countdown rings on widgets"
                                enabled={settings.showRefreshIndicators}
                                onChange={(val) => updateSetting('showRefreshIndicators', val)}
                            />
                            <ToggleSetting
                                label="Resize Handles"
                                description="Show corner handles for resizing"
                                enabled={settings.showResizeHandles}
                                onChange={(val) => updateSetting('showResizeHandles', val)}
                            />
                        </div>
                    </Subsection>

                    <Subsection title="Behavior">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Auto-save Layout"
                                description="Save widget positions automatically"
                                enabled={settings.autoSave}
                                onChange={(val) => updateSetting('autoSave', val)}
                            />
                            <ToggleSetting
                                label="Confirm Removal"
                                description="Ask before removing widgets"
                                enabled={settings.confirmDelete}
                                onChange={(val) => updateSetting('confirmDelete', val)}
                            />
                            <ToggleSetting
                                label="Auto-compact"
                                description="Fill gaps when widgets are removed"
                                enabled={settings.autoCompact}
                                onChange={(val) => updateSetting('autoCompact', val)}
                            />
                        </div>
                    </Subsection>

                    <Subsection title="Data">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <SelectSetting
                                label="Refresh Interval"
                                description="How often widgets update"
                                value={settings.defaultRefreshInterval.toString()}
                                onChange={(val) => updateSetting('defaultRefreshInterval', Number(val))}
                                options={REFRESH_INTERVAL_OPTIONS.map(opt => ({
                                    value: opt.value.toString(),
                                    label: opt.label,
                                }))}
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
                            <ToggleSetting
                                label="Enable Caching"
                                description="Cache data locally for faster loading"
                                enabled={settings.cacheEnabled}
                                onChange={(val) => updateSetting('cacheEnabled', val)}
                            />
                        </div>
                    </Subsection>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Shortcuts View
    // =========================================================================
    if (activeView === 'shortcuts') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Keyboard Shortcuts</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Quick actions reference</p>
                </div>
                <div className="space-y-4">
                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                        <ShortcutItem shortcut="F" description="Widget menu" />
                        <ShortcutItem shortcut="P" description="Preset manager" />
                        <ShortcutItem shortcut="S" description="Settings" />
                        <ShortcutItem shortcut="X" description="Compact layout" />
                        <ShortcutItem shortcut="\\" description="Privacy mode" />
                        <ShortcutItem shortcut="1-9" description="Load preset" />
                        <ShortcutItem shortcut="⇧ 1-9" description="Save preset" />
                        <ShortcutItem shortcut="← →" description="Switch presets" />
                        <ShortcutItem shortcut="0" description="Reload page" />
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // Layout View (desktop-focused)
    // =========================================================================
    if (activeView === 'layout') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Layout & Grid</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Dashboard organization and grid configuration</p>
                </div>
                {isMobile ? (
                    <div className="text-center py-8 px-4">
                        <div className="w-16 h-16 rounded-full bg-ui-bg-secondary mx-auto mb-4 flex items-center justify-center">
                            <MdGridOn className="w-8 h-8 text-ui-text-tertiary" />
                        </div>
                        <p className="text-ui-text-secondary text-sm">
                            Grid and layout settings are available on desktop to customize your dashboard layout.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <Subsection title="Grid Configuration">
                            <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                <SliderSetting
                                    label="Grid Columns"
                                    description="Number of columns in the grid"
                                    value={localGridColumns}
                                    onChange={(val) => {
                                        setLocalGridColumns(val);
                                        updateSetting('gridColumns', val);
                                    }}
                                    min={GRID_SETTINGS.columns.min}
                                    max={GRID_SETTINGS.columns.max}
                                    step={GRID_SETTINGS.columns.step}
                                />
                                <SliderSetting
                                    label="Cell Height"
                                    description="Height of each grid cell in pixels"
                                    value={localGridCellHeight}
                                    onChange={(val) => {
                                        setLocalGridCellHeight(val);
                                        updateSetting('gridCellHeight', val);
                                    }}
                                    min={GRID_SETTINGS.cellHeight.min}
                                    max={GRID_SETTINGS.cellHeight.max}
                                    step={GRID_SETTINGS.cellHeight.step}
                                    unit="px"
                                />
                            </div>
                        </Subsection>

                        <Subsection title="Drag Handle">
                            <p className="text-xs text-ui-text-tertiary mb-3">Style and size of the widget drag handle</p>

                            {/* Drag Handle Style */}
                            <div className="mb-4">
                                <div className="text-xs font-medium text-ui-text-secondary mb-2">Style</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {DRAG_HANDLE_SETTINGS.handleStyle.options.map((styleId) => (
                                        <button
                                            key={styleId}
                                            onClick={() => updateSetting('dragHandleStyle', styleId)}
                                            className={`relative p-3 rounded-lg border-2 transition-all ${settings.dragHandleStyle === styleId
                                                ? 'border-ui-accent-primary bg-ui-accent-primary/10'
                                                : 'border-ui-border-primary hover:border-ui-border-secondary bg-ui-bg-secondary/30'
                                                }`}
                                        >
                                            <div className="flex justify-center mb-2">
                                                <RealDragHandle style={styleId} size={settings.dragHandleSize} />
                                            </div>
                                            <span className="text-[10px] font-medium text-ui-text-primary block text-center capitalize">
                                                {styleId}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Drag Handle Size */}
                            <div>
                                <div className="text-xs font-medium text-ui-text-secondary mb-2">Size</div>
                                <div className="flex gap-2">
                                    {DRAG_HANDLE_SETTINGS.handleSize.options.map((sizeId) => (
                                        <button
                                            key={sizeId}
                                            onClick={() => updateSetting('dragHandleSize', sizeId)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${settings.dragHandleSize === sizeId
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                                }`}
                                        >
                                            {sizeId}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Subsection>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // Navigation View
    // =========================================================================
    if (activeView === 'navigation') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Navigation</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Choose how you navigate the dashboard</p>
                </div>
                {isMobile ? (
                    <div className="text-center py-8 px-4">
                        <div className="w-16 h-16 rounded-full bg-ui-bg-secondary mx-auto mb-4 flex items-center justify-center">
                            <MdDock className="w-8 h-8 text-ui-text-tertiary" />
                        </div>
                        <p className="text-ui-text-secondary text-sm">
                            Navigation settings are available on desktop where the dock and taskbar are displayed.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Mode Selection */}
                        <Subsection title="Navigation Mode">
                            <p className="text-xs text-ui-text-tertiary mb-3">Choose between dock (macOS-style) or taskbar (Linux-style)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => updateSetting('navigationMode', 'dock')}
                                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${settings.navigationMode === 'dock'
                                        ? 'border-ui-accent-primary bg-ui-accent-primary/10 shadow-sm'
                                        : 'border-ui-border-primary hover:border-ui-border-secondary bg-ui-bg-secondary/30'
                                        }`}
                                >
                                    {/* Mini dock preview */}
                                    <div className="h-12 flex items-end justify-center mb-3">
                                        <div className="flex items-end gap-1 px-3 py-1.5 bg-ui-bg-tertiary rounded-lg border border-ui-border-primary">
                                            <div className="w-4 h-4 bg-ui-accent-primary/50 rounded" />
                                            <div className="w-4 h-5 bg-ui-accent-secondary/50 rounded" />
                                            <div className="w-4 h-4 bg-ui-text-secondary/30 rounded" />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-ui-text-primary block text-center">
                                        Dock
                                    </span>
                                    <span className="text-xs text-ui-text-secondary block text-center mt-1">
                                        macOS-style, centered
                                    </span>
                                    {settings.navigationMode === 'dock' && (
                                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-ui-accent-primary rounded-full" />
                                    )}
                                </button>

                                <button
                                    onClick={() => updateSetting('navigationMode', 'taskbar')}
                                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${settings.navigationMode === 'taskbar'
                                        ? 'border-ui-accent-primary bg-ui-accent-primary/10 shadow-sm'
                                        : 'border-ui-border-primary hover:border-ui-border-secondary bg-ui-bg-secondary/30'
                                        }`}
                                >
                                    {/* Mini taskbar preview */}
                                    <div className="h-12 flex items-end justify-center mb-3">
                                        <div className="w-full h-7 bg-ui-bg-tertiary rounded border border-ui-border-primary flex items-center px-2 gap-2">
                                            <div className="w-3 h-3 bg-ui-accent-primary/50 rounded" />
                                            <div className="w-3 h-3 bg-ui-accent-secondary/50 rounded" />
                                            <div className="flex-1" />
                                            <div className="w-8 h-3 bg-ui-text-secondary/30 rounded" />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-ui-text-primary block text-center">
                                        Taskbar
                                    </span>
                                    <span className="text-xs text-ui-text-secondary block text-center mt-1">
                                        Linux-style, full width
                                    </span>
                                    {settings.navigationMode === 'taskbar' && (
                                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-ui-accent-primary rounded-full" />
                                    )}
                                </button>
                            </div>
                        </Subsection>

                        {/* Taskbar-specific settings */}
                        {settings.navigationMode === 'taskbar' && (
                            <>
                                <Subsection title="Taskbar Position">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateSetting('taskbarPosition', 'top')}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${settings.taskbarPosition === 'top'
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                                }`}
                                        >
                                            Top
                                        </button>
                                        <button
                                            onClick={() => updateSetting('taskbarPosition', 'bottom')}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${settings.taskbarPosition === 'bottom'
                                                ? 'bg-ui-accent-primary text-white'
                                                : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                                }`}
                                        >
                                            Bottom
                                        </button>
                                    </div>
                                </Subsection>

                                <Subsection title="Taskbar Size">
                                    <div className="flex gap-2">
                                        {(['small', 'medium', 'large'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => updateSetting('taskbarSize', size)}
                                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${settings.taskbarSize === size
                                                    ? 'bg-ui-accent-primary text-white'
                                                    : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </Subsection>

                                <Subsection title="Behavior">
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <ToggleSetting
                                            label="Auto-hide"
                                            description="Hide taskbar until mouse approaches edge"
                                            enabled={settings.taskbarAutoHide}
                                            onChange={(val) => updateSetting('taskbarAutoHide', val)}
                                        />
                                        <ToggleSetting
                                            label="Show Labels"
                                            description="Display text labels next to icons"
                                            enabled={settings.taskbarShowLabels}
                                            onChange={(val) => updateSetting('taskbarShowLabels', val)}
                                        />
                                        <SliderSetting
                                            label="Opacity"
                                            description="Taskbar background transparency"
                                            value={settings.taskbarOpacity}
                                            onChange={(val) => updateSetting('taskbarOpacity', val)}
                                            min={50}
                                            max={100}
                                            step={5}
                                            unit="%"
                                        />
                                    </div>
                                </Subsection>

                                <Subsection title="Taskbar Clock">
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <ToggleSetting
                                            label="Show Clock"
                                            description="Display time in the taskbar"
                                            enabled={settings.taskbarShowClock}
                                            onChange={(val) => updateSetting('taskbarShowClock', val)}
                                        />
                                        <ToggleSetting
                                            label="Show Date"
                                            description="Display date next to the clock"
                                            enabled={settings.taskbarShowDate}
                                            onChange={(val) => updateSetting('taskbarShowDate', val)}
                                            disabled={!settings.taskbarShowClock}
                                        />
                                    </div>
                                </Subsection>

                                <Subsection title="Taskbar Items">
                                    <p className="text-xs text-ui-text-tertiary mb-3">Choose which items appear in the taskbar</p>
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <DockItemToggle
                                            label="Widget Menu"
                                            description="Quick access to add widgets"
                                            enabled={settings.dockShowWidgetMenu}
                                            onChange={(val) => updateSetting('dockShowWidgetMenu', val)}
                                        />
                                        <DockItemToggle
                                            label="Preset Manager"
                                            description="Save and load layouts"
                                            enabled={settings.dockShowPresetManager}
                                            onChange={(val) => updateSetting('dockShowPresetManager', val)}
                                        />
                                        <DockItemToggle
                                            label="Auto-Cycle Toggle"
                                            description="Quick toggle for preset auto-cycle"
                                            enabled={settings.dockShowAutoCycle}
                                            onChange={(val) => updateSetting('dockShowAutoCycle', val)}
                                        />
                                        <DockItemToggle
                                            label="Privacy Toggle"
                                            description="Quick privacy mode toggle"
                                            enabled={settings.dockShowPrivacy}
                                            onChange={(val) => updateSetting('dockShowPrivacy', val)}
                                        />
                                        <DockItemToggle
                                            label="Settings"
                                            description="Open settings panel"
                                            enabled={settings.dockShowSettings}
                                            onChange={(val) => updateSetting('dockShowSettings', val)}
                                        />
                                    </div>
                                </Subsection>
                            </>
                        )}

                        {/* Dock-specific settings */}
                        {settings.navigationMode === 'dock' && (
                            <>
                                {/* Live Preview */}
                                <Subsection title="Preview">
                                    <DockPreview settings={settings} />
                                </Subsection>

                                <Subsection title="Behavior">
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <ToggleSetting
                                            label="Auto-hide"
                                            description="Hide dock until you hover"
                                            enabled={settings.dockAutoHide}
                                            onChange={(val) => updateSetting('dockAutoHide', val)}
                                        />
                                        {settings.dockAutoHide && (
                                            <SliderSetting
                                                label="Trigger Distance"
                                                description="Pixels from edge to show dock"
                                                value={settings.dockTriggerDistance}
                                                onChange={(val) => updateSetting('dockTriggerDistance', val)}
                                                min={DOCK_SETTINGS.triggerDistance.min}
                                                max={DOCK_SETTINGS.triggerDistance.max}
                                                step={DOCK_SETTINGS.triggerDistance.step}
                                                unit="px"
                                            />
                                        )}
                                        <ToggleSetting
                                            label="Magnification"
                                            description="Enlarge icons on hover"
                                            enabled={settings.dockMagnification}
                                            onChange={(val) => updateSetting('dockMagnification', val)}
                                        />
                                        {settings.dockMagnification && (
                                            <SliderSetting
                                                label="Magnification Scale"
                                                description="How much icons enlarge"
                                                value={settings.dockMagnificationScale}
                                                onChange={(val) => updateSetting('dockMagnificationScale', val)}
                                                min={DOCK_SETTINGS.magnificationScale.min}
                                                max={DOCK_SETTINGS.magnificationScale.max}
                                                step={DOCK_SETTINGS.magnificationScale.step}
                                            />
                                        )}
                                    </div>
                                </Subsection>

                                <Subsection title="Appearance">
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <SliderSetting
                                            label="Icon Size"
                                            description="Size of dock icons"
                                            value={settings.dockIconSize}
                                            onChange={(val) => updateSetting('dockIconSize', val)}
                                            min={DOCK_SETTINGS.iconSize.min}
                                            max={DOCK_SETTINGS.iconSize.max}
                                            step={DOCK_SETTINGS.iconSize.step}
                                            unit="px"
                                        />
                                        <SliderSetting
                                            label="Opacity"
                                            description="Dock background opacity"
                                            value={settings.dockOpacity}
                                            onChange={(val) => updateSetting('dockOpacity', val)}
                                            min={DOCK_SETTINGS.opacity.min}
                                            max={DOCK_SETTINGS.opacity.max}
                                            step={DOCK_SETTINGS.opacity.step}
                                            unit="%"
                                        />
                                    </div>
                                </Subsection>

                                <Subsection title="Dock Items">
                                    <p className="text-xs text-ui-text-tertiary mb-3">Choose which items appear in the dock</p>
                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                        <DockItemToggle
                                            label="Widget Menu"
                                            description="Quick access to add widgets"
                                            enabled={settings.dockShowWidgetMenu}
                                            onChange={(val) => updateSetting('dockShowWidgetMenu', val)}
                                        />
                                        <DockItemToggle
                                            label="Preset Manager"
                                            description="Save and load layouts"
                                            enabled={settings.dockShowPresetManager}
                                            onChange={(val) => updateSetting('dockShowPresetManager', val)}
                                        />
                                        <DockItemToggle
                                            label="Compact Button"
                                            description="Quick compact/expand layout"
                                            enabled={settings.dockShowCompact}
                                            onChange={(val) => updateSetting('dockShowCompact', val)}
                                        />
                                        <DockItemToggle
                                            label="Auto-Cycle Toggle"
                                            description="Quick toggle for preset auto-cycle"
                                            enabled={settings.dockShowAutoCycle}
                                            onChange={(val) => updateSetting('dockShowAutoCycle', val)}
                                        />
                                        <DockItemToggle
                                            label="Privacy Toggle"
                                            description="Quick privacy mode toggle"
                                            enabled={settings.dockShowPrivacy}
                                            onChange={(val) => updateSetting('dockShowPrivacy', val)}
                                        />
                                        <DockItemToggle
                                            label="Settings"
                                            description="Open settings panel"
                                            enabled={settings.dockShowSettings}
                                            onChange={(val) => updateSetting('dockShowSettings', val)}
                                        />
                                    </div>
                                </Subsection>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // Presets View
    // =========================================================================
    if (activeView === 'presets') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Preset Auto-Cycle</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Automatically rotate through saved presets</p>
                </div>
                <div className="space-y-5">
                    <div className="rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/5 p-4">
                        <div className="flex items-start gap-3">
                            <MdRefresh className="w-5 h-5 text-ui-accent-primary mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-ui-text-primary mb-1">
                                    Auto-cycle lets your dashboard rotate through presets automatically
                                </p>
                                <p className="text-xs text-ui-text-secondary">
                                    Perfect for display monitors, presentations, or just getting a comprehensive view of your data.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Subsection title="Auto-Cycle">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Enable Auto-Cycle"
                                description="Automatically switch between presets"
                                enabled={settings.autoCycleEnabled}
                                onChange={(val) => updateSetting('autoCycleEnabled', val)}
                            />
                            <SliderSetting
                                label="Cycle Interval"
                                description="Seconds between preset changes"
                                value={settings.autoCycleInterval}
                                onChange={(val) => updateSetting('autoCycleInterval', val)}
                                min={5}
                                max={300}
                                step={5}
                                disabled={!settings.autoCycleEnabled}
                                unit="s"
                            />
                        </div>
                    </Subsection>

                    <Subsection title="Behavior">
                        <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                            <ToggleSetting
                                label="Pause on Interaction"
                                description="Pause cycling when you interact with dashboard"
                                enabled={settings.autoCyclePauseOnInteraction}
                                onChange={(val) => updateSetting('autoCyclePauseOnInteraction', val)}
                                disabled={!settings.autoCycleEnabled}
                            />
                            <SliderSetting
                                label="Resume Delay"
                                description="Seconds to wait before resuming after interaction"
                                value={settings.autoCycleResumeDelay}
                                onChange={(val) => updateSetting('autoCycleResumeDelay', val)}
                                min={5}
                                max={60}
                                step={5}
                                disabled={!settings.autoCycleEnabled || !settings.autoCyclePauseOnInteraction}
                                unit="s"
                            />
                        </div>
                    </Subsection>

                    {availablePresets.length === 0 ? (
                        <div className="p-6 rounded-lg border-2 border-dashed border-ui-border-primary bg-ui-bg-secondary/30 text-center">
                            <MdGridOn className="w-12 h-12 text-ui-text-muted mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium text-ui-text-primary mb-1">
                                No Saved Presets
                            </p>
                            <p className="text-xs text-ui-text-secondary">
                                {isMobile
                                    ? 'Create presets on desktop to enable auto-cycling'
                                    : 'Save some presets first using ⇧1-9 or the preset manager'}
                            </p>
                        </div>
                    ) : (
                        <Subsection title="Preset Selection">
                            <p className="text-xs text-ui-text-tertiary mb-3">
                                Select which presets to include in the rotation cycle
                            </p>
                            <div className="space-y-2">
                                {availablePresets.map(({ index, preset, name, widgetCount }) => {
                                    const isSelected = settings.autoCyclePresets.includes(index);
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                const newPresets = isSelected
                                                    ? settings.autoCyclePresets.filter((i: number) => i !== index)
                                                    : [...settings.autoCyclePresets, index].sort((a: number, b: number) => a - b);
                                                updateSetting('autoCyclePresets', newPresets);
                                            }}
                                            disabled={!settings.autoCycleEnabled}
                                            className={`w-full p-3 rounded-lg border-2 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${isSelected
                                                ? 'border-ui-accent-primary bg-ui-accent-primary/10 shadow-sm'
                                                : 'border-ui-border-primary hover:border-ui-accent-primary/50 bg-ui-bg-secondary/30'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected
                                                        ? 'bg-ui-accent-primary text-white'
                                                        : 'bg-ui-bg-tertiary text-ui-text-secondary'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-ui-text-primary truncate">
                                                            {name}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-ui-text-secondary mt-0.5">
                                                            <MdGridOn className="w-3 h-3" />
                                                            <span>{widgetCount} widget{widgetCount !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <MdCheck className="w-5 h-5 text-ui-accent-primary flex-shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Subsection>
                    )}
                </div>
            </div>
        );
    }

    // =========================================================================
    // Advanced View
    // =========================================================================
    if (activeView === 'advanced') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">Advanced</h3>
                    <p className="text-sm text-ui-text-secondary mt-1">Data management and preferences</p>
                </div>
                <div className="space-y-5">
                    <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
                        <div className="flex items-start gap-3">
                            <MdWarning className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-ui-text-primary mb-1">
                                    Clearing preferences is permanent
                                </p>
                                <p className="text-xs text-ui-text-secondary">
                                    These actions cannot be undone. Your data is synced across all sessions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Subsection title="Reset Options">
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Reset Theme',
                                        message: 'Reset theme to default (Slate)?',
                                        type: 'warning',
                                        onConfirm: async () => {
                                            await preferencesService.delete('theme');
                                            window.location.reload();
                                        }
                                    });
                                }}
                                className="w-full p-4 rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <MdPalette className="w-5 h-5 text-ui-text-secondary" />
                                        <div>
                                            <div className="text-sm font-medium text-ui-text-primary">Reset Theme</div>
                                            <div className="text-xs text-ui-text-secondary">Restore default theme</div>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-5 h-5 text-ui-text-tertiary" />
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Clear All Presets',
                                        message: 'Delete ALL presets? This will remove all saved preset configurations.',
                                        type: 'danger',
                                        onConfirm: async () => {
                                            await preferencesService.delete('dashboard.presets');
                                            await preferencesService.delete('dashboard.activePresetIndex');
                                            await preferencesService.delete('dashboard.currentPresetType');
                                            window.location.reload();
                                        }
                                    });
                                }}
                                className="w-full p-4 rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <MdBookmarks className="w-5 h-5 text-ui-text-secondary" />
                                        <div>
                                            <div className="text-sm font-medium text-ui-text-primary">Clear All Presets</div>
                                            <div className="text-xs text-ui-text-secondary">Delete saved presets</div>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-5 h-5 text-ui-text-tertiary" />
                                </div>
                            </button>
                        </div>
                    </Subsection>

                    <Subsection title="Nuclear Option">
                        <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MdWarning className="w-5 h-5 text-red-500" />
                                        <h4 className="text-sm font-bold text-ui-text-primary">Clear All Preferences</h4>
                                    </div>
                                    <p className="text-xs text-ui-text-secondary mb-2">
                                        Completely wipes ALL saved preferences and resets everything to defaults.
                                    </p>
                                    <p className="text-xs font-semibold text-red-500">
                                        ⚠️ This action is PERMANENT!
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowNuclearModal(true)}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shadow-lg"
                                >
                                    <MdDelete className="w-4 h-4" />
                                    Wipe
                                </button>
                            </div>
                        </div>
                    </Subsection>
                </div>
            </div>
        );
    }

    return null;
}
