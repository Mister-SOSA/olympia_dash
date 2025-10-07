"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import { createRoot, Root } from "react-dom/client";
import { Widget } from "@/types";
import { COLUMN_COUNT, CELL_HEIGHT, MIN_CELL_SIZE } from "@/constants/dashboard";
import { saveLayoutToStorage } from "@/utils/layoutUtils";
import { getWidgetById } from "@/constants/widgets";
import { Suspense } from "react";
import WidgetContextMenu, { useWidgetContextMenu } from "./WidgetContextMenu";
import { ConfirmModal, InfoModal } from "./ui/modal";

export interface GridDashboardProps {
    // The current serialized layout (list of widgets)
    layout: Widget[];
    // Callback to notify parent of layout changes
    onExternalLayoutChange?: (layout: Widget[]) => void;
}

export interface GridDashboardHandle {
    compact: () => void;
}

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, onExternalLayoutChange }, ref) => {
        const gridRef = useRef<HTMLDivElement>(null);
        const gridInstance = useRef<GridStack | null>(null);
        // Keep track of React roots for proper unmounting of widget components.
        const widgetRoots = useRef<Map<string, Root>>(new Map());
        const { contextMenu, showContextMenu, hideContextMenu } = useWidgetContextMenu();
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [showInfoModal, setShowInfoModal] = useState(false);
        const [selectedWidget, setSelectedWidget] = useState<{ id: string; title: string } | null>(null);

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

                    // Update layout state by filtering out the removed widget
                    const currentLayout = layout.filter(widget => widget.id !== widgetId);
                    console.log(`Updated layout:`, currentLayout);

                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(currentLayout);
                    }
                    saveLayoutToStorage(currentLayout);

                    console.log(`Widget ${widgetId} successfully removed`);
                } else {
                    console.error(`Widget element not found for ID: ${widgetId}`);
                }
            }
        };

        const handleRefreshWidget = (widgetId: string) => {
            console.log(`Attempting to refresh widget: ${widgetId}`);

            // Force re-render the widget by unmounting and remounting
            const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`) as HTMLElement;

            if (widgetElement && gridInstance.current) {
                const root = widgetRoots.current.get(widgetId);
                const widgetDef = getWidgetById(widgetId);

                if (root && widgetDef) {
                    console.log(`Force refreshing widget: ${widgetId}`);

                    // Unmount and remount with new key to force refresh
                    root.unmount();
                    const newRoot = createRoot(widgetElement);
                    const WidgetComponent = widgetDef.component;

                    newRoot.render(
                        <Suspense fallback={<div className="widget-loading">Refreshing...</div>}>
                            <WidgetComponent key={`refresh-${Date.now()}`} />
                        </Suspense>
                    );

                    widgetRoots.current.set(widgetId, newRoot);
                    console.log(`Widget ${widgetId} force refreshed`);
                }
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
                if (onExternalLayoutChange) onExternalLayoutChange(updatedLayout);
                saveLayoutToStorage(updatedLayout);
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
        useImperativeHandle(ref, () => ({
            compact: () => {
                if (gridInstance.current) {
                    gridInstance.current.compact();
                    const updatedNodes = gridInstance.current.save() as GridStackNode[];
                    const updatedLayout = updatedNodes.map((node) => ({
                        id: node.id as string,
                        x: node.x || 0,
                        y: node.y || 0,
                        w: node.w || 1,
                        h: node.h || 1,
                        enabled: true,
                    }));
                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(updatedLayout);
                    }
                    saveLayoutToStorage(updatedLayout);
                }
            },
        }));

        useEffect(() => {
            if (!gridRef.current) return;
            if (gridInstance.current) return; // Prevent reinitialization

            // Initialize GridStack with production-friendly options.
            gridInstance.current = GridStack.init(
                {
                    cellHeight: CELL_HEIGHT,
                    column: COLUMN_COUNT,
                    float: false,
                    // Other production options can be added here
                },
                gridRef.current
            );

            // Set the render callback – each time a widget is added/loaded,
            // this function will mount the corresponding React component.
            GridStack.renderCB = (el, node) => {
                const widgetId = node.id as string;
                el.innerHTML = "";

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
                        <Suspense fallback={<div className="widget-loading">Loading...</div>}>
                            <WidgetComponent />
                        </Suspense>
                    );
                    widgetRoots.current.set(widgetId, root);
                } else {
                    el.innerHTML = `<div class=\"widget-error\">Widget \"${widgetId}\" not found</div>`;
                }
            };

            // Load the initial layout using GridStack’s built‑in load method.
            gridInstance.current.load(layout);

            // After initial load, compute dynamic square cell sizing
            requestAnimationFrame(() => {
                recomputeCellSize();
            });

            // Listen to layout changes – on any change, grab the new state
            // and propagate it to the parent and local storage.
            gridInstance.current.on("change", () => {
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
                if (onExternalLayoutChange) onExternalLayoutChange(updatedLayout);
                saveLayoutToStorage(updatedLayout);
                // Recompute sizing after structural change
                requestAnimationFrame(() => recomputeCellSize());
            });

            return () => {
                // Clean up React roots and destroy the grid instance.
                widgetRoots.current.forEach((root) => root.unmount());
                widgetRoots.current.clear();
                gridInstance.current!.destroy(false);
                gridInstance.current = null;
            };
        }, []);

        // Helper: recompute cell dimensions with production constraints
        const recomputeCellSize = () => {
            if (!gridRef.current || !gridInstance.current) return;

            const container = gridRef.current;
            const rect = container.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const topOffset = rect.top;
            const availableHeight = viewportHeight - topOffset - 8; // small bottom padding

            // Collect nodes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nodes: any[] = (gridInstance.current as any).engine?.nodes || (gridInstance.current.save() as GridStackNode[]);
            let maxRow = 0;
            nodes.forEach(n => {
                const bottom = (n.y || 0) + (n.h || 0);
                if (bottom > maxRow) maxRow = bottom;
            });
            if (maxRow === 0) maxRow = 1;

            const colWidth = container.clientWidth / COLUMN_COUNT;
            const sizeToFillHeight = availableHeight / maxRow;
            let cellSize = Math.min(colWidth, sizeToFillHeight);

            // Enforce minimum cell size; if violated, allow vertical scroll instead of shrinking further
            const scrollMode = cellSize < MIN_CELL_SIZE;
            if (scrollMode) {
                cellSize = Math.max(colWidth, MIN_CELL_SIZE); // prioritize width-based square while enabling scroll
                container.style.overflowY = 'auto';
            } else {
                container.style.overflowY = 'hidden';
            }

            // Apply new cell height
            // @ts-ignore gridstack dynamic method
            gridInstance.current.cellHeight(cellSize);
            container.style.minHeight = `${cellSize * maxRow}px`;
        };

        // Recompute on window resize or layout changes
        // Debounced resize listener
        useEffect(() => {
            let frame: number | null = null;
            let last = 0;
            const interval = 100; // throttle interval
            const handleResize = () => {
                const now = performance.now();
                if (now - last > interval) {
                    last = now;
                    recomputeCellSize();
                } else {
                    if (frame) cancelAnimationFrame(frame);
                    frame = requestAnimationFrame(() => {
                        last = performance.now();
                        recomputeCellSize();
                    });
                }
            };
            window.addEventListener('resize', handleResize);
            return () => {
                if (frame) cancelAnimationFrame(frame);
                window.removeEventListener('resize', handleResize);
            };
        }, []);

        // Recompute whenever layout prop changes (new widgets, rows, etc.)
        useEffect(() => {
            recomputeCellSize();
        }, [layout]);

        // Reload the grid if the external layout prop changes (e.g. via presets or widget menu).
        useEffect(() => {
            if (gridInstance.current) {
                // Create a set of widget IDs from the new layout
                const newWidgetIds = new Set(layout.map(widget => widget.id));

                // Iterate over existing widget roots and unmount those that are not in the new layout
                widgetRoots.current.forEach((root, widgetId) => {
                    if (!newWidgetIds.has(widgetId)) {
                        root.unmount();
                        widgetRoots.current.delete(widgetId);
                    }
                });

                // Load the new layout into GridStack
                gridInstance.current.load(layout);
            }
        }, [layout]);

        return (
            <>
                <div
                    ref={gridRef}
                    className="grid-stack"
                    onClick={hideContextMenu} // Close context menu when clicking on dashboard
                />

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