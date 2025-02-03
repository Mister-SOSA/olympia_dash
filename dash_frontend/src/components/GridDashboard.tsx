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
    // Layout passed down from Dashboard (live layout).
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

        // Expose a "compact" method to the parent via ref.
        useImperativeHandle(ref, () => ({
            compact: () => {
                if (gridInstance.current) {
                    gridInstance.current.compact();
                    const updatedLayout = (gridInstance.current.save(false) as GridStackNode[]).map((node) => ({
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
                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(validated);
                    }
                }
            },
        }));

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
                    enabled: layoutRef.current.find((w) => w.id === node.id)?.enabled ?? true,
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

        // Listen for external layout changes (if provided).
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