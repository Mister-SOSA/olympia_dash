"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MdAddCircleOutline,
    MdGridView,
    MdSettings,
    MdRefresh,
} from "react-icons/md";

interface DashboardContextMenuProps {
    x: number;
    y: number;
    isVisible: boolean;
    onClose: () => void;
    onAddWidget: () => void;
    onCompact: () => void;
    onSettings: () => void;
    onRefreshAll: () => void;
}

export default function DashboardContextMenu({
    x,
    y,
    isVisible,
    onClose,
    onAddWidget,
    onCompact,
    onSettings,
    onRefreshAll
}: DashboardContextMenuProps) {
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
        const menuHeight = 200;

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
        variant?: 'default' | 'primary';
    }) => (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${variant === 'primary'
                    ? 'text-blue-400 hover:bg-blue-500/10'
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
                        <p className="text-xs font-medium text-ui-text-secondary">
                            Dashboard
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <MenuItem
                            icon={MdAddCircleOutline}
                            label="Add Widget"
                            onClick={() => {
                                onAddWidget();
                                onClose();
                            }}
                            variant="primary"
                        />

                        <div className="border-t border-ui-border-primary my-1" />

                        <MenuItem
                            icon={MdGridView}
                            label="Compact Layout"
                            onClick={() => {
                                onCompact();
                                onClose();
                            }}
                        />
                        <MenuItem
                            icon={MdRefresh}
                            label="Refresh All Widgets"
                            onClick={() => {
                                onRefreshAll();
                                onClose();
                            }}
                        />

                        <div className="border-t border-ui-border-primary my-1" />

                        <MenuItem
                            icon={MdSettings}
                            label="Settings"
                            onClick={() => {
                                onSettings();
                                onClose();
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Hook for managing dashboard context menu state
export function useDashboardContextMenu() {
    const [contextMenu, setContextMenu] = React.useState<{
        x: number;
        y: number;
        isVisible: boolean;
    }>({
        x: 0,
        y: 0,
        isVisible: false
    });

    const showContextMenu = (x: number, y: number) => {
        setContextMenu({ x, y, isVisible: true });
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
