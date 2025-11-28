'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES } from "@/contexts/ThemeContext";
import { DashboardPreset } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { usePrivacy, ObfuscationStyle } from "@/contexts/PrivacyContext";
import {
    TIMEZONE_OPTIONS,
    DATE_FORMAT_OPTIONS,
    NOTIFICATION_SETTINGS,
    DOCK_SETTINGS,
    DRAG_HANDLE_SETTINGS,
    GRID_SETTINGS,
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
    MdVisibilityOff,
    MdDock,
    MdRefresh,
    MdGridOn,
    MdChevronRight,
    MdDragIndicator,
    MdAutorenew,
    MdWidgets,
    MdBookmarks,
    MdSettings,
} from "react-icons/md";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
    presets?: Array<DashboardPreset | null>;
}

// Real Drag Handle Component - self-contained preview matching the actual CSS
function RealDragHandle({ style, size }: { style: 'pill' | 'bar' | 'dots' | 'minimal'; size: 'small' | 'medium' | 'large' }) {
    // Size configurations - exactly matching globals.css values
    const sizeConfig = {
        small: {
            padding: '4px 12px',
            borderRadius: '0 0 10px 10px',
            dotSize: 3,
            peekWidth: 24,
            peekHeight: 2,
            dotOffset: 9,
            minWidth: 50,
            dotsMinWidth: 70,
        },
        medium: {
            padding: '6px 16px',
            borderRadius: '0 0 14px 14px',
            dotSize: 4,
            peekWidth: 32,
            peekHeight: 3,
            dotOffset: 12,
            minWidth: 70,
            dotsMinWidth: 100,
        },
        large: {
            padding: '8px 24px',
            borderRadius: '0 0 18px 18px',
            dotSize: 5,
            peekWidth: 40,
            peekHeight: 4,
            dotOffset: 14,
            minWidth: 90,
            dotsMinWidth: 120,
        },
    };

    const config = sizeConfig[size];
    const isDots = style === 'dots';
    const effectiveMinWidth = isDots ? config.dotsMinWidth : config.minWidth;

    // For 'dots' style (5 dots), we need double the offset for outer dots
    const dotsOuterOffset = config.dotOffset * 2;

    // Base container styles
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: config.padding,
        minWidth: effectiveMinWidth,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: config.borderRadius,
        borderLeft: '0.5px solid rgba(255, 255, 255, 0.15)',
        borderRight: '0.5px solid rgba(255, 255, 255, 0.15)',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
    };

    // Peek indicator (the line above the handle)
    const peekStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%) translateY(-100%)',
        width: config.peekWidth,
        height: config.peekHeight,
        borderRadius: `${config.peekHeight}px ${config.peekHeight}px 0 0`,
        background: 'rgba(255, 255, 255, 0.2)',
    };

    // Dot style
    const dotStyle: React.CSSProperties = {
        width: config.dotSize,
        height: config.dotSize,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.7)',
        flexShrink: 0,
    };

    // Bar style
    const barStyle: React.CSSProperties = {
        width: 32,
        height: 3,
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.7)',
    };

    // Render dots using absolute positioning (matching CSS box-shadow approach)
    const renderDots = (count: 3 | 5) => {
        const positions = count === 3
            ? [-config.dotOffset, 0, config.dotOffset]
            : [-dotsOuterOffset, -config.dotOffset, 0, config.dotOffset, dotsOuterOffset];

        return (
            <div style={{ position: 'relative', height: config.dotSize, width: count === 3 ? config.dotOffset * 2 + config.dotSize : dotsOuterOffset * 2 + config.dotSize }}>
                {positions.map((offset, i) => (
                    <div
                        key={i}
                        style={{
                            ...dotStyle,
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            transform: `translateX(calc(-50% + ${offset}px))`,
                        }}
                    />
                ))}
            </div>
        );
    };

    if (style === 'minimal') {
        // Minimal is just a subtle line
        return (
            <div style={{ padding: '4px 16px' }}>
                <div style={{
                    width: config.peekWidth + 16,
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.3)'
                }} />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={peekStyle} />
            {style === 'pill' && renderDots(3)}
            {style === 'bar' && <div style={barStyle} />}
            {style === 'dots' && renderDots(5)}
        </div>
    );
}

