"use client";

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
import { vibrate } from "./utils";
import type { MobilePresetsState } from "@/utils/mobilePresetUtils";

// ============================================
// Preset Tabs - Clean iOS-style with spring animation
// ============================================

interface PresetTabsProps {
    presets: MobilePresetsState;
    onPresetChange: (index: number) => void;
    onAddPreset: () => void;
    onRenamePreset: (index: number) => void;
    onDeletePreset: (index: number) => void;
    currentSwiperIndex: number;
    nonNullPresetsCount: number;
}

export const PresetTabs = memo(function PresetTabs({
    presets,
    onPresetChange,
    onAddPreset,
    onRenamePreset,
    onDeletePreset,
    currentSwiperIndex,
    nonNullPresetsCount,
}: PresetTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
    const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    // Get non-null presets for rendering
    const nonNullPresets = useMemo(
        () => presets.presets
            .map((p, i) => ({ preset: p, originalIndex: i }))
            .filter((item): item is { preset: NonNullable<typeof item.preset>; originalIndex: number } =>
                item.preset !== null
            ),
        [presets.presets]
    );

    // Close context menu when clicking outside
    useEffect(() => {
        if (!contextMenu) return;
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [contextMenu]);

    const handleLongPressStart = useCallback((index: number, e: React.TouchEvent | React.MouseEvent) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        longPressTimer.current = setTimeout(() => {
            vibrate(20);
            setContextMenu({ index, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        }, 500);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleRename = useCallback(() => {
        if (contextMenu) {
            onRenamePreset(contextMenu.index);
            setContextMenu(null);
        }
    }, [contextMenu, onRenamePreset]);

    const handleDelete = useCallback(() => {
        if (contextMenu) {
            onDeletePreset(contextMenu.index);
            setContextMenu(null);
        }
    }, [contextMenu, onDeletePreset]);

    // Update indicator position when active tab changes
    useEffect(() => {
        if (!tabsRef.current) return;

        const updateIndicator = () => {
            const tabs = tabsRef.current?.querySelectorAll<HTMLElement>('[data-tab]');
            if (!tabs || !tabs[currentSwiperIndex]) return;

            const tab = tabs[currentSwiperIndex];
            setIndicatorStyle({
                left: tab.offsetLeft,
                width: tab.offsetWidth,
            });
        };

        // Update immediately and after a short delay (for initial render)
        updateIndicator();
        const timer = setTimeout(updateIndicator, 50);
        return () => clearTimeout(timer);
    }, [currentSwiperIndex, nonNullPresets.length]);

    // Smooth scroll to active tab using requestAnimationFrame
    useEffect(() => {
        if (!containerRef.current || !tabsRef.current) return;
        const tabs = tabsRef.current.querySelectorAll<HTMLElement>('[data-tab]');
        const tab = tabs[currentSwiperIndex];
        if (!tab) return;

        const container = containerRef.current;

        // Calculate where we want the tab centered
        const tabCenterInContainer = tab.offsetLeft + tab.offsetWidth / 2;
        const targetScroll = tabCenterInContainer - container.clientWidth / 2;
        const clampedTarget = Math.max(0, Math.min(targetScroll, container.scrollWidth - container.clientWidth));

        const startScroll = container.scrollLeft;
        const distance = clampedTarget - startScroll;

        // Skip if already close enough
        if (Math.abs(distance) < 2) return;

        const duration = 250;
        let startTime: number | null = null;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animateScroll = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            container.scrollLeft = startScroll + distance * easedProgress;

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
    }, [currentSwiperIndex]);

    return (
        <div className="preset-tabs-wrapper px-4 py-2">
            <div
                ref={containerRef}
                className="overflow-x-auto scrollbar-hide"
            >
                <div className="inline-flex items-center gap-2">
                    {/* Tab container */}
                    <div
                        ref={tabsRef}
                        className="relative flex items-center rounded-xl p-1"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        role="tablist"
                        aria-label="Preset tabs"
                    >
                        {/* Animated indicator */}
                        <motion.div
                            className="absolute top-1 bottom-1 rounded-lg"
                            style={{ backgroundColor: 'var(--ui-accent-primary)' }}
                            initial={false}
                            animate={{
                                left: indicatorStyle.left,
                                width: indicatorStyle.width,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                            }}
                        />

                        {/* Tab buttons */}
                        {nonNullPresets.map(({ preset, originalIndex }, swiperIndex) => {
                            const isActive = swiperIndex === currentSwiperIndex;

                            return (
                                <button
                                    key={originalIndex}
                                    data-tab
                                    onClick={() => onPresetChange(originalIndex)}
                                    onTouchStart={(e) => handleLongPressStart(originalIndex, e)}
                                    onTouchEnd={handleLongPressEnd}
                                    onTouchCancel={handleLongPressEnd}
                                    onMouseDown={(e) => handleLongPressStart(originalIndex, e)}
                                    onMouseUp={handleLongPressEnd}
                                    onMouseLeave={handleLongPressEnd}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                                        vibrate(20);
                                        setContextMenu({ index: originalIndex, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                                    }}
                                    role="tab"
                                    aria-selected={isActive}
                                    className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap select-none"
                                    style={{
                                        color: isActive ? 'white' : 'var(--ui-text-secondary)',
                                        transition: 'color 0.2s ease',
                                    }}
                                >
                                    <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                                        style={{
                                            backgroundColor: isActive
                                                ? 'rgba(255,255,255,0.25)'
                                                : 'var(--ui-bg-secondary)',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        {swiperIndex + 1}
                                    </span>
                                    <span className="max-w-20 truncate">{preset.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Add preset button */}
                    <button
                        onClick={onAddPreset}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-ui-text-muted active:scale-90 transition-transform"
                        style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                        aria-label="Create new preset"
                    >
                        <MdAdd className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[100] bg-ui-bg-primary border border-ui-border-primary rounded-lg shadow-2xl overflow-hidden"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y,
                            transform: 'translateX(-50%)',
                            minWidth: '160px',
                        }}
                    >
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-ui-border-primary bg-ui-bg-secondary">
                            <p className="text-xs font-medium text-ui-text-secondary truncate">
                                {presets.presets[contextMenu.index]?.name}
                            </p>
                        </div>
                        {/* Menu Items */}
                        <div className="py-1">
                            <button
                                onClick={handleRename}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ui-text-primary hover:bg-ui-bg-tertiary transition-colors"
                            >
                                <MdEdit className="w-4 h-4" />
                                Rename
                            </button>
                            {nonNullPresetsCount > 1 && (
                                <button
                                    onClick={handleDelete}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <MdDelete className="w-4 h-4" />
                                    Delete
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
