"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import { createRoot, Root } from "react-dom/client";
import { Widget } from "@/types";
import { COLUMN_COUNT, CELL_HEIGHT, MIN_WIDGET_WIDTH, MIN_WIDGET_HEIGHT } from "@/constants/dashboard";
import { getWidgetById } from "@/constants/widgets";
import { Suspense } from "react";
import WidgetContextMenu, { useWidgetContextMenu } from "./WidgetContextMenu";
import { ConfirmModal, InfoModal } from "./ui/modal";
import { LayoutDashboard, ArrowDown } from "lucide-react";
import { useWidgetPermissions } from "@/hooks/useWidgetPermissions";

export interface GridDashboardProps {
    // The current serialized layout (list of widgets)
    layout: Widget[];
    // Callback to notify parent of layout changes
    onExternalLayoutChange?: (layout: Widget[]) => void;
}

export interface GridDashboardHandle {
    compact: (mode?: 'list' | 'compact') => void;
}

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, onExternalLayoutChange }, ref) => {
        const gridRef = useRef<HTMLDivElement>(null);
        const gridInstance = useRef<GridStack | null>(null);
        // Keep track of React roots for proper unmounting of widget components.
        const widgetRoots = useRef<Map<string, Root>>(new Map());
        const { contextMenu, showContextMenu, hideContextMenu } = useWidgetContextMenu();

        // ✅ FIX: Get widget permissions
        const { hasAccess } = useWidgetPermissions();

        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [showInfoModal, setShowInfoModal] = useState(false);
        const [selectedWidget, setSelectedWidget] = useState<{ id: string; title: string } | null>(null);
        const externalLayoutChangeRef = useRef(onExternalLayoutChange);

        useEffect(() => {
            externalLayoutChangeRef.current = onExternalLayoutChange;
        }, [onExternalLayoutChange]);

        // Context menu actions
        const handleDeleteWidget = (widgetId: string) => {
            console.log(`Attempting to delete widget: ${widgetId}`);

            if (gridInstance.current) {
                // Find the widget element using data attribute
                const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`) as HTMLElement;
                console.log(`Found widget element:`, widgetElement);

                if (widgetElement) {
                    // Clean up React root first
                    const root = widgetRoots.current.get(widgetId);
                    if (root) {
                        console.log(`Unmounting React root for ${widgetId}`);
                        root.unmount();
                        widgetRoots.current.delete(widgetId);
                    }

                    // Remove from GridStack
                    console.log(`Removing widget from GridStack`);
                    gridInstance.current.removeWidget(widgetElement);

                    // ✅ NEW: Auto-compact after removal to fill gaps
                    gridInstance.current.compact('list');  // Preserves order while filling gaps

                    // Update layout state by filtering out the removed widget
                    const currentLayout = layout.filter(widget => widget.id !== widgetId);
                    console.log(`Updated layout:`, currentLayout);

                    externalLayoutChangeRef.current?.(currentLayout);

                    console.log(`Widget ${widgetId} successfully removed and layout compacted`);
                } else {
                    console.error(`Widget element not found for ID: ${widgetId}`);
                }
            }
        };

        const handleRefreshWidget = (widgetId: string) => {
            console.log(`Attempting to refresh widget: ${widgetId}`);

            // Find the grid-stack-item (outer container)
            const gridItem = document.querySelector(`.grid-stack-item[data-widget-id="${widgetId}"]`) as HTMLElement;

            if (!gridItem || !gridInstance.current) {
                console.warn(`Grid item not found for widget: ${widgetId}`);
                return;
            }

            // Find the inner content element
            const contentElement = gridItem.querySelector('.grid-stack-item-content') as HTMLElement;
            if (!contentElement) {
                console.warn(`Content element not found for widget: ${widgetId}`);
                return;
            }

            const root = widgetRoots.current.get(widgetId);
            const widgetDef = getWidgetById(widgetId);

            if (root && widgetDef) {
                console.log(`Refreshing widget: ${widgetId}`);

                // Unmount the old root
                root.unmount();

                // Clear the content element
                contentElement.innerHTML = '';

                // Create a new root on the content element
                const newRoot = createRoot(contentElement);
                const WidgetComponent = widgetDef.component;

                // Render with new key to force complete re-mount
                newRoot.render(
                    <Suspense fallback={null}>
                        <WidgetComponent key={`refresh-${Date.now()}`} />
                    </Suspense>
                );

                // Update the root reference
                widgetRoots.current.set(widgetId, newRoot);
                console.log(`Widget ${widgetId} successfully refreshed`);
            }
        };

        const handleResizeWidget = (widgetId: string, size: 'small' | 'medium' | 'large') => {
            if (!gridInstance.current) return;

            const sizeMap = {
                small: { w: 2, h: 2 },
                medium: { w: 4, h: 4 },
                large: { w: 6, h: 4 }
            } as const;

            const newSize = sizeMap[size];
            console.log(`[Resize] Requested widget ${widgetId} => ${size} (${newSize.w}x${newSize.h})`);

            // Target the outer grid-stack-item for correct resize behavior
            const widgetItem = document.querySelector(`.grid-stack-item[data-widget-id="${widgetId}"]`) as HTMLElement | null
                || document.querySelector(`[data-widget-id="${widgetId}"]`) as HTMLElement | null;

            if (!widgetItem) {
                console.warn(`[Resize] Grid item not found for id ${widgetId}`);
                hideContextMenu();
                return;
            }

            let resized = false;
            try {
                gridInstance.current.update(widgetItem, { w: newSize.w, h: newSize.h });
                console.log(`[Resize] update() applied for ${widgetId}`);
                resized = true;
            } catch (e1) {
                console.warn('[Resize] update() failed, attempting resize() fallback', e1);
                try {
                    // @ts-ignore fallback for older versions
                    gridInstance.current.resize(widgetItem, newSize.w, newSize.h);
                    console.log(`[Resize] resize() fallback applied for ${widgetId}`);
                    resized = true;
                } catch (e2) {
                    console.error('[Resize] Both update() and resize() failed', e2);
                }
            }

            if (resized) {
                const nodes = gridInstance.current.save() as GridStackNode[];
                const updatedLayout = nodes.map((node) => ({
                    id: node.id as string,
                    x: node.x || 0,
                    y: node.y || 0,
                    w: node.w || 1,
                    h: node.h || 1,
                    enabled: true,
                }));
                externalLayoutChangeRef.current?.(updatedLayout);
                console.log('[Resize] Layout persisted after resize');
            }

            hideContextMenu();
        };

        const handleWidgetInfo = (widgetId: string) => {
            const widgetDef = getWidgetById(widgetId);
            if (widgetDef) {
                setSelectedWidget({ id: widgetId, title: widgetDef.title });
                setShowInfoModal(true);
            }
            hideContextMenu();
        };

        const handleDeleteRequest = (widgetId: string) => {
            const widgetDef = getWidgetById(widgetId);
            if (widgetDef) {
                setSelectedWidget({ id: widgetId, title: widgetDef.title });
                setShowDeleteConfirm(true);
            }
            hideContextMenu();
        };

        const handleConfirmDelete = () => {
            if (selectedWidget) {
                handleDeleteWidget(selectedWidget.id);
                setSelectedWidget(null);
            }
            setShowDeleteConfirm(false);
        };

        // Expose the "compact" method to parent components.
        // ✅ ENHANCED: Now supports compact modes for better control
        useImperativeHandle(ref, () => ({
            compact: (mode: 'list' | 'compact' = 'list') => {
                if (gridInstance.current) {
                    // 'list' preserves order, 'compact' optimizes for space
                    gridInstance.current.compact(mode);
                    const updatedNodes = gridInstance.current.save() as GridStackNode[];
                    const updatedLayout = updatedNodes.map((node) => ({
                        id: node.id as string,
                        x: node.x || 0,
                        y: node.y || 0,
                        w: node.w || 1,
                        h: node.h || 1,
                        enabled: true,
                    }));
                    externalLayoutChangeRef.current?.(updatedLayout);
                }
            },
        }));

        // ✅ Helper function to restrict dragging to only the drag handle
        // This intercepts mouse/touch events in the capture phase BEFORE GridStack can process them
        const applyDragHandleRestriction = (element: HTMLElement) => {
            const content = element.querySelector('.grid-stack-item-content');
            if (!content) return;

            // Mark as already processed to avoid duplicate listeners
            if ((content as any).__dragHandleRestricted) return;
            (content as any).__dragHandleRestricted = true;

            const preventDragFromNonHandle = (e: Event) => {
                const target = e.target as HTMLElement;
                // Only allow drag to proceed if the event originated from the drag handle
                if (!target.closest('.widget-drag-handle')) {
                    e.stopPropagation();
                }
            };

            // Add listeners in capture phase (true) to intercept BEFORE GridStack
            content.addEventListener('mousedown', preventDragFromNonHandle, true);
            content.addEventListener('touchstart', preventDragFromNonHandle, true);
        };

        useEffect(() => {
            if (!gridRef.current) return;
            if (gridInstance.current) return; // Prevent reinitialization

            // Calculate initial cell height to make square cells while fitting viewport
            const calculateCellHeight = () => {
                if (!gridRef.current) return CELL_HEIGHT;

                const containerWidth = gridRef.current.clientWidth;
                const viewportHeight = window.innerHeight;

                // Calculate cell height based on width (for square cells)
                const cellHeightFromWidth = containerWidth / COLUMN_COUNT;

                // Calculate max cell height that would fit approximately 8-9 rows in viewport
                // Accounting for padding, margins, and other UI elements (~120px overhead)
                const maxCellHeightFromHeight = (viewportHeight - 120) / 8;

                // Use the smaller value to ensure grid fits reasonably in viewport
                return Math.min(cellHeightFromWidth, maxCellHeightFromHeight);
            };

            // Initialize GridStack with square cells and responsive features
            gridInstance.current = GridStack.init(
                {
                    cellHeight: calculateCellHeight(),
                    column: COLUMN_COUNT,
                    float: false,
                    minRow: 1,  // Minimum number of rows

                    // ✅ CRITICAL: Drag handle configuration for GridStack 12.x native drag
                    // Must be at top level for GridStack 12+ (not inside draggable object)
                    handle: '.widget-drag-handle',
                    handleClass: 'widget-drag-handle',

                    // ✅ HIGH PRIORITY: Responsive breakpoints for mobile/tablet support
                    columnOpts: {
                        breakpoints: [
                            { w: 1400, c: 11 },      // Desktop: Full 11 columns
                            { w: 1200, c: 8 },       // Laptop: 8 columns
                            { w: 900, c: 6 },        // Tablet landscape: 6 columns
                            { w: 700, c: 4 },        // Tablet portrait: 4 columns
                            { w: 500, c: 2 },        // Mobile landscape: 2 columns
                            { w: 0, c: 1 }           // Mobile portrait: 1 column (stacked)
                        ],
                        breakpointForWindow: true,   // Use window size, not container
                        layout: 'moveScale'          // Scale widgets proportionally on column change
                    },

                    // Note: sizeToContent removed to allow manual vertical resizing
                    // Widgets can still set it individually via their config if needed
                },
                gridRef.current
            );

            // Set the render callback – each time a widget is added/loaded,
            // this function will mount the corresponding React component.
            GridStack.renderCB = (el, node) => {
                const widgetId = node.id as string;
                el.innerHTML = "";

                // ✅ FIX: Check widget permissions before rendering
                if (!hasAccess(widgetId, 'view')) {
                    console.warn(`User does not have access to widget: ${widgetId}`);
                    el.innerHTML = `<div class="widget-error">Access Denied</div>`;
                    return;
                }

                const widgetDef = getWidgetById(widgetId);
                if (widgetDef) {
                    const root = createRoot(el);
                    const WidgetComponent = widgetDef.component;

                    // Tag parent grid-stack-item if present for reliable selection
                    const gridItem = el.closest('.grid-stack-item') as HTMLElement | null;
                    const target = gridItem || el; // fallback to inner element
                    target.setAttribute('data-widget-id', widgetId);
                    target.setAttribute('data-widget-title', widgetDef.title);

                    target.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        showContextMenu(e.clientX, e.clientY, widgetId, widgetDef.title);
                    });

                    root.render(
                        <Suspense fallback={null}>
                            <WidgetComponent />
                        </Suspense>
                    );
                    widgetRoots.current.set(widgetId, root);
                } else {
                    el.innerHTML = `<div class=\"widget-error\">Widget \"${widgetId}\" not found</div>`;
                }
            };

            // Load the initial layout using GridStack's built‑in load method.
            // Enforce minimum widget dimensions to prevent over-shrinking
            // ✅ FIX: Filter out widgets user doesn't have access to
            const accessibleLayout = layout.filter(widget => hasAccess(widget.id, 'view'));
            const layoutWithMinimums = accessibleLayout.map(widget => ({
                ...widget,
                w: Math.max(widget.w, MIN_WIDGET_WIDTH),
                h: Math.max(widget.h, MIN_WIDGET_HEIGHT),
                minW: MIN_WIDGET_WIDTH,
                minH: MIN_WIDGET_HEIGHT,
            }));
            gridInstance.current.load(layoutWithMinimums);

            // ✅ CRITICAL FIX: Apply drag handle restrictions to all loaded widgets
            gridInstance.current.el.querySelectorAll('.grid-stack-item').forEach((item: Element) => {
                applyDragHandleRestriction(item as HTMLElement);
            });

            // Listen to layout changes – on any change, grab the new state
            // and propagate it to the parent and local storage.
            // ✅ DEBOUNCED: Prevent feedback loops during resize/responsive changes
            let changeTimer: NodeJS.Timeout;
            gridInstance.current.on("change", () => {
                if (!gridInstance.current) return;

                // Debounce change events to prevent rapid-fire updates during resize
                clearTimeout(changeTimer);
                changeTimer = setTimeout(() => {
                    if (!gridInstance.current) return;
                    const nodes = gridInstance.current.save() as GridStackNode[];
                    const updatedLayout = nodes.map((node) => ({
                        id: node.id as string,
                        x: node.x || 0,
                        y: node.y || 0,
                        w: node.w || 1,
                        h: node.h || 1,
                        enabled: true,
                    }));
                    externalLayoutChangeRef.current?.(updatedLayout);
                }, 200); // Wait 200ms after last change before saving
            });

            return () => {
                // Clean up timers, React roots and destroy the grid instance.
                clearTimeout(changeTimer);
                widgetRoots.current.forEach((root) => root.unmount());
                widgetRoots.current.clear();
                gridInstance.current!.destroy(false);
                gridInstance.current = null;
            };
        }, [hasAccess]);

        // ✅ REMOVED: Manual cell height adjustment on resize
        // GridStack's built-in responsive columnOpts already handle layout adjustments
        // on window resize. Manual cellHeight updates were causing feedback loops and
        // conflicts with GridStack's internal resize handling.

        // Reload the grid if the external layout prop changes (e.g. via presets or widget menu).
        // ✅ OPTIMIZED: Only reload if widgets actually changed, not just positions
        const prevLayoutRef = useRef<Widget[]>(layout);
        useEffect(() => {
            if (!gridInstance.current) return;

            // Check if widgets were added/removed (not just moved)
            const prevIds = new Set(prevLayoutRef.current.map(w => w.id));
            const currentIds = new Set(layout.map(w => w.id));

            const widgetsAdded = layout.some(w => !prevIds.has(w.id));
            const widgetsRemoved = prevLayoutRef.current.some(w => !currentIds.has(w.id));

            // Only reload if widgets were actually added or removed
            if (widgetsAdded || widgetsRemoved) {
                // Create a set of widget IDs from the new layout
                const newWidgetIds = new Set(layout.map(widget => widget.id));

                // Iterate over existing widget roots and unmount those that are not in the new layout
                widgetRoots.current.forEach((root, widgetId) => {
                    if (!newWidgetIds.has(widgetId)) {
                        root.unmount();
                        widgetRoots.current.delete(widgetId);
                    }
                });

                // ✅ FIX: Filter out widgets user doesn't have access to
                const accessibleLayout = layout.filter(widget => hasAccess(widget.id, 'view'));

                // Enforce minimum widget dimensions before loading
                const layoutWithMinimums = accessibleLayout.map(widget => ({
                    ...widget,
                    w: Math.max(widget.w, MIN_WIDGET_WIDTH),
                    h: Math.max(widget.h, MIN_WIDGET_HEIGHT),
                    minW: MIN_WIDGET_WIDTH,
                    minH: MIN_WIDGET_HEIGHT,
                }));

                // Load the new layout into GridStack
                gridInstance.current.load(layoutWithMinimums);

                // Re-apply drag handle restrictions after reload
                setTimeout(() => {
                    if (gridInstance.current) {
                        gridInstance.current.el.querySelectorAll('.grid-stack-item').forEach((item: Element) => {
                            applyDragHandleRestriction(item as HTMLElement);
                        });
                    }
                }, 100); // Small delay to ensure DOM is ready
            }

            // Update the previous layout reference
            prevLayoutRef.current = layout;
        }, [layout, hasAccess]);

        return (
            <>
                <div
                    ref={gridRef}
                    className="grid-stack"
                    onClick={hideContextMenu} // Close context menu when clicking on dashboard
                />

                {/* Empty state overlay when no widgets are added */}
                {layout.length === 0 && (
                    <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-center space-y-6 p-8 max-w-md">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <LayoutDashboard
                                        className="w-16 h-16 text-ui-text-tertiary opacity-40"
                                        strokeWidth={1.5}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-medium text-ui-text-secondary">
                                    No widgets yet
                                </h2>
                                <p className="text-sm text-ui-text-tertiary">
                                    Add widgets from the dock below to get started
                                </p>
                            </div>
                            <div className="flex justify-center pt-4">
                                <ArrowDown
                                    className="w-6 h-6 text-ui-text-tertiary opacity-30 animate-bounce"
                                    strokeWidth={1.5}
                                />
                            </div>
                        </div>
                    </div>
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
                />

                {/* Modals at dashboard level to avoid z-index conflicts */}
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
                    widget={selectedWidget ? {
                        title: selectedWidget.title,
                        category: getWidgetById(selectedWidget.id)?.category || "Unknown",
                        description: getWidgetById(selectedWidget.id)?.description,
                        size: `${getWidgetById(selectedWidget.id)?.defaultSize.w || 4}×${getWidgetById(selectedWidget.id)?.defaultSize.h || 4}`
                    } : { title: "", category: "", description: "", size: "" }}
                />
            </>
        );
    }
);

GridDashboard.displayName = "GridDashboard";
export default GridDashboard;