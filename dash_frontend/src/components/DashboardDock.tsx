"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dock, DockIcon, DockDivider } from "@/components/ui/dock";
import { MdWidgets, MdSettings, MdBookmarks, MdVisibilityOff, MdVisibility, MdAdd, MdAutorenew } from "react-icons/md";
import { DashboardPreset } from "@/types";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSettings } from "@/hooks/useSettings";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DockIconWithTooltipProps {
    tooltip: string;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
    children: React.ReactNode;
    mouseX?: any;
    magnification?: boolean;
    iconSize?: number;
    magnificationScale?: number;
}

// Wrapper that handles tooltip without breaking mouseX prop passing
const DockIconWithTooltip = ({ tooltip, ...props }: DockIconWithTooltipProps) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div>
                    <DockIcon {...props} />
                </div>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};

interface DashboardDockProps {
    presets: Array<DashboardPreset | null>;
    activePresetIndex: number | null;
    onWidgetsClick: () => void;
    onPresetManagerClick: () => void;
    onPresetClick: (index: number) => void;
    onPresetSave: (index: number) => void;
    onPresetCreate: (index: number) => void;
    onSettingsClick: (view?: 'widgets' | 'presets' | 'privacy' | 'navigation') => void;
    onVisibilityChange?: (visible: boolean) => void;
}

