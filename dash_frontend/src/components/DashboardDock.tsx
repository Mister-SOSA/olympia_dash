"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dock, DockIcon, DockDivider } from "@/components/ui/dock";
import { MdWidgets, MdSettings, MdBookmarks } from "react-icons/md";
import { DashboardPreset } from "@/types";

interface DashboardDockProps {
    presets: Array<DashboardPreset | null>;
    onWidgetsClick: () => void;
    onPresetManagerClick: () => void;
    onPresetClick: (index: number) => void;
    onPresetSave: (index: number) => void;
    onSettingsClick: () => void;
}

export default function DashboardDock({
    presets,
    onWidgetsClick,
    onPresetManagerClick,
    onPresetClick,
    onPresetSave,
    onSettingsClick,
}: DashboardDockProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [mouseY, setMouseY] = useState(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouseY(e.clientY);
            const windowHeight = window.innerHeight;
            const showThreshold = 20; // Show dock when mouse is within 20px of bottom
            const hideThreshold = 120; // Hide dock when mouse is more than 150px from bottom

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
    }, [isVisible]);

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
                    <Dock>
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

                            return (
                                <DockIcon
                                    key={index}
                                    onClick={() => onPresetClick(index)}
                                    onContextMenu={(e) => handlePresetRightClick(e, index)}
                                    title={
                                        isFilled
                                            ? `Preset ${index + 1} - Click to load, Right-click to overwrite`
                                            : `Preset ${index + 1} - Right-click to save`
                                    }
                                    className={
                                        isFilled
                                            ? "bg-ui-accent-secondary-bg hover:bg-ui-accent-secondary-bg border-ui-accent-secondary-border hover:border-ui-accent-secondary relative"
                                            : "bg-ui-bg-secondary/90 hover:bg-ui-bg-tertiary border-ui-border-primary hover:border-ui-border-secondary"
                                    }
                                >
                                    <span className="font-semibold text-sm">{index + 1}</span>
                                    {isFilled && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-ui-accent-secondary-text rounded-full shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
                                    )}
                                </DockIcon>
                            );
                        })}

                        <DockDivider />

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