// Obfuscation Style Preview - shows exactly what each style looks like
function ObfuscationPreview({ style, sampleText = "$1,234.56" }: { style: 'blur' | 'redact' | 'asterisk' | 'placeholder'; sampleText?: string }) {
    switch (style) {
        case 'blur':
            return (
                <span
                    className="text-sm font-medium text-ui-text-primary"
                    style={{ filter: 'blur(6px)', userSelect: 'none', WebkitFilter: 'blur(6px)' }}
                >
                    {sampleText}
                </span>
            );
        case 'redact':
            // Black/dark bar over the text - like a marker redaction
            return (
                <span
                    className="text-sm font-medium px-1 rounded select-none"
                    style={{
                        backgroundColor: 'var(--ui-text-primary, #1f2937)',
                        color: 'transparent',
                    }}
                >
                    {sampleText}
                </span>
            );
        case 'asterisk':
            return <span className="text-sm font-mono text-ui-text-secondary">$***</span>;
        case 'placeholder':
            return <span className="text-sm text-ui-text-secondary">$••••</span>;
    }
}

// Live Preview: Dock at bottom
function DockPreview({ settings }: { settings: any }) {
    return (
        <div className="relative h-28 bg-gradient-to-b from-ui-bg-tertiary/20 to-ui-bg-tertiary/50 rounded-xl overflow-hidden border border-ui-border-primary">
            {/* Mock screen content */}
            <div className="absolute inset-x-4 top-3 h-6 bg-ui-bg-tertiary/30 rounded" />
            <div className="absolute inset-x-4 top-11 h-3 bg-ui-bg-tertiary/20 rounded" />
            <div className="absolute left-4 right-20 top-16 h-3 bg-ui-bg-tertiary/15 rounded" />

            {/* Preview Dock */}
            <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1.5 px-3 py-2 rounded-xl bg-ui-bg-primary/95 border border-ui-border-primary shadow-lg backdrop-blur-sm"
                style={{ opacity: settings.dockOpacity / 100 }}
            >
                {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                        key={i}
                        className={`rounded-lg transition-all ${i === 3 ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'}`}
                        style={{
                            width: `${settings.dockIconSize / 3.5}px`,
                            height: `${settings.dockIconSize / 3.5}px`,
                        }}
                        whileHover={settings.dockMagnification ? {
                            scale: settings.dockMagnificationScale,
                            y: -4
                        } : {}}
                    />
                ))}
            </div>

            {/* Trigger zone indicator */}
            {settings.dockAutoHide && (
                <div
                    className="absolute bottom-0 left-0 right-0 bg-ui-accent-primary/10 border-t border-dashed border-ui-accent-primary/30"
                    style={{ height: `${Math.min(settings.dockTriggerDistance / 2, 40)}%` }}
                >
                    <span className="absolute right-2 top-1 text-[9px] text-ui-accent-primary/60 font-medium">trigger zone</span>
                </div>
            )}
        </div>
    );
}

// Subsection Component for nested organization
function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider">{title}</h4>
            {children}
        </div>
    );
}

type SettingsView = 'account' | 'appearance' | 'layout' | 'dock' | 'widgets' | 'regional' | 'notifications' | 'privacy' | 'presets' | 'shortcuts';

