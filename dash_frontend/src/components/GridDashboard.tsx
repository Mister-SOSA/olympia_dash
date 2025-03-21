"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { GridStack, GridStackNode, GridItemHTMLElement } from "gridstack";
import "gridstack/dist/gridstack.css";
import { createRoot, Root } from "react-dom/client";
import { Widget } from "@/types";
import { COLUMN_COUNT, CELL_HEIGHT } from "@/constants/dashboard";
import { saveLayoutToStorage, validateLayout } from "@/utils/layoutUtils";
import widgetMap from "@/components/widgets/widgetMap";

export interface GridDashboardProps {
    // Live layout passed down from Dashboard.
    layout: Widget[];
    // Callback for external layout updates.
    onExternalLayoutChange?: (layout: Widget[]) => void;
}

export interface GridDashboardHandle {
    compact: () => void;
}

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, onExternalLayoutChange }, ref) => {
        const gridRef = useRef<HTMLDivElement>(null);
        const gridInstance = useRef<GridStack | null>(null);
        // Internal layout reference to avoid unnecessary re-renders.
        const layoutRef = useRef<Widget[]>(layout);

        const layoutsEqual = (layout1: Widget[], layout2: Widget[]): boolean => {
            if (layout1.length !== layout2.length) return false;
            return layout1.every((w1) => {
                const w2 = layout2.find(w => w.id === w1.id);
                return !!w2 &&
                    w1.x === w2.x &&
                    w1.y === w2.y &&
                    w1.w === w2.w &&
                    w1.h === w2.h &&
                    w1.enabled === w2.enabled;
            });
        };

        // Store widget roots to allow proper unmounting.
        const widgetRoots = useRef<Map<string, Root>>(new Map());

        // Expose the "compact" method to the parent.
        useImperativeHandle(ref, () => ({
            compact: () => {
                if (gridInstance.current) {
                    gridInstance.current.compact();
                    // Save the new positions.
                    const updatedLayout = (gridInstance.current.save(false) as GridStackNode[]).map(
                        (node) => ({
                            id: node.id as string,
                            x: node.x ?? 0,
                            y: node.y ?? 0,
                            w: node.w ?? 1,
                            h: node.h ?? 1,
                            // Preserve the enabled flag from our internal layout.
                            enabled:
                                layoutRef.current.find((w) => w.id === node.id)?.enabled ?? true,
                        })
                    );
                    const validated = validateLayout(updatedLayout, COLUMN_COUNT);
                    // Only update if the layout has actually changed.
                    if (!layoutsEqual(validated, layoutRef.current)) {
                        layoutRef.current = validated;
                        saveLayoutToStorage(validated);
                        if (onExternalLayoutChange) {
                            onExternalLayoutChange(validated);
                        }
                    }
                }
            },
        }));

        // Initialize GridStack.
        useEffect(() => {
            if (!gridRef.current || gridInstance.current) return;

            gridInstance.current = GridStack.init(
                { cellHeight: CELL_HEIGHT, column: COLUMN_COUNT, float: false },
                gridRef.current
            );
            const grid = gridInstance.current;

            // Function to render all widgets.
            const renderWidgets = (widgets: Widget[]) => {
                if (!grid || !grid.engine) return;

                // Defer unmounting of existing React roots.
                widgetRoots.current.forEach((root) => {
                    setTimeout(() => root.unmount(), 0);
                });
                widgetRoots.current.clear();

                grid.removeAll();

                widgets
                    .filter((widget) => widget.enabled)
                    .forEach((widget) => {
                        const el = grid.addWidget({
                            x: widget.x,
                            y: widget.y,
                            w: widget.w,
                            h: widget.h,
                            id: widget.id,
                            content: '<div class="grid-stack-item-content"></div>',
                        });
                        const contentDiv = el.querySelector(".grid-stack-item-content");
                        if (contentDiv) {
                            const WidgetComponent = widgetMap[widget.id];
                            if (WidgetComponent) {
                                const root = createRoot(contentDiv);
                                root.render(<WidgetComponent />);
                                widgetRoots.current.set(widget.id, root);
                            }
                        }
                    });
            };

            renderWidgets(layoutRef.current);

            grid.on("change", () => {
                const updatedLayout = (grid.save(false) as GridStackNode[]).map((node) => ({
                    id: node.id as string,
                    x: node.x ?? 0,
                    y: node.y ?? 0,
                    w: node.w ?? 1,
                    h: node.h ?? 1,
                    enabled:
                        layoutRef.current.find((w) => w.id === node.id)?.enabled ?? true,
                }));
                const validated = validateLayout(updatedLayout, COLUMN_COUNT);
                layoutRef.current = validated;
                saveLayoutToStorage(validated);
            });

            return () => {
                // On cleanup, defer unmounting of all widget roots.
                widgetRoots.current.forEach((root) => {
                    setTimeout(() => root.unmount(), 0);
                });
                widgetRoots.current.clear();

                grid.destroy(false);
                gridInstance.current = null;
            };
        }, [layout, onExternalLayoutChange]);

        // Handle external layout changes.
        useEffect(() => {
            if (!gridInstance.current) return;
            if (layoutsEqual(layoutRef.current, layout)) {
                return;
            }
            const grid = gridInstance.current;

            // Only consider enabled widgets for rendering.
            const newWidgets = layout.filter((w) => w.enabled);
            const oldWidgets = layoutRef.current.filter((w) => w.enabled);

            // Build sets of widget IDs for easy comparison.
            const newIds = new Set(newWidgets.map((w) => w.id));
            const oldIds = new Set(oldWidgets.map((w) => w.id));

            // --- 1. Remove widgets that are no longer enabled ---
            const widgetsToRemove = oldWidgets.filter((w) => !newIds.has(w.id));
            widgetsToRemove.forEach((widget) => {
                const element = grid.el.querySelector(
                    `[gs-id="${widget.id}"]`
                ) as GridItemHTMLElement | null;
                if (element) {
                    // Defer unmounting the React component if it exists.
                    const root = widgetRoots.current.get(widget.id);
                    if (root) {
                        setTimeout(() => root.unmount(), 0);
                        widgetRoots.current.delete(widget.id);
                    }
                    grid.removeWidget(element, true);
                }
            });

            // --- 2. Add new widgets that weren’t present before ---
            const widgetsToAdd = newWidgets.filter((w) => !oldIds.has(w.id));
            widgetsToAdd.forEach((widget) => {
                const el = grid.addWidget({
                    x: widget.x,
                    y: widget.y,
                    w: widget.w,
                    h: widget.h,
                    id: widget.id,
                    content: '<div class="grid-stack-item-content"></div>',
                });
                const contentDiv = el.querySelector(".grid-stack-item-content");
                if (contentDiv) {
                    const WidgetComponent = widgetMap[widget.id];
                    if (WidgetComponent) {
                        const root = createRoot(contentDiv);
                        root.render(<WidgetComponent />);
                        widgetRoots.current.set(widget.id, root);
                    }
                }
            });

            // --- 3. Update existing widgets if their position/size has changed ---
            const widgetsToUpdate = newWidgets.filter((w) => oldIds.has(w.id));
            widgetsToUpdate.forEach((widget) => {
                const node = grid.engine.nodes.find((n) => n.id === widget.id);
                if (node) {
                    if (
                        node.x !== widget.x ||
                        node.y !== widget.y ||
                        node.w !== widget.w ||
                        node.h !== widget.h
                    ) {
                        grid.update(widget.id, {
                            x: widget.x,
                            y: widget.y,
                            w: widget.w,
                            h: widget.h,
                        });
                    }
                }
            });

            // Finally, update our internal layout reference.
            layoutRef.current = layout;
        }, [layout]);

        return <div ref={gridRef} className="grid-stack"></div>;
    }
);

GridDashboard.displayName = "GridDashboard";
export default GridDashboard;