'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { User } from "@/lib/auth";
import { useTheme, THEMES, Theme } from "@/contexts/ThemeContext";
import { DashboardPreset } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { usePrivacy, ObfuscationStyle } from "@/contexts/PrivacyContext";
import { preferencesService } from "@/lib/preferences";
import { widgetSettingsService } from "@/lib/widgetSettings";
import { ConfirmModal } from "@/components/ui/modal";
import { useIsMobile } from "@/hooks/useMediaQuery";
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
import { isHolidaySeason } from "@/components/SnowOverlay";
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
    MdChevronLeft,
    MdDragIndicator,
    MdAutorenew,
    MdWidgets,
    MdBookmarks,
    MdSettings,
    MdDelete,
    MdWarning,
} from "react-icons/md";

interface SettingsMenuProps {
    user: User | null;
    onLogout: () => void;
    onClose: () => void;
    onAdminClick?: () => void;
    presets?: Array<DashboardPreset | null>;
    initialView?: SettingsView;
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

type SettingsView = 'account' | 'appearance' | 'layout' | 'dock' | 'widgets' | 'regional' | 'notifications' | 'privacy' | 'presets' | 'shortcuts' | 'advanced';

const NAVIGATION_ITEMS: { id: SettingsView; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: 'account', icon: MdPerson, label: 'Account' },
    { id: 'appearance', icon: MdPalette, label: 'Appearance' },
    { id: 'layout', icon: MdGridOn, label: 'Layout & Grid', badge: 'Beta' },
    { id: 'dock', icon: MdDock, label: 'Dock' },
    { id: 'widgets', icon: MdTune, label: 'Widgets' },
    { id: 'regional', icon: MdSchedule, label: 'Regional' },
    { id: 'notifications', icon: MdNotifications, label: 'Notifications' },
    { id: 'privacy', icon: MdVisibilityOff, label: 'Privacy', badge: 'Beta' },
    { id: 'presets', icon: MdRefresh, label: 'Preset Cycle', badge: 'Beta' },
    { id: 'shortcuts', icon: MdKeyboard, label: 'Shortcuts' },
    { id: 'advanced', icon: MdStorage, label: 'Advanced' },
];

// Get badge colors based on badge type
const getBadgeColors = (badge: string): React.CSSProperties => {
    const badgeLower = badge.toLowerCase();

    if (badgeLower === 'beta') {
        return { backgroundColor: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderColor: 'var(--badge-warning-border)' };
    }
    if (badgeLower === 'new') {
        return { backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderColor: 'var(--badge-success-border)' };
    }
    // Default to primary
    return { backgroundColor: 'var(--badge-primary-bg)', color: 'var(--badge-primary-text)', borderColor: 'var(--badge-primary-border)' };
};

