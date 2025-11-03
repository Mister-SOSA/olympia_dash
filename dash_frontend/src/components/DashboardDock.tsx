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
            const threshold = 100; // Show dock when mouse is within 100px of bottom
            setIsVisible(e.clientY > windowHeight - threshold);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

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
                            className="bg-blue-600/30 hover:bg-blue-600/50 border-blue-500/60 hover:border-blue-400/80"
                        >
                            <MdWidgets className="w-6 h-6" />
                        </DockIcon>

                        {/* Preset Manager Icon */}
                        <DockIcon
                            onClick={onPresetManagerClick}
                            title="Manage Presets (P)"
                            className="bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/60 hover:border-purple-400/80"
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
                                            ? "bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/60 hover:border-purple-400/80 relative"
                                            : "bg-[#161e28]/90 hover:bg-[#23303d] border-[#202D3C] hover:border-[#2c3e50]"
                                    }
                                >
                                    <span className="font-semibold text-sm">{index + 1}</span>
                                    {isFilled && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                                    )}
                                </DockIcon>
                            );
                        })}

                        <DockDivider />

                        {/* Settings Icon */}
                        <DockIcon
                            onClick={onSettingsClick}
                            title="Settings (S)"
                            className="bg-slate-600/30 hover:bg-slate-600/50 border-slate-500/60 hover:border-slate-400/80"
                        >
                            <MdSettings className="w-6 h-6" />
                        </DockIcon>
                    </Dock>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

