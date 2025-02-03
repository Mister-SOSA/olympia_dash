"use client";

import React, {
    useEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
} from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import { createRoot } from "react-dom/client";
import { Widget } from "@/types";
import { COLUMN_COUNT, CELL_HEIGHT } from "@/constants/dashboard";
import { saveLayoutToStorage, validateLayout } from "@/utils/layoutUtils";
import widgetMap from "@/components/widgets/widgetMap";

export interface GridDashboardProps {
    // External layout changes (e.g. from widget menu) will come in here
    layout: Widget[];
    // Use this callback only when an external layout change (e.g. widget menu save) should update the grid
    onExternalLayoutChange?: (layout: Widget[]) => void;
}

export interface GridDashboardHandle {
    compact: () => void;
}

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, onExternalLayoutChange }, ref) => {
        const gridRef = useRef<HTMLDivElement>(null);
        const gridInstance = useRef<GridStack | null>(null);
        // Keep an internal reference to the current layout so that grid events don't force a re-render.
        const layoutRef = useRef<Widget[]>(layout);

        // Expose a "compact" method to the parent via ref.
        useImperativeHandle(ref, () => ({
            compact: () => {
                if (gridInstance.current) {
                    gridInstance.current.compact();
                    // Get the updated layout from GridStack.
                    const updatedLayout = (gridInstance.current.save(false) as GridStackNode[]).map((node) => ({
                        id: node.id as string,
                        x: node.x ?? 0,
                        y: node.y ?? 0,
                        w: node.w ?? 1,
                        h: node.h ?? 1,
                        // Retain the enabled status from our internal layout.
                        enabled: layoutRef.current.find((w) => w.id === node.id)?.enabled ?? true,
                    }));
                    const validated = validateLayout(updatedLayout, COLUMN_COUNT);
                    // Update our internal layout reference.
                    layoutRef.current = validated;
                    // Save to local storage.
                    saveLayoutToStorage(validated);
                    // (Optional) Inform the parent if external updates are needed.
                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(validated);
                    }
                }
            },
        }));

        // Initialize GridStack only once.
        useEffect(() => {
            if (!gridRef.current || gridInstance.current) return;

            gridInstance.current = GridStack.init(
                { cellHeight: CELL_HEIGHT, column: COLUMN_COUNT, float: false },
                gridRef.current
            );
            const grid = gridInstance.current;

            // Function to render widgets.
            const renderWidgets = (widgets: Widget[]) => {
                if (!grid || !grid.engine) return;
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
                            }
                        }
                    });
            };

            // Render initial widgets using our internal layout ref.
            renderWidgets(layoutRef.current);

            // Listen for GridStack change events.
            grid.on("change", () => {
                const updatedLayout = (grid.save(false) as GridStackNode[]).map((node) => ({
                    id: node.id as string,
                    x: node.x ?? 0,
                    y: node.y ?? 0,
                    w: node.w ?? 1,
                    h: node.h ?? 1,
                    enabled: layoutRef.current.find((w) => w.id === node.id)?.enabled ?? true,
                }));
                const validated = validateLayout(updatedLayout, COLUMN_COUNT);
                layoutRef.current = validated;
                saveLayoutToStorage(validated);
                // Note: We do NOT update any external state here.
            });

            return () => {
                grid.destroy(false);
                gridInstance.current = null;
            };
        }, []); // Empty dependency array: initialize grid only once.

        // Handle external layout changes (e.g. via widget menu).
        // This effect updates the grid only if an external change is detected.
        useEffect(() => {
            // Check if the external layout is different from our current grid layout.
            const externalIds = layout.map((w) => w.id).join("-");
            const internalIds = layoutRef.current.map((w) => w.id).join("-");
            if (externalIds !== internalIds && gridInstance.current) {
                gridInstance.current.removeAll();
                // Update internal layout ref.
                layoutRef.current = layout;
                // Re-render widgets with the new layout.
                const grid = gridInstance.current;
                layout
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
                            }
                        }
                    });
            }
        }, [layout]);

        return <div ref={gridRef} className="grid-stack"></div>;
    }
);

GridDashboard.displayName = "GridDashboard";
export default GridDashboard;