export default function SettingsMenu({ user, onLogout, onClose, onAdminClick, presets = [], initialView = 'account' }: SettingsMenuProps) {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting, isLoaded } = useSettings();
    const { settings: privacySettings, updateSetting: updatePrivacySetting, toggle: togglePrivacy } = usePrivacy();
    const [activeView, setActiveView] = useState<SettingsView>(initialView);
    const [themeCategory, setThemeCategory] = useState<'dark' | 'light'>(
        THEMES.find(t => t.id === theme)?.category as 'dark' | 'light' || 'dark'
    );
    const contentRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Local state for grid settings
    const [localGridColumns, setLocalGridColumns] = useState(settings.gridColumns);
    const [localGridCellHeight, setLocalGridCellHeight] = useState(settings.gridCellHeight);

    // State for Advanced section modals
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'warning' | 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'warning' });
    const [nuclearInput, setNuclearInput] = useState('');
    const [showNuclearModal, setShowNuclearModal] = useState(false);

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

    // Handle back navigation on mobile
    const handleMobileBack = () => {
        setActiveView('account'); // Go back to main menu
    };

    if (!isLoaded) {
        return null;
    }

    // Mobile: Full-screen slide-up sheet
    if (isMobile) {
        return (
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-0 z-50 bg-ui-bg-primary flex flex-col"
                style={{ willChange: 'transform' }}
            >
                {/* Mobile Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border-primary bg-ui-bg-secondary/50 safe-top">
                    {activeView !== 'account' ? (
                        <button
                            onClick={handleMobileBack}
                            className="flex items-center gap-1 text-ui-accent-primary"
                        >
                            <MdChevronLeft className="w-6 h-6" />
                            <span className="text-sm font-medium">Settings</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <MdSettings className="w-5 h-5 text-ui-accent-primary" />
                            <h2 className="text-lg font-semibold text-ui-text-primary">Settings</h2>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-ui-bg-tertiary transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5 text-ui-text-secondary" />
                    </button>
                </div>

                {/* Mobile Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto">
                    {activeView === 'account' ? (
                        <MobileMainMenu
                            key="main"
                            user={user}
                            onNavigate={setActiveView}
                            onLogout={onLogout}
                            onAdminClick={onAdminClick}
                            privacyEnabled={privacySettings.enabled}
                        />
                    ) : (
                        <div className="p-4 pb-8">
                            <SettingsContent
                                activeView={activeView}
                                user={user}
                                onLogout={onLogout}
                                onAdminClick={onAdminClick}
                                theme={theme}
                                setTheme={setTheme}
                                themeCategory={themeCategory}
                                setThemeCategory={setThemeCategory}
                                settings={settings}
                                updateSetting={updateSetting}
                                privacySettings={privacySettings}
                                updatePrivacySetting={updatePrivacySetting}
                                togglePrivacy={togglePrivacy}
                                localGridColumns={localGridColumns}
                                setLocalGridColumns={setLocalGridColumns}
                                localGridCellHeight={localGridCellHeight}
                                setLocalGridCellHeight={setLocalGridCellHeight}
                                availablePresets={availablePresets}
                                presets={presets}
                                confirmModal={confirmModal}
                                setConfirmModal={setConfirmModal}
                                nuclearInput={nuclearInput}
                                setNuclearInput={setNuclearInput}
                                showNuclearModal={showNuclearModal}
                                setShowNuclearModal={setShowNuclearModal}
                                isMobile={true}
                            />
                        </div>
                    )}
                </div>

                {/* Confirmation Modal */}
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    confirmText="Confirm"
                    cancelText="Cancel"
                />

                {/* Nuclear Modal */}
                <NuclearModal
                    isOpen={showNuclearModal}
                    onClose={() => {
                        setShowNuclearModal(false);
                        setNuclearInput('');
                    }}
                    nuclearInput={nuclearInput}
                    setNuclearInput={setNuclearInput}
                />
            </motion.div>
        );
    }

    // Desktop: Modal dialog with sidebar
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
                                                <span
                                                    className="inline-flex items-center px-1 py-0 rounded text-[9px] font-medium border"
                                                    style={isActive
                                                        ? { backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.2)' }
                                                        : getBadgeColors(item.badge)
                                                    }
                                                >
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
                                                        <ToggleSetting
                                                            label="Empty Dashboard Hint"
                                                            description="Show dock tutorial when dashboard is empty"
                                                            enabled={settings.dockShowEmptyDockHint}
                                                            onChange={(val) => updateSetting('dockShowEmptyDockHint', val)}
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

                                    {/* Advanced View */}
                                    {activeView === 'advanced' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-ui-text-primary">Advanced</h3>
                                                <p className="text-sm text-ui-text-secondary mt-1">Data management and preferences</p>
                                            </div>
                                            <div className="space-y-5">
                                                {/* Warning Banner */}
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

                                                <Subsection title="Dashboard & Layout">
                                                    <div className="space-y-3">
                                                        {/* Clear Widget Layouts */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdGridOn className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Widget Layouts</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Clears all widget positions and sizes. Does not remove widgets.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">dashboard.layout</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Clear Widget Layouts',
                                                                            message: 'Clear all widget layout data? Widgets will reset to default positions.',
                                                                            type: 'danger',
                                                                            onConfirm: async () => {
                                                                                await preferencesService.delete('dashboard.layout');
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Clear
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Clear All Presets */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdBookmarks className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">All Presets</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Deletes all saved presets and their configurations.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">dashboard.presets</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Delete All Presets',
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
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Clear
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Clear Grid Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdGridOn className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Grid Settings</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets columns and cell height to defaults.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">grid.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Grid Settings',
                                                                            message: 'Reset grid settings to defaults?',
                                                                            type: 'warning',
                                                                            onConfirm: async () => {
                                                                                await preferencesService.delete('grid.columns');
                                                                                await preferencesService.delete('grid.cellHeight');
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Widget Settings">
                                                    <div className="space-y-3">
                                                        {/* Clear All Widget Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdTune className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">All Widget Configurations</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets ALL widget-specific settings (colors, thresholds, filters, etc).
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">widgetSettings.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Widget Settings',
                                                                            message: 'Reset ALL widget settings to defaults? This affects all widgets.',
                                                                            type: 'danger',
                                                                            onConfirm: async () => {
                                                                                const allPrefs = preferencesService.getAll();
                                                                                const widgetSettingsKeys = Object.keys(allPrefs).filter(key => key.startsWith('widgetSettings.'));
                                                                                for (const key of widgetSettingsKeys) {
                                                                                    await preferencesService.delete(key);
                                                                                }
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Appearance & Interface">
                                                    <div className="space-y-3">
                                                        {/* Clear Theme */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdPalette className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Theme</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Reset theme to default (Slate).
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">theme</code>
                                                                    </p>
                                                                </div>
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
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Clear Dock Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdDock className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Dock Settings</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets dock appearance, behavior, and visible items.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">dock.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Dock Settings',
                                                                            message: 'Reset all dock settings to defaults?',
                                                                            type: 'warning',
                                                                            onConfirm: async () => {
                                                                                const allPrefs = preferencesService.getAll();
                                                                                const dockKeys = Object.keys(allPrefs).filter(key => key.startsWith('dock.'));
                                                                                for (const key of dockKeys) {
                                                                                    await preferencesService.delete(key);
                                                                                }
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Clear Privacy Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdVisibilityOff className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Privacy Mode Settings</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets privacy mode preferences and obfuscation settings.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">privacy.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Privacy Settings',
                                                                            message: 'Reset privacy mode preferences and obfuscation settings?',
                                                                            type: 'warning',
                                                                            onConfirm: async () => {
                                                                                const allPrefs = preferencesService.getAll();
                                                                                const privacyKeys = Object.keys(allPrefs).filter(key => key.startsWith('privacy.'));
                                                                                for (const key of privacyKeys) {
                                                                                    await preferencesService.delete(key);
                                                                                }
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Subsection>

                                                <Subsection title="Regional & Notifications">
                                                    <div className="space-y-3">
                                                        {/* Clear Regional Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdSchedule className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Regional Settings</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets timezone, date/time formats, currency, and number formats.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">regional.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Regional Settings',
                                                                            message: 'Reset timezone, date/time formats, currency, and number formats?',
                                                                            type: 'warning',
                                                                            onConfirm: async () => {
                                                                                const allPrefs = preferencesService.getAll();
                                                                                const regionalKeys = Object.keys(allPrefs).filter(key =>
                                                                                    key.startsWith('timezone') ||
                                                                                    key.startsWith('dateFormat') ||
                                                                                    key.startsWith('timeFormat') ||
                                                                                    key.startsWith('numberFormat') ||
                                                                                    key.startsWith('currencySymbol')
                                                                                );
                                                                                for (const key of regionalKeys) {
                                                                                    await preferencesService.delete(key);
                                                                                }
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Clear Notification Settings */}
                                                        <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <MdNotifications className="w-4 h-4 text-ui-text-secondary" />
                                                                        <h4 className="text-sm font-semibold text-ui-text-primary">Notification Settings</h4>
                                                                    </div>
                                                                    <p className="text-xs text-ui-text-secondary">
                                                                        Resets sound, toast, and notification preferences.
                                                                    </p>
                                                                    <p className="text-xs text-ui-text-tertiary mt-1">
                                                                        Stored in: <code className="px-1 py-0.5 bg-ui-bg-tertiary rounded text-[10px]">notification.*</code>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: 'Reset Notification Settings',
                                                                            message: 'Reset sound, toast, and notification preferences?',
                                                                            type: 'warning',
                                                                            onConfirm: async () => {
                                                                                const allPrefs = preferencesService.getAll();
                                                                                const notificationKeys = Object.keys(allPrefs).filter(key =>
                                                                                    key.startsWith('soundEnabled') ||
                                                                                    key.startsWith('toastPosition') ||
                                                                                    key.startsWith('toastDuration')
                                                                                );
                                                                                for (const key of notificationKeys) {
                                                                                    await preferencesService.delete(key);
                                                                                }
                                                                                window.location.reload();
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-ui-danger-bg hover:opacity-90 border border-ui-danger-border text-ui-danger-text rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                                                                >
                                                                    <MdDelete className="w-3.5 h-3.5" />
                                                                    Reset
                                                                </button>
                                                            </div>
                                                        </div>
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
                                                                    This includes layouts, presets, themes, widget settings, and all configurations.
                                                                </p>
                                                                <p className="text-xs font-semibold text-red-500">
                                                                    ⚠️ This action is PERMANENT and cannot be undone!
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => setShowNuclearModal(true)}
                                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shadow-lg"
                                                            >
                                                                <MdDelete className="w-4 h-4" />
                                                                Wipe All
                                                            </button>
                                                        </div>
                                                    </div>
                                                </Subsection>

                                                {/* Debug Info */}
                                                <Subsection title="Debug Information">
                                                    <div className="rounded-lg border border-ui-border-primary bg-ui-bg-secondary/30 p-4">
                                                        <div className="space-y-2 text-xs font-mono">
                                                            <div className="flex justify-between">
                                                                <span className="text-ui-text-secondary">Version:</span>
                                                                <span className="text-ui-text-primary">v{preferencesService.getVersion()}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-ui-text-secondary">User ID:</span>
                                                                <span className="text-ui-text-primary">{preferencesService.getCurrentUserId()}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-ui-text-secondary">Preferences:</span>
                                                                <span className="text-ui-text-primary">{Object.keys(preferencesService.getAll()).length} keys</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-ui-text-secondary">Pending:</span>
                                                                <span className="text-ui-text-primary">{preferencesService.hasPendingChanges() ? 'Yes' : 'No'}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                console.log('=== Preferences Debug ===');
                                                                console.log(preferencesService.getDebugInfo());
                                                                console.log('All preferences:', preferencesService.getAll());
                                                            }}
                                                            className="mt-3 w-full px-3 py-1.5 bg-ui-bg-tertiary hover:bg-ui-bg-quaternary text-ui-text-primary rounded-lg text-xs font-medium transition-all"
                                                        >
                                                            Log to Console (F12)
                                                        </button>
                                                    </div>
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

                {/* Confirmation Modal for Advanced Settings */}
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    confirmText="Confirm"
                    cancelText="Cancel"
                />

                {/* Nuclear Option Modal with Text Input */}
                <AnimatePresence>
                    {showNuclearModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => {
                                    setShowNuclearModal(false);
                                    setNuclearInput('');
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative bg-ui-bg-secondary rounded-lg shadow-xl border-2 border-red-500/50 w-full max-w-md overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="text-red-500">
                                            <MdWarning size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-ui-text-primary">Clear All Preferences</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-ui-text-secondary text-sm leading-relaxed">
                                            This will permanently delete <strong>ALL</strong> your preferences and cannot be undone!
                                            This includes layouts, presets, themes, widget settings, and all configurations.
                                        </p>
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                            <p className="text-xs font-semibold text-red-400">
                                                ⚠️ This action is PERMANENT and syncs across all sessions!
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-ui-text-primary mb-2">
                                                Type <code className="px-2 py-1 bg-ui-bg-tertiary rounded text-red-400 font-mono text-xs">DELETE ALL PREFERENCES</code> to confirm:
                                            </label>
                                            <input
                                                type="text"
                                                value={nuclearInput}
                                                onChange={(e) => setNuclearInput(e.target.value)}
                                                placeholder="DELETE ALL PREFERENCES"
                                                className="w-full px-3 py-2 bg-ui-bg-tertiary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-ui-bg-tertiary px-6 py-4 flex gap-3 justify-end border-t border-ui-border-primary">
                                    <button
                                        onClick={() => {
                                            setShowNuclearModal(false);
                                            setNuclearInput('');
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (nuclearInput === 'DELETE ALL PREFERENCES') {
                                                await preferencesService.clearAll();
                                                window.location.reload();
                                            }
                                        }}
                                        disabled={nuclearInput !== 'DELETE ALL PREFERENCES'}
                                        className={`px-5 py-2 text-sm font-bold rounded-md transition-colors shadow-lg ${nuclearInput === 'DELETE ALL PREFERENCES'
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-ui-bg-quaternary text-ui-text-muted cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MdDelete className="w-4 h-4" />
                                            Wipe Everything
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
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

// ============================================
// MOBILE-SPECIFIC COMPONENTS
// ============================================

// Mobile Main Menu - Shows list of settings categories
function MobileMainMenu({
    user,
    onNavigate,
    onLogout,
    onAdminClick,
    privacyEnabled,
}: {
    user: User | null;
    onNavigate: (view: SettingsView) => void;
    onLogout: () => void;
    onAdminClick?: () => void;
    privacyEnabled: boolean;
}) {
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

// Nuclear Modal Component
function NuclearModal({
    isOpen,
    onClose,
    nuclearInput,
    setNuclearInput,
}: {
    isOpen: boolean;
    onClose: () => void;
    nuclearInput: string;
    setNuclearInput: (val: string) => void;
}) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-ui-bg-secondary rounded-lg shadow-xl border-2 border-red-500/50 w-full max-w-md overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="text-red-500">
                                <MdWarning size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-ui-text-primary">Clear All Preferences</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-ui-text-secondary text-sm leading-relaxed">
                                This will permanently delete <strong>ALL</strong> your preferences and cannot be undone!
                                This includes layouts, presets, themes, widget settings, and all configurations.
                            </p>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-xs font-semibold text-red-400">
                                    ⚠️ This action is PERMANENT and syncs across all sessions!
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-ui-text-primary mb-2">
                                    Type <code className="px-2 py-1 bg-ui-bg-tertiary rounded text-red-400 font-mono text-xs">DELETE ALL PREFERENCES</code> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={nuclearInput}
                                    onChange={(e) => setNuclearInput(e.target.value)}
                                    placeholder="DELETE ALL PREFERENCES"
                                    className="w-full px-3 py-2 bg-ui-bg-tertiary border border-ui-border-primary rounded-lg text-ui-text-primary placeholder-ui-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-ui-bg-tertiary px-6 py-4 flex gap-3 justify-end border-t border-ui-border-primary">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (nuclearInput === 'DELETE ALL PREFERENCES') {
                                    await preferencesService.clearAll();
                                    window.location.reload();
                                }
                            }}
                            disabled={nuclearInput !== 'DELETE ALL PREFERENCES'}
                            className={`px-5 py-2 text-sm font-bold rounded-md transition-colors shadow-lg ${nuclearInput === 'DELETE ALL PREFERENCES'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-ui-bg-quaternary text-ui-text-muted cursor-not-allowed'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <MdDelete className="w-4 h-4" />
                                Wipe Everything
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Shared Settings Content Component - renders the actual settings views
interface SettingsContentProps {
    activeView: SettingsView;
    user: User | null;
    onLogout: () => void;
    onAdminClick?: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    themeCategory: 'dark' | 'light';
    setThemeCategory: (cat: 'dark' | 'light') => void;
    settings: ReturnType<typeof useSettings>['settings'];
    updateSetting: ReturnType<typeof useSettings>['updateSetting'];
    privacySettings: ReturnType<typeof usePrivacy>['settings'];
    updatePrivacySetting: ReturnType<typeof usePrivacy>['updateSetting'];
    togglePrivacy: () => void;
    localGridColumns: number;
    setLocalGridColumns: (val: number) => void;
    localGridCellHeight: number;
    setLocalGridCellHeight: (val: number) => void;
    availablePresets: Array<{ index: number; preset: DashboardPreset | null; name: string; widgetCount: number }>;
    presets: Array<DashboardPreset | null>;
    confirmModal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'warning' | 'danger' | 'info' };
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'warning' | 'danger' | 'info' }) => void;
    nuclearInput: string;
    setNuclearInput: (val: string) => void;
    showNuclearModal: boolean;
    setShowNuclearModal: (val: boolean) => void;
    isMobile?: boolean;
}

function SettingsContent({
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
    // Account View
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

    // Appearance View
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

    // Regional View
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

    // Notifications View
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

    // Privacy View
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

    // Widgets View
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

    // Shortcuts View
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

    // For other views (layout, dock, presets, advanced) on mobile, show a simplified message
    // These are desktop-focused features
    if (activeView === 'layout' || activeView === 'dock') {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-ui-text-primary">
                        {activeView === 'layout' ? 'Layout & Grid' : 'Dock'}
                    </h3>
                    <p className="text-sm text-ui-text-secondary mt-1">
                        {activeView === 'layout' ? 'Dashboard organization and grid configuration' : 'Quick access toolbar settings'}
                    </p>
                </div>
                {isMobile ? (
                    <div className="text-center py-8 px-4">
                        <div className="w-16 h-16 rounded-full bg-ui-bg-secondary mx-auto mb-4 flex items-center justify-center">
                            {activeView === 'layout' ? <MdGridOn className="w-8 h-8 text-ui-text-tertiary" /> : <MdDock className="w-8 h-8 text-ui-text-tertiary" />}
                        </div>
                        <p className="text-ui-text-secondary text-sm">
                            {activeView === 'layout'
                                ? 'Grid and layout settings are available on desktop to customize your dashboard layout.'
                                : 'Dock settings are available on desktop where the dock is displayed.'}
                        </p>
                    </div>
                ) : (
                    <div className="text-sm text-ui-text-secondary">
                        {/* Desktop content would go here - handled by the main component */}
                    </div>
                )}
            </div>
        );
    }

    // Presets View
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

    // Advanced View
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
