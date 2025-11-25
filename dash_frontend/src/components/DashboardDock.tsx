"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dock, DockIcon, DockDivider } from "@/components/ui/dock";
import { MdWidgets, MdSettings, MdBookmarks, MdVisibilityOff, MdVisibility } from "react-icons/md";
import { DashboardPreset } from "@/types";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSettings } from "@/hooks/useSettings";

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
        dockTriggerDistance 
    } = settings;

    useEffect(() => {
        // If auto-hide is disabled, always show the dock
        if (!dockAutoHide) {
            setIsVisible(true);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            setMouseY(e.clientY);
            const windowHeight = window.innerHeight;
            const showThreshold = dockTriggerDistance; // Use configured trigger distance
            const hideThreshold = dockTriggerDistance + 100; // Hide threshold is trigger + 100px

            // Use different thresholds based on current visibility state
            if (isVisible) {
                // When visible, use larger threshold to hide (prevents flickering)
                setIsVisible(e.clientY > windowHeight - hideThreshold);
            } else {
                // When hidden, use smaller threshold to show
                setIsVisible(e.clientY > windowHeight - showThreshold);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isVisible, dockAutoHide, dockTriggerDistance]);

    const handlePresetRightClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        onPresetSave(index);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0, x: "-50%" }}
                    animate={{ y: 0, opacity: 1, x: "-50%" }}
                    exit={{ y: 100, opacity: 0, x: "-50%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-1/2 z-50"
                >
                    <Dock magnification={dockMagnification}>
                        {/* Widgets Icon */}
                        <DockIcon
                            onClick={onWidgetsClick}
                            title="Widgets (F)"
                            className="bg-ui-accent-primary-bg hover:bg-ui-accent-primary-bg border-ui-accent-primary-border hover:border-ui-accent-primary"
                        >
                            <MdWidgets className="w-6 h-6" />
                        </DockIcon>

                        {/* Preset Manager Icon */}
                        <DockIcon
                            onClick={onPresetManagerClick}
                            title="Manage Presets (P)"
                            className="bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary-bg border-ui-accent-secondary-border hover:border-ui-accent-secondary"
                        >
                            <MdBookmarks className="w-6 h-6" />
                        </DockIcon>

                        <DockDivider />

                        {/* Preset Slots 1-9 */}
                        {presets.map((preset, index) => {
                            const isFilled = preset !== null && preset.layout.filter(w => w.enabled).length > 0;
                            const isActive = activePresetIndex === index;
                            const presetName = preset?.name || `Preset ${index + 1}`;

                            let tooltipText = `${presetName}`;
                            if (isActive) {
                                tooltipText += " (Active)";
                            } else if (isFilled) {
                                tooltipText += " - Click to load, Right-click to overwrite";
                            } else {
                                tooltipText += " - Right-click to save";
                            }

                            return (
                                <DockIcon
                                    key={index}
                                    onClick={() => onPresetClick(index)}
                                    onContextMenu={(e) => handlePresetRightClick(e, index)}
                                    title={tooltipText}
                                    className={
                                        isActive
                                            ? "bg-ui-accent-primary hover:bg-ui-accent-primary-hover border-ui-accent-primary relative ring-2 ring-ui-accent-primary/50"
                                            : isFilled
                                                ? "bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary-bg border-ui-accent-secondary-border hover:border-ui-accent-secondary relative"
                                                : "bg-ui-bg-secondary/90 hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary"
                                    }
                                >
                                    <span className="font-semibold text-sm">{index + 1}</span>
                                    {dockShowActiveIndicator && isActive && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                    )}
                                    {dockShowActiveIndicator && !isActive && isFilled && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-ui-accent-secondary-text rounded-full shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
                                    )}
                                </DockIcon>
                            );
                        })}

                        <DockDivider />

                        {/* Privacy Toggle */}
                        <DockIcon
                            onClick={togglePrivacy}
                            title={isPrivate ? "Privacy Mode ON (\\)" : "Privacy Mode OFF (\\)"}
                            className={isPrivate 
                                ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 hover:border-amber-500 text-amber-400"
                                : "bg-ui-bg-tertiary/90 hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary"
                            }
                        >
                            {isPrivate ? (
                                <MdVisibilityOff className="w-6 h-6" />
                            ) : (
                                <MdVisibility className="w-6 h-6" />
                            )}
                        </DockIcon>

                        {/* Settings Icon */}
                        <DockIcon
                            onClick={onSettingsClick}
                            title="Settings (S)"
                            className="bg-ui-bg-tertiary/90 hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary"
                        >
                            <MdSettings className="w-6 h-6" />
                        </DockIcon>
                    </Dock>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

