"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dock, DockIcon, DockDivider } from "@/components/ui/dock";
import { MdWidgets, MdSettings, MdBookmarks, MdVisibilityOff, MdVisibility, MdAdd } from "react-icons/md";
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
    onSettingsClick: () => void;
}

export default function DashboardDock({
    presets,
    activePresetIndex,
    onWidgetsClick,
    onPresetManagerClick,
    onPresetClick,
    onPresetSave,
    onSettingsClick,
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
        dockShowCreatePreset
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

    const handlePresetRightClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        onPresetSave(index);
    };

    const handleCreatePreset = () => {
        if (firstAvailableSlot !== -1) {
            onPresetSave(firstAvailableSlot);
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
                            {/* Widgets Icon */}
                            {dockShowWidgetsToggle && (
                                <DockIconWithTooltip
                                    tooltip="Add Widgets (F)"
                                    onClick={onWidgetsClick}
                                    className="bg-ui-accent-primary-bg hover:bg-ui-accent-primary border-ui-accent-primary-border hover:border-ui-accent-primary text-ui-accent-primary-text hover:text-white"
                                >
                                    <MdWidgets className="w-6 h-6" />
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
                                                ? "bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover border-ui-accent-secondary text-white ring-2 ring-ui-accent-secondary/50"
                                                : "bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary border-ui-accent-secondary-border hover:border-ui-accent-secondary text-ui-accent-secondary-text hover:text-white"
                                        }
                                    >
                                        <span className="font-bold text-base">{index + 1}</span>
                                        {dockShowActiveIndicator && isActive && (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-ui-accent-secondary rounded-full shadow-lg animate-pulse" />
                                        )}
                                    </DockIconWithTooltip>
                                );
                            })}

                            {/* Add Preset Button - Only show if there's an available slot */}
                            {hasAvailableSlot && dockShowCreatePreset && (
                                <DockIconWithTooltip
                                    tooltip={`Create Preset ${firstAvailableSlot + 1}`}
                                    onClick={handleCreatePreset}
                                    className="bg-ui-bg-secondary hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-accent-secondary-border border-dashed text-ui-text-secondary hover:text-ui-accent-secondary-text"
                                >
                                    <MdAdd className="w-6 h-6" />
                                </DockIconWithTooltip>
                            )}

                            {(dockShowPresetManager || dockShowPrivacyToggle || dockShowSettingsToggle) && <DockDivider />}

                            {/* Preset Manager Icon */}
                            {dockShowPresetManager && (
                                <DockIconWithTooltip
                                    tooltip="Manage Presets (P)"
                                    onClick={onPresetManagerClick}
                                    className="bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary border-ui-accent-secondary-border hover:border-ui-accent-secondary text-ui-accent-secondary-text hover:text-white"
                                >
                                    <MdBookmarks className="w-6 h-6" />
                                </DockIconWithTooltip>
                            )}

                            {/* Privacy Toggle */}
                            {dockShowPrivacyToggle && (
                                <DockIconWithTooltip
                                    tooltip="Privacy Mode (\\)"
                                    onClick={togglePrivacy}
                                    className={isPrivate
                                        ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 hover:border-amber-500 text-amber-400 hover:text-amber-300 ring-2 ring-amber-500/40"
                                        : "bg-ui-bg-secondary hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary text-ui-text-secondary hover:text-ui-text-primary"
                                    }
                                >
                                    {isPrivate ? (
                                        <MdVisibilityOff className="w-6 h-6" />
                                    ) : (
                                        <MdVisibility className="w-6 h-6" />
                                    )}
                                </DockIconWithTooltip>
                            )}

                            {/* Settings Icon */}
                            {dockShowSettingsToggle && (
                                <DockIconWithTooltip
                                    tooltip="Settings (S)"
                                    onClick={onSettingsClick}
                                    className="bg-ui-bg-secondary hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary text-ui-text-secondary hover:text-ui-text-primary"
                                >
                                    <MdSettings className="w-6 h-6" />
                                </DockIconWithTooltip>
                            )}
                        </Dock>
                    </TooltipProvider>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