const NAVIGATION_ITEMS: { id: SettingsView; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: 'account', icon: MdPerson, label: 'Account' },
    { id: 'appearance', icon: MdPalette, label: 'Appearance' },
    { id: 'layout', icon: MdGridOn, label: 'Layout & Grid', badge: 'Sync' },
    { id: 'dock', icon: MdDock, label: 'Dock' },
    { id: 'widgets', icon: MdTune, label: 'Widgets' },
    { id: 'regional', icon: MdSchedule, label: 'Regional' },
    { id: 'notifications', icon: MdNotifications, label: 'Notifications' },
    { id: 'privacy', icon: MdVisibilityOff, label: 'Privacy' },
    { id: 'presets', icon: MdRefresh, label: 'Presets' },
    { id: 'shortcuts', icon: MdKeyboard, label: 'Shortcuts' },
];

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick, presets = [] }: SettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoaded } = useSettings();
    const { settings: privacySettings, updateSetting: updatePrivacySetting, toggle: togglePrivacy } = usePrivacy();
    const [activeView, setActiveView] = useState<SettingsView>('account');
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>(
        THEMES.find(t => t.id === theme)?.category as 'dark' | 'light' || 'dark'
    );
    const contentRef = useRef<HTMLDivElement>(null);

    // Local state for grid settings
    const [localGridColumns, setLocalGridColumns] = useState(settings.gridColumns);
    const [localGridCellHeight, setLocalGridCellHeight] = useState(settings.gridCellHeight);

    // Calculate available presets (those that are initialized with layouts)
    const availablePresets = useMemo(() => {
        return presets.map((preset, index) => ({
            index,
            preset,
            isValid: preset !== null && preset.layout.some(w => w.enabled),
            name: preset?.name || `Preset ${index + 1}`,
            widgetCount: preset?.layout.filter(w => w.enabled).length || 0,
        })).filter(p => p.isValid);
    }, [presets]);

    useEffect(() => {
        setLocalGridColumns(settings.gridColumns);
        setLocalGridCellHeight(settings.gridCellHeight);
    }, [settings.gridColumns, settings.gridCellHeight]);

    // Scroll to top when view changes
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeView]);

    if (!isLoaded) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-[85vh] max-h-[700px] flex"
            >
                <div className="bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary overflow-hidden flex w-full">
                    {/* Sidebar Navigation */}
                    <div className="w-56 bg-ui-bg-secondary/30 border-r border-ui-border-primary flex flex-col flex-shrink-0">
                        {/* Header */}
                        <div className="px-5 py-5 border-b border-ui-border-primary">
                            <h2 className="text-lg font-bold text-ui-text-primary">Settings</h2>
                            <p className="text-xs text-ui-text-tertiary mt-0.5">Customize dashboard</p>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto py-3 px-3">
                            <div className="space-y-1">
                                {NAVIGATION_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;
                                    const showBadge = item.id === 'privacy' && privacySettings.enabled;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveView(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? 'bg-ui-accent-primary text-white shadow-sm'
                                                : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                            <span className="flex-1 text-left truncate">{item.label}</span>
                                            {item.badge && !showBadge && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-ui-accent-primary/20 text-ui-accent-primary'
                                                    }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                            {showBadge && (
                                                <div className="w-2 h-2 rounded-full bg-ui-accent-secondary flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>

                        {/* Close Button */}
                        <div className="p-3 border-t border-ui-border-primary">
                            <button
                                onClick={onClose}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary transition-all"
                            >
                                <MdClose className="w-4 h-4" />
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div ref={contentRef} className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeView}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="p-6"
                                >
                                    {/* Account View */}
                                    {activeView === 'account' && (
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
                                                        onClick={onLogout}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-sm font-medium transition-all"
                                                    >
                                                        <MdLogout className="w-4 h-4" />
                                                        Logout
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Appearance View */}
                                    {activeView === 'appearance' && (
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

                                                    {/* Theme Grid */}
                                                    <div className="grid grid-cols-4 gap-3">
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
                                                        <ToggleSetting
                                                            label="Christmas Mode 🎄"
                                                            description="Snow and twinkling lights"
                                                            enabled={settings.snowEffect}
                                                            onChange={(val) => updateSetting('snowEffect', val)}
                                                        />
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
                                    )}

                                    {/* Layout & Grid View */}
                                    {activeView === 'layout' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-ui-text-primary">Layout & Grid</h3>
                                                <p className="text-sm text-ui-text-secondary mt-1">Dashboard organization and grid configuration</p>
                                            </div>
                                            <div className="space-y-5">
                                                <Subsection title="Keyboard">
                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden">
                                                        <ToggleSetting
                                                            label="Enable Hotkeys"
                                                            description="Allow keyboard shortcuts throughout dashboard"
                                                            enabled={settings.enableHotkeys}
                                                            onChange={(val) => updateSetting('enableHotkeys', val)}
                                                        />
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Grid">
                                                    {/* Info */}
                                                    <div className="rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/5 p-3">
                                                        <p className="text-xs text-ui-text-secondary leading-relaxed">
                                                            <strong className="text-ui-text-primary">Synced across sessions.</strong> All devices use the same grid to prevent layout issues.
                                                        </p>
                                                    </div>

                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                        <SliderSetting
                                                            label="Columns"
                                                            description="Number of grid columns"
                                                            value={localGridColumns}
                                                            onChange={setLocalGridColumns}
                                                            min={GRID_SETTINGS.columns.min}
                                                            max={GRID_SETTINGS.columns.max}
                                                            step={GRID_SETTINGS.columns.step}
                                                        />
                                                        <SliderSetting
                                                            label="Cell Height"
                                                            description="Height of each grid cell"
                                                            value={localGridCellHeight}
                                                            onChange={setLocalGridCellHeight}
                                                            min={GRID_SETTINGS.cellHeight.min}
                                                            max={GRID_SETTINGS.cellHeight.max}
                                                            step={GRID_SETTINGS.cellHeight.step}
                                                            unit="px"
                                                        />
                                                    </div>

                                                    {/* Apply Button */}
                                                    <div className="space-y-2">
                                                        <button
                                                            onClick={async () => {
                                                                const { preferencesService } = await import('@/lib/preferences');
                                                                preferencesService.set('grid.columns', localGridColumns);
                                                                preferencesService.set('grid.cellHeight', localGridCellHeight);
                                                                await preferencesService.forceSync();
                                                                window.location.reload();
                                                            }}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white rounded-lg text-sm font-semibold transition-all"
                                                        >
                                                            <MdRefresh className="w-4 h-4" />
                                                            Apply & Reload
                                                        </button>
                                                        <p className="text-[10px] text-ui-text-tertiary text-center">
                                                            Grid changes require reload
                                                        </p>
                                                    </div>
                                                </Subsection>

                                                {/* Drag Handles Section with Visual Picker */}
                                                <Subsection title="Drag Handles">
                                                    {/* Live Preview */}
                                                    <div className="rounded-xl border border-ui-border-primary bg-ui-bg-secondary/30 overflow-hidden">
                                                        <div className="px-3 py-2 border-b border-ui-border-primary bg-ui-bg-tertiary/30">
                                                            <span className="text-[10px] font-semibold text-ui-text-tertiary uppercase tracking-wider">Live Preview</span>
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="relative h-24 bg-ui-bg-tertiary/30 rounded-lg border-2 border-ui-border-primary overflow-hidden">
                                                                {/* Mock widget content */}
                                                                <div className="absolute inset-4 top-10 bg-ui-bg-tertiary/40 rounded" />
                                                                <div className="absolute left-4 right-12 bottom-4 h-3 bg-ui-bg-tertiary/30 rounded" />

                                                                {/* Preview Drag Handle - Uses real handle component */}
                                                                <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
                                                                    <RealDragHandle
                                                                        style={settings.dragHandleStyle}
                                                                        size={settings.dragHandleSize}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Handle Style Visual Picker */}
                                                    <div>
                                                        <div className="text-xs font-medium text-ui-text-secondary mb-2">Handle Style</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {(['pill', 'bar', 'dots', 'minimal'] as const).map((style) => (
                                                                <button
                                                                    key={style}
                                                                    onClick={() => updateSetting('dragHandleStyle', style)}
                                                                    className={`relative p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${settings.dragHandleStyle === style
                                                                        ? 'border-ui-accent-primary bg-ui-accent-primary/10 shadow-sm'
                                                                        : 'border-ui-border-primary hover:border-ui-border-secondary bg-ui-bg-secondary/30'
                                                                        }`}
                                                                >
                                                                    <div className="h-10 flex items-center justify-center bg-ui-bg-tertiary/50 rounded-lg">
                                                                        <RealDragHandle style={style} size="small" />
                                                                    </div>
                                                                    <span className="text-[11px] font-medium text-ui-text-primary capitalize mt-1.5 block text-center">
                                                                        {style}
                                                                    </span>
                                                                    {settings.dragHandleStyle === style && (
                                                                        <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-ui-accent-primary rounded-full" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Handle Size Segmented Control */}
                                                    <div className="flex items-center justify-between p-3 rounded-lg border border-ui-border-primary bg-ui-bg-secondary/20">
                                                        <div>
                                                            <div className="text-sm font-medium text-ui-text-primary">Handle Size</div>
                                                            <div className="text-xs text-ui-text-secondary">Size of the drag handle</div>
                                                        </div>
                                                        <div className="flex gap-0.5 p-0.5 bg-ui-bg-tertiary rounded-lg">
                                                            {(['small', 'medium', 'large'] as const).map((size) => (
                                                                <button
                                                                    key={size}
                                                                    onClick={() => updateSetting('dragHandleSize', size)}
                                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${settings.dragHandleSize === size
                                                                        ? 'bg-ui-bg-primary text-ui-text-primary shadow-sm'
                                                                        : 'text-ui-text-secondary hover:text-ui-text-primary'
                                                                        }`}
                                                                >
                                                                    {size}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Handle Settings */}
                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                        <SliderSetting
                                                            label="Handle Opacity"
                                                            description="Visibility when shown"
                                                            value={settings.dragHandleOpacity}
                                                            onChange={(val) => updateSetting('dragHandleOpacity', val)}
                                                            min={DRAG_HANDLE_SETTINGS.handleOpacity.min}
                                                            max={DRAG_HANDLE_SETTINGS.handleOpacity.max}
                                                            step={DRAG_HANDLE_SETTINGS.handleOpacity.step}
                                                            unit="%"
                                                        />
                                                        <ToggleSetting
                                                            label="Always Visible"
                                                            description="Keep handles visible at all times"
                                                            enabled={settings.dragHandleAlwaysShow}
                                                            onChange={(val) => updateSetting('dragHandleAlwaysShow', val)}
                                                        />
                                                        <SliderSetting
                                                            label="Hover Delay"
                                                            description="Wait before showing handle"
                                                            value={settings.dragHandleHoverDelay}
                                                            onChange={(val) => updateSetting('dragHandleHoverDelay', val)}
                                                            min={DRAG_HANDLE_SETTINGS.hoverDelay.min}
                                                            max={DRAG_HANDLE_SETTINGS.hoverDelay.max}
                                                            step={DRAG_HANDLE_SETTINGS.hoverDelay.step}
                                                            disabled={settings.dragHandleAlwaysShow}
                                                            unit="ms"
                                                        />
                                                        <ToggleSetting
                                                            label="Resize Handles"
                                                            description="Show corner handles for resizing"
                                                            enabled={settings.showResizeHandles}
                                                            onChange={(val) => updateSetting('showResizeHandles', val)}
                                                        />
                                                    </div>

                                                    {/* Reset to Defaults */}
                                                    <button
                                                        onClick={() => {
                                                            updateSetting('dockAutoHide', DOCK_SETTINGS.autoHide.default);
                                                            updateSetting('dockMagnification', DOCK_SETTINGS.magnification.default);
                                                            updateSetting('dockMagnificationScale', DOCK_SETTINGS.magnificationScale.default);
                                                            updateSetting('dragHandleAlwaysShow', DRAG_HANDLE_SETTINGS.alwaysShow.default);
                                                            updateSetting('dragHandleOpacity', DRAG_HANDLE_SETTINGS.handleOpacity.default);
                                                            updateSetting('dragHandleSize', DRAG_HANDLE_SETTINGS.handleSize.default);
                                                            updateSetting('dragHandleStyle', DRAG_HANDLE_SETTINGS.handleStyle.default);
                                                            updateSetting('dragHandleHoverDelay', DRAG_HANDLE_SETTINGS.hoverDelay.default);
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-ui-border-primary text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary transition-all"
                                                    >
                                                        <MdRefresh className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Reset to Defaults</span>
                                                    </button>
                                                </Subsection>
                                            </div>
                                        </div>
                                    )}

                                    {/* Dock View */}
                                    {activeView === 'dock' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-ui-text-primary">Dock</h3>
                                                <p className="text-sm text-ui-text-secondary mt-1">Quick access toolbar settings</p>
                                            </div>
                                            <div className="space-y-5">
                                                {/* Live Preview */}
                                                <DockPreview settings={settings} />

                                                <Subsection title="Behavior">
                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                        <ToggleSetting
                                                            label="Auto-hide"
                                                            description="Hide dock until mouse approaches bottom"
                                                            enabled={settings.dockAutoHide}
                                                            onChange={(val) => updateSetting('dockAutoHide', val)}
                                                        />
                                                        <SliderSetting
                                                            label="Trigger Distance"
                                                            description="How close to bottom edge activates dock"
                                                            value={settings.dockTriggerDistance}
                                                            onChange={(val) => updateSetting('dockTriggerDistance', val)}
                                                            min={DOCK_SETTINGS.triggerDistance.min}
                                                            max={DOCK_SETTINGS.triggerDistance.max}
                                                            step={DOCK_SETTINGS.triggerDistance.step}
                                                            disabled={!settings.dockAutoHide}
                                                            unit="px"
                                                        />
                                                        <SliderSetting
                                                            label="Hide Delay"
                                                            description="Wait before hiding dock"
                                                            value={settings.dockHideDelay}
                                                            onChange={(val) => updateSetting('dockHideDelay', val)}
                                                            min={DOCK_SETTINGS.hideDelay.min}
                                                            max={DOCK_SETTINGS.hideDelay.max}
                                                            step={DOCK_SETTINGS.hideDelay.step}
                                                            disabled={!settings.dockAutoHide}
                                                            unit="ms"
                                                        />
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Appearance">
                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                        <SliderSetting
                                                            label="Icon Size"
                                                            description="Base size of dock icons"
                                                            value={settings.dockIconSize}
                                                            onChange={(val) => updateSetting('dockIconSize', val)}
                                                            min={DOCK_SETTINGS.iconSize.min}
                                                            max={DOCK_SETTINGS.iconSize.max}
                                                            step={DOCK_SETTINGS.iconSize.step}
                                                            unit="px"
                                                        />
                                                        <SliderSetting
                                                            label="Opacity"
                                                            description="Dock background transparency"
                                                            value={settings.dockOpacity}
                                                            onChange={(val) => updateSetting('dockOpacity', val)}
                                                            min={DOCK_SETTINGS.opacity.min}
                                                            max={DOCK_SETTINGS.opacity.max}
                                                            step={DOCK_SETTINGS.opacity.step}
                                                            unit="%"
                                                        />
                                                        <ToggleSetting
                                                            label="Active Preset Indicator"
                                                            description="Show glowing dot on active preset"
                                                            enabled={settings.dockShowActiveIndicator}
                                                            onChange={(val) => updateSetting('dockShowActiveIndicator', val)}
                                                        />
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Magnification">
                                                    <div className="rounded-lg border border-ui-border-primary overflow-hidden divide-y divide-ui-border-primary">
                                                        <ToggleSetting
                                                            label="Enable Magnification"
                                                            description="macOS-style hover zoom effect"
                                                            enabled={settings.dockMagnification}
                                                            onChange={(val) => updateSetting('dockMagnification', val)}
                                                        />
                                                        <SliderSetting
                                                            label="Scale"
                                                            description="How much icons enlarge on hover"
                                                            value={settings.dockMagnificationScale}
                                                            onChange={(val) => updateSetting('dockMagnificationScale', val)}
                                                            min={DOCK_SETTINGS.magnificationScale.min}
                                                            max={DOCK_SETTINGS.magnificationScale.max}
                                                            step={DOCK_SETTINGS.magnificationScale.step}
                                                            disabled={!settings.dockMagnification}
                                                            unit="×"
                                                            decimals={1}
                                                        />
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Dock Items">
                                                    <p className="text-xs text-ui-text-tertiary mb-3">Choose which controls appear in your dock</p>

                                                    {/* Single row of dock icons matching actual dock */}
                                                    <div className="flex items-start gap-3 p-3 bg-ui-bg-secondary/30 rounded-xl border border-ui-border-primary">
                                                        <DockItemToggle
                                                            icon={<MdWidgets className="w-5 h-5" />}
                                                            label="Widgets"
                                                            enabled={settings.dockShowWidgetsToggle}
                                                            onChange={(val) => updateSetting('dockShowWidgetsToggle', val)}
                                                        />
                                                        <DockItemToggle
                                                            icon={<MdBookmarks className="w-5 h-5" />}
                                                            label="Presets"
                                                            enabled={settings.dockShowPresetManager}
                                                            onChange={(val) => updateSetting('dockShowPresetManager', val)}
                                                        />
                                                        <DockItemToggle
                                                            icon={<MdAutorenew className="w-5 h-5" />}
                                                            label="Auto-Cycle"
                                                            enabled={settings.dockShowAutoCycleToggle}
                                                            onChange={(val) => updateSetting('dockShowAutoCycleToggle', val)}
                                                            variant="autocycle"
                                                        />
                                                        <DockItemToggle
                                                            icon={<MdVisibilityOff className="w-5 h-5" />}
                                                            label="Privacy"
                                                            enabled={settings.dockShowPrivacyToggle}
                                                            onChange={(val) => updateSetting('dockShowPrivacyToggle', val)}
                                                            variant="privacy"
                                                        />
                                                        <DockItemToggle
                                                            icon={<MdSettings className="w-5 h-5" />}
                                                            label="Settings"
                                                            enabled={settings.dockShowSettingsToggle}
                                                            onChange={(val) => updateSetting('dockShowSettingsToggle', val)}
                                                        />
                                                    </div>

                                                    {/* Additional option */}
                                                    <div className="mt-3 rounded-lg border border-ui-border-primary overflow-hidden">
                                                        <ToggleSetting
                                                            label="Create Preset Button"
                                                            description="Show when preset slots are available"
                                                            enabled={settings.dockShowCreatePreset}
                                                            onChange={(val) => updateSetting('dockShowCreatePreset', val)}
                                                        />
                                                    </div>
                                                </Subsection>                                                {/* Reset to Defaults */}
                                                <button
                                                    onClick={() => {
                                                        updateSetting('dockAutoHide', DOCK_SETTINGS.autoHide.default);
                                                        updateSetting('dockMagnification', DOCK_SETTINGS.magnification.default);
                                                        updateSetting('dockMagnificationScale', DOCK_SETTINGS.magnificationScale.default);
                                                        updateSetting('dockIconSize', DOCK_SETTINGS.iconSize.default);
                                                        updateSetting('dockShowActiveIndicator', DOCK_SETTINGS.showActiveIndicator.default);
                                                        updateSetting('dockTriggerDistance', DOCK_SETTINGS.triggerDistance.default);
                                                        updateSetting('dockHideDelay', DOCK_SETTINGS.hideDelay.default);
                                                        updateSetting('dockOpacity', DOCK_SETTINGS.opacity.default);
                                                        updateSetting('dockShowWidgetsToggle', DOCK_SETTINGS.showWidgetsToggle.default);
                                                        updateSetting('dockShowPresetManager', DOCK_SETTINGS.showPresetManager.default);
                                                        updateSetting('dockShowPrivacyToggle', DOCK_SETTINGS.showPrivacyToggle.default);
                                                        updateSetting('dockShowSettingsToggle', DOCK_SETTINGS.showSettingsToggle.default);
                                                        updateSetting('dockShowCreatePreset', DOCK_SETTINGS.showCreatePreset.default);
                                                        updateSetting('dockShowAutoCycleToggle', DOCK_SETTINGS.showAutoCycleToggle.default);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-ui-border-primary text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary transition-all"
                                                >
                                                    <MdRefresh className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Reset to Defaults</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Widgets View */}
                                    {activeView === 'widgets' && (
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
                                            </div>
                                        </div>
                                    )}

                                    {/* Regional View */}
                                    {activeView === 'regional' && (
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
                                    )}

                                    {/* Notifications View */}
                                    {activeView === 'notifications' && (
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
                                    )}

                                    {/* Privacy View */}
                                    {activeView === 'privacy' && (
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
                                                            Press <kbd className="px-2 py-1 bg-ui-bg-tertiary rounded border border-ui-border-primary text-ui-text-primary font-mono text-xs">\\</kbd> to toggle
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

                                                {/* Obfuscation Style Visual Picker */}
                                                <Subsection title="Obfuscation Style">
                                                    <p className="text-xs text-ui-text-tertiary mb-3">How sensitive data appears when hidden</p>
                                                    <div className="grid grid-cols-2 gap-3">
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
                                    )}

                                    {/* Presets View */}
                                    {activeView === 'presets' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-ui-text-primary">Preset Auto-Cycle</h3>
                                                <p className="text-sm text-ui-text-secondary mt-1">Automatically rotate through saved presets</p>
                                            </div>
                                            <div className="space-y-5">
                                                {/* Info Box */}
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

                                                <Subsection title="Preset Selection">
                                                    {availablePresets.length === 0 ? (
                                                        <div className="p-6 rounded-lg border-2 border-dashed border-ui-border-primary bg-ui-bg-secondary/30 text-center">
                                                            <MdGridOn className="w-12 h-12 text-ui-text-muted mx-auto mb-3 opacity-50" />
                                                            <p className="text-sm font-medium text-ui-text-primary mb-1">
                                                                No Saved Presets
                                                            </p>
                                                            <p className="text-xs text-ui-text-secondary">
                                                                Save some presets first using <kbd className="px-1.5 py-0.5 rounded bg-ui-bg-tertiary text-[10px]">⇧1-9</kbd> or the preset manager
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs text-ui-text-tertiary mb-3">
                                                                Select which presets to include in the rotation cycle
                                                            </p>
                                                            <div className="space-y-2">
                                                                {availablePresets.map(({ index, preset, name, widgetCount }: {
                                                                    index: number;
                                                                    preset: DashboardPreset | null;
                                                                    name: string;
                                                                    widgetCount: number;
                                                                }) => {
                                                                    const isSelected = settings.autoCyclePresets.includes(index);
                                                                    return (
                                                                        <button
                                                                            key={index}
                                                                            onClick={() => {
                                                                                const newPresets = isSelected
                                                                                    ? settings.autoCyclePresets.filter(i => i !== index)
                                                                                    : [...settings.autoCyclePresets, index].sort((a, b) => a - b);
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
                                                                                            {preset?.type === 'fullscreen' && (
                                                                                                <>
                                                                                                    <span className="text-ui-text-muted">•</span>
                                                                                                    <span className="text-ui-accent-secondary">Fullscreen</span>
                                                                                                </>
                                                                                            )}
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
                                                            {settings.autoCyclePresets.length === 0 && settings.autoCycleEnabled ? (
                                                                <div className="mt-3 p-3 rounded-lg border border-ui-danger-border bg-ui-danger-bg">
                                                                    <div className="flex items-start gap-2">
                                                                        <MdClose className="w-4 h-4 text-ui-danger-text mt-0.5 flex-shrink-0" />
                                                                        <p className="text-xs text-ui-danger-text">
                                                                            No presets selected. Select at least one preset to enable auto-cycling.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : settings.autoCyclePresets.length > 0 && settings.autoCycleEnabled ? (
                                                                <div className="mt-3 p-3 rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/5">
                                                                    <div className="flex items-start gap-2">
                                                                        <MdCheck className="w-4 h-4 text-ui-accent-primary mt-0.5 flex-shrink-0" />
                                                                        <p className="text-xs text-ui-text-secondary">
                                                                            Auto-cycling through {settings.autoCyclePresets.length} preset{settings.autoCyclePresets.length !== 1 ? 's' : ''} every {settings.autoCycleInterval} seconds
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Subsection>
                                            </div>
                                        </div>
                                    )}

                                    {/* Keyboard Shortcuts View */}
                                    {activeView === 'shortcuts' && (
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
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Helper Components
function DockItemToggle({
    icon,
    label,
    enabled,
    onChange,
    variant = 'default',
}: {
    icon: React.ReactNode;
    label: string;
    enabled: boolean;
    onChange: (val: boolean) => void;
    variant?: 'default' | 'privacy' | 'autocycle';
}) {
    // Match EXACT dock icon styling from dock.tsx
    const getClassName = () => {
        if (!enabled) {
            return 'bg-ui-bg-tertiary/50 border-ui-border-primary/50 text-ui-text-secondary/20 grayscale';
        }

        switch (variant) {
            case 'privacy':
                return 'bg-amber-500/20 border-amber-500/50 text-amber-400 ring-2 ring-amber-500/30';
            case 'autocycle':
                return 'bg-blue-500/20 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/30';
            default:
                return 'bg-ui-accent-primary-bg border-ui-accent-primary-border text-ui-accent-primary ring-2 ring-ui-accent-primary/30';
        }
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                onClick={() => onChange(!enabled)}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all shadow-lg hover:shadow-xl relative ${getClassName()}`}
            >
                {icon}
                {/* Checkmark when enabled */}
                {enabled && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-ui-accent-primary rounded-full flex items-center justify-center">
                        <MdCheck className="w-3 h-3 text-white" />
                    </div>
                )}
            </button>
            <span className={`text-[10px] font-medium text-center leading-tight ${enabled ? 'text-ui-text-primary' : 'text-ui-text-secondary/50'}`}>{label}</span>
        </div>
    );
}

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
        <div className={`flex items-center justify-between p-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0 mr-3">
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
        <div className="flex items-center justify-between p-3">
            <div className="flex-1 min-w-0 mr-3">
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
    step = 1,
    disabled = false,
    unit = '',
    decimals = 0,
}: {
    label: string;
    description: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    unit?: string;
    decimals?: number;
}) {
    const percentage = ((value - min) / (max - min)) * 100;
    const displayValue = decimals > 0 ? value.toFixed(decimals) : value;

    return (
        <div className={`p-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                    <div className="text-xs text-ui-text-secondary">{description}</div>
                </div>
                <span className="text-sm font-semibold text-ui-accent-primary ml-3 tabular-nums">
                    {displayValue}{unit}
                </span>
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center">
                    <div
                        className="h-2 bg-ui-accent-primary/30 rounded-l-lg"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => !disabled && onChange(Number(e.target.value))}
                    disabled={disabled}
                    className={`relative w-full h-2 bg-ui-bg-tertiary rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ui-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white`}
                />
            </div>
        </div>
    );
}

function ShortcutItem({ shortcut, description }: { shortcut: string; description: string }) {
    return (
        <div className="flex items-center justify-between p-3">
            <span className="text-sm text-ui-text-primary">{description}</span>
            <kbd className="px-2.5 py-1 bg-ui-bg-tertiary text-ui-text-primary rounded-md text-xs font-mono border border-ui-border-primary min-w-[2.5rem] text-center">
                {shortcut}
            </kbd>
        </div>
    );
}
