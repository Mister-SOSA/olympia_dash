"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MdDelete,
    MdRefresh,
    MdSettings,
    MdFullscreen,
    MdFullscreenExit,
    MdInfo,
    MdContentCopy,
    MdEdit
} from "react-icons/md";

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
    onInfo
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

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
        const menuWidth = 280;
        const menuHeight = 320;

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

    const menuItems = [
        {
            id: 'info',
            label: 'Widget Info',
            icon: <MdInfo size={18} />,
            action: () => {
                onInfo(widgetId);
            },
            color: 'text-ui-accent-primary-text hover:bg-ui-accent-primary-bg'
        },
        {
            id: 'refresh',
            label: 'Refresh Now',
            icon: <MdRefresh size={18} />,
            action: () => {
                onRefresh(widgetId);
                onClose();
            },
            color: 'text-ui-success-text hover:bg-ui-success-bg'
        },
        {
            id: 'resize',
            label: 'Resize Widget',
            icon: <MdFullscreen size={18} />,
            submenu: [
                {
                    label: 'Small (2×2)',
                    action: () => {
                        onResize(widgetId, 'small');
                        onClose();
                    }
                },
                {
                    label: 'Medium (4×4)',
                    action: () => {
                        onResize(widgetId, 'medium');
                        onClose();
                    }
                },
                {
                    label: 'Large (6×4)',
                    action: () => {
                        onResize(widgetId, 'large');
                        onClose();
                    }
                }
            ],
            color: 'text-ui-accent-secondary-text hover:bg-ui-accent-secondary-bg'
        },
        {
            id: 'separator1',
            separator: true
        },
        {
            id: 'delete',
            label: 'Remove Widget',
            icon: <MdDelete size={18} />,
            action: () => {
                onDelete(widgetId);
            },
            color: 'text-ui-danger-text hover:bg-ui-danger-bg'
        }
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: "spring", damping: 30, stiffness: 400, duration: 0.2 }}
                    // NOTE: was `overflow-hidden` which prevented the resize submenu (absolutely positioned with left-full) from being visible.
                    // Using overflow-visible so the submenu can extend outside the main menu bounds.
                    className="fixed z-[9999] bg-ui-bg-primary/95 backdrop-blur-md border border-ui-border-primary rounded-xl shadow-2xl overflow-visible"
                    style={{
                        left: position.x,
                        top: position.y,
                        minWidth: '280px'
                    }}
                >
                    {/* Menu Header */}
                    <div className="bg-gradient-to-r from-ui-bg-secondary to-ui-bg-tertiary px-4 py-3 border-b border-ui-border-secondary">
                        <h3 className="font-semibold text-ui-text-primary text-sm truncate">
                            {widgetTitle}
                        </h3>
                        <p className="text-ui-text-secondary text-xs">Widget Actions</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        {menuItems.map((item, index) => {
                            if (item.separator) {
                                return (
                                    <div
                                        key={item.id}
                                        className="border-t border-ui-border-primary my-2"
                                    />
                                );
                            }

                            return (
                                <div key={item.id} className="relative">
                                    <button
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150 ${item.color}`}
                                        onClick={item.submenu ? () => {
                                            console.log('Toggling submenu for:', item.id);
                                            setSubmenuOpen(submenuOpen === item.id ? null : item.id);
                                        } : item.action}
                                        onMouseEnter={() => {
                                            if (item.submenu) {
                                                console.log('Mouse enter submenu:', item.id);
                                                setSubmenuOpen(item.id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="opacity-80">
                                                {item.icon}
                                            </span>
                                            <span className="font-medium">
                                                {item.label}
                                            </span>
                                        </div>
                                        {item.submenu && (
                                            <span className="text-ui-text-muted">
                                                ▶
                                            </span>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    {item.submenu && submenuOpen === item.id && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ type: "spring", damping: 30, stiffness: 400, duration: 0.15 }}
                                            className="absolute left-full top-0 ml-2 bg-ui-bg-primary border border-ui-border-secondary rounded-lg shadow-2xl overflow-hidden min-w-[200px] z-[10000]"
                                            style={{
                                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                                            }}
                                        >
                                            <div className="bg-ui-bg-secondary px-3 py-2 border-b border-ui-border-secondary">
                                                <p className="text-xs text-ui-text-secondary font-medium">Resize Options</p>
                                            </div>
                                            {item.submenu.map((subItem, subIndex) => (
                                                <button
                                                    key={subIndex}
                                                    className="w-full text-left px-4 py-3 text-ui-text-secondary hover:bg-ui-bg-tertiary hover:text-ui-text-primary transition-colors flex items-center justify-between"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        subItem.action();
                                                        setSubmenuOpen(null);
                                                        onClose();
                                                    }}
                                                >
                                                    <span>{subItem.label}</span>
                                                    <span className="text-xs text-ui-text-muted">
                                                        {subItem.label.includes('Small') ? '📱' :
                                                            subItem.label.includes('Medium') ? '💻' : '🖥️'}
                                                    </span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Menu Footer */}
                    <div className="bg-ui-bg-secondary/50 px-4 py-2 border-t border-ui-border-primary">
                        <p className="text-xs text-ui-text-muted text-center">
                            Right-click for widget options
                        </p>
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
