"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MdDelete,
    MdRefresh,
    MdInfo,
    MdSettings,
    MdPhotoSizeSelectSmall,
    MdPhotoSizeSelectLarge,
} from "react-icons/md";
import { widgetHasSettings } from "@/constants/widgetSettings";

interface ContextMenuProps {
    x: number;
    y: number;
    widgetId: string;
    widgetTitle: string;
    isVisible: boolean;
    onClose: () => void;
    onDelete: (widgetId: string) => void;
    onRefresh: (widgetId: string) => void;
    onResize: (widgetId: string, size: 'small' | 'medium' | 'large') => void;
    onInfo: (widgetId: string) => void;
    onSettings?: (widgetId: string) => void;
}

export default function WidgetContextMenu({
    x,
    y,
    widgetId,
    widgetTitle,
    isVisible,
    onClose,
    onDelete,
    onRefresh,
    onResize,
    onInfo,
    onSettings
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isVisible, onClose]);

    // Adjust menu position to stay within viewport
    const getMenuPosition = () => {
        const menuWidth = 220;
        const menuHeight = 280;

        // Check if we're in the browser
        if (typeof window === 'undefined') {
            return { x, y };
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        // Adjust horizontal position
        if (x + menuWidth > viewportWidth) {
            adjustedX = x - menuWidth;
        }

        // Adjust vertical position
        if (y + menuHeight > viewportHeight) {
            adjustedY = y - menuHeight;
        }

        return { x: Math.max(10, adjustedX), y: Math.max(10, adjustedY) };
    };

    const position = getMenuPosition();

    const MenuItem = ({
        icon: Icon,
        label,
        onClick,
        variant = 'default'
    }: {
        icon: React.ElementType;
        label: string;
        onClick: () => void;
        variant?: 'default' | 'danger';
    }) => (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-ui-text-primary hover:bg-ui-bg-tertiary'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed z-[9999] bg-ui-bg-primary border border-ui-border-primary rounded-lg shadow-2xl overflow-hidden"
                    style={{
                        left: position.x,
                        top: position.y,
                        minWidth: '200px'
                    }}
                >
                    {/* Menu Header */}
                    <div className="px-3 py-2 border-b border-ui-border-primary bg-ui-bg-secondary">
                        <p className="text-xs font-medium text-ui-text-secondary truncate">
                            {widgetTitle}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <MenuItem
                            icon={MdInfo}
                            label="Info"
                            onClick={() => {
                                onInfo(widgetId);
                                onClose();
                            }}
                        />
                        {widgetHasSettings(widgetId) && onSettings && (
                            <MenuItem
                                icon={MdSettings}
                                label="Settings"
                                onClick={() => {
                                    onSettings(widgetId);
                                    onClose();
                                }}
                            />
                        )}
                        <MenuItem
                            icon={MdRefresh}
                            label="Refresh"
                            onClick={() => {
                                onRefresh(widgetId);
                                onClose();
                            }}
                        />

                        <div className="border-t border-ui-border-primary my-1" />

                        <div className="px-3 py-1">
                            <p className="text-xs text-ui-text-muted">Resize</p>
                        </div>
                        <MenuItem
                            icon={MdPhotoSizeSelectSmall}
                            label="Small (2×2)"
                            onClick={() => {
                                onResize(widgetId, 'small');
                                onClose();
                            }}
                        />
                        <MenuItem
                            icon={MdPhotoSizeSelectSmall}
                            label="Medium (4×4)"
                            onClick={() => {
                                onResize(widgetId, 'medium');
                                onClose();
                            }}
                        />
                        <MenuItem
                            icon={MdPhotoSizeSelectLarge}
                            label="Large (6×4)"
                            onClick={() => {
                                onResize(widgetId, 'large');
                                onClose();
                            }}
                        />

                        <div className="border-t border-ui-border-primary my-1" />

                        <MenuItem
                            icon={MdDelete}
                            label="Remove"
                            onClick={() => {
                                onDelete(widgetId);
                                onClose();
                            }}
                            variant="danger"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Hook for managing context menu state
export function useWidgetContextMenu() {
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        widgetId: string;
        widgetTitle: string;
        isVisible: boolean;
    }>({
        x: 0,
        y: 0,
        widgetId: '',
        widgetTitle: '',
        isVisible: false
    });

    const showContextMenu = (x: number, y: number, widgetId: string, widgetTitle: string) => {
        setContextMenu({ x, y, widgetId, widgetTitle, isVisible: true });
    };

    const hideContextMenu = () => {
        setContextMenu(prev => ({ ...prev, isVisible: false }));
    };

    return {
        contextMenu,
        showContextMenu,
        hideContextMenu
    };
}