export default function DashboardDock({
    presets,
    activePresetIndex,
    onWidgetsClick,
    onPresetManagerClick,
    onPresetClick,
    onPresetSave,
    onPresetCreate,
    onSettingsClick,
    onVisibilityChange,
}: DashboardDockProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [mouseY, setMouseY] = useState(0);
    const { isPrivate, toggle: togglePrivacy } = usePrivacy();
    const { settings } = useSettings();

    // Destructure dock settings
    const {
        dockAutoHide,
        dockMagnification,
        dockShowActiveIndicator,
        dockTriggerDistance,
        dockHideDelay,
        dockIconSize,
        dockMagnificationScale,
        dockOpacity,
        dockShowWidgetsToggle,
        dockShowPresetManager,
        dockShowPrivacyToggle,
        dockShowSettingsToggle,
        dockShowCreatePreset,
        dockShowAutoCycleToggle
    } = settings;

    // Calculate initialized presets and first available slot
    const { initializedPresets, firstAvailableSlot, hasAvailableSlot } = useMemo(() => {
        const initialized: Array<{ index: number; preset: DashboardPreset }> = [];
        let firstAvailable = -1;

        presets.forEach((preset, index) => {
            const hasWidgets = preset !== null && preset.layout.filter(w => w.enabled).length > 0;
            if (hasWidgets) {
                initialized.push({ index, preset });
            } else if (firstAvailable === -1) {
                firstAvailable = index;
            }
        });

        return {
            initializedPresets: initialized,
            firstAvailableSlot: firstAvailable,
            hasAvailableSlot: firstAvailable !== -1
        };
    }, [presets]);

    // Reference for hide timeout
    const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // If auto-hide is disabled, always show the dock
        if (!dockAutoHide) {
            setIsVisible(true);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            setMouseY(e.clientY);
            const windowHeight = window.innerHeight;
            const showThreshold = dockTriggerDistance;
            const hideThreshold = dockTriggerDistance + 100;

            const shouldShow = e.clientY > windowHeight - showThreshold;
            const shouldHide = e.clientY <= windowHeight - hideThreshold;

            // Clear any existing hide timeout
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            if (shouldShow && !isVisible) {
                setIsVisible(true);
            } else if (shouldHide && isVisible) {
                // Use configurable hide delay
                hideTimeoutRef.current = setTimeout(() => {
                    setIsVisible(false);
                }, dockHideDelay);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, [isVisible, dockAutoHide, dockTriggerDistance, dockHideDelay]);

    // Notify parent of visibility changes
    useEffect(() => {
        onVisibilityChange?.(isVisible);
    }, [isVisible, onVisibilityChange]);

    const handlePresetRightClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        onPresetSave(index);
    };

    const handleCreatePreset = () => {
        if (firstAvailableSlot !== -1) {
            onPresetCreate(firstAvailableSlot);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0, x: "-50%" }}
                    animate={{ y: 0, opacity: dockOpacity / 100, x: "-50%" }}
                    exit={{ y: 100, opacity: 0, x: "-50%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-1/2 z-50"
                    style={{
                        // CSS custom properties for dock customization
                        ['--dock-icon-size' as string]: `${dockIconSize}px`,
                        ['--dock-magnification-scale' as string]: dockMagnificationScale,
                    }}
                >
                    <TooltipProvider delayDuration={200}>
                        <Dock
                            magnification={dockMagnification}
                            iconSize={dockIconSize}
                            magnificationScale={dockMagnificationScale}
                        >
                            {/* Widgets Icon - Blue */}
                            {dockShowWidgetsToggle && (
                                <DockIconWithTooltip
                                    tooltip="Add Widgets (F)"
                                    onClick={onWidgetsClick}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        onSettingsClick('widgets');
                                    }}
                                    className="bg-ui-accent-primary text-white shadow-sm"
                                >
                                    <MdWidgets className="w-5 h-5" />
                                </DockIconWithTooltip>
                            )}

                            {dockShowWidgetsToggle && <DockDivider />}

                            {/* Initialized Preset Slots */}
                            {initializedPresets.map(({ index, preset }) => {
                                const isActive = activePresetIndex === index;
                                const presetName = preset?.name || `Preset ${index + 1}`;

                                return (
                                    <DockIconWithTooltip
                                        key={index}
                                        tooltip={presetName}
                                        onClick={() => onPresetClick(index)}
                                        onContextMenu={(e) => handlePresetRightClick(e, index)}
                                        className={
                                            isActive
                                                ? "bg-ui-accent-primary text-white shadow-sm"
                                                : "bg-ui-bg-tertiary text-ui-text-primary shadow-sm hover:bg-ui-bg-quaternary"
                                        }
                                    >
                                        <span className="font-semibold text-sm">{index + 1}</span>
                                    </DockIconWithTooltip>
                                );
                            })}

                            {/* Add Preset Button */}
                            {hasAvailableSlot && dockShowCreatePreset && (
                                <DockIconWithTooltip
                                    tooltip={`Create Preset ${firstAvailableSlot + 1}`}
                                    onClick={handleCreatePreset}
                                    className="bg-transparent text-ui-text-tertiary border-2 border-dashed border-ui-border-secondary hover:border-ui-text-tertiary hover:text-ui-text-secondary"
                                >
                                    <MdAdd className="w-5 h-5" />
                                </DockIconWithTooltip>
                            )}

                            {(dockShowAutoCycleToggle || dockShowPresetManager || dockShowPrivacyToggle || dockShowSettingsToggle) && <DockDivider />}

                            {/* Auto-Cycle Toggle - Info blue when active */}
                            {dockShowAutoCycleToggle && (
                                <DockIconWithTooltip
                                    tooltip={settings.autoCycleEnabled ? "Disable Auto-Cycle" : "Enable Auto-Cycle"}
                                    onClick={() => {
                                        const { preferencesService } = require('@/lib/preferences');
                                        preferencesService.set('presets.autoCycle.enabled', !settings.autoCycleEnabled);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        onSettingsClick('presets');
                                    }}
                                    className={settings.autoCycleEnabled
                                        ? "bg-ui-info text-white shadow-sm"
                                        : "bg-ui-bg-tertiary text-ui-text-primary shadow-sm hover:bg-ui-bg-quaternary"
                                    }
                                >
                                    <MdAutorenew className={`w-5 h-5 ${settings.autoCycleEnabled ? 'animate-spin' : ''}`} style={settings.autoCycleEnabled ? { animationDuration: '3s' } : {}} />
                                </DockIconWithTooltip>
                            )}

                            {/* Preset Manager Icon - Purple */}
                            {dockShowPresetManager && (
                                <DockIconWithTooltip
                                    tooltip="Manage Presets (P)"
                                    onClick={onPresetManagerClick}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        onSettingsClick('presets');
                                    }}
                                    className="bg-ui-accent-secondary text-white shadow-sm"
                                >
                                    <MdBookmarks className="w-5 h-5" />
                                </DockIconWithTooltip>
                            )}

                            {/* Privacy Toggle - Warning orange when active */}
                            {dockShowPrivacyToggle && (
                                <DockIconWithTooltip
                                    tooltip="Privacy Mode (\\)"
                                    onClick={togglePrivacy}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        onSettingsClick('privacy');
                                    }}
                                    className={isPrivate
                                        ? "bg-ui-warning text-white shadow-sm"
                                        : "bg-ui-bg-tertiary text-ui-text-primary shadow-sm hover:bg-ui-bg-quaternary"
                                    }
                                >
                                    {isPrivate ? (
                                        <MdVisibilityOff className="w-5 h-5" />
                                    ) : (
                                        <MdVisibility className="w-5 h-5" />
                                    )}
                                </DockIconWithTooltip>
                            )}

                            {/* Settings Icon - Gray */}
                            {dockShowSettingsToggle && (
                                <DockIconWithTooltip
                                    tooltip="Settings (S)"
                                    onClick={() => onSettingsClick()}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        onSettingsClick('navigation');
                                    }}
                                    className="bg-ui-bg-tertiary text-ui-text-primary shadow-sm hover:bg-ui-bg-quaternary"
                                >
                                    <MdSettings className="w-5 h-5" />
                                </DockIconWithTooltip>
                            )}
                        </Dock>
                    </TooltipProvider>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

