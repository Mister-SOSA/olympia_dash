'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { useSettings } from "@/hooks/useSettings";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { preferencesService } from "@/lib/preferences";
import { toast } from "sonner";
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    REFRESH_INTERVAL_OPTIONS,
    NOTIFICATION_SETTINGS,
    WIDGET_SETTINGS,
} from "@/constants/settings";
import {
    MdClose,
    MdPerson,
    MdPalette,
    MdSettings,
    MdShield,
    MdLogout,
    MdChevronRight,
    MdCheck,
    MdSchedule,
    MdNotifications,
    MdStorage,
    MdVisibilityOff,
    MdRefresh,
    MdWarning,
    MdDelete,
} from "react-icons/md";

interface MobileSettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
}

type View = 'main' | 'themes' | 'preferences' | 'datetime' | 'notifications' | 'data' | 'account' | 'privacy' | 'advanced';

export default function MobileSettingsMenu({ user, onLogout, onClose, onAdminClick }: MobileSettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoaded } = useSettings();
    const { settings: privacySettings, updateSetting: updatePrivacySetting, toggle: togglePrivacy } = usePrivacy();
    const [currentView, setCurrentView] = useState<View>('main');
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>('dark');

    const goBack = () => setCurrentView('main');

    if (!isLoaded) return null;

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
                        <div className="mobile-settings-header">
                            <div className="flex items-center gap-2 mb-1">
                                <MdSettings className="w-5 h-5 text-ui-accent-primary" />
                                <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                            </div>
                            <p className="text-sm text-ui-text-secondary mb-4">
                                {user?.name} • {user?.role?.toUpperCase()}
                            </p>
                            <button onClick={onClose} className="mobile-icon-button absolute top-4 right-4" aria-label="Close">
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mobile-settings-content">
                            <div className="space-y-2">
                                <MenuButton icon={MdPalette} label="Themes" description="Change your dashboard theme" onClick={() => setCurrentView('themes')} />
                                <MenuButton icon={MdSchedule} label="Date & Time" description="Timezone and format settings" onClick={() => setCurrentView('datetime')} />
                                <MenuButton icon={MdSettings} label="Preferences" description="Dashboard & widget settings" onClick={() => setCurrentView('preferences')} />
                                <MenuButton icon={MdNotifications} label="Notifications" description="Sound and alert settings" onClick={() => setCurrentView('notifications')} />
                                <MenuButton icon={MdStorage} label="Data" description="Number and currency formats" onClick={() => setCurrentView('data')} />
                                <MenuButton
                                    icon={MdVisibilityOff}
                                    label="Privacy Mode"
                                    description="Hide sensitive information"
                                    onClick={() => setCurrentView('privacy')}
                                    badge={privacySettings.enabled ? "ON" : undefined}
                                    badgeColor="secondary"
                                />
                                <MenuButton icon={MdPerson} label="Account" description="Profile and account info" onClick={() => setCurrentView('account')} />
                                <MenuButton icon={MdWarning} label="Advanced" description="Reset and data management" onClick={() => setCurrentView('advanced')} />
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-6 space-y-2">
                                {user?.role === 'admin' && onAdminClick && (
                                    <button onClick={onAdminClick} className="mobile-settings-action-button bg-ui-accent-secondary border-ui-accent-secondary">
                                        <MdShield className="w-5 h-5" />
                                        <span>Admin Panel</span>
                                    </button>
                                )}
                                <button onClick={onLogout} className="mobile-settings-action-button bg-ui-danger-bg border-ui-danger-border text-ui-danger-text">
                                    <MdLogout className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Themes View */}
                {currentView === 'themes' && (
                    <SettingsSubView title="Themes" description="Choose your dashboard theme" onBack={goBack}>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setThemeCategory('dark')}
                                className={`mobile-category-pill ${themeCategory === 'dark' ? 'mobile-category-pill-active' : ''}`}
                            >
                                Dark Themes
                            </button>
                            <button
                                onClick={() => setThemeCategory('light')}
                                className={`mobile-category-pill ${themeCategory === 'light' ? 'mobile-category-pill-active' : ''}`}
                            >
                                Light Themes
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {THEMES.filter(t => t.category === themeCategory).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`mobile-theme-card ${theme === t.id ? 'mobile-theme-card-active' : ''}`}
                                >
                                    <div className="mobile-theme-preview" style={{ backgroundColor: t.colors[2] }}>
                                        <div className="flex-1 p-2 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-1.5 w-8 rounded" style={{ backgroundColor: t.colors[0] }} />
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.colors[1] }} />
                                            </div>
                                            <div className="rounded p-2 space-y-1" style={{ backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
                                                <div className="h-1 w-full rounded" style={{ backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />
                                                <div className="h-1 w-3/4 rounded" style={{ backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
                                            </div>
                                            <div className="rounded p-1.5" style={{ backgroundColor: t.category === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
                                                <div className="flex items-end justify-between h-6 gap-0.5">
                                                    <div className="w-full rounded-t" style={{ backgroundColor: t.colors[0], height: '50%' }} />
                                                    <div className="w-full rounded-t" style={{ backgroundColor: t.colors[1], height: '80%' }} />
                                                    <div className="w-full rounded-t" style={{ backgroundColor: t.colors[0], height: '35%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mobile-theme-name">
                                        <span className="font-medium text-ui-text-primary">{t.name}</span>
                                        {theme === t.id && <MdCheck className="w-4 h-4 text-ui-accent-primary" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </SettingsSubView>
                )}

                {/* Privacy View */}
                {currentView === 'privacy' && (
                    <SettingsSubView title="Privacy Mode" description="Hide sensitive information" onBack={goBack}>
                        <div className="space-y-4">
                            {/* Quick Toggle */}
                            <div className="rounded-xl border-2 p-4 transition-all" style={{
                                borderColor: privacySettings.enabled ? 'var(--ui-accent-secondary)' : 'var(--ui-border-primary)',
                                backgroundColor: privacySettings.enabled ? 'rgba(var(--ui-accent-secondary-rgb), 0.1)' : 'transparent'
                            }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${privacySettings.enabled ? 'bg-ui-accent-secondary text-white' : 'bg-ui-bg-tertiary text-ui-text-secondary'}`}>
                                            <MdVisibilityOff className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-ui-text-primary">Privacy Mode</div>
                                            <div className="text-xs text-ui-text-secondary">{privacySettings.enabled ? 'Data is hidden' : 'Data is visible'}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={togglePrivacy}
                                        className={`mobile-toggle ${privacySettings.enabled ? 'mobile-toggle-active' : ''}`}
                                    >
                                        <motion.div
                                            className="mobile-toggle-knob"
                                            animate={{ x: privacySettings.enabled ? 20 : 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mt-6 mb-2">What to Hide</div>
                            <MobileToggleSetting
                                label="Currency & Amounts"
                                description="Hide dollar values and prices"
                                enabled={privacySettings.obfuscateCurrency}
                                onChange={(val) => updatePrivacySetting('obfuscateCurrency', val)}
                            />
                            <MobileToggleSetting
                                label="Names"
                                description="Hide customer and vendor names"
                                enabled={privacySettings.obfuscateNames}
                                onChange={(val) => updatePrivacySetting('obfuscateNames', val)}
                            />
                            <MobileToggleSetting
                                label="Numbers"
                                description="Hide quantities and counts"
                                enabled={privacySettings.obfuscateNumbers}
                                onChange={(val) => updatePrivacySetting('obfuscateNumbers', val)}
                            />
                            <MobileToggleSetting
                                label="Percentages"
                                description="Hide growth rates and distributions"
                                enabled={privacySettings.obfuscatePercentages}
                                onChange={(val) => updatePrivacySetting('obfuscatePercentages', val)}
                            />

                            <div className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mt-6 mb-2">Style</div>
                            <div className="grid grid-cols-2 gap-2">
                                {(['blur', 'redact', 'asterisk', 'placeholder'] as const).map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => updatePrivacySetting('style', style)}
                                        className={`p-3 rounded-xl border-2 transition-all ${privacySettings.style === style
                                            ? 'border-ui-accent-secondary bg-ui-accent-secondary/10'
                                            : 'border-ui-border-primary bg-ui-bg-secondary'}`}
                                    >
                                        <div className="h-6 flex items-center justify-center mb-2">
                                            <ObfuscationPreview style={style} />
                                        </div>
                                        <span className="text-xs font-medium text-ui-text-primary capitalize">
                                            {style === 'asterisk' ? 'Asterisks' : style}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <MobileToggleSetting
                                label="Show Indicator"
                                description="Display badge when privacy mode is active"
                                enabled={privacySettings.showIndicator}
                                onChange={(val) => updatePrivacySetting('showIndicator', val)}
                            />
                        </div>
                    </SettingsSubView>
                )}

                {/* Preferences View */}
                {currentView === 'preferences' && (
                    <SettingsSubView title="Preferences" description="Customize behavior" onBack={goBack}>
                        <div className="space-y-4">
                            <MobileToggleSetting label="Enable Animations" description="Smooth transitions and effects" enabled={settings.animations} onChange={(val) => updateSetting('animations', val)} />
                            <MobileToggleSetting label="Auto-Save Layout" description="Save widget positions automatically" enabled={settings.autoSave} onChange={(val) => updateSetting('autoSave', val)} />
                            <MobileToggleSetting label="Confirm Widget Removal" description="Ask before removing widgets" enabled={settings.confirmDelete} onChange={(val) => updateSetting('confirmDelete', val)} />
                            <MobileToggleSetting label="Refresh Indicators" description="Show countdown rings on widgets" enabled={settings.showRefreshIndicators} onChange={(val) => updateSetting('showRefreshIndicators', val)} />
                            <MobileToggleSetting label="Widget Titles" description="Show titles in widget headers" enabled={settings.showWidgetTitles} onChange={(val) => updateSetting('showWidgetTitles', val)} />

                            <MobileSelectSetting
                                label="Refresh Interval"
                                description="How often widgets update"
                                value={settings.defaultRefreshInterval}
                                onChange={(val) => updateSetting('defaultRefreshInterval', Number(val))}
                                options={REFRESH_INTERVAL_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            />
                            <MobileSelectSetting
                                label="Table Rows"
                                description="Default rows in table widgets"
                                value={settings.tableRowsPerPage}
                                onChange={(val) => updateSetting('tableRowsPerPage', Number(val))}
                                options={WIDGET_SETTINGS.tableRowsPerPage.options.map(n => ({ value: n, label: `${n} rows` }))}
                            />
                        </div>
                    </SettingsSubView>
                )}

                {/* Date & Time View */}
                {currentView === 'datetime' && (
                    <SettingsSubView title="Date & Time" description="Regional settings" onBack={goBack}>
                        <div className="space-y-4">
                            <MobileSelectSetting
                                label="Timezone"
                                description="Display times in this timezone"
                                value={settings.timezone}
                                onChange={(val) => updateSetting('timezone', val)}
                                options={TIMEZONE_OPTIONS.map(tz => ({ value: tz.value, label: tz.label }))}
                            />
                            <MobileSelectSetting
                                label="Date Format"
                                description="How dates are displayed"
                                value={settings.dateFormat}
                                onChange={(val) => updateSetting('dateFormat', val)}
                                options={DATE_FORMAT_OPTIONS.map(df => ({ value: df.value, label: `${df.label} (${df.example})` }))}
                            />
                            <div className="mobile-settings-group">
                                <div className="text-sm font-semibold text-ui-text-primary mb-1">Clock Format</div>
                                <div className="text-xs text-ui-text-secondary mb-3">12-hour or 24-hour time</div>
                                <div className="flex gap-2">
                                    {(['12h', '24h'] as const).map((format) => (
                                        <button
                                            key={format}
                                            onClick={() => updateSetting('clockFormat', format)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.clockFormat === format ? 'bg-ui-accent-primary text-white' : 'bg-ui-bg-tertiary text-ui-text-secondary'}`}
                                        >
                                            {format}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <MobileToggleSetting label="Show Seconds" description="Display seconds in clock widgets" enabled={settings.showSeconds} onChange={(val) => updateSetting('showSeconds', val)} />
                        </div>
                    </SettingsSubView>
                )}

                {/* Notifications View */}
                {currentView === 'notifications' && (
                    <SettingsSubView title="Notifications" description="Sound and alert settings" onBack={goBack}>
                        <div className="space-y-4">
                            <MobileToggleSetting label="Sound Notifications" description="Play sound for important alerts" enabled={settings.soundEnabled} onChange={(val) => updateSetting('soundEnabled', val)} />
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
                            <MobileSelectSetting
                                label="Toast Position"
                                description="Where notifications appear"
                                value={settings.toastPosition}
                                onChange={(val) => updateSetting('toastPosition', val)}
                                options={NOTIFICATION_SETTINGS.toastPosition.options.map(pos => ({ value: pos, label: pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))}
                            />
                            <MobileSelectSetting
                                label="Toast Duration"
                                description="How long toasts stay visible"
                                value={settings.toastDuration}
                                onChange={(val) => updateSetting('toastDuration', Number(val))}
                                options={[
                                    { value: 2000, label: '2 seconds' },
                                    { value: 4000, label: '4 seconds' },
                                    { value: 6000, label: '6 seconds' },
                                    { value: 8000, label: '8 seconds' },
                                ]}
                            />
                        </div>
                    </SettingsSubView>
                )}

                {/* Data View */}
                {currentView === 'data' && (
                    <SettingsSubView title="Data" description="Number and currency formats" onBack={goBack}>
                        <div className="space-y-4">
                            <MobileSelectSetting
                                label="Number Format"
                                description="How numbers are formatted"
                                value={settings.numberFormat}
                                onChange={(val) => updateSetting('numberFormat', val)}
                                options={[
                                    { value: 'en-US', label: 'US (1,234.56)' },
                                    { value: 'en-GB', label: 'UK (1,234.56)' },
                                    { value: 'de-DE', label: 'German (1.234,56)' },
                                    { value: 'fr-FR', label: 'French (1 234,56)' },
                                ]}
                            />
                            <MobileSelectSetting
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
                            <MobileToggleSetting label="Enable Caching" description="Cache data locally for faster loading" enabled={settings.cacheEnabled} onChange={(val) => updateSetting('cacheEnabled', val)} />
                        </div>
                    </SettingsSubView>
                )}

                {/* Account View */}
                {currentView === 'account' && (
                    <SettingsSubView title="Account" description="Your profile information" onBack={goBack}>
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
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${user.role === 'admin' ? 'bg-ui-accent-secondary text-white' : 'bg-ui-accent-primary text-white'}`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    preferencesService.set('onboarding.completed', false);
                                    preferencesService.delete('onboarding.skipped');
                                    window.location.reload();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ui-bg-tertiary border border-ui-border-primary text-ui-text-primary rounded-xl text-sm font-medium"
                            >
                                <MdRefresh className="w-4 h-4" />
                                Re-run Setup Wizard
                            </button>
                        </div>
                    </SettingsSubView>
                )}

                {/* Advanced View */}
                {currentView === 'advanced' && (
                    <SettingsSubView title="Advanced" description="Reset and data management" onBack={goBack}>
                        <div className="space-y-4">
                            <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4">
                                <div className="flex items-start gap-3">
                                    <MdWarning className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-ui-text-primary mb-1">Caution</p>
                                        <p className="text-xs text-ui-text-secondary">These actions cannot be undone.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (confirm('Reset theme to default?')) {
                                        preferencesService.delete('theme');
                                        window.location.reload();
                                    }
                                }}
                                className="w-full p-4 rounded-xl border border-ui-border-primary bg-ui-bg-secondary text-left"
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
                                    if (confirm('Delete all mobile presets?')) {
                                        preferencesService.delete('mobile_presets');
                                        window.location.reload();
                                    }
                                }}
                                className="w-full p-4 rounded-xl border border-ui-border-primary bg-ui-bg-secondary text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <MdDelete className="w-5 h-5 text-ui-text-secondary" />
                                        <div>
                                            <div className="text-sm font-medium text-ui-text-primary">Clear Mobile Presets</div>
                                            <div className="text-xs text-ui-text-secondary">Delete all saved presets</div>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-5 h-5 text-ui-text-tertiary" />
                                </div>
                            </button>

                            <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MdWarning className="w-5 h-5 text-red-500" />
                                            <h4 className="text-sm font-bold text-ui-text-primary">Nuclear Reset</h4>
                                        </div>
                                        <p className="text-xs text-ui-text-secondary mb-2">Wipe ALL preferences and start fresh.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const confirmed = prompt('Type "RESET" to confirm:');
                                            if (confirmed === 'RESET') {
                                                await preferencesService.clearAll();
                                                toast.success('All preferences cleared');
                                                window.location.reload();
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <MdDelete className="w-4 h-4" />
                                        Wipe
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SettingsSubView>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// Helper Components
// ============================================

function SettingsSubView({ title, description, onBack, children }: {
    title: string;
    description: string;
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mobile-settings-view"
        >
            <div className="mobile-settings-header">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={onBack} className="mobile-icon-button">
                        <MdChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-ui-text-primary">{title}</h2>
                        <p className="text-sm text-ui-text-secondary">{description}</p>
                    </div>
                </div>
            </div>
            <div className="mobile-settings-content">{children}</div>
        </motion.div>
    );
}

function MenuButton({ icon: Icon, label, description, onClick, badge, badgeColor = 'primary' }: {
    icon: any;
    label: string;
    description: string;
    onClick: () => void;
    badge?: string;
    badgeColor?: 'primary' | 'secondary';
}) {
    return (
        <button onClick={onClick} className="mobile-menu-button">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="mobile-menu-icon">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-ui-text-primary">{label}</span>
                        {badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor === 'secondary' ? 'bg-ui-accent-secondary text-white' : 'bg-ui-accent-primary text-white'}`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-ui-text-secondary">{description}</div>
                </div>
            </div>
            <MdChevronRight className="w-5 h-5 text-ui-text-tertiary flex-shrink-0" />
        </button>
    );
}

function MobileToggleSetting({ label, description, enabled, onChange }: {
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
                <button onClick={() => onChange(!isEnabled)} className={`mobile-toggle ${isEnabled ? 'mobile-toggle-active' : ''}`}>
                    <motion.div className="mobile-toggle-knob" animate={{ x: isEnabled ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                </button>
            </div>
        </div>
    );
}

function MobileSelectSetting({ label, description, value, onChange, options }: {
    label: string;
    description: string;
    value: any;
    onChange: (val: any) => void;
    options: { value: any; label: string }[];
}) {
    return (
        <div className="mobile-settings-group">
            <label className="block">
                <div className="text-sm font-semibold text-ui-text-primary mb-1">{label}</div>
                <div className="text-xs text-ui-text-secondary mb-3">{description}</div>
                <select value={value} onChange={(e) => onChange(e.target.value)} className="mobile-select">
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </label>
        </div>
    );
}

function ObfuscationPreview({ style }: { style: 'blur' | 'redact' | 'asterisk' | 'placeholder' }) {
    const sampleText = "$1,234";
    switch (style) {
        case 'blur':
            return <span className="text-sm font-medium text-ui-text-primary" style={{ filter: 'blur(5px)' }}>{sampleText}</span>;
        case 'redact':
            return <span className="text-sm font-medium px-1 rounded" style={{ backgroundColor: 'var(--ui-text-primary)', color: 'transparent' }}>{sampleText}</span>;
        case 'asterisk':
            return <span className="text-sm font-mono text-ui-text-secondary">$***</span>;
        case 'placeholder':
            return <span className="text-sm text-ui-text-secondary">$••••</span>;
    }
}
