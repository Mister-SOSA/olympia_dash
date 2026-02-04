"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback, useMemo } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { motion, AnimatePresence } from "framer-motion";
import { Widget } from "@/types";

// Type for resize handle axes
type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne';
import { MIN_WIDGET_WIDTH, MIN_WIDGET_HEIGHT } from "@/constants/dashboard";
import { getWidgetComponentById, getWidgetConfigById } from "@/components/widgets/registry";
import { getWidgetType } from "@/utils/widgetInstanceUtils";
import { Suspense } from "react";
import WidgetContextMenu, { useWidgetContextMenu } from "./WidgetContextMenu";
import DashboardContextMenu, { useDashboardContextMenu } from "./DashboardContextMenu";
import WidgetSettingsDialog from "./WidgetSettingsDialog";
import { ConfirmModal, InfoModal } from "./ui/modal";
import { LayoutDashboard } from "lucide-react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";
import { preferencesService } from "@/lib/preferences";
import { DASHBOARD_SETTINGS, GRID_SETTINGS } from "@/constants/settings";
import { useSettings } from "@/hooks/useSettings";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { useWidgetSettingsDialog } from "@/contexts/WidgetSettingsDialogContext";
import { type LayoutUpdateSource } from "@/utils/layoutUtils";
import { Loader } from "@/components/ui/loader";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";

// Custom resize handle component - replaces the library's default diagonal handles
const CustomResizeHandle = React.forwardRef<HTMLElement, {
    handleAxis: ResizeHandleAxis;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchStart?: React.TouchEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}>(({ handleAxis, ...props }, ref) => {
    const isCorner = handleAxis === 'se' || handleAxis === 'sw' || handleAxis === 'ne' || handleAxis === 'nw';
    const isHorizontalEdge = handleAxis === 's' || handleAxis === 'n';
    const isVerticalEdge = handleAxis === 'e' || handleAxis === 'w';

    const getPositionStyle = (): React.CSSProperties => {
        switch (handleAxis) {
            case 'se': return { bottom: 0, right: 0, width: 20, height: 20, cursor: 'se-resize' };
            case 'sw': return { bottom: 0, left: 0, width: 20, height: 20, cursor: 'sw-resize' };
            case 'ne': return { top: 0, right: 0, width: 20, height: 20, cursor: 'ne-resize' };
            case 'nw': return { top: 0, left: 0, width: 20, height: 20, cursor: 'nw-resize' };
            case 's': return { bottom: 0, left: 20, right: 20, height: 14, cursor: 's-resize' };
            case 'n': return { top: 0, left: 20, right: 20, height: 14, cursor: 'n-resize' };
            case 'e': return { right: 0, top: 20, bottom: 20, width: 14, cursor: 'e-resize' };
            case 'w': return { left: 0, top: 20, bottom: 20, width: 14, cursor: 'w-resize' };
            default: return {};
        }
    };

    return (
        <div
            ref={ref as React.Ref<HTMLDivElement>}
            className={`custom-resize-handle custom-resize-handle-${handleAxis}`}
            style={{ position: 'absolute', zIndex: 10, ...getPositionStyle() }}
            {...props}
        >
            {isCorner && <div className={`corner-bracket corner-bracket-${handleAxis}`} />}
            {isHorizontalEdge && <div className="edge-pill edge-pill-horizontal" />}
            {isVerticalEdge && <div className="edge-pill edge-pill-vertical" />}
        </div>
    );
});
CustomResizeHandle.displayName = 'CustomResizeHandle';

// Create responsive grid with width provider
const ResponsiveGridLayout = WidthProvider(Responsive);

export interface GridDashboardProps {
    layout: Widget[];
    layoutKey?: number;
    onExternalLayoutChange?: (layout: Widget[], source?: LayoutUpdateSource) => void;
    onAddWidget?: () => void;
    onOpenSettings?: () => void;
    isDockVisible?: boolean;
}

export interface GridDashboardHandle {
    compact: (mode?: 'list' | 'compact') => void;
}

// Convert our Widget[] to react-grid-layout Layout[]
const widgetsToLayout = (widgets: Widget[]): Layout[] => {
    return widgets
        .filter(w => w.enabled)
        .map(w => ({
            i: w.id,
            x: w.x,
            y: w.y,
            w: Math.max(w.w, MIN_WIDGET_WIDTH),
            h: Math.max(w.h, MIN_WIDGET_HEIGHT),
            minW: MIN_WIDGET_WIDTH,
            minH: MIN_WIDGET_HEIGHT,
        }));
};

