"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MdWidgets,
    MdSettings,
    MdBookmarks,
    MdVisibilityOff,
    MdVisibility,
    MdAdd,
    MdAutorenew,
} from "react-icons/md";
import { DashboardPreset } from "@/types";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSettings } from "@/hooks/useSettings";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

interface DashboardTaskbarProps {
    presets: Array<DashboardPreset | null>;
    activePresetIndex: number | null;
    onWidgetsClick: () => void;
    onPresetManagerClick: () => void;
    onPresetClick: (index: number) => void;
    onPresetSave: (index: number) => void;
    onSettingsClick: (view?: 'widgets' | 'presets' | 'privacy' | 'dock' | 'navigation') => void;
    onVisibilityChange?: (visible: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

export const TASKBAR_HEIGHTS = {
    small: 40,
    medium: 48,
    large: 56,
} as const;

const ICON_SIZES = {
    small: 18,
    medium: 22,
    large: 26,
} as const;

const BUTTON_SIZES = {
    small: { height: 32, iconBtn: 32, padding: 'px-2.5' },
    medium: { height: 36, iconBtn: 38, padding: 'px-3' },
    large: { height: 40, iconBtn: 44, padding: 'px-4' },
} as const;

const FONT_SIZES = {
    small: { label: 'text-xs', clock: 'text-sm', date: 'text-[10px]' },
    medium: { label: 'text-sm', clock: 'text-sm', date: 'text-xs' },
    large: { label: 'text-sm', clock: 'text-base', date: 'text-xs' },
} as const;

// =============================================================================
// TaskbarIcon - Clean, minimal icon button
// =============================================================================

interface TaskbarIconProps {
    tooltip: string;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    isActive?: boolean;
    activeColor?: string;
    children: React.ReactNode;
    tooltipSide?: 'top' | 'bottom';
    size?: 'small' | 'medium' | 'large';
}

function TaskbarIcon({
    tooltip,
    onClick,
    onContextMenu,
    isActive = false,
    activeColor,
    children,
    tooltipSide = 'top',
    size = 'medium',
}: TaskbarIconProps) {
    const btnSize = BUTTON_SIZES[size].iconBtn;
    
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    style={{ width: btnSize, height: btnSize }}
                    className={`
                        relative flex items-center justify-center rounded-md
                        transition-all duration-100 ease-out
                        ${isActive
                            ? `bg-ui-bg-tertiary ${activeColor || 'text-ui-text-primary'}`
                            : 'text-ui-text-secondary hover:bg-ui-bg-tertiary hover:text-ui-text-primary'
                        }
                    `}
                >
                    {children}
                    {isActive && (
                        <div 
                            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeColor ? 'bg-current' : 'bg-ui-accent-primary'}`}
                        />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs font-medium">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}

// =============================================================================
// TaskbarDivider - Subtle vertical separator
// =============================================================================

function TaskbarDivider({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
    const heights = { small: 'h-5', medium: 'h-6', large: 'h-7' };
    return <div className={`w-px ${heights[size]} bg-ui-border-primary mx-2`} />;
}

// =============================================================================
// TaskbarClock - Clean system tray clock
// =============================================================================

function TaskbarClock({
    showDate,
    tooltipSide = 'top',
    size = 'medium',
}: {
    showDate: boolean;
    tooltipSide?: 'top' | 'bottom';
    size?: 'small' | 'medium' | 'large';
}) {
    const [time, setTime] = useState<Date>(new Date());
    const { settings } = useSettings();
    const fonts = FONT_SIZES[size];

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = useCallback((date: Date): string => {
        return date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            ...(settings.showSeconds ? { second: '2-digit' } : {}),
            hour12: settings.clockFormat === '12h',
        });
    }, [settings.showSeconds, settings.clockFormat]);

    const formatDate = useCallback((date: Date): string => {
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    }, []);

    const fullDateTime = `${formatDate(time)}\n${formatTime(time)}`;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button 
                    className="flex flex-col items-center justify-center px-3 h-full text-ui-text-primary hover:bg-ui-bg-tertiary transition-colors rounded-md min-w-[70px]"
                    onClick={() => {/* Could open calendar */}}
                >
                    <span className={`${fonts.clock} font-medium tabular-nums leading-tight`}>
                        {formatTime(time)}
                    </span>
                    {showDate && (
                        <span className={`${fonts.date} text-ui-text-secondary leading-tight`}>
                            {formatDate(time)}
                        </span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs whitespace-pre text-center">
                {fullDateTime}
            </TooltipContent>
        </Tooltip>
    );
}

// =============================================================================
// PresetButton - Individual preset slot
// =============================================================================

interface PresetButtonProps {
    index: number;
    preset: DashboardPreset;
    isActive: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    tooltipSide?: 'top' | 'bottom';
    size?: 'small' | 'medium' | 'large';
}

function PresetButton({
    index,
    preset,
    isActive,
    onClick,
    onContextMenu,
    tooltipSide = 'top',
    size = 'medium',
}: PresetButtonProps) {
    const presetName = preset?.name || `Preset ${index + 1}`;
    const widgetCount = preset?.layout.filter(w => w.enabled).length || 0;
    const btnHeight = BUTTON_SIZES[size].height;
    const fonts = FONT_SIZES[size];
    
    // Intelligent label: show truncated name, or number if name is generic
    const isGenericName = presetName.toLowerCase().startsWith('preset');
    const maxLabelLength = size === 'large' ? 12 : size === 'medium' ? 10 : 8;
    const displayLabel = isGenericName 
        ? `${index + 1}` 
        : presetName.length > maxLabelLength 
            ? presetName.slice(0, maxLabelLength - 1) + '…' 
            : presetName;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    style={{ height: btnHeight }}
                    className={`
                        relative flex items-center gap-1.5 px-3 rounded-md font-medium
                        transition-all duration-100 ease-out
                        ${fonts.label}
                        ${isActive
                            ? 'bg-ui-accent-primary text-white shadow-md shadow-ui-accent-primary/30'
                            : 'bg-ui-bg-tertiary text-ui-text-secondary hover:bg-ui-bg-quaternary hover:text-ui-text-primary'
                        }
                    `}
                >
                    <span className="font-bold opacity-60">{index + 1}</span>
                    {!isGenericName && (
                        <span className="font-medium">{displayLabel}</span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs">
                <div className="font-semibold">{presetName}</div>
                <div className="text-ui-text-secondary">{widgetCount} widget{widgetCount !== 1 ? 's' : ''} • Right-click to save</div>
            </TooltipContent>
        </Tooltip>
    );
}

// =============================================================================
// SystemTray - Right side system icons group
// =============================================================================

interface SystemTrayProps {
    isPrivate: boolean;
    onPrivacyToggle: () => void;
    autoCycleEnabled: boolean;
    onAutoCycleToggle: () => void;
    onSettingsClick: () => void;
    onSettingsContext: (view: string) => void;
    showPrivacy: boolean;
    showAutoCycle: boolean;
    showSettings: boolean;
    showClock: boolean;
    showDate: boolean;
    tooltipSide: 'top' | 'bottom';
    iconSize: number;
    size: 'small' | 'medium' | 'large';
}

function SystemTray({
    isPrivate,
    onPrivacyToggle,
    autoCycleEnabled,
    onAutoCycleToggle,
    onSettingsClick,
    onSettingsContext,
    showPrivacy,
    showAutoCycle,
    showSettings,
    showClock,
    showDate,
    tooltipSide,
    iconSize,
    size,
}: SystemTrayProps) {
    return (
        <div className="flex items-center h-full">
            {/* Status Icons */}
            <div className="flex items-center gap-0.5 px-1">
                {showAutoCycle && (
                    <TaskbarIcon
                        tooltip={autoCycleEnabled ? "Auto-Cycle: On" : "Auto-Cycle: Off"}
                        onClick={onAutoCycleToggle}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onSettingsContext('presets');
                        }}
                        isActive={autoCycleEnabled}
                        activeColor="text-blue-400"
                        tooltipSide={tooltipSide}
                        size={size}
                    >
                        <MdAutorenew 
                            style={{ width: iconSize, height: iconSize }}
                            className={autoCycleEnabled ? 'animate-spin' : ''}
                        />
                    </TaskbarIcon>
                )}

                {showPrivacy && (
                    <TaskbarIcon
                        tooltip={isPrivate ? "Privacy: On (\\)" : "Privacy: Off (\\)"}
                        onClick={onPrivacyToggle}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onSettingsContext('privacy');
                        }}
                        isActive={isPrivate}
                        activeColor="text-amber-400"
                        tooltipSide={tooltipSide}
                        size={size}
                    >
                        {isPrivate ? (
                            <MdVisibilityOff style={{ width: iconSize, height: iconSize }} />
                        ) : (
                            <MdVisibility style={{ width: iconSize, height: iconSize }} />
                        )}
                    </TaskbarIcon>
                )}
            </div>

            {/* Clock & Date */}
            {showClock && (
                <>
                    <TaskbarDivider size={size} />
                    <TaskbarClock showDate={showDate} tooltipSide={tooltipSide} size={size} />
                </>
            )}

            {/* Settings */}
            {showSettings && (
                <>
                    <TaskbarDivider size={size} />
                    <TaskbarIcon
                        tooltip="Settings (S)"
                        onClick={onSettingsClick}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onSettingsContext('navigation');
                        }}
                        tooltipSide={tooltipSide}
                        size={size}
                    >
                        <MdSettings style={{ width: iconSize, height: iconSize }} />
                    </TaskbarIcon>
                </>
            )}
        </div>
    );
}

// =============================================================================
// DashboardTaskbar - Main Component
// =============================================================================

export default function DashboardTaskbar({
    presets,
    activePresetIndex,
    onWidgetsClick,
    onPresetManagerClick,
    onPresetClick,
    onPresetSave,
    onSettingsClick,
    onVisibilityChange,
}: DashboardTaskbarProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const { isPrivate, toggle: togglePrivacy } = usePrivacy();
    const { settings } = useSettings();
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        taskbarPosition,
        taskbarSize,
        taskbarAutoHide,
        taskbarOpacity,
        taskbarShowClock,
        taskbarShowDate,
        dockShowWidgetsToggle,
        dockShowPresetManager,
        dockShowPrivacyToggle,
        dockShowSettingsToggle,
        dockShowCreatePreset,
        dockShowAutoCycleToggle,
    } = settings;

    const taskbarHeight = TASKBAR_HEIGHTS[taskbarSize];
    const iconSize = ICON_SIZES[taskbarSize];
    const tooltipSide = taskbarPosition === 'top' ? 'bottom' : 'top';

    // Get initialized presets
    const { initializedPresets, firstAvailableSlot } = useMemo(() => {
        const initialized: Array<{ index: number; preset: DashboardPreset }> = [];
        let firstAvailable = -1;

        presets.forEach((preset, index) => {
            const hasWidgets = preset !== null && preset.layout.filter(w => w.enabled).length > 0;
            if (hasWidgets) {
                initialized.push({ index, preset: preset! });
            } else if (firstAvailable === -1) {
                firstAvailable = index;
            }
        });

        return { initializedPresets: initialized, firstAvailableSlot: firstAvailable };
    }, [presets]);

    // Auto-hide behavior
    useEffect(() => {
        if (!taskbarAutoHide) {
            setIsVisible(true);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const windowHeight = window.innerHeight;
            const triggerZone = 8;

            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            const isAtEdge = taskbarPosition === 'top' 
                ? e.clientY < triggerZone 
                : e.clientY > windowHeight - triggerZone;

            if (isAtEdge) {
                setIsVisible(true);
            } else if (!isHovering) {
                hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 400);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [taskbarAutoHide, taskbarPosition, isHovering]);

    useEffect(() => {
        onVisibilityChange?.(isVisible);
    }, [isVisible, onVisibilityChange]);

    const handleCreatePreset = useCallback(() => {
        if (firstAvailableSlot !== -1) {
            onPresetSave(firstAvailableSlot);
        }
    }, [firstAvailableSlot, onPresetSave]);

    const handleAutoCycleToggle = useCallback(() => {
        const { preferencesService } = require('@/lib/preferences');
        preferencesService.set('presets.autoCycle.enabled', !settings.autoCycleEnabled);
    }, [settings.autoCycleEnabled]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: taskbarPosition === 'top' ? -taskbarHeight : taskbarHeight, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: taskbarPosition === 'top' ? -taskbarHeight : taskbarHeight, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    className={`
                        fixed left-0 right-0 z-50
                        ${taskbarPosition === 'top' ? 'top-0' : 'bottom-0'}
                    `}
                    style={{ 
                        height: taskbarHeight,
                    }}
                >
                    <div
                        className={`
                            w-full h-full flex items-center justify-between px-2
                            bg-ui-bg-primary backdrop-blur-2xl
                            ${taskbarPosition === 'top' 
                                ? 'border-b-2 border-ui-border-primary shadow-lg shadow-black/20' 
                                : 'border-t-2 border-ui-border-primary shadow-[0_-4px_20px_rgba(0,0,0,0.15)]'
                            }
                        `}
                        style={{ opacity: taskbarOpacity / 100 }}
                    >
                        <TooltipProvider delayDuration={300}>
                            {/* Left Section - App launchers */}
                            <div className="flex items-center h-full gap-1">
                                {/* Widgets */}
                                {dockShowWidgetsToggle && (
                                    <TaskbarIcon
                                        tooltip="Widgets (F)"
                                        onClick={onWidgetsClick}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            onSettingsClick('widgets');
                                        }}
                                        tooltipSide={tooltipSide}
                                        size={taskbarSize}
                                    >
                                        <MdWidgets style={{ width: iconSize, height: iconSize }} />
                                    </TaskbarIcon>
                                )}

                                {/* Preset Manager */}
                                {dockShowPresetManager && (
                                    <TaskbarIcon
                                        tooltip="Presets (P)"
                                        onClick={onPresetManagerClick}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            onSettingsClick('presets');
                                        }}
                                        tooltipSide={tooltipSide}
                                        size={taskbarSize}
                                    >
                                        <MdBookmarks style={{ width: iconSize, height: iconSize }} />
                                    </TaskbarIcon>
                                )}

                                {(dockShowWidgetsToggle || dockShowPresetManager) && initializedPresets.length > 0 && (
                                    <TaskbarDivider size={taskbarSize} />
                                )}

                                {/* Preset Slots */}
                                <div className="flex items-center gap-1.5 px-1">
                                    {initializedPresets.map(({ index, preset }) => (
                                        <PresetButton
                                            key={index}
                                            index={index}
                                            preset={preset}
                                            isActive={activePresetIndex === index}
                                            onClick={() => onPresetClick(index)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                onPresetSave(index);
                                            }}
                                            tooltipSide={tooltipSide}
                                            size={taskbarSize}
                                        />
                                    ))}

                                    {/* Add Preset */}
                                    {dockShowCreatePreset && firstAvailableSlot !== -1 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={handleCreatePreset}
                                                    style={{ height: BUTTON_SIZES[taskbarSize].height, width: BUTTON_SIZES[taskbarSize].height }}
                                                    className="flex items-center justify-center rounded-md border-2 border-dashed border-ui-border-secondary text-ui-text-muted hover:text-ui-text-secondary hover:border-ui-accent-primary hover:bg-ui-bg-tertiary transition-all"
                                                >
                                                    <MdAdd style={{ width: iconSize * 0.7, height: iconSize * 0.7 }} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side={tooltipSide} className="text-xs font-medium">
                                                New Preset
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>

                            {/* Right Section - System Tray */}
                            <SystemTray
                                isPrivate={isPrivate}
                                onPrivacyToggle={togglePrivacy}
                                autoCycleEnabled={settings.autoCycleEnabled}
                                onAutoCycleToggle={handleAutoCycleToggle}
                                onSettingsClick={() => onSettingsClick()}
                                onSettingsContext={(view) => onSettingsClick(view as any)}
                                showPrivacy={dockShowPrivacyToggle}
                                showAutoCycle={dockShowAutoCycleToggle}
                                showSettings={dockShowSettingsToggle}
                                showClock={taskbarShowClock}
                                showDate={taskbarShowDate}
                                tooltipSide={tooltipSide}
                                iconSize={iconSize}
                                size={taskbarSize}
                            />
                        </TooltipProvider>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
