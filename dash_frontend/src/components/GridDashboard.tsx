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

        // Helper function to compare two layouts.
        const layoutsEqual = (layout1: Widget[], layout2: Widget[]): boolean => {
            if (layout1.length !== layout2.length) return false;
            return layout1.every((w1) => {
                const w2 = layout2.find((w) => w.id === w1.id);
                return (
                    !!w2 &&
                    w1.x === w2.x &&
                    w1.y === w2.y &&
                    w1.w === w2.w &&
                    w1.h === w2.h
                );
            });
        };

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
                grid.destroy(false);
                gridInstance.current = null;
            };
        }, [layout, onExternalLayoutChange]);

        // Handle external layout changes.
        useEffect(() => {
            const externalIds = layout.map((w) => w.id).join("-");
            const internalIds = layoutRef.current.map((w) => w.id).join("-");
            if (externalIds !== internalIds && gridInstance.current) {
                gridInstance.current.removeAll();
                layoutRef.current = layout;
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