// Convert react-grid-layout Layout[] back to our Widget[]
const layoutToWidgets = (rglLayout: Layout[], existingWidgets: Widget[]): Widget[] => {
    return rglLayout.map(item => {
        const existing = existingWidgets.find(w => w.id === item.i);
        return {
            id: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            enabled: true,
            displayName: existing?.displayName,
            category: existing?.category,
            description: existing?.description,
        };
    });
};

/**
 * Compact a layout vertically, filling gaps and moving items up.
 * This is a proper bin-packing algorithm that finds the first available position for each widget.
 */
const compactLayout = (layout: Layout[], cols: number): Layout[] => {
    // Guard against empty layout or invalid cols
    if (!layout.length || cols < 1) return layout;

    // Sort by y then x to process top-to-bottom, left-to-right
    const sorted = [...layout].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    // Track occupied cells
    const occupied: boolean[][] = [];

    const isOccupied = (x: number, y: number, w: number, h: number): boolean => {
        for (let row = y; row < y + h; row++) {
            for (let col = x; col < x + w; col++) {
                if (occupied[row]?.[col]) return true;
            }
        }
        return false;
    };

    const markOccupied = (x: number, y: number, w: number, h: number): void => {
        for (let row = y; row < y + h; row++) {
            if (!occupied[row]) occupied[row] = [];
            for (let col = x; col < x + w; col++) {
                occupied[row][col] = true;
            }
        }
    };

    const findFirstAvailablePosition = (w: number, h: number): { x: number; y: number } => {
        // Clamp width to cols to prevent infinite loop
        const effectiveW = Math.min(w, cols);
        const maxY = 1000; // Safety limit to prevent infinite loops

        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x <= cols - effectiveW; x++) {
                if (!isOccupied(x, y, effectiveW, h)) {
                    return { x, y };
                }
            }
        }
        // Fallback: place at origin if we hit the limit (shouldn't happen)
        return { x: 0, y: 0 };
    };

    // Place each widget in the first available position
    const compacted: Layout[] = sorted.map(item => {
        const pos = findFirstAvailablePosition(item.w, item.h);
        markOccupied(pos.x, pos.y, Math.min(item.w, cols), item.h);
        return { ...item, x: pos.x, y: pos.y };
    });

    return compacted;
};

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, layoutKey, onExternalLayoutChange, onAddWidget, onOpenSettings, isDockVisible }, ref) => {
        const { contextMenu, showContextMenu, hideContextMenu } = useWidgetContextMenu();
        const { contextMenu: dashboardContextMenu, showContextMenu: showDashboardContextMenu, hideContextMenu: hideDashboardContextMenu } = useDashboardContextMenu();

        // Track if user is actively interacting (for sync lock)
        const isInteracting = useRef<boolean>(false);

        // Track the layout we last sent to parent to avoid duplicate updates
        const lastSentLayout = useRef<string>("");

        // Debounce timer for layout changes
        const layoutUpdateTimer = useRef<NodeJS.Timeout | null>(null);

        // Widget permissions
        const { hasAccess } = useWidgetPermissions();

        // Analytics tracking
        const { trackWidgetInteraction } = useAnalytics();

        // Get settings
        const { settings } = useSettings();
        const {
            dragHandleAlwaysShow,
            showResizeHandles,
            dragHandleOpacity,
            dragHandleSize,
            dragHandleStyle,
            dockShowEmptyDockHint,
        } = settings;

        // Grid settings - read directly from preferences for stability
        const columnCount = useMemo(() =>
            preferencesService.get(GRID_SETTINGS.columns.key, GRID_SETTINGS.columns.default) as number,
            []
        );
        const cellHeight = useMemo(() =>
            preferencesService.get(GRID_SETTINGS.cellHeight.key, GRID_SETTINGS.cellHeight.default) as number,
            []
        );

        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [showInfoModal, setShowInfoModal] = useState(false);
        const [selectedWidget, setSelectedWidget] = useState<{ id: string; title: string } | null>(null);

        // Widget settings dialog from context (allows widgets to open their own settings)
        const widgetSettingsDialog = useWidgetSettingsDialog();

        // For forcing widget refresh
        const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});

        const externalLayoutChangeRef = useRef(onExternalLayoutChange);
        useEffect(() => {
            externalLayoutChangeRef.current = onExternalLayoutChange;
        }, [onExternalLayoutChange]);

        // Convert layout to react-grid-layout format
        const gridLayout = useMemo(() => {
            // Filter to only enabled widgets that user has access to
            const accessibleWidgets = layout.filter(w => w.enabled && hasAccess(w.id, 'view'));
            return widgetsToLayout(accessibleWidgets);
        }, [layout, hasAccess]);

        // Handle layout changes from react-grid-layout
        const handleLayoutChange = useCallback((newLayout: Layout[]) => {
            // Serialize for comparison
            const layoutJson = JSON.stringify(newLayout);

            // Skip if same as last sent
            if (layoutJson === lastSentLayout.current) {
                return;
            }

            // Clear existing timer
            if (layoutUpdateTimer.current) {
                clearTimeout(layoutUpdateTimer.current);
            }

            // Debounce rapid changes
            layoutUpdateTimer.current = setTimeout(() => {
                const updatedWidgets = layoutToWidgets(newLayout, layout);
                const layoutJsonToSend = JSON.stringify(newLayout);

                // Update tracking ref before sending
                lastSentLayout.current = layoutJsonToSend;

                // Send to parent with 'local-interaction' source
                externalLayoutChangeRef.current?.(updatedWidgets, 'local-interaction');
            }, 150);
        }, [layout]);

        // Handle drag start
        const handleDragStart = useCallback(() => {
            isInteracting.current = true;
            preferencesService.setInteractionLock(true);
        }, []);

        // Handle drag stop
        const handleDragStop = useCallback((newLayout: Layout[], _oldItem: Layout, newItem: Layout) => {
            isInteracting.current = false;
            preferencesService.setInteractionLock(false);

            // Track widget move - use widget type for config lookup
            const widgetConfig = getWidgetConfigById(newItem.i);
            trackWidgetInteraction(widgetConfig?.title || newItem.i, newItem.i, 'move');

            // Trigger layout change
            handleLayoutChange(newLayout);
        }, [handleLayoutChange, trackWidgetInteraction]);

        // Handle resize start
        const handleResizeStart = useCallback(() => {
            isInteracting.current = true;
            preferencesService.setInteractionLock(true);
        }, []);

        // Handle resize stop
        const handleResizeStop = useCallback((newLayout: Layout[], _oldItem: Layout, newItem: Layout) => {
            isInteracting.current = false;
            preferencesService.setInteractionLock(false);

            // Track widget resize - use widget type for config lookup
            const widgetConfig = getWidgetConfigById(newItem.i);
            trackWidgetInteraction(widgetConfig?.title || newItem.i, newItem.i, 'resize', {
                w: newItem.w,
                h: newItem.h
            });

            // Trigger layout change
            handleLayoutChange(newLayout);
        }, [handleLayoutChange, trackWidgetInteraction]);

        // Context menu actions
        const handleDeleteWidget = useCallback((widgetId: string) => {
            // Track widget removal - use widget type for config lookup
            const widgetConfig = getWidgetConfigById(widgetId);
            trackWidgetInteraction(widgetConfig?.title || widgetId, widgetId, 'remove');

            // Update layout by filtering out the widget
            const updatedLayout = layout.filter(w => w.id !== widgetId);

            externalLayoutChangeRef.current?.(updatedLayout, 'widget-remove');
        }, [layout, trackWidgetInteraction]);

        const handleRefreshWidget = useCallback((widgetId: string) => {
            console.log(`Refreshing widget: ${widgetId}`);
            // Force re-render by updating the widget's key
            setRefreshKeys(prev => ({
                ...prev,
                [widgetId]: (prev[widgetId] || 0) + 1
            }));
        }, []);

        const handleResizeWidget = useCallback((widgetId: string, size: 'small' | 'medium' | 'large') => {
            const sizeMap = {
                small: { w: 2, h: 2 },
                medium: { w: 4, h: 4 },
                large: { w: 6, h: 4 }
            } as const;

            const newSize = sizeMap[size];

            // Track widget resize - use widget type for config lookup
            const widgetConfig = getWidgetConfigById(widgetId);
            trackWidgetInteraction(widgetConfig?.title || widgetId, widgetId, 'resize', { size, ...newSize });

            // Update the widget's size in the layout
            const updatedLayout = layout.map(w =>
                w.id === widgetId ? { ...w, ...newSize } : w
            );

            externalLayoutChangeRef.current?.(updatedLayout, 'local-interaction');
            hideContextMenu();
        }, [layout, trackWidgetInteraction, hideContextMenu]);

        const handleWidgetInfo = useCallback((widgetId: string) => {
            const widgetConfig = getWidgetConfigById(widgetId);
            if (widgetConfig) {
                setSelectedWidget({ id: widgetId, title: widgetConfig.title });
                setShowInfoModal(true);
            }
            hideContextMenu();
        }, [hideContextMenu]);

        const handleWidgetSettings = useCallback((widgetId: string) => {
            const widgetConfig = getWidgetConfigById(widgetId);
            if (widgetConfig) {
                widgetSettingsDialog.openSettings(widgetId, widgetConfig.title);
            }
            hideContextMenu();
        }, [hideContextMenu, widgetSettingsDialog]);

        const handleDeleteRequest = useCallback((widgetId: string) => {
            const widgetConfig = getWidgetConfigById(widgetId);
            if (widgetConfig) {
                const confirmDelete = preferencesService.get(
                    DASHBOARD_SETTINGS.confirmDelete.key,
                    DASHBOARD_SETTINGS.confirmDelete.default
                );

                if (confirmDelete) {
                    setSelectedWidget({ id: widgetId, title: widgetConfig.title });
                    setShowDeleteConfirm(true);
                } else {
                    handleDeleteWidget(widgetId);
                }
            }
            hideContextMenu();
        }, [handleDeleteWidget, hideContextMenu]);

        const handleConfirmDelete = useCallback(() => {
            if (selectedWidget) {
                handleDeleteWidget(selectedWidget.id);
                setSelectedWidget(null);
            }
            setShowDeleteConfirm(false);
        }, [selectedWidget, handleDeleteWidget]);

        // Refresh all widgets
        const handleRefreshAll = useCallback(() => {
            console.log('Refreshing all widgets...');
            setRefreshKeys(prevKeys => {
                const newKeys: Record<string, number> = {};
                layout.forEach(w => {
                    if (w.enabled) {
                        newKeys[w.id] = (prevKeys[w.id] || 0) + 1;
                    }
                });
                return newKeys;
            });
        }, [layout]);

        // Compact method exposed to parent
        useImperativeHandle(ref, () => ({
            compact: (mode: 'list' | 'compact' = 'list') => {
                console.log(`Compact requested: ${mode}`);

                // Run the compaction algorithm on the current layout
                const compactedRglLayout = compactLayout(gridLayout, columnCount);

                // Convert back to Widget[] format
                const compactedWidgets = layoutToWidgets(compactedRglLayout, layout);

                // Send to parent - this will update state and re-render with compacted positions
                externalLayoutChangeRef.current?.(compactedWidgets, 'compact');
            },
        }), [gridLayout, layout, columnCount]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (layoutUpdateTimer.current) {
                    clearTimeout(layoutUpdateTimer.current);
                }
            };
        }, []);

        // Render individual widget
        // Supports both singleton widgets (widgetId = type) and multi-instance widgets (widgetId = type:instanceId)
        const renderWidget = useCallback((widgetId: string, refreshKey: number = 0) => {
            // Get the widget type for permission checking and component lookup
            const widgetType = getWidgetType(widgetId);

            if (!hasAccess(widgetType, 'view')) {
                return <div className="widget-error">Access Denied</div>;
            }

            // Get widget config by type (works for both singleton and multi-instance)
            const widgetConfig = getWidgetConfigById(widgetId);
            if (!widgetConfig) {
                return <div className="widget-error">Widget &quot;{widgetId}&quot; not found</div>;
            }

            // Get the lazy-loaded component using the widget type
            const WidgetComponent = getWidgetComponentById(widgetId);
            if (!WidgetComponent) {
                return <div className="widget-error">Widget component not found</div>;
            }

            // Widget component already includes .widget wrapper and .widget-drag-handle
            // Pass widgetId as prop so multi-instance widgets can access their instance-specific settings
            return (
                <WidgetErrorBoundary widgetName={widgetConfig.title}>
                    <Suspense fallback={<div className="widget-loading-container" />}>
                        <WidgetComponent key={`${widgetId}-${refreshKey}`} widgetId={widgetId} />
                    </Suspense>
                </WidgetErrorBoundary>
            );
        }, [hasAccess]);

        // Build CSS classes based on settings
        const gridClasses = [
            "grid-dashboard",
            dragHandleAlwaysShow ? "drag-handles-always-visible" : "",
            !showResizeHandles ? "hide-resize-handles" : "",
            `drag-handle-style-${dragHandleStyle}`,
            `drag-handle-size-${dragHandleSize}`,
        ].filter(Boolean).join(" ");

        // CSS custom properties
        const gridStyles: React.CSSProperties = {
            ['--drag-handle-opacity' as string]: dragHandleOpacity / 100,
        };

        // Get enabled widgets for rendering
        const enabledWidgets = useMemo(() =>
            layout.filter(w => w.enabled && hasAccess(w.id, 'view')),
            [layout, hasAccess]
        );

        return (
            <>
                <div
                    className={gridClasses}
                    style={gridStyles}
                    onClick={() => {
                        hideContextMenu();
                        hideDashboardContextMenu();
                    }}
                    onContextMenu={(e) => {
                        const target = e.target as HTMLElement;
                        // Only show dashboard context menu on background
                        if (target.classList.contains('grid-dashboard') ||
                            target.classList.contains('react-grid-layout')) {
                            e.preventDefault();
                            hideContextMenu();
                            showDashboardContextMenu(e.clientX, e.clientY);
                        }
                    }}
                >
                    <ResponsiveGridLayout
                        className="react-grid-layout"
                        layouts={{ lg: gridLayout }}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: columnCount, md: columnCount, sm: columnCount, xs: columnCount, xxs: columnCount }}
                        rowHeight={cellHeight}
                        compactType="vertical"
                        preventCollision={false}
                        isResizable={true}
                        isDraggable={true}
                        draggableHandle=".widget-drag-handle"
                        onDragStart={handleDragStart}
                        onDragStop={handleDragStop}
                        onResizeStart={handleResizeStart}
                        onResizeStop={handleResizeStop}
                        margin={[10, 10]}
                        containerPadding={[10, 10]}
                        useCSSTransforms={true}
                        transformScale={1}
                        resizeHandles={['s', 'w', 'e', 'sw', 'se']}
                        resizeHandle={(axis, ref) => <CustomResizeHandle handleAxis={axis} ref={ref} />}
                    >
                        {enabledWidgets.map(widget => {
                            // Use widget type for config lookup (supports multi-instance widgets)
                            const widgetConfig = getWidgetConfigById(widget.id);
                            // Use displayName for multi-instance widgets, fall back to config title
                            const displayTitle = widget.displayName || widgetConfig?.title || widget.id;
                            return (
                                <div
                                    key={widget.id}
                                    className="grid-stack-item"
                                    data-widget-id={widget.id}
                                    data-widget-title={displayTitle}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        showContextMenu(e.clientX, e.clientY, widget.id, displayTitle);
                                    }}
                                >
                                    <div className="grid-stack-item-content">
                                        {renderWidget(widget.id, refreshKeys[widget.id] || 0)}
                                    </div>
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                </div>

                {/* Empty state overlay */}
                {enabledWidgets.length === 0 && (
                    <>
                        {/* Centered empty state message */}
                        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <LayoutDashboard
                                className="w-12 h-12 mb-4"
                                style={{ color: 'var(--ui-text-tertiary)', opacity: 0.5 }}
                                strokeWidth={1.5}
                            />
                            <h2
                                className="text-xl font-medium mb-1"
                                style={{ color: 'var(--ui-text-secondary)' }}
                            >
                                No widgets yet
                            </h2>
                            <p
                                className="text-sm"
                                style={{ color: 'var(--ui-text-tertiary)' }}
                            >
                                Your dashboard is empty
                            </p>
                        </div>

                        {/* Dock hint animation - hide when dock is visible or setting disabled */}
                        <AnimatePresence>
                            {dockShowEmptyDockHint && !isDockVisible && (
                                <motion.div
                                    className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{
                                        duration: 0.3,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                >
                                    <div
                                        className="w-44 h-28 rounded-xl relative overflow-hidden"
                                        style={{
                                            backgroundColor: 'var(--ui-bg-secondary)',
                                            border: '1px solid var(--ui-border-primary)',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                                        }}
                                    >
                                        {/* Mini dock that animates up */}
                                        <div
                                            className="absolute bottom-1.5 left-1/2 flex items-center gap-1 px-2 py-1.5 rounded-lg animate-[dockReveal_3s_ease-in-out_infinite]"
                                            style={{
                                                backgroundColor: 'var(--ui-bg-tertiary)',
                                                border: '1px solid var(--ui-border-primary)',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <div
                                                className="w-4 h-4 rounded-md flex items-center justify-center"
                                                style={{ backgroundColor: 'var(--ui-accent-primary)' }}
                                            >
                                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="white">
                                                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                                </svg>
                                            </div>
                                            <div
                                                className="w-4 h-4 rounded-md"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border-primary)' }}
                                            />
                                            <div
                                                className="w-4 h-4 rounded-md"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border-primary)' }}
                                            />
                                        </div>

                                        {/* macOS-style cursor */}
                                        <div
                                            className="absolute animate-[cursorFloat_3s_ease-in-out_infinite]"
                                            style={{ left: '50%', top: '20%' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
                                                    fill="var(--ui-text-primary)"
                                                    stroke="var(--ui-bg-primary)"
                                                    strokeWidth="1.5"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <style jsx>{`
                                        @keyframes dockReveal {
                                            0%, 15% { 
                                                transform: translateX(-50%) translateY(calc(100% + 12px));
                                                opacity: 0;
                                            }
                                            30%, 85% { 
                                                transform: translateX(-50%) translateY(0);
                                                opacity: 1;
                                            }
                                            100% { 
                                                transform: translateX(-50%) translateY(calc(100% + 12px));
                                                opacity: 0;
                                            }
                                        }
                                        @keyframes cursorFloat {
                                            0%, 15% { 
                                                transform: translate(-50%, 0);
                                            }
                                            30%, 85% { 
                                                transform: translate(-50%, 50px);
                                            }
                                            100% { 
                                                transform: translate(-50%, 0);
                                            }
                                        }
                                    `}</style>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}

                <WidgetContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    widgetId={contextMenu.widgetId}
                    widgetTitle={contextMenu.widgetTitle}
                    isVisible={contextMenu.isVisible}
                    onClose={hideContextMenu}
                    onDelete={handleDeleteRequest}
                    onRefresh={handleRefreshWidget}
                    onResize={handleResizeWidget}
                    onInfo={handleWidgetInfo}
                    onSettings={handleWidgetSettings}
                />

                <DashboardContextMenu
                    x={dashboardContextMenu.x}
                    y={dashboardContextMenu.y}
                    isVisible={dashboardContextMenu.isVisible}
                    onClose={hideDashboardContextMenu}
                    onAddWidget={() => onAddWidget?.()}
                    onCompact={() => {
                        // Run the compaction algorithm
                        const compactedRglLayout = compactLayout(gridLayout, columnCount);
                        const compactedWidgets = layoutToWidgets(compactedRglLayout, layout);
                        externalLayoutChangeRef.current?.(compactedWidgets, 'compact');
                    }}
                    onSettings={() => onOpenSettings?.()}
                    onRefreshAll={handleRefreshAll}
                />

                {/* Modals */}
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setSelectedWidget(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    title="Remove Widget"
                    message={selectedWidget ? `Are you sure you want to remove "${selectedWidget.title}" from your dashboard?` : ""}
                    type="danger"
                    confirmText="Remove"
                    cancelText="Cancel"
                />

                <InfoModal
                    isOpen={showInfoModal}
                    onClose={() => {
                        setShowInfoModal(false);
                        setSelectedWidget(null);
                    }}
                    widget={selectedWidget ? (() => {
                        const config = getWidgetConfigById(selectedWidget.id);
                        return {
                            title: selectedWidget.title,
                            category: config?.category || "Unknown",
                            description: config?.description,
                            size: `${config?.defaultSize.w || 4}×${config?.defaultSize.h || 4}`
                        };
                    })() : { title: "", category: "", description: "", size: "" }}
                />

                <WidgetSettingsDialog
                    widgetId={widgetSettingsDialog.selectedWidget?.id || ''}
                    widgetTitle={widgetSettingsDialog.selectedWidget?.title || ''}
                    isOpen={widgetSettingsDialog.isOpen}
                    onClose={widgetSettingsDialog.closeSettings}
                />
            </>
        );
    }
);

GridDashboard.displayName = "GridDashboard";
export default GridDashboard;
